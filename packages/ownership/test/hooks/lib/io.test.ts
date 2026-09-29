import { test } from 'node:test'
import assert from 'node:assert/strict'
import { askOutput, contextOutput, denyOutput } from '../../../src/hooks/lib/io.ts'

test('denyOutput e askOutput bring hookEventName PreToolUse and the reason', () => {
  assert.match(denyOutput('x'), /"permissionDecision":"deny"/)
  assert.match(askOutput('y'), /"permissionDecision":"ask"/)
})

test('contextOutput does not decide permission', () => {
  const parsed = JSON.parse(contextOutput('PostToolUse', 'z')) as { hookSpecificOutput: Record<string, unknown> }

  assert.equal(parsed.hookSpecificOutput.additionalContext, 'z')
  assert.equal('permissionDecision' in parsed.hookSpecificOutput, false)
})
