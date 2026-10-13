import { lstatSync } from 'node:fs'
import { resolve } from 'node:path'
import { parseArgs } from 'node:util'

import { loadCodeowners } from '../codeowners/locate.ts'
import { location } from '../errors.ts'
import { normalizePath, relativeTo } from '../paths/paths.ts'
import { isInsideWorkTree, listRepoFiles } from '../repo/repo.ts'
import { explainPath } from '../resolve/explain.ts'
import type { PathExplanation } from '../resolve/explain.ts'
import { resolveOwnership } from '../resolve/resolve.ts'
import type { RuleOrigin } from '../resolve/types.ts'
import type { Io } from './main.ts'
import { USAGE, UsageError } from './usage.ts'

const LABEL_WIDTH = 11
const NONE = '—'

function row(label: string, text: string): string {
  return `${label.padEnd(LABEL_WIDTH)}${text}`
}

function at(origin: RuleOrigin): string {
  return `(${location(origin)})`
}

/** A real directory: a symbolic link is not followed, since the repository names the link itself as a file. */
function isDirectory(path: string): boolean {
  try {
    return lstatSync(path).isDirectory()
  } catch {
    return false
  }
}

/**
 * The path as the repository names it: relative to the root, with `/`, and a
 * trailing `/` when it is a directory. Git lists a submodule and a nested
 * repository as one file, though they are directories on disk, so a path the
 * repository lists as a file keeps no slash.
 */
function repositoryPath(root: string, given: string, repoFiles: ReadonlySet<string>): string {
  const absolute = resolve(root, given)
  const fromRoot = relativeTo(root, absolute)

  if (fromRoot === '') {
    throw new UsageError(`"${given}" is the repository itself; explain takes a file or a directory inside it`)
  }

  if (fromRoot === null) {
    throw new UsageError(`"${given}" is outside the repository`)
  }

  const path = normalizePath(fromRoot)

  if (repoFiles.has(path)) {
    return path
  }

  return /[\\/]$/.test(given) || isDirectory(absolute) ? `${path}/` : path
}

function codeownersText(explanation: PathExplanation): string {
  const result = explanation.codeowners

  if (result.kind === 'no-codeowners') {
    return 'the repository has no CODEOWNERS'
  }

  if (result.kind === 'unmatched') {
    return 'no line matches this path'
  }

  const assigned = `line ${result.line}: ${result.owners.length === 0 ? 'no owner' : result.owners.join(' ')}`
  const owner = explanation.owned?.owner

  if (owner === undefined) {
    return assigned
  }

  const listed = result.owners.some(candidate => candidate.toLowerCase() === owner.toLowerCase())

  return `${assigned} ${NONE} declared owner ${listed ? 'listed' : `${owner} not listed`}`
}

function coverageText(explanation: PathExplanation): string | null {
  const coverage = explanation.coverage

  switch (coverage.kind) {
    case 'covered':
      return null
    case 'ignored':
      return explanation.owned === null
        ? 'outside coverage: an ignore leaves it out'
        : `outside coverage: the ignore leaves it out of ${explanation.owned.path}`
    case 'gitignored':
      return 'not a repository file: a .gitignore excludes it, so coverage is not evaluated'
    case 'uncovered':
      return coverage.file === null
        ? 'not covered: no ownership file has a base that contains it'
        : `not covered: its entry belongs in owned[] of ${coverage.file}`
  }
}

/** The fixed blocks of an explanation, one per line, with `—` for what the path does not have. */
export function formatExplanation(explanation: PathExplanation): string {
  const lines = [row('path', explanation.path)]
  const { owned, generated, ignore } = explanation

  if (owned === null) {
    lines.push(row('owned', NONE))
  } else {
    lines.push(row('owned', `${owned.path}  owner ${owned.owner}  skill ${owned.skill ?? NONE}  ${at(owned.origin)}`))

    for (const name of Object.keys(owned.plugins).sort()) {
      lines.push(row('', `plugin ${name}: ${JSON.stringify(owned.plugins[name])}`))
    }
  }

  if (generated === null) {
    lines.push(row('generated', NONE))
  } else if (generated.source === 'declared') {
    lines.push(row('generated', `generated[]  command ${generated.rule.command}  ${at(generated.rule.origin)}`))
  } else {
    lines.push(row('generated', 'marker "generated: do not edit" on its first line; not declared in generated[]'))
  }

  lines.push(row('ignore', ignore === null ? NONE : `${ignore.path}  ${at(ignore.origin)}`))
  lines.push(row('CODEOWNERS', codeownersText(explanation)))

  const coverage = coverageText(explanation)

  if (coverage !== null) {
    lines.push(row('coverage', coverage))
  }

  return `${lines.join('\n')}\n`
}

/** Like validate, explain reads every ownership file: it never prunes. */
export function explainCommand(args: readonly string[], root: string, io: Io): number {
  const { values, positionals } = parseArgs({
    args: [...args],
    strict: true,
    allowPositionals: true,
    options: {
      ownership: { type: 'string' },
      help: { type: 'boolean', short: 'h' },
    },
  })

  if (values.help === true) {
    io.stdout(USAGE)

    return 0
  }

  const [given, ...extra] = positionals

  if (given === undefined || given === '') {
    throw new UsageError('explain needs a path: ownership explain <path>')
  }

  if (extra.length > 0) {
    throw new UsageError(`explain takes one path; got ${positionals.length}`)
  }

  const repoFiles = isInsideWorkTree(root) ? listRepoFiles(root) : new Set<string>()
  const path = repositoryPath(root, given, repoFiles)
  const config = resolveOwnership(root, { repoFiles, ...(values.ownership === undefined ? {} : { ownership: values.ownership }) })

  if (config === null) {
    io.stdout('ownership: no ownership file found; nothing to explain.\n')

    return 0
  }

  io.stdout(formatExplanation(explainPath(config, path, { repoFiles, codeowners: loadCodeowners(root) })))

  return 0
}
