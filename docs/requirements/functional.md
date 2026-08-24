---
title: Requisitos funcionais
owner: "@dan"
trigger: >
  Antes de implementar qualquer comportamento desta família, e a toda regra nova
  ou alterada.
last-reviewed: 2026-08-24
---

# Requisitos funcionais

Cada requisito é uma seção com ID citável. Formato: `templates/requirements.md`.

## RF-0001 — `validate` falha o build quando há erro, e só então

- **status:** draft
- **fora de escopo:** o formato da saída

`living-docs validate` sai com código 1 se qualquer check produziu achado de
severidade `error`, e 0 caso contrário. Aviso não falha o build — aviso ignorado
é o começo da wiki morta, e por isso quase nada é aviso.

## RF-0002 — `init` é idempotente e adota o que já existe

- **status:** draft
- **fora de escopo:** migrar o conteúdo do artefato adotado para outro formato

Rodar `living-docs init` duas vezes não duplica arquivo, não reescreve conteúdo
existente e não renumera ID. Encontrando artefato equivalente sob outro caminho,
adota-o no `.ownership.yml` em vez de criar um paralelo.

## RF-0003 — `init` instala o conjunto do estágio, e diz o que não instalou

- **status:** draft
- **fora de escopo:** escolher o estágio, que é julgamento humano

`living-docs init --stage <estágio>` instala apenas a moldura que o estágio pede,
e lista explicitamente o que ficou fora.
