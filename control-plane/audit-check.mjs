#!/usr/bin/env node
// Runs `npm audit --json` and fails on any high/critical advisory unless its
// GHSA ID is listed in audit-allowlist.json. Equivalent to
// `npm audit --audit-level=high` except for explicitly allowlisted advisories.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";

const allowFile = process.argv[2] ?? new URL("./audit-allowlist.json", import.meta.url);
const allowed = new Set(JSON.parse(readFileSync(allowFile, "utf8")).advisories.map((a) => a.id));
let out;
try {
  out = execFileSync("npm", ["audit", "--json"], { encoding: "utf8", maxBuffer: 64 << 20 });
} catch (e) {
  out = e.stdout; // npm audit exits non-zero when vulnerabilities exist
  if (!out) { console.error("npm audit failed without JSON output:", e.message); process.exit(1); }
}
let report;
try {
  report = JSON.parse(out);
} catch (e) {
  console.error("npm audit returned non-JSON output:", e.message);
  process.exit(1);
}
if (report.error) { console.error("npm audit error:", report.error); process.exit(1); }
const blocking = new Map();
const allowedHits = new Set();
for (const [pkg, v] of Object.entries(report.vulnerabilities ?? {})) {
  for (const via of v.via) {
    if (typeof via !== "object") continue; // transitive; judged at its source
    if (!["high", "critical"].includes(via.severity)) continue;
    const id = String(via.url ?? "").split("/").pop();
    if (allowed.has(id)) { allowedHits.add(`${id} (${pkg})`); continue; }
    blocking.set(`${id} (${pkg})`, `${via.severity}: ${via.title}`);
  }
}
for (const a of allowedHits) console.log(`allowlisted: ${a}`);
if (blocking.size) {
  console.error(`Blocking high/critical advisories (${blocking.size}):`);
  for (const [k, t] of blocking) console.error(`  ${k} ${t}`);
  process.exit(1);
}
console.log("npm audit: no blocking high/critical advisories.");
