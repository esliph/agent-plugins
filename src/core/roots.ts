import { join, resolve } from 'node:path'

/**
 * Raiz do **toolkit**: onde moram `src/`, `templates/` e `plugin/`.
 *
 * Derivada do próprio arquivo — o toolkit sempre sabe onde ele mesmo está e por
 * isso não precisa de configuração para se achar. `LIVING_DOCS_TOOLKIT_ROOT`
 * existe para o teste que monta um layout artificial, não para uso normal.
 *
 * Regra de origem: ADR-0003.
 */
export function toolkitRoot(): string {
  const override = process.env.LIVING_DOCS_TOOLKIT_ROOT

  return resolve(override ?? join(import.meta.dirname, '..', '..'))
}

/**
 * Raiz do **repositório validado**: onde moram `docs/.ownership.yml` e os
 * artefatos. Nunca derivada do toolkit — é o outro lado de ADR-0003.
 */
export function repoRoot(): string {
  return resolve(process.env.LIVING_DOCS_REPO_ROOT ?? process.cwd())
}

/** Diretório dos templates que `living-docs init` escreve. Sempre do toolkit. */
export function templatesDir(): string {
  return join(toolkitRoot(), 'templates')
}
