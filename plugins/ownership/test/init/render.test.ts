import { test } from 'node:test'
import assert from 'node:assert/strict'

import { parseCodeowners } from '../../plugin/src/codeowners/parse.ts'
import { deriveInit } from '../../plugin/src/init/derive.ts'
import type { InitPlan } from '../../plugin/src/init/derive.ts'
import { renderOwnershipFile, SCHEMA_URL } from '../../plugin/src/init/render.ts'
import { parseOwnershipFile } from '../../plugin/src/schema/parse.ts'

const HEADER = `# yaml-language-server: $schema=${SCHEMA_URL}\nversion: 1\n`
const FILES = new Set(['.ownership.yml', 'README.md', 'docs/a.md', 'src/a.ts'])

function load(text: string) {
  return parseOwnershipFile(text, '.ownership.yml', { isRoot: true })
}

test('the schema comment carries the published URL', () => {
  assert.equal(SCHEMA_URL, 'https://raw.githubusercontent.com/esliph/agent-plugins/master/plugins/ownership/plugin/ownership.schema.json')
})

test('skeleton mode: the schema comment, the version and a commented model per root child', () => {
  assert.equal(
    renderOwnershipFile(deriveInit(FILES, { kind: 'skeleton' }), []),
    [
      `# yaml-language-server: $schema=${SCHEMA_URL}`,
      'version: 1',
      '',
      '# No entry was written: only you can name the owner of each path. Uncomment',
      '# the entries, give each one its owner, and split a directory into its',
      '# children when its parts have different owners.',
      '# owned:',
      '#   - path: .ownership.yml',
      '#     owner: "@owner"',
      '#   - path: README.md',
      '#     owner: "@owner"',
      '#   - path: docs/',
      '#     owner: "@owner"',
      '#   - path: src/',
      '#     owner: "@owner"',
      '',
    ].join('\n'),
  )
})

test('single-owner mode: one entry per root child, owners in double quotes', () => {
  assert.equal(
    renderOwnershipFile(deriveInit(FILES, { kind: 'owner', owner: '@me' }), []),
    [
      `# yaml-language-server: $schema=${SCHEMA_URL}`,
      'version: 1',
      '',
      'owned:',
      '  - path: .ownership.yml',
      '    owner: "@me"',
      '  - path: README.md',
      '    owner: "@me"',
      '  - path: docs/',
      '    owner: "@me"',
      '  - path: src/',
      '    owner: "@me"',
      '',
    ].join('\n'),
  )
})

test('CODEOWNERS mode: the other owners of the line are a comment above the entry', () => {
  const plan = deriveInit(new Set(['docs/a.md', 'src/a.ts']), { kind: 'codeowners', codeowners: parseCodeowners('docs/ @docs\nsrc/ @a @b\n') })

  assert.equal(
    renderOwnershipFile(plan, []),
    `${HEADER}\nowned:\n  - path: docs/\n    owner: "@docs"\n  # CODEOWNERS line 2 also lists @b\n  - path: src/\n    owner: "@a"\n`,
  )
})

test('paths left out and files with the marker are written as comments', () => {
  const plan = deriveInit(new Set(['Docs/a.md', 'docs/b.md', 'src/gen.ts']), { kind: 'owner', owner: '@me' })

  assert.equal(
    renderOwnershipFile(plan, ['src/gen.ts']),
    [
      `# yaml-language-server: $schema=${SCHEMA_URL}`,
      'version: 1',
      '',
      'owned:',
      '  - path: src/',
      '    owner: "@me"',
      '',
      '# Left out, and so without an owner: an ownership file cannot declare these',
      '# paths as they are.',
      '#   differs from another path only in case:',
      '#   - path: Docs/',
      '#     owner: "@me"',
      '#   differs from another path only in case:',
      '#   - path: docs/',
      '#     owner: "@me"',
      '',
      '# These files carry the "generated: do not edit" marker. Uncomment the block',
      '# and give each one the command that prints its content.',
      '# generated:',
      '#   - path: src/gen.ts',
      '#     command: <command that prints this file>',
      '',
    ].join('\n'),
  )
})

test('the file never seeds ignore, plugins or include, and has no generated key of its own', () => {
  const text = renderOwnershipFile(deriveInit(FILES, { kind: 'owner', owner: '@me' }), ['src/a.ts'])

  assert.doesNotMatch(text, /^(?:ignore|plugins|include|generated):/m)
})

test('the result of every mode loads without a load error and gives back the same entries', () => {
  const plans: InitPlan[] = [
    deriveInit(FILES, { kind: 'skeleton' }),
    deriveInit(FILES, { kind: 'owner', owner: '@me' }),
    deriveInit(FILES, { kind: 'codeowners', codeowners: parseCodeowners('* @all @lead\ndocs/ @docs\n') }),
    deriveInit(FILES, { kind: 'codeowners', codeowners: parseCodeowners('nothing/ @x\n') }),
    deriveInit(new Set(['Docs/a.md', 'docs/b.md']), { kind: 'owner', owner: '@me' }),
  ]

  for (const plan of plans) {
    const loaded = load(renderOwnershipFile(plan, ['docs/a.md']))

    assert.deepEqual(
      loaded.owned.map(entry => [entry.path, entry.owner]),
      plan.entries.map(entry => [entry.path, entry.owner]),
    )
    assert.deepEqual(loaded.generated, [])
  }
})

test('a path YAML would read as something else, or cut short, is written in double quotes', () => {
  const names = ['my file #1.md', '123', '1.5', 'true', 'Null', '@scope/', '- dash', 'key: value', '.5', 'ação/', "it's", '-x', '~', '{a}', 'tab\there']
  const plan = deriveInit(new Set(names.map(name => (name.endsWith('/') ? `${name}x.md` : name))), { kind: 'owner', owner: '@me' })

  assert.deepEqual(plan.leftOut, [])
  assert.deepEqual(
    load(renderOwnershipFile(plan, []))
      .owned.map(entry => entry.path)
      .sort(),
    [...names].sort(),
  )
})

test('the same plan renders to the same bytes', () => {
  const plan = deriveInit(FILES, { kind: 'owner', owner: '@me' })

  assert.equal(renderOwnershipFile(plan, ['b', 'a']), renderOwnershipFile(plan, ['b', 'a']))
})
