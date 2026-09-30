import { execFileSync } from 'node:child_process'
import type { GitRunner } from './staged.ts'
import { display } from '../core/display.ts'

/**
 * Ceiling for a read-only git command. Generous compared with the 3 s of `staged.ts`:
 * `ownership/consumer-change-logged` runs on the PR, not inside a hook's 5 s budget (spec §7).
 */
export const TIMEOUT_MS = 10_000

/** A git failure the caller needs to see. There is no shortcut for "I don't know". */
export class GitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitError'
  }
}

const NUL = String.fromCharCode(0)

export const runGitDiff: GitRunner = (args, cwd) =>
  execFileSync('git', [...args], {
    cwd,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    // stderr captured, not inherited: it becomes the GitError message.
    stdio: ['ignore', 'pipe', 'pipe'],
  })

/** The first useful line of the error: stderr if there is any, message if not. */
function reasonOf(err: unknown): string {
  const stderr = (err as { stderr?: unknown }).stderr
  const text = display(stderr ?? '').trim() || (err instanceof Error ? err.message : String(err))

  return text.split('\n')[0] ?? text
}

/**
 * `safe.directory=*` for the same reason as `src/git/staged.ts`: the container runs
 * with a uid different from the owner of the mounted checkout (`ADR-0003`), and without it git
 * refuses the repository.
 *
 * Unlike `staged.ts`, here **errors bubble up**. There the caller is a hook, and
 * silence costs one question fewer; here the caller is a check, and silence
 * costs a broken contract passing with the authority of a green CI
 * (`ADR-0006`, decision 3).
 */
function git(args: readonly string[], root: string, run: GitRunner, what: string): string {
  try {
    return run(['-c', 'safe.directory=*', ...args], root)
  } catch (err) {
    throw new GitError(`${what} failed: ${reasonOf(err)}`)
  }
}

/**
 * Paths this branch changed relative to the base, always with `/`.
 *
 * Three dots, not two: it starts from the merge-base, so what entered the base
 * after the branch diverged does **not** count as a change of the branch (`ADR-0006`).
 * `-z` because without it git wraps in quotes and escapes paths with accents, and an
 * escaped path matches no glob.
 */
export function changedPaths(root: string, base: string, run: GitRunner = runGitDiff): string[] {
  const output = git(['diff', '--name-only', '-z', `${base}...HEAD`], root, run, `git diff ${base}...HEAD`)

  return output
    .split(NUL)
    .map(path => path.trim().replace(/\\/g, '/'))
    .filter(path => path !== '')
}

/**
 * Full messages of the commits this branch added.
 *
 * Two dots here, on purpose: the question is "which commits belong to this
 * branch", not "what is the content difference". `%x00` separates the messages
 * because they have blank lines inside — the exception label is a
 * trailer, and a trailer lives after a blank line.
 */
export function commitMessages(root: string, base: string, run: GitRunner = runGitDiff): string[] {
  const output = git(['log', '--format=%B%x00', `${base}..HEAD`], root, run, `git log ${base}..HEAD`)

  return output
    .split(NUL)
    .map(message => message.trim())
    .filter(message => message !== '')
}

/** What a file gained and lost in this diff. Reading order, no context. */
export interface FileEdit {
  /** Path relative to the root, always with `/`. */
  path: string
  added: string[]
  removed: string[]
}

/** Only the destination header opens a section — `+++ /dev/null` (removal) does not. */
const FILE_HEADER = /^\+\+\+ b\/(.+)$/

/**
 * The diff line by line, per file (`RN-0027`).
 *
 * `--unified=0` because the question is "what changed", not "around what":
 * a context line here would only increase the text to walk through on the PR (`RNF-0005`).
 * `--no-renames` so that a rename does not become a pair of ghost files, and
 * `core.quotePath=false` for the same reason as the `-z` of `changedPaths` — a path
 * with an escaped accent matches no path.
 *
 * The `inHunk` state is not zeal: a **removed** line whose content starts with
 * `--` is written as `--- ...`, identical to a source header. Only after
 * a `@@` is a line content.
 */
export function changedLines(root: string, base: string, run: GitRunner = runGitDiff): FileEdit[] {
  const output = git(
    ['-c', 'core.quotePath=false', 'diff', '--unified=0', '--no-color', '--no-renames', `${base}...HEAD`],
    root,
    run,
    `git diff --unified=0 ${base}...HEAD`,
  )

  const edits: FileEdit[] = []
  let current: FileEdit | null = null
  let inHunk = false

  for (const line of output.split('\n')) {
    if (line.startsWith('diff --git ')) {
      current = null
      inHunk = false
      continue
    }
    if (line.startsWith('@@')) {
      inHunk = true
      continue
    }
    if (!inHunk) {
      const path = FILE_HEADER.exec(line)?.[1]

      if (path !== undefined) {
        current = { path: path.replace(/\\/g, '/'), added: [], removed: [] }
        edits.push(current)
      }
      continue
    }
    if (current === null) {
      continue
    }
    if (line.startsWith('+')) {
      current.added.push(line.slice(1))
    } else if (line.startsWith('-')) {
      current.removed.push(line.slice(1))
    }
  }

  return edits
}
