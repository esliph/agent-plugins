#!/usr/bin/env node
import { resolveOwnership } from '../resolve/hierarchy.ts'
import { coversDoc, watchesFor } from '../triggers/watches.ts'
import type { WatchMatch } from '../triggers/watches.ts'
import { toRepoPath } from './lib/paths.ts'
import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type WatchReminderDecision = { action: 'silent' } | { action: 'remind'; context: string }

const SILENT: WatchReminderDecision = { action: 'silent' }

function describe(match: WatchMatch): string {
  const parts = [`- \`${match.doc}\``]

  if (match.owner !== null) {
    parts.push(`(dono: ${match.owner})`)
  }
  if (match.reason !== null) {
    parts.push(`— ${match.reason}`)
  }
  parts.push(match.skill !== null ? `Skill dona: ${match.skill}.` : 'Sem skill declarada — o dono está no CODEOWNERS.')

  return parts.join(' ')
}

export function decideWatchReminder(payload: HookPayload, env: HookEnv): WatchReminderDecision {
  const filePath = payload.tool_input?.file_path

  if (typeof filePath !== 'string') {
    return SILENT
  }

  const repoPath = toRepoPath(filePath, env.hostRoots)

  if (repoPath === null) {
    return SILENT
  }

  let config

  try {
    config = resolveOwnership(env.root, { onlyFor: [repoPath] })
  } catch {
    return SILENT
  }
  if (config === null) {
    return SILENT
  }

  const pending = watchesFor(config, [repoPath]).filter(match => !coversDoc(match.doc, [repoPath]))

  if (pending.length === 0) {
    return SILENT
  }

  return {
    action: 'remind',
    context:
      `ownership/watch-reminder: \`${repoPath}\` é caminho vigiado em \`watches\`. ` +
      'A atualização do doc dono cabe no mesmo PR; se não couber, ela não acontece.\n' +
      `Doc dono a atualizar:\n${pending.map(describe).join('\n')}\n` +
      'Isto é lembrete, não é bloqueio: se a mudança realmente não afeta o doc, siga em frente.',
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()

  if (!payload) {
    return
  }
  const decision = decideWatchReminder(payload, hookEnv())

  emit(decision.action === 'remind' ? contextOutput('PostToolUse', decision.context) : null)
}

if (process.argv[1]?.endsWith('watch-reminder.ts')) {
  main().catch(() => process.exit(0))
}
