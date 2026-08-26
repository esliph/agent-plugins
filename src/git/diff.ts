import { execFileSync } from 'node:child_process';
import type { GitRunner } from './staged.ts';

/**
 * Teto de um comando git de leitura. Generoso perto dos 3 s de `staged.ts`:
 * `CI-6` roda no PR, não dentro do orçamento de 5 s de um hook (spec §7).
 */
export const TIMEOUT_MS = 10_000;

/** Falha de git que o chamador precisa ver. Não existe atalho para "não sei". */
export class GitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'GitError';
  }
}

const NUL = String.fromCharCode(0);

export const runGitDiff: GitRunner = (args, cwd) =>
  execFileSync('git', [...args], {
    cwd,
    encoding: 'utf8',
    timeout: TIMEOUT_MS,
    maxBuffer: 16 * 1024 * 1024,
    // stderr capturado, não herdado: ele vira a mensagem do GitError.
    stdio: ['ignore', 'pipe', 'pipe'],
  });

/** A primeira linha útil do erro: stderr se houver, mensagem se não. */
function reasonOf(err: unknown): string {
  const stderr = (err as { stderr?: unknown }).stderr;
  const text = String(stderr ?? '').trim() || (err instanceof Error ? err.message : String(err));
  return text.split('\n')[0] ?? text;
}

/**
 * `safe.directory=*` pelo mesmo motivo de `src/git/staged.ts`: o container roda
 * com uid diferente do dono do checkout montado (`ADR-0003`), e sem isso o git
 * recusa o repositório.
 *
 * Ao contrário de `staged.ts`, aqui **erro sobe**. Lá quem chama é um hook, e
 * silêncio custa uma pergunta a menos; aqui quem chama é um check, e silêncio
 * custa um contrato quebrado passando com a autoridade de um CI verde
 * (`ADR-0006`, decisão 3).
 */
function git(args: readonly string[], root: string, run: GitRunner, what: string): string {
  try {
    return run(['-c', 'safe.directory=*', ...args], root);
  } catch (err) {
    throw new GitError(`${what} falhou: ${reasonOf(err)}`);
  }
}

/**
 * Caminhos que esta branch mudou em relação à base, sempre com `/`.
 *
 * Três pontos, e não dois: parte do merge-base, então o que entrou na base
 * depois que a branch saiu **não** conta como mudança da branch (`ADR-0006`).
 * `-z` porque sem ele o git envolve em aspas e escapa caminho com acento, e
 * caminho escapado não casa com glob nenhum.
 */
export function changedPaths(root: string, base: string, run: GitRunner = runGitDiff): string[] {
  const output = git(
    ['diff', '--name-only', '-z', `${base}...HEAD`],
    root,
    run,
    `git diff ${base}...HEAD`,
  );

  return output
    .split(NUL)
    .map((path) => path.trim().replace(/\\/g, '/'))
    .filter((path) => path !== '');
}

/**
 * Mensagens completas dos commits que esta branch acrescentou.
 *
 * Dois pontos aqui, de propósito: a pergunta é "quais commits são desta
 * branch", não "qual é a diferença de conteúdo". `%x00` separa as mensagens
 * porque elas têm linhas em branco por dentro — o rótulo de exceção é um
 * trailer, e trailer mora depois de uma linha em branco.
 */
export function commitMessages(root: string, base: string, run: GitRunner = runGitDiff): string[] {
  const output = git(
    ['log', '--format=%B%x00', `${base}..HEAD`],
    root,
    run,
    `git log ${base}..HEAD`,
  );

  return output
    .split(NUL)
    .map((message) => message.trim())
    .filter((message) => message !== '');
}
