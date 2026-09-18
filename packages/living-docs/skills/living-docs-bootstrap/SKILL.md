---
name: living-docs-bootstrap
description: >
  Use quando alguém disser "não temos documentação nenhuma", "onde eu registro
  isso?", "esse projeto não tem ADR", "quero começar a documentar direito",
  "instala o toolkit de documentação viva aqui", "cadê o .ownership.yml?",
  quando um comando ou hook reclamar que `docs/.ownership.yml` não existe, ou
  quando o projeto mudar de estágio de maturidade (virou time, virou produção,
  virou múltiplos times) e a moldura atual ficar pequena. Também quando existe
  documentação espalhada sob outro nome (`adr/`, `rfc/`, `requisitos.md`, wiki
  exportada) e alguém quer trazê-la para dentro do enforcement sem duplicar.
---

# living-docs-bootstrap — dono da moldura e do enforcement

## Overview

Esta skill monta a **moldura**: o mapa de propriedade, os diretórios, os
templates e a instalação de `HK-*`/`CI-*`. Ela não escreve o conteúdo de nenhum
artefato — quem escreve ADR, DA e TDR é `decision-recorder`.

O trabalho **mecânico** (criar os arquivos, adotar caminho preexistente,
preencher `docs/.ownership.yml` a partir do template) é do CLI:
`living-docs init [--owner @handle] [--dry-run]`. Não reproduza aqui o formato
do `.ownership.yml` nem o conteúdo dos templates — eles moram em
`templates/ownership.yml`, `templates/open-decisions.md`, `templates/CODEOWNERS`
e `templates/ids-retired.txt`, e o `init` é a única coisa que os escreve. O que
é seu é o **julgamento**: o que já existe, qual estágio, o que fica fora.

Rodar duas vezes não pode duplicar arquivo, reescrever conteúdo nem renumerar
ID. Depois da primeira execução, os caminhos vêm do `.ownership.yml` — não de
uma nova varredura.

## Do que você é dono

| Artefato                      | O que é                                                                     | Forma                                                                            |
| ----------------------------- | --------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `docs/.ownership.yml`         | O único arquivo específico do projeto: caminhos, donos, prefixos, `watches` | Arquivo único, mutável                                                           |
| A estrutura de diretórios     | Onde cada artefato mora                                                     | Diretórios + `.gitkeep`                                                          |
| `docs/ids-retired.txt`        | Registro de IDs retirados, que nunca voltam                                 | Arquivo único, append-only                                                       |
| `CODEOWNERS`                  | O dono de cada caminho de doc, espelhando `owner:`                          | Arquivo único                                                                    |
| Instalação de `HK-*` e `CI-*` | O enforcement das fases do estágio                                          | Workflow em `.github/workflows/` + registro do plugin em `.claude/settings.json` |

## Quando usar / quando não

**Use** para: montar a moldura num projeto que não tem; adotar documentação que
já existe sob outro nome; reinstalar quando o estágio de maturidade mudar.

**Não use** para: escrever o conteúdo de um artefato (→ `decision-recorder` e as
demais skills donas); criar artefato de fase que o estágio não pede — instalar
demais é o caminho mais rápido para "vinte documentos de quatrocentas linhas";
"organizar" documentação existente movendo arquivo de lugar sem registrar a
adoção.

**Nunca** use para criar um artefato paralelo a um que já existe. Duplicata é o
anti-padrão mais caro da lista: dois donos para a mesma verdade é divergência
garantida.

## Procedimento

1. **Inventarie antes de criar.** Varra o repositório por artefatos que já
   existem sob outro nome ou caminho (`decisions/`, `adr/`, `rfc/`,
   `requisitos.md`, `spec/`, wiki exportada). Rode `living-docs init --dry-run`
   e leia as linhas `adotado` — se algo que você viu no repositório não aparece
   lá, é você que decide adotá-lo, registrando o caminho real em
   `docs/.ownership.yml`. **Nunca** crie um paralelo.

   Leia também a linha `formato`: quando o repositório escreve IDs de outro
   jeito (sem separador, ou com outra quantidade de zeros), o inventário diz
   qual forma achou e quantas ocorrências leu nela. **Confirme com quem é dono
   do repositório** e declare com `--id-separator` e `--id-padding` — nunca
   renumere o que já existe para caber no padrão do toolkit.

