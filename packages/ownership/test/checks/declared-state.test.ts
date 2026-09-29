import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ownershipDeclaredState } from '../../src/checks/declared-state.ts'
import { forgetTree } from '../../src/core/files.ts'
import { buildConfig } from '../helpers/config.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('per-file: status outside the declared states is a finding', () => {
  withTempRepo({ 'docs/decisions/adr/x.md': '---\nstatus: invented\n---\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a', states: ['draft', 'accepted', 'superseded'] }] })
    const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-17' })

    assert.equal(findings.length, 1)
    assert.match(findings[0]!.message, /invented/)
  })
})

test('per-file: status within the declared states is not a finding', () => {
  withTempRepo({ 'docs/decisions/adr/x.md': '---\nstatus: draft\n---\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a', states: ['draft', 'accepted'] }] })

    assert.deepEqual(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }), [])
  })
})

test('no states declared, no validation — the core does not invent vocabulary', () => {
  withTempRepo({ 'docs/decisions/adr/x.md': '---\nstatus: anything\n---\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a' }] })

    assert.deepEqual(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }), [])
  })
})

test('table: item with status outside the states is a finding, with the right line', () => {
  const content = '| ID | Status |\n| --- | ------ |\n| DA-01 | invented |\n'

  withTempRepo({ 'docs/open-decisions.md': content }, root => {
    forgetTree(root)
    const config = buildConfig({
      owned: [{ path: 'docs/open-decisions.md', owner: '@a', states: ['open', 'resolved'], format: { collection: 'table', key: 'ID', keyMode: null, stateField: 'status' } }],
    })
    const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-17' })

    assert.equal(findings[0]?.line, 3)
  })
})

test('sections: item with status outside the states is a finding', () => {
  const content = '## RN-0001 — x\n\n- **status:** invented\n'

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

test('duplicate key is a finding, even with no states declared', () => {
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

test('custom state-field is read in place of status', () => {
  withTempRepo({ 'docs/decisions/adr/x.md': '---\nsituação: invented\n---\n' }, root => {
    forgetTree(root)
    const config = buildConfig({
      owned: [{ path: 'docs/decisions/adr/', owner: '@a', states: ['draft'], format: { collection: 'per-file', key: null, keyMode: null, stateField: 'situação' } }],
    })

    assert.equal(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }).length, 1)
  })
})

test('per-file: frontmatter owner without @ is a finding, on the line of the field', () => {
  withTempRepo({ 'docs/adr/ADR-0001.md': '---\nstatus: draft\nowner: team\n---\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/adr/', owner: '@x', states: ['draft'] }] })
    const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-28' })

    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.line, 3)
    assert.match(findings[0]?.message ?? '', /owner.*"team".*@/)
  })
})

test('per-file: owner with @, or absent, is not a finding — absence is the concern of whoever enforces the frontmatter', () => {
  withTempRepo({ 'docs/adr/ADR-0001.md': "---\nstatus: draft\nowner: '@team'\n---\n", 'docs/adr/ADR-0002.md': '---\nstatus: draft\n---\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'docs/adr/', owner: '@x', states: ['draft'] }] })

    assert.deepEqual(ownershipDeclaredState().run({ root, config, today: '2026-09-28' }), [])
  })
})

test('per-file: entry without states has no frontmatter owner enforced — a document template with a placeholder is not a violation', () => {
  withTempRepo({ 'templates/adr.md': '---\nstatus: draft\nowner: "{{OWNER}}"\n---\n' }, root => {
    forgetTree(root)
    const config = buildConfig({ owned: [{ path: 'templates/', owner: '@x' }] })

    assert.deepEqual(ownershipDeclaredState().run({ root, config, today: '2026-09-28' }), [])
  })
})

test('per-file: entry without states does not read the frontmatter — a template with unquoted {{ID}} does not make the parser warn', async () => {
  const warnings: string[] = []
  const onWarning = (warning: Error): void => {
    warnings.push(warning.message)
  }

  process.on('warning', onWarning)
  try {
    withTempRepo({ 'templates-dir/adr.md': '---\nid: {{ID}}\ntitle: {{TITLE}}\nowner: {{OWNER}}\n---\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'templates-dir/', owner: '@a' }] })

      assert.deepEqual(ownershipDeclaredState().run({ root, config, today: '2026-09-28' }), [])
    })
    // The Node warning is emitted on the next tick.
    await new Promise(resolve => setImmediate(resolve))
  } finally {
    process.off('warning', onWarning)
  }

  assert.deepEqual(warnings, [])
})
