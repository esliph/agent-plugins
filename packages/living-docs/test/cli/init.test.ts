import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts'
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, existsSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { OWNERSHIP_FILE, runInit } from '../../src/cli/init.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { RETIRED_IDS_PATH } from '../../src/ids/citations.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { withTempRepo } from '../helpers/tmp.ts'

function ownershipOf(root: string) {
  return loadLivingDocsConfig(root)
}

/**
 * What init leaves out besides the fixed notice that the rest of the repository
 * needs to be declared: that notice belongs to the freshly seeded file, and is
 * not what these tests measure.
 */
function leftOut(items: readonly string[]): string[] {
  return items.filter(item => !/ownership validate/.test(item))
}

const OPTIONS = {
  owner: '@team-platform',
  dryRun: false,
  stage: 'solo' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
  invokeOwnership: 'npx living-docs',
  marketplace: 'team/living-docs',
}

test('creates the phase 0–1 scaffold in an empty repository — acceptance criterion 1', () => {
  withTempRepo({ 'README.md': '# project\n' }, root => {
    const result = runInit(root, OPTIONS)

    for (const path of [OWNERSHIP_FILE, RETIRED_IDS_PATH, 'docs/open-decisions.md', 'CODEOWNERS']) {
      assert.ok(existsSync(join(root, path)), `${path} should exist`)
      assert.ok(result.created.includes(path))
    }
    assert.ok(existsSync(join(root, 'docs/decisions/adr')))
    assert.ok(existsSync(join(root, 'docs/decisions/debt')))

    const config = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    assert.match(config, /@team-platform/)
    assert.doesNotMatch(config, /\{\{/)
  })
})

test('the freshly initialized repository passes its own validate', () => {
  withTempRepo({ 'README.md': '' }, root => {
    runInit(root, OPTIONS)
    const result = runValidate(root)

    assert.deepEqual(result.findings, [])
    assert.equal(result.exitCode, 0)
  })
})

test('RF-0002: is idempotent — the second run recreates and rewrites nothing', () => {
  withTempRepo({ 'README.md': '' }, root => {
    runInit(root, OPTIONS)
    writeFileSync(join(root, 'docs/open-decisions.md'), 'USER CONTENT\n', 'utf8')

    const second = runInit(root, OPTIONS)

    assert.deepEqual(second.created, [])
    assert.deepEqual(second.adopted, [], 'the second run reads the paths from .ownership.yml, it does not re-adopt')
    assert.ok(second.skipped.includes('docs/open-decisions.md'))
    assert.equal(readFileSync(join(root, 'docs/open-decisions.md'), 'utf8'), 'USER CONTENT\n')
  })
})

test('RF-0002: adopts a preexisting ADR directory instead of creating a parallel one', () => {
  withTempRepo({ 'docs/adr/0001-old.md': '# old\n' }, root => {
    const result = runInit(root, OPTIONS)

    assert.ok(result.adopted.some(entry => entry.idPrefix === 'ADR' && entry.path === 'docs/adr/'))
    assert.equal(existsSync(join(root, 'docs/decisions/adr')), false)
    assert.match(readFileSync(join(root, OWNERSHIP_FILE), 'utf8'), /path: docs\/adr\//)
  })
})

test('adoption + second run: nothing is re-adopted, duplicated or rewritten', () => {
  withTempRepo({ 'docs/adr/0001-old.md': '# old\n', 'README.md': '' }, root => {
    const first = runInit(root, OPTIONS)

    assert.ok(first.adopted.some(entry => entry.idPrefix === 'ADR' && entry.path === 'docs/adr/'))

    const config = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    const second = runInit(root, OPTIONS)

    assert.deepEqual(second.adopted, [], 'the paths come from .ownership.yml, not from a new scan')
    assert.deepEqual(second.created, [], 'the second run creates nothing')
    assert.ok(second.skipped.includes('docs/adr/'), 'the adopted directory is kept, not recreated')

    // No parallel created, and neither the map nor the preexisting artifact rewritten.
    assert.equal(existsSync(join(root, 'docs/decisions/adr')), false)
    assert.equal(readFileSync(join(root, OWNERSHIP_FILE), 'utf8'), config)
    assert.equal(readFileSync(join(root, 'docs/adr/0001-old.md'), 'utf8'), '# old\n')
  })
})

test('RF-0002: adopts a preexisting open-decisions file under another name', () => {
  withTempRepo({ 'docs/decisoes-abertas.md': '# open\n', 'README.md': '' }, root => {
    const result = runInit(root, OPTIONS)

    assert.ok(result.adopted.some(entry => entry.path === 'docs/decisoes-abertas.md'))
  })
})

test('dry-run writes nothing but reports what it would do', () => {
  withTempRepo({ 'README.md': '' }, root => {
    const result = runInit(root, {
      owner: '@team',
      dryRun: true,
      stage: 'solo' as const,
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })

    assert.ok(result.created.includes(OWNERSHIP_FILE))
    assert.equal(existsSync(join(root, OWNERSHIP_FILE)), false)
  })
})

const SMALL_TEAM = {
  owner: '@team',
  dryRun: false,
  stage: 'small-team' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
  invokeOwnership: 'npx living-docs',
  marketplace: 'team/living-docs',
}
const REQUIREMENT_FILES = ['docs/requirements/functional.md', 'docs/requirements/non-functional.md', 'docs/requirements/rules.md']

test('RF-0003: --stage solo does not create requirements', () => {
  withTempRepo({ 'README.md': '# project\n' }, root => {
    const result = runInit(root, OPTIONS)

    assert.equal(result.stage, 'solo')
    for (const file of REQUIREMENT_FILES) {
      assert.equal(existsSync(join(root, file)), false, `${file} does not belong to the solo stage`)
    }
    assert.equal(readFileSync(join(root, OWNERSHIP_FILE), 'utf8').includes('id-prefix: RN'), false)
    assert.deepEqual(leftOut(result.notInstalled), [])
  })
})

test('RF-0003: --stage small-team creates the three files and the three entries in .ownership.yml', () => {
  withTempRepo({ 'README.md': '# project\n' }, root => {
    runInit(root, SMALL_TEAM)
    for (const file of REQUIREMENT_FILES) {
      assert.ok(existsSync(join(root, file)), `${file} should exist in the small-team stage`)
    }

    const ownership = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    for (const prefix of ['RF', 'RNF', 'RN']) {
      // The comma is what keeps `RN` from matching inside `RNF`.
      assert.ok(ownership.includes(`id-prefix: ${prefix},`), `${prefix} has no declared artifact`)
    }
    assert.match(ownership, /collection: sections/)
    assert.match(ownership, /cited-by: \["test\/\*\*", "src\/\*\*"\]/)

    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    assert.match(codeowners, /docs\/requirements\/rules\.md\s+@team/)

    // the freshly created scaffold passes its own checks
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0002: --stage small-team is idempotent: the second run neither rewrites nor duplicates', () => {
  withTempRepo({ 'README.md': '# project\n' }, root => {
    runInit(root, SMALL_TEAM)
    const before = REQUIREMENT_FILES.map(file => readFileSync(join(root, file), 'utf8'))
    const ownershipBefore = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    const second = runInit(root, SMALL_TEAM)

    assert.deepEqual(second.created, [])
    assert.deepEqual(
      REQUIREMENT_FILES.map(file => readFileSync(join(root, file), 'utf8')),
      before,
    )
    assert.equal(readFileSync(join(root, OWNERSHIP_FILE), 'utf8'), ownershipBefore)
  })
})

test('RF-0003: moving from solo to small-team declares the requirements, without touching what already existed', () => {
  withTempRepo({ 'README.md': '# project\n' }, root => {
    runInit(root, OPTIONS)
    const before = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    runInit(root, { ...SMALL_TEAM, owner: OPTIONS.owner })
    const after = readFileSync(join(root, OWNERSHIP_FILE), 'utf8')

    assert.match(after, /id-prefix: RN\b/)
    assert.ok(after.includes('id-prefix: ADR'), 'the artifact that already existed must not vanish')
    assert.ok(
      before.split('\n').every(line => after.includes(line)),
      'no preexisting line may be rewritten',
    )
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0002: solo after small-team does not remove the requirements already created', () => {
  withTempRepo({ 'README.md': '# project\n' }, root => {
    runInit(root, SMALL_TEAM)
    const result = runInit(root, { ...OPTIONS, owner: SMALL_TEAM.owner })

    assert.deepEqual(result.created, [])
    for (const file of REQUIREMENT_FILES) {
      assert.ok(existsSync(join(root, file)), `${file} must not disappear when running solo`)
    }
    assert.match(readFileSync(join(root, OWNERSHIP_FILE), 'utf8'), /id-prefix: RN\b/)
  })
})

test('adopts a preexisting docs/requisitos.md instead of creating a parallel one', () => {
  withTempRepo({ 'docs/requisitos.md': '# old requirements\n' }, root => {
    const result = runInit(root, SMALL_TEAM)

    assert.ok(
      result.adopted.some(entry => entry.path === 'docs/requisitos.md'),
      JSON.stringify(result.adopted),
    )
    assert.equal(readFileSync(join(root, 'docs/requisitos.md'), 'utf8'), '# old requirements\n')
    assert.equal(existsSync(join(root, 'docs/requirements/functional.md')), false)
    assert.match(readFileSync(join(root, OWNERSHIP_FILE), 'utf8'), /path: docs\/requisitos\.md/)
  })
})

test('RF-0003: small-team leaves nothing out in this version — Phases 2, 3 and 4 complete', () => {
  withTempRepo({ 'README.md': '# project\n' }, root => {
    const result = runInit(root, SMALL_TEAM)

    assert.deepEqual(leftOut(result.notInstalled), [])
  })
})

test('RF-0003: when something is really left out, the result says what it is', () => {
  withTempRepo({ 'README.md': '# project\n' }, root => {
    runInit(root, OPTIONS) // solo: the .ownership.yml is born without RF/RNF/RN
    const file = join(root, OWNERSHIP_FILE)
    // `owned:` is still the key, but stops being the whole line that init
    // recognizes. Without the anchor, moving up a stage does not guess where to declare
    // the requirements.
    const without = readFileSync(file, 'utf8').replace('\nowned:\n', '\nowned: # anchor removed\n')

    assert.notEqual(without, readFileSync(file, 'utf8'), 'the anchor must have actually been removed')
    writeFileSync(file, without, 'utf8')

    const result = runInit(root, { ...SMALL_TEAM, owner: OPTIONS.owner })

    assert.ok(
      result.notInstalled.some(item => item.includes(OWNERSHIP_FILE)),
      `what was left out must be named — ${JSON.stringify(result.notInstalled)}`,
    )
  })
})

test('the requirements seed declares no requirement — the example is literal', () => {
  withTempRepo({ 'README.md': '# project\n' }, root => {
    runInit(root, SMALL_TEAM)
    const rules = readFileSync(join(root, 'docs/requirements/rules.md'), 'utf8')

    assert.match(rules, /RN-nnnn/, 'the example must use the literal placeholder')
    assert.doesNotMatch(rules, /RN-\d{3,4}/, 'the seed must not be born with a phantom requirement')
    assert.equal(runValidate(root).exitCode, 0)
  })
})

test('RF-0004: small-team installs the working agreements', () => {
  withTempRepo({}, root => {
    const result = runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })

    for (const path of ['CONTRIBUTING.md', 'docs/definition-of-done.md', 'CLAUDE.md']) {
      assert.ok(existsSync(join(root, path)), `${path} should exist`)
      assert.ok(result.created.includes(path), `${path} should be listed as created`)
    }
    assert.match(readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8'), /@team/)
  })
})

test('RF-0004: solo installs no working agreement', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: 'team/living-docs' })
    for (const path of ['CONTRIBUTING.md', 'docs/definition-of-done.md', 'CLAUDE.md']) {
      assert.equal(existsSync(join(root, path)), false, `${path} should not exist in the solo stage`)
    }
  })
})

test('RF-0004: an existing AGENTS.md is adopted; no parallel CLAUDE.md is born', () => {
  withTempRepo({ 'AGENTS.md': '# old contract\n' }, root => {
    const result = runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })

    assert.equal(existsSync(join(root, 'CLAUDE.md')), false)
    assert.equal(readFileSync(join(root, 'AGENTS.md'), 'utf8'), '# old contract\n')
    assert.ok(result.adopted.some(entry => entry.path === 'AGENTS.md'))
  })
})

