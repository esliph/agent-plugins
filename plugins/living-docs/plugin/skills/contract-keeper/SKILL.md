---
name: contract-keeper
description: >
  Use when the public interface changes — endpoint, payload, output format,
  exit code, field name —, when a new error code appears, or when someone asks
  "is this public?", "can I change this field?", "what does this error mean?",
  "who depends on this?", "can I edit this generated file?", "why did CI
  complain about the contract?". Also when something published has to be
  deprecated, or when deciding what a consumer can or cannot assume to be
  stable.
---

# contract-keeper — owner of the public contract

## Overview

The contract has two halves, and they are written in opposite ways. The
**generated** half is never written: it comes out of an annotated source, and
editing it by hand is blocked by `ownership/generated-guard`. The **written**
half is the policy around it — versioning, deprecation, the error catalog —
and no generator produces that.

Confusing the two is the expensive mistake: a contract edited by hand lives
until the next generator run and lies until then, with the authority of a file
that looks official.

The paths come from `.ownership.yml` (`generated[]` and the owner of
`docs/contracts/`); do not assume them.

## What you own

| Artifact                              | What it is                                                                      | Shape                                |
| ------------------------------------- | ------------------------------------------------------------------------------- | ------------------------------------ |
| The _pipeline_ that generates the contract | The annotated source + the command declared in `generated[].command`       | Code, not a document                 |
| The generated artifact (`*.gen.*`)    | The contract itself                                                             | Generated; never edited by hand (`ownership/generated-guard`) |
| `docs/contracts/errors.md`            | Error catalog: code, meaning, when it occurs, transport, whether it is public   | Single file, table, mutable          |
| `docs/contracts/versioning-policy.md` | What is public, what never changes meaning, how deprecation works               | Single file, sections                |

The seeds are in `templates/errors.md` and `templates/versioning-policy.md`.
Do not reproduce their content here.

## When to use / when not to

**Use** on every public interface change, every new error code, and every
change to the versioning policy.

**Do not use** to document internal behavior: what a consumer cannot observe is
not contract, it is implementation — and implementation does not become a
document. A business rule is `requirements-keeper`; the "why" of the change is
`decision-recorder`.

**The cost of using it needlessly:** a field declared public can no longer
change without deprecation. Every line of the contract is a commitment someone
will hold you to — publishing what did not need to be public is debt nobody
recorded.

## Procedure

1. **Find out whether the artifact is generated.** Check `generated[]` in
   `.ownership.yml` and look for the `generated: do not edit` marker at the top
   of the file. If it is generated, **stop thinking about editing it**.
2. **To change what is generated, change the annotated source** and run the
   command declared in `generated[].command`. The command prints to standard
   output and does not write a file — redirect it yourself to the `path`.
3. **Run `ownership validate`** and confirm exit 0. That is
   `ownership/generated-drift`, and it is what survives someone editing in the
   browser.
4. **A new generated artifact goes into `generated[]`** with the command that
   produces it. Without the declaration, `ownership/generated-guard` only
   catches it by the marker and `ownership/generated-drift` does not see it.
5. **A new error code goes into the catalog** with code, meaning (not the
   displayable message), when it occurs, transport, whether it is public and
   status.
6. **A published code never changes meaning**: it gets `deprecated` and a named
   replacement. Without a replacement it is not deprecation — it is a
   compatibility break, and goes through the versioning policy and an ADR
   (`decision-recorder`).
7. **Name things by the glossary** (`glossary-keeper`), not by the habit of
   whoever wrote the endpoint.
8. **A consumer-visible change produces a CHANGELOG entry** — the entry belongs
   to `release-historian`, and `ownership/consumer-change-logged` enforces it on
   the paths the project declares in the `watches` rules marked
   `consumer-visible: true`.
9. **Cite the affected ID in the commit message.**
10. **The seed is not content.** On the first write over what `init` seeded,
    `EXAMPLE-CODE` goes, and so does anything in the versioning policy that is
    not true for this project.

## Boundaries

| Yours                                                         | Not yours                                               |
| ------------------------------------------------------------- | ------------------------------------------------------- |
| The pipeline that generates the contract, and the annotated source | Editing the generated file — `ownership/generated-guard` denies it, and it is right |
| The policy around it: versioning, deprecation, stability     | The contract itself, when it can be generated           |
| The error catalog: code, meaning, status                      | The displayable message, which is not contract          |
| Declaring what is public                                      | Deciding to break compatibility (that is an ADR, and a human act) |
| Requiring a replacement before deprecating                    | Writing the migration guide (that is `release-historian`) |

## Checklist

- [ ] No generated artifact was edited by hand — verification: `ownership/generated-guard` (blocks) and `ownership/generated-drift` (`ownership validate`)
- [ ] The generated artifact in the commit is the generator's current output — verification: `ownership/generated-drift`
- [ ] Every generated artifact is declared in `generated[]`, with the command that produces it — verification: human
- [ ] The generator prints to standard output and does not write a file — verification: human
- [ ] Every new error code has a meaning, a trigger, a transport and a status — verification: human
- [ ] No published code changed meaning; what changed got `deprecated` + a replacement — verification: human
- [ ] A change that breaks compatibility has an ADR — verification: human (`living-docs/state-promotion` intercepts the acceptance)
- [ ] What became public was foreseen in the policy, and did not widen the contract silently — verification: human
