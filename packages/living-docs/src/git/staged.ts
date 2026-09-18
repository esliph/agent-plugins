import { execFileSync } from 'node:child_process'

/** Executor de git, injetável: o teste não precisa de um repositório para provar o resto. */
export type GitRunner = (args: readonly string[], cwd: string) => string

/** Teto local; o orçamento do hook inteiro é 5 s (spec §7). */
const TIMEOUT_MS = 3_000

const runGit: GitRunner = (args, cwd) =>
  execFileSync('git', [...args], {
    cwd,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    stdio: ['ignore', 'pipe', 'ignore'],
  })

/**
 * Caminhos no índice, relativos à raiz do repositório e sempre com `/`.
 *
 * `-z` porque o git envolve em aspas e escapa caminho com acento ou espaço, e um
 * caminho escapado não casa com glob nenhum. `safe.directory=*` porque o hook roda
 * no container com uid diferente do dono do checkout montado (`ADR-0003`), e sem
 * isso o git recusa o repositório.
 *
 * Falha aberta (`RNF-0001`): erro nenhum sobe daqui. Lista vazia significa "não
 * sei", e quem chama trata "não sei" como "deixe passar".
 */
export function stagedPaths(root: string, run: GitRunner = runGit): string[] {
  let output: string

  try {
    output = run(['-c', 'safe.directory=*', 'diff', '--cached', '--name-only', '-z'], root)
  } catch {
    return []
  }

  return output
    .split(String.fromCharCode(0))
    .map(path => path.trim().replace(/\\/g, '/'))
    .filter(path => path !== '')
}
