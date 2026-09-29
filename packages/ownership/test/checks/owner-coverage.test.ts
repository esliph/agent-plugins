import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownershipOwnerCoverage } from '../../src/checks/owner-coverage.ts'
import { forgetTree } from '../../src/core/files.ts'
import { buildConfig } from '../helpers/config.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const today = '2026-09-17'

test('CODEOWNERS ausente é achado', () => {
  withTempRepo({ 'docs/x.md': 'x' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/x.md', owner: '@a' }] })

    assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => /CODEOWNERS is missing/.test(f.message)))
  })
})

test('caminho declarado que não existe no repositório é achado', () => {
  withTempRepo({ CODEOWNERS: 'docs/x.md @a\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/x.md', owner: '@a' }], ignore: ['CODEOWNERS'] })

    assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => /does not exist/.test(f.message)))
  })
})

test('caminho existente sem linha no CODEOWNERS é achado', () => {
  withTempRepo({ 'docs/x.md': 'x', CODEOWNERS: 'docs/y.md @a\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/x.md', owner: '@a' }], ignore: ['CODEOWNERS'] })

    assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => /has no line/.test(f.message)))
  })
})

test('arquivo sem regra em owned[] é achado; o que casa com ignore não é', () => {
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

test('o próprio arquivo de ownership precisa de dono como qualquer outro', () => {
  withTempRepo({ '.ownership.yml': 'x', CODEOWNERS: '* @a\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ ignore: ['CODEOWNERS'] })

    assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => f.file === '.ownership.yml'))
  })
})

test('watches com doc inexistente ou sem regra em owned[] é achado', () => {
  withTempRepo({ 'src/a.ts': 'x', 'README.md': 'x', CODEOWNERS: '* @a\n' }, root => {
    forgetTree(root)
    const config = buildConfig({
      owned: [{ path: 'src/', owner: '@a' }],
      watches: [
        { code: 'src/**', doc: 'docs/nao-existe.md' },
        { code: 'src/**', doc: 'README.md' },
      ],
      ignore: ['CODEOWNERS', 'README.md'],
    })
    const messages = ownershipOwnerCoverage()
      .run({ root, config, today })
      .map(f => f.message)

    assert.ok(messages.some(m => /docs\/nao-existe\.md.*does not exist/.test(m)))
    assert.ok(messages.some(m => /README\.md.*no rule/.test(m)))
  })
})

test('tudo coberto: nenhum achado', () => {
  withTempRepo({ 'docs/decisions/adr/x.md': 'x', CODEOWNERS: 'docs/decisions/adr/ @a\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a' }], ignore: ['CODEOWNERS'] })

    assert.deepEqual(ownershipOwnerCoverage().run({ root, config, today }), [])
  })
})
