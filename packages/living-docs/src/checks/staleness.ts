import type { Check, CheckContext, Finding } from '../core/types.ts'
import { asIsoDate, monthsBetween } from '../core/dates.ts'
import { listFiles, readTextFile } from '../core/files.ts'
import { FROZEN_STATUSES } from '../docs/schema.ts'
import type { Frontmatter } from '../frontmatter/parse.ts'

const RULE = 'living-docs/staleness'

/**
 * The state that identifies a debt family (spec §4: `open → paid`).
 *
 * Identification is by state machine, not by the `TDR` prefix: a project
 * that names its family something else and declares `states:` remains covered, and the
 * check does not gain a prefix list to maintain (`ADR-0007`, decision 4).
 */
const DEBT_STATE = 'paid'

export interface StaleDoc {
  file: string
  line: number
  months: number
  skill: string | null
}

export interface PayWhen {
  /** Regular expression recognized line by line. */
  pattern: string
  paths: string[]
}

export type PayWhenProblem = 'missing' | 'incomplete' | 'invalid pattern'

export interface DebtWithoutTrigger {
  file: string
  line: number
  id: string
  problem: PayWhenProblem
}

export interface DuePayment {
  file: string
  line: number
  id: string
  pattern: string
  /** Where the condition was found, in the `file:line` format. */
  evidence: string
}

function finding(severity: 'error' | 'warning') {
  return (file: string, line: number, message: string, fix: string): Finding => ({
    ruleId: RULE,
    file,
    line,
    severity,
    message,
    fix,
  })
}

const warning = finding('warning')
const error = finding('error')

interface Reviewable {
  file: string
  line: number
  status: string | null
  lastReviewed: string | null
  skill: string | null
}

/**
 * What an artifact (`ArtifactDoc`) and a document (`DocumentDoc`) have in common
 * for staleness purposes: path, frontmatter and the skill that owns the rule. The
 * two interfaces match this shape structurally — no cast needed.
 */
interface FrontmatterSource {
  file: string
  frontmatter: Frontmatter | null
  rule: { skill: string | null }
}

/** A document without frontmatter has nothing to expire — the case of CHANGELOG, which Phase 6 deliberately left without. */
function reviewableOf(source: FrontmatterSource): Reviewable | null {
  const frontmatter = source.frontmatter

  if (!frontmatter) {
    return null
  }

  return {
    file: source.file,
    line: frontmatter.lines['last-reviewed'] ?? 1,
    status: typeof frontmatter.data.status === 'string' ? frontmatter.data.status : null,
    lastReviewed: asIsoDate(frontmatter.data['last-reviewed']),
    skill: source.rule.skill,
  }
}

/** Everything that declares a review date: artifact, collection container and document. */
function reviewables(context: CheckContext): Reviewable[] {
  const sources: FrontmatterSource[] = [...context.docs, ...context.documents]
  const found: Reviewable[] = []

  for (const source of sources) {
    const reviewable = reviewableOf(source)

    if (reviewable) {
      found.push(reviewable)
    }
  }

  return found
}

/** Documents reviewed longer ago than the project accepts. */
export function staleDocs(context: CheckContext): StaleDoc[] {
  const limit = context.config.staleAfterMonths
  const stale: StaleDoc[] = []

  for (const item of reviewables(context)) {
    if (item.lastReviewed === null) {
      continue
    }
    // A frozen item is not reviewed (ADR-0007, decision 7).
    if (item.status !== null && FROZEN_STATUSES.has(item.status)) {
      continue
    }

    const months = monthsBetween(item.lastReviewed, context.today)

    if (months === null || months <= limit) {
      continue
    }

    stale.push({ file: item.file, line: item.line, months, skill: item.skill })
  }

  return stale
}

interface Debt {
  file: string
  line: number
  id: string
  data: Record<string, unknown>
}

function openDebts(context: CheckContext): Debt[] {
  const debts: Debt[] = []

  for (const doc of context.docs) {
    if (doc.rule.collection !== 'per-file') {
      continue
    }
    if (!doc.rule.states?.includes(DEBT_STATE)) {
      continue
    }

    const frontmatter = doc.frontmatter

    if (!frontmatter || frontmatter.data.status !== 'open') {
      continue
    }

    debts.push({
      file: doc.file,
      line: frontmatter.lines['pay-when'] ?? frontmatter.lines.status ?? 1,
      id: typeof frontmatter.data.id === 'string' ? frontmatter.data.id : doc.file,
      data: frontmatter.data,
    })
  }

  return debts
}

