import type { Check, CheckContext, DiffFacts, Finding } from '../core/types.ts'
import type { FileEdit } from '../git/diff.ts'
import type { ArtifactDoc } from '../docs/collect.ts'
import { findArtifactRule } from '../config/ownership.ts'
import { canonicalId, parseId } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'
import { findCitations } from '../ids/citations.ts'

const RULE = 'living-docs/commit-discipline'

/**
 * O diff com as linhas, e não só os caminhos. É o fato a mais que `living-docs/commit-discipline` pede e
 * que `ownership/consumer-change-logged` e `living-docs/open-decision-claim` não precisam — por isso um tipo próprio, e não um campo
 * opcional em `DiffFacts`: campo opcional que alguém esquece de preencher vira
 * check que se cala sem dizer que se calou.
 */
export interface CommitFacts extends DiffFacts {
  edits: readonly FileEdit[]
}

const LAST_REVIEWED = /^\s*last-reviewed\s*:/i

/** A edição mexeu na data de revisão e em mais nada (`RN-0027`). */
export function isPureDateBump(edit: FileEdit): boolean {
  return edit.added.length === 1 && edit.removed.length === 1 && LAST_REVIEWED.test(edit.added[0] ?? '') && LAST_REVIEWED.test(edit.removed[0] ?? '')
}

/**
 * Os IDs que este arquivo declara, em forma canônica (`RN-0024`). Artefato
 * individual declara um no frontmatter; coleção declara um por item.
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
 * `living-docs/commit-discipline` — commit discipline. Duas metades, as duas lidas do diff da branch: o
 * bump em massa de `last-reviewed` (`RN-0027`, anti-requisito da spec §13) e o
 * commit que altera artefato sem citar o ID afetado (`RN-0028`, spec §11).
 *
 * Roda no grupo que já recebe o diff por injeção, pela mesma razão de `ownership/consumer-change-logged` e
 * de `living-docs/open-decision-claim`: sem base não há commit para ler, e inventar um
 * produziria achado sobre mudança que não é desta branch (`ADR-0010`).
 *
 * A unidade das duas metades é o **diff da branch**, não o commit: é a unidade
 * que o CI tem, e partir um bump em três commits não o torna revisão de verdade
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

      // 1 — bump em massa de `last-reviewed` (`RN-0027`).
      // Sem rótulo de exceção, de propósito: o rótulo seria a caixinha marcada
      // que o anti-requisito da spec §13 descreve (`ADR-0013`).
      const bumps = facts.edits.filter(isPureDateBump).map(edit => normalizePath(edit.path))

      if (bumps.length >= config.lastReviewedBumpLimit) {
        const lista = bumps.slice(0, 5).join(', ') + (bumps.length > 5 ? `, … (+${bumps.length - 5})` : '')

        findings.push(
          error(
            bumps[0] ?? '',
            `The diff \`${facts.base}...HEAD\` changes the \`last-reviewed\` field of ${bumps.length} documents and nothing ` +
              `else in the body of any of them (threshold: ${config.lastReviewedBumpLimit}): ${lista}.`,
            'A document that was really reviewed changes in more than its date — a mass bump is the review mechanism ' +
              'being switched off while pretending to be honored. Revert the date of those that were not reviewed, or review them ' +
              // Rule of origin: RN-0027, ADR-0013.
              '(the threshold is `last-reviewed-bump-limit` in `.ownership.yml`).',
          ),
        )
      }

      // 2 — commit que altera artefato sem citar o ID afetado (`RN-0028`).
      const citados = new Set<string>()

      for (const message of facts.messages) {
        for (const citation of findCitations(message, config.idFormat)) {
          const parsed = parseId(citation.id, config.idFormat)

          if (parsed !== null) {
            citados.add(canonicalId(parsed))
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
        } // apagado no diff: não há ID a citar

        const ids = declaredIds(doc, config.idFormat)

        if (ids.length === 0) {
          continue
        } // arquivo de artefato sem item: nada a citar
        if (ids.some(id => citados.has(id))) {
          continue
        }

        const lista = ids.slice(0, 5).join(', ') + (ids.length > 5 ? `, … (+${ids.length - 5})` : '')

        findings.push(
          error(
            path,
            `The diff \`${facts.base}...HEAD\` changes \`${path}\` and no commit message cites one of the IDs ` + `declared in it (${lista}).`,
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
