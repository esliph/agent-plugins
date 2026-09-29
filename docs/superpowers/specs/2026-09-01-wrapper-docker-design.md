# Docker execution wrapper — specification

The toolkit runs on the host's `node` (`RNF-0002`, `ADR-0015`), and keeps
running there. This spec describes a **second**, optional execution path: a
wrapper that runs any maintenance command inside the container already described
by `Dockerfile` and `compose.yaml`, for whoever wants a predictable and portable
environment without installing Node on the machine.

It does not repeat what the owning artifacts say. The current rule is in
`docs/requirements/`, the decision in `docs/decisions/adr/`, the way of working in
`CONTRIBUTING.md` and the done criterion in `docs/definition-of-done.md`.

**Mandatory input for whoever plans this:** `ADR-0015` (host execution, which
this spec does **not** supersede), `ADR-0003` (the two roots, which remain in
force), `TDR-0002` (the debt this delivery pays) and
`docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` §7 (the
5 s hook ceiling, the reason hooks stay outside the container).

---

## 1. What the requester decided

Six choices were made before this spec and are not reopened here:

| #     | Choice                                                                                           | Accepted consequence                                                                                                                                                                |
| ----- | ------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E-1` | **Hooks never enter the container**. The wrapper covers maintenance: `npm`, the CLI, a shell     | On a machine without Node on the host, hooks still have no local enforcement. It is the same cost `ADR-0015` already declared, and it is not made worse                             |
| `E-2` | **Persistent** container, and the wrapper guarantees it: if it is not up, it brings it up itself | The wrapper gains a side effect (`docker compose up -d`) in an invocation that looked read-only. In exchange, the "container stopped" failure mode that today returns exit 2 is gone |
| `E-3` | A generic `bin/dev` is the entry point; `bin/living-docs` survives as a one-line delegation      | Two files in `bin/` instead of one. No duplicated logic, and the public path that `TDR-0002` protects remains valid                                                                 |
| `E-4` | **Bash only.** No `.ps1`, no `.cmd`                                                              | On Windows it is invoked through Git Bash, WSL, or with `bash bin/dev …` from PowerShell. The toolkit already requires `git`, and Git for Windows ships bash with it               |
| `E-5` | The Docker path is verified by a **path-conditional workflow**, not on every PR                  | A break caused by something outside the list of watched paths only shows up the next time someone touches that list                                                                 |
| `E-6` | A new rule (`RNF-0006`), not an amendment to `RNF-0002`                                          | One more ID. In exchange, the two paths have independent life cycles: retiring Docker one day does not touch the host requirement                                                   |

`E-1` is the one that holds up the others. The core of `ADR-0015` is that local
enforcement cannot depend on the state of a daemon; as long as hooks run on the
host, that core stays intact and the containerized path is an addition, not a
reversal.

---

## 2. The invariant that makes parity exist

**`bin/dev` knows no command.**

It has no subcommand, no table of supported commands, does not validate `argv`,
translates nothing. It receives arguments and passes them into the container.

This is not code economy: it is the mechanism. There is no "list of commands that
work on Docker" that could diverge from the host's list, because that list is not
written anywhere. A new maintenance command starts working on both paths in the
same commit that creates it, without anyone remembering to update the wrapper.

`M-8` verifies this invariant. It is what `RNF-0006` calls parity.

---

## 3. The eleven changes

| ID     | Change                                                                                | File                                   |
| ------ | ------------------------------------------------------------------------------------- | -------------------------------------- |
| `M-1`  | The generic wrapper is born                                                           | `bin/dev`                              |
| `M-2`  | The CLI wrapper becomes a one-line delegation                                         | `bin/living-docs`                      |
| `M-3`  | `RNF-0006` is born; `RNF-0002` marks the containerized path as out of scope           | `docs/requirements/non-functional.md`  |
| `M-4`  | `ADR-0016` is born, carrying `ADR-0015` instead of superseding it                     | `docs/decisions/adr/`                  |
| `M-5`  | `TDR-0002` is paid off by repair                                                      | `docs/decisions/debt/`                 |
| `M-6`  | `bin/**` becomes the watched path, and `bin/dev` enters `consumer-visible-paths`      | `docs/.ownership.yml`                  |
| `M-7`  | The workflow that exercises the Docker path is born                                   | `.github/workflows/wrapper-docker.yml` |
| `M-8`  | Tests lock the delegation and the invariant of §2                                     | `test/plugin/`                         |
| `M-9`  | Principle 6 is amended; the Constitution goes to `version: 3`                         | `docs/charter/constitution.md`         |
| `M-10` | The prose teaches both paths, host first                                              | `README.md`, `CONTRIBUTING.md`         |
| `M-11` | The `## [Unreleased]` entry records the visible change                                | `CHANGELOG.md`                         |

`Dockerfile`, `compose.yaml` and `.dockerignore` **do not change**. They are
already correct for this design, and that is the reason the delivery is small.

### `M-1` — `bin/dev`

Three responsibilities, in this order, and nothing beyond them.

**Ensure the container.** The name comes from `LIVING_DOCS_CONTAINER`, with
`esliph-living-docs` as the default — the same contract `bin/living-docs` already
publishes today. If `docker inspect -f '{{.State.Running}}'` does not return
`true`, the wrapper runs `docker compose up -d` from the repository root, which it
derives from the script's own path — one level above `bin/`, by the same pattern
that `plugin/hooks/run-hook.sh` uses (there it is two, because the script sits
deeper). The first time this builds the image; on later runs it is almost
instantaneous.

**Ensure the dependencies.** `compose.yaml` mounts `node_modules` as a named
volume, and today nothing populates it: even with the container up, the CLI would
break for lack of `yaml` and `picomatch`. The bootstrap happens inside the same
`docker exec` that runs the command, with no extra round-trip:

```bash
exec docker exec -i -w /opt/living-docs "$CONTAINER" \
  bash -c '[ -d node_modules/yaml ] || npm ci >&2; exec "$@"' -- "$@"
```

The `>&2` is not cosmetic: the output of `npm ci` must not contaminate the stdout
of a command whose output someone reads.

**Execute.** The working dir is `/opt/living-docs`, because that is where `npm`
makes sense. The CLI keeps validating `/workspace` because `LIVING_DOCS_REPO_ROOT`
already comes from `compose.yaml`: the separation of `ADR-0003` keeps coming from
an environment variable, never from the working directory. Pointing the wrapper
at another project remains `LIVING_DOCS_TARGET=/path docker compose up -d`, as
`compose.yaml` already anticipated.

With no arguments, `bin/dev` opens an interactive `bash` — it is the workspace.
The `-t` of `docker exec` is added when stdin is a TTY, and only then.

The command's exit code is the wrapper's exit code. `exec` guarantees this with no
additional care.

### `M-2` — `bin/living-docs`

Loses all the `docker exec` logic and becomes a delegation:

```bash
exec "$(dirname "$0")/dev" node src/cli/index.ts "$@"
```

It no longer requires a previously started container, no longer exits with code 2,
and becomes invocable again. `TDR-0002` is paid by repair, not by removal.

### `M-3` — the rule

`RNF-0006` states the optional containerized path and the parity of §2.
`relates-to: ADR-0016`. In **out of scope**: hooks, which always run on the host
per `RNF-0001` and `E-1`.

`RNF-0002` is not rewritten and does not change meaning. It gains one line in
**out of scope** pointing to `RNF-0006`, so that whoever reads "Node 24 and npm
are the only toolchain required" understands that Docker is an alternative, not a
requirement — the word carrying the sentence remains _required_.

It is born `draft`. Promoting is a human act (`HK-3`).

### `M-4` — the decision

`ADR-0016 — Optional containerized execution path, parity by delegation`.
`relates-to: [ADR-0015, ADR-0003, RNF-0006]`, `supersedes: null`.

The ADR must say, in the text and not only in the frontmatter, **why it does not
supersede `ADR-0015`**: because the core of that decision — local enforcement
independent of a daemon's state — survives intact while hooks stay on the host
(`E-1`). Writing it as a supersession would reopen `ADR-0001` through the back
door, and `ADR-0001` remains superseded for the reasons `ADR-0015` recorded.

Alternatives to record as considered and discarded: the bash + PowerShell pair
with duplicated logic (`E-4`), the CI job on every PR (`E-5`), and generalizing
`bin/living-docs` instead of creating `bin/dev` (`E-3`).

Costs to declare under **what is accepted as lost**:

- **The Docker daemon becomes a dependency for whoever chooses this path** — and
  the first invocation builds an image, which is not fast.
- **Slow I/O on a Windows-path bind mount**, made worse by this repository living
  on OneDrive. `bin/dev npm test` is noticeably slower than `npm test` on the
  host. This does not invalidate the path; it invalidates the idea that it be the
  default, and is one more reason for host-first.
- **One more public execution path to maintain**, with the deliberately partial CI
  coverage that `E-5` chose.

It is born `draft`.

### `M-5` — the debt

`TDR-0002` goes to `status: paid`. The payment trigger it declared itself —
"when `bin/living-docs` is taught again in `README.md`,
`CONTRIBUTING.md`, `docs/definition-of-done.md` or in any workflow" — is met by
`M-10` and `M-7`, and the wrapper stops being the dead file the TDR describes: it
starts working.

`paid` is a valid `TDR` state (`src/docs/schema.ts`). Since `status` is a mutable
field, `HK-3` asks; the answer is not the agent's.

This is the **last** change to be applied. Marking the debt as paid before the
wrapper works would be recording as fact something that is not yet so.

### `M-6` — the ownership map

The `watches` of `bin/living-docs` becomes `bin/**`, same `reason` and same
`consumer-visible: true` — the reason already written there ("the wrapper is a
public entry point of the toolkit") applies equally to `bin/dev`. In
`consumer-visible-paths`, `bin/dev` is added to `bin/living-docs`.

`CODEOWNERS` **does not change**: it mirrors the `owner` field of documentation
artifacts, and `bin/**` is a watched path, not an artifact.

### `M-7` — the workflow

A new file, separate from `living-docs.yml`, because the `paths` filter of GitHub
Actions is per workflow and not per job — making a job inside the existing
workflow conditional would require a third-party action for nothing.

It triggers on `push` and `pull_request` restricted to `Dockerfile`,
`compose.yaml`, `.dockerignore`, `bin/**`, `package.json` and `package-lock.json`.
It brings up the container and runs, through the wrapper, what the host already
runs: `bin/dev npm test` and `bin/dev node src/cli/index.ts validate`.

The effect on an ordinary PR is **zero**: no image build, no extra minute. The
gain that `ADR-0015` declared by taking image building out of CI stands, and the
Docker path is only exercised when someone touches what could break it.

`.github/workflows/**` is a `consumer-visible-path`; the `CHANGELOG` entry of
`M-11` covers this.

### `M-8` — the tests

They run on the host, on every PR, without Docker. They cite `RNF-0006`. There are
three, and none of them pretends to prove that Docker works — they prove that the
**structure** that sustains parity has not come undone:

1. `bin/living-docs` delegates to `bin/dev` and contains no `docker exec` of its
   own. It is the test that stops the duplication of logic from coming back.
2. `bin/dev` passes on `"$@"` and enumerates no command — the invariant of §2,
   verified instead of promised.
3. `docs/.ownership.yml` covers `bin/dev` in `watches` and in
   `consumer-visible-paths`.

They are textual assertions over the scripts, in the same spirit as
`test/core/roots.test.ts` ("no absolute container path is embedded in `src/` or
`test/`"), which already exists and already works this way.

The verification that the path **executes** is `M-7`. The two complete each other:
`M-8` covers the structure on every PR, `M-7` covers the execution when it may
have broken.

### `M-9` — principle 6

Today: _"The toolkit runs on the host's Node, with no build step — verified by
`test/plugin/manifest.test.ts` (`RNF-0002`) and by the workflow, which installs
Node and npm and nothing else."_

The final clause becomes ambiguous with a second workflow that builds an image.
The amendment keeps the statement — the execution of record is the host, and there
is no build step — and makes explicit that the containerized path of `RNF-0006` is
optional and is not the verification of record. `version` goes to `3`, with an
entry in the amendment history citing `ADR-0016`.

A charter amendment is a human act. The agent writes the proposal; whoever
promotes it is whoever asked.

### `M-10` — the prose

`README.md` and `CONTRIBUTING.md` come to teach both paths, **with the host
first** and Docker labeled as optional in both. The host block that already exists
is neither rewritten nor relocated: it gains a sibling block below.

`docs/definition-of-done.md` **does not change**. What CI reproduces on every PR
is the host; making the Docker path a done criterion would create a second bar
that nobody measures. Docker is a convenience for whoever develops, it is not the
verification of record — the same statement that `M-9` takes to the charter.

### `M-11` — the `CHANGELOG`

`bin/**` and `.github/workflows/**` are `consumer-visible-paths`; `CI-6` demands
the entry. It records the new entry point (`bin/dev`) and the behavior change of
`bin/living-docs`, which no longer requires a previously started container.

---

## 4. Order of application

The order is not a style preference: each step only asserts what is already true
when it runs.

1. `M-3`, `M-4` — the rule and the decision come before the code (`CLAUDE.md`).
2. `M-1` — `bin/dev`.
3. `M-2` — `bin/living-docs` rewritten.
4. `M-8` — the tests, which only pass after `M-1` and `M-2`.
5. `M-6` — the ownership map.
6. `M-7` — the workflow.
7. `M-9`, `M-10`, `M-11` — charter, prose and `CHANGELOG`.
8. `M-5` — `TDR-0002` to `paid`, when the trigger has actually been met.

---

## 5. What this spec does not do

- **Does not supersede `ADR-0015`**, and does not reopen `ADR-0001`. `E-1` is what guarantees this.
- **Does not touch `ADR-0003`.** The two roots remain distinct and keep coming from
  the same sources.
- **Does not resolve `DA-0003`** (how the toolkit reaches a consumer repository).
  Publishing an image is a possible path, and remains a future decision — the same
  way `ADR-0003` deliberately did not take it.
- **Does not promote anything.** `RNF-0006` and `ADR-0016` are born `draft`,
  `TDR-0002` goes to `paid` under an `HK-3` question, and Constitution v3 is a
  human amendment.
