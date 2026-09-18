import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFrontmatter } from '../../src/core/frontmatter.ts'

test('parseFrontmatter lê chaves de topo e linhas', () => {
  const result = parseFrontmatter('---\nowner: "@x"\nstatus: draft\n---\ncorpo\n')

  assert.equal(result?.data.owner, '@x')
  assert.equal(result?.data.status, 'draft')
  assert.equal(result?.lines.status, 3)
  assert.equal(result?.body, 'corpo\n')
})

test('sem delimitador de abertura, devolve null', () => {
  assert.equal(parseFrontmatter('# título\n'), null)
})

test('parseFrontmatter localiza a linha de uma chave com acento', () => {
  const result = parseFrontmatter('---\nsituação: draft\n---\ncorpo\n')

  assert.equal(result?.data.situação, 'draft')
  assert.equal(result?.lines.situação, 2)
})