test('RF-0004: an already written agreement is not rewritten on the second run', () => {
  withTempRepo({ 'CONTRIBUTING.md': '# their own way\n' }, root => {
    const options = {
      owner: '@team',
      dryRun: false,
      stage: 'small-team' as const,
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    }

    runInit(root, options)
    const second = runInit(root, options)

    assert.equal(readFileSync(join(root, 'CONTRIBUTING.md'), 'utf8'), '# their own way\n')
    assert.ok(second.skipped.includes('CONTRIBUTING.md'))
    assert.deepEqual(second.created, [])
  })
})

test('init does not invent `watches` — the code→doc link is a human act', () => {
  withTempRepo({}, root => {
    runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })
    const config = loadLivingDocsConfig(root)

    assert.deepEqual(config.watches, [])
  })
})

test('RF-0005: small-team installs glossary and charter', () => {
  withTempRepo({}, root => {
    const result = runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })

    for (const path of ['docs/glossary.md', 'docs/charter/constitution.md', 'docs/charter/vision.md']) {
      assert.ok(existsSync(join(root, path)), `${path} should exist`)
      assert.ok(result.created.includes(path), `${path} should be listed as created`)
    }
    assert.match(readFileSync(join(root, 'docs/glossary.md'), 'utf8'), /@team/)
  })
})

