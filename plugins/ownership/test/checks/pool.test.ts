import { test } from 'node:test'
import assert from 'node:assert/strict'
import { setTimeout as sleep } from 'node:timers/promises'

import { runPool } from '../../plugin/src/checks/pool.ts'

test('no more than the limit runs at once, and results keep the order of the items', async () => {
  let running = 0
  let peak = 0
  const results = await runPool([30, 10, 20, 5, 15], 2, async delay => {
    running += 1
    peak = Math.max(peak, running)
    await sleep(delay)
    running -= 1

    return delay * 2
  })

  assert.equal(peak, 2)
  assert.deepEqual(results, [60, 20, 40, 10, 30])
})

test('an empty list gives an empty result', async () => {
  assert.deepEqual(await runPool([], 4, () => Promise.resolve(1)), [])
})
