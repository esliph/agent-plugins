// The six EARS patterns and the shape of one criterion (RN-0047, RN-0048).
// The keywords are canonical, in uppercase English; everything else is in the
// project's language, so nothing here reads the body.
export const PATTERNS = ['Ubiquitous', 'Event', 'State', 'Unwanted', 'Optional', 'Complex'] as const

export type Pattern = (typeof PATTERNS)[number]

export interface Problem {
  /** `shape`: one system, one trigger, one response. `pattern`: which of the six shapes. */
  rule: 'shape' | 'pattern'
  message: string
}

export interface ParsedCriterion {
  /** Null when the sentence follows none of the patterns. */
  pattern: Pattern | null
  /** The text between `THE` and `SHALL`; null when it cannot be told. */
  system: string | null
  problems: Problem[]
}

interface Keyword {
  word: string
  start: number
  end: number
}

const KEYWORD = /(?<![\p{L}\p{N}_])(WHERE|WHILE|WHEN|IF|THEN|THE|SHALL)(?![\p{L}\p{N}_])/gu
const QUOTED = /"[^"]*"|“[^”]*”|`[^`]*`/g
const CLAUSES = /^(WHERE )?(WHILE )?(WHEN |IF THEN )?$/
const SINGLE: Record<string, Pattern> = { WHERE: 'Optional', WHILE: 'State', WHEN: 'Event', IF: 'Unwanted' }

/** A quoted message may contain a keyword; it is blanked, keeping every position. */
function mask(text: string): string {
  return text.replace(QUOTED, quoted => ' '.repeat(quoted.length))
}

function blank(text: string): boolean {
  return text.replace(/[\s,;:.!]/g, '') === ''
}

export function parseCriterion(criterion: string): ParsedCriterion {
  const text = mask(criterion)
  const keywords: Keyword[] = [...text.matchAll(KEYWORD)].map(match => ({ word: match[0], start: match.index, end: match.index + match[0].length }))
  const count = (word: string): number => keywords.filter(keyword => keyword.word === word).length
  const problems: Problem[] = []
  const shape = (message: string): void => void problems.push({ rule: 'shape', message })
  const pattern = (message: string): void => void problems.push({ rule: 'pattern', message })

  if (count('SHALL') === 0) {
    shape('has no SHALL: a criterion says what the system SHALL do.')
  }
  if (count('SHALL') > 1) {
    shape('has more than one SHALL: each response is a requirement of its own.')
  }
  if (count('THE') === 0) {
    shape('names no system: write THE <system> SHALL.')
  }
  if (count('THE') > 1) {
    shape('names more than one system: THE appears more than once.')
  }
  if (count('WHEN') > 1) {
    shape('has more than one trigger: WHEN appears more than once.')
  }
  if (count('IF') > 1) {
    shape('has more than one unwanted condition: IF appears more than once.')
  }
  if (count('WHEN') > 0 && count('IF') > 0) {
    shape('has both WHEN and IF: an unwanted condition is written with IF … THEN, not as a second trigger.')
  }
  if (problems.length > 0) {
    return { pattern: null, system: null, problems }
  }

  const the = keywords.findIndex(keyword => keyword.word === 'THE')
  const shall = keywords.findIndex(keyword => keyword.word === 'SHALL')
  const theKeyword = keywords[the]
  const shallKeyword = keywords[shall]

  if (theKeyword === undefined || shallKeyword === undefined || shall !== the + 1 || shall !== keywords.length - 1) {
    pattern('does not end in THE <system> SHALL <response>.')

    return { pattern: null, system: null, problems }
  }

  const system = criterion.slice(theKeyword.end, shallKeyword.start).trim()

  if (blank(text.slice(theKeyword.end, shallKeyword.start))) {
    shape('names no system between THE and SHALL.')
  }
  // The criterion, not the masked text: a response may be only a quoted message.
  if (blank(criterion.slice(shallKeyword.end))) {
    shape('has no response after SHALL.')
  }

  const clauses = keywords.slice(0, the)
  const first = keywords[0]

  if (first !== undefined && !blank(text.slice(0, first.start))) {
    pattern('does not start with a keyword: WHERE, WHILE, WHEN, IF or THE, in uppercase.')
  }
  if (!CLAUSES.test(clauses.map(clause => `${clause.word} `).join(''))) {
    pattern('has its clauses out of shape: at most one each, in the order WHERE, WHILE, then WHEN or IF … THEN.')
  }

  clauses.forEach((clause, index) => {
    const next = keywords[index + 1]
    const content = next === undefined ? '' : text.slice(clause.end, next.start)

    if (clause.word === 'THEN' ? !blank(content) : blank(content)) {
      pattern(clause.word === 'THEN' ? 'has text between THEN and THE.' : `has nothing after ${clause.word}.`)
    }
  })

  if (problems.length > 0) {
    return { pattern: null, system: system === '' ? null : system, problems }
  }

  const kinds = clauses.filter(clause => clause.word !== 'THEN')
  const only = kinds[0]

  return {
    pattern: only === undefined ? 'Ubiquitous' : kinds.length === 1 ? (SINGLE[only.word] ?? null) : 'Complex',
    system,
    problems,
  }
}
