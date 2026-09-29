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
