import { findOwnedRule } from './hierarchy.ts'
import type { ResolvedConfig } from './hierarchy.ts'

/** The file with the deepest base that contains the path — where the missing entry should be written. */
function fileResponsibleFor(config: ResolvedConfig, repoPath: string): string | null {
  let best: { file: string; base: string } | null = null

  for (const candidate of config.files) {
    const covers = candidate.base === '' || repoPath.startsWith(`${candidate.base}/`)

    if (covers && (best === null || candidate.base.length > best.base.length)) {
      best = candidate
    }
  }

  return best === null ? null : best.file
}

export function explainPath(config: ResolvedConfig, repoPath: string): string {
  const rule = findOwnedRule(config, repoPath)

  if (rule === null) {
    const responsible = fileResponsibleFor(config, repoPath)

    return responsible === null
      ? `${repoPath}: no ownership rule covers this path, and no ownership file has a base that contains it.`
      : `${repoPath}: no ownership rule covers this path. The entry would belong in ${responsible}.`
  }

  const lines = [
    `${repoPath}`,
    `  declared in: ${rule.origin}`,
    `  rule: ${rule.path}`,
    `  owner: ${rule.owner}`,
    `  skill: ${rule.skill ?? '—'}`,
    `  states: ${rule.states ? rule.states.join(', ') : '—'}`,
    `  format: ${rule.format.collection}${rule.format.key ? ` (key: ${rule.format.key})` : ''}${rule.format.keyMode ? ` (key mode: ${rule.format.keyMode})` : ''}`,
    `  derives-from: ${rule.derivesFrom ? `${rule.derivesFrom.source} → ${rule.derivesFrom.field}` : '—'}`,
  ]

  for (const name of Object.keys(rule.pluginBlocks)) {
    lines.push(`  plugin ${name}: declared`)
  }

  return lines.join('\n')
}
