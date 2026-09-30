import { test } from 'node:test'
import assert from 'node:assert/strict'
import { toRepoPath } from '../../../plugin/src/hooks/lib/paths.ts'

// Example roots, deliberately neutral: the real container path lives
// in the compose file and in the wrappers, never in code (ADR-0003).
const ROOTS = ['/srv/repo', '/mnt/c/Users/dev/repo']

test('converts a host path into a repository path', () => {
  assert.equal(toRepoPath('/mnt/c/Users/dev/repo/docs/a.md', ROOTS), 'docs/a.md')
})

test('converts a container path', () => {
  assert.equal(toRepoPath('/srv/repo/docs/a.md', ROOTS), 'docs/a.md')
})

test('normalizes Windows separators and ./', () => {
  assert.equal(toRepoPath('C:\\Users\\dev\\repo\\docs\\a.md', ['C:/Users/dev/repo']), 'docs/a.md')
  assert.equal(toRepoPath('./docs/a.md', ROOTS), 'docs/a.md')
})

test('a relative path passes straight through', () => {
  assert.equal(toRepoPath('docs/a.md', ROOTS), 'docs/a.md')
})

test('an absolute path outside any root returns null', () => {
  assert.equal(toRepoPath('/etc/passwd', ROOTS), null)
})

test('the root itself is not a file inside it', () => {
  assert.equal(toRepoPath('/srv/repo', ROOTS), null)
})
