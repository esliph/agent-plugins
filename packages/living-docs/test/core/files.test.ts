import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { listFiles, readTextFile, isProbablyText, forgetTree, MAX_BYTES } from '../../src/core/files.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const ARVORE = {
  'docs/um.md': '# um\n',
  'docs/sub/dois.md': '# dois\n',
  'docs/tres.txt': 'texto\n',
  'src/quatro.ts': 'export const x = 1;\n',
  'node_modules/pacote/cinco.md': '# não me leia\n',
  '.git/config': '[core]\n',
}

test('listFiles varre tudo, com `/` sempre, e pula o que nunca tem documento', () => {
  withTempRepo(ARVORE, root => {
    const files = listFiles(root)

    assert.ok(files.includes('docs/sub/dois.md'))
    assert.ok(files.includes('src/quatro.ts'))
    assert.equal(
      files.some(file => file.startsWith('node_modules/')),
      false,
    )
    assert.equal(
      files.some(file => file.startsWith('.git/')),
      false,
    )
    assert.equal(
      files.some(file => file.includes('\\')),
      false,
    )
  })
})

test('listFiles filtra por glob; lista vazia não é ausência de filtro', () => {
  withTempRepo(ARVORE, root => {
    assert.deepEqual(listFiles(root, ['docs/**/*.md']).sort(), ['docs/sub/dois.md', 'docs/um.md'])
    assert.deepEqual(listFiles(root, []), [], 'filtro vazio casa nada — não é "tudo"')
    assert.ok(listFiles(root, undefined).length > 3, 'sem filtro é tudo')
  })
})

test('listFiles casa arquivo que começa com ponto — o corpus começa pelo `.ownership.yml`', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 2\n', 'docs/sub/.gitkeep': '' }, root => {
    assert.deepEqual(listFiles(root, ['docs/**']).sort(), ['docs/.ownership.yml', 'docs/sub/.gitkeep'])
  })
})

test('a varredura é memoizada por raiz, e `forgetTree` a esquece', () => {
  withTempRepo(ARVORE, root => {
    forgetTree(root)
    assert.equal(listFiles(root, ['docs/**/*.md']).length, 2)

    writeFileSync(join(root, 'docs/tres.md'), '# três\n', 'utf8')
    assert.equal(listFiles(root, ['docs/**/*.md']).length, 2, 'dentro da mesma execução, a árvore é a de antes')

    forgetTree(root)
    assert.equal(listFiles(root, ['docs/**/*.md']).length, 3, 'execução nova, árvore nova')
  })
})

test('o glob é aplicado a cada chamada — o cache guarda a varredura crua', () => {
  withTempRepo(ARVORE, root => {
    forgetTree(root)
    const tudo = listFiles(root)

    assert.deepEqual(listFiles(root, []), [], 'lista vazia segue casando nada, mesmo com a árvore em memória')
    assert.deepEqual(listFiles(root, undefined), tudo)

    // A lista devolvida é cópia: ordenar o resultado não reordena o cache.
    listFiles(root).sort().reverse()
    assert.deepEqual(listFiles(root), tudo)
  })
})

test('readTextFile devolve o conteúdo, e null para binário, grande ou ausente', () => {
  withTempRepo(ARVORE, root => {
    assert.equal(readTextFile(root, 'docs/um.md'), '# um\n')
    assert.equal(readTextFile(root, 'docs/nao-existe.md'), null)

    mkdirSync(join(root, 'docs/anexos'), { recursive: true })
    writeFileSync(join(root, 'docs/anexos/bin.dat'), Buffer.from([0x41, 0x00, 0x42]))
    assert.equal(readTextFile(root, 'docs/anexos/bin.dat'), null, 'byte NUL é o sinal de binário')

    writeFileSync(join(root, 'docs/anexos/grande.md'), 'x'.repeat(MAX_BYTES + 1), 'utf8')
    assert.equal(readTextFile(root, 'docs/anexos/grande.md'), null, 'acima do teto é dado, não texto')
  })
})

test('isProbablyText separa texto de dado pelo byte NUL', () => {
  assert.equal(isProbablyText('qualquer prosa'), true)
  assert.equal(isProbablyText(`com${String.fromCharCode(0)}nul`), false)
})
