import { resolveOwnership } from '../resolve/hierarchy.ts'
import { explainPath } from '../resolve/explain.ts'

export function runExplain(root: string, target: string): string {
  const config = resolveOwnership(root)

  if (config === null) {
    return 'ownership: no ownership file found in this repository.'
  }

  return explainPath(config, target)
}
