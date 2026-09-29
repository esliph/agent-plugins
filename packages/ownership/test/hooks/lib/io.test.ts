import { test } from 'node:test'
import assert from 'node:assert/strict'
import { askOutput, contextOutput, denyOutput } from '../../../src/hooks/lib/io.ts'

test('denyOutput e askOutput trazem hookEventName PreToolUse e a razão', () => {
  assert.match(denyOutput('x'), /"permissionDecision":"deny"/)
  assert.match(askOutput('y'), /"permissionDecision":"ask"/)
})

test('contextOutput não decide permissão', () => {
  const parsed = JSON.parse(contextOutput('PostToolUse', 'z')) as { hookSpecificOutput: Record<string, unknown> }

  assert.equal(parsed.hookSpecificOutput.additionalContext, 'z')
  assert.equal('permissionDecision' in parsed.hookSpecificOutput, false)
})
