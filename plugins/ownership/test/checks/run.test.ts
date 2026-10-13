import { test } from 'node:test'
import assert from 'node:assert/strict'
import { rmSync } from 'node:fs'
import { join } from 'node:path'

import { compareFindings, createCheckContext, runChecks } from '../../plugin/src/checks/run.ts'
import type { Check, Finding } from '../../plugin/src/checks/types.ts'
import { finding } from '../../plugin/src/checks/types.ts'
import { listRepoFiles } from '../../plugin/src/repo/repo.ts'
import { resolveOwnership } from '../../plugin/src/resolve/resolve.ts'
import { tempRepo } from '../helpers/repo.ts'

const f = (file: string, line: number | undefined, checkId: string, message: string): Finding => finding({ file, line, checkId, severity: 'error', message })

test('a finding keeps only the fields it has', () => {
  assert.deepEqual(Object.keys(f('a', undefined, 'x/y', 'm')), ['file', 'checkId', 'severity', 'message'])
})

test('findings are ordered by file, line (none first), check and message', () => {
  const sorted = [f('b', 1, 'a/a', 'm'), f('a', 2, 'a/a', 'm'), f('a', undefined, 'a/b', 'm'), f('a', 2, 'a/a', 'l'), f('a', 1, 'b/b', 'm')].sort(
    compareFindings,
  )

  assert.deepEqual(
    sorted.map(item => `${item.file}:${item.line ?? '-'}:${item.checkId}:${item.message}`),
    ['a:-:a/b:m', 'a:1:b/b:m', 'a:2:a/a:l', 'a:2:a/a:m', 'b:1:a/a:m'],
  )
})

test('the runner sorts after every check has run, whatever the order of the checks', async t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\n' })
  const repoFiles = listRepoFiles(root)
  const config = resolveOwnership(root, { repoFiles })

  assert.ok(config !== null)

  const one: Check = { id: 'x/one', name: 'One', failsWhen: '-', run: () => Promise.resolve([f('z', 1, 'x/one', 'm')]) }
  const two: Check = { id: 'x/two', name: 'Two', failsWhen: '-', run: () => Promise.resolve([f('a', 1, 'x/two', 'm')]) }
  const ctx = createCheckContext(config, repoFiles, 1)

  assert.deepEqual(await runChecks([one, two], ctx), await runChecks([two, one], ctx))
  assert.equal((await runChecks([one, two], ctx))[0]?.file, 'a')
})

test('the CODEOWNERS is loaded once, on demand', t => {
  const root = tempRepo(t, { '.ownership.yml': 'version: 1\n' }, { codeowners: '* @a\n' })
  const repoFiles = listRepoFiles(root)
  const config = resolveOwnership(root, { repoFiles })

  assert.ok(config !== null)

  const ctx = createCheckContext(config, repoFiles, 1)
  const first = ctx.codeowners()

  rmSync(join(root, 'CODEOWNERS'))

  assert.equal(ctx.codeowners(), first)
  assert.equal(first?.lines.length, 1)
})
