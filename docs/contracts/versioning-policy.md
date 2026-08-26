---
title: Política de versionamento
owner: "@dan"
trigger: >
  Mudança na interface pública do CLI, dos checks ou do `.ownership.yml`;
  decisão de depreciar algo publicado; mudança na própria política.
last-reviewed: 2026-08-25
---

# Política de versionamento

A política em volta do contrato. O contrato em si — a tabela dos checks — é
gerado (`docs/contracts/checks.gen.md`) e não se escreve à mão.

## O que é público

- Os IDs dos checks (`CI-n`), dos hooks (`HK-n`), das skills (`SK-n`) e dos
  comandos (`CM-n`), e o que cada um significa.
- Os subcomandos do CLI (`validate`, `drift`, `init`), suas opções, e os
  códigos de saída de `docs/contracts/errors.md`.
- O esquema de `docs/.ownership.yml` com `version: 1`: os nomes das chaves e o
  que cada uma exige.
- O contrato do gerador: `generated[].command` imprime na saída padrão e não
  escreve arquivo (`ADR-0005`).

O que não está nesta lista pode mudar sem aviso — a estrutura de `src/`, o
texto das mensagens, o formato exato da saída de `validate`.

## O que nunca muda de significado

Um identificador publicado não é reaproveitado nem redefinido. `CI-4` nunca
passa a medir outra coisa; `EXIT-2` nunca vira "falhou a validação". Quando o
significado precisa mudar, o identificador antigo ganha `deprecated` e um
substituto nasce ao lado — é a mesma regra que `docs/ids-retired.txt` impõe aos
artefatos, aplicada à interface.

## Como se deprecia

Quatro coisas, sem exceção: data do anúncio, versão ou data de remoção,
substituto, e o link para o guia de migração. Faltando qualquer uma, não é
depreciação — é quebra de compatibilidade, e passa por um ADR.

Enquanto a Fase 6 não existir, este repositório não tem `CHANGELOG.md` nem
`docs/migrations/`: uma depreciação de verdade aqui **bloqueia** até que a
Fase 6 entre, e isso é deliberado — anunciar remoção sem lugar para o guia de
migração é a depreciação que ninguém consegue seguir.

## Quem decide

Mudança quebra-compatibilidade passa por um ADR, com as alternativas e o que se
aceita perder. Aceitar é ato humano (`RN-0005`).

<!-- Skill dona: contract-keeper. -->
