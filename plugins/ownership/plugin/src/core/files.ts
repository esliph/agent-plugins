import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'

export const SKIP_DIRS: ReadonlySet<string> = new Set(['.git', 'node_modules', 'dist', 'coverage', '.next', '.cache'])
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

const TREES = new Map<string, string[]>()

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

export function listFiles(root: string, globs?: readonly string[]): string[] {
  const files = treeOf(root)

  if (globs === undefined) {
    return [...files]
  }
  if (globs.length === 0) {
    return []
  }

  const matches = picomatch([...globs], { dot: true })

  return files.filter(file => matches(file))
}

export function isProbablyText(content: string): boolean {
  return content.indexOf(String.fromCharCode(0)) === -1
}

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
