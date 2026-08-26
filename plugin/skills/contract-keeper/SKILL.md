---
name: contract-keeper
description: >
  Use quando a interface pública mudar — endpoint, payload, formato de saída,
  código de saída, nome de campo —, quando aparecer um código de erro novo, ou
  quando alguém perguntar "isso é público?", "posso mudar esse campo?", "esse
  erro significa o quê?", "quem depende disso?", "posso editar esse arquivo
  gerado?", "por que o CI reclamou de contrato?". Também quando for preciso
  depreciar algo publicado, ou decidir o que um consumidor pode ou não assumir
  como estável.
---

# contract-keeper — dono do contrato público

## Overview

O contrato tem duas metades, e elas se escrevem de formas opostas. A metade
**gerada** nunca se escreve: ela sai de uma fonte anotada, e editá-la à mão é
bloqueado por `HK-2`. A metade **escrita** é a política em volta —
versionamento, depreciação, catálogo de erros —, e essa nenhum gerador produz.

Confundir as duas é o erro caro: um contrato editado à mão vive até a próxima
execução do gerador e mente até lá, com a autoridade de um arquivo que parece
oficial.

Os caminhos vêm de `docs/.ownership.yml` (`generated[]` e o dono de
`docs/contracts/`); não assuma.

## Do que você é dono

| Artefato | O que é | Forma |
| --- | --- | --- |
| A *pipeline* que gera o contrato | A fonte anotada + o comando declarado em `generated[].command` | Código, não documento |
| O artefato gerado (`*.gen.*`) | O contrato em si | Gerado; nunca editado à mão (`HK-2`) |
| `docs/contracts/errors.md` | Catálogo de erros: código, significado, quando ocorre, transporte, se é público | Arquivo único, tabela, mutável |
| `docs/contracts/versioning-policy.md` | O que é público, o que nunca muda de significado, como se deprecia | Arquivo único, seções |

As sementes estão em `templates/errors.md` e
`templates/versioning-policy.md`. Não reproduza o conteúdo delas aqui.

## Quando usar / quando não

**Use** a cada mudança de interface pública, a cada código de erro novo, e a
cada mudança da política de versionamento.

**Não use** para documentar comportamento interno: o que não é observável por
um consumidor não é contrato, é implementação — e implementação não vira
documento (spec §13). Regra de negócio é `requirements-keeper`; o "por quê" da
mudança é `decision-recorder`.

**O custo de usar à toa:** um campo declarado público não pode mais mudar sem
depreciação. Cada linha do contrato é um compromisso que alguém vai cobrar —
publicar o que não precisava ser público é dívida que ninguém registrou.

## Procedimento

1. **Descubra se o artefato é gerado.** Consulte `generated[]` no
   `docs/.ownership.yml` e procure o marcador `generated: do not edit` no topo
   do arquivo. Se for gerado, **pare de pensar em editá-lo**.
2. **Para mudar o que é gerado, mude a fonte anotada** e rode o comando
   declarado em `generated[].command`. O comando imprime na saída padrão e não
   escreve arquivo (`ADR-0005`) — redirecione você mesmo para o `path`.
3. **Rode `living-docs drift`** e confirme exit 0. É `CI-5`, e ele é o que
   sobrevive a alguém editando pelo navegador.
4. **Artefato gerado novo entra em `generated[]`** com o comando que o produz.
   Sem a declaração, `HK-2` só o pega pelo marcador e `CI-5` não o vê.
5. **Código de erro novo entra no catálogo** com código, significado (não a
   mensagem exibível), quando ocorre, transporte, se é público e status.
6. **Código publicado nunca muda de significado**: ganha `deprecated` e um
   substituto apontado. Sem substituto não é depreciação — é quebra de
   compatibilidade, e passa pela política de versionamento e por um ADR
   (`decision-recorder`).
7. **Nomeie pelo glossary** (`glossary-keeper`), não pelo hábito de quem
   escreveu o endpoint.
8. **Mudança visível ao consumidor gera entrada no CHANGELOG** — quando a
   Fase 6 (`release-historian`, `CI-6`) existir. Até lá, isso é verificação
   humana, e a política de versionamento diz o que fazer.
9. **Cite o ID afetado na mensagem de commit.**

## Fronteiras

| É seu | Não é seu |
| --- | --- |
| A pipeline que gera o contrato, e a fonte anotada | Editar o arquivo gerado — `HK-2` nega, e ele está certo |
| A política em volta: versionamento, depreciação, estabilidade | O contrato em si, quando ele pode ser gerado |
| O catálogo de erros: código, significado, status | A mensagem exibível, que não é contrato |
| Declarar o que é público | Decidir quebrar compatibilidade (é ADR, e ato humano) |
| Exigir substituto antes de depreciar | Escrever o guia de migração (é `release-historian`, Fase 6) |

## Checklist

- [ ] Nenhum artefato gerado foi editado à mão — verificação: `HK-2` (bloqueia) e `CI-5` (`living-docs drift`)
- [ ] O artefato gerado no commit é a saída atual do gerador — verificação: `CI-5`
- [ ] Todo artefato gerado está declarado em `generated[]`, com o comando que o produz — verificação: humana
- [ ] O gerador imprime na saída padrão e não escreve arquivo — verificação: humana (`ADR-0005`)
- [ ] Todo código de erro novo tem significado, gatilho, transporte e status — verificação: humana
- [ ] Nenhum código publicado mudou de significado; o que mudou ganhou `deprecated` + substituto — verificação: humana
- [ ] A mudança que quebra compatibilidade tem ADR — verificação: humana (`HK-3` intercepta a aceitação)
- [ ] O que virou público estava previsto na política, e não alargou o contrato em silêncio — verificação: humana
