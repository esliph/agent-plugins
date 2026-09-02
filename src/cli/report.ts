import type { Finding } from '../core/types.ts'

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`
}

export function formatFindings(findings: readonly Finding[]): string {
  if (findings.length === 0) {
    return 'living-docs: nenhuma violação encontrada.'
  }

  const lines: string[] = []

  for (const finding of findings) {
    const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file

    lines.push(`${location}  ${finding.ruleId}  ${finding.severity}  ${finding.message}`)
    lines.push(`  → ${finding.fix}`)
  }

  const errors = findings.filter(finding => finding.severity === 'error').length
  const warnings = findings.length - errors

  lines.push('')
  lines.push(`living-docs: ${plural(errors, 'erro', 'erros')}, ${plural(warnings, 'aviso', 'avisos')}.`)

  return lines.join('\n')
}
