import type { Finding } from '../checks/types.ts'
import type { ResolvedOwnership } from '../resolve/types.ts'

export type Format = 'text' | 'json' | 'github'

export interface PluginUsage {
  readonly name: string
  readonly entries: number
  readonly globalConfig: boolean
}

/**
 * Every plugin name in the root and in the entries. The core does not know
 * which plugins exist, so it cannot flag a misspelled name; listing every
 * name in use is what makes one visible.
 */
export function pluginSummary(config: ResolvedOwnership): PluginUsage[] {
  const names = new Set([...Object.keys(config.plugins), ...config.owned.flatMap(rule => Object.keys(rule.plugins))])

  return [...names].sort().map(name => ({
    name,
    entries: config.owned.filter(rule => Object.hasOwn(rule.plugins, name)).length,
    globalConfig: Object.hasOwn(config.plugins, name),
  }))
}

export function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`
}

function counts(findings: readonly Finding[]): { errors: number; warnings: number } {
  const errors = findings.filter(item => item.severity === 'error').length

  return { errors, warnings: findings.length - errors }
}

function pluginBlock(plugins: readonly PluginUsage[]): string[] {
  if (plugins.length === 0) {
    return []
  }

  const nameWidth = Math.max(...plugins.map(plugin => plugin.name.length))
  const countWidth = Math.max(...plugins.map(plugin => String(plugin.entries).length))

  return [
    'ownership: plugins in use:',
    ...plugins.map(plugin => {
      const count = `${String(plugin.entries).padStart(countWidth)} ${plugin.entries === 1 ? 'entry' : 'entries'}`

      return `  ${plugin.name.padEnd(nameWidth)}  ${count}${plugin.globalConfig ? '  global config' : ''}`
    }),
  ]
}

function finalLine(findings: readonly Finding[]): string {
  if (findings.length === 0) {
    return 'ownership: no violations found.'
  }

  const { errors, warnings } = counts(findings)

  return `ownership: ${plural(errors, 'error', 'errors')}, ${plural(warnings, 'warning', 'warnings')}.`
}

function textFinding(item: Finding): string {
  const where = item.line === undefined ? item.file : `${item.file}:${item.line}`
  const head = `${where}  ${item.checkId}  ${item.severity}  ${item.message}`

  return item.fix === undefined ? head : `${head}\n  → ${item.fix}`
}

function escapeData(text: string): string {
  return text.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A')
}

function escapeProperty(text: string): string {
  return escapeData(text).replace(/:/g, '%3A').replace(/,/g, '%2C')
}

function githubFinding(item: Finding): string {
  const properties = [
    `file=${escapeProperty(item.file)}`,
    ...(item.line === undefined ? [] : [`line=${item.line}`]),
    ...(item.column === undefined ? [] : [`col=${item.column}`]),
    `title=${escapeProperty(item.checkId)}`,
  ]
  const text = item.fix === undefined ? item.message : `${item.message} → ${item.fix}`

  return `::${item.severity} ${properties.join(',')}::${escapeData(text)}`
}

/** The validate report: findings, then the plugins block, then the final line. The json format is one object. */
export function formatReport(format: Format, findings: readonly Finding[], plugins: readonly PluginUsage[]): string {
  if (format === 'json') {
    return `${JSON.stringify({ findings, plugins, ...counts(findings) }, null, 2)}\n`
  }

  const lines = [...findings.map(format === 'github' ? githubFinding : textFinding), ...pluginBlock(plugins), finalLine(findings)]

  return `${lines.join('\n')}\n`
}
