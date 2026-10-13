import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

import { runCli } from '../helpers/cli.ts'
import { git, tempRepo } from '../helpers/repo.ts'

const TOP = 20
const SUB = 50
const PER_DIRECTORY = 100
const FILES = TOP * SUB * PER_DIRECTORY
const BUDGET_MS = 2000

const name = (prefix: string, index: number): string => `${prefix}-${String(index).padStart(2, '0')}`

/** 100,000 empty files, half of them tracked and half new: the listing has to merge the index with a walk of the tree. */
function populate(root: string): void {
  const fill = (from: number, to: number): void => {
    for (let top = 0; top < TOP; top++) {
      for (let sub = from; sub < to; sub++) {
        const dir = join(root, name('pkg', top), name('mod', sub))

        mkdirSync(dir, { recursive: true })

        for (let file = 0; file < PER_DIRECTORY; file++) {
          writeFileSync(join(dir, `file-${file}.ts`), '')
        }
      }
    }
  }

  fill(0, SUB / 2)
  git(root, 'add', '-A')
  fill(SUB / 2, SUB)
}

test(`owner coverage of a repository of ${FILES} files takes less than ${BUDGET_MS} ms`, { timeout: 900_000 }, t => {
  const entries = Array.from({ length: TOP }, (_, top) => `  - path: ${name('pkg', top)}/\n    owner: '@team-${top}'\n`).join('')
  const root = tempRepo(t, { '.ownership.yml': `version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@root'\n${entries}`, 'stray.ts': '' })

  populate(root)

  const args = ['validate', '--check', 'ownership/owner-coverage']
  const expected = [
    'stray.ts  ownership/owner-coverage  error  no owned entry covers this file',
    '  → declare it in owned[] of .ownership.yml, or leave it out with ignore[]',
    'ownership: 1 error, 0 warnings.',
    '',
  ].join('\n')

  // The first run warms the file system cache and proves the check saw every file: the one without an owner is the only finding.
  const warmUp = runCli(args, { cwd: root })

  assert.equal(warmUp.stderr, '')
  assert.equal(warmUp.stdout, expected)

  // The best of three: the budget is about the work the check does, not about a busy machine.
  const times = Array.from({ length: 3 }, () => {
    const start = performance.now()
    const result = runCli(args, { cwd: root })

    assert.equal(result.status, 1)
    assert.equal(result.stdout, expected)

    return performance.now() - start
  })

  t.diagnostic(`runs: ${times.map(time => `${Math.round(time)} ms`).join(', ')}`)
  assert.ok(Math.min(...times) < BUDGET_MS, `the fastest of three runs took ${Math.round(Math.min(...times))} ms`)
})
