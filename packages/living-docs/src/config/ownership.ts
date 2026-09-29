import { OwnershipError, isEmptyValue, normalizeFieldKey, resolveOwnership } from '@esliph/ownership'
import type { DocItem, ResolvedConfig, ResolvedOwnedRule } from '@esliph/ownership'
import { DEFAULT_ID_FORMAT, PADDING_RANGE, SEPARATORS_ALLOWED } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'

export { OwnershipError }

/**
 * O nome do bloco deste plugin no arquivo de ownership. Um caminho é do
 * living-docs se, e somente se, a entrada de `owned` que o cobre traz este
 * bloco (ADR-0020); com `id-prefix` é artefato, sem ele é documento (ADR-0029).
 */
export const PLUGIN = 'living-docs'

export type Collection = 'per-file' | 'table' | 'sections'

/**
 * Quem lê um documento ou artefato (`ADR-0017`). Ausente, vale `internal`.
 */
export const AUDIENCES = ['internal', 'external'] as const
export type Audience = (typeof AUDIENCES)[number]

/**
 * Papéis que o toolkit reconhece num documento (`ADR-0008`). Vocabulário
 * fechado: é o que permite achar o contrato do agente e a Definition of Done
 * sem conhecer caminho nenhum.
 */
export const DOCUMENT_ROLES = ['agent-contract', 'definition-of-done'] as const
export type DocumentRole = (typeof DOCUMENT_ROLES)[number]

export interface ArtifactRule {
  idPrefix: string
  path: string
  owner: string
  skill: string
  appendOnly: boolean
  mutableFields: string[]
  citedBy: string[]
  collection: Collection
  /** Canônico -> nome real do campo neste projeto. Ex.: { 'resolved-by': 'resolvida por' }. */
  fieldMap: Record<string, string>
  /** `states` da entrada, que é do núcleo; `null` quando a entrada não declara. */
  states: string[] | null
  audience: Audience
  /** A entrada resolvida pelo núcleo — é o que `findTransitions` recebe. */
  core: ResolvedOwnedRule
}

/** Documento com dono e sem família de IDs (`ADR-0008`). */
export interface DocumentRule {
  path: string
  owner: string
  /** Skill dona, quando existe uma. `null` é informação, não erro. */
  skill: string | null
  role: DocumentRole | null
  audience: Audience
  core: ResolvedOwnedRule
}

export interface GeneratedRule {
  path: string
  command: string
}

export interface WatchRule {
  code: string
  doc: string
  reason: string | null
  consumerVisible: boolean
}

export interface LivingDocsConfig {
  /** O arquivo de ownership raiz, relativo ao repositório (ex.: `.ownership.yml`). */
  rootFile: string
  staleAfterMonths: number
  /** Quantos documentos com bump de data seco reprovam (`ADR-0013`, `RN-0027`). */
  lastReviewedBumpLimit: number
  /** A forma escrita dos IDs deste projeto (`ADR-0011`). Nunca a identidade. */
  idFormat: IdFormat
  artifacts: ArtifactRule[]
  documents: DocumentRule[]
  generated: GeneratedRule[]
  watches: WatchRule[]
  /** A configuração inteira, como o núcleo a resolveu. */
  core: ResolvedConfig
}

const ID_PREFIX = /^[A-Z]{2,4}$/
const TOP_KEYS: ReadonlySet<string> = new Set(['stale-after-months', 'id-format', 'last-reviewed-bump-limit'])
const ARTIFACT_KEYS: ReadonlySet<string> = new Set(['id-prefix', 'append-only', 'mutable-fields', 'cited-by', 'field-map', 'audience'])
const DOCUMENT_KEYS: ReadonlySet<string> = new Set(['role', 'audience'])
const DEFAULT_STALE_AFTER_MONTHS = 6

/**
 * O limiar de bump em massa (`ADR-0013`). Piso 2, e não 1: um documento revisado
 * de verdade atualiza a data, e limiar 1 reprovaria o mecanismo funcionando.
 */
export const DEFAULT_BUMP_LIMIT = 3

function fail(where: string, message: string): never {
  throw new OwnershipError(`${where}: ${message}`)
}

function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(where, 'precisa ser um mapa.')
  }

  return value as Record<string, unknown>
}

function asStringList(value: unknown, where: string): string[] {
  if (value === undefined || value === null) {
    return []
  }
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    fail(where, 'precisa ser uma lista de strings.')
  }

  return value as string[]
}

function assertKnown(block: Record<string, unknown>, allowed: ReadonlySet<string>, where: string, hint = ''): void {
  for (const key of Object.keys(block)) {
    if (!allowed.has(key)) {
      fail(where, `chave "${key}" desconhecida.${hint}`)
    }
  }
}

