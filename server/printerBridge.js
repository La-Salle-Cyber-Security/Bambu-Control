import mqtt from "mqtt";

export function createPrinterBridge() {
  const serial = process.env.PRINTER_SERIAL;
  const host = process.env.MQTT_HOST;
  const port = Number(process.env.MQTT_PORT || 8883);

  if (!serial) throw new Error("Missing PRINTER_SERIAL in .env");
  if (!host) throw new Error("Missing MQTT_HOST in .env");

  const url = `mqtts://${host}:${port}`;

  const client = mqtt.connect(url, {
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    rejectUnauthorized: false,
  });

  client.on("connect", () => {
    console.log("[MQTT] connected");

    // Common Bambu telemetry topic
    const reportTopic = `device/${serial}/report`;

    // Subscribe to printer telemetry
    client.subscribe(reportTopic, (err) => {
      if (err) console.error("[MQTT] subscribe error:", err.message);
      else console.log("[MQTT] subscribed:", reportTopic);
    });
  });

  client.on("error", (e) => console.error("[MQTT] error:", e.message));

  const requestTopic = `device/${serial}/request`;
  const reportTopic = `device/${serial}/report`;

  // Cache the latest status payload
  const state = {
    lastSeenAt: null,
    lastTopic: null,
    lastRaw: null,
    lastJson: null,
  };

  client.on("message", (topic, payload) => {
    if (topic !== reportTopic) return;

    const raw = payload.toString("utf-8");
    state.lastSeenAt = new Date().toISOString();
    state.lastTopic = topic;
    state.lastRaw = raw;

    try {
      state.lastJson = JSON.parse(raw);
      for (const fn of reportListeners) {
        try { fn(state.lastJson, topic); } catch (e) { /* ignore */ }
      }
    } catch {
      state.lastJson = null;
    }
  });

  function publishSystem(systemPayload) {
    const msg = JSON.stringify({ system: systemPayload });
    client.publish(requestTopic, msg);
  }

  const reportListeners = new Set();

  function onReport(fn) {
    reportListeners.add(fn);
    return () => reportListeners.delete(fn);
  }

  return {
    // Phase 1: read-only status
    getStatus() {
      return {
        ok: true,
        serial,
        mqtt: {
          connected: client.connected,
          reportTopic,
          requestTopic,
          lastSeenAt: state.lastSeenAt,
        },
        report: state.lastJson, // parsed JSON when possible
        reportRaw: state.lastJson ? undefined : state.lastRaw, // fallback if parse fails
      };
    },

    onReport,

    // existing control
    led(state /* "on"|"off" */) {
      publishSystem({
        sequence_id: "1",
        command: "ledctrl",
        led_node: "chamber_light",
        led_mode: state,
        led_on_time: 0,
        led_off_time: 0,
        loop_times: 0,
        interval_time: 0,
      });
    },
  };
}