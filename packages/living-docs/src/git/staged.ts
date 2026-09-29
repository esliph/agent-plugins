import { execFileSync } from 'node:child_process'

/** Git executor, injectable: the test does not need a repository to prove the rest. */
export type GitRunner = (args: readonly string[], cwd: string) => string

/** Local ceiling; the whole hook's budget is 5 s (spec §7). */
const TIMEOUT_MS = 3_000

const runGit: GitRunner = (args, cwd) =>
  execFileSync('git', [...args], {
    cwd,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    stdio: ['ignore', 'pipe', 'ignore'],
  })

/**
 * Paths in the index, relative to the repository root and always with `/`.
 *
 * `-z` because git wraps in quotes and escapes paths with accents or spaces, and an
 * escaped path matches no glob. `safe.directory=*` because the hook runs
 * in the container with a uid different from the owner of the mounted checkout (`ADR-0003`), and without
 * it git refuses the repository.
 *
 * Fails open (`RNF-0001`): no error bubbles up from here. An empty list means "I don't
 * know", and whoever calls treats "I don't know" as "let it through".
 */
export function stagedPaths(root: string, run: GitRunner = runGit): string[] {
  let output: string

  try {
    output = run(['-c', 'safe.directory=*', 'diff', '--cached', '--name-only', '-z'], root)
  } catch {
    return []
  }

  return output
    .split(String.fromCharCode(0))
    .map(path => path.trim().replace(/\\/g, '/'))
    .filter(path => path !== '')
}
