#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): asks when the edit touches a path that an
 * open decision has claimed.
 *
 * Rule of origin: `RN-0026`, and acceptance criterion 4 of spec §12 —
 * behavior without a written rule becomes an open decision **and the implementation does not
 * happen**. Returns `ask`, never denies: denying would require judging whether that
 * edit is the implementation of the missing rule or something else entirely on the same
 * path, and a hook that judges is in the wrong place (spec §1, corollary 1).
 */
import { loadLivingDocsConfig } from '../config/ownership.ts'
import { collectArtifacts } from '../docs/collect.ts'
import { blockedClaims, claimsFor } from '../docs/blocked.ts'
import { toRepoPath } from './lib/paths.ts'
import { askOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type OpenDecisionGuardDecision = { action: 'allow' } | { action: 'ask'; reason: string }

const ALLOW: OpenDecisionGuardDecision = { action: 'allow' }

export function decideOpenDecisionGuard(payload: HookPayload, env: HookEnv): OpenDecisionGuardDecision {
  const filePath = payload.tool_input?.file_path

  if (typeof filePath !== 'string') {
    return ALLOW
  }

  const repoPath = toRepoPath(filePath, env.hostRoots)

  if (repoPath === null) {
    return ALLOW
  }

  let hits

  try {
    const config = loadLivingDocsConfig(env.root)

    hits = claimsFor(blockedClaims(collectArtifacts(env.root, config)), [repoPath])
  } catch {
    return ALLOW // fails open (`RNF-0001`)
  }

  const hit = hits[0]

  if (hit === undefined) {
    return ALLOW
  }

  const { claim } = hit

  return {
    action: 'ask',
    reason:
      `living-docs/open-decision-guard: \`${repoPath}\` is claimed by ${claim.id}, an **open** decision in ${claim.doc}` +
      `${claim.gap === null ? '' : ` — "${claim.gap}"`}. ` +
      `It blocks: ${claim.paths.join(', ')}. ` +
      // Rule of origin: RN-0026 and acceptance criterion 4 of spec §12.
      'Behavior with no written rule becomes ' +
      'an open decision, and the implementation does not happen while it is open. ' +
      `Resolve the decision first (owning skill: ${claim.skill}; owner: ${claim.owner}), or confirm that this edit ` +
      'is not the implementation of the missing rule.',
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()

  if (!payload) {
    return
  }
  const decision = decideOpenDecisionGuard(payload, hookEnv())

  emit(decision.action === 'ask' ? askOutput(decision.reason) : null)
}

if (process.argv[1]?.endsWith('open-decision-guard.ts')) {
  main().catch(() => process.exit(0))
}
