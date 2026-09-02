import type { Check, CheckContext, Finding } from '../core/types.ts'
import { asIsoDate, monthsBetween } from '../core/dates.ts'
import { listFiles, readTextFile } from '../core/files.ts'
import { FROZEN_STATUSES, statesFor } from '../docs/schema.ts'
import type { Frontmatter } from '../frontmatter/parse.ts'

const RULE = 'CI-4'

/**
 * O estado que identifica uma família de dívida (spec §4: `open → paid`).
 *
 * A identificação é pela máquina de estados, não pelo prefixo `TDR`: um projeto
 * que chame sua família de outra coisa e declare `states:` continua coberto, e o
 * check não ganha uma lista de prefixos para manter (`ADR-0007`, decisão 4).
 */
const DEBT_STATE = 'paid'

export interface StaleDoc {
  file: string
  line: number
  months: number
  skill: string | null
}

export interface PayWhen {
  /** Expressão regular reconhecida linha a linha. */
  pattern: string
  paths: string[]
}

export type PayWhenProblem = 'ausente' | 'incompleto' | 'padrão inválido'

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
  /** Onde a condição foi encontrada, no formato `arquivo:linha`. */
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
 * O que um artefato (`ArtifactDoc`) e um documento (`DocumentDoc`) têm em comum
 * para efeito de staleness: caminho, frontmatter e a skill dona da regra. As
 * duas interfaces batem nesse formato estruturalmente — não precisa de cast.
 */
interface FrontmatterSource {
  file: string
  frontmatter: Frontmatter | null
  rule: { skill: string | null }
}

/** Documento sem frontmatter não tem o que vencer — é o caso do CHANGELOG, que a Fase 6 deixou sem de propósito. */
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

/** Tudo que declara data de revisão: artefato, container de coleção e documento. */
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

/** Documentos revisados há mais tempo que o projeto aceita. */
export function staleDocs(context: CheckContext): StaleDoc[] {
  const limit = context.config.staleAfterMonths
  const stale: StaleDoc[] = []

  for (const item of reviewables(context)) {
    if (item.lastReviewed === null) {
      continue
    }
    // Item congelado não se revisa (ADR-0007, decisão 7).
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
    if (!statesFor(doc.rule)?.includes(DEBT_STATE)) {
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

/** O `pay-when` do frontmatter, ou o problema que o torna inútil. */
export function payWhenOf(data: Record<string, unknown>): PayWhen | PayWhenProblem {
  const raw = data['pay-when']

  if (raw === undefined || raw === null) {
    return 'ausente'
  }
  if (typeof raw !== 'object' || Array.isArray(raw)) {
    return 'incompleto'
  }

  const record = raw as Record<string, unknown>
  const pattern = record.pattern
  const paths = record.paths

  if (typeof pattern !== 'string' || pattern.trim() === '') {
    return 'incompleto'
  }
  if (!Array.isArray(paths) || paths.length === 0) {
    return 'incompleto'
  }
  if (paths.some(path => typeof path !== 'string' || path.trim() === '')) {
    return 'incompleto'
  }

  try {
    new RegExp(pattern)
  } catch {
    return 'padrão inválido'
  }

  return { pattern, paths: paths as string[] }
}

/** Dívidas `open` cujo gatilho de pagamento não é verificável (`RN-0019`). */
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

/** Dívidas `open` cujo gatilho já aconteceu, com a evidência (spec §12, critério 7). */
export function duePayments(context: CheckContext): DuePayment[] {
  const due: DuePayment[] = []

  for (const debt of openDebts(context)) {
    const payWhen = payWhenOf(debt.data)

    if (typeof payWhen === 'string') {
      continue
    } // quem reporta é debtsWithoutTrigger

    const pattern = new RegExp(payWhen.pattern)

    for (const file of listFiles(context.root, payWhen.paths)) {
      // O próprio arquivo da dívida cita o gatilho em prosa; citar não é cumprir.
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
 * `CI-4` — staleness. O **único** check autorizado a apenas avisar (spec §9), e
 * só na metade do `last-reviewed`: a correção ali é ler o documento, e build
 * vermelho empurra para o bump em massa que a spec §13 recusa. A metade da
 * dívida reprova, porque é ela que fecha o critério de aceite 7.
 *
 * Regras de origem: `RN-0018`, `RN-0019`.
 */
export const ci4Staleness: Check = {
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
          `\`last-reviewed\` tem ${stale.months} meses e o limite deste projeto é ${limit} (\`stale-after-months\`).`,
          `Releia o documento e, se ele ainda é verdade, atualize \`last-reviewed\`${
            stale.skill === null ? '' : ` (skill dona: ${stale.skill})`
          }. Bump sem leitura, ou bump em massa, é anti-requisito da spec §13: desliga o mecanismo fingindo cumpri-lo.`,
        ),
      )
    }

    for (const debt of debtsWithoutTrigger(context)) {
      findings.push(
        error(
          debt.file,
          debt.line,
          `${debt.id} está \`open\` e o gatilho de pagamento não é verificável: \`pay-when\` ${debt.problem}.`,
          'Declare `pay-when` com `pattern` (regex, em aspas simples) e `paths` (globs onde procurá-lo) — ' +
            'uma condição que alguém consegue apontar acontecendo (`RN-0019`, `ADR-0007`; skill dona: decision-recorder). ' +
            'Dívida sem gatilho verificável é `TODO` órfão com número.',
        ),
      )
    }

    for (const payment of duePayments(context)) {
      findings.push(
        error(
          payment.file,
          payment.line,
          `${payment.id} está \`open\` e o gatilho de pagamento já aconteceu: ${payment.evidence} casa \`${payment.pattern}\`.`,
          'Pague a dívida, ou reclassifique-a (`paid`, `accepted-permanently`) — as duas coisas são ato humano ' +
            '(`RN-0005`, e `HK-3` intercepta). Enquanto ela seguir `open` com o gatilho cumprido, o CI reprova ' +
            '(spec §12, critério 7).',
        ),
      )
    }

    return findings
  },
}
