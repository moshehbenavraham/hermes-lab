# Hermes Hibernation Lab

An OpenAI Sites control plane for a logically persistent
[Hermes Agent](https://github.com/NousResearch/hermes-agent). The compute
process is intentionally ephemeral: scheduled ChatGPT Work runs wake Hermes,
claim one bounded research job, commit the result, and disappear. D1 retains
the queue and compact cross-run memory; R2 is reserved for encrypted snapshots.

## Architecture

1. A signed-in user queues research through the Site or the private MCP app.
2. A scheduled Work run calls `hermes_claim_research_run`.
3. Work installs or reuses Hermes, imports the mounted Codex OAuth credentials,
   and runs one bounded turn with optional lazy installs disabled.
4. Work calls `hermes_commit_research_run`.
5. A later run receives recent completed results as compact memory.

Claims use a two-hour lease. If a Work sandbox terminates before it can commit,
the next claim after the lease expires automatically returns the abandoned job
to the queue.

This is hibernation, not a daemon. Neither Work nor Codex Cloud is treated as a
permanent server.

## Durable bindings

`.openai/hosting.json` declares:

- `DB`: D1 queue, events, and result memory.
- `HERMES_STATE`: R2 storage for AES-256-GCM encrypted snapshots.

The production runtime requires `AGENT_BRIDGE_TOKEN` as a Sites secret for the
non-MCP executor API. A Secure MCP Tunnel deployment also uses a separate
`HERMES_TUNNEL_TOKEN` Sites secret so tunnel traffic can authenticate without
rotating or sharing the executor credential. Do not place either token in
source, prompts, logs, or ChatGPT memory.

## Private MCP endpoint

`/api/mcp` implements stateless Streamable HTTP MCP with four tools:

- `hermes_get_queue`
- `hermes_enqueue_research`
- `hermes_claim_research_run`
- `hermes_commit_research_run`

The endpoint accepts only a Sites-authenticated request, a local development
request, or the production bridge bearer token. Keep the Site owner-only unless
a separately reviewed OAuth 2.1 authorization layer is added.

## Local development

Requirements: Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm run lint
npm test
```

`npm test` builds the full Vinext/Cloudflare bundle and verifies the rendered
control-plane shell. MCP was also exercised with `initialize`, `tools/list`,
and `tools/call` requests against the local route.

## Work executor contract

The scheduled Work prompt must:

- call `hermes_claim_research_run` once;
- stop immediately when no job is returned;
- keep credentials and raw auth files out of output;
- set `HERMES_DISABLE_LAZY_INSTALLS=1`;
- allow only the Hermes source/update, `models.dev`, and OpenAI/Codex hosts
  required by the bounded run;
- commit either a useful result or an actionable failure;
- never assume the sandbox, process, PID, or filesystem survives the run.

Developer-mode app creation and scheduling are deliberate account-level
actions and are not performed by this repository.
