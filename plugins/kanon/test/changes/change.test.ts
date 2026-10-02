import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHANGE_ID, SLUG, archivedChangeIds, loadChange, openChangeIds, withStatus } from '../../plugin/src/changes/change.ts'
import { change, proposal, withProject } from '../helpers/project.ts'

const ID = '2026-10-02-coupon-redemption'

test('RN-0052: a change ID is a date, a hyphen and a slug in lowercase with hyphens', () => {
  for (const id of [ID, '2026-10-02-x', '2026-10-02-v2-rollout']) {
    assert.equal(CHANGE_ID.test(id), true, id)
  }
  for (const id of [
    '2026-10-coupon-redemption',
    'coupon-redemption',
    '2026-10-02',
    '2026-10-02-Coupon',
    '2026-10-02-a--b',
    '2026-10-02-a-',
    '2026-10-02-a_b',
    'archive',
  ]) {
    assert.equal(CHANGE_ID.test(id), false, id)
  }
  assert.equal(SLUG.test('coupon-redemption'), true)
  assert.equal(SLUG.test('../coupon'), false)
})

test('RN-0052: a change is open under changes/ and closed under changes/archive/', () => {
  const files = {
    ...change(ID),
    ...change('not-a-change-id'),
    'changes/README.md': 'a file is not a change\n',
    'changes/archive/2026-09-14-guest-checkout/proposal.md': proposal('2026-09-14-guest-checkout', 'synced'),
  }

  withProject(files, root => {
    assert.deepEqual(openChangeIds(root), [ID, 'not-a-change-id'])
    assert.deepEqual(archivedChangeIds(root), ['2026-09-14-guest-checkout'])
  })
  withProject({}, root => {
    assert.deepEqual(openChangeIds(root), [])
    assert.deepEqual(archivedChangeIds(root), [])
  })
})

test('RN-0052: a change is read with its proposal and one delta per spec it mirrors', () => {
  const files = change(ID, { checkout: '## ADDED\n', billing: '## REMOVED\n' })

  withProject({ ...files, [`changes/${ID}/specs/checkout/notes.md`]: 'not a delta\n' }, root => {
    const loaded = loadChange(root, ID)

    assert.equal(loaded.dir, `changes/${ID}`)
    assert.deepEqual(loaded.proposal, { file: `changes/${ID}/proposal.md`, problem: null, change: ID, line: 2 })
    assert.deepEqual(
      loaded.deltas.map(delta => [delta.file, delta.target]),
      [
        [`changes/${ID}/specs/billing/spec.md`, 'specs/billing/spec.md'],
        [`changes/${ID}/specs/checkout/spec.md`, 'specs/checkout/spec.md'],
      ],
    )
  })
})

test('RN-0052: a proposal that is missing, has no front matter or does not parse says so instead of stopping the run', () => {
  const problem = (files: Record<string, string>): string | null => {
    let found: string | null = null

    withProject(files, root => {
      found = loadChange(root, ID).proposal.problem
    })

    return found
  }

  assert.equal(problem({ [`changes/${ID}/specs/checkout/spec.md`]: '## ADDED\n' }), 'the change has no proposal.md.')
  assert.equal(problem({ [`changes/${ID}/proposal.md`]: '# only prose\n' }), 'the proposal has no front matter.')
  assert.match(problem({ [`changes/${ID}/proposal.md`]: '---\nchange: [\n---\n' }) ?? '', /^the front matter does not parse — line 2/)
})

test('RN-0052: the status of a proposal is set in place, and every other line stays as it was', () => {
  const body = '\n# Coupons\n\nstatus: this line is prose, not front matter.\n'

  assert.equal(
    withStatus(`---\nchange: ${ID}\nstatus: open\nowner: someone\n---\n${body}`, ID, 'synced'),
    `---\nchange: ${ID}\nstatus: synced\nowner: someone\n---\n${body}`,
  )
  assert.equal(withStatus(`---\nchange: ${ID}\n---\n${body}`, ID, 'dropped'), `---\nchange: ${ID}\nstatus: dropped\n---\n${body}`)
  assert.equal(withStatus(`---\r\nchange: ${ID}\r\nstatus: open\r\n---\r\n`, ID, 'synced'), `---\r\nchange: ${ID}\r\nstatus: synced\r\n---\r\n`)
})

test('RN-0052: a proposal with no front matter, or no proposal at all, gets one that says how the change ended', () => {
  assert.equal(withStatus('# only prose\n', ID, 'dropped'), `---\nchange: ${ID}\nstatus: dropped\n---\n# only prose\n`)
  assert.equal(withStatus(null, ID, 'dropped'), `---\nchange: ${ID}\nstatus: dropped\n---\n\n# ${ID}\n`)
})
