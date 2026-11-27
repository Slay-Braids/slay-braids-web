// Opens the Vercel share link once and saves the resulting cookies (not committed).
import { chromium } from "@playwright/test";
const [, , url, out] = process.argv;
const b = await chromium.launch();
const ctx = await b.newContext();
const p = await ctx.newPage();
const r = await p.goto(url, { waitUntil: "domcontentloaded" });
console.log("status", r.status(), "final", p.url().replace(/_vercel_share=[^&]+/, "_vercel_share=…"), "title", await p.title());
await ctx.storageState({ path: out });
console.log("cookies", (await ctx.cookies()).map((c) => c.name).join(","));
await b.close();
