import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { runInit } from '../../src/cli/init.ts'
import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OPTIONS = {
  owner: '@time',
  dryRun: false,
  stage: 'production' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
  invokeOwnership: 'npx ownership',
  marketplace: 'time/living-docs' as string | null,
}

const WORKFLOW = '.github/workflows/living-docs.yml'

test('RF-0013: o init escreve o workflow de CI do estágio', () => {
  withTempRepo({}, root => {
    const result = runInit(root, OPTIONS)

    assert.ok(result.created.includes(WORKFLOW), JSON.stringify(result.created, null, 2))
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')

    assert.match(yaml, /npx living-docs validate/)
    // A deriva de gerado e a entrada de CHANGELOG são do núcleo: saíram daqui.
    assert.doesNotMatch(yaml, /npx living-docs drift/)
    assert.doesNotMatch(yaml, /npx living-docs changelog/)
  })
})

test('RF-0013: o workflow instalado não impõe Docker a quem instala', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')

    assert.doesNotMatch(yaml, /docker/i, 'como o toolkit chega ao CI de quem instala é DA-0003, não uma imposição nossa')
  })
})

test('RN-0025: o estágio solo instala validate e nada além', () => {
  withTempRepo({}, root => {
    runInit(root, { ...OPTIONS, stage: 'solo' })
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')

    assert.match(yaml, /living-docs validate/)
    assert.doesNotMatch(yaml, /living-docs drift/)
    assert.doesNotMatch(yaml, /living-docs changelog/)
  })
})

test('RF-0013: workflow preexistente é mantido, e rodar duas vezes não duplica', () => {
  const meu = 'name: meu-ci\non:\n  push:\n'

  withTempRepo({ '.github/workflows/ci.yml': meu }, root => {
    runInit(root, OPTIONS)
    assert.equal(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8'), meu)

    const depois = readFileSync(join(root, WORKFLOW), 'utf8')
    const segunda = runInit(root, OPTIONS)

    assert.ok(segunda.skipped.includes(WORKFLOW))
    assert.equal(readFileSync(join(root, WORKFLOW), 'utf8'), depois)
  })
})

test('critério 3: sem enforcement, o init deixa workflow e registro de plugin — e rodar de novo não duplica', () => {
  withTempRepo({}, root => {
    runInit(root, OPTIONS)

    assert.ok(existsSync(join(root, WORKFLOW)))
    const settings = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8')) as Record<string, Record<string, unknown>>

    assert.equal(settings.enabledPlugins?.['living-docs@living-docs'], true)

    const antes = readFileSync(join(root, '.claude/settings.json'), 'utf8')
    const segunda = runInit(root, OPTIONS)

    assert.equal(readFileSync(join(root, '.claude/settings.json'), 'utf8'), antes)
    assert.ok(segunda.skipped.includes('.claude/settings.json'))
  })
})

test('critério 4: hooks e workflows próprios continuam lá, e o do toolkit foi acrescentado', () => {
  const meusHooks = JSON.stringify({ hooks: { PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: './formata.sh' }] }] } }, null, 2)

  withTempRepo({ '.claude/settings.json': meusHooks, '.github/workflows/ci.yml': 'name: meu-ci\non:\n  push:\n' }, root => {
    runInit(root, OPTIONS)

    const settings = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8')) as Record<string, Record<string, unknown>>

    assert.ok(settings.hooks, 'nenhum hook do consumidor pode ser perdido')
    assert.equal(settings.enabledPlugins?.['living-docs@living-docs'], true)
    assert.match(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8'), /meu-ci/)
    assert.ok(existsSync(join(root, WORKFLOW)))
  })
})

test('RF-0013: sem --marketplace, o registro não é inventado — é relatado', () => {
  withTempRepo({}, root => {
    const result = runInit(root, { ...OPTIONS, marketplace: null })

    assert.equal(existsSync(join(root, '.claude/settings.json')), false)
    assert.ok(result.notInstalled.some(linha => linha.includes('--marketplace <owner/repo>') && linha.includes('não se adivinha')))
  })
})

test('critério 5: multi-team instala o enforcement da Fase 7', () => {
  withTempRepo({}, root => {
    const result = runInit(root, { ...OPTIONS, stage: 'multi-team' })

    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')

    assert.match(yaml, /npx living-docs validate --base/, 'a metade de CI-7 que lê o diff é a Fase 7')
    assert.doesNotMatch(yaml, /npx living-docs drift/)
    assert.doesNotMatch(yaml, /npx living-docs changelog/)
    assert.ok(
      result.notInstalled.every(item => /ownership validate/.test(item)),
      'as sete fases existem: só sobra o aviso do resto do repositório',
    )
  })
})

test('RN-0025: multi-team instala tudo que production instala', () => {
  withTempRepo({}, root => {
    runInit(root, { ...OPTIONS, stage: 'multi-team' })
    for (const path of ['CHANGELOG.md', 'docs/contracts/errors.md', 'docs/deprecations.md']) {
      assert.ok(existsSync(join(root, path)), `${path} deveria existir no estágio multi-team`)
    }
  })
})

test('RN-0025/ADR-0012: production instala o diff do núcleo (Fase 6), mas não o do living-docs (Fase 7)', () => {
  withTempRepo({}, root => {
    runInit(root, { ...OPTIONS, stage: 'production' })
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')

    assert.match(yaml, /npx ownership validate --base/, 'a decisão de ADR-0012/ADR-0030 liga as regras de diff do núcleo já em production')
    assert.doesNotMatch(yaml, /npx living-docs validate --base/, 'a metade de CI-7 que ficou no living-docs só entra na Fase 7 (multi-team)')
  })
})

test('RF-0013: o workflow semeado roda as duas CLIs, cada uma pelo seu comando de invocação', () => {
  withTempRepo({}, root => {
    runInit(root, { ...OPTIONS, invoke: 'npx living-docs', invokeOwnership: 'pnpm ownership' })
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8')

    assert.match(yaml, /run: pnpm ownership validate\n/)
    assert.match(yaml, /run: pnpm ownership validate --base /)
    assert.match(yaml, /run: npx living-docs validate\n/)
    assert.doesNotMatch(yaml, /drift|changelog/)
  })
})
