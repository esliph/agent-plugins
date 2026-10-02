import type { Operation } from '../changes/delta.ts'
import { lintProject, loadProject } from './lint.ts'
import { plural } from './report.ts'

export interface ChangeSummary {
  id: string
  errors: number
  warnings: number
  /** One row per delta, named by the capability its path says. */
  deltas: { name: string; added: number; modified: number; removed: number }[]
}

// A view of the open changes: what each one does to each capability, and what
// the validator sees in it. It reports and never fails on a finding (RF-0028).
export function runStatus(root: string): ChangeSummary[] {
  const project = loadProject(root)
  const findings = lintProject(project)

  return project.changes.map(change => {
    const mine = findings.filter(finding => finding.file === change.dir || finding.file.startsWith(`${change.dir}/`))
    const errors = mine.filter(finding => finding.severity === 'error').length

    return {
      id: change.id,
      errors,
      warnings: mine.length - errors,
      deltas: change.deltas.map(delta => {
        const count = (operation: Operation): number => delta.entries.filter(entry => entry.operation === operation).length

        return { name: delta.name, added: count('ADDED'), modified: count('MODIFIED'), removed: count('REMOVED') }
      }),
    }
  })
}

export function formatStatus(summaries: readonly ChangeSummary[]): string {
  if (summaries.length === 0) {
    return 'kanon: no open change.'
  }

  return summaries
    .flatMap(({ id, errors, warnings, deltas }) => [
      `${id}  ${plural(errors, 'error', 'errors')}, ${plural(warnings, 'warning', 'warnings')}`,
      ...deltas.map(({ name, added, modified, removed }) => `  ${name}  ${added} added, ${modified} modified, ${removed} removed`),
    ])
    .join('\n')
}
