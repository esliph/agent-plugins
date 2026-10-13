import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { Ajv2020 } from 'ajv/dist/2020.js'
import { parse } from 'yaml'

import { OwnershipError } from '../../plugin/src/errors.ts'
import { SCHEMA_URL } from '../../plugin/src/init/render.ts'
import { parseOwnershipFile } from '../../plugin/src/schema/parse.ts'
import { PLUGIN_ROOT } from '../helpers/roots.ts'

const schema = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'ownership.schema.json'), 'utf8')) as Record<string, unknown>
const validate = new Ajv2020({ allErrors: true }).compile(schema)

/** Ownership files a root file may be, and the same files broken in one way the schema can express. */
const VALID: Record<string, string> = {
  'only the version': 'version: 1\n',
  'every key': [
    'version: 1',
    'basePath: sub/',
    'plugins:',
    '  docs-kit: {}',
    '  other-kit:',
    '    anything: [1, { goes: true }]',
    'owned:',
    '  - path: docs/',
    "    owner: '@org/team'",
    '    skill: docs-keeper',
    '    plugins:',
    '      docs-kit:',
    '        id-prefix: ADR',
    '      other-kit: {}',
    '  - path: src/a b.ts',
    "    owner: '@me'",
    'generated:',
    '  - path: docs/api.md',
    '    command: node gen.mjs',
    'ignore:',
    '  - docs/vendor/',
    'include:',
    '  - plugins/x/',
    '  - plugins/y/.ownership.yml',
    '',
  ].join('\n'),
  'empty lists': 'version: 1\nowned: []\ngenerated: []\nignore: []\ninclude: []\nplugins: {}\n',
  'a path with dots, dashes and accents': "version: 1\nowned:\n  - path: ./docs/ação-1.md\n    owner: '@a'\n",
}

const INVALID: Record<string, string> = {
  'an empty file': '',
  'a list at the top': '- version: 1\n',
  'no version': 'owned: []\n',
  'version 2': 'version: 2\n',
  'version as text': "version: '1'\n",
  'an unknown top-level key': 'version: 1\nwatches: []\n',
  'a $schema key': 'version: 1\n$schema: https://example.com/schema.json\n',
  'owned that is not a list': 'version: 1\nowned:\n  path: docs/\n',
  'owned with no value': 'version: 1\nowned:\n',
  'an owned entry that is not a map': 'version: 1\nowned:\n  - docs/\n',
  'an owned entry without path': "version: 1\nowned:\n  - owner: '@a'\n",
  'an owned entry without owner': 'version: 1\nowned:\n  - path: docs/\n',
  'an owner without @': 'version: 1\nowned:\n  - path: docs/\n    owner: team\n',
  'an owner that is not text': 'version: 1\nowned:\n  - path: docs/\n    owner: 12\n',
  'an empty path': "version: 1\nowned:\n  - path: ''\n    owner: '@a'\n",
  'an empty skill': "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\n    skill: ''\n",
  'an unknown key in an owned entry': "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\n    states: [draft]\n",
  'a glob in an owned path': "version: 1\nowned:\n  - path: docs/*.md\n    owner: '@a'\n",
  'a question mark in an owned path': "version: 1\nowned:\n  - path: docs/?.md\n    owner: '@a'\n",
  'a bracket in an owned path': "version: 1\nowned:\n  - path: 'docs/[ab].md'\n    owner: '@a'\n",
  'a negation in an owned path': "version: 1\nowned:\n  - path: '!docs/'\n    owner: '@a'\n",
  'a leading slash in an owned path': "version: 1\nowned:\n  - path: /docs/\n    owner: '@a'\n",
  'a generated path that is a directory': 'version: 1\ngenerated:\n  - path: out/\n    command: gen\n',
  'a generated entry without command': 'version: 1\ngenerated:\n  - path: out.md\n',
  'a generated entry with an empty command': "version: 1\ngenerated:\n  - path: out.md\n    command: ''\n",
  'an unknown key in a generated entry': "version: 1\ngenerated:\n  - path: out.md\n    command: gen\n    owner: '@a'\n",
  'a glob in a generated path': 'version: 1\ngenerated:\n  - path: out/*.md\n    command: gen\n',
  'a glob in ignore': "version: 1\nignore:\n  - '**/node_modules/'\n",
  'an ignore item that is not text': 'version: 1\nignore:\n  - 12\n',
  'an empty include item': "version: 1\ninclude:\n  - ''\n",
  'basePath that is not text': 'version: 1\nbasePath: [sub]\n',
  'plugins as a list': 'version: 1\nplugins: [docs-kit]\n',
  'a plugin name outside the pattern': 'version: 1\nplugins:\n  Docs_Kit: {}\n',
  'a global plugin block that is not a map': 'version: 1\nplugins:\n  docs-kit: true\n',
  'an entry plugin block that is null': "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\n    plugins:\n      docs-kit:\n",
  'an entry plugin block that is a list': "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\n    plugins:\n      docs-kit: []\n",
  'an entry plugin name outside the pattern': "version: 1\nowned:\n  - path: docs/\n    owner: '@a'\n    plugins:\n      2fast: {}\n",
}

function loads(text: string): boolean {
  try {
    parseOwnershipFile(text, '.ownership.yml', { isRoot: true })

    return true
  } catch (error) {
    assert.ok(error instanceof OwnershipError, `expected a load error, got ${String(error)}`)

    return false
  }
}

test('the schema is draft 2020-12 and is published at the URL the init comment points at', () => {
  assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema')
  assert.equal(schema.$id, SCHEMA_URL)
})

test('every object of the core is closed, and a plugin block is any object', () => {
  const defs = schema.$defs as Record<string, Record<string, unknown>>

  assert.equal(schema.additionalProperties, false)
  assert.equal(defs.owned?.additionalProperties, false)
  assert.equal(defs.generated?.additionalProperties, false)
  assert.deepEqual(defs.pluginBlocks?.propertyNames, { pattern: '^[a-z][a-z0-9-]*$' })
  assert.deepEqual(defs.pluginBlocks?.additionalProperties, { type: 'object' })
})

for (const [name, text] of Object.entries(VALID)) {
  test(`the schema and the loader both accept ${name}`, () => {
    assert.equal(validate(parse(text)), true, JSON.stringify(validate.errors))
    assert.equal(loads(text), true)
  })
}

for (const [name, text] of Object.entries(INVALID)) {
  test(`the schema and the loader both reject ${name}`, () => {
    assert.equal(validate(parse(text)), false)
    assert.equal(loads(text), false)
  })
}

test('the package ships the schema', () => {
  const manifest = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'package.json'), 'utf8')) as { files: string[] }

  assert.ok(manifest.files.includes('ownership.schema.json'))
})
