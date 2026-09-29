import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideDerivationReminder } from '../../src/hooks/derivation-reminder.ts'
import { forgetTree } from '../../src/core/files.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const env = (root: string) => ({ root, hostRoots: [root] })
const CONFIG = 'version: 2\nowned:\n  - path: docs/plans/\n    owner: "@a"\n    derives-from:\n      source: docs/specs/\n      field: spec\n'

test('editing the source reminds only the document that points exactly to it', () => {
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

test('editing a document that is no derivation source: silence', () => {
  withTempRepo({ '.ownership.yml': CONFIG, 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n' }, root => {
    forgetTree(root)
    assert.equal(decideDerivationReminder({ tool_input: { file_path: 'docs/plans/a.md' } }, env(root)).action, 'silent')
  })
})

test('with no document pointing to the edited source: silence', () => {
  withTempRepo({ '.ownership.yml': CONFIG, 'docs/specs/s1.md': '# s1\n' }, root => {
    forgetTree(root)
    assert.equal(decideDerivationReminder({ tool_input: { file_path: 'docs/specs/s1.md' } }, env(root)).action, 'silent')
  })
})

test('without an ownership file, the hook stays silent (fails open)', () => {
  withTempRepo({ 'docs/specs/s1.md': '# s1\n' }, root => {
    forgetTree(root)
    assert.equal(decideDerivationReminder({ tool_input: { file_path: 'docs/specs/s1.md' } }, env(root)).action, 'silent')
  })
})
