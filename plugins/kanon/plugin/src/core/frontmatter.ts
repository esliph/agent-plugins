import { parseYaml, renderYaml, type Scalar, type YamlValue } from './yaml.ts'

export interface Frontmatter {
  data: Record<string, YamlValue>
  /** 1-based line of each top-level key. */
  lines: Record<string, number>
  body: string
}

const DELIMITER = /^---\s*$/
const TOP_LEVEL_KEY = /^([A-Za-z_][\w-]*)\s*:/
const BYTE_ORDER_MARK = 0xfeff

/** Null when the text opens with no front matter block. Throws when the block does not parse. */
export function parseFrontmatter(source: string): Frontmatter | null {
  const text = source.charCodeAt(0) === BYTE_ORDER_MARK ? source.slice(1) : source
  const lines = text.replace(/\r\n/g, '\n').split('\n')

  if (!DELIMITER.test(lines[0] ?? '')) {
    return null
  }

  const end = lines.findIndex((line, index) => index > 0 && DELIMITER.test(line))

  if (end === -1) {
    return null
  }

  // The opening delimiter stays in as a blank line, so that a parse error names the line of the file.
  const data = parseYaml(['', ...lines.slice(1, end)].join('\n'))
  const keyLines: Record<string, number> = {}

  for (let index = 1; index < end; index++) {
    const key = TOP_LEVEL_KEY.exec(lines[index] ?? '')?.[1]

    if (key !== undefined && keyLines[key] === undefined) {
      keyLines[key] = index + 1
    }
  }

  return { data, lines: keyLines, body: lines.slice(end + 1).join('\n') }
}

export function renderFrontmatter(data: Record<string, Scalar | Scalar[]>, body: string): string {
  return `---\n${renderYaml(data)}---\n${body}`
}
