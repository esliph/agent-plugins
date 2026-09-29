import { test } from 'node:test'
import assert from 'node:assert/strict'
import { GitError, changedPaths, commitMessages, stagedPaths, runCommand } from '../../src/core/exec.ts'

test('stagedPaths fails open: a runner that throws returns an empty list', () => {
  assert.deepEqual(
    stagedPaths('/repo', () => {
      throw new Error('no git')
    }),
    [],
  )
})

test('changedPaths parses NUL-separated output', () => {
  assert.deepEqual(
    changedPaths('/repo', 'main', () => 'a.md\0b/c.md\0'),
    ['a.md', 'b/c.md'],
  )
})

test('commitMessages splits on NUL and trims whitespace', () => {
  assert.deepEqual(
    commitMessages('/repo', 'main', () => ' msg one \0msg two\n\nbody\0'),
    ['msg one', 'msg two\n\nbody'],
  )
})

test('runCommand executes and returns stdout', () => {
  assert.equal(runCommand('node -e "process.stdout.write(String(1+1))"', process.cwd()), '2')
})

test('changedPaths with a base that does not resolve throws GitError — the check does not invent an empty diff', () => {
  assert.throws(
    () =>
      changedPaths('/repo', 'does-not-exist', () => {
        throw new Error('fatal: bad revision')
      }),
    GitError,
  )
})
