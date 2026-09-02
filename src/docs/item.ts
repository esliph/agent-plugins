/**
 * Um item dentro de um artefato de coleção — uma linha de tabela (Open
 * Decisions) ou uma seção com ID (requisitos). Os dois têm a mesma forma para
 * que check e hook não precisem saber qual dos dois estão lendo.
 */
export interface DocItem {
  id: string
  status: string
  /** Linha 1-indexed no arquivo inteiro. */
  line: number
  /** Tudo que o item declara, por chave normalizada. */
  fields: Record<string, string>
}

/** Chave comparável: minúscula, sem espaço nas pontas, sem `:` final. */
export function normalizeKey(key: string): string {
  return key.trim().replace(/:$/, '').trim().toLowerCase()
}

/** Marcadores de "vazio" usados em tabela de markdown. */
const EMPTY = new Set(['', '-', '—', '–', 'n/a', 'na', 'null', 'nenhum', 'nenhuma'])

export function isEmptyValue(value: string): boolean {
  return EMPTY.has(value.trim().toLowerCase())
}
