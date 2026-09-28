#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): nega alteração de item append-only congelado.
 *
 * Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §4 — "nenhum estado terminal
 * permite edição do corpo". A allowlist de campos vem de docs/.ownership.yml.
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

export function decideHk1(payload: HookPayload, env: HookEnv): HookDecision {
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
    return ALLOW // falha aberta: sem configuração legível, não trave o trabalho
  }
  if (!rule || !rule.appendOnly) {
    return ALLOW
  }

  let current: string

  try {
    current = readFileSync(join(env.root, repoPath), 'utf8')
  } catch {
    return ALLOW // criar item novo é sempre permitido
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
  } // não dá para prever o resultado

  const mutable = rule.mutableFields.length > 0 ? rule.mutableFields : MUTABLE_FIELDS_DEFAULT
  const diff = diffDocument(current, next)
  const forbidden = diff.changedFields.filter(field => !mutable.includes(field))

  if (!diff.bodyChanged && forbidden.length === 0) {
    return ALLOW
  }

  const what = diff.bodyChanged ? 'o corpo do documento' : `o campo ${forbidden.map(field => `\`${field}\``).join(', ')}`

  return {
    action: 'deny',
    reason:
      `HK-1 bloqueou: \`${basename(repoPath)}\` está em estado congelado (\`${status}\`) e você tentou alterar ${what}. ` +
      // Regra de origem: spec §4.
      'Nenhum estado terminal permite edição do corpo; ' +
      'um item aceito que se revelou errado não é corrigido, a história das decisões é o ativo. ' +
      `Caminho válido: crie um item novo com \`supersedes: ${String(parseFrontmatter(current)?.data.id ?? '')}\` e ` +
      `marque este como \`status: superseded\` + \`superseded-by:\` (campos liberados aqui: ${mutable.join(', ')}). ` +
      `Artefato dono: ${rule.path} (${rule.owner}); skill dona: ${rule.skill}.`,
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()

  if (!payload) {
    return
  } // falha aberta
  const decision = decideHk1(payload, hookEnv())

  emit(decision.action === 'deny' ? denyOutput(decision.reason) : null)
}

if (process.argv[1]?.endsWith('hk1-append-only.ts')) {
  main().catch(() => process.exit(0)) // falha aberta, sempre
}
