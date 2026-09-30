import { parseFrontmatter } from '../../frontmatter/parse.ts'

/** Content the file would have after this `tool_input`, or null if it cannot be predicted. */
export function applyToolInput(current: string, toolInput: Record<string, unknown>): string | null {
  const content = toolInput.content

  if (typeof content === 'string') {
    return content
  }

  const oldString = toolInput.old_string
  const newString = toolInput.new_string

  if (typeof oldString !== 'string' || typeof newString !== 'string') {
    return null
  }
  if (!current.includes(oldString)) {
    return null
  }

  return toolInput.replace_all === true ? current.replaceAll(oldString, newString) : current.replace(oldString, newString)
}

export interface DocumentDiff {
  /** Frontmatter keys added, removed or with a different value, in alphabetical order. */
  changedFields: string[]
  bodyChanged: boolean
}

function safeParse(source: string): { data: Record<string, unknown>; body: string } {
  try {
    const frontmatter = parseFrontmatter(source)

    if (!frontmatter) {
      return { data: {}, body: source }
    }

    return { data: frontmatter.data, body: frontmatter.body }
  } catch {
    return { data: {}, body: source }
  }
}

export function diffDocument(before: string, after: string): DocumentDiff {
  const from = safeParse(before)
  const to = safeParse(after)

  const keys = new Set([...Object.keys(from.data), ...Object.keys(to.data)])
  const changedFields: string[] = []

  for (const key of keys) {
    if (JSON.stringify(from.data[key]) !== JSON.stringify(to.data[key])) {
      changedFields.push(key)
    }
  }

  return {
    changedFields: changedFields.sort(),
    bodyChanged: from.body.trimEnd() !== to.body.trimEnd(),
  }
}
