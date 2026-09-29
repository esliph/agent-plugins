import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runValidate } from '../../src/cli/validate.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CONFIG = `
version: 2
plugins: [living-docs]
living-docs:
  id-format: { separator: "", padding: 3 }
owned:
  - path: docs/rules.md
    owner: "@time"
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN, cited-by: ["test/**"] }
  - path: .ownership.yml
    owner: "@time"
    skill: living-docs-bootstrap
    living-docs: {}
`

function rules(ids: readonly string[]): string {
  return [
    '---',
    'title: Rules',
    'owner: "@time"',
    'trigger: Before implementing any behavior, and on every new or changed rule.',
    'last-reviewed: 2026-08-28',
    '---',
    '',
    '# Rules',
    '',
    ...ids.flatMap(id => [`## ${id} — A rule`, '', '- **status:** active', '']),
  ].join('\n')
}

function tree(ids: readonly string[]): Record<string, string> {
  return {
    [OWNERSHIP_FILE]: CONFIG,
    'docs/rules.md': rules(ids),
    'test/rules.test.ts': ids.map(id => `// covers ${id}`).join('\n') + '\n',
  }
}

test('criterion 2: identity, duplicate, sequence and citation work in the form of the project', () => {
  withTempRepo(tree(['RN001', 'RN002', 'RN003']), root => {
    const result = runValidate(root)

    assert.deepEqual(result.findings, [], JSON.stringify(result.findings, null, 2))
  })
})

test('criterion 2: a duplicate is detected even when written with different padding', () => {
  withTempRepo(tree(['RN001', 'RN01']), root => {
    const result = runValidate(root)
    const duplicate = result.findings.find(f => f.ruleId === 'living-docs/id-integrity' && /Duplicate/.test(f.message))

    assert.ok(duplicate, JSON.stringify(result.findings, null, 2))
  })
})

test('criterion 2: the sequence gap is reported in the written form of the project', () => {
  withTempRepo(tree(['RN001', 'RN003']), root => {
    const result = runValidate(root)
    const gap = result.findings.find(f => f.ruleId === 'living-docs/id-integrity' && /gap/.test(f.message))

    assert.ok(gap, JSON.stringify(result.findings, null, 2))
    assert.match(gap.message, /RN002/, 'the suggested ID must come in the project\'s form')
    assert.doesNotMatch(gap.message, /RN-0002/, 'no check builds an ID by concatenation')
  })
})

test('criterion 2: a citation that does not resolve keeps failing in the form of the project', () => {
  const treeWithCitation = tree(['RN001'])

  treeWithCitation['docs/rules.md'] += '\nThe statement cites RN042, which does not exist.\n'

  withTempRepo(treeWithCitation, root => {
    const result = runValidate(root)
    const citation = result.findings.find(f => f.ruleId === 'living-docs/id-integrity' && /RN042/.test(f.message))

    assert.ok(citation, JSON.stringify(result.findings, null, 2))
  })
})

test('RN-0024: no check file builds an ID by concatenation', () => {
  const suspicious = /\$\{[A-Za-z.]*[Pp]refix\}[-_.:]?\$\{/

  for (const file of ['frontmatter.ts', 'id-integrity.ts', 'citation-coverage.ts']) {
    const source = readFileSync(join(toolkitRoot(), 'src/checks', file), 'utf8')

    assert.doesNotMatch(source, suspicious, `${file} builds an ID by hand — use writeId (RN-0024)`)
  }
})
