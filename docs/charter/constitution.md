---
title: Constitution
owner: '@esliph/engineering'
trigger: >
  Deliberate amendment — never as a side effect of another task.
last-reviewed: 2026-09-01
version: 3
---

# Constitution

What is inviolable in this toolkit, and how each principle is verified. A
principle without a named enforcement is a slogan — none enters here without it.

## Principles

1. An artifact has exactly one owner, declared and mirrored in CODEOWNERS — verified by `RN-0001` and `CI-1`.
2. `trigger` names an observable event, never a calendar cadence — verified by `CI-1`.
3. No accepted item is corrected in the body — it is superseded — verified by `HK-1`.
4. No agent on its own promotes a state that means acceptance — verified by `HK-3`.
5. A watched path and the owning doc travel in the same commit — verified by `HK-4` (reminds) and `HK-5` (asks).
6. The toolkit runs on the host's Node, with no build step — verified by `test/plugin/manifest.test.ts` (`RNF-0002`) and by the `living-docs` workflow, which installs Node and npm and nothing beyond. The containerized path of `RNF-0006` is optional, and is not the execution of record.

## Amendment log

- 2026-08-25 — v1 — Initial creation, six principles reflecting `RN-0001`–`RN-0010` and `RNF-0002` — human, Phase 4 dogfooding.
- 2026-09-01 — v2 — Principle 6 now affirms execution on the host's Node, following `ADR-0015`, which supersedes `ADR-0001` — human, migration of execution to the host.
- 2026-09-01 — v3 — Principle 6 names the `living-docs` workflow as the verification of record and declares the containerized path of `RNF-0006` optional — human, following `ADR-0016`, which carries `ADR-0015` without superseding it.
