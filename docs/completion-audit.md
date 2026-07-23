# Hermes Lab completion audit

Date: 2026-07-23

Status meanings:

- **Proven**: current authoritative evidence satisfies the requirement.
- **Partial**: substantial evidence exists, but the exact required end-to-end
  surface is not proven.
- **Missing**: the required observation does not exist.
- **Platform-limited**: the implementation reaches an external product gate
  that cannot be changed from this repository or Personal Pro workspace.

## Acceptance criteria

| Requirement | Status | Current evidence |
|---|---|---|
| The developer app reaches the owner-only Site. | **Proven** | Normal Chat discovered the app's four tools, called `hermes_get_queue`, and later called `hermes_enqueue_research`. Durable job `469f2610-5eff-4eca-9bc1-7144a2256fae` exists in production. |
| All four MCP tools work from a regular Work chat. | **Platform-limited** | Work loads the app and personal skill, but the first attempted app call is rejected as an expired connection before any tunnel command. The same app works in normal Chat. Local Site and loopback MCP tests exercise the four-tool protocol, but that does not substitute for Work. |
| The outer Work agent performs native source research. | **Proven** | The final clean Work retry reported that native Work research reached an official OpenAI page before the claim boundary. |
| Hermes receives zero tools and succeeds through `openai-codex`. | **Partial** | `verify_toolless.py` resolves an empty schema against the pinned checkout. A real Work inference at the same commit returned `HERMES_CODEX_OK` through `openai-codex`/`gpt-5.5`. The combined app-driven lifecycle cannot cross the current Work gate. |
| A scheduled wakeup completes a queued job. | **Missing** | No schedule was created because the regular Work smoke test fails before claim. |
| A later wakeup sees durable queue and compact memory. | **Missing** | D1 queue, memory, stale lease recovery, and local protocol behavior pass; no scheduled pair can run yet. |
| No persistent Work process or filesystem is required. | **Proven** | The executor installs into a fresh temporary root and exits after one job. The authorized tunnel/gateway services run on the owner's WSL host, not in Work. |
| The Site remains owner-only. | **Proven** | Production remains custom/owner-only with no allowed groups. Both perimeter and application authorization are preserved. |
| No third-party service or account is introduced. | **Proven** | Durable state is OpenAI Sites, private transport is OpenAI Secure MCP Tunnel, compute is ChatGPT Work, and inference is mounted Codex OAuth. The loopback gateway runs on the owner host. |

## Implementation gates

| Handoff gate | Status | Evidence |
|---|---|---|
| 1. Resolve private authentication. | **Proven** | Owner selected OpenAI Secure MCP Tunnel. Tunnel `tunnel_6a624a7b78d88191a90c78a1f7eaa80b` and the loopback gateway are active. |
| 2. Deploy through the existing Sites project. | **Proven** | Existing project `appgprj_6a61f3cacbd8819184b66c4e57cb44cf` serves production version 4 from control-plane commit `92cf3f03f65fe93a1963b3a85b89983407ed87a4`. |
| 3. Create and verify developer app. | **Proven** | App `plugin_asdk_app_6a624f49034c81918c398a763a8add91` exists in development mode and discovers exactly the four intended tools. Normal Chat read and write calls succeed. |
| 4. Bind and rebuild plugin. | **Proven** | `.app.json` contains the exact app ID. Plugin `0.3.0` validates, packages, and is installed locally from marketplace `hermes-lab`. |
| 5. Run regular Work smoke test. | **Platform-limited** | Personal skill installation and Work preflight succeed. Work rejects the app connection at the claim call before tunnel invocation. The production job remains queued. |
| 6. Create scheduled wakeup. | **Waiting on gate 5** | Intentionally absent to avoid a recurring task that is known to fail before claim. |

## Production state

- Queue job:
  `469f2610-5eff-4eca-9bc1-7144a2256fae`
- Status: `queued`
- Claimed at: `null`
- Completed at: `null`
- Requested by: `chatgpt-plugin`
- Created:
  `2026-07-23T18:16:20.662Z`

This confirms that the failed Work test made no partial transition.

## Validation snapshot

The final closeout reruns:

```text
control-plane npm run lint
control-plane npm test
control-plane git fsck --no-progress
hermes-agent git fsck --no-progress
plugin-creator validate_plugin.py
skill-creator quick_validate.py
verify_toolless.py
node --check ops/tunnel-client/hermes-mcp-gateway.cjs
bash -n on repository shell scripts
unzip -t artifacts/hermes-hibernation-plugin-v0.3.0.zip
unzip -t artifacts/run-hermes-hibernation-skill-v0.3.0.zip
tar -tzf artifacts/hermes-control-plane-site-v4.tar.gz
scripts/probe-hermes-gateway.sh
scripts/inspect-hermes-queue.sh
systemd active/running and zero restarts for both services
```

`shellcheck` is not installed in the WSL environment; the closeout script
reports that explicitly after the passing `bash -n` syntax check.

Artifact hashes:

```text
42a7a8516d57a97dd7ab9fcdbd9c49f2749680c7e303d5a13c3050843162f090  artifacts/hermes-hibernation-plugin-v0.3.0.zip
8fdc0f8043c66f390efb2a7aa473a9b048c013eb0b82a0d83f004b70f000b6e4  artifacts/hermes-control-plane-site-v4.tar.gz
a22267c44bf17d16b17f701b7500ee382cbb8683e973cd76ed93f00e81a5af6f  artifacts/run-hermes-hibernation-skill-v0.3.0.zip
a86aef7ce39e3b820cba35e358ab797f3ca338bf654d20a0b22d60eeaf0502c9  artifacts/run-hermes-hibernation-personal-SKILL.md
```

## Required external state for full acceptance

Use an eligible Business, Enterprise, or Edu workspace with custom
write-capable developer apps, Work, personal or workspace skills, and scheduled
tasks enabled. Publish or enable the existing app/plugin there, then rerun
gates 5 and 6 without changing the control-plane architecture.

If Personal Pro Work later supports write-capable development apps, a fresh
test on this account is equally valid.
