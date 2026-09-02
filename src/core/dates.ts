/**
 * A única fonte de data do toolkit (`ADR-0007`, `RNF-0004`).
 *
 * Nenhum check e nenhum hook lê o relógio por dentro: quem lê é a borda — o CLI,
 * o hook, ou o teste — e a data entra por valor. Sem isso, o resultado de `CI-4`
 * mudaria sozinho com o passar do tempo, e o único teste possível seria o que
 * passa hoje e reprova em seis meses.
 */
export type Clock = () => Date

/** Hoje, em ISO (`YYYY-MM-DD`), em UTC. */
export function todayIso(clock: Clock = () => new Date()): string {
  return clock().toISOString().slice(0, 10)
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * O valor como data ISO, ou `null` quando não é data.
 *
 * `Date` entra porque o YAML de alguns projetos declara timestamp de verdade e o
 * parser o materializa. `null` significa "não sei", e quem não sabe se cala:
 * `CI-1` já cobra o formato de `last-reviewed`, e dois checks reclamando do mesmo
 * campo é ruído.
 */
export function asIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  }
  if (typeof value !== 'string') {
    return null
  }
  const trimmed = value.trim()

  return ISO.test(trimmed) ? trimmed : null
}

/**
 * Meses de calendário de `from` até `to`; negativo quando `from` está no futuro,
 * `null` quando alguma das duas não é ISO.
 *
 * Meses, não dias, de propósito: `stale-after-months` é o campo que o projeto
 * declara, e precisão de dia não muda nenhuma decisão que o aviso provoca.
 */
export function monthsBetween(from: string, to: string): number | null {
  const start = ISO.exec(from.trim())
  const end = ISO.exec(to.trim())

  if (!start || !end) {
    return null
  }

  let months = (Number(end[1]) - Number(start[1])) * 12 + (Number(end[2]) - Number(start[2]))
  const startDay = Number(start[3])
  const endDay = Number(end[3])

  if (months > 0 && endDay < startDay) {
    months -= 1
  } else if (months < 0 && endDay > startDay) {
    months += 1
  }

  return months
}
