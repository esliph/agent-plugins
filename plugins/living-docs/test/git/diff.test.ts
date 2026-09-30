import { test } from 'node:test'
import assert from 'node:assert/strict'
import { changedLines, changedPaths, commitMessages, GitError } from '../../plugin/src/git/diff.ts'

const NUL = String.fromCharCode(0)

/** Fake runner: records the received arguments and returns the combined output. */
function fake(output: string): { run: (args: readonly string[], cwd: string) => string; calls: string[][] } {
  const calls: string[][] = []

  return {
    calls,
    run: args => {
      calls.push([...args])

      return output
    },
  }
}

test('ADR-0006: changedPaths uses three dots, -z and safe.directory', () => {
  const git = fake(`src/cli/index.ts${NUL}CHANGELOG.md${NUL}`)
  const paths = changedPaths('/repo', 'origin/master', git.run)

  assert.deepEqual(paths, ['src/cli/index.ts', 'CHANGELOG.md'])
  assert.deepEqual(git.calls[0], ['-c', 'safe.directory=*', 'diff', '--name-only', '-z', 'origin/master...HEAD'])
})

test('ADR-0006: a path with an accent comes back whole, without quotes or escaping', () => {
  const git = fake(`docs/résumé.md${NUL}`)

  assert.deepEqual(changedPaths('/repo', 'base', git.run), ['docs/résumé.md'])
})

test('changedPaths normalizes the slash and drops empty entries', () => {
  const git = fake(`src\\cli\\index.ts${NUL}${NUL}`)

  assert.deepEqual(changedPaths('/repo', 'base', git.run), ['src/cli/index.ts'])
})

test('ADR-0006: commitMessages uses two dots and splits on NUL', () => {
  const git = fake(`feat: one${NUL}\nfix: two\n\nChangelog: none — reason${NUL}\n`)
  const messages = commitMessages('/repo', 'origin/master', git.run)

  assert.deepEqual(messages, ['feat: one', 'fix: two\n\nChangelog: none — reason'])
  assert.deepEqual(git.calls[0], ['-c', 'safe.directory=*', 'log', '--format=%B%x00', 'origin/master..HEAD'])
})

test('ADR-0006: a git error becomes GitError — this module does not fail open', () => {
  const run = () => {
    const err = new Error('Command failed') as Error & { stderr: string }

    err.stderr = "fatal: bad revision 'origin/does-not-exist'\n"
    throw err
  }

  assert.throws(
    () => changedPaths('/repo', 'origin/does-not-exist', run),
    (err: unknown) => err instanceof GitError && /bad revision/.test(err.message),
  )
  assert.throws(() => commitMessages('/repo', 'x', run), GitError)
})

test('GitError names the command that failed, not only the cause', () => {
  const run = () => {
    throw new Error('spawn git ENOENT')
  }

  assert.throws(
    () => changedPaths('/repo', 'base', run),
    (err: unknown) => err instanceof GitError && /git diff base\.\.\.HEAD/.test(err.message),
  )
})

const PATCH = [
  'diff --git a/docs/glossary.md b/docs/glossary.md',
  'index 1111111..2222222 100644',
  '--- a/docs/glossary.md',
  '+++ b/docs/glossary.md',
  '@@ -6 +6 @@',
  '-last-reviewed: 2026-01-01',
  '+last-reviewed: 2026-08-31',
  'diff --git a/docs/deleted.md b/docs/deleted.md',
  'deleted file mode 100644',
  '--- a/docs/deleted.md',
  '+++ /dev/null',
  '@@ -1,2 +0,0 @@',
  '-title',
  '--- this is removed content, not a header',
  '',
].join('\n')

test('RN-0027: changedLines splits per file and does not mistake content for a header', () => {
  const git = fake(PATCH)
  const edits = changedLines('/repo', 'origin/master', git.run)

  // The deleted file does not become an edit: `+++ /dev/null` does not open a section, and its
  // removed lines do not leak into the previous file.
  assert.deepEqual(edits, [
    {
      path: 'docs/glossary.md',
      added: ['last-reviewed: 2026-08-31'],
      removed: ['last-reviewed: 2026-01-01'],
    },
  ])

  assert.deepEqual(git.calls[0], [
    '-c',
    'safe.directory=*',
    '-c',
    'core.quotePath=false',
    'diff',
    '--unified=0',
    '--no-color',
    '--no-renames',
    'origin/master...HEAD',
  ])
})
