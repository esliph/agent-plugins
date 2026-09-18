import { test } from 'node:test'
import assert from 'node:assert/strict'
import { findCitations, loadRetiredIds, RETIRED_IDS_PATH } from '../../src/ids/citations.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('encontra citações com linha 1-indexed', () => {
  const source = ['# Título', '', 'Supersede ADR-0031 e fecha DA-0007.', 'Cita TDR-003 também.'].join('\n')

  assert.deepEqual(findCitations(source), [
    { id: 'ADR-0031', line: 3 },
    { id: 'DA-0007', line: 3 },
    { id: 'TDR-003', line: 4 },
  ])
})

test('ignora o que não é sintaxe de citação', () => {
  assert.deepEqual(findCitations('UTF-8 e adr-0001 e ADR-12'), [])
})

test('loadRetiredIds lê o registro ignorando comentários e vazios', () => {
  withTempRepo({ [RETIRED_IDS_PATH]: '# retirados\nADR-0002\n\nDA-0005\n' }, root => {
    const retired = loadRetiredIds(root)

    assert.equal(retired.has('ADR-0002'), true)
    assert.equal(retired.has('DA-0005'), true)
    assert.equal(retired.size, 2)
  })
})

test('ausência do registro devolve conjunto vazio', () => {
  withTempRepo({ 'README.md': '' }, root => {
    assert.equal(loadRetiredIds(root).size, 0)
  })
})

test('RN-0024: findCitations reconhece a forma declarada pelo projeto', () => {
  const texto = 'A RN009 diz, e a RN-0009 não é citação neste projeto.'
  const achadas = findCitations(texto, { separator: '', padding: 3 }).map(c => c.id)

  assert.deepEqual(achadas, ['RN009'])
})

test('RN-0024: sem formato declarado, a varredura é a de sempre', () => {
  const achadas = findCitations('cita ADR-0001 e DA-007').map(c => c.id)

  assert.deepEqual(achadas, ['ADR-0001', 'DA-007'])
})
