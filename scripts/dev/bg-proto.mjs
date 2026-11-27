// Prototype scene backgrounds (runtime only).
import { chromium } from "@playwright/test";
import sharp from "sharp";
const OUT = process.argv[2];
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const bgs = { white: [1, 1, 1], offwhite: [0.965, 0.96, 0.955], red: [198 / 255, 13 / 255, 19 / 255] };
const tiles = [];
for (const [mode, vp] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 412, height: 915 }]]) {
  const p = await b.newPage({ viewport: vp });
  await p.goto("http://127.0.0.1:4173/?tier=A&nodowngrade=1&windt=3&nodamp=1");
  await p.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120000 });
  await p.addStyleTag({ content: "main, header, footer, .grain, .chapter-index, .paper-layer, .preview-banner { visibility: hidden !important; } html,body{background:transparent}" });
  for (const [name, c] of Object.entries(bgs)) {
    for (const vh of [0, 150, 765]) {
      await p.evaluate(([c, vh]) => {
        const s = window.__chapters.currentScene;
        s.liveUniforms.uBg.value.set(...c);
        s.renderer.setClearColor((Math.round(c[0] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[2] * 255), 1);
        const px = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"));
        s.setScrollVh(vh, true); scrollTo(0, vh * px);
      }, [c, vh]);
      await p.waitForTimeout(1800);
      tiles.push({ label: `${mode} ${name} ${vh}`, png: await p.screenshot() });
    }
  }
  await p.close();
}
await b.close();
const comps = []; let x = 0, y = 0, rowH = 0;
for (const [i, t] of tiles.entries()) {
  const m = await sharp(t.png).metadata(); const port = m.width < m.height;
  const w = port ? 200 : 520, h = Math.round((m.height * w) / m.width);
  if (i === 9) { x = 0; y += rowH + 24; rowH = 0; }
  comps.push({ input: await sharp(t.png).resize(w, h).toBuffer(), left: x, top: y + 18 });
  comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="18"><text x="2" y="13" font-family="monospace" font-size="12" fill="#0f0">${t.label}</text></svg>`), left: x, top: y });
  x += w + 6; rowH = Math.max(rowH, h + 18);
}
await sharp({ create: { width: 9 * 526, height: y + rowH + 10, channels: 3, background: "#555" } }).composite(comps).jpeg({ quality: 80 }).toFile(OUT);
console.log(OUT);
