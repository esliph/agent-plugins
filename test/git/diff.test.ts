import { test } from 'node:test';
import assert from 'node:assert/strict';
import { changedLines, changedPaths, commitMessages, GitError } from '../../src/git/diff.ts';

const NUL = String.fromCharCode(0);

/** Runner falso: grava os argumentos recebidos e devolve a saída combinada. */
function fake(output: string): { run: (args: readonly string[], cwd: string) => string; calls: string[][] } {
  const calls: string[][] = [];
  return {
    calls,
    run: (args) => {
      calls.push([...args]);
      return output;
    },
  };
}

test('ADR-0006: changedPaths usa três pontos, -z e safe.directory', () => {
  const git = fake(`src/cli/index.ts${NUL}CHANGELOG.md${NUL}`);
  const paths = changedPaths('/repo', 'origin/master', git.run);

  assert.deepEqual(paths, ['src/cli/index.ts', 'CHANGELOG.md']);
  assert.deepEqual(git.calls[0], [
    '-c',
    'safe.directory=*',
    'diff',
    '--name-only',
    '-z',
    'origin/master...HEAD',
  ]);
});

test('ADR-0006: caminho com acento volta inteiro, sem aspas nem escape', () => {
  const git = fake(`docs/decisões.md${NUL}`);
  assert.deepEqual(changedPaths('/repo', 'base', git.run), ['docs/decisões.md']);
});

test('changedPaths normaliza a barra e descarta entrada vazia', () => {
  const git = fake(`src\\cli\\index.ts${NUL}${NUL}`);
  assert.deepEqual(changedPaths('/repo', 'base', git.run), ['src/cli/index.ts']);
});

test('ADR-0006: commitMessages usa dois pontos e separa por NUL', () => {
  const git = fake(`feat: um${NUL}\nfix: dois\n\nChangelog: none — razão${NUL}\n`);
  const messages = commitMessages('/repo', 'origin/master', git.run);

  assert.deepEqual(messages, ['feat: um', 'fix: dois\n\nChangelog: none — razão']);
  assert.deepEqual(git.calls[0], [
    '-c',
    'safe.directory=*',
    'log',
    '--format=%B%x00',
    'origin/master..HEAD',
  ]);
});

test('ADR-0006: erro de git vira GitError — este módulo não falha aberta', () => {
  const run = () => {
    const err = new Error('Command failed') as Error & { stderr: string };
    err.stderr = "fatal: bad revision 'origem/nao-existe'\n";
    throw err;
  };

  assert.throws(
    () => changedPaths('/repo', 'origem/nao-existe', run),
    (err: unknown) => err instanceof GitError && /bad revision/.test((err as Error).message),
  );
  assert.throws(() => commitMessages('/repo', 'x', run), GitError);
});

test('GitError nomeia o comando que falhou, não só a causa', () => {
  const run = () => {
    throw new Error('spawn git ENOENT');
  };
  assert.throws(
    () => changedPaths('/repo', 'base', run),
    (err: unknown) => err instanceof GitError && /git diff base\.\.\.HEAD/.test((err as Error).message),
  );
});

const PATCH = [
  'diff --git a/docs/glossary.md b/docs/glossary.md',
  'index 1111111..2222222 100644',
  '--- a/docs/glossary.md',
  '+++ b/docs/glossary.md',
  '@@ -6 +6 @@',
  '-last-reviewed: 2026-01-01',
  '+last-reviewed: 2026-08-31',
  'diff --git a/docs/apagado.md b/docs/apagado.md',
  'deleted file mode 100644',
  '--- a/docs/apagado.md',
  '+++ /dev/null',
  '@@ -1,2 +0,0 @@',
  '-titulo',
  '--- isto e conteudo removido, nao cabecalho',
  '',
].join('\n');

test('RN-0027: changedLines separa por arquivo e nao confunde conteudo com cabecalho', () => {
  const git = fake(PATCH);
  const edits = changedLines('/repo', 'origin/master', git.run);

  // O arquivo apagado nao vira edicao: `+++ /dev/null` nao abre secao, e as
  // linhas removidas dele nao vazam para o arquivo anterior.
  assert.deepEqual(edits, [
    {
      path: 'docs/glossary.md',
      added: ['last-reviewed: 2026-08-31'],
      removed: ['last-reviewed: 2026-01-01'],
    },
  ]);

  assert.deepEqual(git.calls[0], [
    '-c',
    'safe.directory=*',
    '-c',
    'core.quotePath=false',
    'diff',
    '--unified=0',
    '--no-color',
    '--no-renames',
    'origin/master...HEAD',
  ]);
});
