import type { Check, CheckContext, Finding } from '../core/types.ts'
import type { DiffFacts } from './ci6-changelog-required.ts'
import type { FileEdit } from '../git/diff.ts'
import type { ArtifactDoc } from '../docs/collect.ts'
import { findArtifactRule } from '../config/ownership.ts'
import { canonicalId, parseId } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'
import { findCitations } from '../ids/citations.ts'

const RULE = 'CI-9'

/**
 * O diff com as linhas, e não só os caminhos. É o fato a mais que `CI-9` pede e
 * que `CI-6` e `CI-7` não precisam — por isso um tipo próprio, e não um campo
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
  const raw: unknown[] = doc.rule.collection === 'per-file' ? [doc.frontmatter?.data?.id] : doc.items.map(item => item.id)

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
 * `CI-9` — commit discipline. Duas metades, as duas lidas do diff da branch: o
 * bump em massa de `last-reviewed` (`RN-0027`, anti-requisito da spec §13) e o
 * commit que altera artefato sem citar o ID afetado (`RN-0028`, spec §11).
 *
 * Roda no grupo que já recebe o diff por injeção, pela mesma razão de `CI-6` e
 * da metade do diff de `CI-7`: sem base não há commit para ler, e inventar um
 * produziria achado sobre mudança que não é desta branch (`ADR-0010`).
 *
 * A unidade das duas metades é o **diff da branch**, não o commit: é a unidade
 * que o CI tem, e partir um bump em três commits não o torna revisão de verdade
 * (`ADR-0013`).
 */
export function ci9CommitDiscipline(facts: CommitFacts | null): Check {
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
            `O diff \`${facts.base}...HEAD\` altera o campo \`last-reviewed\` de ${bumps.length} documentos e nada ` +
              `mais no corpo de nenhum deles (limiar: ${config.lastReviewedBumpLimit}): ${lista}.`,
            'Um documento revisado de verdade muda em mais do que a data — bump em massa é o mecanismo de revisão ' +
              'sendo desligado enquanto se finge cumpri-lo. Reverta a data dos que não foram revisados, ou revise-os ' +
              // Regra de origem: RN-0027, ADR-0013.
              '(o limiar é `last-reviewed-bump-limit` no `.ownership.yml`).',
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
            `O diff \`${facts.base}...HEAD\` altera \`${path}\` e nenhuma mensagem de commit cita um dos IDs ` + `declarados nele (${lista}).`,
            'Cite o ID afetado na mensagem de commit — o formato deste projeto está em `CONTRIBUTING.md`. É a ' +
              'citação que torna o `git log` navegável por regra: sem ela o histórico responde "o que mudou" e ' +
              // Regra de origem: RN-0028.
              `nunca "por causa de qual regra" (skill dona: ${doc.rule.skill}).`,
          ),
        )
      }

      return findings
    },
  }
}
