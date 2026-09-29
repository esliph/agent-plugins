import { test } from 'node:test'
import assert from 'node:assert/strict'
import { runExplain } from '../../src/cli/explain.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('sem arquivo de ownership, diz isso', () => {
  withTempRepo({}, root => {
    assert.match(runExplain(root, 'x.md'), /no ownership file/)
  })
})

test('com arquivo, delega para explainPath', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned:\n  - path: docs/x.md\n    owner: "@a"\n' }, root => {
    assert.match(runExplain(root, 'docs/x.md'), /@a/)
  })
})
