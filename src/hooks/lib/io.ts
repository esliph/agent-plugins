export interface HookEnv {
  /** Raiz do repositório dentro do container. */
  root: string;
  /** Raízes reconhecidas em `file_path`: a do container e a do host. */
  hostRoots: readonly string[];
}

export interface HookPayload {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

export function hookEnv(): HookEnv {
  const root = process.env.LIVING_DOCS_ROOT ?? '/app';
  const host = process.env.LIVING_DOCS_HOST_ROOT;
  return { root, hostRoots: host ? [root, host] : [root] };
}

export async function readPayload(): Promise<HookPayload | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);

  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (parsed === null || typeof parsed !== 'object') return null;
    return parsed as HookPayload;
  } catch {
    return null;
  }
}

function output(decision: 'deny' | 'ask', reason: string): string {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  });
}

export function denyOutput(reason: string): string {
  return output('deny', reason);
}

export function askOutput(reason: string): string {
  return output('ask', reason);
}

/** Emite a decisão; `null` significa "deixe passar em silêncio". */
export function emit(value: string | null): void {
  if (value !== null) process.stdout.write(`${value}\n`);
}
