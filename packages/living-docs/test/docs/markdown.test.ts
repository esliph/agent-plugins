import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeProse, sentencesOf, stripCode, stripFences } from '../../src/docs/markdown.ts'

test('stripFences apaga só o bloco cercado — o código inline fica', () => {
  const source = ['item — verificação: `living-docs/staleness`.', '```markdown', 'exemplo com `CI-n`', '```', 'depois'].join('\n')
  const stripped = stripFences(source)

  assert.equal(stripped.split('\n').length, source.split('\n').length, 'a linha do achado depende disto')
  assert.ok(stripped.includes('`living-docs/staleness`'), 'o ID entre crases é o que quem procura verificação precisa ver')
  assert.equal(stripped.includes('CI-n'), false, 'o exemplo dentro da cerca é exemplo')
  assert.ok(stripped.includes('depois'))
})

test('stripCode apaga bloco cercado e código inline, preservando a contagem de linhas', () => {
  const source = ['prosa com `[[wikilink]]` dentro', '', '```ts', 'const x = /\\]\\(/;', '```', 'depois'].join('\n')
  const stripped = stripCode(source)

  assert.equal(stripped.split('\n').length, source.split('\n').length, 'a linha do achado depende disto')
  assert.equal(stripped.includes('wikilink'), false, 'código inline não é link')
  assert.equal(stripped.includes('const x'), false)
  assert.ok(stripped.includes('depois'))
})

test('stripCode fecha o bloco só com cerca do mesmo tamanho ou maior', () => {
  const source = ['````markdown', 'exemplo', '```ts', 'const y = 1;', '```', 'ainda dentro', '````', 'fora'].join('\n')
  const stripped = stripCode(source)

  assert.equal(stripped.includes('ainda dentro'), false, 'a cerca de 3 não fecha a de 4')
  assert.ok(stripped.includes('fora'))
})

test('normalizeProse tira marcação, pontuação e caixa', () => {
  assert.equal(normalizeProse('**A regra** vem antes do `código`!'), 'a regra vem antes do código')
  assert.equal(normalizeProse('  espaço   colapsado  '), 'espaço colapsado')
})

test('sentencesOf junta parágrafo antes de cortar, e corta em lista e título', () => {
  const source = ['# Título', '', 'Uma frase que a prosa', 'quebrou em duas linhas. E outra depois.', '', '- item de lista', '- outro item'].join('\n')

  const sentences = sentencesOf(source).map(sentence => sentence.text)

  assert.deepEqual(sentences, ['Título', 'Uma frase que a prosa quebrou em duas linhas.', 'E outra depois.', 'item de lista', 'outro item'])
  assert.equal(sentencesOf(source)[1]?.line, 3, 'a frase começa na linha em que o parágrafo começou')
})
