import mqtt from "mqtt";

export function createPrinterBridge() {
  const serial = process.env.PRINTER_SERIAL;
  const host = process.env.MQTT_HOST;
  const port = Number(process.env.MQTT_PORT || 8883);

  if (!serial) throw new Error("Missing PRINTER_SERIAL in .env");
  if (!host) throw new Error("Missing MQTT_HOST in .env");

  // Many Bambu LAN MQTT setups are TLS on 8883. If yours is plain, we’ll swap to mqtt:// and 1883.
  const url = `mqtts://${host}:${port}`;

  const client = mqtt.connect(url, {
    username: process.env.MQTT_USERNAME || undefined,
    password: process.env.MQTT_PASSWORD || undefined,
    rejectUnauthorized: false, // LAN pragmatic mode
  });

  client.on("connect", () => console.log("[MQTT] connected"));
  client.on("error", (e) => console.error("[MQTT] error:", e.message));

  const requestTopic = `device/${serial}/request`;

  function publishSystem(systemPayload) {
    const msg = JSON.stringify({ system: systemPayload });
    client.publish(requestTopic, msg);
  }

  return {
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
    // placeholders for next steps
    pause() {
      // TODO: implement with your known printer commands
      return { ok: false, error: "pause not implemented yet" };
    },
    resume() {
      return { ok: false, error: "resume not implemented yet" };
    },
  };
}