const MAX_BYTES = 8 * 1024 * 1024;

const els = {
  dropA: document.getElementById("drop-a"),
  dropB: document.getElementById("drop-b"),
  pickA: document.getElementById("pick-a"),
  pickB: document.getElementById("pick-b"),
  fileA: document.getElementById("file-a"),
  fileB: document.getElementById("file-b"),
  metaA: document.getElementById("meta-a"),
  metaB: document.getElementById("meta-b"),
  status: document.getElementById("status"),
  error: document.getElementById("error"),
  stats: document.getElementById("stats"),
  sa: document.getElementById("s-a"),
  sb: document.getElementById("s-b"),
  plot: document.getElementById("plot"),
  legend: document.getElementById("legend"),
  va: document.getElementById("v-a"),
  vb: document.getElementById("v-b"),
};

let lapA = null;
let lapB = null;

function setError(msg) {
  els.error.hidden = !msg;
  els.error.textContent = msg || "";
}

function haversine(a, b) {
  const R = 6371000;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLon = (b.lon - a.lon) * r;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(x));
}

function distance(pts) {
  let d = 0;
  for (let i = 1; i < pts.length; i++) d += haversine(pts[i - 1], pts[i]);
  return d;
}

function parseCsv(text) {
  const lines = text.replace(/^\uFEFF/, "").trim().split(/\r?\n/);
  if (lines.length < 2) return [];
  const sep = lines[0].split(";").length > lines[0].split(",").length ? ";" : ",";
  const num = (v) => Number(sep === ";" ? String(v).trim().replace(",", ".") : v);
  const headers = lines[0].split(sep).map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const latI = headers.findIndex((h) => /^(lat|latitude|gps_lat)$/.test(h));
  const lonI = headers.findIndex((h) => /^(lon|lng|long|longitude|gps_lon)$/.test(h));
  const spdI = headers.findIndex((h) => /^(speed|spd|velocity|kph|mph)$/.test(h));
  if (latI < 0 || lonI < 0) return [];
  const pts = [];
  for (const line of lines.slice(1)) {
    const cols = line.split(sep);
    const lat = num(cols[latI]);
    const lon = num(cols[lonI]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    if (Math.abs(lat) > 90 || Math.abs(lon) > 180) continue;
    const speed = spdI >= 0 ? num(cols[spdI]) : null;
    pts.push({ lat, lon, speed: Number.isFinite(speed) ? speed : null });
  }
  return pts;
}

function parseGpx(text) {
  const pts = [];
  const re = /<trkpt[^>]*lat="([^"]+)"[^>]*lon="([^"]+)"[^>]*>/gi;
  let m;
  while ((m = re.exec(text))) {
    pts.push({ lat: Number(m[1]), lon: Number(m[2]), speed: null });
  }
  if (!pts.length) {
    const re2 = /<trkpt[^>]*lon="([^"]+)"[^>]*lat="([^"]+)"[^>]*>/gi;
    while ((m = re2.exec(text))) {
      pts.push({ lat: Number(m[2]), lon: Number(m[1]), speed: null });
    }
  }
  return pts.filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
}

function parseFile(name, text) {
  if (/\.gpx$/i.test(name) || text.includes("<trkpt")) return parseGpx(text);
  return parseCsv(text);
}

function pathD(pts, box) {
  const { minLat, maxLat, minLon, maxLon } = box;
  const pad = 24;
  const w = 640 - pad * 2;
  const h = 288 - pad * 2;
  const dx = maxLon - minLon || 1e-6;
  const dy = maxLat - minLat || 1e-6;
  const aspect = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const sx = w / (dx * aspect);
  const sy = h / dy;
  const s = Math.min(sx, sy);
  const ox = pad + (w - dx * aspect * s) / 2;
  const oy = pad + (h - dy * s) / 2;
  return pts
    .map((p, i) => {
      const x = ox + (p.lon - minLon) * aspect * s;
      const y = oy + (maxLat - p.lat) * s;
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}

function speedText(pts) {
  let top = -Infinity;
  let sum = 0;
  let n = 0;
  for (const p of pts) {
    if (p.speed == null) continue;
    if (p.speed > top) top = p.speed;
    sum += p.speed;
    n++;
  }
  if (!n) return pts.length ? "no speed column" : "";
  const r = (v) => (Math.round(v * 10) / 10).toString();
  return `top ${r(top)} · avg ${r(sum / n)}`;
}

function fmtM(m) {
  if (m >= 1000) return (m / 1000).toFixed(2) + " km";
  return Math.round(m) + " m";
}

function draw() {
  const a = lapA?.pts || [];
  const b = lapB?.pts || [];
  const all = a.concat(b);
  if (all.length < 4) {
    els.plot.hidden = true;
    els.legend.hidden = true;
    els.stats.hidden = true;
    els.status.textContent = "Waiting for two laps with lat/lon.";
    return;
  }
  const box = { minLat: Infinity, maxLat: -Infinity, minLon: Infinity, maxLon: -Infinity };
  for (const p of all) {
    if (p.lat < box.minLat) box.minLat = p.lat;
    if (p.lat > box.maxLat) box.maxLat = p.lat;
    if (p.lon < box.minLon) box.minLon = p.lon;
    if (p.lon > box.maxLon) box.maxLon = p.lon;
  }
  const da = a.length ? pathD(a, box) : "";
  const db = b.length ? pathD(b, box) : "";
  els.plot.innerHTML =
    (da ? `<path d="${da}" fill="none" stroke="#0f766e" stroke-width="2"/>` : "") +
    (db ? `<path d="${db}" fill="none" stroke="#9a3412" stroke-width="2"/>` : "");
  els.plot.hidden = false;
  els.legend.hidden = false;
  els.stats.hidden = false;
  els.sa.textContent = a.length ? fmtM(distance(a)) : "—";
  els.sb.textContent = b.length ? fmtM(distance(b)) : "—";
  els.va.textContent = speedText(a);
  els.vb.textContent = speedText(b);
  els.status.textContent = `${a.length} pts A · ${b.length} pts B · files stayed in this tab`;
}

async function loadLap(which, file) {
  setError("");
  if (file.size > MAX_BYTES) {
    setError(`${file.name} is over 8 MB.`);
    return;
  }
  const text = await file.text();
  const pts = parseFile(file.name, text);
  if (pts.length < 2) {
    setError(`${file.name} has no lat/lon I can read. Use CSV headers lat,lon or a GPX track.`);
    return;
  }
  if (which === "a") {
    lapA = { name: file.name, pts };
    els.metaA.textContent = `${file.name} · ${pts.length} pts`;
  } else {
    lapB = { name: file.name, pts };
    els.metaB.textContent = `${file.name} · ${pts.length} pts`;
  }
  draw();
}

function bind(drop, pick, input, which) {
  pick.addEventListener("click", () => input.click());
  input.addEventListener("change", () => {
    if (input.files[0]) loadLap(which, input.files[0]);
    input.value = "";
  });
  ["dragenter", "dragover"].forEach((ev) =>
    drop.addEventListener(ev, (e) => {
      e.preventDefault();
      drop.classList.add("over");
    })
  );
  drop.addEventListener("dragleave", () => drop.classList.remove("over"));
  drop.addEventListener("drop", (e) => {
    e.preventDefault();
    drop.classList.remove("over");
    if (e.dataTransfer.files[0]) loadLap(which, e.dataTransfer.files[0]);
  });
}

bind(els.dropA, els.pickA, els.fileA, "a");
bind(els.dropB, els.pickB, els.fileB, "b");
draw();
