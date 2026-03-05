function pick(obj, paths) {
  for (const p of paths) {
    const parts = p.split(".");
    let cur = obj;
    let ok = true;
    for (const part of parts) {
      if (cur && Object.prototype.hasOwnProperty.call(cur, part)) cur = cur[part];
      else { ok = false; break; }
    }
    if (ok && cur !== undefined && cur !== null) return cur;
  }
  return undefined;
}

export function summarizeReport(report) {
  // report shape varies by firmware/X1Plus/Bambu updates, so we do “best effort” picking.
  if (!report || typeof report !== "object") return { ok: false, error: "No report yet" };

  const state = pick(report, [
    "print.status",
    "print.gcode_state",
    "print.state",
    "print_status",
    "status",
  ]);

  const progress = pick(report, [
    "print.progress",
    "print.mc_percent",
    "mc_percent",
    "progress",
  ]);

  const file = pick(report, [
    "print.file",
    "print.gcode_file",
    "print.filename",
    "gcode_file",
    "file",
  ]);

  const layer = pick(report, [
    "print.layer_num",
    "print.current_layer",
    "layer_num",
    "current_layer",
  ]);

  const totalLayers = pick(report, [
    "print.total_layer_num",
    "print.total_layers",
    "total_layer_num",
    "total_layers",
  ]);

  const remaining = pick(report, [
    "print.mc_remaining_time",
    "mc_remaining_time",
    "remaining_time",
  ]);

  const nozzle = pick(report, [
    "temp.nozzle",
    "temps.nozzle",
    "nozzle_temper",
    "print.nozzle_temper",
  ]);

  const bed = pick(report, [
    "temp.bed",
    "temps.bed",
    "bed_temper",
    "print.bed_temper",
  ]);

  return {
    ok: true,
    state,
    file,
    progress,
    layer,
    totalLayers,
    remaining,
    nozzle,
    bed,
    // keep some raw in case we want to expand later
    rawKeys: Object.keys(report).slice(0, 30),
  };
}