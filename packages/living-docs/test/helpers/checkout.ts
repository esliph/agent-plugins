import { join, resolve } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

/**
 * Raiz do checkout deste repositório: onde moram `docs/`, `CLAUDE.md`,
 * `CHANGELOG.md`, `bin/`, `.claude-plugin/marketplace.json` e o
 * `docs/.ownership.yml` que os testes de dogfooding leem.
 *
 * Não é `toolkitRoot()`: desde que o toolkit mora em `packages/living-docs/`,
 * toolkit e repositório validado deixaram de coincidir neste projeto (RNF-0003).
 * E não é `repoRoot()`: ele lê o diretório de trabalho, e `npm test --workspaces`
 * roda com o cwd no pacote. O pacote fica dois níveis abaixo do checkout.
 */
export function checkoutRoot(): string {
  return resolve(join(toolkitRoot(), '..', '..'))
}
