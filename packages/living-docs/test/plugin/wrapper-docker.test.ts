import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import picomatch from 'picomatch'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()

function source(relative: string): string {
  return readFileSync(join(ROOT, relative), 'utf8')
}

/**
 * The execute bit comes from the git index, not from the filesystem: a
 * Windows checkout has no POSIX mode, and what reaches whoever clones is the
 * versioned mode. Same choice as `test/plugin/manifest.test.ts`.
 */
function gitMode(relative: string): string {
  const entry = execFileSync('git', ['ls-files', '-s', '--', relative], { cwd: ROOT, encoding: 'utf8' })

  return entry.split(/\s+/)[0] ?? ''
}

test('RNF-0006: bin/dev is executable and enumerates no command', () => {
  assert.equal(gitMode('bin/dev'), '100755', 'bin/dev must be versioned as executable')

  const wrapper = source('bin/dev')

  assert.match(wrapper, /"\$@"/, 'the wrapper forwards the arguments it received')
  assert.match(wrapper, /exec\s+docker\s+exec/, 'the command replaces the wrapper — that is how the exit code is the exit code of the command')

  // The spec §2 invariant, verified instead of promised: a subcommand table
  // is exactly what cannot exist here, because it is what would
  // diverge from the host list.
  assert.doesNotMatch(wrapper, /\bcase\s+"?\$\{?[1@]/, 'subcommand table: the list that diverges from the host starts like this')
  assert.doesNotMatch(wrapper, /src\/cli\/index\.ts/, 'bin/dev does not know the CLI — bin/living-docs does')
})

test('RNF-0006: bin/dev derives the root from its own path and honors LIVING_DOCS_CONTAINER', () => {
  const wrapper = source('bin/dev')

  assert.match(wrapper, /LIVING_DOCS_CONTAINER:-esliph-living-docs/, 'the container name comes from the environment, with the default that bin/living-docs already publishes')
  assert.match(wrapper, /BASH_SOURCE\[0\]/, 'the repository root comes from the path of the script itself (ADR-0003), never from the working directory')
})

test('RNF-0006: bin/living-docs delegates to bin/dev, with no container logic of its own', () => {
  assert.equal(gitMode('bin/living-docs'), '100755', 'bin/living-docs must remain executable')

  const wrapper = source('bin/living-docs')

  assert.match(wrapper, /\/dev\b/, 'the CLI wrapper invokes bin/dev')
  assert.match(wrapper, /node\s+--conditions=development\s+packages\/living-docs\/src\/cli\/index\.ts/, 'and it, not bin/dev, is what knows the CLI')

  // The test that keeps the logic duplication from coming back: every conversation with the
  // daemon lives in bin/dev, and a second place that has it is a second place
  // to diverge.
  assert.doesNotMatch(wrapper, /docker\s+(exec|inspect|compose)/, 'duplicated container logic — it belongs in bin/dev (ADR-0016)')

  // The failure mode that TDR-0002 described: exiting 2 because the container is not
  // up. bin/dev brings the container up; nobody else needs to refuse to run.
  assert.doesNotMatch(wrapper, /exit\s+2\b/, 'the absent container is no longer a failure mode (E-2)')
})

test('RNF-0006: .ownership.yml covers bin/dev in watches, marked consumer-visible', () => {
  const config = loadLivingDocsConfig(ROOT)

  // Mechanism 1: whoever touches bin/dev brings the owning doc in the same commit. The
  // grouping by doc (`watchesFor`) belongs to the core now (ADR-0030); here it is enough to
  // find the rules whose pattern matches, the same thing the core does underneath.
  const matches = config.watches.filter(watch => picomatch(watch.code)('bin/dev'))

  assert.deepEqual(
    matches.map(match => match.doc),
    ['CHANGELOG.md'],
    'bin/dev is a public entry point and needs a declared owning doc',
  )
  assert.equal(matches[0]?.consumerVisible, true, 'the change is visible to whoever consumes it')

  // The same coverage from the CHANGELOG enforcer side, which reads the rules
  // marked `consumer-visible: true`.
  const isVisible = picomatch(config.watches.filter(watch => watch.consumerVisible).map(watch => watch.code))

  assert.ok(isVisible('bin/dev'), 'bin/dev outside the consumer-visible rules: nobody would demand the CHANGELOG entry')

  // And the wrapper that already existed cannot have been left uncovered along the way.
  assert.ok(isVisible('bin/living-docs'))
})
