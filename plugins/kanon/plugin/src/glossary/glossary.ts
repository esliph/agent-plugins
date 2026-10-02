import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { KanonError } from '../core/types.ts'

export interface Term {
  term: string
  banned: boolean
  line: number
}

export interface Glossary {
  file: string
  terms: Term[]
}

function cells(row: string): string[] {
  return row
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map(cell => cell.trim())
}

function plain(cell: string): string {
  return cell.replace(/[`*]/g, '').trim()
}

// The glossary is a Markdown table with a `Term` column; a row whose `Status`
// says `banned` is a banned term, and every other column is opaque (RN-0051).
// That is what lets a project point kanon at a glossary another tool keeps.
export function parseGlossary(source: string): Term[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const terms: Term[] = []

  for (let index = 0; index < lines.length; index++) {
    const header = (lines[index] ?? '').trim()

    if (!header.startsWith('|')) {
      continue
    }

    const columns = cells(header).map(column => plain(column).toLowerCase())
    const termColumn = columns.indexOf('term')
    const statusColumn = columns.indexOf('status')

    if (termColumn === -1) {
      continue
    }

    // index + 1 is the separator row.
    for (let row = index + 2; row < lines.length && (lines[row] ?? '').trim().startsWith('|'); row++) {
      const values = cells(lines[row] ?? '')
      const term = plain(values[termColumn] ?? '')

      if (term !== '') {
        terms.push({ term, banned: plain(values[statusColumn] ?? '').toLowerCase() === 'banned', line: row + 1 })
      }
    }

    return terms
  }

  return terms
}

export function loadGlossary(root: string, file: string): Glossary {
  if (!existsSync(join(root, file))) {
    throw new KanonError(`the glossary the configuration names, ${file}, does not exist.`)
  }

  return { file, terms: parseGlossary(readFileSync(join(root, file), 'utf8')) }
}
