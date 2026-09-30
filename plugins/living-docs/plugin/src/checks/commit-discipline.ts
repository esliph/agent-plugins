import type { Check, CheckContext, DiffFacts, Finding } from '../core/types.ts'
import type { FileEdit } from '../git/diff.ts'
import type { ArtifactDoc } from '../docs/collect.ts'
import { findArtifactRule } from '../config/ownership.ts'
import { canonicalId, parseId } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'
import { findCitations } from '../ids/citations.ts'

const RULE = 'living-docs/commit-discipline'

/**
 * The diff with the lines, and not only the paths. It is the extra fact that `living-docs/commit-discipline` asks for and
 * that `ownership/consumer-change-logged` and `living-docs/open-decision-claim` do not need — hence a type of its own, and not an
 * optional field in `DiffFacts`: an optional field someone forgets to fill in becomes a
 * check that goes quiet without saying it went quiet.
 */
export interface CommitFacts extends DiffFacts {
  edits: readonly FileEdit[]
}

const LAST_REVIEWED = /^\s*last-reviewed\s*:/i

/** The edit touched the review date and nothing else (`RN-0027`). */
export function isPureDateBump(edit: FileEdit): boolean {
  return edit.added.length === 1 && edit.removed.length === 1 && LAST_REVIEWED.test(edit.added[0] ?? '') && LAST_REVIEWED.test(edit.removed[0] ?? '')
}

/**
 * The IDs this file declares, in canonical form (`RN-0024`). An individual
 * artifact declares one in the frontmatter; a collection declares one per item.
 */
export function declaredIds(doc: ArtifactDoc, format: IdFormat): string[] {
  const raw: unknown[] = doc.rule.collection === 'per-file' ? [doc.frontmatter?.data?.id] : doc.items.map(item => item.key)

  const ids: string[] = []

  for (const value of raw) {
    const parsed = parseId(value, format)

    if (parsed !== null) {
      ids.push(canonicalId(parsed))
    }
  }

  return ids
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

function error(file: string, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
}

/**
 * `living-docs/commit-discipline` — commit discipline. Two halves, both read from the branch diff: the
 * mass bump of `last-reviewed` (`RN-0027`, spec §13 anti-requirement) and the
 * commit that changes an artifact without citing the affected ID (`RN-0028`, spec §11).
 *
 * Runs in the group that already receives the diff by injection, for the same reason as `ownership/consumer-change-logged` and
 * `living-docs/open-decision-claim`: without a base there is no commit to read, and inventing one
 * would produce a finding about a change that is not from this branch (`ADR-0010`).
 *
 * The unit of both halves is the **branch diff**, not the commit: it is the unit
 * CI has, and splitting a bump into three commits does not make it a real review
 * (`ADR-0013`).
 */
export function livingDocsCommitDiscipline(facts: CommitFacts | null): Check {
  return {
    id: RULE,
    name: 'commit discipline',
    run(context: CheckContext): Finding[] {
      if (facts === null) {
        return []
      }
      const findings: Finding[] = []
      const { config } = context

      // 1 — mass bump of `last-reviewed` (`RN-0027`).
      // No exception label, on purpose: the label would be the ticked box
      // that the spec §13 anti-requirement describes (`ADR-0013`).
      const bumps = facts.edits.filter(isPureDateBump).map(edit => normalizePath(edit.path))

      if (bumps.length >= config.lastReviewedBumpLimit) {
        const listed = bumps.slice(0, 5).join(', ') + (bumps.length > 5 ? `, … (+${bumps.length - 5})` : '')

        findings.push(
          error(
            bumps[0] ?? '',
            `The diff \`${facts.base}...HEAD\` changes the \`last-reviewed\` field of ${bumps.length} documents and nothing ` +
              `else in the body of any of them (threshold: ${config.lastReviewedBumpLimit}): ${listed}.`,
            'A document that was really reviewed changes in more than its date — a mass bump is the review mechanism ' +
              'being switched off while pretending to be honored. Revert the date of those that were not reviewed, or review them ' +
              // Rule of origin: RN-0027, ADR-0013.
              '(the threshold is `last-reviewed-bump-limit` in `.ownership.yml`).',
          ),
        )
      }

      // 2 — commit that changes an artifact without citing the affected ID (`RN-0028`).
      const cited = new Set<string>()

      for (const message of facts.messages) {
        for (const citation of findCitations(message, config.idFormat)) {
          const parsed = parseId(citation.id, config.idFormat)

          if (parsed !== null) {
            cited.add(canonicalId(parsed))
          }
        }
      }

      for (const path of facts.changed.map(normalizePath)) {
        if (findArtifactRule(config, path) === null) {
          continue
        }
        const doc = context.docs.find(candidate => candidate.file === path)

        if (doc === undefined) {
          continue
        } // deleted in the diff: no ID to cite

        const ids = declaredIds(doc, config.idFormat)

        if (ids.length === 0) {
          continue
        } // artifact file without an item: nothing to cite
        if (ids.some(id => cited.has(id))) {
          continue
        }

        const listed = ids.slice(0, 5).join(', ') + (ids.length > 5 ? `, … (+${ids.length - 5})` : '')

        findings.push(
          error(
            path,
            `The diff \`${facts.base}...HEAD\` changes \`${path}\` and no commit message cites one of the IDs ` + `declared in it (${listed}).`,
            'Cite the affected ID in the commit message — this project\'s format is in `CONTRIBUTING.md`. It is the ' +
              'citation that makes `git log` navigable by rule: without it the history answers "what changed" and ' +
              // Rule of origin: RN-0028.
              `never "because of which rule" (owning skill: ${doc.rule.skill}).`,
          ),
        )
      }

      return findings
    },
  }
}
