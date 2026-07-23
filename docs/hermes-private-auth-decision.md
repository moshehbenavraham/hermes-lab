# Hermes private app authentication decision

Date: 2026-07-23

## Decision

Use OpenAI Secure MCP Tunnel as the first-party bridge between the ChatGPT
developer app and the owner-only Hermes Site.

The owner explicitly authorized this architecture on 2026-07-23, including the
continuously available user-level processes and separately stored runtime
credentials it requires.

Keep all of these constraints:

- the OpenAI Site remains custom/owner-only;
- no third-party gateway, database, model, search API, VM, or hosting service;
- only the four intended Hermes MCP tools;
- no credential content in prompts, queue state, logs, or model output;
- write actions remain explicit and attributable;
- Work compute and files remain disposable.

## Why this path was selected

The owner-only Sites perimeter returns `401` before application routes run.
Therefore, OAuth discovery routes implemented inside the same Site cannot be
reached by ChatGPT's connector service.

The Sites visitor Sign in with ChatGPT client is not an MCP OAuth authorization
server, and an internal Sites bypass token is not acceptable application
authorization.

OpenAI Secure MCP Tunnel is the documented first-party method for reaching a
private MCP server without public ingress. It preserves the Site access
perimeter and keeps the connection within OpenAI plus the owner's WSL host.

Official documentation:

- <https://developers.openai.com/api/docs/guides/secure-mcp-tunnels>
- <https://developers.openai.com/apps-sdk/build/auth>
- <https://learn.chatgpt.com/docs/sites>

## Implemented design

```text
ChatGPT developer app
        |
        v
OpenAI tunnel control/data plane
        |
        v
official tunnel-client on owner WSL host
        |
        v
127.0.0.1:18081/mcp
first-party loopback gateway
        |
        v
owner-only OpenAI Site /api/mcp
```

Identifiers:

- Tunnel:
  `tunnel_6a624a7b78d88191a90c78a1f7eaa80b`
- Developer app:
  `plugin_asdk_app_6a624f49034c81918c398a763a8add91`
- Site project:
  `appgprj_6a61f3cacbd8819184b66c4e57cb44cf`

The loopback gateway:

- listens only on `127.0.0.1:18081`;
- answers MCP initialize and tool discovery locally;
- exposes exactly the four Hermes tools;
- forwards only tool calls;
- uses distinct authorization files for the owner-only Sites perimeter and
  application-level MCP bearer;
- never returns or logs secret values.

Repository sources:

- `ops/tunnel-client/hermes-mcp-gateway.cjs`
- `ops/tunnel-client/profiles/hermes-hibernation.yaml`
- `ops/systemd/hermes-hibernation-mcp-gateway.service`
- `ops/systemd/hermes-hibernation-tunnel.service`

Both services are enabled as user systemd services with restart policies and
hardening. The official tunnel client is version `0.0.10`.

## Secret management

Credential files are outside the repository under:

```text
/home/aiwithapex/.config/hermes-tunnel/
```

They are mode `0600`. The tunnel runtime API key is separate from the Site and
application authorization headers.

Never:

- print or inspect credential contents;
- store credentials in environment snapshots, prompts, Site data, or output;
- commit credential files;
- reuse an internal Sites bypass token;
- make the Site public to avoid authentication.

## Evidence that the tunnel path works

The developer app refreshed against the tunnel and discovered exactly:

- `hermes_get_queue`
- `hermes_enqueue_research`
- `hermes_claim_research_run`
- `hermes_commit_research_run`

Normal Chat successfully called `hermes_get_queue`. A later normal Chat called
the same read tool and then `hermes_enqueue_research`, creating durable job
`469f2610-5eff-4eca-9bc1-7144a2256fae`.

The local gateway protocol probe independently passes initialization, tool
discovery, and a queue read. Both user services remain active with zero
restarts.

## Current Work limitation is not an auth-design failure

ChatGPT Work on the current Personal Pro workspace loads the personal skill and
passes native research and sandbox preflight. At the first Hermes app call,
Work displays:

> Your Hermes Hibernation connection has expired. Reconnect it before ChatGPT
> can use it for this request.

The Reconnect action does not clear the dialog. The attempt produces no tunnel
or gateway command, while the same app continues to work in normal Chat.
Full-access permission was set for the app, so approval mode is not the cause.

This is a surface/workspace availability boundary. Current OpenAI documentation
describes full MCP developer-mode support, including write tools, as a
Business, Enterprise, and Edu beta. Personal Pro developer-mode support is
described as read/fetch only:

- <https://help.openai.com/en/articles/12584461-developer-mode-and-mcp-apps-in-chatgpt>
- <https://help.openai.com/en/articles/20001256-plugins-in-chatgpt-and-codex>

## Consequences

Accepted:

- two continuously available user services on the owner's WSL host;
- first-party OpenAI runtime credentials stored outside the repository;
- Site latency hidden behind a loopback discovery gateway;
- the tunnel being required whenever the app is used.

Rejected:

- OAuth routes inside the owner-only Site;
- reusing Sites Sign in with ChatGPT as MCP OAuth;
- using a Sites bypass bearer as application auth;
- public MCP ingress;
- any third-party gateway or hosted workaround;
- creating a scheduled task while regular Work cannot call the app.

## Next decision

No repository architecture decision remains.

The next external-state decision is to run the existing app and plugin in an
eligible Business, Enterprise, or Edu workspace, or wait for Personal Pro Work
to support write-capable development apps. Once that state changes, repeat the
regular Work smoke test before scheduling.
