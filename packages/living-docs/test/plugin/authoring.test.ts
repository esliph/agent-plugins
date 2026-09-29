import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import { parseFrontmatter } from '../../src/frontmatter/parse.ts'
import { toolkitRoot } from '../../src/core/roots.ts'

const ROOT = toolkitRoot()

/**
 * A scan, not a fixed list: a new skill must fall under the conventions of
 * spec §11 the day it is born, without anyone remembering to add it here.
 */
const SKILLS = readdirSync(join(ROOT, 'skills'), { withFileTypes: true })
  .filter(entry => entry.isDirectory())
  .map(entry => entry.name)
  .sort()

function skillSource(name: string): string {
  return readFileSync(join(ROOT, 'skills', name, 'SKILL.md'), 'utf8')
}

test('there are skills to verify', () => {
  assert.ok(SKILLS.length >= 3, `expected at least 3 skills, found ${SKILLS.length}`)
})

for (const name of SKILLS) {
  test(`${name}: frontmatter with name matching the directory and description`, () => {
    const frontmatter = parseFrontmatter(skillSource(name))

    assert.ok(frontmatter, `${name} without frontmatter`)
    assert.equal(frontmatter.data.name, name)
    assert.equal(typeof frontmatter.data.description, 'string')
  })

  test(`${name}: the description is written in symptom language, not category language`, () => {
    const description = String(parseFrontmatter(skillSource(name))?.data.description ?? '')

    assert.ok(description.length > 120, `${name}: description too short to be found when it matters`)
    assert.match(description, /\bUse\b/i, `${name}: the description must say when to use it`)
  })

  test(`${name}: the spec §11 sections are present and in order`, () => {
    const source = skillSource(name)
    const sections = ['## Overview', '## What you own', '## When to use / when not to', '## Procedure', '## Boundaries', '## Checklist']
    let cursor = -1

    for (const section of sections) {
      const at = source.indexOf(section)

      assert.ok(at !== -1, `${name}: section missing — ${section}`)
      assert.ok(at > cursor, `${name}: section out of order — ${section}`)
      cursor = at
    }
  })

  test(`${name}: the checklist has tickable boxes and each names its verification`, () => {
    const source = skillSource(name)
    const checklist = source.slice(source.indexOf('## Checklist'))
    const items = checklist.split('\n').filter(line => line.trim().startsWith('- [ ]'))

    assert.ok(items.length >= 6, `${name}: checklist with only ${items.length} items`)
    for (const item of items) {
      assert.match(item, /\b(?:living-docs|ownership)\/[a-z]+(?:-[a-z]+)*\b|\bhuman\b/i, `${name}: item without a named verification — ${item}`)
    }
  })
}

test('decision-recorder: the description names the symptoms of decision, gap and debt', () => {
  const description = String(parseFrontmatter(skillSource('decision-recorder'))?.data.description ?? '')

  assert.match(description, /Use when/i)
  for (const symptom of ['why', 'gap', 'debt']) {
    assert.ok(description.toLowerCase().includes(symptom), `the description should contain the symptom "${symptom}"`)
  }
})

