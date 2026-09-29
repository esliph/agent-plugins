import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { livingDocsLinks, findLinks } from '../../src/checks/links.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { OWNERSHIP_FILE, configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: .ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
    living-docs: {}
  - path: docs/guide.md
    owner: "@team"
    skill: working-agreements-keeper
    living-docs: {}
  - path: docs/attachments/
    owner: "@team"
    living-docs: {}
  - path: CONTRIBUTING.md
    owner: "@team"
    skill: working-agreements-keeper
    living-docs: {}
  - path: assets/
    owner: "@team"
`

function contextFor(root: string) {
  const config = configFrom(OWNERSHIP)

  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: '2026-08-27',
  }
}

const BASE = {
  [OWNERSHIP_FILE]: OWNERSHIP,
  'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
  'CONTRIBUTING.md': '# how to contribute\n',
}

test('RN-0023: a relative link that resolves passes; file, directory and anchor included', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guide.md': [
        '# Guide',
        '',
        'See [the ADR](decisions/adr/ADR-0001-x.md) and [the folder](decisions/adr/).',
        'The anchor [inside it](decisions/adr/ADR-0001-x.md#context) also resolves.',
        'And [from the root](/CONTRIBUTING.md) the same.',
        'External passes: [site](https://example.com) and [mail](mailto:a@b.c).',
        'A bare anchor passes: [here](#guide).',
        '',
      ].join('\n'),
    },
    root => {
      assert.deepEqual(livingDocsLinks.run(contextFor(root)), [])
    },
  )
})

test('RN-0023: a link that does not resolve fails, with the line and the target', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guide.md': ['# Guide', '', 'See [what does not exist](decisions/adr/ADR-9999-x.md).', ''].join('\n'),
    },
    root => {
      const findings = livingDocsLinks.run(contextFor(root))

      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.ruleId, 'living-docs/links')
      assert.equal(findings[0]?.severity, 'error')
      assert.equal(findings[0]?.file, 'docs/guide.md')
      assert.equal(findings[0]?.line, 3)
      assert.match(findings[0]?.message ?? '', /ADR-9999-x\.md/)
    },
  )
})

test('RN-0023: a link inside a fenced block or inline markup is not a link', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guide.md': [
        '# Guide',
        '',
        'Inline regex: `/\\]\\(?:ly\\)/` is not a link.',
        '',
        '```ts',
        'const CADENCE = /\\b(?:quarter|bi)?ly(?:ly)?\\b/i;',
        'const link = "[text](does-not-exist.md)";',
        '```',
        '',
        'And `[[wikilink]]` in backticks is the name of the format, not a destination.',
        '',
      ].join('\n'),
    },
    root => {
      assert.deepEqual(livingDocsLinks.run(contextFor(root)), [])
    },
  )
})

test('RN-0023: a wikilink resolves by file name, and with no destination it fails', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guide.md': ['# Guide', '', 'See [[ADR-0001-x]] and [[CONTRIBUTING]].', 'But [[none-of-this]] does not exist.', ''].join('\n'),
    },
    root => {
      const findings = livingDocsLinks.run(contextFor(root))

      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.line, 4)
      assert.match(findings[0]?.message ?? '', /none-of-this/)
      assert.match(findings[0]?.message ?? '', /wikilink/i)
    },
  )
})

test('RN-0023: a reference definition is also a link', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guide.md': ['# Guide', '', 'See [the adr][adr].', '', '[adr]: decisions/adr/ADR-0000-nonexistent.md', ''].join('\n'),
    },
    root => {
      const findings = livingDocsLinks.run(contextFor(root))

      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.line, 5)
    },
  )
})

test('RN-0023: a binary attachment in the documentation corpus fails; text and .gitkeep do not', () => {
  withTempRepo({ ...BASE, 'docs/guide.md': '# Guide\n' }, root => {
    mkdirSync(join(root, 'docs/attachments'), { recursive: true })
    writeFileSync(join(root, 'docs/attachments/diagram.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    writeFileSync(join(root, 'docs/attachments/diagram.svg'), '<svg></svg>\n', 'utf8')
    writeFileSync(join(root, 'docs/attachments/data.json'), '{}\n', 'utf8')
    writeFileSync(join(root, 'docs/attachments/.gitkeep'), '', 'utf8')

    const findings = livingDocsLinks.run(contextFor(root))

    assert.equal(findings.length, 1, JSON.stringify(findings, null, 2))
    assert.equal(findings[0]?.file, 'docs/attachments/diagram.png')
    assert.match(findings[0]?.message ?? '', /Binary/)
    assert.match(findings[0]?.fix ?? '', /text|SVG/i)
  })
})

test('RN-0023: a binary outside the corpus is not a matter for living-docs/links', () => {
  withTempRepo({ ...BASE, 'docs/guide.md': '# Guide\n' }, root => {
    mkdirSync(join(root, 'assets'), { recursive: true })
    writeFileSync(join(root, 'assets/logo.png'), Buffer.from([0x89, 0x50]))
    assert.deepEqual(livingDocsLinks.run(contextFor(root)), [])
  })
})

test('findLinks recognizes the three forms and ignores external and bare anchor', () => {
  const source = [
    'inline [a](x.md) and image ![b](y.png)',
    '[ref]: z.md',
    'wiki [[w]] and [[w|with title]]',
    'external [c](https://x.y) [d](mailto:a@b.c) [e](//cdn.x)',
    'anchor [f](#section)',
  ].join('\n')

  assert.deepEqual(findLinks(source), [
    { target: 'x.md', line: 1, kind: 'link' },
    { target: 'y.png', line: 1, kind: 'link' },
    { target: 'z.md', line: 2, kind: 'link' },
    { target: 'w', line: 3, kind: 'wikilink' },
    { target: 'w', line: 3, kind: 'wikilink' },
  ])
})
