import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import type { CommandRunner } from '../core/exec.ts'
import type { Check, CheckContext, Finding } from './types.ts'

const RULE = 'ownership/generated-drift'

function normalize(source: string): string {
  return source.replace(/\r\n/g, '\n').replace(/\n+$/, '\n')
}

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

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

function reasonOf(err: unknown): string {
  const stderr = (err as { stderr?: unknown }).stderr
  const text = String(stderr ?? '').trim() || (err instanceof Error ? err.message : String(err))

  return text.split('\n')[0] ?? text
}

export function ownershipGeneratedDrift(exec: CommandRunner): Check {
  return {
    id: RULE,
    name: 'generated drift',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []

      for (const rule of context.config.generated) {
        let expected: string

        try {
          expected = exec(rule.command, context.root)
        } catch (err) {
          findings.push(
            error(rule.path, 0, `O gerador falhou: \`${rule.command}\` — ${reasonOf(err)}`, `Conserte o comando declarado em \`generated[].command\` (${rule.origin}).`),
          )
          continue
        }

        let actual: string

        try {
          actual = readFileSync(join(context.root, rule.path), 'utf8')
        } catch {
          findings.push(error(rule.path, 0, 'Artefato gerado declarado e ausente do repositório.', `Gere-o e versione o resultado: \`${rule.command} > ${rule.path}\`.`))
          continue
        }

        const line = firstDifferentLine(actual, expected)

        if (line !== 0) {
          findings.push(error(rule.path, line, 'O artefato gerado diverge da saída do gerador.', `Regenere: \`${rule.command} > ${rule.path}\`. Não edite o arquivo à mão.`))
        }
      }

      return findings
    },
  }
}
