// The shape of a requirement ID and of a capability prefix (RN-0042).
export const PREFIX = /^[A-Z]{2,5}$/
const ID = /^([A-Z]{2,5})-(\d{3})$/

/** The last number a capability can allocate. Not configurable (RN-0046). */
export const LIMIT = 999

export interface RequirementId {
  prefix: string
  number: number
}

/** Null when the text is not a requirement ID — `CHK-14`, `CHK-1000`, `CHK-000`, `chk-014`. */
export function parseId(text: string): RequirementId | null {
  const match = ID.exec(text)

  if (match?.[1] === undefined || match[2] === undefined) {
    return null
  }

  const number = Number(match[2])

  return number === 0 ? null : { prefix: match[1], number }
}

export function formatId(prefix: string, number: number): string {
  return `${prefix}-${String(number).padStart(3, '0')}`
}
