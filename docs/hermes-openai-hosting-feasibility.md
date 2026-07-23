# Hermes on OpenAI-hosted surfaces: feasibility report

Date: 2026-07-23

## Verdict

A continuously running Hermes daemon cannot be reliably hosted in ChatGPT Work
or Codex Cloud. They are bounded task sandboxes, not permanent server leases.

A logically persistent, hibernating Hermes research agent is technically
feasible:

1. an owner-only OpenAI Site stores the queue and compact memory;
2. a first-party OpenAI Secure MCP Tunnel connects the private Site to a
   ChatGPT developer app;
3. scheduled ChatGPT Work runs wake periodically;
4. each run claims one job, collects sources natively, runs one tool-less
   Hermes turn through mounted Codex OAuth, commits, and exits.

The Site, tunnel, app, plugin, personal Work skill, and production queue are
implemented. Normal Chat proves the developer app reaches the Site for both
read and write operations.

The only remaining end-to-end gate is product availability: Work on the current
Personal Pro workspace rejects the development app before its first tool call.
Current OpenAI documentation describes full write-capable developer-mode MCP
support as a Business, Enterprise, and Edu beta. Therefore the scheduled
acceptance is feasible on an eligible managed workspace but is not currently
observable on this Personal Pro workspace.

Production control plane:
[Hermes Hibernation Lab](https://hermes-hibernation-lab.maxgibson.chatgpt.site)

## Measured execution surfaces

These are observations from instantiated environments, not service guarantees.

| Surface | Observed instance | Persistence result | Verdict |
|---|---|---|---|
| ChatGPT Work | Ubuntu 24.04.3, 8 cgroup CPUs, 20 GiB memory limit, about 63 GB filesystem, Python 3.12, Node 24, outbound network, no GPU | A file survived for about 34 minutes in an active context; a detached process did not survive between shell invocations. | Suitable for bounded research/inference wakeups, not a daemon. |
| Codex Cloud | 2 CPUs, 16 GiB memory limit in the tested task, no mounted Codex auth, outbound network unavailable in that task | Same-task reuse occurred briefly, but a later follow-up used a fresh container. | Suitable for repository work, not continuous hosting. |
| OpenAI Sites | Durable D1 and R2 bindings, owner-only production deployment | Durable state is independent of Work/Cloud process lifetime. | Suitable for queue, events, compact memory, and encrypted snapshots. |
| Owner WSL host | User systemd, official `tunnel-client`, loopback-only Node gateway | Continuously available while the host/session and user services are running. | Suitable for the explicitly authorized first-party private bridge. |

Relevant OpenAI guidance:

- <https://learn.chatgpt.com/docs/environments/cloud-environment>
- <https://help.openai.com/en/articles/20001275-chatgpt-work-and-codex>
- <https://help.openai.com/en/articles/10291617-scheduled-tasks-in-chatgpt>
- <https://developers.openai.com/api/docs/guides/secure-mcp-tunnels>

## Hermes execution proof

The pinned Nous Hermes Agent source ran in an actual ChatGPT Work environment:

- source commit:
  `8fc278207b0f5b25e567966f9615e1b1737f62af`
- Hermes version: `0.19.0`
- provider: `openai-codex`
- model: `gpt-5.5`
- authentication: mounted ChatGPT/Codex OAuth
- exact result: `HERMES_CODEX_OK`
- exit code: `0`
- wall time: about `8.18` seconds

This proves that Work can run a real Hermes turn through the user's OpenAI
account. It does not prove the combined scheduled app lifecycle.

The executor retains two important integration details:

- it adopts the mounted Codex session through Hermes's internal token-import
  helpers without printing token values;
- it sets `HERMES_DISABLE_LAZY_INSTALLS=1` to prevent unrelated dependency
  installation at startup.

It also runs with `HERMES_SAFE_MODE=1`, `--ignore-rules`, no fallback provider,
and a verifier that resolves the actual Hermes model tool schema to an empty
list.

## Implemented architecture

```text
Owner / ChatGPT
      |
      v
Hermes Hibernation developer app
      |
      v
OpenAI Secure MCP Tunnel
      |
      v
official tunnel-client on owner WSL host
      |
      v
loopback-only MCP gateway
      |
      v
owner-only OpenAI Site
  - /api/mcp
  - D1: jobs, events, compact result memory
  - R2: encrypted snapshots
      ^
      |
Eligible scheduled Work wakeup
  1. preflight
  2. claim one job
  3. native source research
  4. tool-less Hermes synthesis
  5. commit completed/failed
  6. exit
```

The Site exposes exactly:

- `hermes_get_queue`
- `hermes_enqueue_research`
- `hermes_claim_research_run`
- `hermes_commit_research_run`

Claims carry a two-hour lease. A later claim recovers an abandoned running job
after lease expiry.

## Deployment and artifact state

Site:

- project:
  `appgprj_6a61f3cacbd8819184b66c4e57cb44cf`
- production version: 4
- source commit:
  `92cf3f03f65fe93a1963b3a85b89983407ed87a4`
- access: custom/owner-only, no groups

Private bridge:

- tunnel:
  `tunnel_6a624a7b78d88191a90c78a1f7eaa80b`
- official tunnel client: `0.0.10`
- gateway: `127.0.0.1:18081/mcp`
- both user services active with zero restarts at final verification

App and plugin:

- developer app:
  `plugin_asdk_app_6a624f49034c81918c398a763a8add91`
- plugin version: `0.3.0`
- app binding populated with the exact ID
- local Codex installation complete through marketplace `hermes-lab`
- self-contained personal skill installed in ChatGPT Work

Artifacts:

```text
42a7a8516d57a97dd7ab9fcdbd9c49f2749680c7e303d5a13c3050843162f090  artifacts/hermes-hibernation-plugin-v0.3.0.zip
8fdc0f8043c66f390efb2a7aa473a9b048c013eb0b82a0d83f004b70f000b6e4  artifacts/hermes-control-plane-site-v4.tar.gz
a22267c44bf17d16b17f701b7500ee382cbb8683e973cd76ed93f00e81a5af6f  artifacts/run-hermes-hibernation-skill-v0.3.0.zip
a86aef7ce39e3b820cba35e358ab797f3ca338bf654d20a0b22d60eeaf0502c9  artifacts/run-hermes-hibernation-personal-SKILL.md
```

Normal Chat created real production job
`469f2610-5eff-4eca-9bc1-7144a2256fae`, which remains `queued`.

## Private authentication conclusion

OAuth routes inside the owner-only Site are not viable because the Sites
perimeter rejects unauthenticated requests before application code. Sites Sign
in with ChatGPT is not an MCP OAuth server, and a Sites bypass token is not an
acceptable application credential.

The owner therefore selected OpenAI Secure MCP Tunnel. It preserves private
ingress and uses only OpenAI plus the owner's host, at the cost of requiring
continuously healthy local bridge services.

See `docs/hermes-private-auth-decision.md`.

## Work and scheduled acceptance result

A clean Work retry proved:

- the personal skill is installed and invoked;
- native Work research reaches official OpenAI documentation;
- shell, Python, Git, and mounted Codex auth are present;
- the Hermes app and all four operations are visible.

At the one-time claim boundary, Work displayed an expired-connection dialog.
Reconnect did not clear it. No request reached the tunnel, and the durable job
remained unclaimed. Normal Chat continued to use the same app successfully.

This isolates the current gap to Work/custom-app availability on the Personal
Pro workspace rather than Site, gateway, tunnel, app discovery, permissions,
skill packaging, or queue durability.

Official availability reference:

- <https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt>
- <https://help.openai.com/en/articles/20001256-plugins-in-chatgpt-and-codex>

## Feasible completion path

Use a Business, Enterprise, or Edu workspace with custom write-capable apps,
Work, skills, and scheduled tasks enabled. Publish or enable the existing app
and plugin there, then:

1. complete the queued job in a regular Work chat;
2. create the hourly scheduled Work wakeup;
3. observe one scheduled completion;
4. observe a later idle wakeup reading durable prior memory.

No control-plane, Site, tunnel, or Hermes executor redesign is required.
