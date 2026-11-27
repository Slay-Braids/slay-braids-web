/**
 * Deploys the static export (out/) to Vercel as a PREVIEW deployment (never production).
 *
 *   NODE_USE_ENV_PROXY=1 node scripts/deploy-preview.mjs        (after `pnpm build`)
 *
 * NOT YET RUN in this (staged) form: it needs the project owner's go-ahead (docs/M3-handoff.md §6).
 *
 * - Uses the Vercel REST API. In this environment the API token is injected by the network
 *   proxy; elsewhere set VERCEL_TOKEN.
 * - Team slay-braids, project slay-braids-web (created on first run if it does not exist).
 * - `target: "preview"` is sent explicitly. (Without it, the API made the project's first
 *   deployment a production deployment on 27 Nov 2026; that deployment was deleted within
 *   minutes.) A guard deletes any deployment that comes back with target production.
 *   A preview gets its own immutable URL and touches no production deployment or domain.
 *   Every preview stays available, which is the rollback path.
 * - vercel.json (headers, clean URLs) is uploaded with the files.
 */
import { createHash } from "node:crypto";
import { readFile, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

const TEAM = process.env.VERCEL_TEAM ?? "team_rLjEky52UnFRCh8Z3cOslvT4";
const PROJECT = process.env.VERCEL_PROJECT ?? "slay-braids-web";
const TOKEN = process.env.VERCEL_TOKEN ?? "proxy-injected";
const API = "https://api.vercel.com";
const H = { Authorization: `Bearer ${TOKEN}` };
const q = `teamId=${TEAM}`;

async function api(method, url, body, headers = {}) {
  for (let attempt = 0; attempt < 4; attempt++) {
    const r = await fetch(`${API}${url}${url.includes("?") ? "&" : "?"}${q}`, {
      method,
      headers: { ...H, ...(body && !(body instanceof Buffer) ? { "Content-Type": "application/json" } : {}), ...headers },
      body: body instanceof Buffer ? body : body ? JSON.stringify(body) : undefined,
    });
    if (r.status >= 500 || r.status === 429) {
      await new Promise((res) => setTimeout(res, 1000 * 2 ** attempt));
      continue;
    }
    const text = await r.text();
    const json = text ? JSON.parse(text) : {};
    if (!r.ok) throw Object.assign(new Error(`${method} ${url} → ${r.status} ${text.slice(0, 300)}`), { status: r.status, json });
    return json;
  }
  throw new Error(`${method} ${url}: retries exhausted`);
}

async function walk(dir, base = dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...(await walk(p, base)));
    else out.push({ abs: p, file: path.relative(base, p).split(path.sep).join("/") });
  }
  return out;
}

// 1. Project (create if missing; framework "Other": the files are served as they are).
let project;
try {
  project = await api("GET", `/v9/projects/${PROJECT}`);
} catch (e) {
  if (e.status !== 404) throw e;
  project = await api("POST", "/v11/projects", { name: PROJECT, framework: null });
  console.log(`created project ${project.name} (${project.id})`);
}

// 2. Files: out/ plus vercel.json.
const files = await walk(path.resolve("out"));
files.push({ abs: path.resolve("vercel.json"), file: "vercel.json" });
const manifest = [];
let uploaded = 0;
for (const f of files) {
  const buf = await readFile(f.abs);
  const sha = createHash("sha1").update(buf).digest("hex");
  manifest.push({ file: f.file, sha, size: (await stat(f.abs)).size });
  await api("POST", "/v2/files", buf, {
    "Content-Type": "application/octet-stream",
    "Content-Length": String(buf.length),
    "x-vercel-digest": sha,
  });
  uploaded++;
}
console.log(`uploaded ${uploaded} files`);

// 3. Preview deployment (no target → preview).
const commit = process.env.GIT_SHA ?? "";
const dep = await api("POST", "/v13/deployments", {
  name: PROJECT,
  project: project.id,
  target: "preview",
  files: manifest,
  projectSettings: { framework: null, buildCommand: null, installCommand: null, outputDirectory: null },
  meta: { source: "scripts/deploy-preview.mjs", gitCommitSha: commit, branch: "claude/cool-ramanujan-0ln9mf" },
});
console.log(`deployment ${dep.id} ${dep.url} (${dep.readyState}) target=${dep.target ?? "preview"}`);
if (dep.target === "production") {
  await api("DELETE", `/v13/deployments/${dep.id}`);
  console.error("GUARD: the API created a production deployment; it has been deleted. Nothing published.");
  process.exit(2);
}

// 4. Wait until ready.
let d = dep;
for (let i = 0; i < 90 && !["READY", "ERROR", "CANCELED"].includes(d.readyState); i++) {
  await new Promise((r) => setTimeout(r, 4000));
  d = await api("GET", `/v13/deployments/${dep.id}`);
}
const record = {
  id: d.id,
  url: `https://${d.url}`,
  readyState: d.readyState,
  target: d.target ?? "preview",
  createdAt: new Date(d.createdAt).toISOString(),
  project: { id: project.id, name: project.name },
  commit,
  files: manifest.length,
};
await writeFile("docs/deploy/last-preview.json", JSON.stringify(record, null, 2) + "\n").catch(async () => {
  const { mkdir } = await import("node:fs/promises");
  await mkdir("docs/deploy", { recursive: true });
  await writeFile("docs/deploy/last-preview.json", JSON.stringify(record, null, 2) + "\n");
});
console.log(JSON.stringify(record, null, 2));
if (d.readyState !== "READY") process.exit(1);
