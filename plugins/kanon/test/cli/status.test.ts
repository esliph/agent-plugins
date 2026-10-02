import { test } from 'node:test'
import assert from 'node:assert/strict'
import { capability, change, kanon, project, proposal, requirement, withProject } from '../helpers/project.ts'

const CHANGE = '2026-10-02-coupon-redemption'
const OTHER = '2026-10-02-loyalty'
const SHOWS = 'THE Checkout SHALL show the total.'

const CURRENT = [requirement('CHK-003', 'Ubiquitous', SHOWS), requirement('CHK-009', 'Ubiquitous', SHOWS)].join('\n')

const DELTA = [
  '## ADDED',
  '',
  requirement('CHK-015', 'Ubiquitous', SHOWS),
  requirement('CHK-016', 'Ubiquitous', SHOWS),
  '## MODIFIED',
  '',
  requirement('CHK-009', 'Ubiquitous', SHOWS),
  '## REMOVED',
  '',
  '### CHK-003',
  '',
  'Reason: no longer needed.',
  '',
].join('\n')

test('RF-0028: status lists each open change with its operations per capability and what the validator sees', () => {
  const files = project(CURRENT, {
    '.kanon/capabilities/BIL.md': capability('BIL', 'billing', 5),
    'specs/billing/spec.md': '# billing\n',
    ...change(CHANGE, { checkout: DELTA, billing: `## ADDED\n\n${requirement('BIL-001', 'Ubiquitous', SHOWS)}` }),
    ...change(OTHER, { checkout: `## MODIFIED\n\n${requirement('CHK-009', 'Ubiquitous', SHOWS)}\n## ADDED\n\n${requirement('CHK-14', 'Ubiquitous', SHOWS)}` }),
    'changes/archive/2026-09-14-guest-checkout/proposal.md': proposal('2026-09-14-guest-checkout', 'synced'),
  })

  withProject(files, root => {
    const run = kanon(root, 'status')

    // A view: it exits 0 even when a change has errors.
    assert.equal(run.status, 0, run.stderr)
    assert.equal(
      run.stdout,
      [
        `${CHANGE}  0 errors, 1 warning`,
        '  billing  1 added, 0 modified, 0 removed',
        '  checkout  2 added, 1 modified, 1 removed',
        `${OTHER}  1 error, 1 warning`,
        '  checkout  1 added, 1 modified, 0 removed',
        '',
      ].join('\n'),
    )
  })
})

test('RF-0028: a change with no delta is listed alone, and a project with no open change says so', () => {
  withProject(project(CURRENT, change(CHANGE)), root => {
    assert.equal(kanon(root, 'status').stdout, `${CHANGE}  0 errors, 0 warnings\n`)
  })
  withProject(project(CURRENT, { 'changes/archive/2026-09-14-guest-checkout/proposal.md': proposal('2026-09-14-guest-checkout', 'dropped') }), root => {
    const run = kanon(root, 'status')

    assert.equal(run.status, 0, run.stderr)
    assert.equal(run.stdout, 'kanon: no open change.\n')
  })
})

test('RF-0028: status writes nothing, and exits 2 only when it could not run', () => {
  withProject({}, root => {
    const run = kanon(root, 'status')

    assert.equal(run.status, 2)
    assert.match(run.stderr, /kanon init/)
  })
})
