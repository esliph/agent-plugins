import type { Check, CheckContext, Finding } from '../core/types.ts'
import type { ArtifactRule } from '../config/ownership.ts'
import { fieldOf, hasField } from '../config/ownership.ts'
import { canonicalId, parseId } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'
import { findCitations } from '../ids/citations.ts'
import { scanCitations } from '../ids/coverage.ts'
import type { CitationSite } from '../ids/coverage.ts'
import { display } from '../core/display.ts'

const RULE = 'living-docs/citation-coverage'

/** Pairs that must close on both sides (spec §8). */
const PAIRS: readonly { from: string; to: string }[] = Object.freeze([
  { from: 'supersedes', to: 'superseded-by' },
  { from: 'revokes', to: 'revoked-by' },
])

interface Entry {
  id: string
  file: string
  line: number
  status: string
  rule: ArtifactRule
  /** Reading of a canonical field, be it frontmatter or a collection item. */
  read(canonical: string): string | null
  /** True when a table row has no such column at all; per-file and sections entries never lack one here. */
  lacks(canonical: string): boolean
}

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

/**
 * The hint for a field the item does not carry at all: the project may name
 * the column in its own words, and `field-map` is where it says so (RN-0039).
 */
function missingFieldHint(entry: Entry, canonical: string): string {
  if (!entry.lacks(canonical)) {
    return ''
  }

  return (
    ` ${entry.file} has no \`${canonical}\` field. If the project names it differently, declare it under ` +
    `\`field-map\` in this artifact's entry of the ownership file: \`field-map: { ${canonical}: '<your column>' }\`.`
  )
}

/** Canonical IDs cited inside a value, whatever its shape. */
function idsIn(value: string | null, format: IdFormat): string[] {
  if (value === null) {
    return []
  }

  return findCitations(value, format)
    .map(citation => parseId(citation.id, format))
    .filter((parsed): parsed is { prefix: string; number: number } => parsed !== null)
    .map(canonicalId)
}

/**
 * Every traceable item in the repository, with a uniform field reading.
 * File frontmatter and collection items answer the same canonical question,
 * and that is what lets `living-docs/citation-coverage` know no field name at all.
 */
function entriesOf(context: CheckContext, format: IdFormat): Entry[] {
  const entries: Entry[] = []

  for (const doc of context.docs) {
    if (doc.rule.collection === 'per-file') {
      const data = doc.frontmatter?.data
      const id = data?.id

      if (typeof id !== 'string' || !parseId(id, format)) {
        continue
      }
      entries.push({
        id,
        file: doc.file,
        line: doc.frontmatter?.lines.id ?? 1,
        status: typeof data?.status === 'string' ? data.status : '',
        rule: doc.rule,
        lacks: () => false,
        read: canonical => {
          const value = data?.[canonical]

          if (value === undefined || value === null) {
            return null
          }
          const text = Array.isArray(value) ? value.map(display).join(', ') : display(value)

          return text.trim() === '' || text === 'null' ? null : text
        },
      })
      continue
    }

    for (const item of doc.items) {
      entries.push({
        id: item.key,
        file: doc.file,
        line: item.line,
        status: item.state,
        rule: doc.rule,
        // Only a table header defines a field for every row; in a `sections`
        // file an absent bullet is the ordinary way to leave a value out.
        lacks: canonical => doc.rule.collection === 'table' && !hasField(doc.rule, item, canonical),
        read: canonical => fieldOf(doc.rule, item, canonical),
      })
    }
  }

  return entries
}

