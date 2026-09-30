import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkoutRoot } from '../helpers/checkout.ts'

// The suite reads the checkout root (ownership-globs, agent-contract, maintenance…),
// so a change that touches only the root must still run it (ADR-0036).
const ROOT_PATHS = ['.ownership.yml', 'CLAUDE.md', 'CONTRIBUTING.md', 'CODEOWNERS', 'docs/**', '.claude-plugin/**', 'README.md', 'CHANGELOG.md']

test('ADR-0036: the living-docs workflow also runs on changes to the root files its tests read', () => {
  const text = readFileSync(join(checkoutRoot(), '.github', 'workflows', 'plugin-living-docs.yml'), 'utf8')
  const filter = text.slice(0, text.indexOf('\njobs:'))

  assert.deepEqual(
    ROOT_PATHS.filter(path => !filter.includes(`'${path}'`)),
    [],
  )
})
