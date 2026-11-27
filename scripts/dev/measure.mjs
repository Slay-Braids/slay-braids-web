import { chromium } from "@playwright/test";
const browser = await chromium.launch();
const page = await browser.newPage();
await page.goto("http://127.0.0.1:4173/?tier=C");
await page.waitForTimeout(1500);
console.log(
  await page.evaluate(async () => {
    await document.fonts.ready;
    const c = document.createElement("canvas").getContext("2d");
    const out = {};
    for (const fam of ['"Bodoni Moda"', '"Bodoni Moda Fallback"']) {
      for (const [txt, it] of [
        ["Premium look.", ""],
        ["Affordable price.", "italic "],
        ["Affordable", "italic "],
      ]) {
        c.font = `${it}500 100px ${fam}`;
        out[`${fam} ${txt}`] = Math.round(c.measureText(txt).width) / 100;
      }
    }
    return JSON.stringify(out);
  }),
);
await browser.close();
