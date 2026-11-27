// Dev aid (v4): hero on a 320 px phone in dark mode (header on one line, nothing overlapping).
import { chromium, devices } from "@playwright/test";
const b = await chromium.launch();
const p = await b.newPage({ ...devices["Galaxy S9+"], colorScheme: "dark" });
await p.goto((process.argv[2] ?? "http://127.0.0.1:4173") + "/?tier=C");
await p.waitForTimeout(1500);
console.log(await p.evaluate(() => ({
  pauseHeight: document.querySelector(".motion-toggle").getBoundingClientRect().height,
  cue: getComputedStyle(document.querySelector(".ch1 .scroll-cue")).display,
  width: innerWidth,
})));
await p.screenshot({ path: process.argv[3] ?? "narrow.png" });
await b.close();
