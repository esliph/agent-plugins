#!/usr/bin/env node
import { resolve } from 'node:path'
import { runValidate } from './validate.ts'
import { runExplain } from './explain.ts'
import { formatFindings } from './report.ts'
import { GitError } from '../core/exec.ts'
import { OwnershipError } from '../schema/types.ts'

const USAGE = `ownership <command>

  validate [--base <ref>]   Runs the owner, lifecycle, trigger and generated checks
  explain <path>            Shows the resolved rule and where each property came from

validate options:
  --base <ref>   Diff base — turns on the checks that depend on the branch diff
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
        process.stderr.write('ownership: `--base` needs a ref.\n')

        return 2
      }

      const result = runValidate(root, base)

      if (!result.installed) {
        process.stdout.write('ownership: no ownership file found — nothing to validate.\n')

        return 0
      }
      process.stdout.write(`${formatFindings(result.findings)}\n`)

      return result.exitCode
    }

    if (command === 'explain') {
      const target = argv[1]

      if (target === undefined) {
        process.stderr.write('ownership: `explain` needs a path.\n')

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
    if (err instanceof GitError) {
      process.stderr.write(`ownership: ${err.message}\n` + '           the clone must contain the base (in CI: `actions/checkout` with `fetch-depth: 0`).\n')

      return 2
    }
    throw err
  }

  process.stderr.write(`ownership: unknown command "${command}".\n\n${USAGE}`)

  return 2
}

process.exitCode = main(process.argv.slice(2))
