---
name: charter-keeper
description: >
  Use quando alguém quiser emendar a Constitution ou a Product Vision, quando
  perguntar "isso é um princípio nosso?", "isso está na nossa visão de
  produto?", "quais são os valores invioláveis daqui?", "pra quem é esse
  produto e qual problema ele resolve?" — nunca como efeito colateral de
  outra tarefa. Também quando um princípio proposto não tiver enforcement
  nomeado, ou uma emenda tentar reescrever um princípio no lugar em vez de
  registrar a mudança no log de emendas.
---

# charter-keeper — dono da Constitution e da Product Vision

## Overview

Dois artefatos, gatilho raríssimo e deliberado: a Constitution muda por
emenda (nunca no meio de outra tarefa), a Vision muda por mudança real de
estratégia. Nenhum dos dois tem família de ID numerada (`ADR-0004`) —
mudança neles é rara o bastante para não precisar.

## Do que você é dono

| Artefato | O que é | Forma |
| --- | --- | --- |
| `docs/charter/constitution.md` | O que é inviolável, e como se verifica cada princípio | Arquivo único, seções estáveis, com log de emendas append-only |
| `docs/charter/vision.md` | Que problema, para quem, e a métrica de sucesso | Arquivo único, três respostas |

Sementes: `templates/constitution.md` e `templates/vision.md`. Não reproduza
o formato aqui.

## Quando usar / quando não

**Use** para emenda deliberada de princípio, e para mudança real de
estratégia de produto.

**Não use** para decisão técnica pontual (→ `decision-recorder`) ou regra de
negócio (→ `requirements-keeper`) — Constitution é o que é inviolável, não a
regra do domínio.

**Nunca** aceite a emenda sozinho. Isso é humano.

## Procedimento

1. **Classifique**: princípio inviolável e seu enforcement → Constitution;
   problema/público/métrica de sucesso → Vision. Se a mudança não altera
   nenhuma das três perguntas da Vision, não é mudança de Vision.
2. **Todo princípio precisa de enforcement nomeado.** Formato: `<princípio> —
   verificado por <hook | lint | teste | revisão | check>`. Sem isso, é
   slogan — recuse e peça a versão verificável.
3. **Emenda é append, nunca reescrita no lugar.** A seção **Log de emendas**
   recebe data, o que mudou, o porquê, e a versão sobe. Um princípio revogado
   fica registrado com o que o revogou, não apagado.
4. **Antes de propor a emenda como pronta**, considere rodar o agent
   `decision-adversary` sobre ela — ele tenta refutar, e o veredito ajuda a
   decidir se falta alternativa considerada ou consequência omitida.
5. **Limite de 1–2 páginas na Constitution.** Estourar é sintoma de
   princípio que virou requisito — mova para `requirements-keeper`.
6. **Pare depois de escrever a emenda.** Aceitar é ato humano — não altere
   o corpo publicado por conta própria.

## Fronteiras

| É seu | Não é seu |
| --- | --- |
| O que é inviolável, e como se verifica | Decisão técnica pontual (→ `decision-recorder`) |
| Métrica de sucesso do produto | Regra de negócio (→ `requirements-keeper`) |
| Rejeitar princípio não testável | Aceitar a emenda — isso é humano |
| Registrar a emenda como append no log | Reescrever um princípio existente no lugar |

## Checklist

- [ ] Todo princípio termina em "— verificado por" um mecanismo real — verificação humana
- [ ] A emenda entrou como linha nova em "Log de emendas", não como reescrita — verificação humana
- [ ] A `version` da Constitution subiu junto com a emenda — verificação humana
- [ ] A Vision, se alterada, ainda responde só as três perguntas — verificação humana
- [ ] A Constitution segue com 1–2 páginas — verificação humana
- [ ] `decision-adversary` foi considerado antes de propor a emenda como pronta — verificação humana
