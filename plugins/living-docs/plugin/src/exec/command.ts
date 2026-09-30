import { execSync } from 'node:child_process'

/**
 * Command executor for the validated repository, injectable: the test proves `ownership/generated-drift`
 * without depending on a real generator on the machine.
 *
 * Sibling of `GitRunner` (src/git/staged.ts) with one deliberate difference: this one
 * does **not** fail open. Failing open is hook policy (`RNF-0001`), where the
 * cost of silence is one question fewer; here the cost is a contract lying
 * with the authority of a check that passed. Whoever handles the error is `ownership/generated-drift`.
 */
export type CommandRunner = (command: string, cwd: string) => string

/** Ceiling for a generator. Generous: `ownership/generated-drift` runs on the PR, not inside a hook. */
export const TIMEOUT_MS = 60_000

export const runCommand: CommandRunner = (command, cwd) =>
  execSync(command, {
    cwd,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    // stderr captured, not inherited: it becomes the finding's message.
    stdio: ['ignore', 'pipe', 'pipe'],
  })
