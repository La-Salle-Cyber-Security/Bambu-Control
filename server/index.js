import "dotenv/config";
import express from "express";
import cors from "cors";
import { requireToken } from "./auth.js";
import { createPrinterBridge } from "./printerBridge.js";
import { summarizeReport } from "./statusParser.js";
import { createEventDetector } from "./eventDetector.js";

const app = express();
app.use(cors());
app.use(express.json());

const printer = createPrinterBridge();

function requireTokenSSE(req, res, next) {
    const q = req.query.token;
    const auth = req.headers.authorization || "";
    const bearer = auth.startsWith("Bearer ") ? auth.slice(7) : "";

    const token = q || bearer;
    if (!token || token !== process.env.API_TOKEN) {
        return res.status(401).json({ error: "Unauthorized" });
    }
    next();
}

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

const detector = createEventDetector();
const sseClients = new Set();

// Whenever a report arrives, detect events and push to SSE clients
printer.onReport((report) => {
    const ev = detector.maybeEmit(report);
    if (!ev) return;

    const payload = `data: ${JSON.stringify(ev)}\n\n`;
    for (const res of sseClients) {
        try { res.write(payload); } catch { }
    }
});

app.get("/api/events", requireTokenSSE, (req, res) => {
    res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
    });

    const keepAlive = setInterval(() => res.write(":\n\n"), 15000);

    sseClients.add(res);
    req.on("close", () => {
        clearInterval(keepAlive);
        sseClients.delete(res);
    });
});

app.post("/api/events/test", requireToken, (req, res) => {
    const ev = {
        type: "test_event",
        at: new Date().toISOString(),
        summary: {
            state: "testing",
            file: "manual_test.3mf",
            progress: 42,
            layer: 12,
            totalLayers: 100,
            remaining: "1h 23m",
            nozzle: 215,
            bed: 60,
        },
    };

    const payload = `data: ${JSON.stringify(ev)}\n\n`;
    for (const client of sseClients) {
        try { client.write(payload); } catch { }
    }

    res.json({ ok: true });
});

app.post("/api/printer/morse", requireToken, async (req, res) => {
    const { text } = req.body;

    if (!text || typeof text !== "string") {
        return res.status(400).json({ error: "text is required" });
    }

    const result = await printer.morse(text);
    if (!result.ok) {
        return res.status(400).json(result);
    }

    res.json(result);
});

const PORT = 3000;
app.listen(PORT, () => console.log(`[API] http://localhost:${PORT}`));