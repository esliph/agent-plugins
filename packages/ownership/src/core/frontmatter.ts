import YAML from 'yaml'

export interface Frontmatter {
  data: Record<string, unknown>
  lines: Record<string, number>
  endLine: number
  body: string
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
const TOP_LEVEL_KEY = /^([\p{L}_][\p{L}\p{N}_-]*)\s*:/u

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

    throw new FrontmatterSyntaxError(err instanceof Error ? err.message : 'YAML inválido', at + 1)
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
