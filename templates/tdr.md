---
id: {{ID}}
title: {{TITLE}}
status: open
owner: "{{OWNER}}"
trigger: >
  Quando o gatilho de pagamento abaixo se cumprir.
last-reviewed: {{TODAY}}
relates-to: []
# Gatilho de pagamento em forma de máquina (RN-0019, ADR-0007). Descomente e
# preencha: `pattern` é regex (aspas simples, para o `\` não ser escape do YAML)
# e `paths` diz onde procurá-lo. CI-4 reprova enquanto ele não existir, e é essa
# reprovação que força a conversa sobre qual é o gatilho de verdade.
#
# pay-when:
#   pattern: '^- \*\*status:\*\* revoked'
#   paths: ["docs/requirements/**"]
---

# {{ID}} — {{TITLE}}

## O atalho

<!-- O que foi feito, deliberadamente, abaixo do padrão. -->

## Por que foi aceito

## Gatilho de pagamento

<!-- Precisa ser observável: "quando o volume passar de X", "no primeiro PR
     que tocar este módulo". "Quando der tempo" não é gatilho. -->

## Custo de continuar devendo
