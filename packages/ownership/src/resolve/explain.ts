import { findOwnedRule } from './hierarchy.ts'
import type { ResolvedConfig } from './hierarchy.ts'

/** O arquivo de base mais profunda que contém o caminho — onde a entrada que falta deveria ser escrita. */
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
      ? `${repoPath}: nenhuma regra de ownership cobre este caminho, e nenhum arquivo de ownership tem base que o contenha.`
      : `${repoPath}: nenhuma regra de ownership cobre este caminho. A entrada caberia em ${responsible}.`
  }

  const lines = [
    `${repoPath}`,
    `  declarado em: ${rule.origin}`,
    `  regra: ${rule.path}`,
    `  owner: ${rule.owner}`,
    `  skill: ${rule.skill ?? '—'}`,
    `  states: ${rule.states ? rule.states.join(', ') : '—'}`,
    `  format: ${rule.format.collection}${rule.format.key ? ` (key: ${rule.format.key})` : ''}${rule.format.keyMode ? ` (key mode: ${rule.format.keyMode})` : ''}`,
    `  derives-from: ${rule.derivesFrom ? `${rule.derivesFrom.source} → ${rule.derivesFrom.field}` : '—'}`,
  ]

  for (const name of Object.keys(rule.pluginBlocks)) {
    lines.push(`  plugin ${name}: declarado`)
  }

  return lines.join('\n')
}
