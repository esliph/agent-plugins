import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findOwnedRule, resolveOwnership } from '../../plugin/src/resolve/hierarchy.ts'
import { OwnershipError } from '../../plugin/src/schema/types.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const BASE = 'version: 2\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    skill: decision-recorder\n'
const CHILD = 'version: 2\nowned:\n  - path: docs/\n    owner: "@b"\n'

test('without an ownership file, resolveOwnership returns null', () => {
  withTempRepo({}, root => {
    assert.equal(resolveOwnership(root), null)
  })
})

test('single file: the resolved entry points to its own file as origin', () => {
  withTempRepo({ '.ownership.yml': BASE }, root => {
    const config = resolveOwnership(root)

    assert.equal(config?.owned[0]?.path, 'docs/decisions/adr/')
    assert.equal(config?.owned[0]?.origin, '.ownership.yml')
  })
})

test('the root base is the repository root even when it lives in docs/', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 2\nowned:\n  - path: CLAUDE.md\n    owner: "@a"\n' }, root => {
    assert.equal(resolveOwnership(root)?.owned[0]?.path, 'CLAUDE.md')
  })
})

test('directory include finds the only ownership file inside it', () => {
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [packages/api/]\n`,
      'packages/api/.ownership.yml': 'version: 2\nowned:\n  - path: docs/\n    owner: "@b"\n',
    },
    root => {
      const rule = findOwnedRule(resolveOwnership(root)!, 'packages/api/docs/x.md')

      assert.equal(rule?.owner, '@b')
      assert.equal(rule?.origin, 'packages/api/.ownership.yml')
    },
  )
})

test('explicit file include works when there is more than one in the directory', () => {
  withTempRepo(
    { '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 2\nowned:\n  - path: docs/specs/\n    owner: "@b"\n' },
    root => {
      assert.equal(resolveOwnership(root)?.owned.length, 2)
    },
  )
})

test('directory include with more than one ownership file is ambiguous', () => {
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [packages/api/]\n`,
      'packages/api/.ownership.yml': 'version: 2\nowned: []\n',
      'packages/api/ownership.extra.yml': 'version: 2\nowned: []\n',
    },
    root => {
      assert.throws(() => resolveOwnership(root), /ambiguous/)
    },
  )
})

test('include pointing to a file that does not exist is OwnershipError', () => {
  withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n` }, root => {
    assert.throws(() => resolveOwnership(root), OwnershipError)
  })
})

test('nested include is read', () => {
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [packages/api/]\n`,
      'packages/api/.ownership.yml': 'version: 2\nowned: []\ninclude: [sub/]\n',
      'packages/api/sub/.ownership.yml': 'version: 2\nowned:\n  - path: docs/\n    owner: "@c"\n',
    },
    root => {
      assert.equal(findOwnedRule(resolveOwnership(root)!, 'packages/api/sub/docs/x.md')?.owner, '@c')
    },
  )
})

test('include cycle is an error', () => {
  withTempRepo(
    { '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 2\nowned: []\ninclude: [.ownership.yml]\n' },
    root => {
      assert.throws(() => resolveOwnership(root), /Include cycle/)
    },
  )
})

test('the same file included by two is an error, and is not confused with a cycle', () => {
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [ownership.a.yml, ownership.b.yml]\n`,
      'ownership.a.yml': 'version: 2\nowned: []\ninclude: [ownership.shared.yml]\n',
      'ownership.b.yml': 'version: 2\nowned: []\ninclude: [ownership.shared.yml]\n',
      'ownership.shared.yml': 'version: 2\nowned: []\n',
    },
    root => {
      assert.throws(() => resolveOwnership(root), /included only once/)
    },
  )
})

test('path declared outside the base of the file that declares it is an error', () => {
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [packages/api/]\n`,
      'packages/api/.ownership.yml': 'version: 2\nowned:\n  - path: ../web/docs/\n    owner: "@b"\n',
    },
    root => {
      assert.throws(() => resolveOwnership(root), /outside the file base/)
    },
  )
})

test('include that leaves the base is also an error', () => {
  withTempRepo(
    { '.ownership.yml': `${BASE}include: [packages/api/]\n`, 'packages/api/.ownership.yml': 'version: 2\nowned: []\ninclude: [../web/]\n' },
    root => {
      assert.throws(() => resolveOwnership(root), /outside the file base/)
    },
  )
})

