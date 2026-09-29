import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHECK_BUDGET_MS, formatElapsed } from '../../src/checks/budget.ts'
import { runValidate } from '../../src/cli/validate.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const NUL = String.fromCharCode(0)

/** The fake git of this test: the cost measured is that of the checks, not of git. */
const git = (args: readonly string[]): string => {
  if (args.includes('log')) {
    return `docs(RN-0001): x${NUL}\n`
  }
  if (args.includes('--unified=0')) {
    return ''
  }

  return `packages/living-docs/src/cli/index.ts${NUL}CHANGELOG.md${NUL}`
}

test('RNF-0005: the full set of checks fits the declared ceiling, measured', () => {
  const root = checkoutRoot()
  const start = process.hrtime.bigint()

  // The living-docs set is what runs on the PR: the two runs of
  // `validate`. It is not the time of one check.
  runValidate(root)
  runValidate(root, 'origin/master', git)

  const elapsed = Number(process.hrtime.bigint() - start) / 1e6

  assert.ok(
    elapsed < CHECK_BUDGET_MS,
    `the set took ${formatElapsed(elapsed)}, and the declared ceiling is ${formatElapsed(CHECK_BUDGET_MS)} ` + '(RNF-0005) — measure before raising the ceiling',
  )
})

test('RNF-0005: each command returns what it measured, and the measure is not estimated', () => {
  const root = checkoutRoot()

  const validated = runValidate(root)

  assert.equal(typeof validated.elapsedMs, 'number')
  assert.ok(validated.elapsedMs >= 0)
  // A scan of the whole tree does not cost zero: a zeroed measure is a measure
  // nobody took.
  assert.ok(validated.elapsedMs > 0, 'elapsedMs came back zeroed — the clock was not read')
})

test('RNF-0005: formatElapsed is readable by whoever reads the PR log', () => {
  assert.equal(formatElapsed(842), '842 ms')
  assert.equal(formatElapsed(1500), '1.5 s')
  assert.equal(formatElapsed(120_000), '120.0 s')
})
