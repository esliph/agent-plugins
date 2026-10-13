import { availableParallelism } from 'node:os'
import { parseArgs } from 'node:util'

import { coreChecks } from '../checks/core.ts'
import { createCheckContext, runChecks } from '../checks/run.ts'
import type { Check } from '../checks/types.ts'
import { isInsideWorkTree, listRepoFiles } from '../repo/repo.ts'
import { resolveOwnership } from '../resolve/resolve.ts'
import { formatReport, pluginSummary } from './format.ts'
import type { Format } from './format.ts'
import type { Io } from './main.ts'
import { USAGE, UsageError } from './usage.ts'

const FORMATS: readonly Format[] = ['text', 'json', 'github']

function parseFormat(value: string | undefined): Format {
  if (value === undefined) {
    return 'text'
  }

  const format = FORMATS.find(candidate => candidate === value)

  if (format === undefined) {
    throw new UsageError(`--format must be text, json or github; got "${value}"`)
  }

  return format
}

function parseJobs(value: string | undefined): number {
  if (value === undefined) {
    return availableParallelism()
  }

  if (!/^[1-9]\d*$/.test(value)) {
    throw new UsageError(`--jobs must be a positive integer; got "${value}"`)
  }

  return Number(value)
}

function selectChecks(ids: readonly string[] | undefined): readonly Check[] {
  if (ids === undefined) {
    return coreChecks
  }

  for (const id of ids) {
    if (!coreChecks.some(check => check.id === id)) {
      throw new UsageError(`unknown check "${id}"; the checks are ${coreChecks.map(check => check.id).join(', ')}`)
    }
  }

  return coreChecks.filter(check => ids.includes(check.id))
}

/** `--check` narrows which checks run, never the scope: every run covers the whole repository. */
export async function validateCommand(args: readonly string[], root: string, io: Io): Promise<number> {
  const { values } = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: false,
    options: {
      check: { type: 'string', multiple: true },
      format: { type: 'string' },
      jobs: { type: 'string' },
      ownership: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  })

  if (values.help === true) {
    io.stdout(USAGE)

    return 0
  }

  const format = parseFormat(values.format)
  const jobs = parseJobs(values.jobs)
  const checks = selectChecks(values.check)
  const repoFiles = isInsideWorkTree(root) ? listRepoFiles(root) : new Set<string>()
  const config = resolveOwnership(root, { repoFiles, ...(values.ownership === undefined ? {} : { ownership: values.ownership }) })

  if (config === null) {
    io.stdout(format === 'json' ? formatReport('json', [], []) : 'ownership: no ownership file found; nothing to validate.\n')

    return 0
  }

  const findings = await runChecks(checks, createCheckContext(config, repoFiles, jobs))

  io.stdout(formatReport(format, findings, pluginSummary(config)))

  return findings.some(item => item.severity === 'error') ? 1 : 0
}
