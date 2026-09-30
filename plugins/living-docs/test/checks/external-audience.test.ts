import { test } from 'node:test'
import assert from 'node:assert/strict'
import { livingDocsExternalAudience } from '../../plugin/src/checks/external-audience.ts'
import type { Finding } from '../../plugin/src/core/types.ts'
import { collectArtifacts, collectDocuments } from '../../plugin/src/docs/collect.ts'
import { configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

// ADR, RN and REL are internal because they are declared. TDR, on purpose, is
// not: it is the case of the project that has not installed the family yet.
const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: docs/requirements/rules.md
    owner: "@team"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
  - path: docs/releases/
    owner: "@team"
    skill: release-historian
    states: [draft, published]
    living-docs: { id-prefix: REL, audience: external }
  - path: CHANGELOG.md
    owner: "@team"
    skill: release-historian
    living-docs: { audience: external }
  - path: CONTRIBUTING.md
    owner: "@team"
    skill: working-agreements-keeper
    living-docs: {}
`

function findingsFor(files: Record<string, string>): Finding[] {
  let findings: Finding[] = []

  withTempRepo(files, root => {
    const config = configFrom(OWNERSHIP)

    findings = livingDocsExternalAudience.run({
      root,
      config,
      docs: collectArtifacts(root, config),
      documents: collectDocuments(root, config),
      today: '2026-09-15',
    })
  })

  return findings
}

const changelog = (...entries: string[]): string => ['# Changelog', '', '## [Unreleased]', '', ...entries, ''].join('\n')

const releaseNote = (frontmatterExtra: string[], body: string[]): string =>
  [
    '---',
    'id: REL-0001',
    'title: v1.0.0',
    'status: draft',
    'owner: "@team"',
    'trigger: Never. Frozen once published.',
    ...frontmatterExtra,
    'last-reviewed: 2026-09-15',
    '---',
    '',
    ...body,
    '',
  ].join('\n')

test('RN-0030: an artifact ID in prose, in an external document, fails on the right line', () => {
  const findings = findingsFor({ 'CHANGELOG.md': changelog('- Rule RN-0001 starts to apply.') })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'living-docs/external-audience')
  assert.equal(findings[0]?.severity, 'error')
  assert.equal(findings[0]?.file, 'CHANGELOG.md')
  assert.equal(findings[0]?.line, 5)
  assert.match(findings[0]?.message ?? '', /RN-0001/)
})

test('RN-0030: an ID in backticks fails — inline markup does not hide what the reader sees', () => {
  const findings = findingsFor({ 'CHANGELOG.md': changelog('- Decided in `ADR-0003`.') })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0003/)
})

test('RN-0030: an ID only in a link path fails, even outside the rendered text', () => {
  const findings = findingsFor({ 'CHANGELOG.md': changelog('- See [the decision](docs/decisions/adr/ADR-0003-two-roots.md).') })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0003/)
})

test('RN-0030: an ID inside a fenced code block passes — it is an example', () => {
  assert.deepEqual(findingsFor({ 'CHANGELOG.md': changelog('```text', 'RN-0001', '```') }), [])
})

test('RN-0030: an ID only in the frontmatter of an external artifact passes — it is a machine contract', () => {
  const note = releaseNote(['relates-to: [ADR-0003]'], ['# v1.0.0', '', 'Nothing changes for whoever uses it.'])

  assert.deepEqual(findingsFor({ 'docs/releases/REL-0001-v1.md': note }), [])
})

test('RN-0030: a public interface identifier cited in an external document passes', () => {
  assert.deepEqual(findingsFor({ 'CHANGELOG.md': changelog('- `living-docs/external-audience` fails, `living-docs/session-inventory` warns, and the exit code is `EXIT-2`.') }), [])
})

test('RN-0030: the same ID in an internal document passes', () => {
  assert.deepEqual(findingsFor({ 'CONTRIBUTING.md': '# How to contribute\n\nThe rule RN-0001 and `ADR-0003`.\n' }), [])
})

test('RN-0030: an ID with a prefix not declared in artifacts: passes — the check knows no prefix', () => {
  assert.deepEqual(findingsFor({ 'CHANGELOG.md': changelog('- Pays `TDR-0001` and follows ISO-8601.') }), [])
})

test('RN-0030: in a document with frontmatter, the reported line is the file line', () => {
  const note = releaseNote([], ['# v1.0.0', '', 'Fixes what RN-0001 required.'])
  const findings = findingsFor({ 'docs/releases/REL-0001-v1.md': note })

  // 8 frontmatter lines, one blank, the title, another blank: line 12.
  assert.equal(findings.length, 1, 'the id: REL-0001 of the frontmatter must not become a finding')
  assert.equal(findings[0]?.file, 'docs/releases/REL-0001-v1.md')
  assert.equal(findings[0]?.line, 12)
})

test('RN-0030: an artifact with broken frontmatter is skipped — living-docs/frontmatter already fails it', () => {
  const broken = ['---', 'id: [REL-0001', 'title: v1.0.0', '---', '', 'Fixes RN-0001.', ''].join('\n')

  assert.deepEqual(findingsFor({ 'docs/releases/REL-0001-v1.md': broken }), [])
})
