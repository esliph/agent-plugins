---
name: release-historian
description: >
  Use quando algo mudar para quem consome este software — endpoint, opção de
  linha de comando, formato de saída, comportamento observável —, quando for
  hora de publicar uma versão, quando alguém perguntar "o que mudou na versão
  X?", "isso quebra quem já usa?", "quando isso vai ser removido?", "por onde
  eu migro?", "isso precisa de entrada no CHANGELOG?", ou quando o CI reclamar
  que falta a entrada. Também ao anunciar ou concluir uma depreciação, e ao
  escrever o guia de migração de uma mudança quebra-compatibilidade.
---

# release-historian — dono do rastro histórico

## Overview

Quatro artefatos, um público só: quem está do lado de fora. O `CHANGELOG.md`
diz o que mudou, a release note dá a moldura de uma versão, `docs/deprecations.md`
avisa o que vai sair, e `docs/migrations/` ensina a atravessar.

O erro caro aqui tem nome: derivar o CHANGELOG do `git log`. O resultado é o
documento que narra o código — exatamente o que a spec §13 recusa — e ele
apodrece rápido, porque ninguém de fora consegue usá-lo para decidir se
atualiza.

Os caminhos vêm de `docs/.ownership.yml`; não assuma. `consumer-visible-paths`
diz o que é visível ao consumidor neste projeto, e a regra de `watches` marcada
`consumer-visible: true` diz onde a entrada mora.

## Do que você é dono

| Artefato | O que é | Forma |
| --- | --- | --- |
| `CHANGELOG.md` | O que mudou, para quem consome | Arquivo único, Keep a Changelog, `Unreleased` no topo |
| `docs/releases/` | A moldura de cada versão publicada | Um arquivo por versão, `REL-nnnn`, congelado depois de publicado |
| `docs/deprecations.md` | O que foi anunciado para remoção | Arquivo único, tabela, mutável |
| `docs/migrations/` | Como atravessar cada quebra | Um arquivo por migração |

As sementes estão em `templates/changelog.md`, `templates/release-note.md`,
`templates/deprecations.md` e `templates/migration.md`. Não reproduza o
conteúdo delas aqui.

## Quando usar / quando não

**Use** quando o diff toca `consumer-visible-paths`; quando uma versão vai ser
publicada; quando algo publicado é anunciado para remoção; quando uma mudança
quebra compatibilidade.

**Não use** para registrar mudança interna. Refatoração, renomeação de arquivo,
teste novo e ajuste de mensagem não têm entrada — o caminho ali é o rótulo
`Changelog: none — <razão>`, e a razão é obrigatória.

**O custo de usar à toa** é a entrada que ninguém consegue ler: um CHANGELOG
com trinta linhas de detalhe interno esconde a única linha que importava, e o
consumidor para de ler. `CI-6` cobra a existência da entrada; que ela seja
legível é humano.

## Procedimento

1. **Descubra o que é visível ao consumidor neste projeto.** Leia
   `consumer-visible-paths` no `docs/.ownership.yml`. Se estiver vazio, o
   projeto ainda não declarou a fronteira: essa é a primeira conversa, e ela é
   humana.
2. **Escreva a entrada no PR que causa a mudança**, sob `## [Unreleased]`, na
   subseção certa (`Added`, `Changed`, `Deprecated`, `Removed`, `Fixed`,
   `Security`). Uma frase, do ponto de vista de quem usa.
3. **Aplique o teste único:** se a entrada só faz sentido para quem escreveu o
   código, apague-a e use `Changelog: none — <razão>` na mensagem de commit.
4. **Depreciação exige quatro coisas** — data do anúncio, versão ou data de
   remoção, substituto, link para o guia de migração. Faltando qualquer uma,
   **pare** e traga a lacuna: não registre depreciação pela metade.
5. **Guia de migração por mudança quebra-compatibilidade**, em
   `docs/migrations/`, apontando o ADR que a decidiu. Quebra sem ADR é decisão
   sem porquê — o caminho é `/adr` antes.
6. **Release note é derivada do CHANGELOG**, não escrita de novo: mova as
   entradas de `Unreleased` para a seção da versão, e escreva só a moldura.
7. **Nasce `draft`.** Publicar é ato humano — `HK-3` intercepta, e a resposta
   não é sua. Depois de `published`, `HK-1` congela o arquivo.

## Fronteiras

| É seu | Não é seu |
| --- | --- |
| A entrada de CHANGELOG e a subseção dela | Decidir o que é público (é `contract-keeper`) |
| A release note e o congelamento dela | Promover para `published` (é humano) |
| A tabela de depreciações | A política de versionamento (é `contract-keeper`) |
| O guia de migração | O ADR que decidiu a quebra (é `decision-recorder`) |
| Recusar depreciação incompleta | Bloquear a mudança que não tem entrada (`CI-6` falha, você não nega) |
| Apontar `Changelog: none` como saída | Escrever a razão no lugar de quem decidiu |

## Checklist

- [ ] A entrada nasceu no PR que causou a mudança, não depois — verificação: `CI-6`.
- [ ] O doc marcado `consumer-visible: true` viajou no mesmo diff — verificação: `CI-6` (e `HK-5` pergunta antes).
- [ ] A entrada é legível por quem consome, e não narra o código — verificação: humana.
- [ ] Quando não há entrada, existe `Changelog: none — <razão>` com razão escrita — verificação: `CI-6`.
- [ ] Toda depreciação registrada tem as quatro coisas — verificação: humana (`RN-0015`).
- [ ] Toda quebra de compatibilidade tem guia de migração apontando o ADR — verificação: humana.
- [ ] A release note nasceu `draft` e foi promovida por uma pessoa — verificação: `HK-3`.
- [ ] Nenhuma release note publicada foi editada no corpo — verificação: `HK-1`.
- [ ] Nenhum atalho novo ficou sem `TDR-nnnn` — verificação: `HK-7` lembra; registrar é humano.
