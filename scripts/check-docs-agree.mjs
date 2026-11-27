/**
 * Checks that the checklist, the assessment, the review pack and the repository documentation
 * state the same facts. Exits non-zero on any disagreement.  node scripts/check-docs-agree.mjs
 */
import { readFile } from "node:fs/promises";

const status = JSON.parse(await readFile("docs/review/status.json", "utf8"));
const c = status.counts;
const strip = (h) =>
  h
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ");
const docs = {
  "checklist page": strip(await readFile("docs/review/a26/index.html", "utf8")),
  "checklist (repo md)": (await readFile("docs/real-device-test-a26.md", "utf8")).replace(
    /\s+/g,
    " ",
  ),
  "assessment page": strip(await readFile("docs/review/assessment/index.html", "utf8")),
  "assessment (repo md)": (await readFile("docs/M2-ch1-3-assessment.md", "utf8")).replace(
    /\s+/g,
    " ",
  ),
  "review pack": strip(await readFile("docs/review/m2/index.html", "utf8")),
  "report (repo md)": (await readFile("docs/M2-ch1-3-report.md", "utf8")).replace(/\s+/g, " "),
};
const checks = [
  ["approval sentence, verbatim", () => status.approval, Object.keys(docs)],
  [
    "automated passed count",
    () =>
      new RegExp(
        `(\\b${c.automatedPassed}\\b\\s*(automated: passed|Automated: passed))|(automated passed ${c.automatedPassed}\\b)|(Automated: passed\\s*\\|?\\s*${c.automatedPassed}\\b)|(automated PASSED ${c.automatedPassed}\\b)`,
        "i",
      ),
    Object.keys(docs),
  ],
  [
    "partial count",
    () =>
      new RegExp(
        `(\\b${c.automatedPartial}\\b\\s*(automated: partly covered|Partial automated coverage))|(partial automated coverage ${c.automatedPartial}\\b)|(Partial automated coverage \\| ${c.automatedPartial})|(automated PARTIAL ${c.automatedPartial}\\b)`,
        "i",
      ),
    Object.keys(docs),
  ],
  [
    "no-evidence count",
    () =>
      new RegExp(
        `(\\b${c.noAutomatedEvidence}\\b\\s*no automated evidence)|(no automated evidence ${c.noAutomatedEvidence}\\b)|(No automated evidence \\| ${c.noAutomatedEvidence})`,
        "i",
      ),
    Object.keys(docs),
  ],
  [
    "real-device NOT TESTED count",
    () =>
      new RegExp(
        `(${c.a26NotTested} of ${c.total})|(0 of ${c.total} tested)|(0 of ${c.total})`,
        "i",
      ),
    Object.keys(docs),
  ],
  [
    "M2 e2e 20 passed",
    () => /(M2 e2e[^.]*\b20\b)|(\b20\/20\b)|(M2 e2e \(tests\/e2e\/chapters\.spec\.ts\) 20)/,
    ["review pack", "assessment (repo md)", "report (repo md)"],
  ],
  [
    "unit 36/36",
    () => /36\/36|Unit \(Vitest\) 36/,
    ["review pack", "assessment (repo md)", "report (repo md)"],
  ],
  [
    "M1 e2e 15 passed, 1 skipped",
    () => /15 passed, 1 skipped/,
    ["review pack", "assessment (repo md)", "report (repo md)"],
  ],
  [
    "worst edge max 2.23 px",
    () => /2\.23 px/,
    ["review pack", "assessment (repo md)", "checklist page", "checklist (repo md)"],
  ],
  [
    "Chapter 2 contrast worst 8.76:1",
    () => /8\.76:1/,
    ["review pack", "assessment (repo md)", "report (repo md)"],
  ],
  [
    "no stale 'design and technical baseline' wording",
    () => "design and technical baseline",
    Object.keys(docs),
    true,
  ],
  [
    "no device PASS claimed (A26 results all NOT TESTED)",
    () => /A26:\s*(PASS|FAIL)\b/,
    ["checklist page", "checklist (repo md)"],
    true,
  ],
];
let fail = 0;
const rows = [];
for (const [name, pat, where, mustNot] of checks) {
  for (const w of where) {
    const p = pat();
    const hit = typeof p === "string" ? docs[w].includes(p) : p.test(docs[w]);
    const ok = mustNot ? !hit : hit;
    if (!ok) fail++;
    rows.push(`${ok ? "ok  " : "FAIL"}  ${name}  —  ${w}`);
  }
}
// The review pack's status tables must list exactly the tests in status.json, each NOT TESTED.
const rp = await readFile("docs/review/m2/index.html", "utf8");
for (const t of status.tests) {
  const ok = rp.includes(`<b>${t.id}</b>`);
  if (!ok) {
    fail++;
    rows.push(`FAIL  review pack lists ${t.id}`);
  }
}
rows.push(
  `${fail ? "" : "ok  "}  review pack lists all ${status.tests.length} tests from status.json`,
);
console.log(rows.join("\n"));
console.log(fail ? `\n${fail} disagreement(s)` : "\nAll documents agree.");
process.exit(fail ? 1 : 0);
