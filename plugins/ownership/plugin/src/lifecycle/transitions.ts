import { parseFrontmatter } from '../core/frontmatter.ts'
import { parseItemsSections, parseItemsTable } from '../schema/item.ts'
import type { ResolvedOwnedRule } from '../resolve/hierarchy.ts'

export interface Transition {
  key: string
  from: string
  to: string
}

function frontmatterState(source: string, field: string): string | null {
  let frontmatter

  try {
    frontmatter = parseFrontmatter(source)
  } catch {
    return null
  }
  const value = frontmatter?.data[field]

  return typeof value === 'string' && value !== '' ? value : null
}

/**
 * Every state change of an item that exists before and after, paired by
 * key. It does not decide whether the change requires a human: that is not this module's job.
 */
export function findTransitions(before: string, after: string, rule: ResolvedOwnedRule, repoPath: string): Transition[] {
  const { format } = rule

  if (format.collection === 'per-file') {
    const from = frontmatterState(before, format.stateField)
    const to = frontmatterState(after, format.stateField)

    return from !== null && to !== null && from !== to ? [{ key: repoPath, from, to }] : []
  }

  const parse = (source: string) =>
    format.collection === 'table'
      ? parseItemsTable(source, 1, { key: format.key!, stateField: format.stateField })
      : parseItemsSections(source, 1, { keyMode: format.keyMode!, stateField: format.stateField })

  const previous = new Map(parse(before).map(item => [item.key, item.state]))
  const transitions: Transition[] = []

  for (const item of parse(after)) {
    const from = previous.get(item.key)

    if (from !== undefined && from !== '' && item.state !== '' && from !== item.state) {
      transitions.push({ key: item.key, from, to: item.state })
    }
  }

  return transitions
}
