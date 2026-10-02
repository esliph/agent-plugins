import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseYaml, renderYaml } from '../../plugin/src/core/yaml.ts'

test('RNF-0008: the configuration shape is read with nothing installed — scalars, lists and one-level maps', () => {
  const source = [
    '# a comment',
    'version: 1',
    'glossary: docs/glossary.md   # where it lives',
    'empty:',
    'flag: true',
    "forbidden-words: [rápido, 'as needed', \"etc.\", don't]",
    'more-words:',
    '  - fast',
    '  - "user-friendly, mostly"',
    'thresholds:',
    '  active-requirements: 150',
    '  counter: 900',
    'split-from: null',
    'split-into: []',
    '',
  ].join('\r\n')

  assert.deepEqual(parseYaml(source), {
    'version': 1,
    'glossary': 'docs/glossary.md',
    'empty': null,
    'flag': true,
    'forbidden-words': ['rápido', 'as needed', 'etc.', "don't"],
    'more-words': ['fast', 'user-friendly, mostly'],
    'thresholds': { 'active-requirements': 150, 'counter': 900 },
    'split-from': null,
    'split-into': [],
  })
})

test('RNF-0008: what is outside that shape is refused with its line, never guessed', () => {
  const refused: [string, RegExp][] = [
    ['a: 1\nb: {c: 1}', /line 2/],
    ['a:\n  b:\n    c: 1', /line 3/],
    ['a: 1\na: 2', /line 2: the key `a` appears twice/],
    ['  a: 1', /line 1/],
    ['a: [1, 2', /line 1/],
    ['a: "open', /line 1/],
    ['a: |', /line 1/],
    ['just text', /line 1/],
    ['a:\n  - 1\n  b: 2', /line 3/],
    ['a:\n\tb: 1', /line 2/],
  ]

  for (const [source, message] of refused) {
    assert.throws(() => parseYaml(source), message, source)
  }
})

test('RNF-0008: what is written is read back unchanged', () => {
  const data = {
    prefix: 'CHK',
    name: 'checkout b2b: new',
    counter: 14,
    tombstones: ['CHK-009', 'CHK-011'],
    'split-from': null,
    'split-into': [],
    odd: ['true', '12', ' padded'],
  }

  assert.deepEqual(parseYaml(renderYaml(data)), data)
  assert.match(renderYaml(data), /^prefix: CHK\nname: "checkout b2b: new"\ncounter: 14\ntombstones: \[CHK-009, CHK-011\]\nsplit-from: null\nsplit-into: \[\]\n/)
})
