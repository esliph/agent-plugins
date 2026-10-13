import { existsSync, mkdirSync, statSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { CODEOWNERS_LOCATIONS, findCodeowners, loadCodeowners } from '../codeowners/locate.ts'
import { deriveInit, markerFiles } from '../init/derive.ts'
import type { InitMode, InitPlan } from '../init/derive.ts'
import { renderOwnershipFile } from '../init/render.ts'
import { normalizePath, relativeTo, toPosix } from '../paths/paths.ts'
import { isInsideWorkTree, listRepoFiles } from '../repo/repo.ts'
import { ROOT_CANDIDATES } from '../resolve/load.ts'
import { plural } from './format.ts'
import type { Io } from './main.ts'
import { USAGE, UsageError } from './usage.ts'

const DEFAULT_TARGET = ROOT_CANDIDATES[0]

function isDirectory(path: string): boolean {
  try {
    return statSync(path).isDirectory()
  } catch {
    return false
  }
}

/** The target as the repository names it. It lives inside the repository, and it is a file. */
function targetPath(root: string, given: string): string {
  const absolute = resolve(root, given)
  const fromRoot = relativeTo(root, absolute)

  if (fromRoot === null || fromRoot === '') {
    throw new UsageError(`--ownership "${given}" is outside the repository; the root ownership file lives inside it`)
  }

  if (/[\\/]$/.test(given) || isDirectory(absolute)) {
    throw new UsageError(`--ownership "${given}" is a directory; name the file to create`)
  }

  return normalizePath(fromRoot)
}

/** For the hint of skeleton mode only: two CODEOWNERS are for `validate` to report, not a reason to refuse a skeleton. */
function hasCodeowners(root: string): boolean {
  try {
    return findCodeowners(root) !== null
  } catch {
    return true
  }
}

function summary(target: string, plan: InitPlan, written: boolean, codeownersHint: boolean): string {
  const entries = plural(plan.entries.length, 'entry', 'entries')
  const lines = [written ? `ownership: wrote ${target} with ${entries}.` : `ownership: printed ${target} with ${entries}; nothing was written.`]

  if (plan.leftOut.length > 0) {
    lines.push(
      `ownership: left out ${plural(plan.leftOut.length, 'path', 'paths')} an ownership file cannot declare: ${plan.leftOut.map(item => item.path).join(', ')}`,
    )
  }

  lines.push(
    plan.unowned === 0
      ? 'ownership: every repository file has an owner.'
      : `ownership: ${plural(plan.unowned, 'repository file has', 'repository files have')} no owner.`,
  )

  if (plan.mode === 'skeleton' || plan.unowned > 0) {
    lines.push('ownership: declare every path in owned[]; "ownership validate" fails on purpose until every file has an owner.')
  }

  if (codeownersHint) {
    lines.push('ownership: this repository has a CODEOWNERS; "ownership init --from-codeowners" derives the entries from it.')
  }

  lines.push('ownership: next step: ownership validate')

  return `${lines.join('\n')}\n`
}

/**
 * Creates the root ownership file and never overwrites one: an owner already
 * written down is a decision, and starting over is a deletion somebody makes
 * by hand. It produces no finding, so it exits 0 or 2 and never 1.
 */
export function initCommand(args: readonly string[], root: string, io: Io): number {
  const { values } = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: false,
    options: {
      owner: { type: 'string' },
      'from-codeowners': { type: 'boolean' },
      stdout: { type: 'boolean' },
      ownership: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  })

  if (values.help === true) {
    io.stdout(USAGE)

    return 0
  }

  if (!isInsideWorkTree(root)) {
    throw new UsageError(`${toPosix(root)} is not inside a Git work tree; ownership init needs one`)
  }

  const target = targetPath(root, values.ownership ?? DEFAULT_TARGET)
  const existing = [...new Set([target, ...ROOT_CANDIDATES])].filter(candidate => existsSync(resolve(root, candidate)))

  if (existing.length > 0) {
    throw new UsageError(`${existing.join(' and ')} already ${existing.length === 1 ? 'exists' : 'exist'}; ownership init never overwrites an ownership file`)
  }

  if (values.owner !== undefined && values['from-codeowners'] === true) {
    throw new UsageError('--owner and --from-codeowners cannot be used together; pick one mode')
  }

  if (values.owner !== undefined && !values.owner.startsWith('@')) {
    throw new UsageError(`--owner must start with "@"; got "${values.owner}"`)
  }

  let mode: InitMode = { kind: 'skeleton' }

  if (values.owner !== undefined) {
    mode = { kind: 'owner', owner: values.owner }
  } else if (values['from-codeowners'] === true) {
    const codeowners = loadCodeowners(root)

    if (codeowners === null) {
      throw new UsageError(`--from-codeowners needs a CODEOWNERS, and the repository has none in ${CODEOWNERS_LOCATIONS.join(', ')}`)
    }

    mode = { kind: 'codeowners', codeowners }
  }

  // The file about to be created counts as a repository file, so it is born with an owner.
  const repoFiles = new Set([...listRepoFiles(root), target].sort())
  const plan = deriveInit(repoFiles, mode)
  const text = renderOwnershipFile(plan, markerFiles(root, repoFiles))
  const report = summary(target, plan, values.stdout !== true, mode.kind === 'skeleton' && hasCodeowners(root))

  if (values.stdout === true) {
    io.stdout(text)
    io.stderr(report)

    return 0
  }

  mkdirSync(dirname(resolve(root, target)), { recursive: true })
  writeFileSync(resolve(root, target), text, { flag: 'wx' })
  io.stdout(report)

  return 0
}
