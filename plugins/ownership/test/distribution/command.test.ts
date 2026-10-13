import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { parse } from 'yaml'

import { PLUGIN_ROOT } from '../helpers/roots.ts'

const text = readFileSync(join(PLUGIN_ROOT, 'commands', 'init.md'), 'utf8')
const CLI = 'node "${CLAUDE_PLUGIN_ROOT}/src/cli/index.ts"'

test('the command file is commands/init.md, so the host names it /ownership:init', () => {
  const manifest = JSON.parse(readFileSync(join(PLUGIN_ROOT, '.claude-plugin', 'plugin.json'), 'utf8')) as { name: string }

  assert.equal(manifest.name, 'ownership')
})

test('the frontmatter describes the command and lets it run the CLI and edit the file', () => {
  const frontmatter = /^---\n([\s\S]*?)\n---\n/.exec(text)

  assert.ok(frontmatter !== null, 'the command starts with a frontmatter block')

  const meta = parse(frontmatter[1] ?? '') as Record<string, unknown>

  assert.equal(typeof meta.description, 'string')
  assert.notEqual(meta.description, '')
  assert.match(String(meta['allowed-tools']), /Bash\(node:\*\)/)
  assert.match(String(meta['allowed-tools']), /\bEdit\b/)
})

test('the file is created only by running the init of the CLI', () => {
  assert.ok(text.includes(`${CLI} init [--owner <@owner> | --from-codeowners] [--ownership <path>]`))
  assert.match(text, /only way the file is created/)
})

test('the command ends with the two checks that run no generator', () => {
  assert.ok(text.includes(`${CLI} validate --check ownership/owner-coverage --check ownership/codeowners-match`))
  assert.doesNotMatch(text, /--check ownership\/generated-drift/)
})

test('the script keeps the decisions with the human', () => {
  for (const rule of [
    /Never pick one on your own/,
    /Never fill in an owner/,
    /wait for an explicit yes/,
    /Never create or change the CODEOWNERS/,
    /--from-codeowners` first/,
  ]) {
    assert.match(text, rule)
  }
})