/** The frontmatter `pay-when`, or the problem that makes it useless. */
export function payWhenOf(data: Record<string, unknown>): PayWhen | PayWhenProblem {
  const raw = data['pay-when']

  if (raw === undefined || raw === null) {
    return 'missing'
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return 'incomplete'
  }

  const record = raw as Record<string, unknown>
  const pattern = record.pattern
  const paths = record.paths

  if (typeof pattern !== 'string' || pattern.trim() === '') {
    return 'incomplete'
  }
  if (!Array.isArray(paths) || paths.length === 0) {
    return 'incomplete'
  }
  if (paths.some(path => typeof path !== 'string' || path.trim() === '')) {
    return 'incomplete'
  }

  try {
    new RegExp(pattern)
  } catch {
    return 'invalid pattern'
  }

  return { pattern, paths: paths as string[] }
}

/** `open` debts whose payment trigger is not verifiable (`RN-0019`). */
export function debtsWithoutTrigger(context: CheckContext): DebtWithoutTrigger[] {
  const found: DebtWithoutTrigger[] = []

  for (const debt of openDebts(context)) {
    const payWhen = payWhenOf(debt.data)

    if (typeof payWhen === 'string') {
      found.push({ file: debt.file, line: debt.line, id: debt.id, problem: payWhen })
    }
  }

  return found
}

/** `open` debts whose trigger has already happened, with the evidence (spec §12, criterion 7). */
export function duePayments(context: CheckContext): DuePayment[] {
  const due: DuePayment[] = []

  for (const debt of openDebts(context)) {
    const payWhen = payWhenOf(debt.data)

    if (typeof payWhen === 'string') {
      continue
    } // debtsWithoutTrigger reports this

    const pattern = new RegExp(payWhen.pattern)

    for (const file of listFiles(context.root, payWhen.paths)) {
      // The debt's own file cites the trigger in prose; citing is not fulfilling.
      if (file === debt.file) {
        continue
      }

      const source = readTextFile(context.root, file)

      if (source === null) {
        continue
      }

      const at = source
        .replace(/\r\n/g, '\n')
        .split('\n')
        .findIndex(line => pattern.test(line))

      if (at === -1) {
        continue
      }

      due.push({
        file: debt.file,
        line: debt.line,
        id: debt.id,
        pattern: payWhen.pattern,
        evidence: `${file}:${at + 1}`,
      })
      break
    }
  }

  return due
}

/**
 * `living-docs/staleness` — staleness. The **only** check authorized to merely warn (spec §9), and
 * only in the `last-reviewed` half: the fix there is to read the document, and a red
 * build pushes toward the mass bump that spec §13 refuses. The debt
 * half fails, because it is what closes acceptance criterion 7.
 *
 * Regras de origem: `RN-0018`, `RN-0019`.
 */
export const livingDocsStaleness: Check = {
  id: RULE,
  name: 'staleness',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = []
    const limit = context.config.staleAfterMonths

    for (const stale of staleDocs(context)) {
      findings.push(
        warning(
          stale.file,
          stale.line,
          `\`last-reviewed\` is ${stale.months} months old and this project's limit is ${limit} (\`stale-after-months\`).`,
          // Rule of origin: spec §13 (a bump without reading is an anti-requirement).
          `Re-read the document and, if it is still true, update \`last-reviewed\`${
            stale.skill === null ? '' : ` (owning skill: ${stale.skill})`
          }. A bump without reading, or a mass bump, switches off the review mechanism while pretending to honor it.`,
        ),
      )
    }

    for (const debt of debtsWithoutTrigger(context)) {
      findings.push(
        error(
          debt.file,
          debt.line,
          `${debt.id} is \`open\` and its payment trigger is not verifiable: \`pay-when\` ${debt.problem}.`,
          'Declare `pay-when` with `pattern` (a regex, in single quotes) and `paths` (globs where to look for it) — ' +
            // Rule of origin: RN-0019, ADR-0007.
            'a condition someone can point to happening (owning skill: decision-recorder). ' +
            'A debt with no verifiable trigger is an orphan `TODO` with a number.',
        ),
      )
    }

    for (const payment of duePayments(context)) {
      findings.push(
        error(
          payment.file,
          payment.line,
          `${payment.id} is \`open\` and its payment trigger has already happened: ${payment.evidence} matches \`${payment.pattern}\`.`,
          // Rule of origin: RN-0005; spec §12, criterion 7.
          'Pay the debt, or reclassify it (`paid`, `accepted-permanently`) — both are human acts, ' +
            'and `living-docs/state-promotion` intercepts. While it stays `open` with the trigger met, CI fails.',
        ),
      )
    }

    return findings
  },
}
