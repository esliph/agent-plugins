import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { existsSync, readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { loadRegistry } from '../../plugin/src/registry/registry.ts'
import { CONFIG, TODAY, capability, change, kanon, project, proposal, requirement, withProject } from '../helpers/project.ts'
import { CLI } from '../helpers/roots.ts'

const ID = `${TODAY}-coupon-redemption`
const DIR = `changes/${ID}`
const ARCHIVED = `changes/archive/${ID}`

const SPEC = [
  requirement('CHK-003', 'Ubiquitous', 'THE Checkout SHALL accept any coupon.'),
  requirement('CHK-009', 'Event', 'WHEN the coupon is applied, THE Checkout SHALL show the total.'),
].join('\n')

const DELTA = [
  '## ADDED',
  '',
  '### CHK-015 [Unwanted]',
  '',
  'IF the [[coupon]] is expired, THEN THE Checkout SHALL reject it.',
  'Supersedes: CHK-003',
  '',
  '## MODIFIED',
  '',
  '### CHK-009 [Event]',
  '',
  'WHEN the [[coupon]] is applied, THE Checkout SHALL show the discounted total.',
  '',
  '## REMOVED',
  '',
  '### CHK-003',
  '',
  'Reason: replaced by CHK-015, which names the expired case.',
  '',
].join('\n')

function read(root: string, path: string): string {
  return readFileSync(join(root, path), 'utf8')
}

/** Every file of the project with its content, to tell whether a run wrote anything. */
function snapshot(root: string, dir = ''): Record<string, string> {
  return Object.fromEntries(
    readdirSync(join(root, dir), { withFileTypes: true }).flatMap(entry => {
      const path = dir === '' ? entry.name : `${dir}/${entry.name}`

      return entry.isDirectory() ? Object.entries(snapshot(root, path)) : [[path, read(root, path)]]
    }),
  )
}

test('RF-0025: change open creates the folder under the date of the day and prints the ID', () => {
  withProject(project(SPEC), root => {
    const run = kanon(root, 'change', 'open', 'coupon-redemption')

    assert.equal(run.status, 0, run.stderr)
    assert.equal(run.stdout, `${ID}\n`)
    assert.equal(run.stderr, '')
    assert.match(read(root, `${DIR}/proposal.md`), new RegExp(`^---\\nchange: ${ID}\\nstatus: open\\n---\\n\\n# ${ID}\\n`))
    // RN-0052: a change with only a proposal is a valid open change.
    assert.equal(kanon(root, 'lint').stdout, 'kanon: no findings.\n')
  })
})

test('RF-0025: the date is the local date of the day, and a fixed date that is no date stops the run', () => {
  const localDate = (): string => {
    const now = new Date()

    return [now.getFullYear(), now.getMonth() + 1, now.getDate()].map(part => String(part).padStart(2, '0')).join('-')
  }

  withProject({ '.kanon/config.yml': CONFIG }, root => {
    const open = (slug: string, today?: string): ReturnType<typeof kanon> => {
      const env: NodeJS.ProcessEnv = { ...process.env, KANON_REPO_ROOT: root }

      delete env.KANON_TODAY
      if (today !== undefined) {
        env.KANON_TODAY = today
      }

      const run = spawnSync('node', [CLI, 'change', 'open', slug], { cwd: root, env, encoding: 'utf8' })

      return { status: run.status, stdout: run.stdout, stderr: run.stderr }
    }
    const before = localDate()
    const run = open('by-the-clock')

    // Two candidates, for a run that crosses midnight.
    assert.ok([`${before}-by-the-clock\n`, `${localDate()}-by-the-clock\n`].includes(run.stdout), run.stdout)

    for (const today of ['yesterday', '2026-10-2', '02/10/2026', '']) {
      const fixed = open('fixed', today)

      assert.equal(fixed.status, 2, today)
      assert.match(fixed.stderr, /KANON_TODAY/, today)
    }
    assert.deepEqual(readdirSync(join(root, 'changes')), [run.stdout.trim()])
  })
})

test('RF-0025: a slug that is not lowercase kebab-case is refused, and nothing is created', () => {
  withProject({ '.kanon/config.yml': CONFIG }, root => {
    for (const slug of ['Coupon', 'coupon_redemption', 'coupon--redemption', '-coupon', 'coupon-', '../coupon', 'a/b', 'coupon redemption']) {
      const run = kanon(root, 'change', 'open', slug)

      assert.equal(run.status, 1, slug)
      assert.match(run.stderr, /is not a slug/, slug)
    }
    assert.equal(existsSync(join(root, 'changes')), false)
  })
})

test('RF-0025: an ID that already exists, open or archived, is refused (RN-0052)', () => {
  withProject(
    { '.kanon/config.yml': CONFIG, ...change(ID), [`changes/archive/${TODAY}-guest-checkout/proposal.md`]: proposal(`${TODAY}-guest-checkout`, 'synced') },
    root => {
      const open = kanon(root, 'change', 'open', 'coupon-redemption')
      const archived = kanon(root, 'change', 'open', 'guest-checkout')

      assert.equal(open.status, 1)
      assert.match(open.stderr, new RegExp(`already exists, in ${DIR}\\.`))
      assert.equal(archived.status, 1)
      assert.match(archived.stderr, /already exists, in changes\/archive\//)
      assert.equal(existsSync(join(root, `changes/${TODAY}-guest-checkout`)), false)
    },
  )
})

test('RF-0025: with no configuration, or with a subcommand that does not exist, the command cannot run', () => {
  withProject({}, root => {
    assert.equal(kanon(root, 'change', 'open', 'coupon-redemption').status, 2)
    assert.equal(existsSync(join(root, 'changes')), false)
  })
  withProject({ '.kanon/config.yml': CONFIG }, root => {
    assert.equal(kanon(root, 'change').status, 2)
    assert.equal(kanon(root, 'change', 'open').status, 2)
    assert.equal(kanon(root, 'change', 'close', ID).status, 2)
  })
})

test('RF-0026: sync applies the delta, writes the tombstone, marks the proposal and archives the folder', () => {
  withProject(project(SPEC, change(ID, { checkout: DELTA })), root => {
    const run = kanon(root, 'change', 'sync', ID)

    assert.equal(run.status, 0, run.stderr + run.stdout)
    assert.equal(
      run.stdout,
      ['written  specs/checkout/spec.md', 'written  .kanon/capabilities/CHK.md', `written  ${DIR}/proposal.md`, `moved  ${DIR} -> ${ARCHIVED}`, ''].join('\n'),
    )
    // RN-0058: the block is replaced in place, the removed one leaves, the added one goes to the end.
    assert.equal(
      read(root, 'specs/checkout/spec.md'),
      [
        '# checkout',
        '',
        '### CHK-009 [Event]',
        '',
        'WHEN the [[coupon]] is applied, THE Checkout SHALL show the discounted total.',
        '',
        '### CHK-015 [Unwanted]',
        '',
        'IF the [[coupon]] is expired, THEN THE Checkout SHALL reject it.',
        'Supersedes: CHK-003',
        '',
      ].join('\n'),
    )
    assert.deepEqual(loadRegistry(root).get('CHK')?.tombstones, ['CHK-003'])
    assert.equal(loadRegistry(root).get('CHK')?.counter, 20)
    assert.equal(existsSync(join(root, DIR)), false)
    assert.equal(read(root, `${ARCHIVED}/proposal.md`), proposal(ID, 'synced'))
    // The archived delta is kept as written, reason included.
    assert.equal(read(root, `${ARCHIVED}/specs/checkout/spec.md`), DELTA)
    // The project is clean after the sync, and the archive is not linted.
    assert.equal(kanon(root, 'lint').stdout, 'kanon: no findings.\n')
  })
})

test('RF-0026: a tombstone goes to the registry of the prefix of the ID, whatever spec the requirement lived in', () => {
  const files = project(requirement('BIL-002', 'Ubiquitous', 'THE Checkout SHALL show the total.'), {
    '.kanon/capabilities/BIL.md': capability('BIL', 'billing', 5, ['BIL-001']),
    'specs/billing/spec.md': '# billing\n',
    ...change(ID, { checkout: '## REMOVED\n\n### BIL-002\n\nReason: billing took it over.\n' }),
  })

  withProject(files, root => {
    const run = kanon(root, 'change', 'sync', ID)

    assert.equal(run.status, 0, run.stderr + run.stdout)
    assert.match(run.stdout, /^written {2}\.kanon\/capabilities\/BIL\.md$/m)
    assert.deepEqual(loadRegistry(root).get('BIL')?.tombstones, ['BIL-001', 'BIL-002'])
    assert.deepEqual(loadRegistry(root).get('CHK')?.tombstones, [])
  })
})

test('RF-0026: a change with an error is refused with its findings, and nothing is written', () => {
  const broken = DELTA.replace('### CHK-009 [Event]', '### CHK-010 [Event]')

  withProject(project(SPEC, change(ID, { checkout: broken })), root => {
    const before = snapshot(root)
    const run = kanon(root, 'change', 'sync', ID)

    assert.equal(run.status, 1)
    assert.match(run.stdout, new RegExp(`^${DIR}/specs/checkout/spec\\.md:10 {2}kanon/delta-target {2}error {2}`, 'm'))
    assert.match(run.stderr, /nothing was written/)
    assert.deepEqual(snapshot(root), before)
  })
})

test('RF-0026: an error in another change or in the current specs does not stop the sync, and a warning is shown and does not stop it', () => {
  const other = `${TODAY}-other`
  const files = project(SPEC, {
    'specs/payment/spec.md': requirement('CHK-14', 'Ubiquitous', 'THE Checkout SHALL show the total.'),
    ...change(ID, { checkout: DELTA }),
    ...change(other, {
      checkout: '## MODIFIED\n\n### CHK-009 [Event]\n\nWHEN the coupon is applied, THE Checkout SHALL show the tax.\n\n## ADDED\n\n### CHK-99 [Ubiquitous]\n',
    }),
  })

  withProject(files, root => {
    const run = kanon(root, 'change', 'sync', ID)

    assert.equal(run.status, 0, run.stderr + run.stdout)
    assert.match(run.stdout, new RegExp(`^${DIR}/specs/checkout/spec\\.md:10 {2}kanon/delta-conflict {2}warning {2}`, 'm'))
    assert.match(run.stdout, /kanon: 0 errors, 1 warning\./)
    assert.equal(existsSync(join(root, ARCHIVED)), true)
    assert.equal(existsSync(join(root, `changes/${other}`)), true)
  })
})

test('RF-0026: a change that is not open, is archived, has no operation or is no change ID is refused', () => {
  const files = project(SPEC, {
    ...change(ID),
    [`changes/${TODAY}-empty/proposal.md`]: proposal(`${TODAY}-empty`),
    [`changes/${TODAY}-empty/specs/checkout/spec.md`]: '## ADDED\n',
    [`changes/archive/${TODAY}-done/proposal.md`]: proposal(`${TODAY}-done`, 'synced'),
    'outside/proposal.md': 'not a change\n',
  })

  withProject(files, root => {
    const before = snapshot(root)
    const refusal = (id: string): string => {
      const run = kanon(root, 'change', 'sync', id)

      assert.equal(run.status, 1, id)

      return run.stderr
    }

    assert.match(refusal(`${TODAY}-nowhere`), /is not an open change/)
    assert.match(refusal(`${TODAY}-done`), /is already archived/)
    assert.match(refusal(ID), /has no operation in any delta/)
    assert.match(refusal(`${TODAY}-empty`), /has no operation in any delta/)
    assert.match(refusal('../outside'), /is not a change ID/)
    assert.match(refusal('archive'), /is not a change ID/)
    assert.deepEqual(snapshot(root), before)
  })
})

test('RF-0026: sync writes a spec with Windows line endings in its own line endings (RN-0058)', () => {
  const files = project('', { 'specs/checkout/spec.md': `# checkout\n\n${SPEC}`.replaceAll('\n', '\r\n'), ...change(ID, { checkout: DELTA }) })

  withProject(files, root => {
    assert.equal(kanon(root, 'change', 'sync', ID).status, 0)

    const spec = read(root, 'specs/checkout/spec.md')

    assert.equal(/[^\r]\n/.test(spec), false)
    assert.match(spec, /### CHK-015 \[Unwanted\]\r\n\r\nIF the/)
  })
})

test('RF-0026: a registered capability whose spec file is gone gets it back from the first ADDED', () => {
  const files = project(SPEC, {
    '.kanon/capabilities/BIL.md': capability('BIL', 'billing', 1),
    ...change(ID, { billing: `## ADDED\n\n${requirement('BIL-001', 'Ubiquitous', 'THE Checkout SHALL show the total.')}` }),
  })

  withProject(files, root => {
    const run = kanon(root, 'change', 'sync', ID)

    assert.equal(run.status, 0, run.stderr + run.stdout)
    assert.equal(read(root, 'specs/billing/spec.md'), requirement('BIL-001', 'Ubiquitous', 'THE Checkout SHALL show the total.'))
  })
})

test('RF-0027: drop turns the IDs the change allocated into tombstones, marks the proposal and archives the folder', () => {
  const delta = [
    '## ADDED',
    '',
    requirement('CHK-015', 'Ubiquitous', 'THE Checkout SHALL show the total.'),
    requirement('CHK-016', 'Ubiquitous', 'THE Checkout SHALL show the tax.'),
    '## REMOVED',
    '',
    '### CHK-003',
    '',
  ].join('\n')

  withProject(project(SPEC, change(ID, { checkout: delta })), root => {
    const spec = read(root, 'specs/checkout/spec.md')
    const run = kanon(root, 'change', 'drop', ID)

    assert.equal(run.status, 0, run.stderr)
    assert.equal(
      run.stdout,
      [
        'tombstone  CHK-015',
        'tombstone  CHK-016',
        'written  .kanon/capabilities/CHK.md',
        `written  ${DIR}/proposal.md`,
        `moved  ${DIR} -> ${ARCHIVED}`,
        '',
      ].join('\n'),
    )
    // RN-0059: the counter does not go back, and the current specs are not touched.
    assert.deepEqual(loadRegistry(root).get('CHK')?.tombstones, ['CHK-015', 'CHK-016'])
    assert.equal(loadRegistry(root).get('CHK')?.counter, 20)
    assert.equal(read(root, 'specs/checkout/spec.md'), spec)
    assert.equal(read(root, `${ARCHIVED}/proposal.md`), proposal(ID, 'dropped'))
    assert.equal(existsSync(join(root, DIR)), false)
    assert.equal(kanon(root, 'lint').stdout, 'kanon: no findings.\n')
  })
})

test('RF-0027: drop skips a live requirement, a tombstone and an ID that was never allocated, and says so (RN-0059)', () => {
  const delta = ['## ADDED', '']
    .concat(
      ['CHK-003', 'CHK-007', 'CHK-021', 'PAY-001', 'CHK-14', 'CHK-015', 'CHK-015'].map(id =>
        requirement(id, 'Ubiquitous', 'THE Checkout SHALL show the total.'),
      ),
    )
    .join('\n')
  const files = project(SPEC, { '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 20, ['CHK-007']), ...change(ID, { checkout: delta }) })

  withProject(files, root => {
    const run = kanon(root, 'change', 'drop', ID)

    assert.equal(run.status, 0, run.stderr)
    assert.deepEqual(run.stdout.split('\n').slice(0, 6), [
      'skipped  CHK-003  an active requirement, at specs/checkout/spec.md:3',
      'skipped  CHK-007  already a tombstone',
      'skipped  CHK-021  above the counter of CHK, so never allocated',
      'skipped  PAY-001  the prefix PAY is not registered, so never allocated',
      'skipped  CHK-14  not a requirement ID, so never allocated',
      'tombstone  CHK-015',
    ])
    assert.deepEqual(loadRegistry(root).get('CHK')?.tombstones, ['CHK-007', 'CHK-015'])
    assert.equal(kanon(root, 'lint').stdout, 'kanon: no findings.\n')
  })
})

test('RF-0027: drop does not validate — a broken change with no proposal is still archived, and says how it ended', () => {
  const files = project(SPEC, { [`${DIR}/specs/nowhere/spec.md`]: '## Whatever\n\n### CHK-015 [Nope]\n\n## ADDED\n\n### CHK-016\n' })

  withProject(files, root => {
    const run = kanon(root, 'change', 'drop', ID)

    assert.equal(run.status, 0, run.stderr)
    assert.deepEqual(loadRegistry(root).get('CHK')?.tombstones, ['CHK-016'])
    assert.equal(read(root, `${ARCHIVED}/proposal.md`), `---\nchange: ${ID}\nstatus: dropped\n---\n\n# ${ID}\n`)
  })
  withProject(project(SPEC, change(ID)), root => {
    const run = kanon(root, 'change', 'drop', ID)

    assert.equal(run.status, 0, run.stderr)
    assert.equal(run.stdout, `written  ${DIR}/proposal.md\nmoved  ${DIR} -> ${ARCHIVED}\n`)
  })
})

test('RF-0027: a change that is not open is not dropped', () => {
  const files = project(SPEC, { [`changes/archive/${TODAY}-done/proposal.md`]: proposal(`${TODAY}-done`, 'synced') })

  withProject(files, root => {
    const before = snapshot(root)

    for (const [id, why] of [
      [`${TODAY}-nowhere`, /is not an open change/],
      [`${TODAY}-done`, /is already archived/],
      ['..', /is not a change ID/],
      ['archive', /is not a change ID/],
    ] as const) {
      const run = kanon(root, 'change', 'drop', id)

      assert.equal(run.status, 1, id)
      assert.match(run.stderr, why, id)
    }
    assert.deepEqual(snapshot(root), before)
  })
})

test('RNF-0007: everything a change writes is Markdown inside the project', () => {
  withProject(project(SPEC), root => {
    const opened = kanon(root, 'change', 'open', 'coupon-redemption').stdout.trim()

    assert.equal(opened, ID)
    assert.deepEqual(Object.keys(snapshot(root, 'changes')), [`${DIR}/proposal.md`])
  })
})
