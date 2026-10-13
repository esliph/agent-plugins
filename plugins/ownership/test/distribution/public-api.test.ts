import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'

import * as surface from '../../plugin/src/index.ts'
import type { Check, CheckContext, Finding, OwnersResult, PathExplanation, PluginEntry, ResolvedOwnership, Severity } from '../../plugin/src/index.ts'
import { tempRepo } from '../helpers/repo.ts'
import { PROJECT_ROOT } from '../helpers/roots.ts'
import { PUBLIC_NAMES } from '../helpers/surface.ts'

test('the package exports exactly its public names', () => {
  assert.deepEqual(Object.keys(surface).sort(), [...PUBLIC_NAMES])
})

test('the public catalog carries the three core checks: id, name, command and when each fails', () => {
  assert.deepEqual(
    surface.coreCheckCatalog.map(entry => [entry.id, entry.command]),
    [
      ['ownership/owner-coverage', 'ownership validate --check ownership/owner-coverage'],
      ['ownership/codeowners-match', 'ownership validate --check ownership/codeowners-match'],
      ['ownership/generated-drift', 'ownership validate --check ownership/generated-drift'],
    ],
  )
  assert.ok(surface.coreCheckCatalog.every(entry => entry.name !== '' && entry.failsWhen !== ''))
  assert.ok(Object.isFrozen(surface.coreCheckCatalog) && Object.isFrozen(surface.coreChecks))
})

test('a domain plugin can do its work with the public names alone', async t => {
  const root = tempRepo(
    t,
    {
      '.ownership.yml': "version: 1\nplugins:\n  docs-kit:\n    lang: en\nowned:\n  - path: docs/\n    owner: '@Docs'\n    plugins:\n      docs-kit: {}\n",
      'docs/a.md': '<!-- generated: do not edit -->\n',
    },
    { codeowners: 'docs/ @docs\n' },
  )
  const config: ResolvedOwnership | null = surface.resolveOwnership(root, { prune: ['docs/a.md'] })

  assert.ok(config !== null)

  const entries: PluginEntry[] = surface.entriesForPlugin(config, 'docs-kit')
  const owners: OwnersResult = surface.ownersOf(surface.loadCodeowners(root), 'docs/a.md')
  const explanation: PathExplanation = surface.explainPath(config, 'docs/a.md', {
    repoFiles: new Set(['docs/a.md']),
    codeowners: surface.parseCodeowners('docs/ @docs\n'),
  })
  const severity: Severity = 'warning'
  const own: Check = {
    id: 'docs-kit/example',
    name: 'Example',
    failsWhen: 'always',
    run: (ctx: CheckContext): Promise<Finding[]> => Promise.resolve([{ file: ctx.config.rootFile, checkId: 'docs-kit/example', severity, message: 'example' }]),
  }

  assert.deepEqual(entries, [{ path: 'docs/', owner: '@Docs', source: '.ownership.yml', entry: {}, global: { lang: 'en' } }])
  assert.deepEqual(owners, { kind: 'matched', owners: ['@docs'], line: 1 })
  assert.equal(surface.findOwnedRule(config, 'docs/a.md')?.owner, '@Docs')
  assert.equal(surface.findGeneratedRule(config, 'docs/a.md'), null)
  assert.deepEqual(explanation.generated, { source: 'marker' })
  assert.equal(surface.isGeneratedByMarker('generated: do not edit\n'), true)
  assert.equal((await own.run({ root, config, repoFiles: new Set(), jobs: 1, codeowners: () => null }))[0]?.severity, 'warning')
  assert.throws(() => surface.entriesForPlugin(config, 'Bad_Name'), surface.OwnershipError)
})

test('with the development condition, the package name resolves to the TypeScript source, with no build', { timeout: 60_000 }, () => {
  const script = 'import("@esliph/ownership").then(m => console.log(JSON.stringify(Object.keys(m).sort())))'
  const result = spawnSync(process.execPath, ['--conditions=development', '--input-type=module', '-e', script], { cwd: PROJECT_ROOT, encoding: 'utf8' })

  assert.equal(result.status, 0, result.stderr)
  assert.deepEqual(JSON.parse(result.stdout), [...PUBLIC_NAMES])
})
