---
description: Audita a divergência entre código e documentação num escopo — o que o diff deveria ter atualizado e não atualizou.
argument-hint: '[escopo: ref de diff, caminho, ou staged]'
---

Acione o agent `docs-divergence-auditor` com o escopo: $ARGUMENTS

Sem escopo, use o que está no índice (`git diff --cached --name-only`) e diga
isso na primeira linha do relatório.

O agent aponta e para: ele não tem `Edit` nem `Write`. Cada achado nomeia o
artefato dono que deveria mudar — a correção é de quem é dono dele, pela skill
dona que o `.ownership.yml` declara.

Comportamento sem regra escrita não vira código: vira `DA-nnnn`
(`/open-decision`) e a implementação para.
