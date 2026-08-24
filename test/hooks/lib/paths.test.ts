import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toRepoPath } from '../../../src/hooks/lib/paths.ts';

// Raízes de exemplo, deliberadamente neutras: o caminho de container real mora
// no compose e nos wrappers, nunca em código (ADR-0003).
const ROOTS = ['/srv/repo', '/mnt/c/Users/dev/repo'];

test('converte caminho do host em caminho do repositório', () => {
  assert.equal(toRepoPath('/mnt/c/Users/dev/repo/docs/a.md', ROOTS), 'docs/a.md');
});

test('converte caminho do container', () => {
  assert.equal(toRepoPath('/srv/repo/docs/a.md', ROOTS), 'docs/a.md');
});

test('normaliza separadores do Windows e ./', () => {
  assert.equal(toRepoPath('C:\\Users\\dev\\repo\\docs\\a.md', ['C:/Users/dev/repo']), 'docs/a.md');
  assert.equal(toRepoPath('./docs/a.md', ROOTS), 'docs/a.md');
});

test('caminho relativo passa direto', () => {
  assert.equal(toRepoPath('docs/a.md', ROOTS), 'docs/a.md');
});

test('caminho absoluto fora de qualquer raiz devolve null', () => {
  assert.equal(toRepoPath('/etc/passwd', ROOTS), null);
});

test('a própria raiz não é um arquivo dentro dela', () => {
  assert.equal(toRepoPath('/srv/repo', ROOTS), null);
});
