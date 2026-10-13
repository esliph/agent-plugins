import { Worker } from 'node:worker_threads'

import type { Decision } from './generated-guard.ts'
import { denyOutput, readStdin } from './io.ts'
import type { JudgeInput } from './judge.ts'

const BUDGET_MS = 5000
const deadline = Date.now() + BUDGET_MS

// The process ends itself after the budget: not every machine has a `timeout`
// command for the wrapper to use. The judgement runs in a worker, because a
// timer cannot fire while this thread is blocked by synchronous file system or
// git work; this thread only waits, so the timer always fires on time. The
// timer alone does not keep the process alive.
setTimeout(() => process.exit(0), BUDGET_MS).unref()

/** The decision of the worker, or allow when it fails in any way. */
function judge(input: JudgeInput): Promise<Decision> {
  return new Promise(resolve => {
    // The judge sits beside this file, as TypeScript in the plugin or compiled in a package.
    const judgeUrl = new URL(import.meta.url.endsWith('.ts') ? './judge.ts' : './judge.js', import.meta.url)
    const worker = new Worker(judgeUrl, { workerData: input, stdout: true, stderr: true })

    worker.once('message', (decision: Decision) => resolve(decision))
    worker.once('error', () => resolve({ action: 'allow' }))
    worker.once('exit', () => resolve({ action: 'allow' }))
  })
}

try {
  if (process.argv[2] === 'generated-guard') {
    const payload: unknown = JSON.parse(await readStdin())
    const hostRoot = process.env.OWNERSHIP_HOST_ROOT
    const env = { root: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), ...(hostRoot === undefined ? {} : { hostRoot }) }
    const decision = await judge({ payload, env, deadline })

    if (decision.action === 'deny') {
      process.stdout.write(`${denyOutput(decision.reason)}\n`)
    }
  }
} catch {
  // Silence: a hook never gets in the way because of a defect of its own.
}

process.exitCode = 0
