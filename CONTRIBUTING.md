# Contributing to Hermes Lab

Thanks for helping improve Hermes Lab.

## Development setup

```bash
git clone --recurse-submodules \
  https://github.com/moshehbenavraham/hermes-lab.git
cd hermes-lab/control-plane
npm ci
```

Use Node.js 24 and Python 3.12 or newer.

## Before opening a pull request

Run:

```bash
./scripts/validate-closeout.sh
```

If the system-specific plugin validators are unavailable, at minimum run:

```bash
cd control-plane
npm run lint
npm test
cd ..
node --check ops/tunnel-client/hermes-mcp-gateway.cjs
bash -n scripts/*.sh
python3 -m py_compile plugin/skills/run-hermes-hibernation/scripts/*.py
```

## Change boundaries

- Do not commit credentials, auth files, environment dumps, or private logs.
- Do not make the Site public.
- Do not add third-party model, search, database, gateway, or hosting fallbacks
  without an explicit architecture decision.
- Keep the MCP surface to the four documented tools.
- Preserve the pinned Hermes commit unless a real Work inference and empty-tool
  verification are repeated.
- Update the handoff, audit, runbook, and artifact hashes when release behavior
  changes.

## Pull requests

Use a focused branch and explain:

- what changed;
- why it changed;
- user or operator impact;
- security implications;
- validation performed.

By participating, you agree to follow the
[Code of Conduct](CODE_OF_CONDUCT.md).
