import { join, resolve } from 'node:path'

/**
 * Root of the **toolkit**: where `src/`, `templates/` and the plugin (`skills/`,
 * `hooks/`, `commands/`, `agents/`, `.claude-plugin/`) live.
 *
 * Derived from the file itself — the toolkit always knows where it is and so
 * needs no configuration to find itself. `LIVING_DOCS_TOOLKIT_ROOT`
 * exists for the test that builds an artificial layout, not for normal use.
 *
 * Rule of origin: ADR-0003.
 */
export function toolkitRoot(): string {
  const override = process.env.LIVING_DOCS_TOOLKIT_ROOT

  return resolve(override ?? join(import.meta.dirname, '..', '..'))
}

/**
 * Root of the **validated repository**: where `docs/.ownership.yml` and the
 * artifacts live. Never derived from the toolkit — it is the other side of ADR-0003.
 */
export function repoRoot(): string {
  return resolve(process.env.LIVING_DOCS_REPO_ROOT ?? process.cwd())
}

/** Directory of the templates that `living-docs init` writes. Always the toolkit's. */
export function templatesDir(): string {
  return join(toolkitRoot(), 'templates')
}
