# Hermes Lab session handoff

Last updated: 2026-07-23

## Start here

The first-party implementation is complete through the last gate available on
this Personal Pro account:

- the durable owner-only Site is deployed;
- a first-party OpenAI Secure MCP Tunnel is active;
- the ChatGPT developer app exists and reaches the Site from normal Chat;
- the four-tool boundary is discovered correctly;
- normal Chat performed a real read and write through the app;
- plugin `0.3.0` is bound, packaged, validated, and installed in local Codex;
- a self-contained `run-hermes-hibernation` personal skill is installed in
  ChatGPT Work;
- a real production research job is durably queued.

The remaining acceptance gate is a current ChatGPT surface limitation, not an
unfinished repository or tunnel step:

> Personal Pro Work can load and execute the personal skill, perform native web
> research, and verify its sandbox prerequisites, but it rejects the
> development app at the first tool call with “Your Hermes Hibernation
> connection has expired.” The same app works in normal Chat, and the failed
> Work run sends no command to the healthy tunnel.

No scheduled task was created because this gate fails before claim. The
production job remains `queued`, with no lease or partial result.

Read next:

1. `docs/completion-audit.md`
2. `docs/hermes-live-connection-runbook.md`
3. `docs/hermes-private-auth-decision.md`
4. `plugin/skills/run-hermes-hibernation/SKILL.md`
5. `plugin/skills/run-hermes-hibernation/references/executor-contract.md`

## Objective

Build a logically persistent Nous Hermes research agent using only the user's
OpenAI/ChatGPT account:

- durable queue and compact memory in an owner-only OpenAI Site;
- disposable inference compute in ChatGPT Work;
- periodic wakeups from scheduled Work tasks;
- inference through mounted ChatGPT/Codex OAuth;
- source collection through native Work web research;
- no separately managed third-party model, search API, database, gateway, VM,
  or hosting service.

This is a hibernating agent. Each wakeup claims at most one job, runs one
bounded Hermes turn, commits a terminal result, and exits.

The owner explicitly authorized the first-party Secure MCP Tunnel architecture
on 2026-07-23. It adds two continuously available user-level processes on the
owner's WSL host: the official OpenAI tunnel client and a loopback-only
first-party gateway. It does not require a third-party service or public Site.

## Current status

| Component | Current state |
|---|---|
| Workspace | `/home/aiwithapex/projects/hermes-lab` |
| Hermes source | Clean at `8fc278207b0f5b25e567966f9615e1b1737f62af` |
| Control plane | Clean at `92cf3f03f65fe93a1963b3a85b89983407ed87a4` |
| OpenAI Site | Production version 4, active, custom/owner-only |
| Site MCP | Exactly four tools; app-level bearer plus Sites perimeter |
| Secure MCP Tunnel | Active as a user systemd service |
| Loopback MCP gateway | Active as a user systemd service |
| Developer app | Created in development mode and refreshed successfully |
| Normal Chat | Read and write calls proven through the app |
| Work personal skill | Installed and invoked successfully through preflight |
| Work app call | Rejected by Work before tunnel invocation as connection expired |
| Scheduled Work task | Intentionally absent; regular Work gate failed |
| Production queue | One job, status `queued` |

## Authoritative identifiers

- Site:
  `https://hermes-hibernation-lab.maxgibson.chatgpt.site`
- Site MCP:
  `https://hermes-hibernation-lab.maxgibson.chatgpt.site/api/mcp`
- Sites project:
  `appgprj_6a61f3cacbd8819184b66c4e57cb44cf`
- Production Site version:
  `appgprj_6a61f3cacbd8819184b66c4e57cb44cf~appgver_8827a39adb80819191201f434c323456`
- Production deployment:
  `appgdep_6a624ebd9dc08191ab2daa7c4ca5df2c`
- Secure MCP Tunnel:
  `tunnel_6a624a7b78d88191a90c78a1f7eaa80b`
- ChatGPT app binding:
  `plugin_asdk_app_6a624f49034c81918c398a763a8add91`