test('RF-0005: solo installs neither glossary nor charter', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: 'team/living-docs' })
    for (const path of ['docs/glossary.md', 'docs/charter/constitution.md', 'docs/charter/vision.md']) {
      assert.equal(existsSync(join(root, path)), false, `${path} should not exist in the solo stage`)
    }
  })
})

test('RF-0005: an already written glossary is not rewritten on the second run', () => {
  withTempRepo({ 'docs/glossary.md': '# their own way\n' }, root => {
    const options = {
      owner: '@team',
      dryRun: false,
      stage: 'small-team' as const,
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    }

    runInit(root, options)
    const second = runInit(root, options)

    assert.equal(readFileSync(join(root, 'docs/glossary.md'), 'utf8'), '# their own way\n')
    assert.ok(second.skipped.includes('docs/glossary.md'))
  })
})

test('RN-0016: moving up a stage appends to the CODEOWNERS that already exists, without rewriting what was there', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: 'team/living-docs' })
    const before = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    const second = runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })
    const after = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    assert.ok(
      before.split('\n').every(line => after.includes(line)),
      'no preexisting line may be rewritten',
    )
    assert.match(after, /docs\/glossary\.md\s+@team/)
    assert.match(after, /CLAUDE\.md\s+@team/)
    assert.ok(
      second.created.some(entry => entry.startsWith('CODEOWNERS (')),
      'what was appended to CODEOWNERS must appear in the output',
    )

    // Without the new lines, `ownership/owner-coverage` would flag a document with no reviewer.
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0002: running again in the same stage adds no line to CODEOWNERS', () => {
  withTempRepo({}, root => {
    runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })
    const before = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    const second = runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })

    assert.equal(readFileSync(join(root, 'CODEOWNERS'), 'utf8'), before)
    assert.ok(second.skipped.includes('CODEOWNERS'))
  })
})

