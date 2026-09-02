import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import type { CommandRunner } from '../exec/command.ts'

const RULE = 'CI-5'

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

/**
 * `\r\n` vira `\n` porque o CR vem do checkout, não do gerador; as quebras
 * finais são aparadas porque um `\n` a mais é redirecionamento de shell.
 * Qualquer outra diferença é deriva de contrato (ADR-0005).
 */
function normalize(source: string): string {
  return source.replace(/\r\n/g, '\n').replace(/\n+$/, '\n')
}

/** Primeira linha 1-indexed em que os dois textos divergem; 0 se não divergem. */
export function firstDifferentLine(actual: string, expected: string): number {
  const a = normalize(actual).split('\n')
  const b = normalize(expected).split('\n')
  const limit = Math.max(a.length, b.length)

  for (let i = 0; i < limit; i++) {
    if (a[i] !== b[i]) {
      return i + 1
    }
  }

  return 0
}

/** A primeira linha útil do erro do gerador: stderr se houver, mensagem se não. */
function reasonOf(err: unknown): string {
  const stderr = (err as { stderr?: unknown }).stderr
  const text = String(stderr ?? '').trim() || (err instanceof Error ? err.message : String(err))

  return text.split('\n')[0] ?? text
}

/**
 * `CI-5` — contract drift. Recebe o executor por injeção, e não pelo
 * `CheckContext`: o comando é dependência deste check, não do contexto que os
 * outros três compartilham (ADR-0005).
 */
export function ci5ContractDrift(exec: CommandRunner): Check {
  return {
    id: RULE,
    name: 'contract drift',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []

      for (const rule of context.config.generated) {
        let expected: string

        try {
          expected = exec(rule.command, context.root)
        } catch (err) {
          findings.push(
            error(
              rule.path,
              0,
              `O gerador falhou: \`${rule.command}\` — ${reasonOf(err)}`,
              'Um gerador que não roda deixa o contrato sem fonte. Conserte o comando declarado em ' +
                '`generated[].command` no docs/.ownership.yml (skill dona: contract-keeper).',
            ),
          )
          continue
        }

        let actual: string

        try {
          actual = readFileSync(join(context.root, rule.path), 'utf8')
        } catch {
          findings.push(
            error(
              rule.path,
              0,
              'Artefato gerado declarado em `generated[]` e ausente do repositório.',
              `Gere-o e versione o resultado: \`${rule.command} > ${rule.path}\` (spec §3).`,
            ),
          )
          continue
        }

        const line = firstDifferentLine(actual, expected)

        if (line !== 0) {
          findings.push(
            error(
              rule.path,
              line,
              'O artefato gerado diverge da saída do gerador — o contrato em disco não é o que a fonte produz.',
              `Regenere: \`${rule.command} > ${rule.path}\`. Nunca edite o arquivo à mão ` + '(`HK-2` bloqueia; regra de origem: spec §5, SK-5, regra 1).',
            ),
          )
        }
      }

      return findings
    },
  }
}
