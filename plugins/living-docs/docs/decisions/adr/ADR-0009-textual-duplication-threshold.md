---
id: ADR-0009
title: The threshold that tells shared vocabulary from copied content
status: accepted
owner: '@esliph/engineering'
trigger: >
  Never. Immutable once accepted; a new decision supersedes it.
last-reviewed: 2026-08-27
relates-to: [RN-0010]
supersedes: null
superseded-by: null
---

# ADR-0009 — The threshold that tells shared vocabulary from copied content

## Context

`CI-7` includes "agent contract repeating text from an owning artifact" (spec
§9), and spec §5 (`SK-6`, rule 1) says it is `CI-7` that flags this. `RN-0010`
already declares the rule and records, in "out of scope", that automatic
detection arrives in Phase 7.

It is the only check in the spec with a real risk of false positives. The agent
contract talks about the same things the owning artifacts talk about — its job is
to point at them —, so it **will** share words. A check that confuses shared
vocabulary with copied content is switched off on day one, and then the rule it
protected has no enforcement at all.

## Alternatives considered

1. **Any repeated line.** Discarded. It would fail "Nothing runs on the host
   beyond Docker", which is legitimate, short policy, and whose presence in the
   agent contract is what makes the agent obey it.
2. **Statistical similarity (shingles, Jaccard, a percentage threshold).**
   Discarded. A number nobody can explain inside a PR is not enforcement, it is
   guessing; and the cost of a false positive here is not an adjustment, it is a
   discussion about the check itself.
3. **Only the requirement title**, which is what
   `test/docs/agent-contract.test.ts` has done since Phase 3. Discarded as the
   final form: it catches the easiest case and lets the copied paragraph through,
   which is the expensive case.
4. **A normalized sentence with a word floor, compared by equality within the
   corpus.** Chosen.

## Decision

**A sentence of twelve words or more from the agent contract that reappears,
word for word, in an artifact with an owning skill is a duplicate and fails.**

- **Unit: the sentence.** Paragraph first (consecutive lines joined), cut
  afterwards: prose broken at eighty columns cannot escape the check just because
  of where the editor pressed enter.
- **Normalization:** lowercase, no markup (`*`, `_`, `` ` ``, `~`), no
  punctuation, collapsed whitespace. A code block — fenced or inline — is removed
  beforehand.
- **Floor: 12 words.** Below that it is shared vocabulary.
- **Corpus: declared artifacts and documents that have an owning skill.** What
  cites by trade is left out — plan, spec, README, backlog —, because there
  repetition is the job, and failing the agent contract because of a plan that
  quoted it would invert who copied from whom.
- **Severity: error.** The fix is to delete the sentence from the contract and
  leave the pointer to the owning artifact — never to lower the threshold.

## Consequences

### What we gain

`RN-0010` gains automatic enforcement, and the most expensive duplicate there is
— the one that is re-read in every agent session and therefore beats the new
version by repetition — starts being caught by a machine instead of by careful
review.

### What we accept to lose

**A paraphrase passes.** A semantic duplicate is not detected, and will not be:
the check that detected it would be wrong more often than right, and its error
would be in a direction nobody can argue against.

**The floor is a chosen number, not a derived one.** Twelve words is the point
where the policy sentences of this repository fall below and the copied
paragraphs fall above; it is a calibration made against the corpus of one
project. The first time it fails a legitimate sentence, the way is a new ADR that
changes it, with the concrete case attached — not a local exception inside the
check.

The corpus depends on `skill:` being declared. A document that should be in the
corpus and declares no skill is left out, and its duplicate passes. It is the
price of not having a second list of "who enters the corpus".
