import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanCitations } from '../../plugin/src/ids/coverage.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('finds citations only in the declared paths', () => {
  withTempRepo(
    {
      'test/rule.test.ts': "// covers RN-0001\ntest('RN-0001', () => {});\n",
      'src/app.ts': 'export const x = 1; // RN-0002\n',
      'notes.md': 'RN-0003 mentioned out of scope\n',
    },
    root => {
      const sites = scanCitations(root, ['test/**', 'src/**'])

      assert.equal(sites.get('RN-0001')?.length, 2)
      assert.equal(sites.get('RN-0002')?.[0]?.file, 'src/app.ts')
      assert.equal(sites.has('RN-0003'), false)
    },
  )
})

test('without globs, scans nothing', () => {
  withTempRepo({ 'src/a.ts': 'RN-0001\n' }, root => {
    assert.equal(scanCitations(root, []).size, 0)
  })
})

test('ignores node_modules', () => {
  withTempRepo({ 'node_modules/package/index.js': 'RN-0001\n' }, root => {
    assert.equal(scanCitations(root, ['**/*.js']).size, 0)
  })
})

test('the site line points to the occurrence inside the file', () => {
  withTempRepo({ 'src/a.ts': 'line 1\nline 2\n// RN-0004\n' }, root => {
    assert.equal(scanCitations(root, ['src/**']).get('RN-0004')?.[0]?.line, 3)
  })
})

test('a binary file does not become a citation site', () => {
  withTempRepo({ 'src/data.bin': `RN-0005${String.fromCharCode(0)}junk` }, root => {
    assert.equal(scanCitations(root, ['src/**']).size, 0)
  })
})
