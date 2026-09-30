import { repoRoot } from '../../core/roots.ts'

export interface HookEnv {
  /** Root of the validated repository (ADR-0003). */
  root: string
  /** Roots recognized in `file_path`: the container's and the host's. */
  hostRoots: readonly string[]
}

export interface HookPayload {
  tool_name?: string
  tool_input?: Record<string, unknown>
}

/**
 * Hook environment. `LIVING_DOCS_HOST_ROOT` does not change its name in ADR-0003: it
 * always meant "the path prefix on the host side", which is not ambiguous.
 */
export function hookEnv(): HookEnv {
  const root = repoRoot()
  const host = process.env.LIVING_DOCS_HOST_ROOT

  return { root, hostRoots: host ? [root, host] : [root] }
}

export async function readPayload(): Promise<HookPayload | null> {
  const chunks: Buffer[] = []

  for await (const chunk of process.stdin) {
    chunks.push(chunk as Buffer)
  }

  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))

    if (parsed === null || typeof parsed !== 'object') {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

function output(decision: 'deny' | 'ask', reason: string): string {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  })
}

export function denyOutput(reason: string): string {
  return output('deny', reason)
}

export function askOutput(reason: string): string {
  return output('ask', reason)
}

/**
 * Hook output that does **not** decide permission: it injects context and hands
 * control back. It is the form of ownership/watch-reminder (PostToolUse) and, in Phase 7, of living-docs/session-inventory (SessionStart).
 * There is deliberately no variant with `permissionDecision` here — mechanism 1
 * reminds and asks, never denies (spec §7).
 */
export function contextOutput(event: 'PostToolUse' | 'SessionStart', context: string): string {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: context },
  })
}

/** Emits the decision; `null` means "let it through silently". */
export function emit(value: string | null): void {
  if (value !== null) {
    process.stdout.write(`${value}\n`)
  }
}
