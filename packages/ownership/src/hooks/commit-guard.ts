#!/usr/bin/env node
import { resolveOwnership } from '../resolve/hierarchy.ts'
import { pendingDocs } from '../triggers/watches.ts'
import type { WatchMatch } from '../triggers/watches.ts'
import { stagedPaths } from '../core/exec.ts'
import type { GitRunner } from '../core/exec.ts'
import { askOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type CommitGuardDecision = { action: 'allow' } | { action: 'ask'; reason: string }

const ALLOW: CommitGuardDecision = { action: 'allow' }
const GIT_COMMIT = /(?:^|[;&|]\s*)git\b[^;&|]*\bcommit\b/

export function isGitCommit(command: string): boolean {
  return GIT_COMMIT.test(command.trim())
}

function describe(match: WatchMatch): string {
  const parts = [`- \`${match.doc}\``]

  if (match.owner !== null) {
    parts.push(`(dono: ${match.owner})`)
  }
  parts.push(`— exigido por: ${match.matched.join(', ')}`)
  if (match.reason !== null) {
    parts.push(`Motivo: ${match.reason}`)
  }
  if (match.skill !== null) {
    parts.push(`Skill dona: ${match.skill}.`)
  }

  return parts.join(' ')
}

export function decideCommitGuard(payload: HookPayload, env: HookEnv, run?: GitRunner): CommitGuardDecision {
  if (payload.tool_name !== undefined && payload.tool_name !== 'Bash') {
    return ALLOW
  }

  const command = payload.tool_input?.command

  if (typeof command !== 'string' || !isGitCommit(command)) {
    return ALLOW
  }

  // Os caminhos staged vêm antes da configuração: são eles que decidem o que
  // a poda deixa de ler.
  const staged = stagedPaths(env.root, run)

  if (staged.length === 0) {
    return ALLOW
  }

  let config

  try {
    config = resolveOwnership(env.root, { onlyFor: staged })
  } catch {
    return ALLOW
  }
  if (config === null) {
    return ALLOW
  }

  const pending = pendingDocs(config, staged)

  if (pending.length === 0) {
    return ALLOW
  }

  return {
    action: 'ask',
    reason:
      'ownership/commit-guard: este commit leva código de caminho vigiado sem o doc dono. ' +
      'Se a atualização não cabe neste PR, ela não acontece.\n' +
      `Pendente:\n${pending.map(describe).join('\n')}\n` +
      'Atualize o doc agora e refaça o `git add` — ou, se a mudança realmente não afeta o doc, diga que é uma decisão humana e siga.',
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()

  if (!payload) {
    return
  }
  const decision = decideCommitGuard(payload, hookEnv())

  emit(decision.action === 'ask' ? askOutput(decision.reason) : null)
}

if (process.argv[1]?.endsWith('commit-guard.ts')) {
  main().catch(() => process.exit(0))
}
