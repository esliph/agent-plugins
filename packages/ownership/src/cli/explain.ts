import { resolveOwnership } from '../resolve/hierarchy.ts'
import { explainPath } from '../resolve/explain.ts'

export function runExplain(root: string, target: string): string {
  const config = resolveOwnership(root)

  if (config === null) {
    return 'ownership: nenhum arquivo de ownership encontrado neste repositório.'
  }

  return explainPath(config, target)
}