test('RF-0005: the seeded CODEOWNERS gives glossary and charter an owner', () => {
  withTempRepo({}, root => {
    runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })
    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    assert.match(codeowners, /docs\/glossary\.md\s+@team/)
    assert.match(codeowners, /docs\/charter\/\s+@team/)
  })
})

const PRODUCTION = {
  owner: '@team',
  dryRun: false,
  stage: 'production' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
  invokeOwnership: 'npx living-docs',
  marketplace: 'team/living-docs',
}
const CONTRACT_FILES = ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md']

test('RF-0007: production installs the contracts scaffold, and everything small-team installs', () => {
  withTempRepo({}, root => {
    const result = runInit(root, PRODUCTION)

    for (const path of CONTRACT_FILES) {
      assert.ok(existsSync(join(root, path)), `${path} should exist`)
      assert.ok(result.created.includes(path), `${path} should be listed as created`)
    }
    // The stage is cumulative: nothing from small-team may have vanished.
    for (const path of ['CONTRIBUTING.md', 'docs/glossary.md', 'docs/requirements/rules.md']) {
      assert.ok(existsSync(join(root, path)), `${path} belongs to production as well`)
    }
    assert.match(readFileSync(join(root, 'docs/contracts/errors.md'), 'utf8'), /@team/)
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0007: small-team installs no contract', () => {
  withTempRepo({}, root => {
    runInit(root, SMALL_TEAM)
    for (const path of CONTRACT_FILES) {
      assert.equal(existsSync(join(root, path)), false, `${path} does not belong to the small-team stage`)
    }
  })
})

test('RF-0007: init does not invent a generator — `generated[]` is born empty', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)
    assert.deepEqual(loadLivingDocsConfig(root).generated, [])
    // ...and the commented example must be there, or nobody discovers the format.
    assert.match(readFileSync(join(root, OWNERSHIP_FILE), 'utf8'), /#\s+- path: docs\/contracts\/openapi\.gen\.yaml/)
  })
})

