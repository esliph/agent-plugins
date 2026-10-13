import { test } from 'node:test'
import assert from 'node:assert/strict'

import { codeownersMatch } from '../../plugin/src/checks/codeowners-match.ts'
import { OwnershipError } from '../../plugin/src/errors.ts'
import { runCheck } from '../helpers/check.ts'
import { tempRepo } from '../helpers/repo.ts'

const OWNERSHIP = "version: 1\nowned:\n  - path: .ownership.yml\n    owner: '@team'\n  - path: docs/\n    owner: '@Team'\n"
const FILES = { '.ownership.yml': OWNERSHIP, 'docs/a.md': '' }

test('a repository without CODEOWNERS has nothing to check', async t => {
  assert.deepEqual(await runCheck(codeownersMatch, tempRepo(t, FILES)), [])
})

test('the declared owner on the effective line passes, without regard to case and among other owners', async t => {
  assert.deepEqual(await runCheck(codeownersMatch, tempRepo(t, FILES, { codeowners: '.ownership.yml @team\n/docs/ @lead @team\n' })), [])
})

test('a declared path with no effective line is a finding on its entry', async t => {
  const findings = await runCheck(codeownersMatch, tempRepo(t, FILES, { codeowners: '.ownership.yml @team\n' }))

  assert.deepEqual(findings, [
    {
      file: '.ownership.yml',
      line: 5,
      checkId: 'ownership/codeowners-match',
      severity: 'error',
      message: 'owned[1].path "docs/" has no matching line in CODEOWNERS',
      fix: 'add "/docs/ @Team" to CODEOWNERS',
    },
  ])
})

test('a declared owner missing from the effective line names the line and its owners', async t => {
  const findings = await runCheck(codeownersMatch, tempRepo(t, FILES, { codeowners: '* @team\ndocs/ @team\ndocs/ @other @lead\n' }))

  assert.deepEqual(
    findings.map(item => [item.line, item.message, item.fix]),
    [[5, 'owned[1].owner "@Team" is not on CODEOWNERS line 3, which assigns @other @lead', 'add @Team to CODEOWNERS line 3, or correct the owner']],
  )
})

test('a line with a pattern and no owner leaves the path with no owner', async t => {
  const findings = await runCheck(codeownersMatch, tempRepo(t, FILES, { codeowners: '* @team\ndocs/\n' }))

  assert.equal(findings[0]?.message, 'owned[1].owner "@Team" is not on CODEOWNERS line 2, which assigns no owner')
})

test('a directory is evaluated by its declared path, not file by file', async t => {
  const findings = await runCheck(codeownersMatch, tempRepo(t, FILES, { codeowners: '.ownership.yml @team\ndocs/**/*.md @team\n' }))

  assert.equal(findings[0]?.message, 'owned[1].path "docs/" has no matching line in CODEOWNERS')
})

test('more than one CODEOWNERS is a load error', async t => {
  const root = tempRepo(t, { ...FILES, '.github/CODEOWNERS': '* @team\n' }, { codeowners: '* @team\n' })

  await assert.rejects(runCheck(codeownersMatch, root), OwnershipError)
})