function parseIdFormat(raw: unknown, where: string): IdFormat {
  if (raw === undefined || raw === null) {
    return DEFAULT_ID_FORMAT
  }
  const item = asRecord(raw, `${where}.id-format`)
  const separator = item.separator ?? DEFAULT_ID_FORMAT.separator

  if (typeof separator !== 'string' || !SEPARATORS_ALLOWED.includes(separator)) {
    // Regra de origem: ADR-0011.
    fail(where, `id-format.separator "${String(separator)}" não é aceito. Válidos: ${SEPARATORS_ALLOWED.map(value => `"${value}"`).join(', ')}.`)
  }

  const padding = item.padding ?? DEFAULT_ID_FORMAT.padding

  if (typeof padding !== 'number' || !Number.isInteger(padding) || padding < PADDING_RANGE.min || padding > PADDING_RANGE.max) {
    // Regra de origem: ADR-0011.
    fail(where, `id-format.padding "${String(padding)}" precisa ser inteiro entre ${PADDING_RANGE.min} e ${PADDING_RANGE.max}.`)
  }

  return { separator, padding }
}

function parseBumpLimit(raw: unknown, where: string): number {
  if (raw === undefined || raw === null) {
    return DEFAULT_BUMP_LIMIT
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 2) {
    // Regra de origem: ADR-0013.
    fail(where, `last-reviewed-bump-limit "${String(raw)}" precisa ser inteiro maior ou igual a 2 (limiar 1 reprovaria a revisão legítima de um documento só).`)
  }

  return raw
}

function parseAudience(raw: unknown, where: string): Audience {
  if (raw === undefined) {
    return 'internal'
  }
  if (!AUDIENCES.includes(raw as Audience)) {
    fail(where, `audience "${String(raw)}" desconhecido. Válidos: ${AUDIENCES.join(', ')}.`)
  }

  return raw as Audience
}

function whereOf(rule: ResolvedOwnedRule): string {
  return `${rule.origin}: entrada "${rule.path}", bloco ${PLUGIN}`
}

function toArtifact(rule: ResolvedOwnedRule, block: Record<string, unknown>): ArtifactRule {
  const where = whereOf(rule)

  assertKnown(block, ARTIFACT_KEYS, where)

  const idPrefix = block['id-prefix']

  if (typeof idPrefix !== 'string' || !ID_PREFIX.test(idPrefix)) {
    fail(where, `id-prefix "${String(idPrefix)}" precisa ser 2 a 4 letras maiúsculas (ex.: ADR, DA, TDR).`)
  }
  if (rule.skill === null) {
    fail(where, 'artefato precisa de `skill` na entrada — é a skill dona que escreve os itens dele.')
  }

  const fieldMap: Record<string, string> = {}
  const fieldMapRaw = block['field-map']

  if (fieldMapRaw !== undefined && fieldMapRaw !== null) {
    for (const [canonical, real] of Object.entries(asRecord(fieldMapRaw, `${where}.field-map`))) {
      if (typeof real !== 'string' || real.trim() === '') {
        fail(where, `field-map.${canonical} precisa ser uma string não vazia.`)
      }
      fieldMap[normalizeFieldKey(canonical)] = normalizeFieldKey(real)
    }
  }

  return {
    idPrefix,
    path: rule.path,
    owner: rule.owner,
    skill: rule.skill,
    appendOnly: block['append-only'] === true,
    mutableFields: asStringList(block['mutable-fields'], `${where}.mutable-fields`),
    citedBy: asStringList(block['cited-by'], `${where}.cited-by`),
    collection: rule.format.collection,
    fieldMap,
    states: rule.states,
    audience: parseAudience(block.audience, where),
    core: rule,
  }
}

function toDocument(rule: ResolvedOwnedRule, block: Record<string, unknown>): DocumentRule {
  const where = whereOf(rule)

  assertKnown(block, DOCUMENT_KEYS, where, ' Chaves de artefato só valem com `id-prefix`.')

  const role = block.role

  if (role !== undefined && !DOCUMENT_ROLES.includes(role as DocumentRole)) {
    fail(where, `role "${String(role)}" desconhecido. Válidos: ${DOCUMENT_ROLES.join(', ')}.`)
  }

  return {
    path: rule.path,
    owner: rule.owner,
    skill: rule.skill,
    role: role === undefined ? null : (role as DocumentRole),
    audience: parseAudience(block.audience, where),
    core: rule,
  }
}

