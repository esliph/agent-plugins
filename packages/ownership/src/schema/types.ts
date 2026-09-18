export type Collection = 'per-file' | 'table' | 'sections'
export type SectionKeyMode = 'first-token' | 'heading'

export interface FormatBlock {
  collection: Collection
  /** Nome da coluna, quando `collection` é `table`. Null nos outros dois casos. */
  key: string | null
  /** Só quando `collection` é `sections`. */
  keyMode: SectionKeyMode | null
  /** Normalizado (minúsculo, sem espaço nas pontas). Default `'status'`. */
  stateField: string
}

export interface DerivesFrom {
  source: string
  field: string
}

export interface OwnedRuleRaw {
  path: string
  /** Obrigatório: sem cascata, nenhuma entrada herda dono de outro arquivo (spec §5). */
  owner: string
  skill: string | null
  /** Vocabulário do projeto; `null` quando o caminho não declara ciclo de vida. */
  states: string[] | null
  format: FormatBlock
  /** Se o arquivo escreveu `format:` — o default do parser não é declaração. */
  formatDeclared: boolean
  derivesFrom: DerivesFrom | null
  /** Por nome de plugin declarado em `plugins:`. Conteúdo opaco ao núcleo. */
  pluginBlocks: Record<string, unknown>
}

export interface GeneratedRuleRaw {
  path: string
  command: string
}

export interface WatchRuleRaw {
  code: string
  doc: string
  reason: string | null
  consumerVisible: boolean
}

export interface ParsedFile {
  /** Caminho deste arquivo de ownership, relativo à raiz do repositório. */
  file: string
  /** Diretório deste arquivo, relativo à raiz. `''` para a raiz do repositório. */
  dir: string
  version: 2
  /** Desloca a base para dentro do diretório do arquivo; `null` quando a base é o próprio diretório. */
  basePath: string | null
  owned: OwnedRuleRaw[]
  generated: GeneratedRuleRaw[]
  watches: WatchRuleRaw[]
  ignore: string[]
  include: string[]
}

export interface RootFile extends ParsedFile {
  plugins: string[]
}

export class OwnershipError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OwnershipError'
  }
}
