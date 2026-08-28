---
id: ADR-0007
title: A fonte de data do toolkit, e como um gatilho de pagamento se torna verificável
status: accepted
owner: "@dan"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-27
relates-to: [TDR-0001, RNF-0001]
supersedes: null
superseded-by: null
---

# ADR-0007 — A fonte de data do toolkit, e como um gatilho de pagamento se torna verificável

## Contexto

A Fase 7 entrega `CI-4`: "`last-reviewed` além de `stale-after-months` (aviso);
TDR com gatilho de pagamento vencido (falha)" (spec §9). As duas metades pedem
uma coisa que o toolkit não tem.

A primeira pede **hoje**. Nenhum check até aqui precisou saber a data: `CI-1` a
valida como formato, e nada mais. Um check que lê o relógio dentro de si é um
check cujo teste passa hoje e falha em seis meses, e cuja falha não diz nada
sobre o código.

A segunda pede um **gatilho de pagamento avaliável por máquina**. A spec §5
(`SK-3`, regra 5) já exige que ele seja observável — "quando o volume passar de
X", "no primeiro PR que tocar este módulo" —, mas exige isso de quem escreve, em
prosa. Prosa não se avalia. Hoje `TDR-0001` diz "no primeiro PR que revogar um
requisito", e nenhuma ferramenta consegue decidir se isso aconteceu. Sem uma
forma verificável, o critério de aceite 7 da spec §12 não fecha: não há como
"falhar até que a dívida seja paga".

## Alternativas consideradas

**Para a data:**

1. **`new Date()` dentro do check.** Descartada. O teste teria duas saídas: ou
   congela o relógio do processo — e `node --test` não tem esse recurso sem
   dependência nova, que `ADR-0001` não quer —, ou passa hoje e quebra no futuro,
   que é o mesmo que não testar.
2. **Uma data de referência no `.ownership.yml`.** Descartada. É a cadência de
   calendário dentro do arquivo de configuração: alguém a bumparia para calar o
   check, que é o anti-requisito da spec §13 mudado de lugar.
3. **`CheckContext.today`, preenchido por quem chama.** Escolhida.

**Para o gatilho:**

1. **Só prosa, como hoje.** Descartada: não é verificável, e o critério 7 pede
   falha, não leitura atenta.
2. **Data de vencimento (`due: 2027-01-01`).** Descartada por dois motivos. É a
   cadência de calendário que a spec §13 recusa; e é falsa: dívida não vence no
   calendário, vence quando a condição que a tornava aceitável deixa de valer.
3. **Glob de caminhos avaliado no diff (`pay-when-paths`).** Descartada como
   forma única. O gatilho de `TDR-0001` é um **estado** ("existe requisito
   revogado"), não um caminho tocado; um gatilho que só sabe olhar o diff
   esquece a condição no PR seguinte, e a dívida volta a ficar invisível.
4. **Padrão + caminhos, avaliado no estado da árvore.** Escolhida: cobre o
   estado, e cobre o "PR que tocar este módulo" pelo lado que sobrevive ao
   merge — o que ficou escrito na árvore.

## Decisão

**A data entra por valor, e o gatilho de pagamento tem uma forma de máquina
além da prosa.**

1. `src/core/dates.ts` é a única fonte de data do toolkit: `todayIso()`,
   `asIsoDate()` e `monthsBetween()`. Quem chama o relógio é o CLI e o hook, uma
   vez, na borda.
2. `CheckContext.today` carrega hoje em ISO (`YYYY-MM-DD`). Nenhum check lê o
   relógio.
3. Uma dívida declara, no frontmatter:

   ```yaml
   pay-when:
     pattern: '^- \*\*status:\*\* revoked'
     paths: ["docs/requirements/**"]
   ```

   `pattern` é uma expressão regular reconhecida **linha a linha** nos arquivos
   que casam `paths`, e vai entre **aspas simples**: em YAML, aspas simples não
   processam `\`, e um padrão com aspas duplas exigiria escapar cada barra duas
   vezes — que é como se escreve o padrão errado sem perceber. O próprio arquivo
   da dívida é excluído da varredura: um TDR que cita o próprio gatilho não é
   ocorrência dele.
4. **Família de dívida é a que declara `paid` na máquina de estados** (spec §4),
   não o prefixo `TDR`. Um projeto que chame sua família de outra coisa continua
   coberto, porque quem responde é `states`, não o nome.
5. Uma dívida `open` sem `pay-when` verificável — ausente, incompleto, ou com
   padrão que não compila — é **erro** de `CI-4`. Gatilho não verificável é
   `TODO` órfão com número.
6. `last-reviewed` além de `stale-after-months` é **aviso**, nunca erro: a
   correção é ler o documento, e build vermelho empurra para o bump em massa que
   a spec §13 recusa.
7. **Item em estado congelado não vence.** Não há o que revisar num item cujo
   corpo não se edita, e avisar sobre ele só ensinaria a bumpar `last-reviewed`
   de ADR aceito — exatamente o anti-requisito.

## Consequências

### O que se ganha

`CI-4` testável de forma determinística; o critério de aceite 7 fecha; `HK-6`
ganha as mesmas duas funções sem duplicar lógica; e o gatilho de pagamento
deixa de ser uma promessa de quem escreveu para virar uma condição que alguém
consegue ver acontecendo.

### O que se aceita perder

O gatilho passa a ter **duas formas** — a prosa, para gente, e o padrão, para
máquina — e elas podem divergir. Nenhum check verifica que o padrão é o mesmo
gatilho que a prosa descreve; quem mantém as duas coerentes é a
`decision-recorder`, e isso é verificação humana.

Um TDR legado sem `pay-when` reprova no primeiro `validate` depois desta fase.
É ruptura consciente: a alternativa era aceitar dívida sem gatilho verificável,
e aí o mecanismo não existiria.

`monthsBetween` conta meses de calendário, não dias: um documento revisto em 31
de janeiro "faz um mês" em 28 de fevereiro. Precisão de dia não muda nenhuma
decisão que este aviso provoca.
