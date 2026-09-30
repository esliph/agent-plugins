import type { CommandRunner } from '../core/exec.ts'
import { runCommand } from '../core/exec.ts'
import type { Check } from './types.ts'
import { ownershipGeneratedDrift } from './generated-drift.ts'
import { ownershipDeclaredState } from './declared-state.ts'
import { ownershipOwnerCoverage } from './owner-coverage.ts'
import { ownershipDerivationResolves } from './derivation-resolves.ts'
import { ownershipWatchSatisfied } from './watch-satisfied.ts'
import type { DiffFacts } from './watch-satisfied.ts'
import { ownershipConsumerChangeLogged } from './consumer-change-logged.ts'

export type { DiffFacts }

/** Checks that do not need the branch diff — they run whenever `ownership validate` runs. */
export function coreChecks(exec: CommandRunner = runCommand): readonly Check[] {
  return [ownershipDeclaredState(), ownershipGeneratedDrift(exec), ownershipOwnerCoverage(), ownershipDerivationResolves()]
}

/** Checks that need the diff — they only run with `ownership validate --base <ref>`. */
export function diffChecks(diff: DiffFacts): readonly Check[] {
  return [ownershipWatchSatisfied(diff), ownershipConsumerChangeLogged(diff)]
}
