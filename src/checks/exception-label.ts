/**
 * Rótulo de exceção numa mensagem de commit: `<Label>: none — <razão>`.
 *
 * `Changelog` por `ADR-0006`, `Docs` por `ADR-0010`. O separador é obrigatório e
 * a razão também: rótulo sem razão é caixinha marcada, e caixinha marcada
 * desliga o mecanismo fingindo cumpri-lo. Dois rótulos já são o começo de uma
 * família — o terceiro precisa de ADR próprio.
 */
export function exceptionReasonFor(label: string, messages: readonly string[]): string | null {
  const pattern = new RegExp(`^[ \\t]*${label}:[ \\t]*none[ \\t]*[—–:-][ \\t]*(\\S.*)$`, 'im');

  for (const message of messages) {
    const reason = pattern.exec(message)?.[1]?.trim();
    if (reason) return reason;
  }

  return null;
}
