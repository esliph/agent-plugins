import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import picomatch from 'picomatch';

/**
 * Diretórios que nunca contêm documento nem citação escrita por gente.
 *
 * Vieram de `src/ids/coverage.ts`, que era o único a caminhar pela árvore até
 * `CI-4`, `CI-7` e `CI-8` também precisarem. Uma quarta cópia da mesma varredura
 * é como as três divergem.
 */
export const SKIP_DIRS: ReadonlySet<string> = new Set([
  '.git',
  'node_modules',
  'dist',
  'coverage',
  '.next',
  '.cache',
]);

/** Acima disto, é dado, não texto — e ler custa mais do que vale. */
export const MAX_BYTES = 512 * 1024;

function walk(root: string, relative: string, out: string[]): void {
  let entries: string[];
  try {
    entries = readdirSync(join(root, relative));
  } catch {
    return;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;
    const path = relative === '' ? entry : `${relative}/${entry}`;
    let isDirectory: boolean;
    try {
      isDirectory = statSync(join(root, path)).isDirectory();
    } catch {
      continue;
    }
    if (isDirectory) walk(root, path, out);
    else out.push(path);
  }
}

/**
 * Arquivos do repositório, relativos à raiz e sempre com `/`.
 *
 * Sem `globs`, tudo. Com lista vazia, nada — as duas perguntas são diferentes, e
 * confundi-las faria um check com configuração vazia varrer o repositório
 * inteiro.
 *
 * `dot: true` não é gosto: sem ele, `docs/**` **não casa** `docs/.ownership.yml`
 * nem `docs/decisions/adr/.gitkeep`, porque o padrão do picomatch é ignorar
 * arquivo que começa com ponto. O corpus de `CI-7` começa justamente pelo mapa de
 * propriedade, e um caminhador que o esconde faria o check aprovar por vacuidade
 * o único arquivo que ele não pode deixar sem dono. O que se pula de verdade é a
 * lista `SKIP_DIRS`, e ela é explícita.
 */
export function listFiles(root: string, globs?: readonly string[]): string[] {
  const files: string[] = [];
  walk(root, '', files);

  if (globs === undefined) return files;
  if (globs.length === 0) return [];

  const matches = picomatch([...globs], { dot: true });
  return files.filter((file) => matches(file));
}

/** Byte NUL é o sinal barato de "isto é dado binário, não texto". */
export function isProbablyText(content: string): boolean {
  return content.indexOf(String.fromCharCode(0)) === -1;
}

/**
 * O conteúdo do arquivo, ou `null` quando ele é grande demais, binário ou
 * ilegível. As três razões colapsam numa só porque nenhum consumidor as trata de
 * forma diferente: todas significam "não leia isto".
 */
export function readTextFile(root: string, file: string): string | null {
  try {
    if (statSync(join(root, file)).size > MAX_BYTES) return null;
    const content = readFileSync(join(root, file), 'utf8');
    return isProbablyText(content) ? content : null;
  } catch {
    return null;
  }
}
