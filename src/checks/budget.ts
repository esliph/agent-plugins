/**
 * O teto de tempo do **conjunto** de checks (`RNF-0005`, spec §9).
 *
 * Do conjunto, e não de cada check: é o conjunto que roda no PR, e um teto por
 * check aprovaria oito checks lentos. Os três candidatos conhecidos a estourá-lo
 * são `CI-5` (executa subprocesso), `CI-7` (compara frase com frase) e `CI-8`
 * (varre o corpus inteiro).
 *
 * Dois minutos é "minutos, no PR" com uma ordem de grandeza de folga sobre a
 * medida real deste repositório — e é isso que um orçamento precisa pegar:
 * regressão de ordem de grandeza, não ruído de máquina carregada. Subir este
 * número sem uma medida nova ao lado é transformá-lo de volta em intenção.
 */
export const CHECK_BUDGET_MS = 120_000;

/** Milissegundos como quem lê o log do PR os lê. */
export function formatElapsed(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}
