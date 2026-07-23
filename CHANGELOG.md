# Changelog

All notable changes are documented here.

## [0.3.0] - 2026-07-23

### Added

- Owner-only OpenAI Site control plane with D1 queue and R2 snapshots.
- Four-tool Hermes MCP surface.
- OpenAI Secure MCP Tunnel and loopback-only discovery gateway.
- Hardened user systemd services.
- Bound ChatGPT developer app and local Codex marketplace.
- Bounded `run-hermes-hibernation` Work skill and self-contained personal form.
- Durable production queue and operator probes.
- Public-project documentation, policies, CI, and contribution templates.

### Verified

- Normal Chat read and write calls through the developer app.
- Tool-less Nous Hermes inference through mounted `openai-codex`.
- Control-plane lint, build, rendered test, Git integrity, package integrity,
  skill/plugin validation, and live private-path probes.

### Known limitation

- Personal Pro Work rejects the write-capable development app before the first
  tunnel call. Scheduled acceptance remains gated on an eligible managed
  workspace or future product support.

[0.3.0]: https://github.com/moshehbenavraham/hermes-lab/releases/tag/v0.3.0
