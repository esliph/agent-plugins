import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname } from 'node:path'

/** Creates a disposable repository with the given files and removes it at the end. */
export function withTempRepo(files: Record<string, string>, fn: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'living-docs-'))

  try {
    for (const [relative, content] of Object.entries(files)) {
      const absolute = join(root, relative)

      mkdirSync(dirname(absolute), { recursive: true })
      writeFileSync(absolute, content, 'utf8')
    }
    fn(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}
