import { test } from 'node:test'
import assert from 'node:assert/strict'
import { scanCitations } from '../../src/ids/coverage.ts'
import { withTempRepo } from '../helpers/tmp.ts'

test('encontra citações só nos caminhos declarados', () => {
  withTempRepo(
    {
      'test/regra.test.ts': "// cobre RN-0001\ntest('RN-0001', () => {});\n",
      'src/app.ts': 'export const x = 1; // RN-0002\n',
      'notas.md': 'RN-0003 mencionada fora do escopo\n',
    },
    root => {
      const sites = scanCitations(root, ['test/**', 'src/**'])

      assert.equal(sites.get('RN-0001')?.length, 2)
      assert.equal(sites.get('RN-0002')?.[0]?.file, 'src/app.ts')
      assert.equal(sites.has('RN-0003'), false)
    },
  )
})

test('sem globs, não varre nada', () => {
  withTempRepo({ 'src/a.ts': 'RN-0001\n' }, root => {
    assert.equal(scanCitations(root, []).size, 0)
  })
})

test('ignora node_modules', () => {
  withTempRepo({ 'node_modules/pacote/index.js': 'RN-0001\n' }, root => {
    assert.equal(scanCitations(root, ['**/*.js']).size, 0)
  })
})

test('a linha do sítio aponta a ocorrência dentro do arquivo', () => {
  withTempRepo({ 'src/a.ts': 'linha 1\nlinha 2\n// RN-0004\n' }, root => {
    assert.equal(scanCitations(root, ['src/**']).get('RN-0004')?.[0]?.line, 3)
  })
})

test('arquivo binário não vira sítio de citação', () => {
  withTempRepo({ 'src/dados.bin': `RN-0005${String.fromCharCode(0)}lixo` }, root => {
    assert.equal(scanCitations(root, ['src/**']).size, 0)
  })
})
