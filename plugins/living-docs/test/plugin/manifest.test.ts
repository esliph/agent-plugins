import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { toolkitRoot } from '../../plugin/src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = toolkitRoot()
const CHECKOUT = checkoutRoot()

function readJson(relative: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(ROOT, relative), 'utf8')) as Record<string, unknown>
}

test('the plugin manifest declares name, version and description', () => {
  const manifest = readJson('.claude-plugin/plugin.json')

  assert.equal(manifest.name, 'living-docs')
  assert.equal(typeof manifest.version, 'string')
  assert.equal(typeof manifest.description, 'string')
})

test('hooks.json registers the five living-docs hooks on the spec §7 events and matchers', () => {
  const config = readJson('hooks/hooks.json')
  const hooks = config.hooks as Record<string, { matcher?: string; hooks: { command: string }[] }[]>

  const groups = new Map<string, string[]>(
    Object.entries(hooks).flatMap(([event, list]) =>
      list.map(group => [group.matcher === undefined ? event : `${event}:${group.matcher}`, group.hooks.map(hook => hook.command)] as const),
    ),
  )

  const expected: Record<string, string[]> = {
    'PreToolUse:Edit|Write': ['append-only', 'state-promotion', 'open-decision-guard'],
    'PostToolUse:Edit|Write': ['shortcut-debt'],
    // SessionStart has no matcher: the event is not a tool event (spec §7).
    SessionStart: ['session-inventory'],
  }

  assert.deepEqual([...groups.keys()].sort(), Object.keys(expected).sort())
  for (const [key, names] of Object.entries(expected)) {
    const commands = groups.get(key) ?? []

    assert.equal(commands.length, names.length, `${key}: ${commands.length} hooks`)
    for (const name of names) {
      assert.ok(
        commands.some(command => command.includes(name)),
        `${key} should invoke ${name}`,
      )
    }
    for (const command of commands) {
      assert.ok(command.includes('${CLAUDE_PLUGIN_ROOT}'), 'the command must be relocatable')
    }
  }
})

test('RNF-0002: the wrapper exists, is executable and runs the host node, failing open', () => {
  const relative = 'hooks/run-hook.sh'
  const wrapper = join(ROOT, relative)

  assert.ok(existsSync(wrapper))

  // The execute bit comes from the git index, not from the filesystem: a
  // Windows checkout has no POSIX mode, and what reaches whoever installs is the
  // versioned mode.
  const entry = execFileSync('git', ['ls-files', '-s', '--', relative], { cwd: ROOT, encoding: 'utf8' })

  assert.equal(entry.split(/\s+/)[0], '100755', `${relative} must be versioned as executable`)

  const source = readFileSync(wrapper, 'utf8')

  assert.match(source, /\bnode\b/, 'the hook runs on the host node (RNF-0002)')
  assert.doesNotMatch(source, /docker/i, 'there is no bridge to any container anymore')
  assert.match(source, /timeout 5/, 'must respect the 5s ceiling of spec §7')
  assert.match(source, /exit 0/, 'must fail open')
  assert.doesNotMatch(source, /set -e\b/, 'set -e would kill the fail-open')
})

