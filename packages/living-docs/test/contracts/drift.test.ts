import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { coreChecks, resolveOwnership } from '@esliph/ownership'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
const GENERATED = 'docs/contracts/checks.gen.md'

test('RF-0006: the generated contract of this repository has not drifted — dogfooding with the real generator', () => {
  const config = resolveOwnership(ROOT)

  assert.ok(config !== null && config.generated.length >= 1, 'this repository must declare at least one generated artifact')
  const drift = coreChecks().find(check => check.id === 'ownership/generated-drift')!
  const findings = drift.run({ root: ROOT, config, today: '2026-09-28' })

  assert.deepEqual(findings, [], JSON.stringify(findings, null, 2))
})

test('RN-0012: the generated artifact declares itself generated, and does not pretend to be an editable artifact', () => {
  const source = readFileSync(join(ROOT, GENERATED), 'utf8')

  assert.match(source.split('\n')[0] ?? '', /generated: do not edit/, 'the marker opens the file (spec §2)')
  assert.doesNotMatch(source, /^---$/m, 'a generated artifact has no editable frontmatter (spec §2)')
  assert.match(source, /src\/checks\/catalog\.ts/, 'the file must name its own source')
  assert.match(source, /core catalog/, 'and the core source')
})
