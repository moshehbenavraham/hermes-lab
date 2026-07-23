import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

test("ships the Hermes control plane and durable bindings", async () => {
  const [page, consoleSource, layout, hosting, jobsRoute] = await Promise.all([
    readFile(new URL("app/page.tsx", root), "utf8"),
    readFile(new URL("app/HermesConsole.tsx", root), "utf8"),
    readFile(new URL("app/layout.tsx", root), "utf8"),
    readFile(new URL(".openai/hosting.json", root), "utf8"),
    readFile(new URL("app/api/jobs/route.ts", root), "utf8"),
    access(new URL("dist/server/index.js", root)),
  ]);

  assert.match(layout, /Hermes Hibernation Lab/);
  assert.match(page, /getChatGPTUser/);
  assert.match(consoleSource, /An agent that sleeps, but remembers\./);
  assert.match(consoleSource, /Sign in with ChatGPT/);
  assert.match(hosting, /"d1": "DB"/);
  assert.match(hosting, /"r2": "HERMES_STATE"/);
  assert.match(jobsRoute, /action === "claim"/);
  assert.doesNotMatch(page, /codex-preview|SkeletonPreview/);
});