export const livingDocsCitationCoverage: Check = {
  id: RULE,
  name: 'traceability',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = []
    const format = context.config.idFormat
    const entries = entriesOf(context, format)
    const byId = new Map(entries.map(entry => [canonicalId(parseId(entry.id, format)!), entry]))

    for (const entry of entries) {
      const self = canonicalId(parseId(entry.id, format)!)

      // 1 and 2 — bidirectional pairs.
      for (const pair of PAIRS) {
        for (const side of [pair, { from: pair.to, to: pair.from }]) {
          for (const targetId of idsIn(entry.read(side.from), format)) {
            const target = byId.get(targetId)

            if (!target) {
              findings.push(
                error(
                  entry.file,
                  entry.line,
                  `${entry.id} declares \`${side.from}: ${targetId}\`, which does not exist.`,
                  // Rule of origin: spec §8.
                  'Cite an existing ID, or remove the field.',
                ),
              )
              continue
            }
            if (!idsIn(target.read(side.to), format).includes(self)) {
              findings.push(
                error(
                  target.file,
                  target.line,
                  `Open pair: ${entry.id} declares \`${side.from}: ${target.id}\`, but ${target.id} does not declare \`${side.to}: ${entry.id}\`.`,
                  // Rule of origin: spec §8.
                  `Add \`${side.to}: ${entry.id}\` to ${target.file}:${target.line} — the pair closes on both sides.`,
                ),
              )
            }
          }
        }
      }

      // 3 — revocation without who revoked.
      if (entry.status === 'revoked' && entry.read('revoked-by') === null) {
        findings.push(
          error(
            entry.file,
            entry.line,
            `${entry.id} is \`revoked\` without declaring \`revoked-by\`.`,
            // Rule of origin: spec §5, SK-4.
            'A removed rule is revoked, not deleted — point to the ID that replaced it.' + missingFieldHint(entry, 'revoked-by'),
          ),
        )
      }

      // 4 and 5 — a resolved DA points at the ADR, and the ADR points back.
      if (entry.status === 'resolved') {
        const resolvers = idsIn(entry.read('resolved-by'), format)

        if (resolvers.length === 0) {
          findings.push(
            error(
              entry.file,
              entry.line,
              `${entry.id} is \`resolved\` without saying what resolved it.`,
              // Rule of origin: spec §5, SK-3, rule 7.
              'Every closed open decision points to the ADR that closed it.' + missingFieldHint(entry, 'resolved-by'),
            ),
          )
        }
        for (const resolverId of resolvers) {
          const resolver = byId.get(resolverId)

          if (!resolver) {
            findings.push(error(entry.file, entry.line, `${entry.id} points to ${resolverId}, which does not exist.`, 'Create the ADR or fix the reference.'))
            continue
          }
          if (!idsIn(resolver.read('relates-to'), format).includes(self)) {
            findings.push(
              error(
                resolver.file,
                resolver.line,
                `${resolver.id} resolves ${entry.id}, but does not cite it in \`relates-to\`.`,
                // Rule of origin: spec §5, SK-3, rule 7.
                `Add ${entry.id} to \`relates-to\` — living-docs/citation-coverage checks both sides.`,
              ),
            )
          }
        }
      }

      // 6 — accepted ADR without a link.
      if (entry.status === 'accepted' && idsIn(entry.read('relates-to'), format).length === 0) {
        findings.push(
          error(
            entry.file,
            entry.line,
            `${entry.id} is \`accepted\` without \`relates-to\`.`,
            // Rule of origin: spec §8.
            'An accepted ADR cites at least one requirement, open decision or principle — a decision that links to nothing is a sign of missing context.',
          ),
        )
      }
    }

    // 7 — coverage by citation, one scan per distinct set of globs.
    const scans = new Map<string, Map<string, CitationSite[]>>()

    for (const entry of entries) {
      if (entry.status !== 'active' || entry.rule.citedBy.length === 0) {
        continue
      }

      const key = JSON.stringify(entry.rule.citedBy)
      let sites = scans.get(key)

      if (!sites) {
        sites = scanCitations(context.root, entry.rule.citedBy, format)
        scans.set(key, sites)
      }

      const canonical = canonicalId(parseId(entry.id, format)!)
      const found = [...sites.entries()].some(([id, places]) => {
        const parsed = parseId(id, format)

        // A citation inside the artifact's own file covers nothing: the rule
        // must be cited from outside for the graph to close (spec §8).
        return parsed !== null && canonicalId(parsed) === canonical && places.some(place => place.file !== entry.file)
      })

      if (!found) {
        findings.push(
          error(
            entry.file,
            entry.line,
            `${entry.id} is \`active\` and is not cited in any of ${entry.rule.citedBy.join(', ')}.`,
            // Rule of origin: spec §5, SK-4, rule 6.
            `Cite ${entry.id} in the test that covers it — traceability closes on both sides.`,
          ),
        )
      }
    }

    return findings
  },
}
