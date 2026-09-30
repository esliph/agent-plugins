/**
 * Exception label in a commit message: `<Label>: none — <reason>`.
 *
 * `Changelog` by `ADR-0006`, `Docs` by `ADR-0010`. The separator is mandatory and
 * so is the reason: a label without a reason is a ticked box, and a ticked box
 * switches the mechanism off while pretending to comply with it. Two labels are already the start of a
 * family — the third needs its own ADR.
 */
export function exceptionReasonFor(label: string, messages: readonly string[]): string | null {
  const pattern = new RegExp(`^[ \\t]*${label}:[ \\t]*none[ \\t]*[—–:-][ \\t]*(\\S.*)$`, 'im')

  for (const message of messages) {
    const reason = pattern.exec(message)?.[1]?.trim()

    if (reason) {
      return reason
    }
  }

  return null
}
