---
title: Política de versionamento
owner: "{{OWNER}}"
trigger: >
  Mudança de interface pública; decisão de depreciar algo publicado; mudança
  na própria política.
last-reviewed: {{TODAY}}
---

# Política de versionamento

> Semente criada por `living-docs init`. É a política **em volta** do contrato,
> não o contrato: o que é gerado não se escreve aqui. Substitua o que não for
> verdade neste projeto.

## O que é público

Liste aqui, explicitamente, o que os consumidores podem depender: caminhos,
códigos de erro, formatos, IDs estáveis. O que não estiver nesta lista pode
mudar sem aviso — e é isso que impede o alargamento silencioso do contrato.

## O que nunca muda de significado

Um identificador publicado (código de erro, ID de regra, nome de campo) não é
reaproveitado nem redefinido. Corrigir o significado de um código publicado
quebra quem já tratava dele em silêncio.

## Como se deprecia

Depreciação exige quatro coisas: data do anúncio, versão ou data de remoção,
substituto, e o guia de migração. Faltando qualquer uma, não é depreciação.

## Quem decide

Mudança quebra-compatibilidade passa por um ADR — a decisão e o que se aceita
perder ficam registrados, não na cabeça de quem estava na sala.

<!-- Skill dona: contract-keeper. -->
