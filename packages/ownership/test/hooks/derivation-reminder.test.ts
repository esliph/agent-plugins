import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideDerivationReminder } from '../../src/hooks/derivation-reminder.ts'
import { forgetTree } from '../../src/core/files.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const env = (root: string) => ({ root, hostRoots: [root] })
const CONFIG = 'version: 2\nowned:\n  - path: docs/plans/\n    owner: "@a"\n    derives-from:\n      source: docs/specs/\n      field: spec\n'

test('editar a fonte lembra só o documento que aponta exatamente para ela', () => {
  withTempRepo(
    {
      '.ownership.yml': CONFIG,
      'docs/specs/s1.md': '# s1\n',
      'docs/specs/s2.md': '# s2\n',
      'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n',
      'docs/plans/b.md': '---\nspec: docs/specs/s2.md\n---\n',
    },
    root => {
      forgetTree(root)
      const decision = decideDerivationReminder({ tool_input: { file_path: 'docs/specs/s1.md' } }, env(root))

      assert.equal(decision.action, 'remind')
      if (decision.action === 'remind') {
        assert.match(decision.context, /docs\/plans\/a\.md/)
        assert.doesNotMatch(decision.context, /docs\/plans\/b\.md/)
      }
    },
  )
})

test('editar um documento que não é fonte de derivação nenhuma: silêncio', () => {
  withTempRepo({ '.ownership.yml': CONFIG, 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n' }, root => {
    forgetTree(root)
    assert.equal(decideDerivationReminder({ tool_input: { file_path: 'docs/plans/a.md' } }, env(root)).action, 'silent')
  })
})

test('sem nenhum documento apontando para a fonte editada: silêncio', () => {
  withTempRepo({ '.ownership.yml': CONFIG, 'docs/specs/s1.md': '# s1\n' }, root => {
    forgetTree(root)
    assert.equal(decideDerivationReminder({ tool_input: { file_path: 'docs/specs/s1.md' } }, env(root)).action, 'silent')
  })
})

test('sem arquivo de ownership, o hook se cala (falha aberta)', () => {
  withTempRepo({ 'docs/specs/s1.md': '# s1\n' }, root => {
    forgetTree(root)
    assert.equal(decideDerivationReminder({ tool_input: { file_path: 'docs/specs/s1.md' } }, env(root)).action, 'silent')
  })
})
