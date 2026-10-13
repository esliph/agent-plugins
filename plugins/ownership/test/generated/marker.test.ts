import { test } from 'node:test'
import assert from 'node:assert/strict'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'

import { isGeneratedByMarker, readHead } from '../../plugin/src/generated/marker.ts'
import { tempRepo, writeFile } from '../helpers/repo.ts'

test('the marker counts on the first line, in any case', () => {
  assert.equal(isGeneratedByMarker('<!-- generated: do not edit -->\nbody\n'), true)
  assert.equal(isGeneratedByMarker('// GENERATED: DO NOT EDIT\n'), true)
  assert.equal(isGeneratedByMarker(new TextEncoder().encode('# Generated: Do Not Edit')), true)
})

test('the marker on another line, or beyond the first 512 bytes, does not count', () => {
  assert.equal(isGeneratedByMarker('# Title\ngenerated: do not edit\n'), false)
  assert.equal(isGeneratedByMarker(`${'x'.repeat(600)} generated: do not edit\n`), false)
  assert.equal(isGeneratedByMarker(''), false)
})

test('the head of a regular file is read; a directory or a missing file has none', t => {
  const root = tempRepo(t, {}, { git: false })

  writeFile(root, 'a.md', `generated: do not edit\n${'y'.repeat(2000)}`)
  mkdirSync(join(root, 'dir'))

  assert.equal(readHead(join(root, 'a.md'))?.length, 512)
  assert.equal(readHead(join(root, 'dir')), null)
  assert.equal(readHead(join(root, 'missing.md')), null)
})
