#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): denies changes to a frozen append-only item.
 *
 * Rule of origin: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §4 — "no terminal state
 * allows editing the body". The field allowlist comes from docs/.ownership.yml.
 */
import { readFileSync } from 'node:fs'
import { basename, join } from 'node:path'
import { findArtifactRule, loadLivingDocsConfig } from '../config/ownership.ts'
import { parseFrontmatter } from '../frontmatter/parse.ts'
import { FROZEN_STATUSES, MUTABLE_FIELDS_DEFAULT } from '../docs/schema.ts'
import { applyToolInput, diffDocument } from './lib/edit.ts'
import { toRepoPath } from './lib/paths.ts'
import { denyOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type HookDecision = { action: 'allow' } | { action: 'deny'; reason: string }

const ALLOW: HookDecision = { action: 'allow' }

export function decideAppendOnly(payload: HookPayload, env: HookEnv): HookDecision {
  const toolInput = payload.tool_input

  if (!toolInput) {
    return ALLOW
  }

  const filePath = toolInput.file_path

  if (typeof filePath !== 'string') {
    return ALLOW
  }

  const repoPath = toRepoPath(filePath, env.hostRoots)

  if (repoPath === null) {
    return ALLOW
  }

  let rule

  try {
    rule = findArtifactRule(loadLivingDocsConfig(env.root), repoPath)
  } catch {
    return ALLOW // fails open: without readable configuration, do not block the work
  }
  if (!rule || !rule.appendOnly) {
    return ALLOW
  }

  let current: string

  try {
    current = readFileSync(join(env.root, repoPath), 'utf8')
  } catch {
    return ALLOW // creating a new item is always allowed
  }

  let status: unknown

  try {
    status = parseFrontmatter(current)?.data.status
  } catch {
    return ALLOW
  }
  if (typeof status !== 'string' || !FROZEN_STATUSES.has(status)) {
    return ALLOW
  }

  const next = applyToolInput(current, toolInput)

  if (next === null) {
    return ALLOW
  } // the result cannot be predicted

  const mutable = rule.mutableFields.length > 0 ? rule.mutableFields : MUTABLE_FIELDS_DEFAULT
  const diff = diffDocument(current, next)
  const forbidden = diff.changedFields.filter(field => !mutable.includes(field))

  if (!diff.bodyChanged && forbidden.length === 0) {
    return ALLOW
  }

  const what = diff.bodyChanged ? 'the body of the document' : `the field ${forbidden.map(field => `\`${field}\``).join(', ')}`

  return {
    action: 'deny',
    reason:
      `living-docs/append-only blocked: \`${basename(repoPath)}\` is in a frozen state (\`${status}\`) and you tried to change ${what}. ` +
      // Rule of origin: spec §4.
      'No terminal state allows editing the body; ' +
      'an accepted item that turned out wrong is not corrected, the history of decisions is the asset. ' +
      `Valid path: create a new item with \`supersedes: ${String(parseFrontmatter(current)?.data.id ?? '')}\` and ` +
      `mark this one \`status: superseded\` + \`superseded-by:\` (fields allowed here: ${mutable.join(', ')}). ` +
      `Owning artifact: ${rule.path} (${rule.owner}); owning skill: ${rule.skill}.`,
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()

  if (!payload) {
    return
  } // fails open
  const decision = decideAppendOnly(payload, hookEnv())

  emit(decision.action === 'deny' ? denyOutput(decision.reason) : null)
}

if (process.argv[1]?.endsWith('append-only.ts')) {
  main().catch(() => process.exit(0)) // fails open, always
}
