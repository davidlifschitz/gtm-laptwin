import { it, expect } from "vitest";
import { loadPage } from "./page.js";
it("reads semicolon CSV with decimal commas", async () => {
  const p = loadPage();
  await p.pick("a", p.file("a.csv", "Latitude;Longitude;Speed\n40,0001;-74,0001;30,5\n40,0011;-74,0001;41\n40,0011;-74,0011;35\n40,0001;-74,0011;35,5"));
  expect(p.$("error").hidden).toBe(true);
  expect(p.$("meta-a").textContent).toContain("4 pts");
  expect(p.$("v-a").textContent).toBe("top 41 · avg 35.5");
});
it("reads quoted headers", async () => {
  const p = loadPage();
  await p.pick("a", p.file("a.csv", '"lat","lon"\n40,-74\n40.001,-74'));
  expect(p.$("meta-a").textContent).toContain("2 pts");
});
