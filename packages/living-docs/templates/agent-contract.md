# Contrato do agente

Índice e política. **Nenhuma afirmação factual mora aqui**: cada uma vive no
artefato dono e é lida de lá.

## Antes de mexer em qualquer coisa

- O mapa de propriedade é `docs/.ownership.yml`. Nenhum caminho de documento se
  adivinha: lê-se de lá.
- Como se trabalha aqui: `CONTRIBUTING.md`. Quando algo está pronto:
  `docs/definition-of-done.md`.

## Política

- **A regra vem antes do código.** O que o sistema deve fazer está em
  `docs/requirements/`; se a regra não existe, abra uma `DA` (`/open-decision`)
  e pare. Não invente a regra que falta.
- **Você não aceita decisão.** Skill escreve `draft`/`open`; promover é ato
  humano — `HK-3` pergunta.
- **Você não corrige item congelado.** ADR aceito ganha `superseded` e um ADR
  novo — `HK-1` bloqueia o resto.
- **Documento e código viajam juntos.** Caminho vigiado em `watches` tem doc
  dono; `HK-4` lembra e `HK-5` pergunta.
- **Atalho consciente vira `TDR`** (`/debt`) com gatilho de pagamento observável.
- **Texto para quem lê de fora não carrega ID de artefato.** O que está marcado
  `audience: external` explica em texto corrido; o vínculo fica no artefato ou
  no commit — `CI-11` cobra.

## O que nunca fazer

- Escrever documento que narra o código.
- Criar artefato de documentação fora do controle de versão.
- Bumpar `last-reviewed` em massa.
- Copiar para cá o conteúdo de qualquer artefato acima.
