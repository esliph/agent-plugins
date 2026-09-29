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

test('RN-0014: marcador novo sem TDR por perto vira lembrete', () => {
  withTempRepo({}, root => {
    seed(root, 'src/cobranca.ts', 'export const taxa = 0.05;\n')

    const decision = decideShortcutDebt(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/cobranca.ts',
          old_string: 'export const taxa = 0.05;',
          new_string: '// TODO: a taxa deveria vir da configuração\nexport const taxa = 0.05;',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'remind')
    assert.match(decision.action === 'remind' ? decision.context : '', /living-docs\/shortcut-debt/)
    assert.match(decision.action === 'remind' ? decision.context : '', /TODO: a taxa/)
    assert.match(decision.action === 'remind' ? decision.context : '', /\/debt/)
    assert.doesNotMatch(decision.action === 'remind' ? decision.context : '', /deny|bloque/i)
  })
})

test('RN-0014: marcador com TDR a duas linhas de distância é silêncio', () => {
  withTempRepo({}, root => {
    seed(root, 'src/cobranca.ts', 'export const taxa = 0.05;\n')

    const decision = decideShortcutDebt(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/cobranca.ts',
          old_string: 'export const taxa = 0.05;',
          new_string: '// Atalho registrado em TDR-0002.\n//\n// TODO: ler da configuração\nexport const taxa = 0.05;',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'silent')
  })
})

test('RN-0014: marcador que já existia não é atalho novo', () => {
  withTempRepo({}, root => {
    seed(root, 'src/cobranca.ts', '// TODO: antigo\nexport const taxa = 0.05;\n')

    const decision = decideShortcutDebt(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'src/cobranca.ts',
          old_string: 'export const taxa = 0.05;',
          new_string: 'export const taxa = 0.07;',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'silent')
  })
})

test('RN-0014: supressão de tipo e teste ignorado também contam', () => {
  withTempRepo({}, root => {
    seed(root, 'src/cobranca.ts', 'const x = 1;\n')

    const decision = decideShortcutDebt(
      {
        tool_name: 'Write',
        tool_input: {
          file_path: 'src/cobranca.ts',
          content: '// @ts-expect-error contorno temporário\nconst x: string = 1;\n',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'remind')
  })

  assert.deepEqual(shortcutsWithoutDebt('test.skip("cobra taxa", () => {});'), ['test.skip("cobra taxa", () => {});'])
  assert.deepEqual(shortcutsWithoutDebt('// eslint-disable-next-line no-console'), ['// eslint-disable-next-line no-console'])
  assert.deepEqual(shortcutsWithoutDebt('const x = 1; // TODO_LIST não é marcador'), [])
})

test('RN-0014: arquivo Markdown é ignorado — ali TODO é prosa sobre o marcador', () => {
  withTempRepo({}, root => {
    seed(root, 'docs/requirements/rules.md', '# regras\n')

    const decision = decideShortcutDebt(
      {
        tool_name: 'Edit',
        tool_input: {
          file_path: 'docs/requirements/rules.md',
          old_string: '# regras',
          new_string: '# regras\n\nMarcador de atalho: TODO, FIXME, teste ignorado.',
        },
      },
      { root, hostRoots: [root] },
    )

    assert.equal(decision.action, 'silent')
  })
})

test('RNF-0001: arquivo fora do repositório e edição imprevisível são silêncio', () => {
  withTempRepo({}, root => {
    const env = { root, hostRoots: [root] }

    assert.equal(decideShortcutDebt({ tool_name: 'Edit', tool_input: { file_path: '/fora/x.ts', content: '// TODO: x' } }, env).action, 'silent')
    assert.equal(decideShortcutDebt({ tool_name: 'Edit', tool_input: { file_path: 'src/x.ts', old_string: 'nada-disso' } }, env).action, 'silent')
    assert.equal(decideShortcutDebt({ tool_name: 'Edit' }, env).action, 'silent')
  })
})
