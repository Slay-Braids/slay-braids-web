/**
 * M3 text contrast, Chapters 4–7, live page. For each settled position (FUTURA, each product,
 * the lookbook spread, the promise) and viewport: every visible text element's colour (with
 * its alpha and its effective opacity) is composited over the brightest 5 % of the pixels
 * behind it (type hidden, layout kept), and the WCAG ratio is computed. Judged against WCAG AA
 * (4.5:1 normal text, 3:1 large text ≥ 24 px, or ≥ 18.66 px bold) and reported against 7:1 (AAA).
 * SwiftShader render of the locked scene. node scripts/story-contrast.mjs → docs/perf/m3-contrast.json
 */
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { writeFile, mkdir } from "node:fs/promises";

const BASE = process.env.BASE ?? "http://127.0.0.1:4173/";
const VIEWPORTS = [
  { name: "desktop 1440×900", width: 1440, height: 900, mobile: false, o: "landscape" },
  { name: "desktop 1920×1080", width: 1920, height: 1080, mobile: false, o: "landscape" },
  { name: "mobile 412×915", width: 412, height: 915, mobile: true, o: "portrait" },
  { name: "mobile 390×844", width: 390, height: 844, mobile: true, o: "portrait" },
];
// v4: all seven chapters at their resting positions (and the FUTURA features), per theme.
const THEME = process.env.THEME === "dark" ? "dark" : "light";
const AT = {
  landscape: { ch1: 0, ch2: 150, ch3: 400, ch4: 700, ch4feat: 765, p1: 850, p2: 900, p3: 950, p4: 1000, ch6: 1195, ch7: 1375 },
  portrait: { ch1: 0, ch2: 130, ch3: 360, ch4: 620, ch4featA: 650, ch4feat: 685, p1: 800, p2: 880, p3: 960, p4: 1040, ch6: 1205, ch7: 1365 },
};
const PHASES = [0, 2.1];
const lin = (c) => ((c /= 255) <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const lum = (r, g, b) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

const browser = await chromium.launch({
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});
const results = [];
for (const vp of VIEWPORTS) {
  for (const phase of PHASES) {
    const page = await browser.newPage({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 1,
      isMobile: vp.mobile,
      hasTouch: vp.mobile,
      colorScheme: THEME,
    });
    await page.goto(`${BASE}?tier=A&nodowngrade=1&nodamp=1&windt=${phase}`);
    await page.waitForFunction(() => window.__slay?.live === true, null, { timeout: 180000 });
    for (const [where, v] of Object.entries(AT[vp.o])) {
      const items = await page.evaluate(async (v) => {
        const vh = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--vh"));
        scrollTo(0, v * vh);
        const frames = (n) =>
          new Promise((r) => {
            const f = () => (n-- ? requestAnimationFrame(f) : r());
            f();
          });
        await frames(3);
        await new Promise((r) => setTimeout(r, 1300));
        await frames(2);
        const els = [
          ...document.querySelectorAll(
            ".ch1 *, .ch2-copy *, .ch3-content *, .ch4-frame *, .ch5-frame *, .ch6-frame *, .ch7-frame *, .header-actions *",
          ),
        ].filter(
          (e) =>
            !e.closest("[aria-hidden=true]") &&
            [...e.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim()) &&
            !e.closest(".sr-only"),
        );
        const out = [];
        for (const e of els) {
          let op = 1;
          for (let p = e; p; p = p.parentElement) op *= parseFloat(getComputedStyle(p).opacity);
          const r = e.getBoundingClientRect();
          if (op < 0.98 || r.width < 2 || r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) continue;
          const cs = getComputedStyle(e);
          const m = cs.color.match(/[\d.]+/g).map(Number);
          const size = parseFloat(cs.fontSize);
          const bold = parseInt(cs.fontWeight) >= 700;
          // Text on its own opaque background (buttons): judged against that colour.
          let solid = null;
          for (let p = e, k = 0; p && k < 3; p = p.parentElement, k++) {
            const b = getComputedStyle(p).backgroundColor.match(/[\d.]+/g)?.map(Number);
            if (b && (b[3] ?? 1) === 1) { solid = b.slice(0, 3); break; }
          }
          out.push({
            text: [...e.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent.trim()).join(" ").slice(0, 48),
            rect: [r.left, r.top, r.width, r.height],
            color: m.slice(0, 3),
            alpha: (m[3] ?? 1) * op,
            large: size >= 24 || (bold && size >= 18.66),
            solid,
            size,
          });
          e.dataset.ctHide = "1";
        }
        const st = document.createElement("style");
        st.id = "ct-hide";
        st.textContent = "[data-ct-hide]{color:transparent!important;text-shadow:none!important;-webkit-text-stroke-color:transparent!important}";
        document.head.append(st);
        await frames(2);
        return out;
      }, v);
      const png = await page.screenshot();
      await page.evaluate(() => {
        document.getElementById("ct-hide")?.remove();
        document.querySelectorAll("[data-ct-hide]").forEach((e) => delete e.dataset.ctHide);
      });
      const { data, info } = await sharp(png).raw().toBuffer({ resolveWithObject: true });
      for (const it of items) {
        const [x, y, w, h] = it.rect.map(Math.round);
        const x0 = Math.max(0, x), y0 = Math.max(0, y), x1 = Math.min(info.width, x + w), y1 = Math.min(info.height, y + h);
        if (x1 <= x0 || y1 <= y0) continue;
        const px = [];
        for (let yy = y0; yy < y1; yy++)
          for (let xx = x0; xx < x1; xx++) {
            const k = (yy * info.width + xx) * info.channels;
            px.push([data[k], data[k + 1], data[k + 2]]);
          }
        px.sort((a, b) => lum(...a) - lum(...b));
        // Light text: judge against the brightest 5 % behind it; dark text: the darkest 5 %.
        const fgL = lum(...it.color);
        const bg = it.solid ?? (fgL > 0.4 ? px[Math.floor(px.length * 0.95)] : px[Math.floor(px.length * 0.05)]);
        const a = it.alpha;
        const txt = it.color.map((c, j) => a * c + (1 - a) * bg[j]);
        const r = +ratio(lum(...txt), lum(...bg)).toFixed(2);
        const need = it.large ? 3 : 4.5;
        results.push({ viewport: vp.name, phase, where, vh: v, text: it.text, size: it.size, large: it.large, ratio: r, need, pass: r >= need, aaa: r >= (it.large ? 4.5 : 7) });
      }
    }
    await page.close();
  }
}
await browser.close();
const fails = results.filter((r) => !r.pass);
const worst = [...results].sort((a, b) => a.ratio / a.need - b.ratio / b.need).slice(0, 8);
const summary = {
  generated: new Date().toISOString(),
  renderer: "headless Chromium, SwiftShader (simulated GPU)",
  theme: THEME,
  samples: results.length,
  failingAA: fails.length,
  belowAAA: results.filter((r) => !r.aaa).length,
  worst,
};
await mkdir("docs/perf", { recursive: true });
await writeFile(`docs/perf/v4-contrast-${THEME}.json`, JSON.stringify({ summary, results }, null, 2) + "\n");
console.log(JSON.stringify(summary, null, 1));
