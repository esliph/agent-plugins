#!/usr/bin/env node
import { resolveOwnership } from '../resolve/hierarchy.ts'
import { derivedFilesOf } from '../triggers/derives.ts'
import { toRepoPath } from './lib/paths.ts'
import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type DerivationReminderDecision = { action: 'silent' } | { action: 'remind'; context: string }

const SILENT: DerivationReminderDecision = { action: 'silent' }

export function decideDerivationReminder(payload: HookPayload, env: HookEnv): DerivationReminderDecision {
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

  const reminders: string[] = []

  for (const rule of config.owned) {
    if (rule.derivesFrom === null || !repoPath.startsWith(rule.derivesFrom.source)) {
      continue
    }

    for (const derived of derivedFilesOf(env.root, rule, repoPath)) {
      reminders.push(`- \`${derived}\` (declara \`${rule.derivesFrom.field}: ${repoPath}\`, sob \`${rule.path}\`${rule.skill === null ? '' : `, skill dona: ${rule.skill}`})`)
    }
  }

  if (reminders.length === 0) {
    return SILENT
  }

  return {
    action: 'remind',
    context:
      `ownership/derivation-reminder: \`${repoPath}\` é fonte de derivação — os documentos abaixo declaram derivar dela:\n` +
      `${reminders.join('\n')}\n` +
      'Confira se eles ainda descrevem o que a fonte diz agora. Isto é lembrete, não é bloqueio.',
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()

  if (!payload) {
    return
  }
  const decision = decideDerivationReminder(payload, hookEnv())

  emit(decision.action === 'remind' ? contextOutput('PostToolUse', decision.context) : null)
}

if (process.argv[1]?.endsWith('derivation-reminder.ts')) {
  main().catch(() => process.exit(0))
}