test('RF-0007: an already written contract is not rewritten on the second run', () => {
  withTempRepo({ 'docs/contracts/errors.md': '# their own way\n' }, root => {
    runInit(root, PRODUCTION)
    const second = runInit(root, PRODUCTION)

    assert.equal(readFileSync(join(root, 'docs/contracts/errors.md'), 'utf8'), '# their own way\n')
    assert.ok(second.skipped.includes('docs/contracts/errors.md'))
    assert.deepEqual(second.created, [])
  })
})

test('RF-0007: the seeded CODEOWNERS gives the contracts an owner', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)
    assert.match(readFileSync(join(root, 'CODEOWNERS'), 'utf8'), /docs\/contracts\/\s+@team/)
  })
})

test('RF-0009: production installs the historical trail scaffold', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)

    for (const path of ['CHANGELOG.md', 'docs/deprecations.md', 'docs/releases/.gitkeep', 'docs/migrations/.gitkeep']) {
      assert.ok(existsSync(join(root, path)), `${path} belongs to production`)
    }

    const changelog = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')

    assert.match(changelog, /^## \[Unreleased\]$/m, 'the CHANGELOG must open with Unreleased')
    assert.doesNotMatch(changelog, /^---$/m, 'CHANGELOG is consumer-facing: no frontmatter')
  })
})

test('RF-0009: production declares the REL artifact, so that living-docs/append-only freezes a published release note', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)

    const config = loadLivingDocsConfig(root)
    const rel = config.artifacts.find(artifact => artifact.idPrefix === 'REL')

    assert.ok(rel, 'without REL declared, living-docs/append-only cannot freeze a release note')
    assert.equal(rel?.path, 'docs/releases/')
    assert.equal(rel?.appendOnly, true)
    assert.equal(rel?.skill, 'release-historian')
  })
})

test('RF-0009: production does not invent a consumer-visible watches rule', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)
    assert.deepEqual(loadLivingDocsConfig(root).watches, [])
  })
})

test('RF-0009: production leaves nothing of spec §10 out', () => {
  withTempRepo({}, root => {
    const result = runInit(root, PRODUCTION)

    assert.deepEqual(leftOut(result.notInstalled), [], `production should be complete — ${JSON.stringify(result.notInstalled)}`)
  })
})

test('RF-0009: moving from small-team to production declares REL in the existing .ownership.yml', () => {
  withTempRepo({}, root => {
    runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })
    assert.equal(
      loadLivingDocsConfig(root).artifacts.some(artifact => artifact.idPrefix === 'REL'),
      false,
      'small-team does not install the historical trail',
    )

    runInit(root, PRODUCTION)
    assert.ok(loadLivingDocsConfig(root).artifacts.some(artifact => artifact.idPrefix === 'REL'))
    assert.equal(runValidate(root).exitCode, 0, 'the repository just moved up a stage must pass clean')
  })
})

