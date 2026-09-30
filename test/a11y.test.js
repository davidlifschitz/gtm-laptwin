import { it, expect } from "vitest";
import { loadPage } from "./page.js";
it("names the plot, inputs and live regions", () => {
  const { $ } = loadPage();
  expect($("plot").getAttribute("role")).toBe("img");
  expect($("plot").getAttribute("aria-label")).toMatch(/lap/i);
  expect($("file-a").getAttribute("aria-label")).toMatch(/lap a/i);
  expect($("file-b").getAttribute("aria-label")).toMatch(/lap b/i);
  expect($("error").getAttribute("role")).toBe("alert");
  expect($("status").getAttribute("role")).toBe("status");
});
