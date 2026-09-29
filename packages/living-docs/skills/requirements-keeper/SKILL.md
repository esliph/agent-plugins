---
name: requirements-keeper
description: >
  Use antes de implementar qualquer comportamento, e sempre que alguém
  perguntar "qual é a regra disso?", "o que o sistema deve fazer quando…",
  "isso está especificado?", "esse caso está previsto?", "pode arredondar?",
  "e se o valor for negativo?" — ou quando uma regra de negócio mudar, for
  revogada, ou precisar de um ID para ser citada por teste, commit ou ADR.
  Também quando um requisito existente estiver ambíguo e alguém estiver prestes
  a decidir por conta própria o que ele quis dizer.
---

# requirements-keeper — dono dos requisitos com ID estável

## Overview

Requisitos dizem o que o sistema **deve** ser. Três famílias, um arquivo cada:
`RF` (funcionais), `RNF` (não funcionais) e `RN` (regras de negócio). Cada
requisito é uma seção com ID citável, e é o ID que torna o raio de impacto de
uma mudança calculável por `grep`.

Os caminhos, donos e prefixos vêm de `docs/.ownership.yml` — leia-o primeiro,
nunca assuma caminho.

## Do que você é dono

| Artefato   | O que é                                                                 | Forma                               |
| ---------- | ----------------------------------------------------------------------- | ----------------------------------- |
| `RF-nnnn`  | Comportamento que o sistema deve ter                                    | Seção com ID em `functional.md`     |
| `RNF-nnnn` | Propriedade que o sistema deve exibir (latência, custo, operação)       | Seção com ID em `non-functional.md` |
| `RN-nnnn`  | Regra de negócio — a verdade do domínio, independente de tela e de rota | Seção com ID em `rules.md`          |

Formato da seção: `templates/requirements.md`. Não o reproduza aqui.

## Quando usar / quando não

**Use** antes de implementar comportamento, e a cada regra nova ou alterada.

**Não use** para descrever o que o código já faz. Isso não é requisito, é
narração — e documento que narra o código envelhece a cada commit que muda o
código.

**Nunca** invente a regra que falta. Comportamento sem regra escrita é lacuna:
o caminho é `decision-recorder` (`/open-decision`), que abre uma `DA-nnnn` e
**para** a implementação.

## Procedimento

1. **Leia `docs/.ownership.yml`** e descubra caminho, dono e prefixo de cada
   família. Se não existir, pare e rode `/docs-setup`.
2. **Não olhe o código, e isso é deliberado.** A spec diz o que deve ser;
   justificar a regra pelo que o código faz hoje inverte a relação e apaga o gap.
3. **Classifique**: comportamento observável → `RF`; propriedade de qualidade →
   `RNF`; verdade do domínio → `RN`. Em dúvida entre `RF` e `RN`, pergunte se a
   regra sobreviveria a uma reescrita completa da interface: se sim, é `RN`.
4. **Procure antes de criar.** Um requisito quase igual é sinal de que o certo é
   editar o existente ou revogá-lo, não somar um segundo.
5. **Tome o próximo ID livre** do prefixo, conferindo `docs/ids-retired.txt`.
   Nunca recicle, nunca pule. A seção nova entra no fim do arquivo, depois das
   que já existem.
6. **Nomeie pelo glossary**, quando ele existir. Termo do hábito de quem escreve
   é como duas regras passam a falar de coisas diferentes com a mesma palavra.
7. **Preencha "fora de escopo"** onde houver ambiguidade. É esse campo que
   impede o alargamento silencioso do requisito.
8. **Escreva `status: draft`.** Promover para `active` é ato humano — `living-docs/state-promotion`
   pergunta.
9. **Regra removida é `revoked`, nunca deletada**, com `revoked-by` apontando a
   regra que a substituiu — e a substituta declarando `revokes` de volta.
10. **Peça o teste que cita o ID.** Toda `RN` `active` precisa de ao menos uma
    citação nos caminhos de `cited-by`, ou `living-docs/citation-coverage` falha. Você não escreve o
    teste; você diz qual ID ele precisa citar.
11. **Rode `living-docs validate`** antes de encerrar.
12. **Cite o ID na mensagem de commit.**

## Fronteiras

| É seu                                            | Não é seu                                                        |
| ------------------------------------------------ | ---------------------------------------------------------------- |
| Dizer o que o sistema deve fazer, com ID citável | Dizer como implementar                                           |
| Marcar ambiguidade e delimitar o fora de escopo  | Resolver a ambiguidade por conta própria (→ `decision-recorder`) |
| Revogar regra apontando a substituta             | Deletar regra                                                    |
| Exigir que exista teste citando a regra          | Escrever o teste                                                 |
| Recusar requisito sem ID                         | Promover para `active` — isso é humano                           |

## Checklist

- [ ] A família certa (`RF` / `RNF` / `RN`) para a natureza do item — verificação humana
- [ ] ID sequencial, não reciclado, conferido contra `docs/ids-retired.txt` — `living-docs/id-integrity`
- [ ] `status` é `draft`; a promoção ficou para uma pessoa — `living-docs/state-promotion`
- [ ] Frontmatter do arquivo com `trigger` de evento, não de cadência — `living-docs/frontmatter`
- [ ] `status` de cada seção dentro da máquina de estados — `living-docs/frontmatter`
- [ ] Toda citação a outro ID resolve — `living-docs/id-integrity`
- [ ] Requisito revogado aponta a substituta, e ela aponta de volta — `living-docs/citation-coverage`
- [ ] Toda `RN` `active` é citada por ao menos um teste — `living-docs/citation-coverage`
- [ ] "Fora de escopo" preenchido onde havia ambiguidade — verificação humana
- [ ] Nenhuma regra foi inventada para destravar implementação — verificação humana
