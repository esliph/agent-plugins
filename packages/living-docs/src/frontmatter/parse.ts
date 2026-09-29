import YAML from 'yaml'

export interface Frontmatter {
  /** Top-level keys of the YAML block, already parsed. */
  data: Record<string, unknown>
  /** Top-level key → 1-indexed line in the whole file. */
  lines: Record<string, number>
  /** 1-indexed line of the `---` that closes the block. */
  endLine: number
  /** Everything after the block, without the separator. */
  body: string
  /** 1-indexed line where the body starts. */
  bodyStartLine: number
}

export class FrontmatterSyntaxError extends Error {
  readonly line: number

  constructor(message: string, line: number) {
    super(message)
    this.name = 'FrontmatterSyntaxError'
    this.line = line
  }
}

const DELIMITER = /^---\s*$/
const TOP_LEVEL_KEY = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:/

export function parseFrontmatter(source: string): Frontmatter | null {
  const text = source.replace(/^﻿/, '').replace(/\r\n/g, '\n')
  const lines = text.split('\n')

  if (lines.length === 0 || !DELIMITER.test(lines[0] ?? '')) {
    return null
  }

  let endIndex = -1

  for (let i = 1; i < lines.length; i++) {
    if (DELIMITER.test(lines[i] ?? '')) {
      endIndex = i
      break
    }
  }
  if (endIndex === -1) {
    return null
  }

  const block = lines.slice(1, endIndex).join('\n')

  let data: Record<string, unknown>

  try {
    data = (YAML.parse(block) ?? {}) as Record<string, unknown>
  } catch (err) {
    const at = err instanceof YAML.YAMLParseError ? (err.linePos?.[0]?.line ?? 1) : 1

    throw new FrontmatterSyntaxError(
      err instanceof Error ? err.message : 'invalid YAML',
      at + 1, // +1 because the block starts on line 2 of the file
    )
  }

  const keyLines: Record<string, number> = {}

  for (let i = 1; i < endIndex; i++) {
    const match = TOP_LEVEL_KEY.exec(lines[i] ?? '')

    if (match?.[1] !== undefined && keyLines[match[1]] === undefined) {
      keyLines[match[1]] = i + 1
    }
  }

  return {
    data,
    lines: keyLines,
    endLine: endIndex + 1,
    body: lines.slice(endIndex + 1).join('\n'),
    bodyStartLine: endIndex + 2,
  }
}
