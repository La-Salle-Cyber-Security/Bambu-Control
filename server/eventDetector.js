import { summarizeReport } from "./statusParser.js";

function normState(s) {
  if (!s) return "unknown";
  const x = String(s).toLowerCase();

  // Common-ish state patterns across firmwares
  if (x.includes("print") || x.includes("running")) return "printing";
  if (x.includes("pause")) return "paused";
  if (x.includes("finish") || x.includes("complete") || x === "idle" || x === "ready") return "idle";
  if (x.includes("fail") || x.includes("error") || x.includes("abort") || x.includes("stop")) return "error";
  return x;
}

export function createEventDetector() {
  let last = {
    state: null,
    file: null,
    progress: null,
    lastEventAt: 0,
  };

  // basic spam guard
  const minGapMs = 3000;

  function maybeEmit(report) {
    const summary = summarizeReport(report);
    if (!summary?.ok) return null;

    const state = normState(summary.state);
    const file = summary.file ?? null;
    const progress = summary.progress ?? null;

    const now = Date.now();
    const tooSoon = now - last.lastEventAt < minGapMs;

    // Detect major transitions
    let ev = null;

    if (last.state && state !== last.state && !tooSoon) {
      if (state === "printing") ev = { type: "print_started" };
      else if (state === "paused") ev = { type: "print_paused" };
      else if (state === "idle" && last.state === "printing") ev = { type: "print_finished" };
      else if (state === "error") ev = { type: "print_error" };
      else ev = { type: "state_changed", from: last.state, to: state };
    }

    // Optional: milestone pings (every 25%)
    if (!ev && typeof progress === "number" && !tooSoon) {
      const lastP = typeof last.progress === "number" ? last.progress : -1;
      const milestones = [25, 50, 75, 90];
      for (const m of milestones) {
        if (lastP < m && progress >= m) {
          ev = { type: "progress_milestone", milestone: m };
          break;
        }
      }
    }

    // Update last
    last.state = state;
    last.file = file;
    last.progress = progress;
    if (ev) last.lastEventAt = now;

    if (!ev) return null;

    // Attach context for Discord messages
    return {
      ...ev,
      at: new Date().toISOString(),
      summary: {
        state,
        file,
        progress,
        layer: summary.layer ?? null,
        totalLayers: summary.totalLayers ?? null,
        remaining: summary.remaining ?? null,
        nozzle: summary.nozzle ?? null,
        bed: summary.bed ?? null,
      },
    };
  }

  return { maybeEmit };
}