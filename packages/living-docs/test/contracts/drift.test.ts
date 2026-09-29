import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { coreChecks, resolveOwnership } from '@esliph/ownership'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
const GENERATED = 'docs/contracts/checks.gen.md'

test('RF-0006: o contrato gerado deste repositório não derivou — dogfooding com o gerador de verdade', () => {
  const config = resolveOwnership(ROOT)

  assert.ok(config !== null && config.generated.length >= 1, 'este repositório precisa declarar ao menos um artefato gerado')
  const drift = coreChecks().find(check => check.id === 'ownership/generated-drift')!
  const findings = drift.run({ root: ROOT, config, today: '2026-09-28' })

  assert.deepEqual(findings, [], JSON.stringify(findings, null, 2))
})

test('RN-0012: o artefato gerado se declara gerado, e não finge ser artefato editável', () => {
  const source = readFileSync(join(ROOT, GENERATED), 'utf8')

  assert.match(source.split('\n')[0] ?? '', /generated: do not edit/, 'o marcador abre o arquivo (spec §2)')
  assert.doesNotMatch(source, /^---$/m, 'artefato gerado não tem frontmatter editável (spec §2)')
  assert.match(source, /src\/checks\/catalog\.ts/, 'o arquivo precisa nomear a própria fonte')
  assert.match(source, /core catalog/, 'e a fonte do núcleo')
})
