---
title: Glossary
owner: "@dan"
trigger: >
  Termo de domínio novo em código, spec ou conversa; termo com dois
  significados; renomeação de conceito.
last-reviewed: 2026-08-27
---

# Glossary

Vocabulário do próprio toolkit — o domínio dele é documentação viva, e as
palavras abaixo são a verdade única para esse domínio dentro deste
repositório.

| Termo | Definição | Nome no código | Não confundir com | Fonte | Status |
| --- | --- | --- | --- | --- | --- |
| Artefato | Documento de documentação viva com dono, gatilho, frontmatter padrão e ciclo de vida | `ArtifactRule`, `ArtifactDoc` | "Documento" — que tem dono e **não** tem família de IDs nem ciclo de vida (`ADR-0008`) | RN-0001 | active |
| Dono | Pessoa ou time que responde por um artefato, declarado em `owner:` e espelhado no CODEOWNERS | `owner` | "Autor" — quem escreveu o texto, não necessariamente quem responde por ele depois | RN-0001 | active |
| Caminho vigiado | Glob em `watches` cuja mudança exige o doc dono no mesmo commit | `WatchRule.code` | "Arquivo monitorado" por ferramenta de observabilidade externa — não é isso | RN-0008 | active |
| Gatilho | Evento observável que exige atualizar um artefato; nunca uma data de calendário | `trigger` | "Prazo de revisão" — cadência é o anti-requisito que `CI-1` reprova | RN-0002 | active |
| Item congelado | Item em estado terminal cujo corpo não aceita mais edição, salvo os campos da allowlist | `FROZEN_STATUSES`, `mutableFields` | "Arquivado" — sugere que não vale mais; item congelado continua sendo a verdade vigente | RN-0006 | active |
| Lacuna | Comportamento sem regra escrita; vira `DA-nnnn` e para a implementação até decidir | `DA-nnnn` | "Bug" — lacuna é ausência de regra, não erro de código rodando | decision-recorder (SK-3) | active |
| Termo | Entrada do glossary, identificada pelo nome — um significado só, nunca um ID numerado | linha da tabela em `docs/glossary.md` | "Requisito" (`RN`/`RF`/`RNF`) — o termo nomeia um conceito, o requisito afirma uma regra sobre ele | ADR-0004, RN-0011 | active |
| Documento | Arquivo com dono declarado e sem família de IDs, declarado em `documents:` | `DocumentRule`, `DocumentDoc` | "Artefato" — que tem ID, estado e congelamento; e "arquivo qualquer", que não tem dono nenhum | ADR-0008, RN-0016 | active |
| Gatilho de pagamento | Condição observável no repositório que torna uma dívida devida, declarada em `pay-when` | `PayWhen`, `duePayments` | "Prazo" — dívida não vence no calendário, vence quando a condição aparece | ADR-0007, RN-0019 | active |
