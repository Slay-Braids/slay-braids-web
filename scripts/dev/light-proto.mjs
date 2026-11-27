// Prototype lighting variants on the live scene (runtime uniforms only; nothing is saved).
import { chromium } from "@playwright/test";
import sharp from "sharp";
const OUT = process.argv[2];
const b = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
const variants = {
  A_current: null,
  B_white: { key: [1, 1, 1, 2.4], fill: [0.3, 0.3, 0.32] },
  C_white_redfill: { key: [1, 0.98, 0.96, 2.4], fill: [0.62, 0.05, 0.06] },
};
const tiles = [];
for (const [mode, vp] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 412, height: 915 }]]) {
  const p = await b.newPage({ viewport: vp });
  await p.goto("http://127.0.0.1:4173/?tier=A&nodowngrade=1&windt=3&nodamp=1");
  await p.waitForFunction(() => window.__slay?.live === true, null, { timeout: 120000 });
  await p.addStyleTag({ content: "main, header, footer, .grain, .chapter-index, .paper-layer { visibility: hidden !important; }" });
  for (const [name, v] of Object.entries(variants)) {
    for (const vh of [0, 150, 685]) {
      await p.evaluate(([v, vh]) => {
        const u = window.__chapters.currentScene.liveUniforms;
        if (!window.__orig) window.__orig = { key: u.uKeyColor.value.clone(), fill: u.uFillColor.value.clone() };
        if (v) { u.uKeyColor.value.set(v.key[0], v.key[1], v.key[2]).multiplyScalar(v.key[3]); u.uFillColor.value.set(...v.fill); }
        else { u.uKeyColor.value.copy(window.__orig.key); u.uFillColor.value.copy(window.__orig.fill); }
        window.__chapters.setScrollPx(vh * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh")), true);
        scrollTo(0, vh * parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh")));
      }, [v, vh]);
      await p.waitForTimeout(1800);
      tiles.push({ label: `${mode} ${name} ${vh}vh`, png: await p.screenshot() });
    }
  }
  await p.close();
}
await b.close();
const W = 420, comps = [];
let x = 0, y = 0, rowH = 0;
for (const [i, t] of tiles.entries()) {
  const m = await sharp(t.png).metadata();
  const h = Math.round((m.height * W) / m.width * (m.width < m.height ? 0.5 : 1));
  const w = m.width < m.height ? Math.round(W * 0.5) : W;
  if (i % 9 === 0 && i) { x = 0; y += rowH + 28; rowH = 0; }
  comps.push({ input: await sharp(t.png).resize(w, Math.round(h)).toBuffer(), left: x, top: y + 20 });
  comps.push({ input: Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="20"><text x="2" y="14" font-family="monospace" font-size="12" fill="#fff">${t.label}</text></svg>`), left: x, top: y });
  x += w + 6; rowH = Math.max(rowH, Math.round(h) + 20);
}
await sharp({ create: { width: 9 * 426, height: y + rowH + 30, channels: 3, background: "#222" } }).composite(comps).jpeg({ quality: 82 }).toFile(OUT);
console.log(OUT);
