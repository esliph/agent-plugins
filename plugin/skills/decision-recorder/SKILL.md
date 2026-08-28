---
name: decision-recorder
description: >
  Use quando alguém perguntar "por que isso foi feito assim?", quando você for
  tomar uma decisão custosa de reverter (escolher biblioteca, formato de dado,
  fronteira de módulo, protocolo), quando trombar numa lacuna — comportamento
  sem regra escrita, "não sei o que fazer nesse caso", "isso está documentado?",
  "qual é a regra de X?" — ou quando aceitar de propósito um atalho, gambiarra,
  TODO ou dívida técnica que alguém vai pagar depois. Também para supersedir uma
  decisão antiga que se revelou errada.
---

# decision-recorder — dono de ADR, Open Decisions e Debt Register

## Overview

Três artefatos, uma máquina de estados única:

```
lacuna encontrada ──> DA-nnn (open)
                        │
                        └─ decidido ──> ADR-nnn (draft ──ato humano──> accepted)
                                          │
                                          └─ aceita perda deliberada ──> TDR-nnn
```

Esta skill decide **onde um pedaço de conhecimento mora** e **qual ID ele
recebe**. Ela não decide o mérito: levanta as alternativas e o trade-off,
escreve `draft`/`open`, e para.

Os caminhos, donos e prefixos vêm de `docs/.ownership.yml` — leia-o primeiro,
nunca assuma caminho.

## Do que você é dono

| Artefato | O que é | Forma |
| --- | --- | --- |
| ADR | Por que isto e não aquilo, e o que se aceita perder | Um arquivo por decisão, numerado, append-only |
| Open Decisions (DA) | O que ainda **não** foi decidido | Arquivo único, tabela, mutável |
| TDR | Dívida assumida de propósito, com gatilho de pagamento | Um arquivo por dívida |

Templates: `templates/adr.md` e `templates/tdr.md`. Não reescreva o formato aqui.

## Quando usar / quando não

**Use** para: decisão custosa de reverter; lacuna que bloqueia implementação;
atalho deliberado.

**Não use** para: decisão trivial e barata de reverter (o custo de um ADR é
real — ele entra na leitura de todo mundo para sempre); registrar o que o código
já diz; narrar uma implementação. Um ADR por escolha de nome de variável é
exatamente o "vinte documentos de quatrocentas linhas" que mata a documentação.

**Nunca** use para tomar a decisão. Isso não é seu.

## Procedimento

1. **Leia `docs/.ownership.yml`** e descubra o caminho, o dono e o prefixo de
   cada artefato. Se o arquivo não existir, pare e rode `/docs-setup`.
2. **Classifique** o que está na sua frente:
   - já se sabe o que fazer e é caro reverter → **ADR**;
   - não se sabe → **DA** e **pare a implementação**;
   - sabe-se, escolheu-se o pior de propósito → **TDR**.
3. **Procure antes de criar.** Um `grep` pelo tema nos artefatos existentes. Se
   já existe ADR sobre isso, o caminho é supersedir, não escrever um segundo.
4. **Tome o próximo ID livre** do prefixo, conferindo também `docs/ids-retired.txt`.
   Nunca recicle. Nunca pule.
5. **Escreva a partir do template.** No ADR, exija de si mesmo as **alternativas
   consideradas** com o motivo real do descarte, e a seção **o que se aceita
   perder** — ADR sem consequência negativa declarada é propaganda.
6. **No TDR, exija um gatilho de pagamento observável.** "Quando o volume passar
   de 10k eventos/dia" ou "no primeiro PR que tocar este módulo" passam. "Quando
   der tempo" não é gatilho: recuse e peça a condição.
   - **Toda dívida nasce com o gatilho de pagamento nas duas formas:** a prosa, em
     `## Gatilho de pagamento`, que explica o porquê; e `pay-when` no frontmatter,
     com `pattern` (regex em aspas simples) e `paths` (onde procurá-lo), que é o
     que `CI-4` avalia. Se você não consegue escrever a segunda, o gatilho não é
     observável — e aí a dívida não está pronta para ser registrada. Não invente um
     padrão que casa nada só para o check passar: isso é a caixinha marcada.
7. **Feche os dois lados da referência.** DA resolvida aponta o ADR que a fechou;
   o ADR aponta de volta em `relates-to`. Superseder preenche `supersedes` no
   novo e `superseded-by` no antigo.
8. **Antes de pedir aceitação de um ADR ou TDR importante**, considere rodar
   o agent `decision-adversary` sobre a proposta — ele tenta refutar com um
   checklist fixo, e o veredito ajuda a decidir se falta alternativa
   considerada ou consequência omitida antes de gastar o tempo de quem aceita.
9. **Pare em `draft`/`open`.** Diga qual decisão falta e a quem ela cabe. Se
   você tentar promover, `HK-3` vai perguntar — e a resposta não é sua.
10. **Rode `living-docs validate`** antes de encerrar.
11. **Cite o ID na mensagem de commit.**

## Fronteiras

| É seu | Não é seu |
| --- | --- |
| Registrar por que isto e não aquilo, e o que se perde | Tomar a decisão |
| Transformar lacuna em item bloqueante com ID | Implementar a regra que falta |
| Registrar a dívida com gatilho de pagamento | Pagar a dívida |
| Propor supersedir um ADR errado | Editar um ADR aceito |
| Apontar o formato do template | Duplicar o conteúdo do artefato aqui |

## Checklist

- [ ] O artefato certo para a natureza do item (ADR / DA / TDR) — verificação humana
- [ ] Frontmatter completo, com `trigger` nomeando um evento e não uma cadência — `CI-1`
- [ ] ID sequencial, não reciclado, conferido contra `docs/ids-retired.txt` — `CI-2`
- [ ] Toda citação a outro ID resolve — `CI-2`
- [ ] `status` é `draft` ou `open`; promoção deixada para uma pessoa — `HK-3`
- [ ] Nenhum ADR aceito foi editado; o caminho usado foi supersedir — `HK-1`
- [ ] ADR declara alternativas consideradas e o que se aceita perder — verificação humana
- [ ] TDR tem gatilho de pagamento observável, não uma data vaga — verificação humana
- [ ] A implementação **não** avançou enquanto havia DA aberta sobre ela — verificação humana
- [ ] Para decisão de peso, `decision-adversary` foi considerado antes de pedir aceitação — verificação humana
- [ ] Toda dívida `open` declara `pay-when` verificável — verificação: `CI-4`.
