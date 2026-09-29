import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInit } from '../../src/cli/init.ts'
import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OPTIONS = {
  owner: '@time',
  dryRun: false,
  stage: 'production' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
  invokeOwnership: 'npx ownership',
  marketplace: 'time/living-docs' as string | null,
}

const WORKFLOW = '.github/workflows/living-docs.yml'

test('RF-0013: init writes the CI workflow of the stage', () => {
  withTempRepo({}, root => {
    const result = runInit(root, OPTIONS)

    assert.ok(result.created.includes(WORKFLOW), JSON.stringify(result.created, null, 2))
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')

    assert.match(yaml, /npx living-docs validate/)
    // Generated-artifact drift and the CHANGELOG entry belong to the core: they left here.
    assert.doesNotMatch(yaml, /npx living-docs drift/)
    assert.doesNotMatch(yaml, /npx living-docs changelog/)
  })
})

test('RF-0013: the installed workflow does not impose Docker on whoever installs it', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')

    assert.doesNotMatch(yaml, /docker/i, 'how the toolkit reaches the CI of whoever installs it is DA-0003, not something we impose')
  })
})

test('RN-0025: the solo stage installs validate and nothing else', () => {
  withTempRepo({}, root => {
    runInit(root, { ...OPTIONS, stage: 'solo' })
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')

    assert.match(yaml, /living-docs validate/)
    assert.doesNotMatch(yaml, /living-docs drift/)
    assert.doesNotMatch(yaml, /living-docs changelog/)
  })
})

test('RF-0013: a preexisting workflow is kept, and running twice does not duplicate', () => {
  const mine = 'name: my-ci\non:\n  push:\n'

  withTempRepo({ '.github/workflows/ci.yml': mine }, root => {
    runInit(root, OPTIONS)
    assert.equal(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8'), mine)

    const after = readFileSync(join(root, WORKFLOW), 'utf8')
    const second = runInit(root, OPTIONS)

    assert.ok(second.skipped.includes(WORKFLOW))
    assert.equal(readFileSync(join(root, WORKFLOW), 'utf8'), after)
  })
})

test('criterion 3: without enforcement, init leaves the workflow and plugin registration — and running again does not duplicate', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)

    assert.ok(existsSync(join(root, WORKFLOW)))
    const settings = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8')) as Record<string, Record<string, unknown>>

    assert.equal(settings.enabledPlugins?.['living-docs@living-docs'], true)

    const before = readFileSync(join(root, '.claude/settings.json'), 'utf8')
    const second = runInit(root, OPTIONS)

    assert.equal(readFileSync(join(root, '.claude/settings.json'), 'utf8'), before)
    assert.ok(second.skipped.includes('.claude/settings.json'))
  })
})

test('criterion 4: own hooks and workflows are still there, and the toolkit one was added', () => {
  const myHooks = JSON.stringify({ hooks: { PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: './format.sh' }] }] } }, null, 2)

  withTempRepo({ '.claude/settings.json': myHooks, '.github/workflows/ci.yml': 'name: my-ci\non:\n  push:\n' }, root => {
    runInit(root, OPTIONS)

    const settings = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8')) as Record<string, Record<string, unknown>>

    assert.ok(settings.hooks, 'no consumer hook may be lost')
    assert.equal(settings.enabledPlugins?.['living-docs@living-docs'], true)
    assert.match(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8'), /my-ci/)
    assert.ok(existsSync(join(root, WORKFLOW)))
  })
})

test('RF-0013: without --marketplace, the registration is not invented — it is reported', () => {
  withTempRepo({}, root => {
    const result = runInit(root, { ...OPTIONS, marketplace: null })

    assert.equal(existsSync(join(root, '.claude/settings.json')), false)
    assert.ok(result.notInstalled.some(line => line.includes('--marketplace <owner/repo>') && line.includes('cannot be guessed')))
  })
})

test('criterion 5: multi-team installs the Phase 7 enforcement', () => {
  withTempRepo({}, root => {
    const result = runInit(root, { ...OPTIONS, stage: 'multi-team' })

    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')

    assert.match(yaml, /npx living-docs validate --base/, 'the half of living-docs/open-decision-claim that reads the diff is Phase 7')
    assert.doesNotMatch(yaml, /npx living-docs drift/)
    assert.doesNotMatch(yaml, /npx living-docs changelog/)
    assert.ok(
      result.notInstalled.every(item => /ownership validate/.test(item)),
      'all seven phases exist: only the notice about the rest of the repository remains',
    )
  })
})

test('RN-0025: multi-team installs everything production installs', () => {
  withTempRepo({}, root => {
    runInit(root, { ...OPTIONS, stage: 'multi-team' })
    for (const path of ['CHANGELOG.md', 'docs/contracts/errors.md', 'docs/deprecations.md']) {
      assert.ok(existsSync(join(root, path)), `${path} should exist in the multi-team stage`)
    }
  })
})

test('RN-0025/ADR-0012: production installs the core diff (Phase 6), but not the living-docs one (Phase 7)', () => {
  withTempRepo({}, root => {
    runInit(root, { ...OPTIONS, stage: 'production' })
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')

    assert.match(yaml, /npx ownership validate --base/, 'the ADR-0012/ADR-0030 decision turns on the core diff rules already in production')
    assert.doesNotMatch(yaml, /npx living-docs validate --base/, 'the half of living-docs/open-decision-claim that stayed in living-docs only enters in Phase 7 (multi-team)')
  })
})

test('RF-0013: the seeded workflow runs both CLIs, each through its own invocation command', () => {
  withTempRepo({}, root => {
    runInit(root, { ...OPTIONS, invoke: 'npx living-docs', invokeOwnership: 'pnpm ownership' })
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')

    assert.match(yaml, /run: pnpm ownership validate\n/)
    assert.match(yaml, /run: pnpm ownership validate --base /)
    assert.match(yaml, /run: npx living-docs validate\n/)
    assert.doesNotMatch(yaml, /drift|changelog/)
  })
})
