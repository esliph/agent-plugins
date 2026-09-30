#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): intercepts a state promotion that requires a human act.
 *
 * Rule of origin: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §4 — "no agent promotes
 * state on its own". Returns `ask`, never `deny`: promoting is legitimate, it is just not
 * an agent's act.
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
 * The first transition in this edit that requires a person. The before/after pairing belongs
 * to the core (`findTransitions`); the list of transitions that require a human act belongs
 * to living-docs, fixed, until `DA-0004` decides how the core declares it.
 */
function findPromotion(before: string, after: string, rule: ArtifactRule, repoPath: string): Promotion | null {
  for (const transition of findTransitions(before, after, rule.core, repoPath)) {
    if (!isHumanPromotion(transition.from, transition.to)) {
      continue
    }
    // In per-file the core's key is the path; the message names the ID.
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
    return ALLOW // fails open
  }
  const rule = findArtifactRule(config, repoPath)

  if (!rule) {
    return ALLOW
  }

  let current: string

  try {
    current = readFileSync(join(env.root, repoPath), 'utf8')
  } catch {
    return ALLOW // new file is born in draft/open; nothing to promote
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
