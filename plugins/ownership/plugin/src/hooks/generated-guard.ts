#!/usr/bin/env node
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findGeneratedRule, resolveOwnership } from '../resolve/hierarchy.ts'
import { toRepoPath } from './lib/paths.ts'
import { denyOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type GeneratedGuardDecision = { action: 'allow' } | { action: 'deny'; reason: string }

const ALLOW: GeneratedGuardDecision = { action: 'allow' }
const MARKER = /generated:\s*do not edit/i
const MARKER_WINDOW = 512

export function decideGeneratedGuard(payload: HookPayload, env: HookEnv): GeneratedGuardDecision {
  const filePath = payload.tool_input?.file_path

  if (typeof filePath !== 'string') {
    return ALLOW
  }

  const repoPath = toRepoPath(filePath, env.hostRoots)

  if (repoPath === null) {
    return ALLOW
  }

  let config

  try {
    config = resolveOwnership(env.root, { onlyFor: [repoPath] })
  } catch {
    return ALLOW
  }
  if (config === null) {
    return ALLOW
  }

  const rule = findGeneratedRule(config, repoPath)

  if (rule) {
    return {
      action: 'deny',
      reason:
        `ownership/generated-guard blocked: \`${repoPath}\` is a generated artifact, declared in \`generated[]\` (${rule.origin}). ` +
        `Change the annotated source and run \`${rule.command} > ${rule.path}\`. ` +
        '`ownership validate` (ownership/generated-drift) checks for drift.',
    }
  }

  let firstLine: string

  try {
    const window = readFileSync(join(env.root, repoPath), 'utf8').slice(0, MARKER_WINDOW)

    firstLine = window.split('\n')[0] ?? ''
  } catch {
    return ALLOW
  }
  if (!MARKER.test(firstLine)) {
    return ALLOW
  }

  return {
    action: 'deny',
    reason:
      `ownership/generated-guard blocked: \`${repoPath}\` opens with the marker \`generated: do not edit\`. ` +
      'Change the source and run the generator. This file is not in `generated[]` — declare it there, with the generator command, ' +
      'so that `ownership/generated-drift` covers it too.',
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()

  if (!payload) {
    return
  }
  const decision = decideGeneratedGuard(payload, hookEnv())

  emit(decision.action === 'deny' ? denyOutput(decision.reason) : null)
}

if (process.argv[1]?.endsWith('generated-guard.ts')) {
  main().catch(() => process.exit(0))
}