test('decision-recorder does not duplicate the content of the artifacts it governs', () => {
  const source = skillSource('decision-recorder')

  assert.doesNotMatch(source, /^## Context$/m, 'the skill must not contain the ADR template')
  assert.match(source, /templates\/adr\.md/, 'it must point to the template, not copy it')
})

test('requirements-keeper: the description speaks in symptoms, not categories', () => {
  const description = String(parseFrontmatter(skillSource('requirements-keeper'))?.data.description ?? '')

  assert.ok(description.length > 120)
  for (const symptom of ['what is the rule', 'what should the system do', 'specified']) {
    assert.ok(description.toLowerCase().includes(symptom), `description without the symptom "${symptom}"`)
  }
})

test('requirements-keeper does not duplicate the requirement format', () => {
  const source = skillSource('requirements-keeper')

  assert.match(source, /templates\/requirements\.md/)
  assert.doesNotMatch(source, /^- \*\*status:\*\*/m, 'the skill must not contain the requirement template')
})

test('the seven commands exist, have a description and contain no logic of their own', () => {
  const expected = ['adr.md', 'open-decision.md', 'debt.md', 'docs-setup.md', 'docs-audit.md', 'term.md', 'release.md']
  const found = readdirSync(join(ROOT, 'commands')).sort()

  assert.deepEqual(found, expected.sort())

  for (const name of expected) {
    const source = readFileSync(join(ROOT, 'commands', name), 'utf8')
    const frontmatter = parseFrontmatter(source)

    assert.ok(frontmatter, `${name} without frontmatter`)
    assert.equal(typeof frontmatter.data.description, 'string')
    assert.ok(source.split('\n').length < 25, `${name} is too long for a thin shortcut`)
    // docs-audit invokes an agent, not a skill; the others invoke a skill
    const pattern = name === 'docs-audit.md' ? /docs-divergence-auditor/ : /decision-recorder|living-docs-bootstrap|glossary-keeper|release-historian/

    assert.match(source, pattern, `${name} must point to the agent or skill it triggers`)
  }
})

test('glossary-keeper: the description names the symptoms of a new, ambiguous or renamed term', () => {
  const description = String(parseFrontmatter(skillSource('glossary-keeper'))?.data.description ?? '')

  assert.match(description, /Use when/i)
  for (const symptom of ['term', 'renam']) {
    assert.ok(description.toLowerCase().includes(symptom), `the description should contain the symptom "${symptom}"`)
  }
})

test('glossary-keeper does not duplicate the format of the table it governs', () => {
  const source = skillSource('glossary-keeper')

  assert.doesNotMatch(source, /\| Example term \|/, 'the skill must not contain the template example row')
  assert.match(source, /templates\/glossary\.md/, 'it must point to the template, not copy it')
})

test('charter-keeper: the description names principle, vision and amendment', () => {
  const description = String(parseFrontmatter(skillSource('charter-keeper'))?.data.description ?? '')

  assert.match(description, /Use when/i)
  for (const symptom of ['principle', 'vision']) {
    assert.ok(description.toLowerCase().includes(symptom), `the description should contain the symptom "${symptom}"`)
  }
})

test('charter-keeper does not duplicate the content of the artifacts it governs', () => {
  const source = skillSource('charter-keeper')

  // Section heading, not a mention in prose: it is the body of the Constitution that
  // must not be copied here, and it is the one that starts the line with `## `.
  assert.doesNotMatch(source, /^## Amendment log/m, 'the skill must not contain the body of the Constitution')
  assert.doesNotMatch(source, /^## Principles/m, 'the skill must not contain the principles of this repository')
  assert.match(source, /templates\/constitution\.md/, 'it must point to the template, not copy it')
  assert.match(source, /templates\/vision\.md/, 'both templates, because they are two artifacts')
})

test('working-agreements-keeper: the description names the error caused by lack of context', () => {
  const description = String(parseFrontmatter(skillSource('working-agreements-keeper'))?.data.description ?? '')

  assert.match(description, /Use when/i)
  for (const symptom of ['lack of context', "wasn't written", 'done']) {
    assert.ok(description.toLowerCase().includes(symptom), `the description should contain the symptom "${symptom}"`)
  }
})

test('working-agreements-keeper does not duplicate the content of the agreements it governs', () => {
  const source = skillSource('working-agreements-keeper')

  assert.match(source, /templates\/definition-of-done\.md/, 'it must point to the template, not copy it')
  assert.doesNotMatch(source, /^- \[ \] `npm test`/m, 'the skill must not contain the DoD')
})

test('contract-keeper: the description names public interface, new error and versioning', () => {
  const description = String(parseFrontmatter(skillSource('contract-keeper'))?.data.description ?? '')

  assert.match(description, /Use when/i)
  for (const symptom of ['contract', 'error', 'generat']) {
    assert.ok(description.toLowerCase().includes(symptom), `the description should contain the symptom "${symptom}"`)
  }
})

test('contract-keeper does not duplicate the content of the artifacts it governs', () => {
  const source = skillSource('contract-keeper')

  assert.match(source, /templates\/errors\.md/, 'it must point to the template, not copy it')
  assert.match(source, /templates\/versioning-policy\.md/, 'both templates, because they are two artifacts')
  assert.doesNotMatch(source, /^\| EXIT-\d/m, 'the skill must not contain the catalog of this repository')
  assert.doesNotMatch(source, /^## What is public/m, 'nor the policy of this repository')
})

test('release-historian: the description names the symptoms of visible change, version and deprecation', () => {
  const description = String(parseFrontmatter(skillSource('release-historian'))?.data.description ?? '')

  assert.match(description, /Use when/i)
  for (const symptom of ['consum', 'version', 'migrat', 'deprecat']) {
    assert.ok(description.toLowerCase().includes(symptom), `the description should contain the symptom "${symptom}"`)
  }
})

test('release-historian does not duplicate the content of the artifacts it governs', () => {
  const source = skillSource('release-historian')

  assert.match(source, /templates\/changelog\.md/, 'it must point to the template, not copy it')
  assert.match(source, /templates\/migration\.md/, 'the four templates, because they are four artifacts')
  assert.doesNotMatch(source, /^## \[Unreleased\]$/m, 'the skill must not contain the CHANGELOG of this repository')
})

test('SK-0 does not tell you to pick a stage the CLI rejects', () => {
  const source = skillSource('living-docs-bootstrap')

  for (const stage of ['solo', 'small-team', 'production', 'multi-team']) {
    assert.ok(source.includes(stage), `SK-0 must name the stage \`${stage}\` the way the CLI calls it`)
  }
})

test('RN-0030: release-historian does not ask the migration guide to point to the ADR by ID', () => {
  const source = skillSource('release-historian')

  assert.doesNotMatch(source, /pointing to the ADR/, 'the guide is read by outsiders: the why goes in running text')
  assert.match(source, /commit that creates the guide cites the ADR/, 'the link now lives in the commit')
  assert.match(source, /living-docs\/external-audience/, 'the checklist names who verifies')
})

test('RN-0030: the migration template asks for the why in running text, not the ADR ID', () => {
  const template = readFileSync(join(ROOT, 'templates/migration.md'), 'utf8')

  assert.doesNotMatch(template, /The ADR that decided\./)
  assert.match(template, /commit that creates the guide cites the ADR/)
})
