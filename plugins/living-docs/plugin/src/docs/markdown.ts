/** Opens or closes a fenced code block. The group holds the fence length. */
const FENCE = /^\s{0,3}(`{3,}|~{3,})/

/**
 * The text without fenced blocks, and **with** the inline markup intact.
 *
 * Preserving the line count is not a detail — it is what allows reporting the
 * finding's line. And the fence must close with one of the **same length or
 * longer** (CommonMark): without that, a block opened with four backticks closes at the
 * first three-backtick fence inside it, and the rest of the file is read as
 * prose again — which is exactly how a code example becomes a
 * false positive.
 *
 * It is the half that serves whoever **looks for** an ID written between backticks: erasing inline
 * code would erase precisely what is being looked for, but the example inside
 * a fence is still an example (`living-docs/done-verifiable`, Definition of Done item).
 */
export function stripFences(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let fence: string | null = null

  for (const line of lines) {
    const mark = FENCE.exec(line)?.[1]

    if (fence === null) {
      if (mark !== undefined) {
        fence = mark
        out.push('')
        continue
      }
      out.push(line)
      continue
    }

    if (mark !== undefined && mark[0] === fence[0] && mark.length >= fence.length) {
      fence = null
    }
    out.push('')
  }

  return out.join('\n')
}

/**
 * The text without code: fenced block and inline markup go out, and the lines stay.
 *
 * It is `stripFences` followed by erasing the inline code — whoever compares prose
 * (`duplicatedSentences`, `sentencesOf`) wants both gone.
 */
export function stripCode(source: string): string {
  return stripFences(source)
    .split('\n')
    .map(line => line.replace(/`[^`\n]*`/g, ''))
    .join('\n')
}

/** Comparable prose: lowercase, no markup, no punctuation, whitespace collapsed. */
export function normalizeProse(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`~]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const BLOCK_START = /^\s*(?:[-*+]\s+|#{1,6}\s+|>\s?|\d+[.)]\s+|\|)/
const MARKER = /^\s*(?:[-*+]\s+|#{1,6}\s+|>\s?|\d+[.)]\s+)/

/**
 * Sentences of the document, already without code, with the line where each one starts.
 *
 * The paragraph is joined **before** being cut into sentences: prose wrapped at eighty
 * columns must not escape a per-sentence comparison merely because of where the
 * editor hit enter (`ADR-0009`). A list item, heading, quote and table
 * row start a new sentence — joining them to the previous paragraph would invent a
 * sentence nobody wrote.
 */
export function sentencesOf(source: string): { text: string; line: number }[] {
  const lines = stripCode(source).split('\n')
  const sentences: { text: string; line: number }[] = []

  let buffer: string[] = []
  let start = 0

  const flush = (): void => {
    if (buffer.length === 0) {
      return
    }
    const paragraph = buffer.join(' ').replace(/\s+/g, ' ').trim()

    buffer = []
    for (const piece of paragraph.split(/(?<=[.!?])\s+/)) {
      const text = piece.trim()

      if (text !== '') {
        sentences.push({ text, line: start })
      }
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? ''

    if (raw.trim() === '') {
      flush()
      continue
    }
    if (BLOCK_START.test(raw)) {
      flush()
    }
    if (buffer.length === 0) {
      start = i + 1
    }
    buffer.push(raw.replace(MARKER, '').trim())
  }
  flush()

  return sentences
}
