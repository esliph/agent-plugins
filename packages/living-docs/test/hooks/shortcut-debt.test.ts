import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { decideShortcutDebt, shortcutsWithoutDebt } from '../../src/hooks/shortcut-debt.ts'
import { withTempRepo } from '../helpers/tmp.ts'

function seed(root: string, relative: string, content: string): void {
  const absolute = join(root, relative)

  mkdirSync(dirname(absolute), { recursive: true })
  writeFileSync(absolute, content, 'utf8')
}

test('RN-0014: a new marker with no TDR nearby becomes a reminder', () => {
  withTempRepo({}, root => {
    seed(root, 'src/billing.ts', 'export const fee = 0.05;\n')

    const decision = decideShortcutDebt(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/billing.ts',
          old_string: 'export const fee = 0.05;',
          new_string: '// TODO: the fee should come from configuration\nexport const fee = 0.05;',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'remind')
    assert.match(decision.action === 'remind' ? decision.context : '', /living-docs\/shortcut-debt/)
    assert.match(decision.action === 'remind' ? decision.context : '', /TODO: the fee/)
    assert.match(decision.action === 'remind' ? decision.context : '', /\/debt/)
    assert.doesNotMatch(decision.action === 'remind' ? decision.context : '', /deny|block/i)
  })
})

test('RN-0014: a marker with a TDR two lines away is silence', () => {
  withTempRepo({}, root => {
    seed(root, 'src/billing.ts', 'export const fee = 0.05;\n')

    const decision = decideShortcutDebt(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/billing.ts',
          old_string: 'export const fee = 0.05;',
          new_string: '// Shortcut recorded in TDR-0002.\n//\n// TODO: read from configuration\nexport const fee = 0.05;',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'silent')
  })
})

test('RN-0014: a marker that already existed is not a new shortcut', () => {
  withTempRepo({}, root => {
    seed(root, 'src/billing.ts', '// TODO: old\nexport const fee = 0.05;\n')

    const decision = decideShortcutDebt(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/billing.ts',
          old_string: 'export const fee = 0.05;',
          new_string: 'export const fee = 0.07;',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'silent')
  })
})

test('RN-0014: type suppression and a skipped test also count', () => {
  withTempRepo({}, root => {
    seed(root, 'src/billing.ts', 'const x = 1;\n')

    const decision = decideShortcutDebt(
      {
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/billing.ts',
          content: '// @ts-expect-error temporary workaround\nconst x: string = 1;\n',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'remind')
  })

  assert.deepEqual(shortcutsWithoutDebt('test.skip("charges fee", () => {});'), ['test.skip("charges fee", () => {});'])
  assert.deepEqual(shortcutsWithoutDebt('// eslint-disable-next-line no-console'), ['// eslint-disable-next-line no-console'])
  assert.deepEqual(shortcutsWithoutDebt('const x = 1; // TODO_LIST is not a marker'), [])
})

test('RN-0014: a Markdown file is ignored — there TODO is prose about the marker', () => {
  withTempRepo({}, root => {
    seed(root, 'docs/requirements/rules.md', '# rules\n')

    const decision = decideShortcutDebt(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'docs/requirements/rules.md',
          old_string: '# rules',
          new_string: '# rules\n\nShortcut marker: TODO, FIXME, skipped test.',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'silent')
  })
})

test('RNF-0001: a file outside the repository and an unpredictable edit are silence', () => {
  withTempRepo({}, root => {
    const env = { root, hostRoots: [root] }

    assert.equal(decideShortcutDebt({ tool_name: 'Edit', tool_input: { file_path: '/outside/x.ts', content: '// TODO: x' } }, env).action, 'silent')
    assert.equal(decideShortcutDebt({ tool_name: 'Edit', tool_input: { file_path: 'src/x.ts', old_string: 'none-of-that' } }, env).action, 'silent')
    assert.equal(decideShortcutDebt({ tool_name: 'Edit' }, env).action, 'silent')
  })
})
