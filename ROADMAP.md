# Roadmap

## 1. Managed-workspace acceptance

- Enable the existing app/plugin in a Business, Enterprise, or Edu workspace.
- Complete the queued job in a regular Work chat.
- Capture `queued -> claimed -> completed` evidence.

## 2. Scheduled wakeups

- Create the hourly Work task only after the regular smoke passes.
- Verify one scheduled completion.
- Verify a later idle wakeup reads durable prior memory.
- Reduce cadence to six hours after prototype validation.

## 3. Operational hardening

- Add service-install automation that never handles credential contents.
- Add secret-free tunnel/gateway health telemetry.
- Add a release-time artifact provenance manifest.
- Exercise two-hour stale-claim recovery in a production-safe test queue.

## 4. Platform simplification

- Re-evaluate whether a future Sites-native private app bridge can replace the
  continuously available owner-host tunnel processes.
- Re-test Personal Pro Work when write-capable development-app availability
  changes.

The four-tool boundary, owner-only Site, tool-less Hermes model, and
OpenAI-only service constraint remain project invariants.
