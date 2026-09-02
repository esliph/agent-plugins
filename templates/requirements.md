---
title: {{TITLE}}
owner: "{{OWNER}}"
trigger: >
  Antes de implementar qualquer comportamento desta família, e a toda regra nova
  ou alterada.
last-reviewed: {{TODAY}}
---

# {{TITLE}}

Cada requisito é uma seção com ID citável. O ID nunca é reciclado, e é ele que
torna o raio de impacto calculável por `grep`.

Formato de uma seção:

```
## {{PREFIX}}-nnnn — Título afirmativo da regra

- **status:** draft
- **relates-to:** ADR-nnnn
- **fora de escopo:** o que esta regra deliberadamente não cobre

O enunciado, em uma ou duas frases. O que **deve** ser — nunca o que o código faz.
```

O `nnnn` acima é literal de propósito: o exemplo não pode virar um requisito de
verdade nem uma citação pendurada. Troque-o pelo próximo número livre, conferido
contra `docs/ids-retired.txt`.

<!-- As seções entram abaixo. Skill dona: requirements-keeper. -->
