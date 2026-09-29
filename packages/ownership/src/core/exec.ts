import { execFileSync, execSync } from 'node:child_process'

export type GitRunner = (args: readonly string[], cwd: string) => string

const STAGED_TIMEOUT_MS = 3_000
const DIFF_TIMEOUT_MS = 10_000

const runGitStaged: GitRunner = (args, cwd) =>
  execFileSync('git', [...args], { cwd, encoding: 'utf8', timeout: STAGED_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'ignore'] })

const runGitDiff: GitRunner = (args, cwd) =>
  execFileSync('git', [...args], {
    cwd,
    encoding: 'utf8',
    timeout: DIFF_TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

function reasonOf(err: unknown): string {
  const stderr = (err as { stderr?: unknown }).stderr
  const text = String(stderr ?? '').trim() || (err instanceof Error ? err.message : String(err))

  return text.split('\n')[0] ?? text
}

export class GitError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'GitError'
  }
}

const NUL = String.fromCharCode(0)

/** Falha aberta: quem chama é hook, e lista vazia significa "não sei". */
export function stagedPaths(root: string, run: GitRunner = runGitStaged): string[] {
  let output: string

  try {
    output = run(['-c', 'safe.directory=*', 'diff', '--cached', '--name-only', '-z'], root)
  } catch {
    return []
  }

  return output
    .split(NUL)
    .map(path => path.trim().replace(/\\/g, '/'))
    .filter(path => path !== '')
}

function git(args: readonly string[], root: string, run: GitRunner, what: string): string {
  try {
    return run(['-c', 'safe.directory=*', ...args], root)
  } catch (err) {
    throw new GitError(`${what} failed: ${reasonOf(err)}`)
  }
}

/** Erro sobe: quem chama é check, e silêncio custa um contrato quebrado com CI verde. */
export function changedPaths(root: string, base: string, run: GitRunner = runGitDiff): string[] {
  const output = git(['diff', '--name-only', '-z', `${base}...HEAD`], root, run, `git diff ${base}...HEAD`)

  return output
    .split(NUL)
    .map(path => path.trim().replace(/\\/g, '/'))
    .filter(path => path !== '')
}

export function commitMessages(root: string, base: string, run: GitRunner = runGitDiff): string[] {
  const output = git(['log', '--format=%B%x00', `${base}..HEAD`], root, run, `git log ${base}..HEAD`)

  return output
    .split(NUL)
    .map(message => message.trim())
    .filter(message => message !== '')
}

export type CommandRunner = (command: string, cwd: string) => string

export const COMMAND_TIMEOUT_MS = 60_000

export const runCommand: CommandRunner = (command, cwd) =>
  execSync(command, { cwd, encoding: 'utf8', timeout: COMMAND_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
