import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findOwnedRule, resolveOwnership } from '../../src/resolve/hierarchy.ts'
import { OwnershipError } from '../../src/schema/types.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const BASE = 'version: 2\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    skill: decision-recorder\n'
const CHILD = 'version: 2\nowned:\n  - path: docs/\n    owner: "@b"\n'

test('sem arquivo de ownership, resolveOwnership devolve null', () => {
  withTempRepo({}, root => {
    assert.equal(resolveOwnership(root), null)
  })
})

test('arquivo único: a entrada resolvida aponta o próprio arquivo como origem', () => {
  withTempRepo({ '.ownership.yml': BASE }, root => {
    const config = resolveOwnership(root)

    assert.equal(config?.owned[0]?.path, 'docs/decisions/adr/')
    assert.equal(config?.owned[0]?.origin, '.ownership.yml')
  })
})

test('a base da raiz é a raiz do repositório mesmo quando ela mora em docs/', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 2\nowned:\n  - path: CLAUDE.md\n    owner: "@a"\n' }, root => {
    assert.equal(resolveOwnership(root)?.owned[0]?.path, 'CLAUDE.md')
  })
})

test('include de diretório acha o único arquivo de ownership dentro dele', () => {
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

test('include de arquivo explícito funciona quando há mais de um no diretório', () => {
  withTempRepo(
    { '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 2\nowned:\n  - path: docs/specs/\n    owner: "@b"\n' },
    root => {
      assert.equal(resolveOwnership(root)?.owned.length, 2)
    },
  )
})

test('include de diretório com mais de um arquivo de ownership é ambíguo', () => {
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [packages/api/]\n`,
      'packages/api/.ownership.yml': 'version: 2\nowned: []\n',
      'packages/api/ownership.extra.yml': 'version: 2\nowned: []\n',
    },
    root => {
      assert.throws(() => resolveOwnership(root), /ambíguo/)
    },
  )
})

test('include apontando para arquivo que não existe é OwnershipError', () => {
  withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n` }, root => {
    assert.throws(() => resolveOwnership(root), OwnershipError)
  })
})

test('include aninhado é lido', () => {
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

test('ciclo de include é erro', () => {
  withTempRepo(
    { '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 2\nowned: []\ninclude: [.ownership.yml]\n' },
    root => {
      assert.throws(() => resolveOwnership(root), /Ciclo de include/)
    },
  )
})

test('o mesmo arquivo incluído por dois é erro, e não se confunde com ciclo', () => {
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [ownership.a.yml, ownership.b.yml]\n`,
      'ownership.a.yml': 'version: 2\nowned: []\ninclude: [ownership.shared.yml]\n',
      'ownership.b.yml': 'version: 2\nowned: []\ninclude: [ownership.shared.yml]\n',
      'ownership.shared.yml': 'version: 2\nowned: []\n',
    },
    root => {
      assert.throws(() => resolveOwnership(root), /incluído uma vez só/)
    },
  )
})

test('caminho declarado fora da base do arquivo que o declara é erro', () => {
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [packages/api/]\n`,
      'packages/api/.ownership.yml': 'version: 2\nowned:\n  - path: ../web/docs/\n    owner: "@b"\n',
    },
    root => {
      assert.throws(() => resolveOwnership(root), /fora da base/)
    },
  )
})

test('include que sai da base também é erro', () => {
  withTempRepo(
    { '.ownership.yml': `${BASE}include: [packages/api/]\n`, 'packages/api/.ownership.yml': 'version: 2\nowned: []\ninclude: [../web/]\n' },
    root => {
      assert.throws(() => resolveOwnership(root), /fora da base/)
    },
  )
})

test('derives-from.source fora da base é erro — senão a poda mata o lembrete', () => {
  withTempRepo(
    {
      '.ownership.yml': `${BASE}include: [packages/api/]\n`,
      'packages/api/.ownership.yml':
        'version: 2\nowned:\n  - path: plans/\n    owner: "@b"\n    derives-from:\n      source: ../../docs/specs/\n      field: spec\n',
    },
    root => {
      assert.throws(() => resolveOwnership(root), /fora da base/)
    },
  )
})

