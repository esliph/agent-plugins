import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownershipOwnerCoverage } from '../../src/checks/owner-coverage.ts'
import { forgetTree } from '../../src/core/files.ts'
import { buildConfig } from '../helpers/config.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const today = '2026-09-17'

test('missing CODEOWNERS is a finding', () => {
  withTempRepo({ 'docs/x.md': 'x' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/x.md', owner: '@a' }] })

    assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => /CODEOWNERS is missing/.test(f.message)))
  })
})

test('declared path that does not exist in the repository is a finding', () => {
  withTempRepo({ CODEOWNERS: 'docs/x.md @a\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/x.md', owner: '@a' }], ignore: ['CODEOWNERS'] })

    assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => /does not exist/.test(f.message)))
  })
})

test('existing path with no line in CODEOWNERS is a finding', () => {
  withTempRepo({ 'docs/x.md': 'x', CODEOWNERS: 'docs/y.md @a\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/x.md', owner: '@a' }], ignore: ['CODEOWNERS'] })

    assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => /has no line/.test(f.message)))
  })
})

test('file with no rule in owned[] is a finding; one matching ignore is not', () => {
  withTempRepo({ 'src/a.ts': 'x', 'vendor/lib.js': 'x', CODEOWNERS: '* @a\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ ignore: ['vendor/**', 'CODEOWNERS'] })
    const findings = ownershipOwnerCoverage().run({ root, config, today })

    assert.deepEqual(
      findings.map(f => f.file),
      ['src/a.ts'],
    )
  })
})

test('the ownership file itself needs an owner like any other', () => {
  withTempRepo({ '.ownership.yml': 'x', CODEOWNERS: '* @a\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ ignore: ['CODEOWNERS'] })

    assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => f.file === '.ownership.yml'))
  })
})

test('watches with a nonexistent doc or no rule in owned[] is a finding', () => {
  withTempRepo({ 'src/a.ts': 'x', 'README.md': 'x', CODEOWNERS: '* @a\n' }, root => {
    forgetTree(root)
    const config = buildConfig({
      owned: [{ path: 'src/', owner: '@a' }],
      watches: [
        { code: 'src/**', doc: 'docs/does-not-exist.md' },
        { code: 'src/**', doc: 'README.md' },
      ],
      ignore: ['CODEOWNERS', 'README.md'],
    })
    const messages = ownershipOwnerCoverage()
      .run({ root, config, today })
      .map(f => f.message)

    assert.ok(messages.some(m => /docs\/does-not-exist\.md.*does not exist/.test(m)))
    assert.ok(messages.some(m => /README\.md.*no rule/.test(m)))
  })
})

test('all covered: no finding', () => {
  withTempRepo({ 'docs/decisions/adr/x.md': 'x', CODEOWNERS: 'docs/decisions/adr/ @a\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a' }], ignore: ['CODEOWNERS'] })

    assert.deepEqual(ownershipOwnerCoverage().run({ root, config, today }), [])
  })
})
