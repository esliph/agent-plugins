---
title: Depreciações
owner: '@esliph/engineering'
trigger: >
  Quando algo publicado é anunciado para remoção, e quando uma depreciação
  anunciada é de fato removida.
last-reviewed: 2026-08-26
---

# Depreciações

Uma depreciação registra quatro coisas, sem exceção: a data do anúncio, a
versão ou data de remoção, o substituto, e o link para o guia de migração
(`RN-0015`). Faltando qualquer uma, não é depreciação — é quebra de
compatibilidade, e passa por um ADR.

O que é público, e portanto pode ser depreciado, está em
`docs/contracts/versioning-policy.md`.

| O que | Anunciado em | Removido em | Substituto | Guia de migração | Status |
| ----- | ------------ | ----------- | ---------- | ---------------- | ------ |

Nenhuma depreciação anunciada até aqui. A tabela vazia é informação: nada do
que é público mudou de significado desde a primeira versão.

<!-- Skill dona: release-historian. -->
