import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { stagedPaths } from '../../src/git/staged.ts'
import type { GitRunner } from '../../src/git/staged.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const NUL = String.fromCharCode(0)

test('RN-0008: devolve os caminhos do índice, sem entrada vazia', () => {
  const fake: GitRunner = () => `src/domain/a.ts${NUL}docs/requirements/rules.md${NUL}`

  assert.deepEqual(stagedPaths('/qualquer', fake), ['src/domain/a.ts', 'docs/requirements/rules.md'])
})

test('índice vazio devolve lista vazia', () => {
  assert.deepEqual(
    stagedPaths('/qualquer', () => ''),
    [],
  )
})

test('RNF-0001: erro do git não trava o trabalho — devolve lista vazia', () => {
  const explode: GitRunner = () => {
    throw new Error('fatal: not a git repository')
  }

  assert.deepEqual(stagedPaths('/qualquer', explode), [])
})

test('o comando executado é de leitura, e só um', () => {
  const seen: string[][] = []
  const spy: GitRunner = args => {
    seen.push([...args])

    return ''
  }

  stagedPaths('/qualquer', spy)
  assert.equal(seen.length, 1)
  assert.deepEqual(
    seen[0]?.filter(arg => ['add', 'commit', 'checkout', 'stash', 'reset'].includes(arg)),
    [],
  )
  assert.ok(seen[0]?.includes('--cached'))
  assert.ok(seen[0]?.includes('-z'))
})

test('lê o índice de um repositório de verdade', () => {
  withTempRepo({ 'src/a.ts': 'export const a = 1;\n' }, root => {
    const git = (...args: string[]): void => {
      execFileSync('git', args, { cwd: root, stdio: 'ignore' })
    }

    try {
      git('init', '-q')
    } catch {
      return // sem git no ambiente: nada a provar aqui
    }
    git('-c', 'user.email=teste@exemplo.dev', '-c', 'user.name=Teste', 'commit', '-q', '-m', 'seed', '--allow-empty')
    git('add', 'src/a.ts')

    assert.deepEqual(stagedPaths(root), ['src/a.ts'])
  })
})