test('watches[].doc pode sair da base; watches[].code não', () => {
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
      assert.throws(() => resolveOwnership(root), /fora da base/)
    },
  )
})

test('basePath desloca a base para dentro', () => {
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

test('basePath que sobe é erro', () => {
  withTempRepo(
    { '.ownership.yml': `${BASE}include: [packages/api/]\n`, 'packages/api/.ownership.yml': 'version: 2\nbasePath: ../web\nowned: []\n' },
    root => {
      assert.throws(() => resolveOwnership(root), OwnershipError)
    },
  )
})

test('caminho igual declarado duas vezes no mesmo arquivo é colisão', () => {
  withTempRepo({ '.ownership.yml': `${BASE}  - path: docs/decisions/adr/\n    owner: "@b"\n` }, root => {
    assert.throws(() => resolveOwnership(root), /colide/)
  })
})

test('caminho contido em outro é colisão, mesmo entre arquivos diferentes', () => {
  withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': CHILD }, root => {
    assert.throws(() => resolveOwnership(root), /colide/)
  })
})

test('caminhos irmãos não colidem', () => {
  withTempRepo(
    { '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 2\nowned:\n  - path: docs/specs/\n    owner: "@b"\n' },
    root => {
      assert.equal(resolveOwnership(root)?.owned.length, 2)
    },
  )
})

test('caminho gerado dentro de caminho governado não é colisão; dois geradores para o mesmo arquivo são', () => {
  withTempRepo({ '.ownership.yml': `${BASE}generated:\n  - path: docs/decisions/adr/index.gen.md\n    command: gen\n` }, root => {
    assert.equal(resolveOwnership(root)?.generated.length, 1)
  })
  withTempRepo({ '.ownership.yml': `${BASE}generated:\n  - path: x.gen.md\n    command: a\n  - path: x.gen.md\n    command: b\n` }, root => {
    assert.throws(() => resolveOwnership(root), /colide/)
  })
})

test('dois watches para o mesmo code convivem', () => {
  withTempRepo({ '.ownership.yml': `${BASE}watches:\n  - code: src/**\n    doc: a.md\n  - code: src/**\n    doc: b.md\n` }, root => {
    assert.equal(resolveOwnership(root)?.watches.length, 2)
  })
})

test('arquivo incluído sem version é erro, e com version divergente também', () => {
  withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'owned: []\n' }, root => {
    assert.throws(() => resolveOwnership(root), OwnershipError)
  })
  withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 3\nowned: []\n' }, root => {
    assert.throws(() => resolveOwnership(root), OwnershipError)
  })
})

test('entrada sem owner é erro — não há de onde herdar', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned:\n  - path: docs/\n' }, root => {
    assert.throws(() => resolveOwnership(root), OwnershipError)
  })
})

test('watches, generated e ignore acumulam entre arquivos', () => {
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

test('poda: arquivo cujo diretório não alcança nenhum caminho não é lido', () => {
  withTempRepo(
    { '.ownership.yml': `${BASE}include: [packages/api/]\n`, 'packages/api/.ownership.yml': 'isto não é YAML válido: [\n' },
    root => {
      assert.doesNotThrow(() => resolveOwnership(root, { onlyFor: ['packages/web/x.ts'] }))
      assert.throws(() => resolveOwnership(root, { onlyFor: ['packages/api/x.ts'] }), OwnershipError)
    },
  )
})

test('findOwnedRule acha a única regra que cobre, e null quando nenhuma cobre', () => {
  withTempRepo({ '.ownership.yml': BASE }, root => {
    const config = resolveOwnership(root)!

    assert.equal(findOwnedRule(config, 'docs/decisions/adr/ADR-0001-x.md')?.owner, '@a')
    assert.equal(findOwnedRule(config, 'src/index.ts'), null)
  })
})

test('os blocos de topo da raiz chegam em ResolvedConfig.pluginBlocks', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nplugins: [living-docs]\nliving-docs:\n  stale-after-months: 3\nowned: []\n' }, root => {
    assert.deepEqual(resolveOwnership(root)?.pluginBlocks, { 'living-docs': { 'stale-after-months': 3 } })
  })
})