2. **Determine o estágio** — `solo` (protótipo), `small-team` (time pequeno),
   `production` (produção com usuários) ou `multi-team` (múltiplos times) — e
   derive o conjunto **mínimo** de fases. Os quatro nomes são os que
   `living-docs init --stage` aceita. Não instale o que o estágio não pede, e
   diga em voz alta qual estágio você concluiu e por quê.
3. **Rode `living-docs init --owner <@handle>`** para escrever a moldura. Ele
   cria só o que falta e mantém o que existe. Depois **revise à mão** o
   `docs/.ownership.yml` gerado: os donos precisam ser os donos reais, e os
   `watches` (código → doc dono) precisam refletir a estrutura real do código —
   o template não sabe nada disso.
   - **`documents:`** declara o que tem dono e não tem família de IDs
     (`CONTRIBUTING.md`, a Definition of Done, o contrato do agente, o glossary, o
     charter, o CHANGELOG, e o que mais o projeto tiver). `artifacts:` continua
     exigindo `id-prefix`; `CI-1`, `CI-2` e `HK-1` não leem `documents:`, e `CI-4` e
     `CI-7` leem.
4. **Instale na ordem das fases.** Frontmatter + `CI-1` primeiro: sem contrato
   de máquina nada mais é enforceável. Só depois `CI-2`, os hooks e as skills
   donas.
5. **Registre o índice no contrato do agente** (`AGENTS.md`/`CLAUDE.md`, via
   `working-agreements-keeper`): qual artefato responde a quê e qual skill é dona.
   Apenas o índice — nada de conteúdo copiado.
6. **Confirme a idempotência**: rode `living-docs init` uma segunda vez e
   confira que nada foi criado, nada foi reescrito e nenhum caminho foi
   readotado.
7. **Rode `living-docs validate`** e não entregue com finding aberto.
8. **Entregue em um PR só**, com a matriz de gatilhos preenchida (cada artefato
   instalado, seu `trigger` e sua skill dona) e a **lista explícita do que ficou
   fora e por quê** — o que ficou fora sem justificativa volta como surpresa.
9. **Cite na mensagem de commit** os IDs das peças instaladas (`CI-1`, `HK-1`, …).

## Fronteiras

| É seu                                                 | Não é seu                                             |
| ----------------------------------------------------- | ----------------------------------------------------- |
| Decidir o estágio e o conjunto mínimo de fases        | Escrever o conteúdo de um artefato                    |
| Adotar o que já existe, registrando o caminho real    | Mover ou renomear documentação existente por estética |
| Preencher donos e `watches` reais no `.ownership.yml` | Reproduzir o formato do `.ownership.yml` nesta skill  |
| Instalar `HK-*`/`CI-*` na ordem das fases             | Instalar fase que o estágio não pede                  |
| Apontar `living-docs init` para o trabalho mecânico   | Reimplementar o `init` em prosa                       |
| Listar o que ficou fora e por quê                     | Decidir que o que ficou fora nunca entra              |

## Checklist

- [ ] O repositório foi inventariado e nenhum artefato preexistente foi duplicado ou sobrescrito — verificação humana
- [ ] Todo caminho adotado está declarado em `docs/.ownership.yml`, e nenhum artefato tem dois donos — `CI-1`
- [ ] Todo artefato coletado tem frontmatter completo — `CI-1`
- [ ] Os donos declarados espelham o `CODEOWNERS` — verificação humana
- [ ] Todo `trigger` nomeia um evento observável, nunca uma cadência — `CI-1`
- [ ] `docs/ids-retired.txt` existe e nenhum ID foi reciclado ou renumerado — `CI-2`
- [ ] A forma escrita dos IDs foi confirmada com quem é dono do repositório, e nenhum ID preexistente foi reescrito — verificação humana
- [ ] Os hooks instalados são os das fases do estágio, e falham abertos — `HK-1`, `HK-3`
- [ ] `living-docs init` rodado duas vezes não criou, reescreveu nem readotou nada — verificação humana
- [ ] `living-docs validate` passa sem finding — `CI-1`, `CI-2`
- [ ] O PR traz a matriz de gatilhos e a lista do que ficou fora e por quê — verificação humana
