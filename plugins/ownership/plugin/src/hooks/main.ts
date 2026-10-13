import { limitGitCallsUntil } from '../repo/repo.ts'
import { decideGeneratedGuard } from './generated-guard.ts'
import { denyOutput, readStdin } from './io.ts'

const BUDGET_MS = 5000

// The process ends itself after the budget: not every machine has a `timeout`
// command for the wrapper to use. The timer alone does not keep it alive.
setTimeout(() => process.exit(0), BUDGET_MS).unref()
// The timer cannot fire during a synchronous git call, so git gets the same
// deadline; a git that outlives it fails, and a failure allows, as any defect does.
limitGitCallsUntil(Date.now() + BUDGET_MS)

try {
  if (process.argv[2] === 'generated-guard') {
    const payload: unknown = JSON.parse(await readStdin())
    const hostRoot = process.env.OWNERSHIP_HOST_ROOT
    const decision = decideGeneratedGuard(payload, { root: process.env.CLAUDE_PROJECT_DIR ?? process.cwd(), ...(hostRoot === undefined ? {} : { hostRoot }) })

    if (decision.action === 'deny') {
      process.stdout.write(`${denyOutput(decision.reason)}\n`)
    }
  }
} catch {
  // Silence: a hook never gets in the way because of a defect of its own.
}

process.exitCode = 0
