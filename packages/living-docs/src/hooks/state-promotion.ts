#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): intercepta promoção de estado que exige ato humano.
 *
 * Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §4 — "nenhum agente promove
 * estado sozinho". Devolve `ask`, nunca `deny`: promover é legítimo, só não é
 * ato de agente.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { findTransitions } from '@esliph/ownership'
import { findArtifactRule, loadLivingDocsConfig } from '../config/ownership.ts'
import type { ArtifactRule } from '../config/ownership.ts'
import { parseFrontmatter } from '../frontmatter/parse.ts'
import { HUMAN_PROMOTIONS } from '../docs/schema.ts'
import { applyToolInput } from './lib/edit.ts'
import { toRepoPath } from './lib/paths.ts'
import { askOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type StatePromotionDecision = { action: 'allow' } | { action: 'ask'; reason: string }

const ALLOW: StatePromotionDecision = { action: 'allow' }

interface Promotion {
  id: string
  from: string
  to: string
}

function isHumanPromotion(from: string, to: string): boolean {
  return HUMAN_PROMOTIONS.some(promotion => promotion.from === from && promotion.to === to)
}

function statusOf(source: string): { id: string; status: string } | null {
  try {
    const frontmatter = parseFrontmatter(source)
    const id = frontmatter?.data.id
    const status = frontmatter?.data.status

    if (typeof id !== 'string' || typeof status !== 'string') {
      return null
    }

    return { id, status }
  } catch {
    return null
  }
}

/**
 * A primeira transição desta edição que exige gente. O pareamento antes/depois é
 * do núcleo (`findTransitions`); a lista de transições que exigem ato humano é
 * do living-docs, fixa, até `DA-0004` decidir como o núcleo a declara.
 */
function findPromotion(before: string, after: string, rule: ArtifactRule, repoPath: string): Promotion | null {
  for (const transition of findTransitions(before, after, rule.core, repoPath)) {
    if (!isHumanPromotion(transition.from, transition.to)) {
      continue
    }
    // Em per-file a chave do núcleo é o caminho; a mensagem nomeia o ID.
    const id = rule.collection === 'per-file' ? (statusOf(after)?.id ?? transition.key) : transition.key

    return { id, from: transition.from, to: transition.to }
  }

  return null
}

export function decideStatePromotion(payload: HookPayload, env: HookEnv): StatePromotionDecision {
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

  let config

  try {
    config = loadLivingDocsConfig(env.root)
  } catch {
    return ALLOW // falha aberta
  }
  const rule = findArtifactRule(config, repoPath)

  if (!rule) {
    return ALLOW
  }

  let current: string

  try {
    current = readFileSync(join(env.root, repoPath), 'utf8')
  } catch {
    return ALLOW // arquivo novo nasce em draft/open; nada a promover
  }

  const next = applyToolInput(current, toolInput)

  if (next === null) {
    return ALLOW
  }

  const promotion = findPromotion(current, next, rule, repoPath)

  if (!promotion) {
    return ALLOW
  }

  return {
    action: 'ask',
    reason:
      `living-docs/state-promotion: this edit promotes ${promotion.id} from \`${promotion.from}\` to \`${promotion.to}\`. ` +
      // Rule of origin: spec §4.
      'No agent promotes a state on its own: ' +
      'the most a skill writes is `draft`/`open`, and acceptance is a human act. ' +
      `Confirm the decision was really made by a person. Owning artifact: ${rule.path} (${rule.owner}); ` +
      `owning skill: ${rule.skill}.`,
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()

  if (!payload) {
    return
  }
  const decision = decideStatePromotion(payload, hookEnv())

  emit(decision.action === 'ask' ? askOutput(decision.reason) : null)
}

if (process.argv[1]?.endsWith('state-promotion.ts')) {
  main().catch(() => process.exit(0))
}
