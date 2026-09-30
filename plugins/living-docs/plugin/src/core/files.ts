import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'

/**
 * Directories that never contain a document or a citation written by people.
 *
 * They came from `src/ids/coverage.ts`, which was the only one walking the tree until
 * `living-docs/staleness`, `ownership/owner-coverage` and `living-docs/links` needed it too. A fourth copy of the same scan
 * is how the three diverge.
 */
export const SKIP_DIRS: ReadonlySet<string> = new Set(['.git', 'node_modules', 'dist', 'coverage', '.next', '.cache'])

/** Above this, it is data, not text — and reading costs more than it is worth. */
export const MAX_BYTES = 512 * 1024

function walk(root: string, relative: string, out: string[]): void {
  let entries: string[]

  try {
    entries = readdirSync(join(root, relative))
  } catch {
    return
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) {
      continue
    }
    const path = relative === '' ? entry : `${relative}/${entry}`
    let isDirectory: boolean

    try {
      isDirectory = statSync(join(root, path)).isDirectory()
    } catch {
      continue
    }
    if (isDirectory) {
      walk(root, path, out)
    } else {
      out.push(path)
    }
  }
}

/**
 * The raw scan, memoized per root.
 *
 * A run asks the same question many times: `living-docs/staleness` queries the tree once
 * per `open` debt, `ownership/owner-coverage` and `living-docs/links` once more each, and `living-docs/session-inventory` calls `living-docs/staleness`
 * at the start of **every** session, within the 5 seconds that `RNF-0001` gives the
 * hook. Without memory, that is one disk traversal per question.
 *
 * The cache holds the list **unfiltered**: the glob is still applied on each
 * call, because it is what tells "everything" from "nothing" — and that distinction must not
 * become a cache accident.
 *
 * The memory is per process, and the CLI and hook process runs one command and
 * dies. Whoever changes the tree and asks again within the same process calls
 * `forgetTree` — which is what `runValidate` and `decideSessionInventory` do on start, so that
 * two consecutive runs never read the tree as it was before.
 */
const TREES = new Map<string, string[]>()

/** Forgets the memoized tree: of one root, or of all. */
export function forgetTree(root?: string): void {
  if (root === undefined) {
    TREES.clear()
  } else {
    TREES.delete(root)
  }
}

function treeOf(root: string): string[] {
  const known = TREES.get(root)

  if (known !== undefined) {
    return known
  }

  const files: string[] = []

  walk(root, '', files)
  TREES.set(root, files)

  return files
}

/**
 * Files of the repository, relative to the root and always with `/`.
 *
 * Without `globs`, everything. With an empty list, nothing — the two questions differ, and
 * confusing them would make a check with empty configuration scan the whole
 * repository.
 *
 * `dot: true` is not a matter of taste: without it, `docs/**` **does not match** `docs/.ownership.yml`
 * nor `docs/decisions/adr/.gitkeep`, because picomatch's default is to ignore
 * a file that starts with a dot. The `ownership/owner-coverage` corpus starts precisely with the ownership
 * map, and a walker that hides it would make the check pass by vacuity
 * the one file it must not leave without an owner. What is really skipped is the
 * `SKIP_DIRS` list, and it is explicit.
 */
export function listFiles(root: string, globs?: readonly string[]): string[] {
  const files = treeOf(root)

  // Copy: the memoized list belongs to whoever holds it, and a caller's `.sort()` must not
  // reorder the whole process's tree.
  if (globs === undefined) {
    return [...files]
  }
  if (globs.length === 0) {
    return []
  }

  const matches = picomatch([...globs], { dot: true })

  return files.filter(file => matches(file))
}

/** A NUL byte is the cheap signal for "this is binary data, not text". */
export function isProbablyText(content: string): boolean {
  return content.indexOf(String.fromCharCode(0)) === -1
}

/**
 * The file's content, or `null` when it is too large, binary or
 * unreadable. The three reasons collapse into one because no consumer handles them
 * differently: all mean "do not read this".
 */
export function readTextFile(root: string, file: string): string | null {
  try {
    if (statSync(join(root, file)).size > MAX_BYTES) {
      return null
    }
    const content = readFileSync(join(root, file), 'utf8')

    return isProbablyText(content) ? content : null
  } catch {
    return null
  }
}