test('derives-from.source outside the base is an error — otherwise pruning kills the reminder', () => {
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [packages/api/]\n`,
      'packages/api/.ownership.yml':
        'version: 2\nowned:\n  - path: plans/\n    owner: "@b"\n    derives-from:\n      source: ../../docs/specs/\n      field: spec\n',
    },
    root => {
      assert.throws(() => resolveOwnership(root), /outside the file base/)
    },
  )
})

test('watches[].doc may leave the base; watches[].code may not', () => {
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [packages/api/]\n`,
      'packages/api/.ownership.yml': 'version: 2\nowned: []\nwatches:\n  - code: src/**\n    doc: ../../CHANGELOG.md\n',
    },
    root => {
      const watch = resolveOwnership(root)!.watches[0]

      assert.equal(watch?.code, 'packages/api/src/**')
      assert.equal(watch?.doc, 'CHANGELOG.md')
    },
  )
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [packages/api/]\n`,
      'packages/api/.ownership.yml': 'version: 2\nowned: []\nwatches:\n  - code: ../../src/**\n    doc: CHANGELOG.md\n',
    },
    root => {
      assert.throws(() => resolveOwnership(root), /outside the file base/)
    },
  )
})

test('basePath shifts the base inward', () => {
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [ownership.api.yml]\n`,
      'ownership.api.yml': 'version: 2\nbasePath: packages/api\nowned:\n  - path: docs/\n    owner: "@b"\n',
    },
    root => {
      assert.equal(findOwnedRule(resolveOwnership(root)!, 'packages/api/docs/x.md')?.owner, '@b')
    },
  )
})

test('basePath that climbs is an error', () => {
  withTempRepo(
    { '.ownership.yml': `${BASE}include: [packages/api/]\n`, 'packages/api/.ownership.yml': 'version: 2\nbasePath: ../web\nowned: []\n' },
    root => {
      assert.throws(() => resolveOwnership(root), OwnershipError)
    },
  )
})

test('same path declared twice in the same file is a collision', () => {
  withTempRepo({ '.ownership.yml': `${BASE}  - path: docs/decisions/adr/\n    owner: "@b"\n` }, root => {
    assert.throws(() => resolveOwnership(root), /collides/)
  })
})

test('path contained in another is a collision, even across different files', () => {
  withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': CHILD }, root => {
    assert.throws(() => resolveOwnership(root), /collides/)
  })
})

test('sibling paths do not collide', () => {
  withTempRepo(
    { '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 2\nowned:\n  - path: docs/specs/\n    owner: "@b"\n' },
    root => {
      assert.equal(resolveOwnership(root)?.owned.length, 2)
    },
  )
})

test('generated path inside a governed path is not a collision; two generators for the same file are', () => {
  withTempRepo({ '.ownership.yml': `${BASE}generated:\n  - path: docs/decisions/adr/index.gen.md\n    command: gen\n` }, root => {
    assert.equal(resolveOwnership(root)?.generated.length, 1)
  })
  withTempRepo({ '.ownership.yml': `${BASE}generated:\n  - path: x.gen.md\n    command: a\n  - path: x.gen.md\n    command: b\n` }, root => {
    assert.throws(() => resolveOwnership(root), /collides/)
  })
})

test('two watches for the same code coexist', () => {
  withTempRepo({ '.ownership.yml': `${BASE}watches:\n  - code: src/**\n    doc: a.md\n  - code: src/**\n    doc: b.md\n` }, root => {
    assert.equal(resolveOwnership(root)?.watches.length, 2)
  })
})

test('included file without version is an error, and with a divergent version too', () => {
  withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'owned: []\n' }, root => {
    assert.throws(() => resolveOwnership(root), OwnershipError)
  })
  withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 3\nowned: []\n' }, root => {
    assert.throws(() => resolveOwnership(root), OwnershipError)
  })
})

test('entry without owner is an error — there is nowhere to inherit from', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned:\n  - path: docs/\n' }, root => {
    assert.throws(() => resolveOwnership(root), OwnershipError)
  })
})

test('watches, generated and ignore accumulate across files', () => {
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [packages/api/]\nwatches:\n  - code: src/**\n    doc: docs/decisions/adr/\nignore: ["node_modules/**"]\n`,
      'packages/api/.ownership.yml': 'version: 2\nowned: []\nwatches:\n  - code: src/**\n    doc: ../../docs/decisions/adr/\nignore: ["dist/**"]\n',
    },
    root => {
      const config = resolveOwnership(root)!

      assert.equal(config.watches.length, 2)
      assert.deepEqual(config.ignore, ['node_modules/**', 'packages/api/dist/**'])
    },
  )
})

test('pruning: a file whose directory reaches no path is not read', () => {
  withTempRepo(
    { '.ownership.yml': `${BASE}include: [packages/api/]\n`, 'packages/api/.ownership.yml': 'this is not valid YAML: [\n' },
    root => {
      assert.doesNotThrow(() => resolveOwnership(root, { onlyFor: ['packages/web/x.ts'] }))
      assert.throws(() => resolveOwnership(root, { onlyFor: ['packages/api/x.ts'] }), OwnershipError)
    },
  )
})

test('findOwnedRule finds the only rule that covers, and null when none covers', () => {
  withTempRepo({ '.ownership.yml': BASE }, root => {
    const config = resolveOwnership(root)!

    assert.equal(findOwnedRule(config, 'docs/decisions/adr/ADR-0001-x.md')?.owner, '@a')
    assert.equal(findOwnedRule(config, 'src/index.ts'), null)
  })
})

test('the root top-level blocks arrive in ResolvedConfig.pluginBlocks', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nplugins: [living-docs]\nliving-docs:\n  stale-after-months: 3\nowned: []\n' }, root => {
    assert.deepEqual(resolveOwnership(root)?.pluginBlocks, { 'living-docs': { 'stale-after-months': 3 } })
  })
})
