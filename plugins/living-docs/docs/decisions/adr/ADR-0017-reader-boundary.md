---
id: ADR-0017
title: 'Reader boundary: an artifact ID is an internal trail'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-15
relates-to: [RN-0030, RF-0015, RN-0013, RN-0007]
supersedes: null
superseded-by: null
---

# ADR-0017 — Reader boundary: an artifact ID is an internal trail

## Context

The toolkit's spec says to cite an item by ID uniformly — in code, tests,
documents and commit messages — and says the migration guide should point to the
ADR that decided the break. Neither passage distinguishes who is reading.

Inside the repository, this is what makes traceability navigable: `RN-0007`
requires every citation to resolve, and whoever maintains the code follows the ID
to the artifact. Outside it, the same ID is noise. Whoever reads the README to
decide whether to install, the CHANGELOG to decide whether to upgrade, or a
migration guide to cross a break has no way to know what `RNF-0006` means — and,
for whoever installs the package or the plugin, `docs/` may not even be at hand.
The result is documents written for people from the outside carrying references
that only resolve on the inside.

`RN-0013` already drew a similar boundary for the CHANGELOG: the entry is aimed
at whoever consumes, and what only makes sense to whoever wrote the code does not
belong in it. An artifact ID is exactly that.

## Alternatives considered

- **Keeping the citation uniform.** Discarded: it is the problem. The outside text
  keeps depending on an internal document to make sense.
- **Allowing the ID as long as it comes with a link to the artifact.** Discarded:
  the link resolves, but it takes the visitor to an internal decision document,
  written for whoever maintains the repository, and the outside text comes to
  depend on the inside one to make sense. For the same reason, an ID in the path
  of a link counts as a citation, even when it does not appear in the rendered
  text.
- **Human verification only, in the skill's checklist.** Discarded: the text in
  question is precisely what skills and agents write on their own, and the
  uniform citation is the habit they learned. The ID comes back without anyone
  seeing it.
- **A top-level `external-docs:` list**, in the mold of `consumer-visible-paths`.
  Discarded: it is a second list of paths to diverge from `documents:`, and the
  repository has already needed a test just to keep two such lists from drifting.
- **Reusing `role`.** Discarded: the vocabulary of `role` is closed and holds "one
  role, one document" (`ADR-0008`); it does not mark CHANGELOG, migration guides
  and README at the same time.

## Decision

A document or artifact declared `audience: external` does not cite an artifact
ID. The link between it and the artifact continues to exist, and lives on the
inside: in the artifact itself, while it is still editable, or in the commit
message that wrote the outside text. The identifiers of the public interface —
`CI-n`, `HK-n`, `SK-n`, `CM-n`, `EXIT-n` — remain citable: they are the ones the
CLI output already shows to people from the outside, and the ones the versioning
policy promises not to redefine.

The mark is a key per entry, in `documents:` and in `artifacts:`; without it, the
document is internal. Internal is the prefix declared in `artifacts:`, and only
that: the verification carries no list of prefixes, so a project that declares a
new family gets the boundary in the same commit, and a project that has not yet
declared a family is not charged for a loose ID of it — the same boundary
`RN-0007` already uses. `CI-11` fails with error severity and no exception label:
the fix is always to rewrite, in running text, what the item decides or requires.

**This ADR does not amend the toolkit's spec, and the reason is one of
substance.** The uniform citation remains valid for everything internal —
artifact, test, code, commit message —, which is almost everything. The boundary
is a cut on the outside, not a reversal of the rule; amending the spec to say
"uniform, except…" would trade a simple rule for a rule with an exception in the
place where it is most read.

## Consequences

### What we gain

Whoever reads from the outside receives text that stands on its own. The boundary
comes out of the configuration that already exists — `artifacts:` says what is
internal, and the public interface stays out without any written exception — and
is verified in CI, not recalled in a checklist.

### What we accept to lose

**Whoever reads from the outside and wants the why loses the shortcut.** The path
goes from the inside out, not the reverse.

**The link between a migration guide and an ADR now lives in the commit
message.** An accepted ADR is frozen by `HK-1` and cannot gain a citation to a
guide written after it; the commit that creates the guide cites the ADR. The
verification of that link was human and remains human — enforcement is not lost,
but the link becomes less visible.

**An already-installed repository is not verified** until it marks its own
documents by hand: `init` warns, and does not rewrite the line.

**The toolkit's spec keeps affirming uniformity.** Whoever reads only the spec
does not see the boundary without going through this ADR.

**This repository's README and CHANGELOG are rewritten** in running text where
they cited IDs.
