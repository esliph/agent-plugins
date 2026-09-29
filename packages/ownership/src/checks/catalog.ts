/**
 * O contrato público dos checks do núcleo. O `living-docs` o imprime junto do
 * dele em `docs/contracts/checks.gen.md`. Só tipos e dados, de propósito: um
 * gerador não precisa puxar YAML nem git para listar o que existe.
 */
export interface CatalogEntry {
  id: string
  name: string
  command: string
  failsWhen: string
}

export const CORE_CHECK_CATALOG: readonly CatalogEntry[] = Object.freeze([
  {
    id: 'ownership/declared-state',
    name: 'declared state',
    command: 'ownership validate',
    failsWhen:
      'O estado de um arquivo ou item (o campo de `state-field`, `status` por padrão) está fora de `states` declarado para o caminho; a mesma chave aparece duas vezes no mesmo arquivo; ou o `owner` do frontmatter não começa com `@`.',
  },
  {
    id: 'ownership/generated-drift',
    name: 'generated drift',
    command: 'ownership validate',
    failsWhen: 'A saída do comando declarado em `generated[]` difere do arquivo versionado; o comando falha; ou o arquivo declarado não existe.',
  },
  {
    id: 'ownership/owner-coverage',
    name: 'owner coverage',
    command: 'ownership validate',
    failsWhen:
      'Um arquivo do repositório não é coberto por `owned[]` nem por `ignore`; um caminho de `owned[]` não existe ou não tem linha no CODEOWNERS; o CODEOWNERS não existe; ou o `doc` de uma regra de `watches` não existe ou não tem entrada em `owned[]`.',
  },
  {
    id: 'ownership/derivation-resolves',
    name: 'derivation resolves',
    command: 'ownership validate',
    failsWhen: 'Um documento que deriva de uma fonte não declara o campo de derivação, ou o campo aponta para fora da fonte ou para arquivo inexistente.',
  },
  {
    id: 'ownership/watch-satisfied',
    name: 'watch satisfied',
    command: 'ownership validate --base <ref>',
    failsWhen:
      'O diff entre a base e `HEAD` toca um caminho de `watches` e o `doc` da regra não está no mesmo diff, sem `Docs: none — <razão>` em alguma mensagem de commit.',
  },
  {
    id: 'ownership/consumer-change-logged',
    name: 'consumer change logged',
    command: 'ownership validate --base <ref>',
    failsWhen:
      'O diff toca um caminho de `watches` marcado `consumer-visible: true` e o `doc` da regra não vem no mesmo diff com item em `## [Unreleased]`, sem `Changelog: none — <razão>` em alguma mensagem de commit.',
  },
])
