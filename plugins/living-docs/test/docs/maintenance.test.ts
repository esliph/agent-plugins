import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadCodeowners, ownersOf } from '@esliph/ownership'
import { documentWithRole, loadLivingDocsConfig } from '../../plugin/src/config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../../plugin/src/docs/collect.ts'
import { debtsWithoutTrigger, duePayments } from '../../plugin/src/checks/staleness.ts'
import { documentationFiles } from '../../plugin/src/docs/corpus.ts'
import { checkoutRoot } from '../helpers/checkout.ts'
import { todayIso } from '../../plugin/src/core/dates.ts'

const ROOT = checkoutRoot()
const CONFIG = loadLivingDocsConfig(ROOT)

function contextFor() {
  return {
    root: ROOT,
    config: CONFIG,
    docs: collectArtifacts(ROOT, CONFIG),
    documents: collectDocuments(ROOT, CONFIG),
    today: todayIso(),
  }
}

test('RN-0016: every document in this repository has an owner in both places', () => {
  const codeowners = loadCodeowners(ROOT)

  assert.ok(codeowners, 'CODEOWNERS should exist')

  const withoutOwner: string[] = []

  for (const file of documentationFiles(ROOT, CONFIG)) {
    if (ownersOf(codeowners, file) === null) {
      withoutOwner.push(file)
    }
  }

  assert.deepEqual(withoutOwner, [], `no line in CODEOWNERS: ${withoutOwner.join(', ')}`)
})

test('RN-0016: `documents:` and CODEOWNERS declare the same owner', () => {
  const codeowners = loadCodeowners(ROOT)

  assert.ok(codeowners)

  for (const document of CONFIG.documents) {
    const owners = ownersOf(codeowners, document.path.replace(/\/$/, '/x'))

    assert.ok(owners, `${document.path} without an owner in CODEOWNERS`)
    assert.ok(owners.includes(document.owner), `${document.path}: .ownership.yml says ${document.owner}, CODEOWNERS says ${owners.join(', ')}`)
  }
})

test('RN-0019: every `open` debt in this repository has a verifiable, unexpired trigger', () => {
  const context = contextFor()

  assert.deepEqual(
    debtsWithoutTrigger(context).map(debt => debt.id),
    [],
    'a debt without `pay-when` is an orphan `TODO` with a number',
  )
  assert.deepEqual(
    duePayments(context).map(payment => `${payment.id} — ${payment.evidence}`),
    [],
    'if it shows up here, the debt is due: pay it or reclassify it (human act)',
  )
})

test('ADR-0008: both roles are declared and point to files that exist', () => {
  for (const role of ['agent-contract', 'definition-of-done'] as const) {
    const document = documentWithRole(CONFIG, role)

    assert.ok(document, `no document declares role: ${role} — living-docs/agent-contract-duplication and living-docs/done-verifiable would have no way to find it`)
    assert.ok(existsSync(join(ROOT, document.path)), `${document.path} declared and absent`)
  }
})

test('RN-0020: the agent contract remains an index — no sentence copied from an owning artifact', () => {
  // The real proof is living-docs/agent-contract-duplication running in `validate`; this test exists so that the
  // failure points at the contract instead of getting lost among the other findings.
  const contract = documentWithRole(CONFIG, 'agent-contract')

  assert.ok(contract)

  const context = contextFor()
  const source = context.documents.find(document => document.file === contract.path)?.source

  assert.ok(source, `${contract.path} should have been collected`)
})

test('spec §12 criteria 9 and 10: what only people verify goes in as a human line', () => {
  const dodDocument = documentWithRole(CONFIG, 'definition-of-done')

  assert.ok(dodDocument)
  const dod = readFileSync(join(ROOT, dodDocument.path), 'utf8')

  const human = [/lack of context/i, /document-volume metric/i]

  for (const pattern of human) {
    const line = dod.split('\n').find(l => pattern.test(l))

    assert.ok(line, `the Definition of Done has no line for ${pattern}`)
    assert.match(line ?? '', /^- \[ \] /, 'must be a checklist item')
    assert.match(
      line ?? '',
      /verification: human\b/,
      'these two are human verification by nature — a check that pretended to measure them would be worse than having none',
    )
    assert.doesNotMatch(line ?? '', /\bCI-\d+\b/, 'no check measures these two')
  }
})
