import { test } from 'node:test'
import assert from 'node:assert/strict'

import { splitSuggestion } from '../../plugin/src/resolve/split.ts'

const FILES = new Set(['docs/README.md', 'docs/adr/1.md', 'docs/api/index.md', 'docs/api/v1/y.md', 'docs/api/v2/z.md', 'docs/vendor/x.js', 'src/a.ts'])

test('each level from the outer to the inner path lists its other children, directories with a slash', () => {
  assert.deepEqual(
    splitSuggestion('docs/', 'docs/api/v1/', FILES, () => false),
    ['docs/README.md', 'docs/adr/', 'docs/api/index.md', 'docs/api/v2/', 'docs/vendor/'],
  )
})

test('a child under an ignore is left out', () => {
  assert.deepEqual(
    splitSuggestion('docs/', 'docs/api/v1/', FILES, path => path.startsWith('docs/vendor/')),
    ['docs/README.md', 'docs/adr/', 'docs/api/index.md', 'docs/api/v2/'],
  )
})

test('an inner file is skipped by its name', () => {
  assert.deepEqual(
    splitSuggestion('docs/', 'docs/README.md', FILES, () => false),
    ['docs/adr/', 'docs/api/', 'docs/vendor/'],
  )
})
