import { join, resolve } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

/**
 * Root of this repository's checkout: where `docs/`, `CLAUDE.md`,
 * `CHANGELOG.md`, `bin/`, `.claude-plugin/marketplace.json` and the
 * `.ownership.yml` that the dogfooding tests read live.
 *
 * It is not `toolkitRoot()`: since the toolkit lives in `packages/living-docs/`,
 * the toolkit and the validated repository no longer coincide in this project (RNF-0003).
 * And it is not `repoRoot()`: that reads the working directory, and `npm test --workspaces`
 * runs with the cwd in the package. The package sits two levels below the checkout.
 */
export function checkoutRoot(): string {
  return resolve(join(toolkitRoot(), '..', '..'))
}