test('RF-0012: solo declares the map and the retired IDs as documents', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: 'team/living-docs' })
    const documents = ownershipOf(root).documents

    assert.deepEqual(documents.map(document => document.path).sort(), ['.ownership.yml', 'docs/ids-retired.txt'])
    assert.ok(documents.every(document => document.owner === '@team'))

    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    assert.match(codeowners, /docs\/ids-retired\.txt\s+@team/)
    assert.match(codeowners, /^\.ownership\.yml\s+@team/m)
  })
})

test('RF-0012: small-team declares the agreements, the language and the two roles', () => {
  withTempRepo({}, root => {
    runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })
    const documents = ownershipOf(root).documents
    const byPath = new Map(documents.map(document => [document.path, document]))

    for (const path of ['CONTRIBUTING.md', 'docs/definition-of-done.md', 'CLAUDE.md', 'docs/glossary.md', 'docs/charter/']) {
      assert.ok(byPath.has(path), `${path} should be declared`)
    }
    assert.equal(byPath.get('CLAUDE.md')?.role, 'agent-contract')
    assert.equal(byPath.get('docs/definition-of-done.md')?.role, 'definition-of-done')
    assert.equal(byPath.get('docs/glossary.md')?.skill, 'glossary-keeper')
    assert.equal(byPath.get('docs/charter/')?.skill, 'charter-keeper')
  })
})

test('RF-0012: production declares contracts and historical trail', () => {
  withTempRepo({}, root => {
    runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'production',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })
    const paths = ownershipOf(root).documents.map(document => document.path)

    for (const path of ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md', 'CHANGELOG.md', 'docs/deprecations.md', 'docs/migrations/']) {
      assert.ok(paths.includes(path), `${path} should be declared`)
    }
  })
})

test('RF-0012: the declared agent contract is the adopted one, not the default', () => {
  withTempRepo({ 'AGENTS.md': '# preexisting contract\n' }, root => {
    runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })
    const documents = ownershipOf(root).documents

    assert.ok(documents.some(document => document.path === 'AGENTS.md' && document.role === 'agent-contract'))
    assert.equal(
      documents.some(document => document.path === 'CLAUDE.md'),
      false,
    )

    // CODEOWNERS follows the same adopted path: the line is for `AGENTS.md`, and
    // no line points at the `CLAUDE.md` this repository does not have.
    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')

    assert.match(codeowners, /^AGENTS\.md\s+@team$/m)
    assert.doesNotMatch(codeowners, /CLAUDE\.md/)

    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0002 and RF-0012: moving up a stage appends the missing entries, without duplicating', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: 'team/living-docs' })
    runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })

    const paths = ownershipOf(root).documents.map(document => document.path)

    assert.ok(paths.includes('CONTRIBUTING.md'), 'the second run declared what it created')
    assert.equal(new Set(paths).size, paths.length, 'no duplicated entry')

    // and a third run changes nothing more
    const before = readFileSync(join(root, '.ownership.yml'), 'utf8')

    runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })
    assert.equal(readFileSync(join(root, '.ownership.yml'), 'utf8'), before)
  })
})

test('RF-0012: without an anchor in .ownership.yml, init says what is missing instead of guessing', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@team', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: 'team/living-docs' })
    // hand-reorganized file: `owned` in flow style, without the lone `owned:` line
    writeFileSync(
      join(root, '.ownership.yml'),
      'version: 2\nplugins: [living-docs]\nowned: [{ path: docs/decisions/adr/, owner: "@team", skill: decision-recorder, states: [draft, accepted, superseded], living-docs: { id-prefix: ADR } }]\n',
      'utf8',
    )

    const result = runInit(root, {
      owner: '@team',
      dryRun: false,
      stage: 'small-team',
      idFormat: DEFAULT_ID_FORMAT,
      invoke: 'npx living-docs',
      invokeOwnership: 'npx living-docs',
      marketplace: 'team/living-docs',
    })

    assert.ok(result.notInstalled.some(item => /documents.*owned/.test(item)))
  })
})

