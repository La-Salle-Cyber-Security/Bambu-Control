import "dotenv/config";
import express from "express";
import cors from "cors";
import { requireToken } from "./auth.js";
import { createPrinterBridge } from "./printerBridge.js";
import { summarizeReport } from "./statusParser.js";

const app = express();
app.use(cors());
app.use(express.json());

const printer = createPrinterBridge();

app.get("/api/health", (req, res) => res.json({ ok: true }));

app.post("/api/printer/led", requireToken, (req, res) => {
  const { state } = req.body;
  if (state !== "on" && state !== "off") {
    return res.status(400).json({ error: "state must be 'on' or 'off'" });
  }
  printer.led(state);
  res.json({ ok: true, state });
});

app.get("/api/printer/status", requireToken, (req, res) => {
  res.json(printer.getStatus());
});

app.get("/api/printer/status/pretty", requireToken, (req, res) => {
  const full = printer.getStatus();
  const report = full.report;
  res.json({
    ok: true,
    mqtt: full.mqtt,
    summary: summarizeReport(report),
  });
});

const PORT = 3000;
app.listen(PORT, () => console.log(`[API] http://localhost:${PORT}`));