/** Campos obrigatórios de um artefato individual (spec §2). */
export const REQUIRED_FIELDS: readonly string[] = ['id', 'title', 'status', 'owner', 'trigger', 'last-reviewed']

/** Campos obrigatórios do arquivo-container de uma coleção em tabela. */
export const CONTAINER_REQUIRED_FIELDS: readonly string[] = ['title', 'owner', 'trigger', 'last-reviewed']

/** Allowlist padrão de mutação de item congelado (spec §2 e §7). */
export const MUTABLE_FIELDS_DEFAULT: readonly string[] = ['status', 'superseded-by', 'last-reviewed']

/** "Nenhum estado terminal permite edição do corpo" (spec §4). */
export const FROZEN_STATUSES: ReadonlySet<string> = new Set(['accepted', 'superseded', 'deprecated', 'published', 'paid', 'revoked'])

/** "Nenhum agente promove estado sozinho" (spec §4); é o gatilho de living-docs/state-promotion. */
export const HUMAN_PROMOTIONS: readonly { from: string; to: string }[] = Object.freeze([
  { from: 'draft', to: 'accepted' },
  { from: 'open', to: 'resolved' },
  { from: 'draft', to: 'active' },
  { from: 'active', to: 'revoked' },
  { from: 'draft', to: 'published' },
])

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

export function isIsoDate(value: unknown): boolean {
  if (value instanceof Date) {
    return !Number.isNaN(value.getTime())
  }
  if (typeof value !== 'string' || !ISO_DATE.test(value)) {
    return false
  }
  const date = new Date(`${value}T00:00:00Z`)

  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

/**
 * A forma **escrita** de um ID neste projeto (`ADR-0011`, `RN-0024`).
 *
 * Não é a identidade: a identidade é `canonicalId`, que não muda nunca e não é
 * exibida. Esta é a forma que o parser reconhece ao ler e a que `writeId`
 * imprime ao sugerir um ID novo — e é o que permite adotar um repositório cujos
 * IDs já se escrevem de outro jeito sem reescrever um arquivo dele.
 */
export interface IdFormat {
  separator: string
  padding: number
}

export const DEFAULT_ID_FORMAT: IdFormat = Object.freeze({ separator: '-', padding: 4 })

/**
 * Vocabulário fechado (`ADR-0011`). Separador arbitrário viraria um padrão de
 * expressão regular vindo de configuração — superfície que este toolkit recusa.
 */
export const SEPARATORS_ALLOWED: readonly string[] = Object.freeze(['-', '_', '.', ':', ''])

export const PADDING_RANGE = Object.freeze({ min: 2, max: 6 })

/** Padding da chave canônica. Interno, nunca exibido, nunca configurável. */
const CANONICAL_PADDING = 4

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Quantos dígitos a LEITURA aceita: o padding declarado e um a menos.
 *
 * É a regra que já existia com outro nome — `ADR-001` e `ADR-0001` são o mesmo
 * item (`RN-0003`), e repadding nunca criou item novo. Com o padrão isto dá 3 a
 * 4 dígitos, que é exatamente o que o toolkit lê desde a Fase 0.
 */
export function digitRange(format: IdFormat): { min: number; max: number } {
  return { min: Math.max(1, format.padding - 1), max: format.padding }
}

/** O corpo do padrão de um ID: grupo 1 é o prefixo, grupo 2 é o número. */
export function idPatternSource(format: IdFormat = DEFAULT_ID_FORMAT): string {
  const { min, max } = digitRange(format)

  return `([A-Z]{2,4})${escapeForRegExp(format.separator)}(\\d{${min},${max}})`
}

export function parseId(value: unknown, format: IdFormat = DEFAULT_ID_FORMAT): { prefix: string; number: number } | null {
  if (typeof value !== 'string') {
    return null
  }
  const match = new RegExp(`^${idPatternSource(format)}$`).exec(value.trim())

  if (!match?.[1] || !match[2]) {
    return null
  }

  return { prefix: match[1], number: Number.parseInt(match[2], 10) }
}

/**
 * Forma canônica de um ID para comparação de identidade. **Não muda com o
 * projeto** (`ADR-0011`): é chave interna, e mudá-la mudaria a identidade de
 * todo item já registrado. `ADR-001`, `ADR-0001` e `ADR001` são a mesma coisa —
 * sem canonizar, repadding burlaria "ID nunca é reciclado" (spec §2).
 */
export function canonicalId(parsed: { prefix: string; number: number }): string {
  return `${parsed.prefix}-${String(parsed.number).padStart(CANONICAL_PADDING, '0')}`
}

/**
 * A única função que escreve um ID (`RN-0024`). Nenhum check monta ID por
 * concatenação: formato montado à mão em dois lugares diverge no primeiro
 * projeto que declarar outra forma.
 */
export function writeId(prefix: string, number: number, format: IdFormat = DEFAULT_ID_FORMAT): string {
  return `${prefix}${format.separator}${String(number).padStart(format.padding, '0')}`
}
