import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import picomatch from 'picomatch'
import { loadLivingDocsConfig } from '../../plugin/src/config/ownership.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

test('every watches code glob and every cited-by glob of this repository matches a versioned file', () => {
  const root = checkoutRoot()
  const files = execFileSync('git', ['ls-files', '-z'], { cwd: root, encoding: 'utf8' }).split('\0').filter(file => file !== '')
  const config = loadLivingDocsConfig(root)
  const globs = [...new Set([...config.watches.map(watch => watch.code), ...config.artifacts.flatMap(artifact => artifact.citedBy)])]
  const dead = globs.filter(glob => !files.some(picomatch(glob)))

  assert.ok(globs.length > 10, `scan too empty: ${globs.length} glob(s)`)
  assert.deepEqual(dead, [], 'a glob that matches nothing checks nothing — it still points at a path that moved')
})
