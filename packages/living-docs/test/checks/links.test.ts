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
    owner: "@time"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR }
  - path: .ownership.yml
    owner: "@time"
    skill: living-docs-bootstrap
    living-docs: {}
  - path: docs/guia.md
    owner: "@time"
    skill: working-agreements-keeper
    living-docs: {}
  - path: docs/anexos/
    owner: "@time"
    living-docs: {}
  - path: CONTRIBUTING.md
    owner: "@time"
    skill: working-agreements-keeper
    living-docs: {}
  - path: assets/
    owner: "@time"
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
  'CONTRIBUTING.md': '# como se contribui\n',
}

test('RN-0023: link relativo que resolve passa; arquivo, diretório e âncora inclusive', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guia.md': [
        '# Guia',
        '',
        'Veja [o ADR](decisions/adr/ADR-0001-x.md) e [a pasta](decisions/adr/).',
        'A âncora [dentro dele](decisions/adr/ADR-0001-x.md#contexto) também resolve.',
        'E [da raiz](/CONTRIBUTING.md) igual.',
        'Externo passa: [site](https://example.com) e [correio](mailto:a@b.c).',
        'Âncora pura passa: [aqui](#guia).',
        '',
      ].join('\n'),
    },
    root => {
      assert.deepEqual(livingDocsLinks.run(contextFor(root)), [])
    },
  )
})

test('RN-0023: link que não resolve reprova, com a linha e o alvo', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guia.md': ['# Guia', '', 'Veja [o que não existe](decisions/adr/ADR-9999-x.md).', ''].join('\n'),
    },
    root => {
      const findings = livingDocsLinks.run(contextFor(root))

      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.ruleId, 'living-docs/links')
      assert.equal(findings[0]?.severity, 'error')
      assert.equal(findings[0]?.file, 'docs/guia.md')
      assert.equal(findings[0]?.line, 3)
      assert.match(findings[0]?.message ?? '', /ADR-9999-x\.md/)
    },
  )
})

test('RN-0023: link dentro de bloco cercado ou de marcação inline não é link', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guia.md': [
        '# Guia',
        '',
        'Regex inline: `/\\]\\(?:mente\\)/` não é link.',
        '',
        '```ts',
        'const CADENCE = /\\b(?:tri|bi)?mestral(?:mente)?\\b/i;',
        'const link = "[texto](nao-existe.md)";',
        '```',
        '',
        'E `[[wikilink]]` entre crases é o nome do formato, não um destino.',
        '',
      ].join('\n'),
    },
    root => {
      assert.deepEqual(livingDocsLinks.run(contextFor(root)), [])
    },
  )
})

test('RN-0023: wikilink resolve por nome do arquivo, e sem destino reprova', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guia.md': ['# Guia', '', 'Veja [[ADR-0001-x]] e [[CONTRIBUTING]].', 'Mas [[nada-disso]] não existe.', ''].join('\n'),
    },
    root => {
      const findings = livingDocsLinks.run(contextFor(root))

      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.line, 4)
      assert.match(findings[0]?.message ?? '', /nada-disso/)
      assert.match(findings[0]?.message ?? '', /wikilink/i)
    },
  )
})

test('RN-0023: definição de referência também é link', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guia.md': ['# Guia', '', 'Veja [o adr][adr].', '', '[adr]: decisions/adr/ADR-0000-inexistente.md', ''].join('\n'),
    },
    root => {
      const findings = livingDocsLinks.run(contextFor(root))

      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.line, 5)
    },
  )
})

test('RN-0023: anexo binário no corpus da documentação reprova; texto e .gitkeep não', () => {
  withTempRepo({ ...BASE, 'docs/guia.md': '# Guia\n' }, root => {
    mkdirSync(join(root, 'docs/anexos'), { recursive: true })
    writeFileSync(join(root, 'docs/anexos/diagrama.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    writeFileSync(join(root, 'docs/anexos/diagrama.svg'), '<svg></svg>\n', 'utf8')
    writeFileSync(join(root, 'docs/anexos/dados.json'), '{}\n', 'utf8')
    writeFileSync(join(root, 'docs/anexos/.gitkeep'), '', 'utf8')

    const findings = livingDocsLinks.run(contextFor(root))

    assert.equal(findings.length, 1, JSON.stringify(findings, null, 2))
    assert.equal(findings[0]?.file, 'docs/anexos/diagrama.png')
    assert.match(findings[0]?.message ?? '', /binário/)
    assert.match(findings[0]?.fix ?? '', /texto|SVG/i)
  })
})

test('RN-0023: binário fora do corpus não é assunto de living-docs/links', () => {
  withTempRepo({ ...BASE, 'docs/guia.md': '# Guia\n' }, root => {
    mkdirSync(join(root, 'assets'), { recursive: true })
    writeFileSync(join(root, 'assets/logo.png'), Buffer.from([0x89, 0x50]))
    assert.deepEqual(livingDocsLinks.run(contextFor(root)), [])
  })
})

test('findLinks reconhece as três formas e ignora externo e âncora pura', () => {
  const source = [
    'inline [a](x.md) e imagem ![b](y.png)',
    '[ref]: z.md',
    'wiki [[w]] e [[w|com título]]',
    'externo [c](https://x.y) [d](mailto:a@b.c) [e](//cdn.x)',
    'âncora [f](#secao)',
  ].join('\n')

  assert.deepEqual(findLinks(source), [
    { target: 'x.md', line: 1, kind: 'link' },
    { target: 'y.png', line: 1, kind: 'link' },
    { target: 'z.md', line: 2, kind: 'link' },
    { target: 'w', line: 3, kind: 'wikilink' },
    { target: 'w', line: 3, kind: 'wikilink' },
  ])
})
