import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formatFindings } from '../../src/cli/report.ts'

test('sem achados, mensagem única', () => {
  assert.equal(formatFindings([]), 'ownership: nenhuma violação encontrada.')
})

test('com achados, lista local, regra, severidade, mensagem e correção, com o total no fim', () => {
  const text = formatFindings([{ ruleId: 'ownership/x', file: 'a.md', line: 3, severity: 'error', message: 'm', fix: 'f' }])

  assert.match(text, /a\.md:3/)
  assert.match(text, /ownership\/x/)
  assert.match(text, /1 erro/)
})
