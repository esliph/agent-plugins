---
id: ADR-0028
title: 'Bloco de plugin no topo da raiz: configuração global do plugin mora no arquivo raiz'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-28
relates-to: [ADR-0020, ADR-0025]
supersedes: null
superseded-by: null
---

# ADR-0028 — Bloco de plugin no topo da raiz: configuração global do plugin mora no arquivo raiz

## Contexto

A v1 do arquivo de ownership carrega três valores do living-docs que não
pertencem a nenhuma entrada: `stale-after-months`, `id-format` e
`last-reviewed-bump-limit`. `ADR-0020` decidiu que um plugin declara o vínculo
com um caminho pela presença do bloco dele numa entrada de `owned[]`, e só
previu bloco dentro de entrada. Quando o living-docs passa a ler a v2, esses
três valores ficam sem lugar.

O núcleo também passa a exportar, para o living-docs, utilitários que já tinha
por dentro (leitura de itens de tabela e de seção, leitura do CODEOWNERS e o
catálogo dos próprios checks). Isso cresce a API pública além do que a spec do
núcleo listou, e esta decisão é o lugar de registrar o critério.

## Alternativas consideradas

- **Repetir a configuração em cada entrada.** Descartada: são cerca de vinte
  entradas com o mesmo valor global, e nada impediria duas entradas de discordar
  do `id-format`, o que abriria famílias de ID com formatos diferentes no mesmo
  repositório.
- **Um arquivo de configuração próprio do plugin.** Descartada: é o "um arquivo
  por plugin" que a pesquisa do núcleo já tinha recusado. Quem quer saber a
  política de um repositório passaria a ler dois lugares, e o `plugins:` da raiz
  deixaria de ser a lista completa de quem opina sobre ele.
- **Aceitar chave de topo com qualquer nome.** Descartada pela mesma razão que
  `ADR-0020` recusou chave de primeiro nível desconhecida: um nome de bloco
  digitado errado seria ignorado em silêncio.

## Decisão

O arquivo raiz aceita, no topo, uma chave para cada nome listado em `plugins:`.
O núcleo repassa o valor de cada uma, sem interpretá-lo, em
`RootFile.pluginBlocks` e em `ResolvedConfig.pluginBlocks`. O valor segue a
regra de `ADR-0020`: é sempre um mapeamento, `{}` declara a participação sem
configuração, e qualquer outro valor é erro de carga que nomeia o arquivo e o
bloco. Bloco de plugin no topo de um arquivo incluído é erro, pela mesma razão de
`plugins:` ser exclusivo da raiz, e um plugin não pode ter o nome de uma chave do
núcleo. Isto refina `ADR-0020` sem editá-lo.

A API pública do núcleo cresce só no que o living-docs importa:
`parseItemsTable`, `parseItemsSections`, `normalizeFieldKey`, `isEmptyValue`,
`DocItem`, `parseCodeowners`, `loadCodeowners`, `ownersOf` e o catálogo público
dos checks. Os três utilitários de CODEOWNERS entram porque o `init` e dois
testes do living-docs dependem deles.

## Consequências

### O que se ganha

A configuração global do plugin mora uma vez, no único arquivo que lista quem
são os plugins. O núcleo continua sem conhecer nenhuma chave de plugin, e um nome
de bloco de topo digitado errado vira erro visível.

### O que se aceita perder

O núcleo passa a ter dois lugares onde um bloco de plugin pode aparecer (topo da
raiz e entrada), com a mesma regra de tipo mas escopos diferentes, e quem lê o
arquivo precisa saber a diferença. O conteúdo do bloco de topo continua opaco:
chave errada *dentro* dele só aparece quando o plugin roda. E a API pública do
núcleo é agora uma superfície que o living-docs consome: renomear qualquer um
desses nomes quebra o plugin, e não só quem importava o núcleo por fora.
