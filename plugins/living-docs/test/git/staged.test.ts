import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { stagedPaths } from '../../plugin/src/git/staged.ts'
import type { GitRunner } from '../../plugin/src/git/staged.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const NUL = String.fromCharCode(0)

test('RN-0008: returns the index paths, without an empty entry', () => {
  const fake: GitRunner = () => `src/domain/a.ts${NUL}docs/requirements/rules.md${NUL}`

  assert.deepEqual(stagedPaths('/anywhere', fake), ['src/domain/a.ts', 'docs/requirements/rules.md'])
})

test('an empty index returns an empty list', () => {
  assert.deepEqual(
    stagedPaths('/anywhere', () => ''),
    [],
  )
})

test('RNF-0001: a git error does not block the work — returns an empty list', () => {
  const explode: GitRunner = () => {
    throw new Error('fatal: not a git repository')
  }

  assert.deepEqual(stagedPaths('/anywhere', explode), [])
})

test('the executed command is a read, and only one', () => {
  const seen: string[][] = []
  const spy: GitRunner = args => {
    seen.push([...args])

    return ''
  }

  stagedPaths('/anywhere', spy)
  assert.equal(seen.length, 1)
  assert.deepEqual(
    seen[0]?.filter(arg => ['add', 'commit', 'checkout', 'stash', 'reset'].includes(arg)),
    [],
  )
  assert.ok(seen[0]?.includes('--cached'))
  assert.ok(seen[0]?.includes('-z'))
})

test('reads the index of a real repository', () => {
  withTempRepo({ 'src/a.ts': 'export const a = 1;\n' }, root => {
    const git = (...args: string[]): void => {
      execFileSync('git', args, { cwd: root, stdio: 'ignore' })
    }

    try {
      git('init', '-q')
    } catch {
      return // no git in the environment: nothing to prove here
    }
    git('-c', 'user.email=test@example.dev', '-c', 'user.name=Test', 'commit', '-q', '-m', 'seed', '--allow-empty')
    git('add', 'src/a.ts')

    assert.deepEqual(stagedPaths(root), ['src/a.ts'])
  })
})
