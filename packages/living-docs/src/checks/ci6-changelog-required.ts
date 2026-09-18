import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'
import { OWNERSHIP_PATH } from '../config/ownership.ts'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { exceptionReasonFor } from './exception-label.ts'

const RULE = 'CI-6'

/** O que o check precisa saber sobre o diff. Quem fala com o git é o CLI. */
export interface DiffFacts {
  base: string
  changed: readonly string[]
  messages: readonly string[]
}

/**
 * O rótulo de exceção do CHANGELOG (`ADR-0006`, decisão 4). A forma é
 * compartilhada com `CI-7` desde a Fase 7 (`src/checks/exception-label.ts`).
 */
export function exceptionReason(messages: readonly string[]): string | null {
  return exceptionReasonFor('Changelog', messages)
}

/**
 * Itens sob `## [Unreleased]`, no formato Keep a Changelog. Aceita
 * `## Unreleased` sem colchetes porque as duas formas circulam, e recusar uma
 * delas seria o check ensinando estilo em vez de cobrar a entrada.
 */
export function unreleasedEntries(source: string): string[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex(line => /^##\s+\[?unreleased\]?/i.test(line.trim()))

  if (start === -1) {
    return []
  }

  const entries: string[] = []

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? ''

    if (/^##\s/.test(line)) {
      break
    }
    if (/^\s*[-*]\s+\S/.test(line)) {
      entries.push(line.trim())
    }
  }

  return entries
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

function error(file: string, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
}

/**
 * `CI-6` — changelog required. Recebe os fatos do diff por injeção, e não pelo
 * `CheckContext`: o diff é dependência deste check, não do contexto que os
 * outros compartilham — mesma escolha de `CI-5` com o executor (`ADR-0005`).
 *
 * Regra de origem: `RN-0013`.
 */
export function ci6ChangelogRequired(diff: DiffFacts): Check {
  return {
    id: RULE,
    name: 'changelog required',
    run(context: CheckContext): Finding[] {
      const globs = context.config.consumerVisiblePaths

      if (globs.length === 0) {
        return []
      }

      const changed = diff.changed.map(normalize)
      const matches = picomatch(globs)
      const hits = changed.filter(path => matches(path))

      if (hits.length === 0) {
        return []
      }

      // O toolkit não conhece o caminho `CHANGELOG.md` e não vai passar a
      // conhecer: o alvo vem da configuração (spec §3, ADR-0006 decisão 5).
      const targets = [...new Set(context.config.watches.filter(watch => watch.consumerVisible).map(watch => normalize(watch.doc)))]

      if (targets.length === 0) {
        return [
          error(
            OWNERSHIP_PATH,
            '`consumer-visible-paths` está declarado e nenhuma regra de `watches` traz `consumer-visible: true` — ' +
              'CI-6 não sabe onde a entrada deveria estar.',
            'Marque com `consumer-visible: true` a regra de `watches` cujo `doc` é o changelog do projeto ' + '(skill dona: release-historian).',
          ),
        ]
      }

      // Razão escrita no histórico libera — é a exceção da spec §5, SK-7, regra 2.
      if (exceptionReason(diff.messages) !== null) {
        return []
      }

      const gatilho = hits.slice(0, 5).join(', ') + (hits.length > 5 ? `, … (+${hits.length - 5})` : '')
      const findings: Finding[] = []

      for (const target of targets) {
        if (!changed.includes(target)) {
          findings.push(
            error(
              target,
              `O diff \`${diff.base}...HEAD\` toca caminho visível ao consumidor (${gatilho}) e ` + `\`${target}\` não está entre os caminhos alterados.`,
              `Acrescente a entrada em \`## [Unreleased]\` de \`${target}\`, voltada a quem consome — ou escreva a razão ` +
                // Regra de origem: RN-0013.
                'na mensagem de commit, no formato `Changelog: none — <razão>` (skill dona: release-historian).',
            ),
          )
          continue
        }

        let source: string

        try {
          source = readFileSync(join(context.root, target), 'utf8')
        } catch {
          findings.push(
            error(
              target,
              `\`${target}\` está declarado como doc de mudança visível ao consumidor e está ausente do repositório.`,
              `Crie \`${target}\` no formato Keep a Changelog, com \`## [Unreleased]\` no topo ` +
                '(`living-docs init --stage production` o instala; skill dona: release-historian).',
            ),
          )
          continue
        }

        if (unreleasedEntries(source).length === 0) {
          findings.push(
            error(
              target,
              `O diff toca caminho visível ao consumidor (${gatilho}) e \`## [Unreleased]\` de \`${target}\` não tem nenhum item.`,
              'Escreva a entrada sob a subseção certa (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`, `Security`). ' +
                'Se a entrada só faz sentido para quem escreveu o código, ela não pertence ao CHANGELOG — nesse caso o ' +
                // Regra de origem: RN-0013.
                'caminho é `Changelog: none — <razão>`.',
            ),
          )
        }
      }

      return findings
    },
  }
}
