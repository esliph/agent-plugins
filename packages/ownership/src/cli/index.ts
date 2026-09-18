#!/usr/bin/env node
import { resolve } from 'node:path'
import { runValidate } from './validate.ts'
import { runExplain } from './explain.ts'
import { formatFindings } from './report.ts'
import { OwnershipError } from '../schema/types.ts'

const USAGE = `ownership <comando>

  validate [--base <ref>]   Roda os checks de dono, ciclo de vida, gatilho e gerado
  explain <caminho>         Mostra a regra resolvida e de onde veio cada propriedade

Opções de validate:
  --base <ref>   Base do diff — liga os checks que dependem do diff da branch
`

function repoRoot(): string {
  return resolve(process.env.OWNERSHIP_REPO_ROOT ?? process.cwd())
}

function main(argv: readonly string[]): number {
  const root = repoRoot()
  const command = argv[0]

  if (command === undefined || command === '--help' || command === '-h') {
    process.stdout.write(USAGE)

    return command === undefined ? 2 : 0
  }

  try {
    if (command === 'validate') {
      const baseIndex = argv.indexOf('--base')
      const base = baseIndex === -1 ? null : (argv[baseIndex + 1] ?? '')

      if (baseIndex !== -1 && base === '') {
        process.stderr.write('ownership: `--base` precisa de uma ref.\n')

        return 2
      }

      const result = runValidate(root, base)

      if (!result.installed) {
        process.stdout.write('ownership: nenhum arquivo de ownership encontrado — nada a validar.\n')

        return 0
      }
      process.stdout.write(`${formatFindings(result.findings)}\n`)

      return result.exitCode
    }

    if (command === 'explain') {
      const target = argv[1]

      if (target === undefined) {
        process.stderr.write('ownership: `explain` precisa de um caminho.\n')

        return 2
      }
      process.stdout.write(`${runExplain(root, target)}\n`)

      return 0
    }
  } catch (err) {
    if (err instanceof OwnershipError) {
      process.stderr.write(`ownership: ${err.message}\n`)

      return 2
    }
    throw err
  }

  process.stderr.write(`ownership: comando desconhecido "${command}".\n\n${USAGE}`)

  return 2
}

process.exitCode = main(process.argv.slice(2))
