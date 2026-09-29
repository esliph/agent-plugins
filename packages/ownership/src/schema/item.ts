import type { FormatBlock } from './types.ts'

export interface DocItem {
  key: string
  state: string
  /** 1-indexed line in the whole file. */
  line: number
  fields: Record<string, string>
}

export function normalizeFieldKey(key: string): string {
  return key.trim().replace(/:$/, '').trim().toLowerCase()
}

// Empty is structural: a dash, a placeholder or nothing. A word meaning "none"
// is a value, because which word means "none" depends on the language (RN-0038).
const EMPTY = new Set(['', '-', '—', '–', 'n/a', 'na', 'null'])

export function isEmptyValue(value: string): boolean {
  return EMPTY.has(value.trim().toLowerCase())
}

/** Each occurrence after the first of an already seen key. Does not throw: the caller decides (spec §3). */
export function findDuplicateKeys(items: readonly DocItem[]): DocItem[] {
  const seen = new Set<string>()
  const duplicates: DocItem[] = []

  for (const item of items) {
    if (seen.has(item.key)) {
      duplicates.push(item)
    }
    seen.add(item.key)
  }

  return duplicates
}

function cells(row: string): string[] {
  const trimmed = row.trim()

  if (!trimmed.startsWith('|')) {
    return []
  }

  return trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim())
}

function isSeparator(row: string): boolean {
  const parts = cells(row)

  return parts.length > 0 && parts.every(cell => /^:?-{3,}:?$/.test(cell))
}

export function parseItemsTable(source: string, startLine: number, format: Pick<FormatBlock, 'key' | 'stateField'>): DocItem[] {
  const keyName = normalizeFieldKey(format.key ?? '')
  const lines = source.replace(/\r\n/g, '\n').split('\n')

  for (let i = 0; i < lines.length; i++) {
    const header = cells(lines[i] ?? '')
    const keyColumn = header.findIndex(cell => normalizeFieldKey(cell) === keyName)

    if (keyColumn === -1) {
      continue
    }
    if (!isSeparator(lines[i + 1] ?? '')) {
      continue
    }

    const stateColumn = header.findIndex(cell => normalizeFieldKey(cell) === format.stateField)
    const items: DocItem[] = []

    for (let j = i + 2; j < lines.length; j++) {
      const row = cells(lines[j] ?? '')

      if (row.length === 0) {
        break
      }
      const key = (row[keyColumn] ?? '').trim()

      if (key === '' || isEmptyValue(key)) {
        continue
      }

      const fields: Record<string, string> = {}

      for (let c = 0; c < header.length; c++) {
        const fieldKey = normalizeFieldKey(header[c] ?? '')

        if (fieldKey !== '') {
          fields[fieldKey] = (row[c] ?? '').trim()
        }
      }

      items.push({ key, state: stateColumn === -1 ? '' : (row[stateColumn] ?? '').trim(), line: startLine + j, fields })
    }

    return items
  }

  return []
}

/** Only `##`: a subheading is the item body, not an item (see the decision at the top of the task). */
const SECTION_HEADING = /^##\s+(.*)$/
/** The first token is the key; the rest, without the optional dash, is the title. */
const FIRST_TOKEN = /^(\S+)(?:\s+(?:[—–-]\s*)?(.*))?$/
const FIELD = /^[-*]\s+\*\*([^*]+?)\*\*\s*:?\s*(.*)$/
const FENCE = /^(?:```|~~~)/

export function parseItemsSections(source: string, startLine: number, format: Pick<FormatBlock, 'keyMode' | 'stateField'>): DocItem[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const items: DocItem[] = []
  let inFence = false

  for (let i = 0; i < lines.length; i++) {
    const trimmed = (lines[i] ?? '').trim()

    if (FENCE.test(trimmed)) {
      inFence = !inFence
      continue
    }
    if (inFence) {
      continue
    }

    const heading = SECTION_HEADING.exec(trimmed)

    if (!heading?.[1]) {
      continue
    }

    const headingText = heading[1].trim()
    let key: string
    let title: string | undefined

    if (format.keyMode === 'heading') {
      key = headingText
    } else {
      const match = FIRST_TOKEN.exec(headingText)

      key = match?.[1] ?? headingText
      title = match?.[2]?.trim()
    }
    if (key === '') {
      continue
    }

    const fields: Record<string, string> = {}

    if (title) {
      fields.title = title
    }

    for (let j = i + 1; j < lines.length; j++) {
      const line = (lines[j] ?? '').trim()

      if (line === '') {
        continue
      }
      if (SECTION_HEADING.test(line) || line.startsWith('#') || FENCE.test(line)) {
        break
      }
      const field = FIELD.exec(line)

      if (!field?.[1]) {
        break
      }
      fields[normalizeFieldKey(field[1])] = (field[2] ?? '').trim()
    }

    items.push({ key, state: fields[format.stateField] ?? '', line: startLine + i, fields })
  }

  return items
}
