# Contrato do agente — @esliph/living-docs

Índice e política. **Nenhuma afirmação factual mora aqui**: cada uma vive no
artefato dono e é lida de lá (`RN-0010`).

## Antes de mexer em qualquer coisa

- A spec do toolkit é `docs/superpowers/research/2026-08-24-living-documentation-toolkit.md`. Ela manda.
- O mapa de propriedade é `.ownership.yml`. Nenhum caminho de documento se
  adivinha: lê-se de lá.
- Como se trabalha aqui: `CONTRIBUTING.md`. Quando algo está pronto:
  `docs/definition-of-done.md`.
- Vocabulário do domínio: `docs/glossary.md`. Princípios invioláveis e visão
  de produto: `docs/charter/`.

## Política

- **O toolkit roda no `node` do host.** `npm ci` antes de tudo; depois
  `npm test`, `npm run typecheck` e
  `node --conditions=development packages/living-docs/src/cli/index.ts …`. A regra vigente é `RNF-0002`.
- **A regra vem antes do código.** O que o sistema deve fazer está em
  `docs/requirements/`; se a regra não existe, abra uma `DA` (`/open-decision`)
  e pare. Não invente a regra que falta.
- **Você não aceita decisão.** Skill escreve `draft`/`open`; promover é ato
  humano — `living-docs/state-promotion` pergunta, e a resposta não é sua.
- **Você não corrige item congelado.** ADR aceito ganha `superseded` e um ADR
  novo — `living-docs/append-only` bloqueia o resto.
- **Você não edita artefato gerado.** O que está em `generated[]` (ou traz o
  marcador) muda pela fonte e pelo gerador — `ownership/generated-guard` nega e `ownership/generated-drift` cobra.
- **Documento e código viajam juntos.** Caminho vigiado em `watches` tem doc
  dono; `ownership/watch-reminder` lembra depois da edição e `ownership/commit-guard` pergunta antes do commit.
- **Atalho consciente vira `TDR`** (`/debt`) com gatilho de pagamento
  observável — não vira `TODO` órfão.
- **Mudança visível a quem consome viaja com a entrada de `CHANGELOG.md`** —
  ou com a razão escrita no commit. `ownership/consumer-change-logged` cobra; o formato do rótulo está no
  contrato.
- **Texto para quem lê de fora não carrega ID de artefato.** O que está marcado
  `audience: external` explica em texto corrido; o vínculo fica no artefato ou
  no commit — `living-docs/external-audience` cobra.
- **O que o toolkit entrega não aponta para dentro dele.** Semente, skill e
  mensagem de CLI ou hook ficam sem o ID e sem a seção da spec daqui; o porquê
  vai para o comentário de código — o teste de distribuição cobra.
- **Todo documento tem dono declarado.** `.ownership.yml` diz qual skill
  responde; o CODEOWNERS, quem revisa — `ownership/owner-coverage` cobra os dois.

## Comandos

`/adr`, `/open-decision`, `/debt`, `/docs-setup`, `/term`, `/release`,
`/docs-audit`. As skills `decision-recorder`, `requirements-keeper`,
`working-agreements-keeper`, `glossary-keeper`, `charter-keeper`,
`contract-keeper` e `release-historian` são selecionadas pela `description`; não
é preciso invocá-las pelo nome.

## O que nunca fazer

- Escrever documento que narra o código.
- Criar artefato de documentação fora de `docs/` ou fora do controle de versão.
- Bumpar `last-reviewed` em massa.
- Copiar para cá o conteúdo de qualquer artefato acima.
