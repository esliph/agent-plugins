import { join, resolve } from 'node:path'
import { toolkitRoot } from '../../plugin/src/core/roots.ts'

/**
 * Root of this repository's checkout: where the root `.ownership.yml`, `CLAUDE.md`,
 * `CODEOWNERS` and `.claude-plugin/marketplace.json` live, and what the
 * dogfooding tests validate as a whole.
 *
 * It is not `toolkitRoot()`: the toolkit is the distributed directory
 * `plugins/living-docs/plugin/`, three levels below the checkout (RNF-0003).
 * And it is not `repoRoot()`: that reads the working directory, and `npm test`
 * runs with the cwd in the project.
 */
export function checkoutRoot(): string {
  return resolve(join(toolkitRoot(), '..', '..', '..'))
}

/** Root of the living-docs project: its tests, its documentation, its container and `bin/` (ADR-0036). */
export function projectRoot(): string {
  return resolve(join(toolkitRoot(), '..'))
}
