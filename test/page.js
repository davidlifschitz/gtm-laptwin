import { readFileSync } from "node:fs";
import { JSDOM } from "jsdom";
const root = new URL("../", import.meta.url);
const html = readFileSync(new URL("index.html", root), "utf8").replace(/<script type="module" src="\.\/app\.js"><\/script>/, "");
const app = readFileSync(new URL("app.js", root), "utf8");

export function loadPage() {
  const dom = new JSDOM(html, { runScripts: "dangerously", pretendToBeVisual: true });
  const w = dom.window;
  const errors = [];
  w.addEventListener("error", (e) => errors.push(e.error || e.message));
  w.eval(app);
  const $ = (id) => w.document.getElementById(id);
  const file = (name, text, size) => {
    const f = new w.File([text], name);
    f.text = async () => text;
    if (size) Object.defineProperty(f, "size", { value: size });
    return f;
  };
  const pick = async (which, f) => {
    const input = $("file-" + which);
    Object.defineProperty(input, "files", { value: [f], configurable: true });
    input.dispatchEvent(new w.Event("change"));
    await new Promise((r) => setTimeout(r, 10));
  };
  return { dom, window: w, $, file, pick, errors };
}
export const csv = (n, lat0 = 40, lon0 = -74) =>
  "lat,lon,speed\n" + Array.from({ length: n }, (_, i) => `${(lat0 + Math.sin(i / 50) * 0.001).toFixed(6)},${(lon0 + Math.cos(i / 50) * 0.001).toFixed(6)},${40 + (i % 20)}`).join("\n");
