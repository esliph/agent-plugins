import { parentPort, workerData } from 'node:worker_threads'

import { limitGitCallsUntil } from '../repo/repo.ts'
import { decideGeneratedGuard } from './generated-guard.ts'
import type { HookEnv } from './generated-guard.ts'

export interface JudgeInput {
  readonly payload: unknown
  readonly env: HookEnv
  /** When the hook's budget runs out, in milliseconds since the epoch. */
  readonly deadline: number
}

// Runs in a worker: the judgement reads the file system and runs git
// synchronously, and the main thread has to stay free to end the hook on time.
const input = workerData as JudgeInput

// The main thread ends the process at the deadline, but that would leave a git
// started from here running on its own; git gets the same deadline and is killed.
limitGitCallsUntil(input.deadline)
parentPort?.postMessage(decideGeneratedGuard(input.payload, input.env))
