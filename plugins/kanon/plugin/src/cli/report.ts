import type { Finding } from '../core/types.ts'

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function formatFindings(findings: readonly Finding[]): string {
  if (findings.length === 0) {
    return 'kanon: no findings.'
  }

  const lines = findings.map(finding => {
    const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file

    return `${location}  ${finding.ruleId}  ${finding.severity}  ${finding.message}`
  })
  const errors = findings.filter(finding => finding.severity === 'error').length

  lines.push('')
  lines.push(`kanon: ${plural(errors, 'error', 'errors')}, ${plural(findings.length - errors, 'warning', 'warnings')}.`)

  return lines.join('\n')
}