/** A configuração do living-docs sobre a que o núcleo resolveu. Função pura. */
export function adaptConfig(core: ResolvedConfig): LivingDocsConfig {
  const top = core.pluginBlocks[PLUGIN] ?? {}
  const topWhere = `${core.rootFile}.${PLUGIN}`

  assertKnown(top, TOP_KEYS, topWhere)

  const artifacts: ArtifactRule[] = []
  const documents: DocumentRule[] = []

  for (const rule of core.owned) {
    const block = rule.pluginBlocks[PLUGIN]

    if (block === undefined) {
      continue
    }
    if (block['id-prefix'] !== undefined) {
      artifacts.push(toArtifact(rule, block))
    } else {
      documents.push(toDocument(rule, block))
    }
  }

  if (artifacts.length === 0) {
    fail(
      core.rootFile,
      `nenhuma entrada de \`owned\` traz \`${PLUGIN}.id-prefix\` — sem artefato declarado nada é enforceável. ` +
        `Declare \`plugins: [${PLUGIN}]\` na raiz e o bloco \`${PLUGIN}:\` nas entradas.`,
    )
  }

  const prefixes = new Set<string>()

  for (const artifact of artifacts) {
    if (prefixes.has(artifact.idPrefix)) {
      fail(core.rootFile, `id-prefix "${artifact.idPrefix}" declarado duas vezes. Um artefato, um dono.`)
    }
    prefixes.add(artifact.idPrefix)
  }

  const roles = new Set<string>()

  for (const document of documents) {
    if (document.role === null) {
      continue
    }
    if (roles.has(document.role)) {
      fail(core.rootFile, `papel "${document.role}" declarado em dois documentos. Um papel, um documento.`)
    }
    roles.add(document.role)
  }

  const stale = top['stale-after-months']

  return {
    rootFile: core.rootFile,
    staleAfterMonths: typeof stale === 'number' ? stale : DEFAULT_STALE_AFTER_MONTHS,
    lastReviewedBumpLimit: parseBumpLimit(top['last-reviewed-bump-limit'], topWhere),
    idFormat: parseIdFormat(top['id-format'], topWhere),
    artifacts,
    documents,
    generated: core.generated.map(rule => ({ path: rule.path, command: rule.command })),
    watches: core.watches.map(rule => ({ code: rule.code, doc: rule.doc, reason: rule.reason, consumerVisible: rule.consumerVisible })),
    core,
  }
}

/**
 * Acha o arquivo de ownership pela ordem de candidatos do núcleo, valida o
 * esquema, a disjunção e as bases (o núcleo), e depois o bloco `living-docs:`
 * com o rigor de sempre: chave desconhecida é erro. `OwnershipError` sobe como está.
 */
export function loadLivingDocsConfig(root: string): LivingDocsConfig {
  const core = resolveOwnership(root)

  if (core === null) {
    throw new OwnershipError(`nenhum arquivo de ownership encontrado em ${root}. Rode \`living-docs init\` (skill dona: living-docs-bootstrap).`)
  }

  return adaptConfig(core)
}

/**
 * Valor de um campo canônico do item, respeitando o `field-map` do artefato.
 * Devolve null para célula vazia — ausente e vazio são a mesma coisa aqui.
 */
export function fieldOf(rule: ArtifactRule, item: DocItem, canonical: string): string | null {
  const key = rule.fieldMap[normalizeFieldKey(canonical)] ?? normalizeFieldKey(canonical)
  const value = item.fields[key]

  if (value === undefined || isEmptyValue(value)) {
    return null
  }

  return value.trim()
}

function normalizePath(repoPath: string): string {
  return repoPath.split('\\').join('/').replace(/^\.\//, '')
}

/** O caminho declarado cobre este caminho? Diretório por prefixo, arquivo por igualdade. */
function covers(declared: string, repoPath: string): boolean {
  const target = declared.split('\\').join('/')

  return target.endsWith('/') ? repoPath.startsWith(target) : repoPath === target
}

/** Regra de artefato dona de um caminho relativo à raiz do repositório, ou null. */
export function findArtifactRule(config: LivingDocsConfig, repoPath: string): ArtifactRule | null {
  const normalized = normalizePath(repoPath)

  return config.artifacts.find(artifact => covers(artifact.path, normalized)) ?? null
}

/** Documento dono de um caminho relativo, ou null. Mesma semântica de `findArtifactRule`. */
export function findDocumentRule(config: LivingDocsConfig, repoPath: string): DocumentRule | null {
  const normalized = normalizePath(repoPath)

  return config.documents.find(document => covers(document.path, normalized)) ?? null
}

/** O documento que o projeto declarou com este papel, ou null. */
export function documentWithRole(config: LivingDocsConfig, role: DocumentRole): DocumentRule | null {
  return config.documents.find(document => document.role === role) ?? null
}
