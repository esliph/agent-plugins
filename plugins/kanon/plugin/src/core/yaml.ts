// The YAML kanon reads and writes: top-level keys whose value is a scalar, a
// list of scalars or a one-level map of scalars. It is the whole shape of the
// configuration and of a capability registry, and reading it here is what lets
// the plugin run as copied, with nothing to install (RNF-0008). Anything
// outside this shape is refused with its line, never guessed.
export type Scalar = string | number | boolean | null
export type YamlValue = Scalar | Scalar[] | { [key: string]: Scalar }

const KEY = /^([A-Za-z_][\w-]*)\s*:(?:\s+(.*))?$/
const PLAIN = /^[A-Za-z0-9_][\w ./-]*$/
const RESERVED = /^(?:null|true|false|~|-?\d+)$/
const OUTSIDE = /^[[\]{}&*!|>%@`]/

function fail(line: number, what: string): never {
  throw new Error(`line ${line}: ${what}`)
}

/** A quote opens only where a value can start, so that an apostrophe inside a word is a letter. */
function opensQuote(text: string, index: number): boolean {
  const char = text[index]

  return (char === '"' || char === "'") && (index === 0 || ' [,'.includes(text[index - 1] ?? ''))
}

/** Calls `visit` for each character outside quotes; stops when it returns true. Returns the index it stopped at. */
function scan(text: string, visit: (char: string, index: number) => boolean): number {
  let quote: string | null = null

  for (let index = 0; index < text.length; index++) {
    const char = text[index] ?? ''

    if (quote !== null) {
      quote = char === quote ? null : quote
    } else if (opensQuote(text, index)) {
      quote = char
    } else if (visit(char, index)) {
      return index
    }
  }

  return -1
}

function stripComment(text: string): string {
  const at = scan(text, (char, index) => char === '#' && (index === 0 || /\s/.test(text[index - 1] ?? '')))

  return at === -1 ? text : text.slice(0, at)
}

function scalar(raw: string, line: number): Scalar {
  const text = raw.trim()
  const quote = text[0]

  if (text === '' || text === 'null' || text === '~') {
    return null
  }
  if (text === 'true' || text === 'false') {
    return text === 'true'
  }
  if (/^-?\d+$/.test(text)) {
    return Number(text)
  }
  if (quote === '"' || quote === "'") {
    if (text.length < 2 || !text.endsWith(quote)) {
      fail(line, 'a quote is opened and never closed.')
    }

    const inner = text.slice(1, -1)

    return quote === '"' ? inner.replace(/\\(["\\])/g, '$1') : inner.replace(/''/g, "'")
  }
  if (OUTSIDE.test(text)) {
    fail(line, `\`${text}\` is not a value kanon reads here: write a plain value, or put it in quotes.`)
  }

  return text
}

function value(raw: string, line: number): Scalar | Scalar[] {
  const text = raw.trim()

  if (!text.startsWith('[')) {
    return scalar(text, line)
  }
  if (!text.endsWith(']')) {
    fail(line, 'a list is opened with `[` and never closed.')
  }

  const inner = text.slice(1, -1)
  const items: string[] = []
  let start = 0

  scan(inner, (char, index) => {
    if (char === ',') {
      items.push(inner.slice(start, index))
      start = index + 1
    }

    return false
  })
  items.push(inner.slice(start))

  return inner.trim() === '' ? [] : items.map(item => scalar(item, line))
}

export function parseYaml(source: string): Record<string, YamlValue> {
  const result: Record<string, YamlValue> = {}
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  /** The last top-level key written with no value: what an indented line belongs to. */
  let open: string | null = null
  /** The indentation of the open block, set by its first line; 0 while it has none. */
  let depth = 0

  lines.forEach((rawLine, index) => {
    const line = index + 1
    const content = stripComment(rawLine).trimEnd()
    const text = content.trim()

    if (text === '') {
      return
    }
    if (content.includes('\t')) {
      fail(line, 'indentation is written with spaces.')
    }

    const match = KEY.exec(text)

    if (content.startsWith(' ')) {
      const current = open === null ? undefined : result[open]

      if (open === null || current === undefined) {
        return fail(line, 'this line is indented under nothing.')
      }

      const indent = content.length - content.trimStart().length

      if (depth !== 0 && indent !== depth) {
        fail(line, 'a block holds one level: this line is indented differently from the lines above it.')
      }
      depth = indent

      if (text === '-' || text.startsWith('- ')) {
        if (current !== null && !Array.isArray(current)) {
          fail(line, 'a block is a list or a map, never both.')
        }
        result[open] = [...(current ?? []), scalar(text.slice(1), line)]
      } else if (match?.[1] !== undefined) {
        if (current !== null && (Array.isArray(current) || typeof current !== 'object')) {
          fail(line, 'a block is a list or a map, never both.')
        }
        result[open] = { ...(current ?? {}), [match[1]]: scalar(match[2] ?? '', line) }
      } else {
        fail(line, 'expected `- item` or `key: value`.')
      }

      return
    }

    if (match?.[1] === undefined) {
      return fail(line, 'expected `key: value`.')
    }
    if (match[1] in result) {
      fail(line, `the key \`${match[1]}\` appears twice.`)
    }

    const rest = (match[2] ?? '').trim()

    open = rest === '' ? match[1] : null
    depth = 0
    result[match[1]] = rest === '' ? null : value(rest, line)
  })

  return result
}

function render(item: Scalar): string {
  if (typeof item !== 'string') {
    return String(item)
  }

  return PLAIN.test(item) && !RESERVED.test(item) && item === item.trim() ? item : JSON.stringify(item)
}

/** One `key: value` line per key, a list written as `[a, b]`. What `parseYaml` reads back unchanged. */
export function renderYaml(data: Record<string, Scalar | Scalar[]>): string {
  return Object.entries(data)
    .map(([key, item]) => `${key}: ${Array.isArray(item) ? `[${item.map(render).join(', ')}]` : render(item)}\n`)
    .join('')
}
