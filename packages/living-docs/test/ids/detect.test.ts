import { test } from 'node:test'
import assert from 'node:assert/strict'
import { detectIdFormat } from '../../src/ids/detect.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const NO_HYPHEN = [
  '# Rules',
  '',
  '## RN001 — A rule',
  '- **status:** active',
  '',
  '## RN002 — Another',
  '- **status:** active',
  '',
  '## RN003 — One more',
  '- **status:** active',
  '',
].join('\n')

test('RF-0014: the scan reports the dominant form and how many items it read in it', () => {
  withTempRepo({ 'docs/business-rules.md': NO_HYPHEN }, root => {
    const detected = detectIdFormat(root, ['docs/business-rules.md'])

    assert.ok(detected)
    assert.deepEqual(detected.format, { separator: '', padding: 3 })
    assert.equal(detected.count, 3)
    assert.equal(detected.sample, 'RN001')
  })
})

test('RF-0014: a repository with no IDs at all does not invent a form', () => {
  withTempRepo({ 'docs/empty.md': '# nothing here\n' }, root => {
    assert.equal(detectIdFormat(root, ['docs/empty.md']), null)
  })
})

test('RF-0014: the default form is detected as the default', () => {
  withTempRepo({ 'docs/adr/ADR-0001-x.md': '---\nid: ADR-0001\n---\n\n# ADR-0001\n' }, root => {
    const detected = detectIdFormat(root, ['docs/adr/'])

    assert.ok(detected)
    assert.deepEqual(detected.format, { separator: '-', padding: 4 })
  })
})
