---
id: ADR-0018
title: 'What the toolkit ships does not cite its own internal trail'
status: draft
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-09-16
relates-to: [RN-0031, ADR-0017]
supersedes: null
superseded-by: null
---

# ADR-0018 — What the toolkit ships does not cite its own internal trail

## Context

The toolkit writes text that comes to live in the repository and the session of
whoever installs it: the files `init` seeds, the comments of `.ownership.yml` and
of the workflow, the text of the plugin's skills and the check and hook messages.
That text cites ADRs, RNs and sections of the toolkit's spec — a trail that only
resolves inside the toolkit's repository. For whoever installs, the citation does
not exist or, worse, resolves to an item of their own with another meaning: the
installer's `ADR-0008` is their own eighth decision. And `validate` passes
without saying anything, because `CI-2` reads neither YAML comments nor check
output.

The seeds, moreover, carry filling-in instructions — the banner saying the file
was created by `init`, the comment naming the owning skill — that stay in the
document after it is filled in and come to be read by people who will never write
in it.

`ADR-0017` drew the reader boundary for the documents of a repository. This
decision draws its sister: what crosses from the toolkit to whoever installs.

## Alternatives considered

- **Keeping it.** Discarded: it is the problem.
- **Qualifying the citation** ("`RN-0019` of the toolkit"). Discarded: it still
  does not resolve for whoever reads.
- **Linking the toolkit's repository.** Discarded: there is no stable address
  while `DA-0003` is open, and the link throws the reader into an internal
  decision document — the reason `ADR-0017` discards "ID with a link".
- **Centralizing the messages in a catalog** and verifying only the catalog.
  Discarded: it refactors seventeen files and moves the message away from the
  code that produces it.
- **A generic `CI-n` check**, switched on by a key in `.ownership.yml`. Discarded:
  it grows the public contract for a problem only the toolkit has — only whoever
  distributes text to other repositories has it, and today only the toolkit
  distributes.
- **Human verification only.** Discarded: it is text that agents and skills write
  on their own, and the uniform citation is the habit they learned; the ID comes
  back without anyone seeing it.

## Decision

The text the toolkit delivers to whoever installs does not cite an artifact or a
section of the toolkit's spec. The identifiers of the public interface, the names
of skills and the commands remain citable: they exist in the environment of
whoever installs.

The format of a document lives in the template; the rule for writing it lives in
the skill. Guidance that only serves whoever writes does not stay in a collection
document or in an external document — in it, whoever writes is not whoever reads.

The trail continues to exist on the inside: in the code comment next to the
string that lost the citation, and in the commit message. The verification is a
test of the toolkit, which reads the internal prefixes from the toolkit's own
`.ownership.yml`, and not a check that whoever installs receives.

**This ADR does not amend the toolkit's spec.** The uniform citation remains
valid inside the toolkit's repository — artifact, test, code, commit. What
changes is what crosses to whoever installs; amending the spec to say "uniform,
except…" would trade a simple rule for a rule with an exception in the place
where it is most read.

## Consequences

### What we gain

Whoever installs receives a seed, a skill and a message that stand on their own,
and the filled-in document carries no instruction for anyone. The rule the toolkit
imposes on the external documents of whoever installs is not born broken by the
toolkit itself, and a new family declared in the toolkit starts being watched in
the same commit.

### What we accept to lose

**Whoever installs and works without an agent receives the seed with no
filling-in instruction.** The instruction lives in the skill.

**An already-installed repository keeps the old text.** `init` does not rewrite it
and does not start warning.

**The test may fail a `src/` string that is not output** — a regex, a piece of
data. Today none matches.

**Whoever maintains the toolkit reads the why of a message in the comment next to
it**, not in the message.

**The toolkit's spec keeps affirming uniformity.** Whoever reads only the spec
does not see the cut without going through this ADR.
