// Screenshots of reference sites for design inspiration only (not committed output).
import { chromium } from "@playwright/test";
import sharp from "sharp";
const [, , out, ...urls] = process.argv;
const b = await chromium.launch();
const tiles = [];
for (const u of urls) {
  for (const [name, vp] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    const p = await b.newPage({ viewport: vp, userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36" });
    try {
      await p.goto(u, { waitUntil: "domcontentloaded", timeout: 60000 });
      await p.waitForTimeout(5000);
      // dismiss common popups
      await p.keyboard.press("Escape").catch(() => {});
      const shot = await p.screenshot({ fullPage: true });
      const m = await sharp(shot).metadata();
      const h = Math.min(m.height, vp.width === 1440 ? 5400 : 6000);
      tiles.push({ label: `${u} ${name}`, png: await sharp(shot).extract({ left: 0, top: 0, width: m.width, height: h }).resize({ width: name === "desktop" ? 480 : 200 }).toBuffer() });
    } catch (e) { console.log("fail", u, name, e.message.slice(0, 80)); }
    await p.close();
  }
}
await b.close();
let x = 0; const comps = []; let H = 0;
for (const t of tiles) { const m = await sharp(t.png).metadata(); comps.push({ input: t.png, left: x, top: 20 }); comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${m.width}" height="20"><text x="2" y="14" font-family="monospace" font-size="11" fill="#fff">${t.label.replace(/https:\/\//, "")}</text></svg>`), left: x, top: 0 }); x += m.width + 8; H = Math.max(H, m.height + 20); }
await sharp({ create: { width: x, height: H, channels: 3, background: "#333" } }).composite(comps).jpeg({ quality: 78 }).toFile(out);
console.log(out);
