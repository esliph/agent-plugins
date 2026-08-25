# Contrato do agente — living-docs-toolkit

Índice e política. **Nenhuma afirmação factual mora aqui**: cada uma vive no
artefato dono e é lida de lá (`RN-0010`).

## Antes de mexer em qualquer coisa

- A spec do toolkit é `LIVING-DOCUMENTATION-TOOLKIT.md`. Ela manda.
- O mapa de propriedade é `docs/.ownership.yml`. Nenhum caminho de documento se
  adivinha: lê-se de lá.
- Como se trabalha aqui: `CONTRIBUTING.md`. Quando algo está pronto:
  `docs/definition-of-done.md`.
- Vocabulário do domínio: `docs/glossary.md`. Princípios invioláveis e visão
  de produto: `docs/charter/`.

## Política

- **Nada roda no host além de Docker.** Todo comando vai por
  `docker compose exec toolkit …` ou `./bin/living-docs`.
- **A regra vem antes do código.** O que o sistema deve fazer está em
  `docs/requirements/`; se a regra não existe, abra uma `DA` (`/open-decision`)
  e pare. Não invente a regra que falta.
- **Você não aceita decisão.** Skill escreve `draft`/`open`; promover é ato
  humano — `HK-3` pergunta, e a resposta não é sua.
- **Você não corrige item congelado.** ADR aceito ganha `superseded` e um ADR
  novo — `HK-1` bloqueia o resto.
- **Documento e código viajam juntos.** Caminho vigiado em `watches` tem doc
  dono; `HK-4` lembra depois da edição e `HK-5` pergunta antes do commit.
- **Atalho consciente vira `TDR`** (`/debt`) com gatilho de pagamento
  observável — não vira `TODO` órfão.

## Comandos

`/adr`, `/open-decision`, `/debt`, `/docs-setup`, `/term`. As skills
`decision-recorder`, `requirements-keeper`, `working-agreements-keeper`,
`glossary-keeper` e `charter-keeper` são selecionadas pela `description`; não
é preciso invocá-las pelo nome.

## O que nunca fazer

- Escrever documento que narra o código.
- Criar artefato de documentação fora de `docs/` ou fora do controle de versão.
- Bumpar `last-reviewed` em massa.
- Copiar para cá o conteúdo de qualquer artefato acima.
