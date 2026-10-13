import assert from 'node:assert/strict'

import { createCheckContext } from '../../plugin/src/checks/run.ts'
import type { Check, Finding } from '../../plugin/src/checks/types.ts'
import { listRepoFiles } from '../../plugin/src/repo/repo.ts'
import { resolveOwnership } from '../../plugin/src/resolve/resolve.ts'

/** Resolves the repository at `root` as the CLI does and runs one check over it. */
export async function runCheck(check: Check, root: string, jobs = 2): Promise<Finding[]> {
  const repoFiles = listRepoFiles(root)
  const config = resolveOwnership(root, { repoFiles })

  assert.ok(config !== null, 'the repository has no ownership file')

  return check.run(createCheckContext(config, repoFiles, jobs))
}
