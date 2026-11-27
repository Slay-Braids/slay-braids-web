// Renders docs/M2-ch1-3-assessment.md as a page (docs/review/assessment/index.html). Small,
// purpose-built converter for this document's Markdown (headings, tables, lists, bold, links).
import { readFile, writeFile, mkdir } from "node:fs/promises";
const src = await readFile("docs/M2-ch1-3-assessment.md", "utf8");
const esc = (s) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c],
  );
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, "<b>$1</b>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/(https:\/\/[^\s)<]+)/g, '<a href="$1">$1</a>');
const lines = src.split("\n");
let html = "",
  i = 0;
while (i < lines.length) {
  const l = lines[i];
  if (/^# /.test(l)) {
    html += `<h1>${inline(l.slice(2))}</h1>`;
    i++;
    continue;
  }
  if (/^## /.test(l)) {
    html += `<h2>${inline(l.slice(3))}</h2>`;
    i++;
    continue;
  }
  if (/^\|/.test(l)) {
    const rows = [];
    while (i < lines.length && /^\|/.test(lines[i])) rows.push(lines[i++]);
    const cells = (r) =>
      r
        .replace(/^\||\|$/g, "")
        .split("|")
        .map((c) => c.trim());
    html += `<div class="scroll"><table><thead><tr>${cells(rows[0])
      .map((c) => `<th>${inline(c)}</th>`)
      .join("")}</tr></thead><tbody>${rows
      .slice(2)
      .map(
        (r) =>
          `<tr>${cells(r)
            .map((c) => `<td>${inline(c)}</td>`)
            .join("")}</tr>`,
      )
      .join("")}</tbody></table></div>`;
    continue;
  }
  if (/^(\d+\.|-) /.test(l)) {
    const ordered = /^\d+\./.test(l);
    const items = [];
    while (i < lines.length && (/^(\d+\.|-) /.test(lines[i]) || /^ {2,}\S/.test(lines[i]))) {
      if (/^(\d+\.|-) /.test(lines[i])) items.push(lines[i].replace(/^(\d+\.|-) /, ""));
      else items[items.length - 1] += " " + lines[i].trim();
      i++;
    }
    html += `<${ordered ? "ol" : "ul"}>${items.map((x) => `<li>${inline(x)}</li>`).join("")}</${ordered ? "ol" : "ul"}>`;
    continue;
  }
  if (l.trim() === "") {
    i++;
    continue;
  }
  const para = [];
  while (i < lines.length && lines[i].trim() !== "" && !/^(#|\||\d+\. |- )/.test(lines[i]))
    para.push(lines[i++]);
  html += `<p>${inline(para.join(" "))}</p>`;
}
const page = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Chapters 1–3 assessment</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:opsz,wght@6..96,500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
<style>
/* VOICE: a one-page engineering memo: verdict first, evidence, unknowns, blockers.
   IDEA: a well-set memo on the brand's ivory paper.  PICTURE: the evidence table.
   COLOUR and TYPE: ivory ground, espresso type, champagne rules; Bodoni Moda headings, Inter body.
   LAYOUT: one 760 px column; the recommendation set apart at the top. */
:root{color-scheme:light dark;--bg:light-dark(#f2ece2,#13100d);--fg:light-dark(#1c1612,#efe8dc);--mute:light-dark(#5e5248,#b9ad9d);--rule:light-dark(#d8cebf,#3a322a);--ch:light-dark(#8a6a3f,#d8c3a0);--card:light-dark(#fbf7f1,#1c1814)}
:root[data-theme=light]{color-scheme:light}:root[data-theme=dark]{color-scheme:dark}
*{box-sizing:border-box;min-width:0}body{margin:0;background:var(--bg);color:var(--fg);font:16px/1.6 Inter,system-ui,sans-serif;overflow-x:clip}
main{max-width:760px;margin:0 auto;padding:clamp(24px,5vw,56px) max(5vw,16px)}
h1,h2{font-family:"Bodoni Moda",Georgia,serif;font-weight:500;line-height:1.08;text-wrap:balance}
h1{font-size:clamp(32px,5vw,44px);margin:0 0 .4em}h2{font-size:clamp(23px,3vw,30px);margin:1.6em 0 .5em;padding-top:.6em;border-top:1px solid var(--rule)}
h2:first-of-type+p{background:var(--card);border-left:3px solid var(--ch);padding:14px 16px}
table{border-collapse:collapse;width:100%;font-size:14px}th,td{text-align:left;vertical-align:top;padding:9px 8px;border-bottom:1px solid var(--rule)}th{font-size:13px;color:var(--mute)}
.scroll{overflow-x:auto}code{font-size:13px;overflow-wrap:anywhere}a{color:var(--fg);overflow-wrap:anywhere}p,li{overflow-wrap:anywhere}li{margin:6px 0}
@media(max-width:600px){table{font-size:13px}}
</style></head><body><main>${html}</main></body></html>`;
await mkdir("docs/review/assessment", { recursive: true });
await writeFile("docs/review/assessment/index.html", page);
console.log("docs/review/assessment/index.html");
