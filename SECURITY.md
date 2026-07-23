# Security policy

## Supported versions

Security updates apply to the latest release and the default branch.

## Reporting a vulnerability

Do not open a public issue for suspected vulnerabilities, exposed credentials,
authorization bypasses, or prompt-injection paths.

Use GitHub's private vulnerability reporting feature for this repository:

<https://github.com/moshehbenavraham/hermes-lab/security/advisories/new>

Include:

- the affected component and revision;
- a minimal reproduction;
- expected and observed authorization boundaries;
- impact;
- any proposed mitigation.

Never include live credentials, Site bypass tokens, OAuth contents, or private
account identifiers. Redact logs before attaching them.

## Security invariants

- The OpenAI Site must remain owner-only.
- Runtime credentials remain outside the repository with mode `0600`.
- The tunnel key and Site/application authorization stay separate.
- Only the four documented Hermes MCP tools may be exposed.
- Hermes inference receives an empty model-tool schema.
- No third-party model, search API, database, gateway, or hosting fallback is
  permitted by default.
