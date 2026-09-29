import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import type { LivingDocsConfig } from '../../src/config/ownership.ts'

/** Where the fixtures write the ownership file: the root, as `init` seeds it. */
export const OWNERSHIP_FILE = '.ownership.yml'

/**
 * The configuration the adapter reads from this YAML v2. For a pure-function
 * test that does not need the repository: the file lives in a throwaway directory and
 * disappears before returning. Whoever needs the repository files uses
 * `withTempRepo` with `OWNERSHIP_FILE` and `loadLivingDocsConfig(root)`.
 */
export function configFrom(yaml: string): LivingDocsConfig {
  const root = mkdtempSync(join(tmpdir(), 'living-docs-config-'))

  try {
    writeFileSync(join(root, OWNERSHIP_FILE), yaml, 'utf8')

    return loadLivingDocsConfig(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}
