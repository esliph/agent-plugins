import { test } from 'node:test'
import assert from 'node:assert/strict'
import { changedPaths, commitMessages, stagedPaths, runCommand } from '../../src/core/exec.ts'

test('stagedPaths falha aberta: runner que lança devolve lista vazia', () => {
  assert.deepEqual(
    stagedPaths('/repo', () => {
      throw new Error('sem git')
    }),
    [],
  )
})

test('changedPaths parseia saída NUL-separada', () => {
  assert.deepEqual(
    changedPaths('/repo', 'main', () => 'a.md\0b/c.md\0'),
    ['a.md', 'b/c.md'],
  )
})

test('commitMessages separa por NUL e apara espaço', () => {
  assert.deepEqual(
    commitMessages('/repo', 'main', () => ' msg um \0msg dois\n\ncorpo\0'),
    ['msg um', 'msg dois\n\ncorpo'],
  )
})

test('runCommand executa e devolve stdout', () => {
  assert.equal(runCommand('node -e "process.stdout.write(String(1+1))"', process.cwd()), '2')
})
