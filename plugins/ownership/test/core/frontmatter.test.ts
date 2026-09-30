import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseFrontmatter } from '../../plugin/src/core/frontmatter.ts'

test('parseFrontmatter reads top-level keys and lines', () => {
  const result = parseFrontmatter('---\nowner: "@x"\nstatus: draft\n---\nbody\n')

  assert.equal(result?.data.owner, '@x')
  assert.equal(result?.data.status, 'draft')
  assert.equal(result?.lines.status, 3)
  assert.equal(result?.body, 'body\n')
})

test('without an opening delimiter, returns null', () => {
  assert.equal(parseFrontmatter('# title\n'), null)
})

test('parseFrontmatter locates the line of a key with an accent', () => {
  const result = parseFrontmatter('---\nsituação: draft\n---\nbody\n')

  assert.equal(result?.data.situação, 'draft')
  assert.equal(result?.lines.situação, 2)
})
