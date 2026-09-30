import { it, expect } from "vitest";
import { loadPage, csv } from "./page.js";
it("draws two laps from CSV and GPX", async () => {
  const p = loadPage();
  await p.pick("a", p.file("a.csv", csv(200)));
  const gpx = '<gpx><trk><trkseg><trkpt lat="40.0" lon="-74.0"/><trkpt lat="40.001" lon="-74.0"/><trkpt lat="40.001" lon="-74.001"/></trkseg></trk></gpx>';
  await p.pick("b", p.file("b.gpx", gpx));
  expect(p.$("plot").hidden).toBe(false);
  expect(p.$("plot").querySelectorAll("path").length).toBe(2);
  expect(p.$("meta-b").textContent).toContain("3 pts");
});
it("rejects files with no lat/lon", async () => {
  const p = loadPage();
  await p.pick("a", p.file("x.csv", "a,b\n1,2\n3,4"));
  expect(p.$("error").hidden).toBe(false);
  expect(p.$("error").textContent).toMatch(/no lat\/lon/);
});
it("handles long sessions without crashing", async () => {
  const p = loadPage();
  await p.pick("a", p.file("a.csv", csv(200000)));
  await p.pick("b", p.file("b.csv", csv(200000)));
  expect(p.errors).toEqual([]);
  expect(p.$("plot").querySelectorAll("path").length).toBe(2);
}, 20000);
