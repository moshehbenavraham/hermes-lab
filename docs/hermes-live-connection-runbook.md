# Hermes Hibernation live-connection runbook

Date: 2026-07-23

## Purpose

Operate and finish acceptance of the owner-only Hermes experiment without
creating another Site, public ingress, or a third-party service.

Current components:

- Site:
  `https://hermes-hibernation-lab.maxgibson.chatgpt.site`
- Site MCP:
  `https://hermes-hibernation-lab.maxgibson.chatgpt.site/api/mcp`
- Tunnel:
  `tunnel_6a624a7b78d88191a90c78a1f7eaa80b`
- Developer app:
  `plugin_asdk_app_6a624f49034c81918c398a763a8add91`
- Plugin artifact:
  `artifacts/hermes-hibernation-plugin-v0.3.0.zip`
- Personal skill:
  `run-hermes-hibernation`
- Native research:
  Work web research
- Hermes provider/model:
  `openai-codex` / `gpt-5.5`

## 1. Start and inspect the private path

The installed user services are:

```bash
systemctl --user enable --now hermes-hibernation-mcp-gateway.service
systemctl --user enable --now hermes-hibernation-tunnel.service
```

Check state without printing credentials:

```bash
systemctl --user show \
  hermes-hibernation-mcp-gateway.service \
  hermes-hibernation-tunnel.service \
  -p Id -p ActiveState -p SubState -p NRestarts

curl --fail http://127.0.0.1:18081/healthz
curl --fail http://127.0.0.1:18080/readyz
```

Protocol and durable-state probes:

```bash
cd /home/aiwithapex/projects/hermes-lab
./scripts/probe-hermes-gateway.sh
./scripts/inspect-hermes-queue.sh
./scripts/probe-hermes-site-auth.sh
```

Expected gateway tool names:

- `hermes_get_queue`
- `hermes_enqueue_research`
- `hermes_claim_research_run`
- `hermes_commit_research_run`

The tunnel ready endpoint may retain a startup-probe timeout diagnostic even
while runtime polling and commands are healthy. Confirm the systemd state and
an actual gateway/app call rather than relying on that one field.

Credential files are under
`/home/aiwithapex/.config/hermes-tunnel/` with mode `0600`. Never inspect or
print their contents.

## 2. Current ChatGPT setup

Already complete:

- Developer mode enabled.
- Hermes Hibernation app created with Tunnel connection.
- App refreshed and four tools discovered.
- One-time normal-Chat consent completed.
- App permission set to full access.
- Normal Chat read and enqueue calls proven.
- `run-hermes-hibernation` installed as a self-contained personal skill.
- Plugin `0.3.0` installed in local Codex from marketplace `hermes-lab`.

The self-contained personal-skill source is:

```text
artifacts/run-hermes-hibernation-personal-SKILL.md
```

The multi-file Codex/plugin form remains canonical under:

```text
plugin/skills/run-hermes-hibernation/
```

## 3. Regular Work smoke test

Run this only in a workspace where custom write-capable development apps are
available to Work.

1. Start a fresh Work chat.
2. Attach native `Web search`.
3. Attach `Hermes Hibernation`.
4. Invoke `$run-hermes-hibernation` with:

   > Process exactly one queued job. Follow the installed skill completely.
   > Stop before claim if any prerequisite is unavailable; otherwise complete
   > the claim-research-Hermes-commit lifecycle and report the exact job ID and
   > final durable state.

5. Verify:

   ```text
   queued -> claimed -> completed
   ```

6. Check the result is useful, source-backed, below the output limit, and free
   of credentials, raw auth content, environment dumps, verbose stderr, and
   unsafe paths.
7. Re-run `./scripts/inspect-hermes-queue.sh`.
8. Verify the Site is still owner-only.

Current queued job:

```text
469f2610-5eff-4eca-9bc1-7144a2256fae
```

If Work terminates after claim, do not claim manually. Let the two-hour lease
expire, then verify that a later Work run recovers it.

### Current Personal Pro result

The clean retry on this account passed personal-skill, native research, shell,
Python, Git, and mounted-auth preflight. At the first app call, Work displayed:

> Your Hermes Hibernation connection has expired.

Reconnect did not clear the error. No command reached the tunnel, and the job
remained queued. Do not repeat this loop unless the workspace/plan state or
OpenAI product behavior changes.

## 4. Create the scheduled Work wakeup

Do not create this task until section 3 completes a real job.

Recommended initial cadence: hourly. Use the Work task surface and explicitly
attach native `Web search`, the `Hermes Hibernation` app/plugin, and the
`run-hermes-hibernation` skill if the task UI requires explicit skill
selection.

Instruction:

> Every hour, use `$run-hermes-hibernation` to process at most one queued
> Hermes research job. Follow the installed executor contract exactly. Prove
> all prerequisites before claim, use only native Work web research for source
> collection, verify that Hermes receives an empty tool schema, run the pinned
> Hermes source with the mounted Codex OAuth session, and commit completed or
> failed on every controlled exit after claim. Never claim twice, never make
> the Site public, never reveal credentials, and never use a third-party model,
> search API, database, gateway, or hosting service. If the queue is empty,
> report that it is idle and exit.

After the first scheduled completion:

1. verify the job is completed in production;
2. preserve its concise result memory;
3. wait for a later scheduled wakeup;
4. verify the later wakeup observes the durable empty queue and prior memory;
5. reduce cadence to six hours if hourly execution is unnecessarily noisy.

## 5. Full acceptance evidence

Completion requires observing all of:

- the private app reaches the owner-only Site;
- Work can call all four tools;
- Work performs native research with direct URLs;
- the pinned Hermes runtime exposes zero model tools;
- Hermes inference succeeds through mounted `openai-codex`;
- a scheduled wakeup completes a queued job;
- a later wakeup sees durable queue and compact memory;
- no persistent Work process or filesystem is required;
- the Site remains owner-only;
- no third-party service/account is introduced.

## 6. Safe operations and rollback

If acceptance fails:

1. leave the production queue unchanged when failure occurs before claim;
2. allow lease recovery when failure occurs after claim;
3. pause any scheduled task;
4. keep the Site owner-only;
5. preserve both user services for diagnosis;
6. inspect only secret-free status and journal metadata;
7. never expose the Site publicly or copy an internal bypass token.

Restart the private path:

```bash
systemctl --user restart hermes-hibernation-mcp-gateway.service
systemctl --user restart hermes-hibernation-tunnel.service
```

Remove the app or disable the services only with an explicit owner request.

## 7. Exact external unblock

Use a Business, Enterprise, or Edu workspace where an administrator enables:

- developer mode;
- custom apps;
- write-capable MCP tools;
- Work;
- personal or workspace skills;
- scheduled tasks.

Publish or enable the existing Hermes app/plugin there, then continue at
section 3. Do not rebuild the Site or tunnel.

Official references:

- <https://developers.openai.com/api/docs/guides/secure-mcp-tunnels>
- <https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt>
- <https://help.openai.com/en/articles/20001256-plugins-in-chatgpt-and-codex>
- <https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt>
- <https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex>