- Internal app ID shown by Manage:
  `asdk_app_6a624f49034c81918c398a763a8add91`
- Personal skill editor ID:
  `6a625c510d94819194dfa5cd3cc8cdde`

Treat all IDs as opaque. Do not derive or replace them.

## Implemented path

```text
Normal Chat or eligible Work/scheduled run
        |
        v
Hermes Hibernation developer app
        |
        v
OpenAI Secure MCP Tunnel
        |
        v
127.0.0.1:18081/mcp
loopback-only Hermes MCP gateway
        |
        v
Owner-only OpenAI Site /api/mcp
        |
        +-- D1: jobs, events, compact memory
        `-- R2: encrypted snapshots
```

The loopback gateway answers MCP initialization and tool discovery locally,
then forwards only actual tool calls to the owner-only Site. This avoids Site
latency during the tunnel client's startup discovery without widening ingress.

The four exposed tools are:

- `hermes_get_queue`
- `hermes_enqueue_research`
- `hermes_claim_research_run`
- `hermes_commit_research_run`

## Durable production evidence

Normal Chat called `hermes_get_queue` through the developer app and received
the correct empty queue plus the exact tool boundary. A second normal Chat
called `hermes_get_queue` and then `hermes_enqueue_research`, creating:

- Job ID: `469f2610-5eff-4eca-9bc1-7144a2256fae`
- Status: `queued`
- Requested by: `chatgpt-plugin`
- Created at: `2026-07-23T18:16:20.662Z`

The objective asks for an official-OpenAI-source summary of scheduled Work
tasks, tools, skills, plugins, and disposable local storage. The operator probe
confirmed the job remains durably queued after every failed Work attempt.

Do not claim or commit this job from an alternate compute surface merely to
make the audit green. The required acceptance path is ChatGPT Work.

## Exact Work acceptance result

The final clean retry used:

- Work surface;
- the installed `run-hermes-hibernation` personal skill;
- native Work web research;
- the Hermes Hibernation development app.

Work reported:

1. the installed skill was in use;
2. all four app operations were visible;
3. shell, Python, Git, and the mounted Codex auth file existed;
4. native Work research reached an official OpenAI page;
5. it was crossing the one-time claim boundary;
6. the app connection had expired and had to be reconnected.

The Reconnect action did not clear the dialog. No tunnel or gateway journal
entry appeared for the attempt, and the job remained unclaimed. Repeated
earlier clean Work chats produced the same boundary. Permission mode was also
set to full access for this app, so the failure is not an approval prompt.

The account menu showed only a Personal Pro workspace. Current OpenAI
documentation limits the full MCP developer-mode path, including write tools,
to managed Business, Enterprise, and Edu workspaces; Pro developer-mode access
is described as read/fetch only. This is consistent with the observed
surface-specific failure.

## Proven Hermes execution

A real Nous Hermes turn already succeeded in ChatGPT Work:

- source commit:
  `8fc278207b0f5b25e567966f9615e1b1737f62af`
- Hermes version: `0.19.0`
- provider: `openai-codex`
- model: `gpt-5.5`
- authentication: mounted ChatGPT/Codex OAuth adopted through Hermes's own
  token-import helpers
- exact output: `HERMES_CODEX_OK`
- exit code: `0`
- wall time: about `8.18` seconds

The executor remains pinned to that proof and enforces:

- `HERMES_DISABLE_LAZY_INSTALLS=1`;
- `HERMES_SAFE_MODE=1`;
- `--ignore-rules`;
- no fallback provider;
- native Work web research only;
- an evidence-only prompt packet;
- an actual empty tool schema proven by `verify_toolless.py`;
- a 30-minute timeout;
- completed or failed commit on every controlled post-claim exit.

## Local services and secret boundary

Installed user services:

- `hermes-hibernation-mcp-gateway.service`
- `hermes-hibernation-tunnel.service`

Repository sources:

- `ops/tunnel-client/hermes-mcp-gateway.cjs`
- `ops/tunnel-client/profiles/hermes-hibernation.yaml`
- `ops/systemd/hermes-hibernation-mcp-gateway.service`
- `ops/systemd/hermes-hibernation-tunnel.service`

The official `tunnel-client` binary is installed at:

```text
/home/aiwithapex/.local/bin/tunnel-client
```

Credential files live under:

```text
/home/aiwithapex/.config/hermes-tunnel/
```

They are mode `0600`. Never inspect, print, copy into the repository, place in
prompts, or persist in Site state or model output. The tunnel runtime API key
and Site/app authorization values are deliberately separate.

The Site remains owner-only. Do not make it public, use a Sites bypass token as
application auth, or add a third-party bridge.

## Artifacts

```text
42a7a8516d57a97dd7ab9fcdbd9c49f2749680c7e303d5a13c3050843162f090  artifacts/hermes-hibernation-plugin-v0.3.0.zip
8fdc0f8043c66f390efb2a7aa473a9b048c013eb0b82a0d83f004b70f000b6e4  artifacts/hermes-control-plane-site-v4.tar.gz
a22267c44bf17d16b17f701b7500ee382cbb8683e973cd76ed93f00e81a5af6f  artifacts/run-hermes-hibernation-skill-v0.3.0.zip
a86aef7ce39e3b820cba35e358ab797f3ca338bf654d20a0b22d60eeaf0502c9  artifacts/run-hermes-hibernation-personal-SKILL.md
```

`artifacts/run-hermes-hibernation-personal-SKILL.md` is the self-contained
single-file form installed through ChatGPT's personal skill editor. It inlines
the two helper scripts because the editor path was more reliable than browser
file upload.

The older pre-connection archives are retained only as historical artifacts.
Do not deploy or install them.

## Validation commands

```bash
cd /home/aiwithapex/projects/hermes-lab

