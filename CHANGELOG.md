# Changelog

Este arquivo é voltado a quem **consome** o `living-docs`. Teste único: se a
entrada só faz sentido para quem escreveu o código, ela não pertence aqui.
Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

A entrada nasce no PR que causa a mudança, não na véspera da release.

## [Unreleased]

### Added

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

### Changed

- `living-docs validate` passa a apontar `living-docs changelog` quando o
  repositório declara `consumer-visible-paths` — ponteiro, não achado: o código
  de saída não muda.
- A lista de "não instalado" de `--stage production` fica vazia: o estágio
  passa a cobrir as Fases 5 e 6 da spec por completo.
