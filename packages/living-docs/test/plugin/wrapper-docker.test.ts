import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { test } from 'node:test'
import picomatch from 'picomatch'
import { loadOwnership } from '../../src/config/ownership.ts'
import { watchesFor } from '../../src/config/watches.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()

function source(relative: string): string {
  return readFileSync(join(ROOT, relative), 'utf8')
}

/**
 * O bit de execução vem do índice do git, não do sistema de arquivos: um
 * checkout Windows não tem modo POSIX, e o que chega a quem clona é o modo
 * versionado. Mesma escolha de `test/plugin/manifest.test.ts`.
 */
function gitMode(relative: string): string {
  const entry = execFileSync('git', ['ls-files', '-s', '--', relative], { cwd: ROOT, encoding: 'utf8' })

  return entry.split(/\s+/)[0] ?? ''
}

test('RNF-0006: bin/dev é executável e não enumera comando nenhum', () => {
  assert.equal(gitMode('bin/dev'), '100755', 'bin/dev precisa estar versionado como executável')

  const wrapper = source('bin/dev')

  assert.match(wrapper, /"\$@"/, 'o wrapper repassa os argumentos que recebeu')
  assert.match(wrapper, /exec\s+docker\s+exec/, 'o comando substitui o wrapper — é assim que o código de saída é o do comando')

  // A invariante da spec §2, verificada em vez de prometida: uma tabela de
  // subcomandos é exatamente o que não pode existir aqui, porque é ela que
  // divergiria da lista do host.
  assert.doesNotMatch(wrapper, /\bcase\s+"?\$\{?[1@]/, 'tabela de subcomandos: a lista que diverge do host começa assim')
  assert.doesNotMatch(wrapper, /src\/cli\/index\.ts/, 'bin/dev não conhece o CLI — quem o conhece é bin/living-docs')
})

test('RNF-0006: bin/dev deriva a raiz do próprio caminho e respeita LIVING_DOCS_CONTAINER', () => {
  const wrapper = source('bin/dev')

  assert.match(wrapper, /LIVING_DOCS_CONTAINER:-esliph-living-docs/, 'o nome do container vem do ambiente, com o padrão que bin/living-docs já publica')
  assert.match(wrapper, /BASH_SOURCE\[0\]/, 'a raiz do repositório sai do caminho do próprio script (ADR-0003), nunca do diretório de trabalho')
})

test('RNF-0006: bin/living-docs delega a bin/dev, sem lógica de container própria', () => {
  assert.equal(gitMode('bin/living-docs'), '100755', 'bin/living-docs precisa continuar executável')

  const wrapper = source('bin/living-docs')

  assert.match(wrapper, /\/dev\b/, 'o wrapper do CLI invoca bin/dev')
  assert.match(wrapper, /node\s+packages\/living-docs\/src\/cli\/index\.ts/, 'e é ele, não bin/dev, que conhece o CLI')

  // O teste que impede a duplicação de lógica voltar: toda conversa com o
  // daemon mora em bin/dev, e um segundo lugar que a tenha é um segundo lugar
  // para divergir.
  assert.doesNotMatch(wrapper, /docker\s+(exec|inspect|compose)/, 'lógica de container duplicada — ela pertence a bin/dev (ADR-0016)')

  // O modo de falha que TDR-0002 descreveu: sair 2 porque o container não está
  // de pé. bin/dev sobe o container; ninguém mais precisa recusar-se a rodar.
  assert.doesNotMatch(wrapper, /exit\s+2\b/, 'o container ausente deixou de ser modo de falha (E-2)')
})

test('RNF-0006: docs/.ownership.yml cobre bin/dev em watches e em consumer-visible-paths', () => {
  const config = loadOwnership(ROOT)

  // Mecanismo 1: quem toca bin/dev leva o doc dono no mesmo commit.
  const matches = watchesFor(config, ['bin/dev'])

  assert.deepEqual(
    matches.map(match => match.doc),
    ['CHANGELOG.md'],
    'bin/dev é ponto de entrada público e precisa de doc dono declarado',
  )
  assert.equal(matches[0]?.consumerVisible, true, 'a mudança é visível a quem consome (CI-6)')

  // A mesma cobertura pelo lado de CI-6, que lê a lista de globs.
  assert.ok(picomatch(config.consumerVisiblePaths)('bin/dev'), 'bin/dev fora de consumer-visible-paths: CI-6 não cobraria a entrada de CHANGELOG')

  // E o wrapper que já existia não pode ter sido descoberto no caminho.
  assert.ok(picomatch(config.consumerVisiblePaths)('bin/living-docs'))
})
