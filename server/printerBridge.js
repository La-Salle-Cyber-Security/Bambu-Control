import mqtt from "mqtt";

const MORSE = {
  A: ".-",
  B: "-...",
  C: "-.-.",
  D: "-..",
  E: ".",
  F: "..-.",
  G: "--.",
  H: "....",
  I: "..",
  J: ".---",
  K: "-.-",
  L: ".-..",
  M: "--",
  N: "-.",
  O: "---",
  P: ".--.",
  Q: "--.-",
  R: ".-.",
  S: "...",
  T: "-",
  U: "..-",
  V: "...-",
  W: ".--",
  X: "-..-",
  Y: "-.--",
  Z: "--..",
  0: "-----",
  1: ".----",
  2: "..---",
  3: "...--",
  4: "....-",
  5: ".....",
  6: "-....",
  7: "--...",
  8: "---..",
  9: "----.",
  " ": "/",
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function textToMorse(text) {
  return text
    .toUpperCase()
    .split("")
    .map((ch) => MORSE[ch] || "")
    .filter(Boolean);
}

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


  let morseBusy = false;

  function ledImmediate(state /* "on" | "off" */) {
    publishSystem({
      sequence_id: String(Date.now()),
      command: "ledctrl",
      led_node: "chamber_light",
      led_mode: state,
      led_on_time: 0,
      led_off_time: 0,
      loop_times: 0,
      interval_time: 0,
    });
  }

  async function morse(text) {
    if (morseBusy) {
      return { ok: false, error: "Morse already running" };
    }

    const words = textToMorse(text);
    if (!words.length) {
      return { ok: false, error: "No valid Morse characters in text" };
    }

    morseBusy = true;

    // timing unit in ms
    const unit = 250;
    const dot = unit;
    const dash = unit * 3;
    const intraSymbolGap = unit;      // between dots/dashes in same letter
    const letterGap = unit * 3;       // between letters
    const wordGap = unit * 7;         // between words

    try {
      for (let wi = 0; wi < words.length; wi++) {
        const code = words[wi];

        if (code === "/") {
          await sleep(wordGap);
          continue;
        }

        for (let si = 0; si < code.length; si++) {
          const symbol = code[si];

          ledImmediate("on");
          await sleep(symbol === "." ? dot : dash);

          ledImmediate("off");

          // gap between symbols in same letter
          if (si < code.length - 1) {
            await sleep(intraSymbolGap);
          }
        }

        // gap between letters, unless next token is word separator or end
        const next = words[wi + 1];
        if (wi < words.length - 1 && next !== "/") {
          await sleep(letterGap);
        }
      }

      ledImmediate("off");
      return { ok: true, queued: true, text };
    } catch (e) {
      ledImmediate("off");
      return { ok: false, error: e.message };
    } finally {
      morseBusy = false;
    }
  }

  return {
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
        report: state.lastJson,
        reportRaw: state.lastJson ? undefined : state.lastRaw,
      };
    },

    onReport,

    led(state) {
      ledImmediate(state);
    },

    morse,
  };
}