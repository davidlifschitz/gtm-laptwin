import { it, expect } from "vitest";
import { loadPage, csv } from "./page.js";
it("shows top and average speed when the CSV has it", async () => {
  const p = loadPage();
  await p.pick("a", p.file("a.csv", "lat,lon,speed\n40,-74,30\n40.001,-74,50\n40.001,-74.001,40"));
  await p.pick("b", p.file("b.csv", "lat,lon\n40,-74\n40.001,-74\n40.001,-74.001"));
  expect(p.$("v-a").textContent).toBe("top 50 · avg 40");
  expect(p.$("v-b").textContent).toBe("no speed column");
});