test('RN-0019: the TDR template carries `pay-when` as a commented example, not an invented one', () => {
  const template = readFileSync(join(toolkitRoot(), 'templates/tdr.md'), 'utf8')

  assert.match(template, /# pay-when:/, 'the example is commented out — init does not invent a trigger')
  assert.doesNotMatch(template, /^pay-when:/m, 'a trigger filled in at the factory would pass living-docs/staleness while meaning nothing')
})

test('RF-0015: production declares the historical trail as external, and only it', () => {
  withTempRepo({}, root => {
    const result = runInit(root, PRODUCTION)
    const config = loadLivingDocsConfig(root)
    const byPath = new Map(config.documents.map(document => [document.path, document]))

    for (const path of ['CHANGELOG.md', 'docs/deprecations.md', 'docs/migrations/']) {
      assert.equal(byPath.get(path)?.audience, 'external', `${path} is written for whoever consumes`)
    }
    assert.equal(config.artifacts.find(artifact => artifact.idPrefix === 'REL')?.audience, 'external')

    for (const path of ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md', 'CONTRIBUTING.md', '.ownership.yml']) {
      assert.equal(byPath.get(path)?.audience, 'internal', `${path} is not marked by init`)
    }
    assert.ok(
      config.artifacts.filter(artifact => artifact.idPrefix !== 'REL').every(artifact => artifact.audience === 'internal'),
      'only REL is born external',
    )

    assert.deepEqual(leftOut(result.notInstalled), [])
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0015: small-team declares nothing as external', () => {
  withTempRepo({}, root => {
    runInit(root, SMALL_TEAM)
    const config = loadLivingDocsConfig(root)

    assert.ok(config.documents.every(document => document.audience === 'internal'))
    assert.ok(config.artifacts.every(artifact => artifact.audience === 'internal'))
  })
})

test('RF-0015: an entry already declared without the mark becomes a warning, and .ownership.yml is not rewritten', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)

    // The repository installed by an earlier version: the same entries, without the key.
    const file = join(root, OWNERSHIP_FILE)
    const unmarked = readFileSync(file, 'utf8').replaceAll('{ audience: external }', '{}').replaceAll(', audience: external', '')

    writeFileSync(file, unmarked, 'utf8')
    assert.ok(
      loadLivingDocsConfig(root).documents.every(document => document.audience === 'internal'),
      'the scenario must be without the mark',
    )

    const changelogBefore = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
    const result = runInit(root, PRODUCTION)

    assert.equal(readFileSync(file, 'utf8'), unmarked, 'init does not rewrite an already declared line')
    assert.equal(readFileSync(join(root, 'CHANGELOG.md'), 'utf8'), changelogBefore)

    for (const target of [/CHANGELOG\.md/, /docs\/deprecations\.md/, /docs\/migrations\//, /REL/]) {
      assert.ok(
        result.notInstalled.some(item => target.test(item) && /audience: external/.test(item)),
        `expected a warning for ${target} — ${JSON.stringify(result.notInstalled)}`,
      )
    }
  })
})

test('an existing v1 ownership file: init does not create another at the root, and says it must be rewritten', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 1\nartifacts: []\n' }, root => {
    const result = runInit(root, { owner: '@team', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'npx living-docs', marketplace: null })

    assert.equal(existsSync(join(root, '.ownership.yml')), false)
    assert.ok(result.skipped.includes('docs/.ownership.yml'))
    assert.ok(result.notInstalled.some(item => /docs\/\.ownership\.yml.*does not read as v2.*rewrite/.test(item)))
  })
})

test('init seeds v2 at the root and warns that the rest of the repository needs an owner', () => {
  withTempRepo({ 'README.md': '# project\n' }, root => {
    const result = runInit(root, OPTIONS)
    const source = readFileSync(join(root, '.ownership.yml'), 'utf8')

    assert.match(source, /^version: 2$/m)
    assert.match(source, /^plugins: \[living-docs\]$/m)
    assert.match(source, /^ignore: \["node_modules\/\*\*", "\*\*\/node_modules\/\*\*"\]$/m)
    assert.equal(existsSync(join(root, 'docs/.ownership.yml')), false)
    assert.ok(
      result.notInstalled.some(item => /owned/.test(item) && /ownership validate/.test(item)),
      `expected the notice about the rest of the repository — ${JSON.stringify(result.notInstalled)}`,
    )
  })
})