./scripts/probe-hermes-gateway.sh
./scripts/inspect-hermes-queue.sh
./scripts/probe-hermes-site-auth.sh

systemctl --user status hermes-hibernation-mcp-gateway.service
systemctl --user status hermes-hibernation-tunnel.service
curl --fail http://127.0.0.1:18081/healthz
curl --fail http://127.0.0.1:18080/readyz

git -C control-plane status --short
git -C control-plane rev-parse HEAD
git -C hermes-agent status --short
git -C hermes-agent rev-parse HEAD

cd control-plane
npm run lint
npm test
```

The tunnel health endpoint may retain a startup-probe timeout diagnostic even
while runtime polling and commands are healthy. Do not equate that historical
startup probe with the live command path; verify both systemd state and actual
gateway/app calls.

## Exact remaining work

Do not redesign the control plane, create another Site, rotate secrets, or
replace the tunnel.

To complete the original scheduled acceptance:

1. Use a Business, Enterprise, or Edu workspace where the administrator enables
   developer mode, custom apps, write-capable MCP tools, Work, skills, and
   scheduled tasks.
2. Publish or enable the existing Hermes app/plugin for that workspace using
   the exact app and tunnel.
3. Repeat the regular Work smoke from
   `docs/hermes-live-connection-runbook.md`.
4. Confirm `queued -> claimed -> completed` for the existing job.
5. Only then create the hourly scheduled Work task.
6. Verify one scheduled completion and a later idle wakeup that reads durable
   prior memory.

An alternative valid unblock is a future platform change that makes
write-capable development apps callable from Personal Pro Work. Re-test rather
than assuming that change.

## Completion criteria

Implemented and proven:

- the developer app reaches the owner-only Site from normal Chat;
- the four-tool MCP boundary is correct;
- native Work research and the personal skill run;
- Hermes can run tool-less through `openai-codex`;
- the Site remains owner-only;
- no third-party service or account is introduced;
- no Work process or Work filesystem must persist.

Not yet observable on this account:

- app tool calls from Work;
- one Work claim/research/run/commit transition;
- a scheduled wakeup completing a job;
- a later scheduled wakeup reading durable queue and memory.
