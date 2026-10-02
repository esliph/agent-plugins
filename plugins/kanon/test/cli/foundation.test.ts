import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadConfig } from '../../plugin/src/config/config.ts'
import { loadRegistry } from '../../plugin/src/registry/registry.ts'
import { CONFIG, GLOSSARY, capability, kanon, withProject } from '../helpers/project.ts'

const INITIALIZED = { '.kanon/config.yml': CONFIG }

test('RF-0019: the next ID is the counter plus one, printed and written to the registry', () => {
  withProject({ ...INITIALIZED, '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 13, ['CHK-009']) }, root => {
    const run = kanon(root, 'id', 'next', 'CHK')

    assert.equal(run.status, 0, run.stderr)
    assert.equal(run.stdout, 'CHK-014\n')
    assert.equal(run.stderr, '')

    const registered = loadRegistry(root).get('CHK')

    // RN-0045: the counter grew, and the tombstone was not given back.
    assert.equal(registered?.counter, 14)
    assert.deepEqual(registered?.tombstones, ['CHK-009'])
    assert.match(readFileSync(join(root, '.kanon/capabilities/CHK.md'), 'utf8'), /# CHK — checkout/)
  })
})

test('RF-0019: from 900 on, the ID is allocated with a warning', () => {
  withProject({ ...INITIALIZED, '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 899) }, root => {
    const run = kanon(root, 'id', 'next', 'CHK')

    assert.equal(run.status, 0, run.stderr)
    assert.equal(run.stdout, 'CHK-900\n')
    assert.match(run.stderr, /900 of 999/)
  })
})

test('RF-0019: at 999 nothing is allocated, and the refusal says to split (RN-0046)', () => {
  withProject({ ...INITIALIZED, '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 999) }, root => {
    const run = kanon(root, 'id', 'next', 'CHK')

    assert.equal(run.status, 1)
    assert.equal(run.stdout, '')
    assert.match(run.stderr, /split/)
    assert.equal(loadRegistry(root).get('CHK')?.counter, 999)
  })
})

test('RF-0019: a prefix that is not registered allocates nothing', () => {
  withProject(INITIALIZED, root => {
    const run = kanon(root, 'id', 'next', 'PAY')

    assert.equal(run.status, 1)
    assert.match(run.stderr, /not registered/)
  })
})

test('RF-0020: a capability gets a registry at zero and an empty spec', () => {
  withProject({ ...INITIALIZED, 'specs/glossary.md': GLOSSARY }, root => {
    const run = kanon(root, 'capability', 'add', 'CHK', 'checkout')

    assert.equal(run.status, 0, run.stderr)

    const registered = loadRegistry(root).get('CHK')

    assert.equal(registered?.name, 'checkout')
    assert.equal(registered?.counter, 0)
    assert.equal(registered?.splitFrom, null)
    assert.match(readFileSync(join(root, 'specs/checkout/spec.md'), 'utf8'), /^# checkout\n/)
    assert.equal(kanon(root, 'lint').status, 0)
  })
})

test('RF-0020: a prefix out of shape, a registered prefix and a name in use are refused (RN-0043)', () => {
  withProject({ ...INITIALIZED, '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 0) }, root => {
    for (const args of [
      ['chk', 'billing'],
      ['CHECKS', 'billing'],
      ['CHK', 'billing'],
      ['BIL', 'checkout'],
      ['BIL', 'Billing Area'],
    ]) {
      assert.equal(kanon(root, 'capability', 'add', ...args).status, 1, args.join(' '))
    }
    assert.deepEqual([...loadRegistry(root).keys()], ['CHK'])
  })
})

test('RF-0020: a split is recorded in both registries, and the origin keeps its counter', () => {
  withProject({ ...INITIALIZED, '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 999) }, root => {
    const run = kanon(root, 'capability', 'add', 'CHKB', 'checkout-b2b', '--split-from', 'CHK')

    assert.equal(run.status, 0, run.stderr)

    const registry = loadRegistry(root)

    assert.equal(registry.get('CHKB')?.splitFrom, 'CHK')
    assert.deepEqual(registry.get('CHK')?.splitInto, ['CHKB'])
    assert.equal(registry.get('CHK')?.counter, 999)
    assert.equal(kanon(root, 'capability', 'add', 'PAY', 'payment', '--split-from', 'NONE').status, 1)
  })
})

test('RF-0021: init creates the configuration, a constitution and a glossary', () => {
  withProject({}, root => {
    const run = kanon(root, 'init')

    assert.equal(run.status, 0, run.stderr)
    assert.equal(run.stdout, 'created  .kanon/config.yml\ncreated  specs/constitution.md\ncreated  specs/glossary.md\n')
    assert.match(readFileSync(join(root, 'specs/constitution.md'), 'utf8'), /## Article 1 — Every acceptance criterion follows EARS and uses glossary terms/)

    const config = loadConfig(root)

    assert.equal(config.glossary, 'specs/glossary.md')
    // RN-0049: the command line writes the forbidden list empty.
    assert.deepEqual(config.forbiddenWords, [])
    // RN-0046: the two warning thresholds have defaults.
    assert.deepEqual(config.thresholds, { activeRequirements: 150, counter: 900 })
    assert.equal(kanon(root, 'lint').status, 0)
  })
})

test('RF-0021: a file that exists is kept as it is', () => {
  withProject({ 'specs/glossary.md': 'mine\n' }, root => {
    const first = kanon(root, 'init')

    assert.match(first.stdout, /kept {2}specs\/glossary\.md/)
    assert.equal(readFileSync(join(root, 'specs/glossary.md'), 'utf8'), 'mine\n')

    writeFileSync(join(root, '.kanon/config.yml'), CONFIG.replace('counter: 900', 'counter: 800'), 'utf8')

    const second = kanon(root, 'init', '--glossary', 'docs/other.md')

    assert.equal(second.stdout, 'kept  .kanon/config.yml\nkept  specs/constitution.md\nkept  specs/glossary.md\n')
    assert.equal(loadConfig(root).thresholds.counter, 800)
  })
})

test('RF-0021: a glossary or a constitution the project already has is pointed to, never created (RN-0051)', () => {
  withProject({ 'docs/glossary.md': '| Term |\n| --- |\n' }, root => {
    const run = kanon(root, 'init', '--glossary', 'docs/glossary.md', '--constitution', 'docs/charter/constitution.md')

    assert.equal(run.status, 0, run.stderr)
    assert.equal(run.stdout, 'created  .kanon/config.yml\npointed  docs/charter/constitution.md\npointed  docs/glossary.md\n')
    assert.equal(loadConfig(root).glossary, 'docs/glossary.md')
    assert.equal(loadConfig(root).constitution, 'docs/charter/constitution.md')
    assert.equal(existsSync(join(root, 'specs')), false)
    assert.equal(existsSync(join(root, 'docs/charter/constitution.md')), false)
  })
})

test('RF-0021: a path outside the project is not a place for the glossary', () => {
  withProject({}, root => {
    assert.equal(kanon(root, 'init', '--glossary', '../elsewhere.md').status, 2)
    assert.equal(existsSync(join(root, '.kanon')), false)
  })
})

test('RNF-0007: everything init and capability add write is Markdown or YAML inside the project', () => {
  withProject({}, root => {
    const written = [kanon(root, 'init'), kanon(root, 'capability', 'add', 'CHK', 'checkout')].flatMap(run =>
      run.stdout
        .trim()
        .split('\n')
        .map(line => line.split(/\s+/)[1] ?? ''),
    )

    assert.equal(written.length, 5)
    for (const path of written) {
      assert.match(path, /\.(md|yml)$/)
      assert.equal(existsSync(join(root, path)), true, path)
    }
  })
})