test('every referenced hook exists in the repository', () => {
  const config = readJson('hooks/hooks.json')
  const hooks = config.hooks as Record<string, { hooks: { command: string }[] }[]>
  let seen = 0

  for (const groups of Object.values(hooks)) {
    for (const group of groups) {
      for (const hook of group.hooks) {
        const name = hook.command.trim().split(/\s+/).pop()?.replace(/"/g, '') ?? ''

        assert.ok(existsSync(join(ROOT, 'src/hooks', `${name}.ts`)), `src/hooks/${name}.ts should exist`)
        seen += 1
      }
    }
  }

  assert.equal(seen, 5, 'the scan should see the five hooks')
})

function hookNames(pluginRoot: string): string[] {
  const config = JSON.parse(readFileSync(join(pluginRoot, 'hooks/hooks.json'), 'utf8')) as { hooks: Record<string, { hooks: { command: string }[] }[]> }

  return Object.values(config.hooks).flatMap(groups =>
    groups.flatMap(group => group.hooks.map(hook => hook.command.trim().split(/\s+/).pop()?.replace(/"/g, '') ?? '')),
  )
}

test('the two plugins register no hook in common — each guard runs in a single plugin', () => {
  const living = hookNames(ROOT)
  const core = hookNames(join(CHECKOUT, 'plugins', 'ownership', 'plugin'))

  assert.ok(core.length >= 3, 'the scan should see the core hooks')
  assert.deepEqual(
    living.filter(name => core.includes(name)),
    [],
  )
  for (const assumed of ['generated', 'watch-reminder', 'commit-guard']) {
    assert.ok(!living.some(name => name.includes(assumed)), `living-docs can no longer register the ${assumed} hook: it belongs to the core`)
  }
})

test('living-docs declares the ownership plugin as a dependency, and the marketplace publishes both', () => {
  const manifest = readJson('.claude-plugin/plugin.json')
  const marketplace = JSON.parse(readFileSync(join(CHECKOUT, '.claude-plugin/marketplace.json'), 'utf8')) as {
    plugins: { name: string; source: string; version: string }[]
  }
  const core = JSON.parse(readFileSync(join(CHECKOUT, 'plugins', 'ownership', 'plugin', '.claude-plugin/plugin.json'), 'utf8')) as { version: string }

  assert.deepEqual(manifest.dependencies, ['ownership'])
  // The marketplace may publish other plugins; what this one needs is its dependency beside it.
  assert.deepEqual(
    marketplace.plugins
      .map(plugin => plugin.name)
      .filter(name => name === 'living-docs' || name === 'ownership')
      .sort(),
    ['living-docs', 'ownership'],
  )
  const entry = marketplace.plugins.find(plugin => plugin.name === 'ownership')!

  assert.equal(entry.source, './plugins/ownership/plugin')
  assert.equal(entry.version, core.version)
})

/**
 * Every reference to a skill, in any artifact the repository publishes,
 * must point to a skill that exists. It is the sibling of the hooks test above:
 * a name cited with no file behind it is a command that does nothing.
 */
const SKILL_REFERENCES: readonly { root: string; file: string; pattern: RegExp }[] = [
  ...readdirSync(join(ROOT, 'commands')).map(name => ({
    root: ROOT,
    file: `commands/${name}`,
    pattern: /skill\s+`([a-z][a-z0-9-]*)`/g,
  })),
  { root: ROOT, file: 'src/cli/index.ts', pattern: /owning skill:\s*([a-z][a-z0-9-]*)/g },
  { root: ROOT, file: 'src/config/ownership.ts', pattern: /owning skill:\s*([a-z][a-z0-9-]*)/g },
  { root: ROOT, file: 'templates/ownership.yml', pattern: /^\s*skill:\s*([a-z][a-z0-9-]*)\s*$/gm },
  { root: CHECKOUT, file: '.ownership.yml', pattern: /^\s*skill:\s*([a-z][a-z0-9-]*)\s*$/gm },
]

function referencedSkills(): Map<string, string[]> {
  const found = new Map<string, string[]>()

  for (const { root, file, pattern } of SKILL_REFERENCES) {
    const source = readFileSync(join(root, file), 'utf8')

    for (const match of source.matchAll(pattern)) {
      const name = match[1]

      if (name === undefined) {
        continue
      }
      found.set(name, [...(found.get(name) ?? []), file])
    }
  }

  return found
}

test('every referenced skill exists in skills/', () => {
  const referenced = referencedSkills()

  // Guard against a scanner that matches nothing and passes vacuously.
  assert.ok(referenced.has('decision-recorder'), 'the scanner should find decision-recorder')
  assert.ok(referenced.has('living-docs-bootstrap'), 'the scanner should find living-docs-bootstrap')

  for (const [name, files] of referenced) {
    const skill = join(ROOT, 'skills', name, 'SKILL.md')

    assert.ok(existsSync(skill), `skills/${name}/SKILL.md should exist — cited in ${files.join(', ')}`)
  }
})

test('the name in each skill frontmatter matches the directory', () => {
  const dirs = readdirSync(join(ROOT, 'skills'))

  assert.ok(dirs.length > 0)
  for (const dir of dirs) {
    const source = readFileSync(join(ROOT, 'skills', dir, 'SKILL.md'), 'utf8')

    assert.match(source, new RegExp(`^name:\\s*${dir}\\s*$`, 'm'), `${dir}/SKILL.md declares another name`)
  }
})

test('RNF-0002: no executable script carries CR — the wrapper runs in bash', () => {
  const scripts = [
    { label: 'bin/dev', path: join(CHECKOUT, 'plugins/living-docs/bin/dev') },
    { label: 'bin/living-docs', path: join(CHECKOUT, 'plugins/living-docs/bin/living-docs') },
    { label: 'hooks/run-hook.sh', path: join(ROOT, 'hooks/run-hook.sh') },
  ]

  for (const { label, path } of scripts) {
    const source = readFileSync(path, 'utf8')

    assert.equal(source.includes('\r'), false, `${label} with CRLF: the shebang breaks with "bad interpreter"`)
  }
})

/**
 * A scan, not a fixed list — the same choice `authoring.test.ts` makes for the
 * skills: a new agent falls under the conventions the day it is born, without anyone
 * remembering to add it here.
 */
const AGENTS = readdirSync(join(ROOT, 'agents')).filter(name => name.endsWith('.md'))

test('AG-1 and AG-2: the two agents of spec §6 exist', () => {
  assert.ok(AGENTS.includes('decision-adversary.md'), `agents: ${AGENTS.join(', ') || 'empty'}`)
  assert.ok(AGENTS.includes('docs-divergence-auditor.md'), `agents: ${AGENTS.join(', ') || 'empty'}`)
})

for (const file of AGENTS) {
  test(`${file}: frontmatter with name matching the file, description and declared tools`, () => {
    const source = readFileSync(join(ROOT, 'agents', file), 'utf8')
    const name = file.replace(/\.md$/, '')

    assert.match(source, new RegExp(`^name:\\s*${name}\\s*$`, 'm'), `${file} declares another name`)
    assert.match(source, /^description:/m, `${file} without a description — it is what says when to use it`)
    assert.notEqual(
      source.match(/^tools:\s*(.+)$/m)?.[1] ?? '',
      '',
      `${file} must declare tools explicitly — an agent without an allowlist inherits everything`,
    )
  })
}

test('AG-1 and AG-2 point and stop — no Edit or Write (spec §6)', () => {
  for (const file of ['decision-adversary.md', 'docs-divergence-auditor.md']) {
    const source = readFileSync(join(ROOT, 'agents', file), 'utf8')
    const toolsLine = source.match(/^tools:\s*(.+)$/m)?.[1] ?? ''

    assert.doesNotMatch(toolsLine, /\bEdit\b/, `${file}: an agent that points does not rewrite`)
    assert.doesNotMatch(toolsLine, /\bWrite\b/, `${file}: an agent that points does not rewrite`)
  }
})

test('AG-1 reads the ownership map instead of guessing a path', () => {
  const source = readFileSync(join(ROOT, 'agents/docs-divergence-auditor.md'), 'utf8')

  assert.match(source, /\.ownership\.yml/)
  assert.doesNotMatch(source, /docs\/\.ownership\.yml/)
  assert.match(source, /DA-nnnn|open-decision/, 'behavior without a rule becomes an open decision, not code')
})

test('decision-recorder references the decision-adversary agent before acceptance', () => {
  const source = readFileSync(join(ROOT, 'skills/decision-recorder/SKILL.md'), 'utf8')

  assert.match(source, /decision-adversary/)
})

test('the marketplace manifest points to the plugin of this repository', () => {
  const marketplace = JSON.parse(readFileSync(join(CHECKOUT, '.claude-plugin/marketplace.json'), 'utf8')) as Record<string, unknown>
  const plugins = marketplace.plugins as { name: string; source: string; version: string }[]

  // The marketplace identifies who distributes; the plugin, what gets installed. Both
  // with the same name gave `living-docs@living-docs` in the install command.
  assert.equal(marketplace.name, 'esliph')
  const entry = plugins.find(plugin => plugin.name === 'living-docs')

  assert.ok(entry, `marketplace.plugins should have a "living-docs" entry: ${JSON.stringify(plugins)}`)
  assert.equal(entry?.source, './plugins/living-docs/plugin')
  // The plugin directory is the distributed directory: src/, templates/ and the runtime lockfile are
  // inside what the cache copies; tests and docs are not (ADR-0036).
  assert.equal(resolve(CHECKOUT, entry?.source ?? ''), ROOT)
  assert.ok(existsSync(join(ROOT, '.claude-plugin/plugin.json')), 'the source must have a manifest')

  const plugin = readJson('.claude-plugin/plugin.json')

  assert.equal(entry?.version, plugin.version, 'two versions is a guarantee that one is wrong')
})
