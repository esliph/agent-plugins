import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownershipDeclaredState } from '../../src/checks/declared-state.ts'
import { forgetTree } from '../../src/core/files.ts'
import { buildConfig } from '../helpers/config.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('per-file: status fora dos states declarados é achado', () => {
  withTempRepo({ 'docs/decisions/adr/x.md': '---\nstatus: inventado\n---\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a', states: ['draft', 'accepted', 'superseded'] }] })
    const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-17' })

    assert.equal(findings.length, 1)
    assert.match(findings[0]!.message, /inventado/)
  })
})

test('per-file: status dentro dos states declarados não é achado', () => {
  withTempRepo({ 'docs/decisions/adr/x.md': '---\nstatus: draft\n---\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a', states: ['draft', 'accepted'] }] })

    assert.deepEqual(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }), [])
  })
})

test('sem states declarado, nenhuma validação — o núcleo não inventa vocabulário', () => {
  withTempRepo({ 'docs/decisions/adr/x.md': '---\nstatus: qualquer-coisa\n---\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a' }] })

    assert.deepEqual(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }), [])
  })
})

test('table: item com status fora dos states é achado, com a linha certa', () => {
  const content = '| ID | Status |\n| --- | ------ |\n| DA-01 | inventado |\n'

  withTempRepo({ 'docs/open-decisions.md': content }, root => {
    forgetTree(root)
    const config = buildConfig({
      owned: [{ path: 'docs/open-decisions.md', owner: '@a', states: ['open', 'resolved'], format: { collection: 'table', key: 'ID', keyMode: null, stateField: 'status' } }],
    })
    const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-17' })

    assert.equal(findings[0]?.line, 3)
  })
})

test('sections: item com status fora dos states é achado', () => {
  const content = '## RN-0001 — x\n\n- **status:** inventado\n'

  withTempRepo({ 'docs/requirements/rules.md': content }, root => {
    forgetTree(root)
    const config = buildConfig({
      owned: [
        { path: 'docs/requirements/rules.md', owner: '@a', states: ['draft', 'active'], format: { collection: 'sections', key: null, keyMode: 'first-token', stateField: 'status' } },
      ],
    })

    assert.equal(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }).length, 1)
  })
})

test('chave duplicada é achado, mesmo sem states declarado', () => {
  const content = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n| DA-01 | open |\n'

  withTempRepo({ 'docs/open-decisions.md': content }, root => {
    forgetTree(root)
    const config = buildConfig({
      owned: [{ path: 'docs/open-decisions.md', owner: '@a', format: { collection: 'table', key: 'ID', keyMode: null, stateField: 'status' } }],
    })
    const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-17' })

    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.line, 4)
    assert.match(findings[0]!.message, /DA-01/)
  })
})

test('state-field customizado é lido no lugar de status', () => {
  withTempRepo({ 'docs/decisions/adr/x.md': '---\nsituação: inventado\n---\n' }, root => {
    forgetTree(root)
    const config = buildConfig({
      owned: [{ path: 'docs/decisions/adr/', owner: '@a', states: ['draft'], format: { collection: 'per-file', key: null, keyMode: null, stateField: 'situação' } }],
    })

    assert.equal(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }).length, 1)
  })
})
