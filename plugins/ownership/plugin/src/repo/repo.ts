import { execFileSync } from 'node:child_process'

const MAX_BUFFER = 1024 * 1024 * 1024

let deadline: number | null = null

/**
 * Every later git call ends by `at` (milliseconds since the epoch), or fails.
 * A process with a time budget needs this: a timer cannot fire while a
 * synchronous git call is running, so a slow or hung git would outlast it.
 */
export function limitGitCallsUntil(at: number): void {
  deadline = at
}

function git(root: string, args: readonly string[]): string {
  const timeout = deadline === null ? undefined : deadline - Date.now()

  if (timeout !== undefined && timeout <= 0) {
    throw new Error('no time left to run git')
  }

  return execFileSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    maxBuffer: MAX_BUFFER,
    stdio: ['ignore', 'pipe', 'pipe'],
    ...(timeout === undefined ? {} : { timeout, killSignal: 'SIGKILL' as const }),
  })
}

function entries(output: string): string[] {
  return output
    .split('\0')
    .filter(entry => entry !== '')
    .map(entry => (entry.endsWith('/') ? entry.slice(0, -1) : entry).normalize('NFC'))
}

export function isInsideWorkTree(root: string): boolean {
  try {
    return git(root, ['rev-parse', '--is-inside-work-tree']).trim() === 'true'
  } catch {
    return false
  }
}

/**
 * The repository files: tracked, plus untracked that no .gitignore excludes,
 * present in the work tree. Only the .gitignore files count — not
 * .git/info/exclude nor core.excludesFile — so the same commit gives the same
 * list on every machine. Git already lists a submodule, a symbolic link and an
 * untracked nested repository as one entry, so no file is stat'ed here.
 *
 * The tracked files missing from the work tree come from `diff-files`, not
 * from `ls-files --deleted`: both name the same files, but `diff-files` reads
 * the work tree in parallel, and on Windows that is a tenth of a second
 * against several for a hundred thousand files.
 */
export function listRepoFiles(root: string): ReadonlySet<string> {
  const listed = entries(git(root, ['-c', 'core.quotePath=false', 'ls-files', '-z', '--cached', '--others', '--exclude-per-directory=.gitignore']))
  const deleted = new Set(entries(git(root, ['diff-files', '-z', '--name-only', '--diff-filter=D', '--relative'])))

  return new Set([...new Set(listed.filter(entry => !deleted.has(entry)))].sort())
}
