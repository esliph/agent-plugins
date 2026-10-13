import { test } from 'node:test'
import assert from 'node:assert/strict'

import { OwnershipError, formatIssue } from '../plugin/src/errors.ts'

test('an issue is formatted as file, line, message and fix', () => {
  assert.equal(
    formatIssue({ file: '.ownership.yml', line: 4, message: 'owned[0].owner must start with "@"; got team', fix: 'write the owner as @user or @org/team' }),
    '.ownership.yml:4: owned[0].owner must start with "@"; got team\n  → write the owner as @user or @org/team',
  )
})

test('an issue without line or fix shows only the file and the message', () => {
  assert.equal(formatIssue({ file: 'a.yml', message: 'broken' }), 'a.yml: broken')
})

test('the error message lists every issue and the issues are frozen', () => {
  const error = new OwnershipError([
    { file: 'a.yml', line: 1, message: 'first' },
    { file: 'b.yml', message: 'second', fix: 'do this' },
  ])

  assert.equal(error.name, 'OwnershipError')
  assert.equal(error.message, 'a.yml:1: first\nb.yml: second\n  → do this')
  assert.equal(error.issues.length, 2)
  assert.ok(Object.isFrozen(error.issues))
  assert.ok(Object.isFrozen(error.issues[0]))
  assert.ok(error instanceof Error)
})
