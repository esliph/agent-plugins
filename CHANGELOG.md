# Changelog

Este arquivo é voltado a quem **consome** o `living-docs`. Teste único: se a
entrada só faz sentido para quem escreveu o código, ela não pertence aqui.
Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

A entrada nasce no PR que causa a mudança, não na véspera da release.

## [Unreleased]

### Added

- `documents:` no `docs/.ownership.yml`: declara documento com dono e sem família
  de IDs (`CONTRIBUTING.md`, a Definition of Done, o contrato do agente,
  `CHANGELOG.md`) com `path`, `owner`, `skill` opcional e `role` opcional
  (`agent-contract`, `definition-of-done`). A chave é opcional: configuração
  escrita nas versões anteriores continua válida.
- Subcomando `living-docs changelog --base <ref>`: falha quando o diff da
  branch toca um caminho declarado em `consumer-visible-paths` e a entrada de
  `## [Unreleased]` não viaja junto (`CI-6`).
- Rótulo de exceção `Changelog: none — <razão>` na mensagem de commit, para a
  mudança que de fato não é visível a quem consome. Sem razão, não conta.
- Hook `HK-7`: marcador de atalho novo (`TODO`, `FIXME`, supressão de tipo ou
  de lint, teste ignorado) sem `TDR-nnnn` por perto gera lembrete. Nunca
  bloqueio.
- `living-docs init --stage production` passa a instalar `CHANGELOG.md`,
  `docs/deprecations.md`, `docs/releases/` e `docs/migrations/`, e a declarar o
  artefato `REL` no `docs/.ownership.yml`.
- Prefixo de ID `REL` para release note, com os estados `draft` e `published`.
  Publicada, ela é congelada por `HK-1`.
- Skill `release-historian` e comando `/release [versão]`, donos do
  `CHANGELOG.md`, das release notes, das depreciações e dos guias de migração.
- Código de erro `BASE-UNRESOLVED`: `changelog` sem `--base`, com base que não
  resolve, ou em clone raso.
- `living-docs init` declara em `documents:` todo documento que instala, com
  dono, skill dona e — para o contrato do agente e a Definition of Done — o
  `role` que `CI-7` usa para achá-los. Repositório que sobe de estágio recebe só
  as entradas que faltam; sem âncora no arquivo, o comando diz o que falta em vez
  de reescrever.
- O template de TDR traz o gatilho de pagamento de máquina (`pay-when`) como
  exemplo comentado.
- `CI-4` (staleness), `CI-7` (ownership coverage) e `CI-8` (links) passam a rodar
  em `living-docs validate`. `CI-4` é o único que produz aviso: aviso é
  reportado e não muda o código de saída.
- `living-docs validate --base <ref>` liga a metade de `CI-7` que lê o diff da
  branch: caminho vigiado alterado sem o doc dono reprova, e a saída escrita é
  `Docs: none — <razão>` numa mensagem de commit do intervalo.

### Changed

- `living-docs validate` passa a apontar `living-docs changelog` quando o
  repositório declara `consumer-visible-paths` — ponteiro, não achado: o código
  de saída não muda.
- A lista de "não instalado" de `--stage production` fica vazia: o estágio
  passa a cobrir as Fases 5 e 6 da spec por completo.
- O workflow do repositório passa a rodar `CI-6` em pull request, e o
  `actions/checkout` passa a exigir `fetch-depth: 0` — um clone raso não
  contém a base do diff.
- `CODEOWNERS` escrito pelo `init` passa a cobrir `docs/ids-retired.txt`.
- `docs/contracts/checks.gen.md` passa a listar oito checks, ordenados por ID.

### Fixed

- `living-docs init` num repositório que sobe de estágio passa a acrescentar ao
  `CODEOWNERS` que já existe as linhas do estágio novo. Antes ele o deixava
  congelado na forma do estágio anterior, e os documentos recém-instalados
  nasciam sem quem os revise — o que `CI-7` agora reprova. Linha que já está lá
  não é reescrita.
