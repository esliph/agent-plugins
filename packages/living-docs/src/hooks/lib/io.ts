import { repoRoot } from '../../core/roots.ts'

export interface HookEnv {
  /** Raiz do repositório validado (ADR-0003). */
  root: string
  /** Raízes reconhecidas em `file_path`: a do container e a do host. */
  hostRoots: readonly string[]
}

export interface HookPayload {
  tool_name?: string
  tool_input?: Record<string, unknown>
}

/**
 * Ambiente do hook. `LIVING_DOCS_HOST_ROOT` não muda de nome em ADR-0003: ela
 * sempre significou "o prefixo de caminho do lado do host", que não é ambíguo.
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
 * Saída de hook que **não** decide permissão: injeta contexto e devolve o
 * controle. É a forma de HK-4 (PostToolUse) e, na Fase 7, de HK-6 (SessionStart).
 * Não existe variante com `permissionDecision` aqui de propósito — o mecanismo 1
 * lembra e pergunta, nunca nega (spec §7).
 */
export function contextOutput(event: 'PostToolUse' | 'SessionStart', context: string): string {
  return JSON.stringify({
    hookSpecificOutput: { hookEventName: event, additionalContext: context },
  })
}

/** Emite a decisão; `null` significa "deixe passar em silêncio". */
export function emit(value: string | null): void {
  if (value !== null) {
    process.stdout.write(`${value}\n`)
  }
}
