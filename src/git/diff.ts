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

/** O que um arquivo ganhou e perdeu neste diff. Ordem de leitura, sem contexto. */
export interface FileEdit {
  /** Caminho relativo à raiz, sempre com `/`. */
  path: string;
  added: string[];
  removed: string[];
}

/** Só o cabeçalho de destino abre seção — `+++ /dev/null` (remoção) não abre. */
const FILE_HEADER = /^\+\+\+ b\/(.+)$/;

/**
 * O diff linha a linha, por arquivo (`RN-0027`).
 *
 * `--unified=0` porque a pergunta é "o que mudou", e não "em volta de quê":
 * linha de contexto aqui só aumentaria o texto a percorrer no PR (`RNF-0005`).
 * `--no-renames` para que renomear não vire um par de arquivos fantasma, e
 * `core.quotePath=false` pela mesma razão do `-z` de `changedPaths` — caminho
 * com acento escapado não casa com caminho nenhum.
 *
 * O estado `inHunk` não é zelo: uma linha **removida** cujo conteúdo começa com
 * `--` é escrita como `--- ...`, idêntica a um cabeçalho de origem. Só depois de
 * um `@@` uma linha é conteúdo.
 */
export function changedLines(root: string, base: string, run: GitRunner = runGitDiff): FileEdit[] {
  const output = git(
    ['-c', 'core.quotePath=false', 'diff', '--unified=0', '--no-color', '--no-renames', `${base}...HEAD`],
    root,
    run,
    `git diff --unified=0 ${base}...HEAD`,
  );

  const edits: FileEdit[] = [];
  let current: FileEdit | null = null;
  let inHunk = false;

  for (const line of output.split('\n')) {
    if (line.startsWith('diff --git ')) {
      current = null;
      inHunk = false;
      continue;
    }
    if (line.startsWith('@@')) {
      inHunk = true;
      continue;
    }
    if (!inHunk) {
      const path = FILE_HEADER.exec(line)?.[1];
      if (path !== undefined) {
        current = { path: path.replace(/\\/g, '/'), added: [], removed: [] };
        edits.push(current);
      }
      continue;
    }
    if (current === null) continue;
    if (line.startsWith('+')) current.added.push(line.slice(1));
    else if (line.startsWith('-')) current.removed.push(line.slice(1));
  }

  return edits;
}
