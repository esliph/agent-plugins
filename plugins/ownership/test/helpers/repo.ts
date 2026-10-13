import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import type { TestContext } from 'node:test'

export interface RepoOptions {
  /** Run `git init` (default true). */
  git?: boolean
  /** Run `git add -A` after writing the files (default false). */
  add?: boolean
  /** Content of a root `CODEOWNERS`. */
  codeowners?: string
}

export function git(root: string, ...args: string[]): string {
  return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

export function writeFile(root: string, path: string, content: string | Buffer): void {
  const absolute = join(root, path)

  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, content)
}

/** A disposable repository holding `files`, removed when the test ends. */
export function tempRepo(t: TestContext, files: Record<string, string>, options: RepoOptions = {}): string {
  const root = realpathSync.native(mkdtempSync(join(tmpdir(), 'ownership-')))

  t.after(() => rmSync(root, { recursive: true, force: true }))

  if (options.git !== false) {
    git(root, 'init', '-q')
    git(root, 'config', 'core.autocrlf', 'false')
    git(root, 'config', 'user.email', 'test@example.com')
    git(root, 'config', 'user.name', 'Test')
  }

  const all = options.codeowners === undefined ? files : { ...files, CODEOWNERS: options.codeowners }

  for (const [path, content] of Object.entries(all)) {
    writeFile(root, path, content)
  }

  if (options.add === true) {
    git(root, 'add', '-A')
  }

  return root
}
