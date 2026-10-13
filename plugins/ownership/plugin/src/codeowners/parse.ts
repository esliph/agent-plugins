import { compilePattern } from './match.ts'
import type { Codeowners, CodeownersLine } from './types.ts'

/**
 * Reads a CODEOWNERS text: per line, the pattern, the owners and the line
 * number. A line whose pattern uses syntax GitHub does not support (`!`,
 * `[ ]`) is dropped, as GitHub drops it.
 */
export function parseCodeowners(text: string, file = 'CODEOWNERS'): Codeowners {
  const lines: CodeownersLine[] = []

  text.split(/\r?\n/).forEach((raw, index) => {
    const content = raw.trim()

    if (content === '' || content.startsWith('#')) {
      return
    }

    const [first = '', ...rest] = content.split(/\s+/)
    const pattern = first.replace(/^\\#/, '#')

    if (pattern.startsWith('!') || /[[\]]/.test(pattern)) {
      return
    }

    const owners: string[] = []

    for (const token of rest) {
      if (token.startsWith('#')) {
        break
      }

      owners.push(token)
    }

    lines.push({ pattern, owners, line: index + 1, ...compilePattern(pattern) })
  })

  return { file, lines }
}
