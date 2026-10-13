import { test } from 'node:test'
import assert from 'node:assert/strict'

import { runCli } from '../helpers/cli.ts'
import { tempRepo } from '../helpers/repo.ts'

test('no command prints the usage on stderr and exits 2', t => {
  const result = runCli([], { cwd: tempRepo(t, {}) })

  assert.equal(result.status, 2)
  assert.match(result.stderr, /^Usage: ownership <command>/)
})

test('--help prints the usage, listing validate, explain and init, and exits 0', t => {
  for (const flag of ['--help', '-h']) {
    const result = runCli([flag], { cwd: tempRepo(t, {}) })

    assert.equal(result.status, 0)
    assert.match(result.stdout, /^ {2}validate /m)
    assert.match(result.stdout, /^ {2}explain /m)
    assert.match(result.stdout, /^ {2}init /m)
  }
})

test('an unknown command or option exits 2 with a message on stderr', t => {
  const root = tempRepo(t, {})
  const command = runCli(['frobnicate'], { cwd: root })
  const option = runCli(['validate', '--base', 'origin/main'], { cwd: root })

  assert.equal(command.status, 2)
  assert.match(command.stderr, /^ownership: unknown command "frobnicate"/)
  assert.equal(option.status, 2)
  assert.match(option.stderr, /^ownership: Unknown option '--base'/)
})
