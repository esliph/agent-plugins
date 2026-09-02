# Fase 7 do toolkit de documentação viva — manutenção contínua

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar `CI-4` (staleness), `CI-7` (ownership coverage), `CI-8`
(links), `HK-6` (inventário no `SessionStart`), `AG-1` docs-divergence-auditor e
`CM-5` (`/docs-audit`) — a Fase 7 da spec (§10), que fecha os critérios de
aceite 7 e 8 da spec §12, fecha a **segunda metade** do critério 5, e resolve
`DA-0002`.

**Architecture:** Três peças de engine nascem antes dos checks, e cada uma
existe porque um check é impossível sem ela. `src/core/dates.ts` é a única
fonte de data do toolkit: `CheckContext.today` entra por valor, e nenhum check
lê o relógio — sem isso `CI-4` seria o único check cujo resultado muda sozinho
com o tempo, e um check que não se testa de forma determinística não se confia
(`ADR-0007`). `src/core/files.ts` é o caminhador de arquivos que `CI-4`, `CI-7`
e `CI-8` compartilham, extraído de `src/ids/coverage.ts` em vez de copiado uma
quarta vez. A chave `documents:` no `.ownership.yml` é a resposta a `DA-0002`
(`ADR-0008`): um artefato sem família de IDs ganha dono sem inventar prefixo, e
`CI-1`/`CI-2`/`HK-1` continuam sem lê-la de propósito.

Sobre elas, três checks puros: `CI-4` compara `last-reviewed` com
`stale-after-months` (aviso) e avalia o `pay-when` de cada dívida `open`
(erro); `CI-7` cobra dono nos dois lugares (`.ownership.yml` e CODEOWNERS),
cobra que todo vínculo de `watches` resolva, cobra que a Definition of Done
nomeie a verificação de cada item, e — quando recebe o diff — sinaliza o caminho
vigiado que viajou sem o doc dono, fechando a metade do critério 5 que a Fase 3
deixou aberta; `CI-8` varre links e recusa anexo binário sob a raiz da
documentação. `HK-6` é o sétimo hook e o primeiro em `SessionStart`: reusa as
funções de `CI-4` e devolve `additionalContext`, nunca decisão de permissão.
`AG-1` é o segundo agent — leitura, busca e `git`, sem `Edit`/`Write`.

O dogfooding é obrigatório e é o que faz a fase existir: este repositório passa
a declarar seus documentos em `documents:`, `TDR-0001` ganha `pay-when`
verificável, e o CODEOWNERS passa a cobrir tudo que está sob `docs/`. Sem isso,
`CI-7` seria um check instalado que reprova o próprio repositório — que é pior
do que não existir.

**Tech Stack:** TypeScript (Node ≥ 24, executado só em container —
`RNF-0002`), `node:test`, `picomatch`, `yaml`, Claude Code plugin (`SKILL.md`,
`hooks.json`, `agents/`).

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` §2 (frontmatter), §3 (`.ownership.yml`
como ponto de extensão único), §4 (`stale-after-months`, estados terminais), §5
(`SK-3` regra 5 — gatilho de pagamento observável; `SK-6` regras 1 e 3 — o
contrato do agente e a DoD como fonte de `CI-7`), §6 (`AG-1`), §7 (`HK-6`), §8
(rastreabilidade), §9 (`CI-4`, `CI-7`, `CI-8`), §10 (Fase 7, `CM-5`), §12
(critérios 5, 7 e 8), §13 (anti-requisitos: anexo binário sob `docs/`, documento
sem dono, bump em massa de `last-reviewed`) —
`docs/superpowers/plans/BACKLOG-fases-3-7.md` (seção "Fase 7") traz o
levantamento que este plano resolve.

## Global Constraints

- Nada roda no host além de Docker — todo comando vai por
  `docker compose exec toolkit …` ou `./bin/living-docs` (`RNF-0002`).
- Identificadores, nomes de arquivo e IDs em inglês/neutro; prosa em português
  (spec §11).
- ID nunca reciclado — confira `docs/ids-retired.txt` antes de tomar um número
  novo (spec §2). Os números livres nesta fase: `ADR-0007`, `ADR-0008`,
  `ADR-0009`, `ADR-0010`, `RF-0010`, `RF-0011`, `RF-0012`, `RNF-0004`,
  `RN-0016` a `RN-0023`. Nenhum prefixo novo nasce nesta fase.
- Toda seção de requisito nasce `status: draft`; todo ADR novo nasce
  `status: draft`. Promover é ato humano (`RN-0005`) — `HK-3` intercepta, e a
  resposta não é sua. Isso inclui `DA-0002 → resolved`.
- Mensagem de commit cita o ID afetado, formato `tipo(ID): assunto`
  (`CONTRIBUTING.md`).
- Hook falha aberta em até 5 s, sem rede (`RNF-0001`). `HK-6` segue essa
  política. `CI-4`, `CI-7` e `CI-8` **não** falham abertos: check é o
  enforcement que sobrevive a agente ausente, e `RNF-0001` já diz que o CI falha
  fechado de propósito.
- Nenhum check e nenhum hook novo lê o relógio direto. A data entra por
  `CheckContext.today` ou por parâmetro (`ADR-0007`, `RNF-0004`).
- Gerador continua determinístico (`ADR-0005`): a Task 9 acrescenta três linhas
  ao `CHECK_CATALOG` e **regera** `docs/contracts/checks.gen.md`; não edite o
  arquivo gerado — `HK-2` nega e `CI-5` cobra.
- `CI-4` é o **único** check autorizado a produzir `warning` (spec §9). Nenhum
  outro check desta fase emite `severity: 'warning'`.

### O que este plano decide diferente do backlog, e por quê

O backlog anotou três coisas sobre a Fase 7. Duas se confirmaram; uma não.

1. **Confirmada:** _"Planeje um `CheckContext.today` **antes** de escrever
   `CI-4`."_ É a Task 3, e `ADR-0007` a registra.
2. **Confirmada:** _"`DA-0002` é pré-condição de `CI-7`, não consequência."_
   `ADR-0008` a resolve na Task 1, antes de qualquer código de `CI-7`.
3. **Não confirmada:** _"Acrescente o estágio `multi-team` junto com a fase."_
   A Fase 7 **não instala artefato novo** — ela instala enforcement, e
   enforcement não é arquivo que o `init` escreve: são checks que já vêm com o
   toolkit e hooks que já vêm com o plugin. Um estágio `multi-team` teria
   exatamente o mesmo conjunto de arquivos que `production`, o que é a definição
   de "estágio que instala moldura vazia" que o próprio backlog recusa. O que
   `CI-7` de fato exige do `init` é outra coisa, e é real: que todo documento
   instalado seja **declarado** em `documents:`. Isso é `RF-0012` e é a Task 8,
   e vale para todos os estágios — porque `RN-0016` não tem estágio. A ausência
   do `multi-team` fica escrita no README e no backlog, com esta razão.

### `HK-5` vai perguntar — leia antes de commitar qualquer task

`docs/.ownership.yml` tem `watches` preenchido desde a Fase 3. Estas entradas
atingem os commits deste plano:

| Caminho vigiado         | Doc dono exigido no mesmo commit      | Tasks afetadas |
| ----------------------- | ------------------------------------- | -------------- |
| `src/core/**`           | `docs/requirements/non-functional.md` | 3, 4           |
| `src/checks/**`         | `docs/requirements/rules.md`          | 5, 6, 7, 9     |
| `src/checks/catalog.ts` | `docs/contracts/checks.gen.md`        | 9              |
| `src/hooks/**`          | `docs/requirements/rules.md`          | 10             |
| `src/cli/**`            | `docs/requirements/functional.md`     | 3, 4, 8, 9     |
| `plugin/skills/**`      | `CONTRIBUTING.md`                     | 13             |

`HK-5` **pergunta** (`ask`), nunca nega (`RN-0009`). Nas Tasks 3 a 10 a resposta
é a mesma: o doc dono viajou na Task 2, com a regra que aquele código
implementa — é a ordem que `CONTRIBUTING.md` §"O ciclo" exige. Na Task 9 há uma
segunda pendência, `docs/contracts/checks.gen.md`, e essa **viaja no commit**:
regere e adicione ao `git add`. Na Task 13, `CONTRIBUTING.md` ganha linhas e vai
junto.

**Cinco entradas de `watches` são `consumer-visible: true`** e apontam
`CHANGELOG.md`: `src/cli/**`, `src/checks/catalog.ts`,
`src/config/ownership.ts`, `plugin/**`, `templates/**` e `bin/living-docs`.
Todo commit que toca um desses caminhos leva entrada em `## [Unreleased]`, ou
`CI-6` reprova no PR. As Tasks 4, 8, 9, 10, 11 e 13 dizem qual linha.

**A partir da Task 9 entra uma exigência nova, e ela é desta fase:** com
`--base`, `CI-7` cobra o mesmo vínculo que `HK-5` pergunta, e a saída escrita é
`Docs: none — <razão>` na mensagem de commit (`ADR-0010`). Enquanto o workflow
não passa `--base` (Task 13), essa metade só roda quando alguém a pede na mão.

### `HK-2` vai negar — e é assim que se sabe que ele funciona

`docs/contracts/checks.gen.md` está em `generated[]`. Qualquer `Edit`/`Write`
nele é negado por `HK-2`, e isso é o comportamento correto. A Task 9 muda
`src/checks/catalog.ts` e **roda o gerador**:

```bash
docker compose exec -w /workspace toolkit sh -c 'node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md'
```

Se você se vê tentando editar a tabela à mão, a fonte é `catalog.ts`.

## Cobertura da spec

| Peça                                                                                                                                                                                                 | Task |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| `ADR-0007` (data injetável + gatilho de pagamento verificável), `ADR-0008` (`documents:`, resolve `DA-0002`), `ADR-0009` (limiar de duplicação), `ADR-0010` (severidade do sinal de `watches` no CI) | 1    |
| `RF-0010`, `RF-0011`, `RF-0012`, `RNF-0004`, `RN-0016`–`RN-0023`                                                                                                                                     | 2    |
| `src/core/dates.ts`, `src/core/files.ts`, `CheckContext.today`                                                                                                                                       | 3    |
| `documents:` no parser, `collectDocuments`, `CheckContext.documents`                                                                                                                                 | 4    |
| `CI-4` (staleness + dívida vencida)                                                                                                                                                                  | 5    |
| `CI-7` (ownership coverage) + `src/config/codeowners.ts`, `src/docs/corpus.ts`, `src/docs/markdown.ts`, `src/checks/exception-label.ts`                                                              | 6    |
| `CI-8` (links + anexo binário)                                                                                                                                                                       | 7    |
| `RF-0012`: o `init` declara `documents:`; templates e CODEOWNERS; `pay-when` no template de TDR                                                                                                      | 8    |
| Registro no `validate` (+ `--base`), catálogo, contrato regerado e o dogfooding deste repositório                                                                                                    | 9    |
| `HK-6` (`SessionStart`, inventário)                                                                                                                                                                  | 10   |
| `AG-1` docs-divergence-auditor + `CM-5` `/docs-audit`                                                                                                                                                | 11   |
| A prova de ponta a ponta: critérios 5 (metade 2), 7 e 8                                                                                                                                              | 12   |
| Índices, contrato público, workflow e backlog                                                                                                                                                        | 13   |
| Promoção humana, incluindo `DA-0002 → resolved`                                                                                                                                                      | 14   |

**Critérios de aceite da spec §12 que esta fase fecha:** o **7** (TDR com
gatilho cumprido falha no CI até ser pago ou reclassificado), o **8** (o
inventário chega ao contexto no `SessionStart`) e a **segunda metade do 5** ("e
o CI sinaliza pelo `watches`"). Com isso, os dez critérios estão cobertos — e é
por isso que a Task 13 muda a frase do README que dizia que só uma metade do 5
existia.

---

### Task 1: As quatro decisões — `ADR-0007`, `ADR-0008`, `ADR-0009`, `ADR-0010`

**Objetivo:** A regra vem antes do código, e aqui ela vem em forma de decisão:
cada um dos três checks desta fase depende de uma escolha que não é óbvia e que
precisa deixar rastro. Nenhuma linha de código nesta task.

**Files:**

- Create: `docs/decisions/adr/ADR-0007-data-injetavel-e-gatilho-de-pagamento-verificavel.md`
- Create: `docs/decisions/adr/ADR-0008-documento-sem-familia-de-ids.md`
- Create: `docs/decisions/adr/ADR-0009-limiar-de-duplicacao-textual.md`
- Create: `docs/decisions/adr/ADR-0010-severidade-do-sinal-de-watches-no-ci.md`

**Interfaces:**

- Consome: `templates/adr.md` (formato), `docs/ids-retired.txt` (nenhum dos
  quatro números está lá), e os IDs existentes que cada `relates-to` cita.
- Produz: os quatro IDs, citáveis pelas Tasks 2 a 14.

**Requisitos:**

- Os quatro nascem `status: draft`. Promover é ato humano — Task 14.
- **`relates-to` só cita ID que já existe**, e por isso os quatro citam
  requisitos e decisões das fases anteriores, nunca os requisitos da Task 2:
  `CI-2` reprova citação que não resolve (`RN-0007`), e um ADR que nasce citando
  um requisito que ainda não foi escrito não passa no próprio CI do
  repositório. A ligação inversa (requisito → ADR) é da Task 2, e é ela que
  fecha o par.
- `relates-to` preenchido **antes** da aceitação é pré-condição, não
  consequência: depois de `accepted` o arquivo congela e `relates-to` não está
  na `mutable-fields` (`docs/.ownership.yml`), então consertar exigiria
  supersedir. O backlog registra isso como a lição de `ADR-0001`/`ADR-0002`.
- Cada ADR traz ao menos duas alternativas com o motivo real do descarte, e a
  seção "o que se aceita perder" preenchida. ADR sem consequência negativa
  declarada é propaganda (spec §5, `SK-3`, regra 3).

- [ ] **Step 1: `ADR-0007` — a fonte de data e o gatilho de pagamento**

Crie `docs/decisions/adr/ADR-0007-data-injetavel-e-gatilho-de-pagamento-verificavel.md`:

````markdown
---
id: ADR-0007
title: A fonte de data do toolkit, e como um gatilho de pagamento se torna verificável
status: draft
owner: '@esliph/engineering'
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
     paths: ['docs/requirements/**']
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
````

- [ ] **Step 2: `ADR-0008` — a chave `documents:` (resolve `DA-0002`)**

Crie `docs/decisions/adr/ADR-0008-documento-sem-familia-de-ids.md`:

````markdown
---
id: ADR-0008
title: Como um documento sem família de IDs ganha dono declarado
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-27
relates-to: [DA-0002, RN-0001]
supersedes: null
superseded-by: null
---

# ADR-0008 — Como um documento sem família de IDs ganha dono declarado

## Contexto

`DA-0002` está aberta desde a Fase 3 e diz: como declarar no `.ownership.yml` um
artefato **sem família de IDs**, para que `CI-7` exija dono sem inventar
prefixo. A lista cresceu a cada fase — `CONTRIBUTING.md`, a Definition of Done,
o contrato do agente, `docs/glossary.md`, `docs/charter/`,
`docs/contracts/errors.md`, `docs/contracts/versioning-policy.md`,
`CHANGELOG.md`, `docs/deprecations.md` — e as Fases 4, 5 e 6 a herdaram sem
resolvê-la, porque nenhuma delas precisava.

`CI-7` precisa. "Artefato sem entrada no CODEOWNERS ou no `.ownership.yml`"
(spec §9) não é verificável enquanto esses documentos não puderem ser declarados
lá. O sintoma é barato de reconhecer: `parseArtifact` exige `id-prefix` de 2 a 4
maiúsculas em toda entrada de `artifacts:`, e nenhum desses documentos tem um.

Há uma segunda coisa que `CI-7` precisa e que ninguém tinha notado: ele precisa
saber **qual** documento é o contrato do agente (para cobrar que não repita
texto de artefato dono, spec §5, `SK-6`, regra 1) e **qual** é a Definition of
Done (porque ela é a fonte de `CI-7`, regra 3 da mesma seção). O toolkit não
conhece `CLAUDE.md` nem `docs/definition-of-done.md` e não pode passar a
conhecer (spec §3).

## Alternativas consideradas

1. **`id-prefix` opcional em `artifacts:`.** Descartada. Todo consumidor de
   `ArtifactRule` — `CI-1` (máquina de estados por prefixo), `CI-2` (numeração e
   sequência), `HK-1` (congelamento), `HK-3` (promoção) — passaria a tratar
   prefixo nulo, e cada um ganharia um `if` para dizer "isto não é da minha
   alçada". O custo cairia justamente na Fase 0, que é a parte mais delicada e a
   que menos deveria mudar.
2. **Inventar prefixos: `CTB`, `DOD`, `GLO`, `CHG`.** Descartada. ID que
   ninguém cita é numeração decorativa, e `CI-2` passaria a cobrar sequência de
   uma família de um item só. Pior: convidaria a citar `CTB-0001` em vez de
   `CONTRIBUTING.md`, trocando um caminho que qualquer pessoa entende por um
   código que exige consulta.
3. **Só o CODEOWNERS.** Descartada. O mapa do toolkit deixaria de conhecer o
   documento: `CI-7` não teria como dizer qual skill é dona, `CI-4` não teria
   como cobrar revisão, e o `role` que `CI-7` precisa não teria lugar nenhum.
4. **Uma chave nova, `documents:`.** Escolhida.

## Decisão

**`documents:` declara documento com dono e sem família de IDs.**

```yaml
documents:
  - path: CONTRIBUTING.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
  - path: CLAUDE.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    role: agent-contract
  - path: docs/superpowers/
    owner: '@esliph/engineering'
```

- `path` e `owner` são obrigatórios; `owner` começa com `@` e espelha o
  CODEOWNERS, igual a `artifacts:`.
- `skill` é **opcional**. A ausência é informação, não erro: um documento pode
  ter dono e não ter skill dona — é o caso de um plano, de uma spec, de um
  README.
- `role` é opcional e tem vocabulário fechado: `agent-contract` e
  `definition-of-done`. É o que permite a `CI-7` achar esses dois documentos sem
  conhecer caminho nenhum. Um papel só pode ser declarado uma vez.
- `path` terminado em `/` é diretório e cobre o que está dentro dele; sem `/` é
  arquivo e cobre por igualdade. Mesma semântica de `artifacts:`.
- **`CI-1`, `CI-2`, `HK-1` e `HK-3` não leem `documents:`.** `CI-4` e `CI-7`
  leem. `artifacts:` continua exigindo `id-prefix`.

## Consequências

### O que se ganha

`DA-0002` fecha. `CI-7` passa a poder cobrar dono de todo documento sem
inventar prefixo. A distinção entre **artefato** (tem família de IDs, ciclo de
vida e congelamento) e **documento** (tem dono, e talvez skill) fica explícita
no arquivo que é o ponto de extensão do toolkit, em vez de morar na cabeça de
quem leu as fases anteriores.

### O que se aceita perder

Um documento declarado em `documents:` **não** tem o frontmatter validado por
`CI-1`: um `trigger` com cadência dentro de `CONTRIBUTING.md` passa. Estender
`CI-1` a `documents:` é uma decisão separada, e não é de graça — `CHANGELOG.md`
não tem frontmatter por decisão da Fase 6, e um `CI-1` ingênuo passaria a
reprová-lo. Esta fase deixa isso de fora e escreve que deixou.

`role` é vocabulário fechado: um projeto que precise de um papel novo espera uma
versão do toolkit. É deliberado — papel aberto seria configuração que o toolkit
não sabe usar.

Duas chaves passam a poder declarar o mesmo caminho (`artifacts:` e
`documents:`). O parser recusa duplicata dentro de `documents:`, mas não cruza as
duas listas; `CI-7` trata qualquer uma como "declarado", então o efeito de um
engano aqui é silêncio, não erro.
````

- [ ] **Step 3: `ADR-0009` — o limiar de duplicação textual**

Crie `docs/decisions/adr/ADR-0009-limiar-de-duplicacao-textual.md`:

```markdown
---
id: ADR-0009
title: O limiar que distingue vocabulário compartilhado de conteúdo copiado
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-27
relates-to: [RN-0010]
supersedes: null
superseded-by: null
---

# ADR-0009 — O limiar que distingue vocabulário compartilhado de conteúdo copiado

## Contexto

`CI-7` inclui "contrato do agente repetindo texto de um artefato dono" (spec
§9), e a spec §5 (`SK-6`, regra 1) diz que é `CI-7` quem sinaliza isso.
`RN-0010` já declara a regra e registra, em "fora de escopo", que a detecção
automática chega na Fase 7.

É o único check da spec com risco real de falso positivo. O contrato do agente
fala das mesmas coisas que os artefatos donos falam — é a função dele apontar
para elas —, então ele **vai** compartilhar palavras. Um check que confunda
vocabulário compartilhado com conteúdo copiado é desligado no primeiro dia, e
aí a regra que ele protegia deixa de ter enforcement nenhum.

## Alternativas consideradas

1. **Qualquer linha repetida.** Descartada. Reprovaria "Nada roda no host além
   de Docker", que é política legítima, curta, e cuja presença no contrato do
   agente é o que faz o agente obedecê-la.
2. **Similaridade estatística (shingles, Jaccard, limiar percentual).**
   Descartada. Um número que ninguém consegue explicar dentro de um PR não é
   enforcement, é adivinhação; e o custo do falso positivo aqui não é um ajuste,
   é uma discussão sobre o próprio check.
3. **Só o título de requisito**, que é o que `test/docs/agent-contract.test.ts`
   já faz desde a Fase 3. Descartada como forma final: pega o caso mais fácil e
   deixa passar o parágrafo copiado, que é o caso caro.
4. **Frase normalizada com piso de palavras, comparada por igualdade dentro do
   corpus.** Escolhida.

## Decisão

**Uma frase de doze palavras ou mais do contrato do agente que reapareça,
palavra por palavra, num artefato com skill dona, é duplicata e reprova.**

- **Unidade: a frase.** Parágrafo primeiro (linhas consecutivas juntadas), corte
  depois: prosa quebrada em oitenta colunas não pode escapar do check só por
  causa de onde o editor deu enter.
- **Normalização:** minúscula, sem marcação (`*`, `_`, `` ` ``, `~`), sem
  pontuação, espaço colapsado. Bloco de código — cercado ou inline — sai antes.
- **Piso: 12 palavras.** Abaixo disso é vocabulário compartilhado.
- **Corpus: artefatos e documentos declarados que têm skill dona.** Fica de
  fora o que cita por ofício — plano, spec, README, backlog —, porque ali a
  repetição é o trabalho, e reprovar o contrato do agente por causa de um plano
  que o citou seria inverter quem copiou de quem.
- **Severidade: erro.** A correção é apagar a frase do contrato e deixar o
  ponteiro para o artefato dono — nunca baixar o limiar.

## Consequências

### O que se ganha

`RN-0010` ganha enforcement automático, e a duplicata mais cara que existe — a
que é relida em toda sessão de agente e por isso vence a versão nova por
repetição — passa a ser pega por máquina em vez de por revisão atenta.

### O que se aceita perder

**Paráfrase passa.** Duplicata semântica não é detectada, e não vai ser: o
check que a detectasse erraria mais do que acertaria, e o erro dele seria numa
direção que ninguém consegue argumentar.

**O piso é um número escolhido, não derivado.** Doze palavras é o ponto onde as
frases de política deste repositório ficam abaixo e os parágrafos copiados ficam
acima; é uma calibração feita contra um corpus de um projeto. A primeira vez que
ele reprovar uma frase legítima, o caminho é um ADR novo que o mude, com o caso
concreto anexado — não uma exceção local dentro do check.

O corpus depende de `skill:` estar declarado. Um documento que devesse estar no
corpus e não declare skill fica fora, e a duplicata dele passa. É o preço de não
ter uma segunda lista de "quem entra no corpus".
```

- [ ] **Step 4: `ADR-0010` — a severidade do sinal de `watches` no CI**

Crie `docs/decisions/adr/ADR-0010-severidade-do-sinal-de-watches-no-ci.md`:

```markdown
---
id: ADR-0010
title: Com que severidade o CI sinaliza o caminho vigiado sem doc dono, e qual é a saída escrita
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-27
relates-to: [RN-0008, RN-0009, RNF-0001]
supersedes: null
superseded-by: null
---

# ADR-0010 — Com que severidade o CI sinaliza o caminho vigiado sem doc dono, e qual é a saída escrita

## Contexto

O critério de aceite 5 da spec §12 tem duas metades: "`HK-5` pergunta e lista os
pendentes; **e** o CI sinaliza pelo `watches`". A Fase 3 entregou a primeira e
escreveu no README que a segunda não existia. `CI-7` é a segunda.

Três frases escritas em fases diferentes não cabem juntas sem uma decisão:

- spec §9: "`CI-4` é o único autorizado a apenas avisar — os demais falham,
  porque aviso ignorado é o começo da wiki morta."
- `RN-0009`: "O que liga código a documento informa ou pergunta. Nunca
  bloqueia."
- spec §12, critério 5: o CI "sinaliza" — palavra que serve para os dois.

## Alternativas consideradas

1. **Aviso.** Descartada. A metade do hook já é o caminho gentil; se as duas
   metades avisam, o mecanismo 1 não tem barreira nenhuma, e a spec §9 diz
   exatamente o que acontece com aviso ignorado.
2. **Erro sem saída.** Descartada. Contradiz `RN-0009` de frente e, pior, não
   deixa caminho honesto para a mudança que realmente não afeta o doc — que
   existe, e cuja negação é o que faz alguém desligar o enforcement.
3. **Erro com rótulo de exceção com razão escrita.** Escolhida.
4. **Não implementar a metade do CI.** Descartada: o critério 5 nunca fecharia,
   e a frase do README ficaria permanente.

## Decisão

**Erro, com uma saída escrita: `Docs: none — <razão>`.**

- A metade do diff de `CI-7` é `severity: 'error'`.
- A única saída é o rótulo `Docs: none — <razão>` em alguma mensagem de commit
  do intervalo, com separador e razão não vazia. Rótulo sem razão não é
  exceção: é a caixinha marcada.
- Essa metade só roda com `living-docs validate --base <ref>`. Sem `--base`,
  `validate` imprime o ponteiro dizendo que ela não rodou — mesma honestidade
  que `validate` já tem sobre `drift` e `changelog`.
- O rótulo vale para o intervalo inteiro do diff, não por documento.

**`RN-0009` continua verdadeira no escopo dela.** O vocabulário dela é de hook
— `additionalContext` e `ask` —, e o que ela protege é o momento do commit, onde
existe uma pessoa para responder. No CI não existe: `RNF-0001` já dizia, em
"fora de escopo", que "o CI falha fechado de propósito". E o precedente está no
repositório desde a Fase 6: a regra `src/cli/** → CHANGELOG.md` é uma entrada de
`watches`, e `CI-6` já falha por ela com um rótulo de escape (`ADR-0006`). Esta
decisão dá ao caso geral a forma que o caso particular já tinha. `RN-0021`
escreve o outro lado da regra.

## Consequências

### O que se ganha

O critério 5 fecha inteiro. O mecanismo 1 passa a ter as duas pontas que a spec
desenhou: a pergunta barata no commit, e a barreira que sobrevive a hook
desligado, container parado e commit feito na mão.

### O que se aceita perder

Mais uma coisa para quem escreve mensagem de commit lembrar, e um rótulo a mais
para explicar em `CONTRIBUTING.md`. Dois rótulos (`Changelog: none` e
`Docs: none`) é o começo de uma família de rótulos, e família de rótulo vira
burocracia; a próxima adição precisa de ADR próprio, justamente por isso.

**O rótulo é global ao intervalo.** Uma razão libera todos os docs pendentes do
PR, não um a um. Granularidade por documento exigiria sintaxe maior
(`Docs: none (CHANGELOG.md) — <razão>`), e sintaxe maior não se usa: o custo de
acertar a sintaxe passa a ser maior que o de atualizar o doc, e aí quem escreve
faz a coisa errada por ergonomia.

`Docs: none — <razão>` também silencia o caminho vigiado que **deveria** ter
levado o doc. Isso é o mesmo risco que `ADR-0006` aceitou para o `CHANGELOG`, e
a defesa é a mesma: a razão fica no histórico, com nome de quem a escreveu.
```

- [ ] **Step 5: Rodar os checks e ver os quatro ADRs passarem**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Esperado: `validate=0`, nenhuma violação. Se `CI-2` acusar "citação que não
resolve", algum `relates-to` está citando um ID da Task 2 — corrija para citar
só ID existente. Se `CI-1` acusar `status` fora da máquina de estados, o arquivo
nasceu com algo diferente de `draft`.

- [ ] **Step 6: Commit**

```bash
git add docs/decisions/adr/ADR-0007-data-injetavel-e-gatilho-de-pagamento-verificavel.md docs/decisions/adr/ADR-0008-documento-sem-familia-de-ids.md docs/decisions/adr/ADR-0009-limiar-de-duplicacao-textual.md docs/decisions/adr/ADR-0010-severidade-do-sinal-de-watches-no-ci.md
git commit -m "docs(ADR-0007, ADR-0008, ADR-0009, ADR-0010): as quatro decisões da Fase 7"
```

---

### Task 2: Os requisitos — `RF-0010`–`RF-0012`, `RNF-0004`, `RN-0016`–`RN-0023`

**Objetivo:** A regra escrita antes do código, e a ligação inversa com os ADRs
da Task 1. É este commit que todas as tasks de código citam quando `HK-5`
perguntar pelo doc dono.

**Files:**

- Modify: `docs/requirements/functional.md` (acrescenta `RF-0010`, `RF-0011`, `RF-0012`)
- Modify: `docs/requirements/non-functional.md` (acrescenta `RNF-0004`)
- Modify: `docs/requirements/rules.md` (acrescenta `RN-0016` a `RN-0023`)

**Interfaces:**

- Consome: `ADR-0007`–`ADR-0010` (Task 1), e o formato de seção de
  `templates/requirements.md`.
- Produz: doze IDs `draft`, citados pelos testes das Tasks 3 a 12 e promovidos
  na Task 14.

**Requisitos:**

- Todos nascem `status: draft`. `CI-3` (regra 7) só cobra citação de item
  `active`, então o commit passa sem que os testes existam ainda.
- Cada seção entra **no fim** do arquivo, na ordem do número. As seções
  existentes não se tocam.
- `last-reviewed` do container sobe para `2026-08-27` nos três arquivos — eles
  foram realmente revisados agora. Isso não é bump em massa: são os três
  arquivos que este commit muda.
- Nenhum enunciado narra o código. "O que **deve** ser", nunca "o que o
  `ci4-staleness.ts` faz".

- [ ] **Step 1: Acrescentar `RF-0010`, `RF-0011` e `RF-0012`**

Em `docs/requirements/functional.md`, atualize `last-reviewed: 2026-08-27` no
frontmatter e acrescente ao fim:

```markdown
## RF-0010 — `validate` roda os checks de estado da árvore, e aviso não reprova

- **status:** draft
- **relates-to:** ADR-0007, ADR-0008
- **fora de escopo:** a metade de `CI-7` que depende do diff, que entra por `--base` e é `RF-0011`

Uma execução de `validate` roda todos os checks que se contentam com o estado da
árvore — hoje `CI-1`, `CI-2`, `CI-3`, `CI-4`, `CI-7` e `CI-8` — e reporta os
achados dos seis juntos. Achado `error` leva a código de saída 1; achado
`warning` é reportado e **não** muda o código de saída.

Quando existe algo que `validate` não verifica — artefato gerado, entrada de
CHANGELOG, o diff da branch —, ele imprime o ponteiro para o comando que
verifica. Check que não roda e não avisa que não rodou é cobertura fingida.

## RF-0011 — `validate --base <ref>` cobra o doc dono do caminho vigiado que mudou

- **status:** draft
- **relates-to:** ADR-0010, RN-0021
- **fora de escopo:** a entrada de CHANGELOG, que é `CI-6` e tem comando próprio

Com `--base <ref>`, `validate` acrescenta a `CI-7` a verificação que depende do
diff: caminho vigiado alterado entre a base e `HEAD` sem o doc dono no mesmo
diff reprova, salvo razão escrita no histórico. Sem `--base`, essa verificação
não roda e o comando diz que não rodou.

A base não se adivinha. Sem ela, o comando não escolhe uma por conta própria:
escolher errado produziria achado sobre mudança que não é desta branch.

## RF-0012 — `init` declara todo documento que instala

- **status:** draft
- **relates-to:** ADR-0008, RN-0016
- **fora de escopo:** o vínculo `watches`, o gerador e `consumer-visible-paths`, que o `init` continua não inventando (`RF-0004`)

Todo documento que o `init` escreve e que não tem família de IDs é declarado em
`documents:`, com dono e — quando existe uma — a skill dona. Um `init` que cria
documento sem declará-lo entrega, na primeira execução, um repositório que
reprova no próprio `CI-7`.

Isso vale em todos os estágios: dono não é função de maturidade. O que muda com
o estágio é **quais** documentos existem.
```

- [ ] **Step 2: Acrescentar `RNF-0004`**

Em `docs/requirements/non-functional.md`, atualize `last-reviewed: 2026-08-27`
e acrescente ao fim:

```markdown
## RNF-0004 — O resultado de um check não depende do relógio nem da máquina

- **status:** draft
- **relates-to:** ADR-0007
- **fora de escopo:** o valor de `stale-after-months`, que é configuração do projeto

Dados a mesma árvore, a mesma configuração e a mesma data, dois checks
produzem o mesmo resultado. A data entra por valor, de quem chama; nenhum check
e nenhum hook lê o relógio por dentro.

Sem isso, o único teste possível para o que depende de tempo é o que passa hoje
e reprova em seis meses — e teste que reprova sozinho é teste que se apaga.
```

- [ ] **Step 3: Acrescentar `RN-0016` a `RN-0023`**

Em `docs/requirements/rules.md`, atualize `last-reviewed: 2026-08-27` e
acrescente ao fim:

```markdown
## RN-0016 — Documento sem dono declarado não passa

- **status:** draft
- **relates-to:** ADR-0008, RN-0001
- **fora de escopo:** quem é o dono, que é do projeto e mora no `.ownership.yml` e no CODEOWNERS

Todo arquivo sob a raiz da documentação, e todo caminho declarado que mora fora
dela, tem entrada no `.ownership.yml` — em `artifacts:`, em `documents:` ou em
`generated:` — **e** linha no CODEOWNERS. Os dois lugares, não um: o
`.ownership.yml` diz qual skill responde, o CODEOWNERS diz quem revisa, e
documento com dono em um lugar só é documento cujo dono desaparece na primeira
dúvida.

Artefato e documento não são a mesma coisa. Artefato tem família de IDs, ciclo
de vida e congelamento; documento tem dono, e talvez uma skill. Os dois têm
dono, e é isso que esta regra cobra.

## RN-0017 — Item de Definition of Done sem verificação nomeada não é item

- **status:** draft
- **relates-to:** RN-0016
- **fora de escopo:** se a verificação nomeada é boa o suficiente, que é julgamento humano

Cada caixa da Definition of Done nomeia o que a verifica: um ID de check, um ID
de hook, ou a palavra que marca verificação humana. Item sem verificação é
intenção, e intenção não é definição de pronto.

É a Definition of Done que dá autoridade ao enforcement: item que ninguém
verifica é item que nenhum check tem como cobrar.

## RN-0018 — Documento vencido avisa; dívida com gatilho cumprido reprova

- **status:** draft
- **relates-to:** ADR-0007, RN-0002
- **fora de escopo:** o valor de `stale-after-months`, que é configuração do projeto

`last-reviewed` além do limite do projeto gera **aviso** e não reprova o build:
a correção é ler o documento, e build vermelho empurra para o bump em massa que
desliga o mecanismo fingindo cumpri-lo.

Dívida `open` cujo gatilho de pagamento já aconteceu **reprova**, e continua
reprovando até que a dívida seja paga ou reclassificada. As duas coisas são ato
humano.

Item em estado congelado não vence. Não há o que revisar num item cujo corpo não
se edita, e avisar sobre ele ensinaria justamente o bump que a regra recusa.

## RN-0019 — Dívida `open` declara o gatilho de pagamento de forma verificável

- **status:** draft
- **relates-to:** ADR-0007, RN-0018
- **fora de escopo:** a redação em prosa do gatilho, que continua no corpo, é para gente ler, e é ela que explica o porquê

Uma dívida `open` declara `pay-when` com um padrão e os caminhos onde ele é
procurado. Gatilho que só existe em prosa não é verificável, e gatilho não
verificável é `TODO` órfão com número — a coisa que a dívida registrada existia
para não ser.

O padrão nomeia uma condição no repositório, não uma data. Dívida não vence no
calendário: vence quando a condição que a tornava aceitável deixa de valer.

## RN-0020 — O contrato do agente não repete texto de artefato dono, e o limiar é escrito

- **status:** draft
- **relates-to:** RN-0010, ADR-0009
- **fora de escopo:** duplicata por paráfrase, que nenhum check detecta e cuja recusa é humana

Uma frase de doze palavras ou mais do contrato do agente que reapareça, palavra
por palavra, num artefato com skill dona é duplicata e reprova. A correção é
apagar a frase e deixar o ponteiro para o artefato dono.

Abaixo do limiar é vocabulário compartilhado, não conteúdo copiado. O contrato
do agente fala das mesmas coisas que os artefatos donos falam — é a função dele
— e um check que reprovasse vocabulário compartilhado seria desligado no
primeiro dia, deixando a regra sem enforcement nenhum.

## RN-0021 — Caminho vigiado sem doc dono reprova no CI, e a saída é a razão escrita

- **status:** draft
- **relates-to:** RN-0008, RN-0009, ADR-0010
- **fora de escopo:** o momento do commit, onde o enforcement pergunta em vez de reprovar (`RN-0009`)

No CI, o diff que toca caminho vigiado sem o doc dono reprova. A única saída é
uma razão escrita em alguma mensagem de commit do intervalo, no formato
`Docs: none — <razão>`. Rótulo sem razão não é exceção: é a caixinha marcada.

Isto não afrouxa nem contradiz `RN-0009`: lá quem enforce é um hook, no momento
em que existe uma pessoa para responder à pergunta; aqui não existe pessoa
nenhuma, e o custo do silêncio é uma documentação desatualizada passando com a
autoridade de um CI verde.

## RN-0022 — O início de sessão entrega o inventário, e nunca bloqueia

- **status:** draft
- **relates-to:** RN-0009
- **fora de escopo:** o que fazer com o inventário, que é julgamento de quem o recebe

No início de uma sessão, o que está presente e ausente, as decisões abertas, as
dívidas com gatilho cumprido e os documentos vencidos chegam ao contexto sem
ninguém precisar procurar. É injeção de contexto, nunca decisão de permissão.

E é curto por obrigação: inventário que ninguém lê é a wiki morta chegando pelo
outro lado, com o agravante de custar contexto em toda sessão.

## RN-0023 — Link quebrado e anexo binário sob a raiz da documentação reprovam

- **status:** draft
- **relates-to:** RN-0016
- **fora de escopo:** âncora dentro do arquivo (`#seção`), que o enforcement não resolve — e diz que não resolve

Link relativo que não resolve para arquivo ou diretório existente, `[[wikilink]]`
sem destino, e arquivo em formato binário sob a raiz da documentação reprovam.
Link quebrado é pior que ausência de link: afirma uma ligação que não existe.
Anexo binário não se lê em diff nem se revisa em PR.

Código não é link: o que está dentro de bloco cercado ou de marcação inline é
exemplo, e cobrar exemplo ensina a não escrever exemplo.
```

- [ ] **Step 4: Rodar os checks**

```bash
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec toolkit npm test
```

Esperado: `validate=0` e testes passando. Se `CI-1` acusar item sem `status`, a
linha `- **status:** draft` faltou em alguma seção. Se `CI-2` acusar ID fora de
sequência, algum número foi pulado.

- [ ] **Step 5: Commit**

```bash
git add docs/requirements/functional.md docs/requirements/non-functional.md docs/requirements/rules.md
git commit -m "docs(RF-0010, RF-0011, RF-0012, RNF-0004, RN-0016, RN-0017, RN-0018, RN-0019, RN-0020, RN-0021, RN-0022, RN-0023): a regra antes do código da Fase 7"
```

---

### Task 3: `src/core/dates.ts`, `src/core/files.ts` e `CheckContext.today`

**Objetivo:** As duas peças que a Fase 7 pressupõe e que nenhuma fase anterior
precisou: uma fonte de data injetável e um caminhador de arquivos
compartilhado. As duas são puras, pequenas, e existem porque três checks as
usam — a segunda é **extraída** de `src/ids/coverage.ts`, não copiada.

**Files:**

- Create: `src/core/dates.ts`
- Create: `src/core/files.ts`
- Test: `test/core/dates.test.ts`
- Test: `test/core/files.test.ts`
- Modify: `src/core/types.ts` (acrescenta `today` a `CheckContext`)
- Modify: `src/ids/coverage.ts` (passa a usar `listFiles`/`readTextFile`)
- Modify: `src/cli/validate.ts`, `src/cli/drift.ts`, `src/cli/changelog.ts` (preenchem `today`)
- Modify: `src/cli/init.ts` (usa `todayIso` em vez da função local)
- Modify: `test/checks/ci1-structure.test.ts`, `test/checks/ci2-ids.test.ts`, `test/checks/ci5-contract-drift.test.ts`, `test/checks/ci6-changelog-required.test.ts` (o contexto ganha `today`)

**Interfaces:**

- Consome: `picomatch`; `node:fs`.
- Produz:
  - `todayIso(clock?: () => Date): string`
  - `asIsoDate(value: unknown): string | null`
  - `monthsBetween(from: string, to: string): number | null`
  - `listFiles(root: string, globs?: readonly string[]): string[]`
  - `readTextFile(root: string, file: string): string | null`
  - `isProbablyText(content: string): boolean`
  - `SKIP_DIRS: ReadonlySet<string>`, `MAX_BYTES: number`
  - `CheckContext.today: string`

**Requisitos:**

- `monthsBetween` e `asIsoDate` devolvem `null` para entrada que não é data
  ISO. `null` significa "não sei", e quem não sabe se cala — `CI-1` já cobra o
  formato de `last-reviewed`, e dois checks reclamando do mesmo campo é ruído.
- `listFiles` sem `globs` devolve tudo; com lista vazia devolve nada. A
  diferença importa: "sem filtro" e "filtro que não casa nada" são perguntas
  diferentes.
- `readTextFile` devolve `null` para arquivo grande, binário ou ilegível — as
  três razões colapsam em "não leia", porque nenhum consumidor desta fase trata
  as três de forma diferente.
- `src/ids/coverage.ts` sai desta task **com o mesmo comportamento**: os testes
  existentes de `test/ids/coverage.test.ts` são a rede. Não mude a assinatura de
  `scanCitations`.
- `CheckContext.today` é obrigatório, não opcional. Campo opcional aqui viraria
  `undefined` silencioso dentro de um check, que é exatamente o defeito que
  `ADR-0007` evita.

**`HK-5`:** vai perguntar por `docs/requirements/non-functional.md` (caminho
vigiado `src/core/**`) e por `docs/requirements/functional.md` (`src/cli/**`). A
resposta: os dois viajaram na Task 2, com `RNF-0004` e `RF-0010`.

- [ ] **Step 1: Escrever o teste que falha — datas**

Crie `test/core/dates.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { asIsoDate, monthsBetween, todayIso } from '../../src/core/dates.ts'

test('RNF-0004: todayIso lê o relógio que recebe, não o do sistema', () => {
  const fixo = () => new Date('2026-08-27T13:45:00Z')
  assert.equal(todayIso(fixo), '2026-08-27')
  // sem clock, ainda é ISO de dez caracteres — o formato é o contrato
  assert.match(todayIso(), /^\d{4}-\d{2}-\d{2}$/)
})

test('asIsoDate aceita string ISO e Date, e recusa o resto', () => {
  assert.equal(asIsoDate('2026-08-27'), '2026-08-27')
  assert.equal(asIsoDate('  2026-08-27  '), '2026-08-27')
  assert.equal(asIsoDate(new Date('2026-08-27T00:00:00Z')), '2026-08-27')
  assert.equal(asIsoDate('27/08/2026'), null)
  assert.equal(asIsoDate('em breve'), null)
  assert.equal(asIsoDate(undefined), null)
  assert.equal(asIsoDate(42), null)
  assert.equal(asIsoDate(new Date('não é data')), null)
})

test('monthsBetween conta meses de calendário e respeita o dia', () => {
  assert.equal(monthsBetween('2026-01-15', '2026-07-15'), 6)
  assert.equal(monthsBetween('2026-01-15', '2026-07-14'), 5, 'faltando um dia, ainda não fez seis meses')
  assert.equal(monthsBetween('2026-01-15', '2026-07-16'), 6)
  assert.equal(monthsBetween('2025-12-31', '2026-01-01'), 0)
  assert.equal(monthsBetween('2026-08-27', '2026-08-27'), 0)
})

test('monthsBetween devolve negativo para data no futuro e null para o que não é data', () => {
  assert.equal(monthsBetween('2027-01-01', '2026-08-27'), -4)
  assert.equal(monthsBetween('amanhã', '2026-08-27'), null)
  assert.equal(monthsBetween('2026-08-27', ''), null)
})
```

- [ ] **Step 2: Escrever o teste que falha — arquivos**

Crie `test/core/files.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { listFiles, readTextFile, isProbablyText, MAX_BYTES } from '../../src/core/files.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const ARVORE = {
  'docs/um.md': '# um\n',
  'docs/sub/dois.md': '# dois\n',
  'docs/tres.txt': 'texto\n',
  'src/quatro.ts': 'export const x = 1;\n',
  'node_modules/pacote/cinco.md': '# não me leia\n',
  '.git/config': '[core]\n',
}

test('listFiles varre tudo, com `/` sempre, e pula o que nunca tem documento', () => {
  withTempRepo(ARVORE, root => {
    const files = listFiles(root)
    assert.ok(files.includes('docs/sub/dois.md'))
    assert.ok(files.includes('src/quatro.ts'))
    assert.equal(
      files.some(file => file.startsWith('node_modules/')),
      false,
    )
    assert.equal(
      files.some(file => file.startsWith('.git/')),
      false,
    )
    assert.equal(
      files.some(file => file.includes('\\')),
      false,
    )
  })
})

test('listFiles filtra por glob; lista vazia não é ausência de filtro', () => {
  withTempRepo(ARVORE, root => {
    assert.deepEqual(listFiles(root, ['docs/**/*.md']).sort(), ['docs/sub/dois.md', 'docs/um.md'])
    assert.deepEqual(listFiles(root, []), [], 'filtro vazio casa nada — não é "tudo"')
    assert.ok(listFiles(root, undefined).length > 3, 'sem filtro é tudo')
  })
})

test('listFiles casa arquivo que começa com ponto — o corpus começa pelo `.ownership.yml`', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 1\n', 'docs/sub/.gitkeep': '' }, root => {
    assert.deepEqual(listFiles(root, ['docs/**']).sort(), ['docs/.ownership.yml', 'docs/sub/.gitkeep'])
  })
})

test('readTextFile devolve o conteúdo, e null para binário, grande ou ausente', () => {
  withTempRepo(ARVORE, root => {
    assert.equal(readTextFile(root, 'docs/um.md'), '# um\n')
    assert.equal(readTextFile(root, 'docs/nao-existe.md'), null)

    mkdirSync(join(root, 'docs/anexos'), { recursive: true })
    writeFileSync(join(root, 'docs/anexos/bin.dat'), Buffer.from([0x41, 0x00, 0x42]))
    assert.equal(readTextFile(root, 'docs/anexos/bin.dat'), null, 'byte NUL é o sinal de binário')

    writeFileSync(join(root, 'docs/anexos/grande.md'), 'x'.repeat(MAX_BYTES + 1), 'utf8')
    assert.equal(readTextFile(root, 'docs/anexos/grande.md'), null, 'acima do teto é dado, não texto')
  })
})

test('isProbablyText separa texto de dado pelo byte NUL', () => {
  assert.equal(isProbablyText('qualquer prosa'), true)
  assert.equal(isProbablyText(`com${String.fromCharCode(0)}nul`), false)
})
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/core/dates.test.ts test/core/files.test.ts
```

Esperado: FAIL — `Cannot find module '.../src/core/dates.ts'`.

- [ ] **Step 4: Escrever `src/core/dates.ts`**

```typescript
/**
 * A única fonte de data do toolkit (`ADR-0007`, `RNF-0004`).
 *
 * Nenhum check e nenhum hook lê o relógio por dentro: quem lê é a borda — o CLI,
 * o hook, ou o teste — e a data entra por valor. Sem isso, o resultado de `CI-4`
 * mudaria sozinho com o passar do tempo, e o único teste possível seria o que
 * passa hoje e reprova em seis meses.
 */
export type Clock = () => Date

/** Hoje, em ISO (`YYYY-MM-DD`), em UTC. */
export function todayIso(clock: Clock = () => new Date()): string {
  return clock().toISOString().slice(0, 10)
}

const ISO = /^(\d{4})-(\d{2})-(\d{2})$/

/**
 * O valor como data ISO, ou `null` quando não é data.
 *
 * `Date` entra porque o YAML de alguns projetos declara timestamp de verdade e o
 * parser o materializa. `null` significa "não sei", e quem não sabe se cala:
 * `CI-1` já cobra o formato de `last-reviewed`, e dois checks reclamando do mesmo
 * campo é ruído.
 */
export function asIsoDate(value: unknown): string | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString().slice(0, 10)
  }
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return ISO.test(trimmed) ? trimmed : null
}

/**
 * Meses de calendário de `from` até `to`; negativo quando `from` está no futuro,
 * `null` quando alguma das duas não é ISO.
 *
 * Meses, não dias, de propósito: `stale-after-months` é o campo que o projeto
 * declara, e precisão de dia não muda nenhuma decisão que o aviso provoca.
 */
export function monthsBetween(from: string, to: string): number | null {
  const start = ISO.exec(from.trim())
  const end = ISO.exec(to.trim())
  if (!start || !end) return null

  const months = (Number(end[1]) - Number(start[1])) * 12 + (Number(end[2]) - Number(start[2]))
  return Number(end[3]) < Number(start[3]) ? months - 1 : months
}
```

- [ ] **Step 5: Escrever `src/core/files.ts`**

```typescript
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'

/**
 * Diretórios que nunca contêm documento nem citação escrita por gente.
 *
 * Vieram de `src/ids/coverage.ts`, que era o único a caminhar pela árvore até
 * `CI-4`, `CI-7` e `CI-8` também precisarem. Uma quarta cópia da mesma varredura
 * é como as três divergem.
 */
export const SKIP_DIRS: ReadonlySet<string> = new Set(['.git', 'node_modules', 'dist', 'coverage', '.next', '.cache'])

/** Acima disto, é dado, não texto — e ler custa mais do que vale. */
export const MAX_BYTES = 512 * 1024

function walk(root: string, relative: string, out: string[]): void {
  let entries: string[]
  try {
    entries = readdirSync(join(root, relative))
  } catch {
    return
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue
    const path = relative === '' ? entry : `${relative}/${entry}`
    let isDirectory: boolean
    try {
      isDirectory = statSync(join(root, path)).isDirectory()
    } catch {
      continue
    }
    if (isDirectory) walk(root, path, out)
    else out.push(path)
  }
}

/**
 * Arquivos do repositório, relativos à raiz e sempre com `/`.
 *
 * Sem `globs`, tudo. Com lista vazia, nada — as duas perguntas são diferentes, e
 * confundi-las faria um check com configuração vazia varrer o repositório
 * inteiro.
 *
 * `dot: true` não é gosto: sem ele, `docs/**` **não casa** `docs/.ownership.yml`
 * nem `docs/decisions/adr/.gitkeep`, porque o padrão do picomatch é ignorar
 * arquivo que começa com ponto. O corpus de `CI-7` começa justamente pelo mapa de
 * propriedade, e um caminhador que o esconde faria o check aprovar por vacuidade
 * o único arquivo que ele não pode deixar sem dono. O que se pula de verdade é a
 * lista `SKIP_DIRS`, e ela é explícita.
 */
export function listFiles(root: string, globs?: readonly string[]): string[] {
  const files: string[] = []
  walk(root, '', files)

  if (globs === undefined) return files
  if (globs.length === 0) return []

  const matches = picomatch([...globs], { dot: true })
  return files.filter(file => matches(file))
}

/** Byte NUL é o sinal barato de "isto é dado binário, não texto". */
export function isProbablyText(content: string): boolean {
  return content.indexOf(String.fromCharCode(0)) === -1
}

/**
 * O conteúdo do arquivo, ou `null` quando ele é grande demais, binário ou
 * ilegível. As três razões colapsam numa só porque nenhum consumidor as trata de
 * forma diferente: todas significam "não leia isto".
 */
export function readTextFile(root: string, file: string): string | null {
  try {
    if (statSync(join(root, file)).size > MAX_BYTES) return null
    const content = readFileSync(join(root, file), 'utf8')
    return isProbablyText(content) ? content : null
  } catch {
    return null
  }
}
```

- [ ] **Step 6: Rodar e ver passar**

```bash
docker compose exec toolkit node --test test/core/dates.test.ts test/core/files.test.ts
```

Esperado: PASS.

- [ ] **Step 7: Extrair a varredura de `src/ids/coverage.ts`**

Substitua `src/ids/coverage.ts` inteiro por:

```typescript
import { listFiles, readTextFile } from '../core/files.ts'
import { findCitations } from './citations.ts'

export interface CitationSite {
  /** Caminho relativo à raiz do repositório, sempre com `/`. */
  file: string
  /** Linha 1-indexed. */
  line: number
}

/**
 * Onde cada ID aparece, restrito aos caminhos de `globs`.
 * Chave: o ID exatamente como escrito no texto — a canonização é de quem compara.
 *
 * A varredura da árvore e a leitura segura moram em `src/core/files.ts` desde a
 * Fase 7: `CI-4`, `CI-7` e `CI-8` fazem a mesma caminhada.
 */
export function scanCitations(root: string, globs: readonly string[]): Map<string, CitationSite[]> {
  const sites = new Map<string, CitationSite[]>()
  if (globs.length === 0) return sites

  for (const file of listFiles(root, globs)) {
    const content = readTextFile(root, file)
    if (content === null) continue

    for (const citation of findCitations(content)) {
      const list = sites.get(citation.id) ?? []
      list.push({ file, line: citation.line })
      sites.set(citation.id, list)
    }
  }

  return sites
}
```

Rode a rede de segurança:

```bash
docker compose exec toolkit node --test test/ids/coverage.test.ts test/checks/ci3-traceability.test.ts
```

Esperado: PASS, sem nenhuma mudança nos testes. Se algum falhar, a extração
mudou comportamento — compare `SKIP_DIRS` e `MAX_BYTES` com o que estava lá.

- [ ] **Step 8: Acrescentar `today` ao `CheckContext`**

Em `src/core/types.ts`, acrescente à interface `CheckContext`:

```typescript
/**
 * Hoje, em ISO. Nenhum check lê o relógio por dentro (`ADR-0007`, `RNF-0004`):
 * a data entra por valor, e é isso que torna `CI-4` testável.
 */
today: string
```

- [ ] **Step 9: Preencher `today` em quem monta contexto**

Em `src/cli/validate.ts`, acrescente o import e o campo:

```typescript
import { todayIso } from '../core/dates.ts'
```

```typescript
const context = { root, config, docs, today: todayIso() }
```

Em `src/cli/drift.ts`, o mesmo import e:

```typescript
// `docs: []` de propósito: CI-5 não lê artefato nenhum — ele compara o arquivo
// gerado com a saída do gerador. `today` entra porque o contexto é um só.
const context = { root, config, docs: [], today: todayIso() }
```

Em `src/cli/changelog.ts`, o mesmo import e:

```typescript
const context = { root, config, docs: [], today: todayIso() }
```

Em `src/cli/init.ts`, troque a função local pela fonte única — apague:

```typescript
function today(): string {
  return new Date().toISOString().slice(0, 10)
}
```

e passe a importar e usar `todayIso`:

```typescript
import { todayIso } from '../core/dates.ts'
```

```typescript
    TODAY: todayIso(),
```

Duas fontes de data num toolkit que acabou de decidir ter uma só é a
incoerência que `ADR-0007` existe para não deixar nascer.

- [ ] **Step 10: Acertar os contextos dos testes existentes**

Quatro arquivos montam contexto na mão. Em cada um, acrescente
`today: '2026-08-27'`:

- `test/checks/ci1-structure.test.ts`, nas duas chamadas:
  `ci1Structure.run({ root, config, docs: collectArtifacts(root, config), today: '2026-08-27' })`
  e `ci1Structure.run({ root, config: parsed, docs: collectArtifacts(root, parsed), today: '2026-08-27' })`.
- `test/checks/ci2-ids.test.ts`:
  `ci2Ids.run({ root, config, docs: collectArtifacts(root, config), today: '2026-08-27' })`.
- `test/checks/ci5-contract-drift.test.ts`:
  `ci5ContractDrift(exec).run({ root, config, docs: [], today: '2026-08-27' })`.
- `test/checks/ci6-changelog-required.test.ts`, no helper:

```typescript
function contextFor(root: string, ownership = OWNERSHIP) {
  return {
    root,
    config: parseOwnership(ownership),
    docs: [],
    today: '2026-08-27',
  }
}
```

Data fixa, não `todayIso()`: um teste que lê o relógio é o defeito que esta task
acabou de tirar do código de produção.

- [ ] **Step 11: Rodar tudo**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Esperado: PASS, type-check limpo, `validate=0`.

- [ ] **Step 12: Commit**

```bash
git add src/core/dates.ts src/core/files.ts src/core/types.ts src/ids/coverage.ts src/cli/validate.ts src/cli/drift.ts src/cli/changelog.ts src/cli/init.ts test/core/dates.test.ts test/core/files.test.ts test/checks/ci1-structure.test.ts test/checks/ci2-ids.test.ts test/checks/ci5-contract-drift.test.ts test/checks/ci6-changelog-required.test.ts
git commit -m "feat(RNF-0004, ADR-0007): fonte de data injetável e varredura de arquivos compartilhada"
```

`src/cli/**` é caminho vigiado e `consumer-visible`, mas nada aqui muda o que o
comando faz de observável: `init` produz a mesma data, `validate` a mesma saída.
Se `CI-6` reclamar no PR, a resposta é o rótulo com a razão:
`Changelog: none — refatoração interna, nenhuma mudança observável`.

---

### Task 4: `documents:` — o documento sem família de IDs ganha dono

**Objetivo:** Implementar o que `ADR-0008` decidiu. É a peça que destrava
`CI-7`, e é o único ponto desta fase que muda o esquema do `.ownership.yml` —
por isso leva entrada de CHANGELOG.

**Files:**

- Modify: `src/config/ownership.ts` (`DocumentRule`, `parseDocument`, `findDocumentRule`, `documentWithRole`)
- Modify: `src/docs/collect.ts` (`DocumentDoc`, `collectDocuments`)
- Modify: `src/core/types.ts` (`CheckContext.documents`)
- Modify: `src/cli/validate.ts`, `src/cli/drift.ts`, `src/cli/changelog.ts`
- Modify: `test/config/ownership.test.ts`, `test/docs/collect.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consome: `asRecord`, `requireString`, `OwnershipError` (já em
  `src/config/ownership.ts`); `parseFrontmatter`; `listMarkdown` (privada de
  `src/docs/collect.ts`).
- Produz:
  - `DOCUMENT_ROLES: readonly ['agent-contract', 'definition-of-done']`
  - `type DocumentRole = 'agent-contract' | 'definition-of-done'`
  - `interface DocumentRule { path: string; owner: string; skill: string | null; role: DocumentRole | null }`
  - `OwnershipConfig.documents: DocumentRule[]`
  - `findDocumentRule(config: OwnershipConfig, repoPath: string): DocumentRule | null`
  - `documentWithRole(config: OwnershipConfig, role: DocumentRole): DocumentRule | null`
  - `interface DocumentDoc { file: string; rule: DocumentRule; source: string; frontmatter: Frontmatter | null }`
  - `collectDocuments(root: string, config: OwnershipConfig): DocumentDoc[]`
  - `CheckContext.documents: DocumentDoc[]`

**Requisitos:**

- `documents:` é opcional e o padrão é lista vazia: um `.ownership.yml` das
  fases anteriores continua válido.
- `path` e `owner` obrigatórios; `owner` começa com `@`. `skill` e `role`
  opcionais; `skill` presente e vazia é erro, ausente não é.
- `role` fora do vocabulário fechado é erro nomeando os válidos. Um papel
  declarado duas vezes é erro: um papel, um documento.
- `path` duplicado dentro de `documents:` é erro. As duas listas
  (`artifacts:` e `documents:`) **não** são cruzadas — `ADR-0008` registra isso
  como consequência aceita.
- `collectDocuments` lê só `.md`: `docs/.ownership.yml` e `docs/ids-retired.txt`
  têm dono e não têm frontmatter. Frontmatter com sintaxe inválida em documento
  vira `null`, sem exceção — `CI-1` não lê `documents:`, então não há quem
  reporte, e derrubar o `validate` inteiro por causa disso seria pior.

**`HK-5`:** vai perguntar por `docs/requirements/non-functional.md`
(`src/core/**`, por causa de `types.ts`) e por
`docs/requirements/functional.md` (`src/cli/**`). Resposta: viajaram na Task 2.
`src/config/ownership.ts` é `consumer-visible` — a entrada de CHANGELOG está no
Step 6 e **viaja neste commit**.

- [ ] **Step 1: Escrever o teste que falha — parser**

Acrescente a `test/config/ownership.test.ts` (e a `findDocumentRule`,
`documentWithRole` ao import de `../../src/config/ownership.ts`):

```typescript
const COM_DOCUMENTOS = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
documents:
  - path: CONTRIBUTING.md
    owner: "@time"
    skill: working-agreements-keeper
  - path: CLAUDE.md
    owner: "@time"
    skill: working-agreements-keeper
    role: agent-contract
  - path: docs/definition-of-done.md
    owner: "@time"
    skill: working-agreements-keeper
    role: definition-of-done
  - path: docs/superpowers/
    owner: "@time"
`

test('ADR-0008: documents declara caminho, dono, e skill/role opcionais', () => {
  const config = parseOwnership(COM_DOCUMENTOS)
  assert.equal(config.documents.length, 4)

  const contributing = config.documents[0]
  assert.equal(contributing?.path, 'CONTRIBUTING.md')
  assert.equal(contributing?.owner, '@time')
  assert.equal(contributing?.skill, 'working-agreements-keeper')
  assert.equal(contributing?.role, null)

  assert.equal(config.documents[3]?.skill, null, 'documento pode ter dono e não ter skill')
})

test('ADR-0008: documents ausente é lista vazia — configuração das fases anteriores continua válida', () => {
  const config = parseOwnership(`
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
`)
  assert.deepEqual(config.documents, [])
})

test('ADR-0008: documento sem caminho, com dono sem @, ou com skill vazia é recusado', () => {
  const semCaminho = COM_DOCUMENTOS.replace('  - path: CONTRIBUTING.md\n', '  - ')
  assert.throws(() => parseOwnership(semCaminho), /documents\[0\]/)

  const donoSemArroba = COM_DOCUMENTOS.replace('  - path: CONTRIBUTING.md\n    owner: "@time"', '  - path: CONTRIBUTING.md\n    owner: "time"')
  assert.throws(() => parseOwnership(donoSemArroba), /precisa começar com @/)

  const skillVazia = COM_DOCUMENTOS.replace('skill: working-agreements-keeper', 'skill: ""')
  assert.throws(() => parseOwnership(skillVazia), /skill/)
})

test('ADR-0008: role fora do vocabulário nomeia os válidos; papel repetido é recusado', () => {
  const roleEstranho = COM_DOCUMENTOS.replace('role: agent-contract', 'role: manifesto')
  assert.throws(() => parseOwnership(roleEstranho), /agent-contract, definition-of-done/)

  const repetido = COM_DOCUMENTOS.replace('role: definition-of-done', 'role: agent-contract')
  assert.throws(() => parseOwnership(repetido), /Um papel, um documento/)
})

test('ADR-0008: caminho declarado duas vezes em documents é recusado', () => {
  const duplicado = COM_DOCUMENTOS.replace('  - path: docs/superpowers/\n    owner: "@time"', '  - path: CONTRIBUTING.md\n    owner: "@time"')
  assert.throws(() => parseOwnership(duplicado), /Um documento, um dono/)
})

test('findDocumentRule resolve arquivo por igualdade e diretório por prefixo', () => {
  const config = parseOwnership(COM_DOCUMENTOS)
  assert.equal(findDocumentRule(config, 'CONTRIBUTING.md')?.owner, '@time')
  assert.equal(findDocumentRule(config, './CONTRIBUTING.md')?.owner, '@time')
  assert.equal(findDocumentRule(config, 'docs/superpowers/plans/x.md')?.path, 'docs/superpowers/')
  assert.equal(findDocumentRule(config, 'README.md'), null)
})

test('documentWithRole acha o documento pelo papel, sem conhecer caminho nenhum', () => {
  const config = parseOwnership(COM_DOCUMENTOS)
  assert.equal(documentWithRole(config, 'agent-contract')?.path, 'CLAUDE.md')
  assert.equal(documentWithRole(config, 'definition-of-done')?.path, 'docs/definition-of-done.md')

  const semContrato = parseOwnership(COM_DOCUMENTOS.replace('    role: agent-contract\n', ''))
  assert.equal(documentWithRole(semContrato, 'agent-contract'), null)
})
```

- [ ] **Step 2: Escrever o teste que falha — coleta**

Acrescente a `test/docs/collect.test.ts` (`collectDocuments` ao import de
`../../src/docs/collect.ts`, `parseOwnership` ao de
`../../src/config/ownership.ts`):

```typescript
const OWNERSHIP_COM_DOCUMENTOS = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
documents:
  - path: CONTRIBUTING.md
    owner: "@time"
    skill: working-agreements-keeper
  - path: CHANGELOG.md
    owner: "@time"
    skill: release-historian
  - path: docs/ids-retired.txt
    owner: "@time"
  - path: docs/superpowers/
    owner: "@time"
`

test('ADR-0008: collectDocuments lê só markdown, e frontmatter ausente não é erro', () => {
  withTempRepo(
    {
      'CONTRIBUTING.md':
        '---\ntitle: Como se contribui\nowner: "@time"\ntrigger: quando muda o processo\nlast-reviewed: 2026-08-01\n---\n\n# Como se contribui\n',
      'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
      'docs/ids-retired.txt': '# nenhum\n',
      'docs/superpowers/plans/um.md': '# plano\n',
    },
    root => {
      const documents = collectDocuments(root, parseOwnership(OWNERSHIP_COM_DOCUMENTOS))
      assert.deepEqual(documents.map(document => document.file).sort(), ['CHANGELOG.md', 'CONTRIBUTING.md', 'docs/superpowers/plans/um.md'])

      const contributing = documents.find(document => document.file === 'CONTRIBUTING.md')
      assert.equal(contributing?.frontmatter?.data.owner, '@time')

      const changelog = documents.find(document => document.file === 'CHANGELOG.md')
      assert.equal(changelog?.frontmatter, null, 'CHANGELOG não tem frontmatter, e isso é decisão da Fase 6')

      const plano = documents.find(document => document.file === 'docs/superpowers/plans/um.md')
      assert.equal(plano?.rule.skill, null)
    },
  )
})

test('ADR-0008: documento declarado e ausente do repositório não vira entrada', () => {
  withTempRepo({}, root => {
    assert.deepEqual(collectDocuments(root, parseOwnership(OWNERSHIP_COM_DOCUMENTOS)), [])
  })
})
```

- [ ] **Step 3: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/config/ownership.test.ts test/docs/collect.test.ts
```

Esperado: FAIL — `documents` não existe em `OwnershipConfig`, `collectDocuments`
não é exportada.

- [ ] **Step 4: Implementar em `src/config/ownership.ts`**

Acrescente, depois de `GeneratedRule`:

```typescript
/**
 * Papéis que o toolkit reconhece num documento (`ADR-0008`).
 *
 * Vocabulário fechado de propósito: é o que permite a `CI-7` achar o contrato do
 * agente e a Definition of Done sem conhecer caminho nenhum (spec §3). Papel
 * aberto seria configuração que o toolkit não sabe usar.
 */
export const DOCUMENT_ROLES = ['agent-contract', 'definition-of-done'] as const
export type DocumentRole = (typeof DOCUMENT_ROLES)[number]

/**
 * Documento com dono e **sem** família de IDs (`ADR-0008`, que resolve `DA-0002`).
 *
 * Não é artefato: não tem ciclo de vida, não é congelado por `HK-1`, e `CI-1`/
 * `CI-2` não o leem. O que ele tem é dono — e, quando existe uma, skill dona.
 */
export interface DocumentRule {
  path: string
  owner: string
  /** Skill dona, quando existe uma. `null` é informação, não erro. */
  skill: string | null
  role: DocumentRole | null
}
```

Acrescente `documents: DocumentRule[];` a `OwnershipConfig`, depois de
`generated`.

Extraia a normalização que `findArtifactRule` fazia inline, para que os dois
resolvedores usem a mesma:

```typescript
function normalizePath(repoPath: string): string {
  return repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** O caminho declarado cobre este caminho? Diretório por prefixo, arquivo por igualdade. */
function covers(declared: string, repoPath: string): boolean {
  const target = declared.replace(/\\/g, '/')
  return target.endsWith('/') ? repoPath.startsWith(target) : repoPath === target
}
```

e reescreva `findArtifactRule` usando as duas:

```typescript
/** Regra dona de um caminho relativo à raiz do repositório, ou null. */
export function findArtifactRule(config: OwnershipConfig, repoPath: string): ArtifactRule | null {
  const normalized = normalizePath(repoPath)
  return config.artifacts.find(artifact => covers(artifact.path, normalized)) ?? null
}
```

Acrescente o parser e os dois resolvedores:

```typescript
function parseDocument(raw: unknown, index: number): DocumentRule {
  const where = `documents[${index}]`
  const item = asRecord(raw, where)

  const owner = requireString(item, 'owner', where)
  if (!owner.startsWith('@')) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.owner "${owner}" precisa começar com @ e espelhar o CODEOWNERS.`)
  }

  const skill = item.skill
  if (skill !== undefined && (typeof skill !== 'string' || skill.trim() === '')) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.skill precisa ser uma string não vazia, ou ficar ausente — documento pode não ter skill dona.`)
  }

  const role = item.role
  if (role !== undefined && !DOCUMENT_ROLES.includes(role as DocumentRole)) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.role "${String(role)}" desconhecido. Válidos: ${DOCUMENT_ROLES.join(', ')}.`)
  }

  return {
    path: requireString(item, 'path', where),
    owner,
    skill: skill === undefined ? null : skill,
    role: role === undefined ? null : (role as DocumentRole),
  }
}

/** Documento dono de um caminho relativo, ou null. Mesma semântica de `findArtifactRule`. */
export function findDocumentRule(config: OwnershipConfig, repoPath: string): DocumentRule | null {
  const normalized = normalizePath(repoPath)
  return config.documents.find(document => covers(document.path, normalized)) ?? null
}

/** O documento que o projeto declarou com este papel, ou null. */
export function documentWithRole(config: OwnershipConfig, role: DocumentRole): DocumentRule | null {
  return config.documents.find(document => document.role === role) ?? null
}
```

Dentro de `parseOwnership`, depois do bloco de `generated`:

```typescript
const documentsRaw = Array.isArray(root.documents) ? root.documents : []
const documents = documentsRaw.map(parseDocument)

const seenDocuments = new Set<string>()
const seenRoles = new Set<string>()
for (const document of documents) {
  if (seenDocuments.has(document.path)) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: documento "${document.path}" declarado duas vezes. Um documento, um dono.`)
  }
  seenDocuments.add(document.path)

  if (document.role === null) continue
  if (seenRoles.has(document.role)) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: papel "${document.role}" declarado em dois documentos. Um papel, um documento.`)
  }
  seenRoles.add(document.role)
}
```

e acrescente `documents,` ao objeto devolvido.

- [ ] **Step 5: Implementar `collectDocuments` em `src/docs/collect.ts`**

Acrescente `DocumentRule` ao import de `../config/ownership.ts` e, ao fim do
arquivo:

```typescript
export interface DocumentDoc {
  /** Caminho relativo à raiz do repositório, sempre com `/`. */
  file: string
  rule: DocumentRule
  source: string
  /** `null` quando o documento não tem frontmatter — o que é legítimo (`CHANGELOG.md`). */
  frontmatter: Frontmatter | null
}

/**
 * Documentos declarados em `documents:` que existem no repositório (`ADR-0008`).
 *
 * Só markdown: `docs/.ownership.yml` e `docs/ids-retired.txt` têm dono e não têm
 * frontmatter, e nada nesta fase pergunta a eles a data de revisão. Frontmatter
 * com sintaxe inválida vira `null` em silêncio, porque `CI-1` não lê `documents:`
 * e derrubar o `validate` por causa disso seria pior do que não reportar.
 */
export function collectDocuments(root: string, config: OwnershipConfig): DocumentDoc[] {
  const documents: DocumentDoc[] = []

  for (const rule of config.documents) {
    const target = rule.path.replace(/\\/g, '/')
    const files = target.endsWith('/') ? listMarkdown(root, target) : [target]

    for (const file of files) {
      if (!file.endsWith('.md')) continue

      let source: string
      try {
        source = readFileSync(join(root, file), 'utf8')
      } catch {
        continue // declarado e ausente: quem cobra ausência é CI-7, não a coleta
      }

      let frontmatter: Frontmatter | null = null
      try {
        frontmatter = parseFrontmatter(source)
      } catch {
        frontmatter = null
      }

      documents.push({ file, rule, source, frontmatter })
    }
  }

  return documents
}
```

- [ ] **Step 6: Ligar ao `CheckContext` e ao CLI, e escrever a entrada de CHANGELOG**

Em `src/core/types.ts`, acrescente a `CheckContext`:

```typescript
  /** Documentos sem família de IDs, declarados em `documents:` (`ADR-0008`). */
  documents: DocumentDoc[];
```

e troque o import por
`import type { ArtifactDoc, DocumentDoc } from '../docs/collect.ts';`

Em `src/cli/validate.ts`:

```typescript
import { collectArtifacts, collectDocuments } from '../docs/collect.ts'
```

```typescript
const docs = collectArtifacts(root, config)
const context = {
  root,
  config,
  docs,
  documents: collectDocuments(root, config),
  today: todayIso(),
}
```

Em `src/cli/drift.ts` e `src/cli/changelog.ts`, acrescente `documents: []` ao
contexto — `CI-5` e `CI-6` não leem documento nenhum, e declarar isso é mais
honesto que coletar por hábito.

Em `CHANGELOG.md`, sob `## [Unreleased]`, na subseção `### Added`:

```markdown
- `documents:` no `docs/.ownership.yml`: declara documento com dono e sem família
  de IDs (`CONTRIBUTING.md`, a Definition of Done, o contrato do agente,
  `CHANGELOG.md`) com `path`, `owner`, `skill` opcional e `role` opcional
  (`agent-contract`, `definition-of-done`). A chave é opcional: configuração
  escrita nas versões anteriores continua válida.
```

- [ ] **Step 7: Rodar tudo**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Esperado: PASS, type-check limpo, `validate=0`.

- [ ] **Step 8: Commit**

```bash
git add src/config/ownership.ts src/docs/collect.ts src/core/types.ts src/cli/validate.ts src/cli/drift.ts src/cli/changelog.ts test/config/ownership.test.ts test/docs/collect.test.ts CHANGELOG.md
git commit -m "feat(ADR-0008, RN-0016): documents: no .ownership.yml — documento sem família de IDs ganha dono"
```

`DA-0002` **não** muda de estado aqui. Promover `open → resolved` é ato humano
(`RN-0005`) e é a Task 14.

---

### Task 5: `CI-4` — staleness e dívida vencida

**Objetivo:** O check que fecha o critério de aceite 7 da spec §12, e o único
autorizado a produzir aviso. Duas metades independentes: documento vencido
(aviso) e dívida com gatilho cumprido (erro). As funções que ele exporta são as
mesmas que `HK-6` vai usar na Task 10 — o inventário do `SessionStart` não
reimplementa nada.

**Files:**

- Create: `src/checks/ci4-staleness.ts`
- Test: `test/checks/ci4-staleness.test.ts`

**Interfaces:**

- Consome: `Check`, `CheckContext`, `Finding` de `src/core/types.ts`;
  `asIsoDate`, `monthsBetween` de `src/core/dates.ts`; `listFiles`,
  `readTextFile` de `src/core/files.ts`; `FROZEN_STATUSES`, `statesFor` de
  `src/docs/schema.ts`.
- Produz:
  - `interface StaleDoc { file: string; line: number; months: number; skill: string | null }`
  - `interface PayWhen { pattern: string; paths: string[] }`
  - `type PayWhenProblem = 'ausente' | 'incompleto' | 'padrão inválido'`
  - `interface DebtWithoutTrigger { file: string; line: number; id: string; problem: PayWhenProblem }`
  - `interface DuePayment { file: string; line: number; id: string; pattern: string; evidence: string }`
  - `payWhenOf(data: Record<string, unknown>): PayWhen | PayWhenProblem`
  - `staleDocs(context: CheckContext): StaleDoc[]`
  - `debtsWithoutTrigger(context: CheckContext): DebtWithoutTrigger[]`
  - `duePayments(context: CheckContext): DuePayment[]`
  - `ci4Staleness: Check`

**Requisitos:**

- Aviso: `last-reviewed` com mais meses que `stale-after-months`. **Item em
  estado congelado nunca vence** (`ADR-0007`, decisão 7): avisar sobre ADR
  aceito só ensinaria o bump em massa que a spec §13 recusa.
- Documento de `documents:` sem frontmatter não vence — não há campo. Documento
  com `last-reviewed` fora de ISO também não: `CI-1` já cobra o formato dos
  artefatos, e para documento não há quem cobre; inventar um segundo relator
  seria ruído.
- Erro: dívida `open` cujo `pay-when` casa em algum arquivo dos `paths`. A
  finding aponta o **arquivo da dívida** (é lá que a correção mora) e traz a
  evidência (`arquivo:linha`) no texto.
- Erro: dívida `open` sem `pay-when` verificável, com o problema nomeado —
  ausente, incompleto, ou padrão que não compila.
- Família de dívida é a que declara `paid` em `statesFor` (spec §4), não o
  prefixo `TDR`.
- O padrão é reconhecido **linha a linha**, e o arquivo da própria dívida sai da
  varredura: um TDR que cita o próprio gatilho não é ocorrência dele.
- `CI-4` não escreve nada e não executa comando nenhum. Ele lê a árvore.

**`HK-5`:** vai perguntar por `docs/requirements/rules.md` (caminho vigiado
`src/checks/**`). Resposta: o doc dono viajou na Task 2, com `RN-0018` e
`RN-0019`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `test/checks/ci4-staleness.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ci4Staleness, duePayments, debtsWithoutTrigger, payWhenOf, staleDocs } from '../../src/checks/ci4-staleness.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const HOJE = '2026-08-27'

const OWNERSHIP = `
version: 1
stale-after-months: 6
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
    append-only: true
    mutable-fields: [status, superseded-by, last-reviewed]
  - id-prefix: TDR
    path: docs/decisions/debt/
    owner: "@time"
    skill: decision-recorder
    append-only: true
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@time"
    skill: requirements-keeper
    collection: sections
documents:
  - path: CONTRIBUTING.md
    owner: "@time"
    skill: working-agreements-keeper
  - path: CHANGELOG.md
    owner: "@time"
    skill: release-historian
`

function contextFor(root: string, ownership = OWNERSHIP) {
  const config = parseOwnership(ownership)
  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: HOJE,
  }
}

function adr(status: string, lastReviewed: string): string {
  return [
    '---',
    'id: ADR-0001',
    'title: Decisão de teste',
    `status: ${status}`,
    'owner: "@time"',
    'trigger: Nunca. Imutável após aceito.',
    `last-reviewed: ${lastReviewed}`,
    'relates-to: [RN-0001]',
    '---',
    '',
    'corpo',
  ].join('\n')
}

/** `pay-when` em YAML com aspas simples: aspas simples não processam `\`, e o padrão é regex. */
const PAY_WHEN = ['pay-when:', "  pattern: '^- \\*\\*status:\\*\\* revoked'", '  paths: ["docs/requirements/**"]']

function debt(status: string, extra: readonly string[] = []): string {
  return [
    '---',
    'id: TDR-0001',
    'title: Atalho de teste',
    `status: ${status}`,
    'owner: "@time"',
    'trigger: Quando o gatilho de pagamento abaixo se cumprir.',
    'last-reviewed: 2026-08-01',
    ...extra,
    '---',
    '',
    '# TDR-0001 — Atalho de teste',
    '',
    'O gatilho é o primeiro PR que revogar um requisito.',
  ].join('\n')
}

const RULES_ATIVA = [
  '---',
  'title: Regras',
  'owner: "@time"',
  'trigger: A toda regra nova.',
  'last-reviewed: 2026-08-20',
  '---',
  '',
  '## RN-0001 — Uma regra qualquer',
  '',
  '- **status:** active',
  '',
  'O enunciado.',
].join('\n')

const RULES_REVOGADA = RULES_ATIVA.replace('- **status:** active', '- **status:** revoked')

test('RN-0018: documento além do limite avisa, e aviso não é erro', () => {
  withTempRepo(
    {
      'docs/decisions/adr/ADR-0001-a.md': adr('draft', '2026-01-01'),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      const findings = ci4Staleness.run(contextFor(root))
      const aviso = findings.find(finding => finding.file === 'docs/decisions/adr/ADR-0001-a.md')

      assert.ok(aviso, 'ADR revisado em janeiro deveria vencer em agosto')
      assert.equal(aviso.ruleId, 'CI-4')
      assert.equal(aviso.severity, 'warning')
      assert.match(aviso.message, /7 meses/)
      assert.match(aviso.message, /stale-after-months/)
      assert.match(aviso.fix, /bump em massa/i)
      assert.equal(
        findings.some(finding => finding.severity === 'error'),
        false,
      )
    },
  )
})

test('ADR-0007: item congelado não vence — avisar sobre ele ensinaria o bump em massa', () => {
  withTempRepo(
    {
      'docs/decisions/adr/ADR-0001-a.md': adr('accepted', '2020-01-01'),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.deepEqual(staleDocs(contextFor(root)), [])
    },
  )
})

test('RN-0018: documento de `documents:` vence; sem frontmatter, não tem o que vencer', () => {
  withTempRepo(
    {
      'docs/requirements/rules.md': RULES_ATIVA,
      'CONTRIBUTING.md':
        '---\ntitle: Como se contribui\nowner: "@time"\ntrigger: quando muda o processo\nlast-reviewed: 2025-01-01\n---\n\n# Como se contribui\n',
      'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
    },
    root => {
      const stale = staleDocs(contextFor(root))
      assert.deepEqual(
        stale.map(item => item.file),
        ['CONTRIBUTING.md'],
      )
      assert.equal(stale[0]?.skill, 'working-agreements-keeper')
    },
  )
})

test('RN-0019: dívida `open` sem `pay-when` é erro, com o problema nomeado', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open'),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      const semGatilho = debtsWithoutTrigger(contextFor(root))
      assert.deepEqual(
        semGatilho.map(item => [item.id, item.problem]),
        [['TDR-0001', 'ausente']],
      )

      const findings = ci4Staleness.run(contextFor(root))
      const erro = findings.find(finding => finding.severity === 'error')
      assert.ok(erro)
      assert.equal(erro.file, 'docs/decisions/debt/TDR-0001-x.md')
      assert.match(erro.message, /TDR-0001/)
      assert.match(erro.fix, /pay-when/)
    },
  )
})

test('RN-0019: `pay-when` incompleto e padrão que não compila são erros distintos', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', ['pay-when:', '  paths: ["docs/**"]']),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.equal(debtsWithoutTrigger(contextFor(root))[0]?.problem, 'incompleto')
    },
  )

  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', ['pay-when:', "  pattern: '([('", '  paths: ["docs/**"]']),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.equal(debtsWithoutTrigger(contextFor(root))[0]?.problem, 'padrão inválido')
    },
  )
})

test('critério 7: dívida com gatilho cumprido reprova, e a evidência aparece', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', PAY_WHEN),
      'docs/requirements/rules.md': RULES_REVOGADA,
    },
    root => {
      const due = duePayments(contextFor(root))
      assert.equal(due.length, 1)
      assert.equal(due[0]?.id, 'TDR-0001')
      assert.match(due[0]?.evidence ?? '', /^docs\/requirements\/rules\.md:\d+$/)

      const findings = ci4Staleness.run(contextFor(root))
      const erro = findings.find(finding => finding.severity === 'error')
      assert.ok(erro)
      assert.equal(erro.file, 'docs/decisions/debt/TDR-0001-x.md')
      assert.match(erro.message, /gatilho de pagamento já aconteceu/)
      assert.match(erro.message, /docs\/requirements\/rules\.md/)
      assert.match(erro.fix, /paid|accepted-permanently/)
    },
  )
})

test('critério 7: sem a condição no repositório, a dívida `open` passa', () => {
  withTempRepo(
    {
      'docs/decisions/debt/TDR-0001-x.md': debt('open', PAY_WHEN),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.deepEqual(duePayments(contextFor(root)), [])
      assert.deepEqual(debtsWithoutTrigger(contextFor(root)), [])
    },
  )
})

test('critério 7: dívida paga ou aceita permanentemente sai da conta', () => {
  for (const status of ['paid', 'accepted-permanently']) {
    withTempRepo(
      {
        'docs/decisions/debt/TDR-0001-x.md': debt(status, PAY_WHEN),
        'docs/requirements/rules.md': RULES_REVOGADA,
      },
      root => {
        assert.deepEqual(duePayments(contextFor(root)), [], `status ${status} não deveria vencer`)
        assert.deepEqual(debtsWithoutTrigger(contextFor(root)), [])
      },
    )
  }
})

test('ADR-0007: o próprio arquivo da dívida não conta como ocorrência do gatilho', () => {
  withTempRepo(
    {
      // O corpo da dívida contém, literalmente, o texto que o padrão procura.
      'docs/decisions/debt/TDR-0001-x.md': `${debt('open', [
        'pay-when:',
        "  pattern: 'status: revoked'",
        '  paths: ["docs/**"]',
      ])}\n\nO gatilho é qualquer seção que vire \`status: revoked\`.\n`,
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      assert.deepEqual(duePayments(contextFor(root)), [], 'citar o gatilho não é cumpri-lo')
    },
  )
})

test('payWhenOf distingue ausente, incompleto e válido', () => {
  assert.equal(payWhenOf({}), 'ausente')
  assert.equal(payWhenOf({ 'pay-when': 'quando der tempo' }), 'incompleto')
  assert.equal(payWhenOf({ 'pay-when': { pattern: 'x' } }), 'incompleto')
  assert.equal(payWhenOf({ 'pay-when': { pattern: 'x', paths: [] } }), 'incompleto')
  assert.deepEqual(payWhenOf({ 'pay-when': { pattern: 'x', paths: ['src/**'] } }), {
    pattern: 'x',
    paths: ['src/**'],
  })
})

test('CI-4 é o único check que avisa: nada aqui reprova por documento vencido', () => {
  withTempRepo(
    {
      'docs/decisions/adr/ADR-0001-a.md': adr('draft', '2019-01-01'),
      'docs/requirements/rules.md': RULES_ATIVA,
    },
    root => {
      const findings = ci4Staleness.run(contextFor(root))
      assert.ok(findings.length > 0)
      assert.ok(findings.every(finding => finding.severity === 'warning'))
    },
  )
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/checks/ci4-staleness.test.ts
```

Esperado: FAIL — módulo não encontrado.

- [ ] **Step 3: Escrever `src/checks/ci4-staleness.ts`**

```typescript
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { asIsoDate, monthsBetween } from '../core/dates.ts'
import { listFiles, readTextFile } from '../core/files.ts'
import { FROZEN_STATUSES, statesFor } from '../docs/schema.ts'

const RULE = 'CI-4'

/**
 * O estado que identifica uma família de dívida (spec §4: `open → paid`).
 *
 * A identificação é pela máquina de estados, não pelo prefixo `TDR`: um projeto
 * que chame sua família de outra coisa e declare `states:` continua coberto, e o
 * check não ganha uma lista de prefixos para manter (`ADR-0007`, decisão 4).
 */
const DEBT_STATE = 'paid'

export interface StaleDoc {
  file: string
  line: number
  months: number
  skill: string | null
}

export interface PayWhen {
  /** Expressão regular reconhecida linha a linha. */
  pattern: string
  paths: string[]
}

export type PayWhenProblem = 'ausente' | 'incompleto' | 'padrão inválido'

export interface DebtWithoutTrigger {
  file: string
  line: number
  id: string
  problem: PayWhenProblem
}

export interface DuePayment {
  file: string
  line: number
  id: string
  pattern: string
  /** Onde a condição foi encontrada, no formato `arquivo:linha`. */
  evidence: string
}

function finding(severity: 'error' | 'warning') {
  return (file: string, line: number, message: string, fix: string): Finding => ({
    ruleId: RULE,
    file,
    line,
    severity,
    message,
    fix,
  })
}

const warning = finding('warning')
const error = finding('error')

interface Reviewable {
  file: string
  line: number
  status: string | null
  lastReviewed: string | null
  skill: string | null
}

/** Tudo que declara data de revisão: artefato, container de coleção e documento. */
function reviewables(context: CheckContext): Reviewable[] {
  const found: Reviewable[] = []

  for (const doc of context.docs) {
    const frontmatter = doc.frontmatter
    if (!frontmatter) continue
    found.push({
      file: doc.file,
      line: frontmatter.lines['last-reviewed'] ?? 1,
      status: typeof frontmatter.data.status === 'string' ? frontmatter.data.status : null,
      lastReviewed: asIsoDate(frontmatter.data['last-reviewed']),
      skill: doc.rule.skill,
    })
  }

  for (const document of context.documents) {
    const frontmatter = document.frontmatter
    // Documento sem frontmatter não tem o que vencer — é o caso do CHANGELOG,
    // que a Fase 6 deixou sem de propósito.
    if (!frontmatter) continue
    found.push({
      file: document.file,
      line: frontmatter.lines['last-reviewed'] ?? 1,
      status: typeof frontmatter.data.status === 'string' ? frontmatter.data.status : null,
      lastReviewed: asIsoDate(frontmatter.data['last-reviewed']),
      skill: document.rule.skill,
    })
  }

  return found
}

/** Documentos revisados há mais tempo que o projeto aceita. */
export function staleDocs(context: CheckContext): StaleDoc[] {
  const limit = context.config.staleAfterMonths
  const stale: StaleDoc[] = []

  for (const item of reviewables(context)) {
    if (item.lastReviewed === null) continue
    // Item congelado não se revisa (ADR-0007, decisão 7).
    if (item.status !== null && FROZEN_STATUSES.has(item.status)) continue

    const months = monthsBetween(item.lastReviewed, context.today)
    if (months === null || months <= limit) continue

    stale.push({
      file: item.file,
      line: item.line,
      months,
      skill: item.skill,
    })
  }

  return stale
}

interface Debt {
  file: string
  line: number
  id: string
  data: Record<string, unknown>
}

function openDebts(context: CheckContext): Debt[] {
  const debts: Debt[] = []

  for (const doc of context.docs) {
    if (doc.rule.collection !== 'per-file') continue
    if (!statesFor(doc.rule)?.includes(DEBT_STATE)) continue

    const frontmatter = doc.frontmatter
    if (!frontmatter || frontmatter.data.status !== 'open') continue

    debts.push({
      file: doc.file,
      line: frontmatter.lines['pay-when'] ?? frontmatter.lines.status ?? 1,
      id: typeof frontmatter.data.id === 'string' ? frontmatter.data.id : doc.file,
      data: frontmatter.data,
    })
  }

  return debts
}

/** O `pay-when` do frontmatter, ou o problema que o torna inútil. */
export function payWhenOf(data: Record<string, unknown>): PayWhen | PayWhenProblem {
  const raw = data['pay-when']
  if (raw === undefined || raw === null) return 'ausente'
  if (typeof raw !== 'object' || Array.isArray(raw)) return 'incompleto'

  const record = raw as Record<string, unknown>
  const pattern = record.pattern
  const paths = record.paths

  if (typeof pattern !== 'string' || pattern.trim() === '') return 'incompleto'
  if (!Array.isArray(paths) || paths.length === 0) return 'incompleto'
  if (paths.some(path => typeof path !== 'string' || path.trim() === '')) return 'incompleto'

  try {
    new RegExp(pattern)
  } catch {
    return 'padrão inválido'
  }

  return { pattern, paths: paths as string[] }
}

/** Dívidas `open` cujo gatilho de pagamento não é verificável (`RN-0019`). */
export function debtsWithoutTrigger(context: CheckContext): DebtWithoutTrigger[] {
  const found: DebtWithoutTrigger[] = []

  for (const debt of openDebts(context)) {
    const payWhen = payWhenOf(debt.data)
    if (typeof payWhen === 'string') {
      found.push({
        file: debt.file,
        line: debt.line,
        id: debt.id,
        problem: payWhen,
      })
    }
  }

  return found
}

/** Dívidas `open` cujo gatilho já aconteceu, com a evidência (spec §12, critério 7). */
export function duePayments(context: CheckContext): DuePayment[] {
  const due: DuePayment[] = []

  for (const debt of openDebts(context)) {
    const payWhen = payWhenOf(debt.data)
    if (typeof payWhen === 'string') continue // quem reporta é debtsWithoutTrigger

    const pattern = new RegExp(payWhen.pattern)

    for (const file of listFiles(context.root, payWhen.paths)) {
      // O próprio arquivo da dívida cita o gatilho em prosa; citar não é cumprir.
      if (file === debt.file) continue

      const source = readTextFile(context.root, file)
      if (source === null) continue

      const at = source
        .replace(/\r\n/g, '\n')
        .split('\n')
        .findIndex(line => pattern.test(line))
      if (at === -1) continue

      due.push({
        file: debt.file,
        line: debt.line,
        id: debt.id,
        pattern: payWhen.pattern,
        evidence: `${file}:${at + 1}`,
      })
      break
    }
  }

  return due
}

/**
 * `CI-4` — staleness. O **único** check autorizado a apenas avisar (spec §9), e
 * só na metade do `last-reviewed`: a correção ali é ler o documento, e build
 * vermelho empurra para o bump em massa que a spec §13 recusa. A metade da
 * dívida reprova, porque é ela que fecha o critério de aceite 7.
 *
 * Regras de origem: `RN-0018`, `RN-0019`.
 */
export const ci4Staleness: Check = {
  id: RULE,
  name: 'staleness',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = []
    const limit = context.config.staleAfterMonths

    for (const stale of staleDocs(context)) {
      findings.push(
        warning(
          stale.file,
          stale.line,
          `\`last-reviewed\` tem ${stale.months} meses e o limite deste projeto é ${limit} (\`stale-after-months\`).`,
          `Releia o documento e, se ele ainda é verdade, atualize \`last-reviewed\`${
            stale.skill === null ? '' : ` (skill dona: ${stale.skill})`
          }. Bump sem leitura, ou bump em massa, é anti-requisito da spec §13: desliga o mecanismo fingindo cumpri-lo.`,
        ),
      )
    }

    for (const debt of debtsWithoutTrigger(context)) {
      findings.push(
        error(
          debt.file,
          debt.line,
          `${debt.id} está \`open\` e o gatilho de pagamento não é verificável: \`pay-when\` ${debt.problem}.`,
          'Declare `pay-when` com `pattern` (regex, em aspas simples) e `paths` (globs onde procurá-lo) — ' +
            'uma condição que alguém consegue apontar acontecendo (`RN-0019`, `ADR-0007`; skill dona: decision-recorder). ' +
            'Dívida sem gatilho verificável é `TODO` órfão com número.',
        ),
      )
    }

    for (const payment of duePayments(context)) {
      findings.push(
        error(
          payment.file,
          payment.line,
          `${payment.id} está \`open\` e o gatilho de pagamento já aconteceu: ${payment.evidence} casa \`${payment.pattern}\`.`,
          'Pague a dívida, ou reclassifique-a (`paid`, `accepted-permanently`) — as duas coisas são ato humano ' +
            '(`RN-0005`, e `HK-3` intercepta). Enquanto ela seguir `open` com o gatilho cumprido, o CI reprova ' +
            '(spec §12, critério 7).',
        ),
      )
    }

    return findings
  },
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec toolkit node --test test/checks/ci4-staleness.test.ts
docker compose exec toolkit npm run typecheck
```

Esperado: PASS e type-check limpo. `CI-4` ainda **não** está registrado em
`validate` — isso é a Task 9, e é lá que o dogfooding acontece.

- [ ] **Step 5: Commit**

```bash
git add src/checks/ci4-staleness.ts test/checks/ci4-staleness.test.ts
git commit -m "feat(RN-0018, RN-0019, ADR-0007): CI-4 — staleness avisa, dívida vencida reprova"
```

---

### Task 6: `CI-7` — ownership coverage

**Objetivo:** O check com mais partes desta fase, e o que fecha a segunda metade
do critério 5. Quatro classes de achado, e nenhuma delas conhece caminho de
projeto: dono nos dois lugares, vínculo de `watches` que resolve, contrato do
agente sem texto copiado, e item de DoD com verificação nomeada. A quinta —
o diff — entra por injeção, como em `CI-5` e `CI-6`.

**Files:**

- Create: `src/config/codeowners.ts`
- Create: `src/docs/corpus.ts`
- Create: `src/docs/markdown.ts`
- Create: `src/checks/exception-label.ts`
- Create: `src/checks/ci7-ownership-coverage.ts`
- Modify: `src/checks/ci6-changelog-required.ts` (passa a usar `exceptionReasonFor`)
- Test: `test/config/codeowners.test.ts`
- Test: `test/docs/markdown.test.ts`
- Test: `test/docs/corpus.test.ts`
- Test: `test/checks/ci7-ownership-coverage.test.ts`

**Interfaces:**

- Consome: `findArtifactRule`, `findDocumentRule`, `documentWithRole`,
  `OWNERSHIP_PATH` de `src/config/ownership.ts`; `pendingDocs` de
  `src/config/watches.ts`; `listFiles` de `src/core/files.ts` (dentro de
  `src/docs/corpus.ts`); `DiffFacts` de `src/checks/ci6-changelog-required.ts`.
- Produz:
  - `src/config/codeowners.ts`: `CODEOWNERS_PATHS`, `interface CodeownersEntry`,
    `interface Codeowners`, `parseCodeowners(source: string): CodeownersEntry[]`,
    `loadCodeowners(root: string): Codeowners | null`,
    `ownersOf(codeowners: Codeowners, repoPath: string): string[] | null`
  - `src/docs/corpus.ts`: `docsRoot(): string`,
    `declaredPaths(config: OwnershipConfig): string[]`,
    `documentationFiles(root: string, config: OwnershipConfig): string[]`
  - `src/docs/markdown.ts`: `stripCode(source: string): string`,
    `normalizeProse(text: string): string`,
    `sentencesOf(source: string): { text: string; line: number }[]`
  - `src/checks/exception-label.ts`:
    `exceptionReasonFor(label: string, messages: readonly string[]): string | null`
  - `src/checks/ci7-ownership-coverage.ts`: `WORD_FLOOR`,
    `duplicatedSentences(contract, corpus)`,
    `dodItemsWithoutVerification(source: string)`,
    `docsExceptionReason(messages: readonly string[]): string | null`,
    `ci7OwnershipCoverage(diff?: DiffFacts | null): Check`

**Requisitos:**

- A raiz da documentação vem de `OWNERSHIP_PATH`, não de um literal `docs/`. É
  o único caminho que o toolkit conhece desde a Fase 0, e derivar dele é o que
  mantém a spec §3 verdadeira.
- Corpus = tudo sob a raiz da documentação **mais** todo caminho declarado que
  mora fora dela e existe. `CONTRIBUTING.md`, `CHANGELOG.md` e o contrato do
  agente entram por aí; `README.md` só entra se o projeto o declarar.
- Dono nos **dois** lugares: entrada no `.ownership.yml` (`artifacts:`,
  `documents:` ou `generated:`) e linha no CODEOWNERS. CODEOWNERS ausente é
  **uma** finding, não uma por arquivo.
- Vínculo de `watches` cujo `doc` não existe, ou existe e não tem dono
  declarado, é erro de configuração — reportado em `docs/.ownership.yml`.
- Duplicação: só o documento com `role: agent-contract`, contra o corpus de
  artefatos e documentos **com skill dona**, com piso de `WORD_FLOOR` palavras
  (`ADR-0009`). Sem papel declarado, a classe não roda.
- DoD: só o documento com `role: definition-of-done`. Item é linha de caixa
  (`- [ ]` / `- [x]`) e precisa citar `CI-n`, `HK-n`, `AG-n`, `SK-n`, ou a
  palavra que marca verificação humana.
- Diff: só quando `diff` não é `null`. `Docs: none — <razão>` em qualquer
  mensagem do intervalo libera tudo (`ADR-0010`).
- Reconhecimento de CODEOWNERS deliberadamente estreito: prefixo de diretório,
  igualdade de arquivo, `*` e glob simples. `CI-7` responde "tem dono
  declarado?", não "qual dono o GitHub escolheria" — imitar as regras completas
  pela metade afirmaria uma precisão que o check não tem.

**`HK-5`:** vai perguntar por `docs/requirements/rules.md` (`src/checks/**`).
Resposta: o doc dono viajou na Task 2, com `RN-0016`, `RN-0017`, `RN-0020` e
`RN-0021`.

- [ ] **Step 1: O teste que falha — CODEOWNERS**

Crie `test/config/codeowners.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { loadCodeowners, ownersOf, parseCodeowners } from '../../src/config/codeowners.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const CODEOWNERS = `# Espelha o owner de docs/.ownership.yml
docs/decisions/adr/    @time
docs/open-decisions.md    @produto @time
/CONTRIBUTING.md    @time
docs/contracts/*.md    @contratos
sem-dono.md
`

test('parseCodeowners ignora comentário e linha vazia, e guarda só handles', () => {
  const entries = parseCodeowners(CODEOWNERS)
  assert.equal(entries.length, 5)
  assert.deepEqual(entries[1]?.owners, ['@produto', '@time'])
  assert.equal(entries[1]?.line, 3)
  assert.deepEqual(entries[4]?.owners, [], 'padrão sem handle não declara dono')
})

test('ownersOf cobre diretório por prefixo, arquivo por igualdade, e ignora a barra inicial', () => {
  const codeowners = {
    file: 'CODEOWNERS',
    entries: parseCodeowners(CODEOWNERS),
  }

  assert.deepEqual(ownersOf(codeowners, 'docs/decisions/adr/ADR-0001-x.md'), ['@time'])
  assert.deepEqual(ownersOf(codeowners, 'docs/open-decisions.md'), ['@produto', '@time'])
  assert.deepEqual(ownersOf(codeowners, 'CONTRIBUTING.md'), ['@time'])
  assert.deepEqual(ownersOf(codeowners, 'docs/contracts/errors.md'), ['@contratos'])
  assert.equal(ownersOf(codeowners, 'docs/glossary.md'), null)
  assert.equal(ownersOf(codeowners, 'sem-dono.md'), null, 'padrão sem handle não cobre nada')
})

test('ownersOf: `*` cobre tudo, e a última regra que casa ganha', () => {
  const codeowners = {
    file: 'CODEOWNERS',
    entries: parseCodeowners('*    @todos\ndocs/    @docs\n'),
  }
  assert.deepEqual(ownersOf(codeowners, 'qualquer/coisa.ts'), ['@todos'])
  assert.deepEqual(ownersOf(codeowners, 'docs/x.md'), ['@docs'])
})

test('loadCodeowners procura nos três lugares e devolve null quando não há nenhum', () => {
  withTempRepo({ '.github/CODEOWNERS': 'docs/    @time\n' }, root => {
    assert.equal(loadCodeowners(root)?.file, '.github/CODEOWNERS')
  })
  withTempRepo(
    {
      'CODEOWNERS': 'docs/    @time\n',
      '.github/CODEOWNERS': 'x    @outro\n',
    },
    root => {
      assert.equal(loadCodeowners(root)?.file, 'CODEOWNERS', 'a raiz vem primeiro')
    },
  )
  withTempRepo({ 'README.md': '' }, root => {
    assert.equal(loadCodeowners(root), null)
  })
})
```

- [ ] **Step 2: O teste que falha — markdown e corpus**

Crie `test/docs/markdown.test.ts`:

`````typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeProse, sentencesOf, stripCode } from '../../src/docs/markdown.ts'

test('stripCode apaga bloco cercado e código inline, preservando a contagem de linhas', () => {
  const source = ['prosa com `[[wikilink]]` dentro', '', '```ts', 'const x = /\\]\\(/;', '```', 'depois'].join('\n')
  const stripped = stripCode(source)

  assert.equal(stripped.split('\n').length, source.split('\n').length, 'a linha do achado depende disto')
  assert.equal(stripped.includes('wikilink'), false, 'código inline não é link')
  assert.equal(stripped.includes('const x'), false)
  assert.ok(stripped.includes('depois'))
})

test('stripCode fecha o bloco só com cerca do mesmo tamanho ou maior', () => {
  const source = ['````markdown', 'exemplo', '```ts', 'const y = 1;', '```', 'ainda dentro', '````', 'fora'].join('\n')
  const stripped = stripCode(source)

  assert.equal(stripped.includes('ainda dentro'), false, 'a cerca de 3 não fecha a de 4')
  assert.ok(stripped.includes('fora'))
})

test('normalizeProse tira marcação, pontuação e caixa', () => {
  assert.equal(normalizeProse('**A regra** vem antes do `código`!'), 'a regra vem antes do código')
  assert.equal(normalizeProse('  espaço   colapsado  '), 'espaço colapsado')
})

test('sentencesOf junta parágrafo antes de cortar, e corta em lista e título', () => {
  const source = ['# Título', '', 'Uma frase que a prosa', 'quebrou em duas linhas. E outra depois.', '', '- item de lista', '- outro item'].join('\n')

  const sentences = sentencesOf(source).map(sentence => sentence.text)
  assert.deepEqual(sentences, ['Título', 'Uma frase que a prosa quebrou em duas linhas.', 'E outra depois.', 'item de lista', 'outro item'])
  assert.equal(sentencesOf(source)[1]?.line, 3, 'a frase começa na linha em que o parágrafo começou')
})
`````

Crie `test/docs/corpus.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { declaredPaths, docsRoot, documentationFiles } from '../../src/docs/corpus.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
generated:
  - path: docs/contracts/api.gen.md
    command: "node gen.js"
documents:
  - path: CONTRIBUTING.md
    owner: "@time"
  - path: fora/do/repo.md
    owner: "@time"
`

test('docsRoot deriva da localização do .ownership.yml — nenhum literal `docs/` no check', () => {
  assert.equal(docsRoot(), 'docs')
})

test('declaredPaths junta artefatos, documentos e gerados', () => {
  assert.deepEqual(declaredPaths(parseOwnership(OWNERSHIP)).sort(), ['CONTRIBUTING.md', 'docs/contracts/api.gen.md', 'docs/decisions/adr/', 'fora/do/repo.md'])
})

test('documentationFiles = tudo sob a raiz + o que é declarado fora dela e existe', () => {
  withTempRepo(
    {
      'docs/.ownership.yml': OWNERSHIP,
      'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
      'docs/contracts/api.gen.md': '# gerado\n',
      'docs/ids-retired.txt': '\n',
      'CONTRIBUTING.md': '# como\n',
      'README.md': '# leia\n',
      'src/codigo.ts': 'export const x = 1;\n',
    },
    root => {
      const files = documentationFiles(root, parseOwnership(OWNERSHIP))

      assert.ok(files.includes('docs/decisions/adr/ADR-0001-x.md'))
      assert.ok(files.includes('docs/.ownership.yml'), 'o mapa também é documento e também tem dono')
      assert.ok(files.includes('docs/ids-retired.txt'))
      assert.ok(files.includes('CONTRIBUTING.md'), 'declarado fora da raiz e existe')
      assert.equal(files.includes('fora/do/repo.md'), false, 'declarado e ausente não entra')
      assert.equal(files.includes('README.md'), false, 'não declarado e fora da raiz não é do corpus')
      assert.equal(files.includes('src/codigo.ts'), false)
    },
  )
})
```

- [ ] **Step 3: O teste que falha — `CI-7`**

Crie `test/checks/ci7-ownership-coverage.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ci7OwnershipCoverage, docsExceptionReason, dodItemsWithoutVerification, duplicatedSentences } from '../../src/checks/ci7-ownership-coverage.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
watches:
  - code: "src/domain/**"
    doc: docs/requirements/rules.md
    reason: "comportamento novo exige regra com ID antes do código"
documents:
  - path: docs/.ownership.yml
    owner: "@time"
    skill: living-docs-bootstrap
  - path: docs/requirements/rules.md
    owner: "@time"
    skill: requirements-keeper
  - path: CLAUDE.md
    owner: "@time"
    skill: working-agreements-keeper
    role: agent-contract
  - path: docs/definition-of-done.md
    owner: "@time"
    skill: working-agreements-keeper
    role: definition-of-done
`

const CODEOWNERS = [
  'docs/decisions/adr/    @time',
  'docs/.ownership.yml    @time',
  'docs/requirements/    @time',
  'docs/definition-of-done.md    @time',
  'CLAUDE.md    @time',
  '',
].join('\n')

const DOD = ['# Definition of Done', '', '- [ ] Os testes passam — verificação: `CI-1`.', ''].join('\n')
const CONTRATO = ['# Contrato do agente', '', 'Índice e política: a verdade mora no artefato dono.', ''].join('\n')
const REGRAS = ['# Regras', '', '## RN-0001 — Uma regra', '', '- **status:** draft', ''].join('\n')

const ARVORE = {
  'docs/.ownership.yml': OWNERSHIP,
  'CODEOWNERS': CODEOWNERS,
  'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
  'docs/requirements/rules.md': REGRAS,
  'docs/definition-of-done.md': DOD,
  'CLAUDE.md': CONTRATO,
}

function contextFor(root: string, ownership = OWNERSHIP) {
  const config = parseOwnership(ownership)
  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: '2026-08-27',
  }
}

test('RN-0016: repositório com tudo declarado nos dois lugares passa', () => {
  withTempRepo(ARVORE, root => {
    assert.deepEqual(ci7OwnershipCoverage().run(contextFor(root)), [])
  })
})

test('RN-0016: documento sob a raiz sem entrada no .ownership.yml reprova, nomeando o arquivo', () => {
  withTempRepo({ ...ARVORE, 'docs/avulso.md': '# ninguém responde por mim\n' }, root => {
    const findings = ci7OwnershipCoverage().run(contextFor(root))
    const semDono = findings.filter(finding => finding.file === 'docs/avulso.md')

    assert.equal(semDono.length, 2, 'falta nos dois lugares: .ownership.yml e CODEOWNERS')
    assert.ok(semDono.every(finding => finding.ruleId === 'CI-7' && finding.severity === 'error'))
    assert.ok(semDono.some(finding => /ownership\.yml/.test(finding.message)))
    assert.ok(semDono.some(finding => /CODEOWNERS/.test(finding.message)))
    assert.ok(semDono.some(finding => /documents:/.test(finding.fix)))
  })
})

test('RN-0016: CODEOWNERS ausente é uma finding, não uma por arquivo', () => {
  const semCodeowners = { ...ARVORE }
  delete (semCodeowners as Record<string, string>).CODEOWNERS

  withTempRepo(semCodeowners, root => {
    const findings = ci7OwnershipCoverage().run(contextFor(root))
    assert.equal(findings.length, 1)
    assert.match(findings[0]?.message ?? '', /CODEOWNERS/)
    assert.equal(findings[0]?.file, 'docs/.ownership.yml')
  })
})

test('RN-0017 (config): vínculo de watches que aponta doc inexistente ou sem dono reprova', () => {
  const docInexistente = OWNERSHIP.replace('doc: docs/requirements/rules.md\n    reason', 'doc: docs/nao-existe.md\n    reason')
  withTempRepo(ARVORE, root => {
    const findings = ci7OwnershipCoverage().run(contextFor(root, docInexistente))
    assert.ok(findings.some(finding => /não existe/.test(finding.message) && finding.file === 'docs/.ownership.yml'))
  })

  // O doc existe, mas ninguém o declarou: watches aponta para documento órfão.
  const semDeclaracao = OWNERSHIP.replace('  - path: docs/requirements/rules.md\n    owner: "@time"\n    skill: requirements-keeper\n', '')
  withTempRepo(ARVORE, root => {
    const findings = ci7OwnershipCoverage().run(contextFor(root, semDeclaracao))
    assert.ok(findings.some(finding => /não tem dono declarado/.test(finding.message)))
  })
})

test('RN-0017: item de DoD sem verificação nomeada reprova, com a linha', () => {
  const dodFraca = `${DOD}- [ ] O código está bonito.\n`
  withTempRepo({ ...ARVORE, 'docs/definition-of-done.md': dodFraca }, root => {
    const findings = ci7OwnershipCoverage().run(contextFor(root))
    const achado = findings.find(finding => finding.file === 'docs/definition-of-done.md')

    assert.ok(achado)
    assert.equal(achado.line, 4)
    assert.match(achado.message, /verificação/)
    assert.match(achado.fix, /CI-n|HK-n/)
  })
})

test('dodItemsWithoutVerification aceita ID de check, de hook e a marca humana', () => {
  const source = [
    '- [ ] com check — verificação: `CI-3`.',
    '- [x] com hook — verificação: `HK-1`.',
    '- [ ] com pessoa — verificação: humana.',
    '- [ ] sem nada.',
    'não é item de caixa.',
  ].join('\n')

  assert.deepEqual(
    dodItemsWithoutVerification(source).map(item => item.line),
    [4],
  )
})

test('RN-0020: frase longa do contrato repetida num artefato dono reprova', () => {
  const frase = 'Toda regra de negócio deste projeto nasce com identificador estável antes de qualquer linha de código.'
  withTempRepo(
    {
      ...ARVORE,
      'CLAUDE.md': `# Contrato do agente\n\n${frase}\n`,
      'docs/requirements/rules.md': `${REGRAS}\n${frase}\n`,
    },
    root => {
      const findings = ci7OwnershipCoverage().run(contextFor(root))
      const achado = findings.find(finding => finding.file === 'CLAUDE.md')

      assert.ok(achado, 'CI-7 deveria acusar a duplicata')
      assert.match(achado.message, /docs\/requirements\/rules\.md/)
      assert.match(achado.fix, /ponteiro|apague/i)
    },
  )
})

test('ADR-0009: frase curta é vocabulário compartilhado, não duplicata', () => {
  const curta = 'Nada roda no host além de Docker.'
  withTempRepo(
    {
      ...ARVORE,
      'CLAUDE.md': `# Contrato do agente\n\n${curta}\n`,
      'docs/requirements/rules.md': `${REGRAS}\n${curta}\n`,
    },
    root => {
      assert.deepEqual(ci7OwnershipCoverage().run(contextFor(root)), [])
    },
  )
})

test('duplicatedSentences ignora código e compara normalizado', () => {
  const frase = 'Uma frase suficientemente longa para passar do piso de doze palavras sem esforço nenhum'
  const contrato = `# Contrato\n\n**${frase}.**\n\n\`\`\`md\n${'outra frase longa '.repeat(4)}\n\`\`\`\n`
  const corpus = [
    {
      file: 'docs/x.md',
      source: `prosa antes. ${frase.toLowerCase()}. prosa depois.`,
    },
  ]

  const found = duplicatedSentences(contrato, corpus)
  assert.equal(found.length, 1)
  assert.equal(found[0]?.source, 'docs/x.md')
  assert.equal(found[0]?.line, 3)
})

test('critério 5, metade 2: o diff que leva caminho vigiado sem o doc dono reprova', () => {
  withTempRepo(ARVORE, root => {
    const diff = {
      base: 'origin/master',
      changed: ['src/domain/reembolso.ts'],
      messages: ['feat: reembolso'],
    }
    const findings = ci7OwnershipCoverage(diff).run(contextFor(root))
    const achado = findings.find(finding => finding.file === 'docs/requirements/rules.md')

    assert.ok(achado)
    assert.equal(achado.severity, 'error')
    assert.match(achado.message, /src\/domain\/reembolso\.ts/)
    assert.match(achado.fix, /Docs: none/)
  })
})

test('critério 5, metade 2: com o doc no mesmo diff, ou com a razão escrita, passa', () => {
  withTempRepo(ARVORE, root => {
    const comDoc = {
      base: 'origin/master',
      changed: ['src/domain/reembolso.ts', 'docs/requirements/rules.md'],
      messages: ['feat: reembolso'],
    }
    assert.deepEqual(ci7OwnershipCoverage(comDoc).run(contextFor(root)), [])

    const comRazao = {
      base: 'origin/master',
      changed: ['src/domain/reembolso.ts'],
      messages: ['refactor: renomeia interno\n\nDocs: none — só renomeação, a regra não mudou'],
    }
    assert.deepEqual(ci7OwnershipCoverage(comRazao).run(contextFor(root)), [])
  })
})

test('ADR-0010: rótulo sem razão não é exceção', () => {
  assert.equal(docsExceptionReason(['Docs: none — a regra não mudou']), 'a regra não mudou')
  assert.equal(docsExceptionReason(['Docs: none']), null)
  assert.equal(docsExceptionReason(['docs: NONE — minúscula também']), 'minúscula também')
  assert.equal(docsExceptionReason(['Changelog: none — outro rótulo']), null)
})

test('sem diff, a metade do diff não roda', () => {
  withTempRepo(ARVORE, root => {
    assert.deepEqual(ci7OwnershipCoverage(null).run(contextFor(root)), [])
  })
})
```

- [ ] **Step 4: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/config/codeowners.test.ts test/docs/markdown.test.ts test/docs/corpus.test.ts test/checks/ci7-ownership-coverage.test.ts
```

Esperado: FAIL — quatro módulos não encontrados.

- [ ] **Step 5: Escrever `src/config/codeowners.ts`**

```typescript
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'

/** Onde o CODEOWNERS pode morar, na ordem em que se procura por ele. */
export const CODEOWNERS_PATHS: readonly string[] = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS']

export interface CodeownersEntry {
  pattern: string
  /** Só handles (`@…`); um padrão sem handle não declara dono. */
  owners: string[]
  /** Linha 1-indexed. */
  line: number
}

export interface Codeowners {
  /** Caminho do arquivo encontrado, relativo à raiz. */
  file: string
  entries: CodeownersEntry[]
}

export function parseCodeowners(source: string): CodeownersEntry[] {
  const entries: CodeownersEntry[] = []
  const lines = source.replace(/\r\n/g, '\n').split('\n')

  for (let i = 0; i < lines.length; i++) {
    const line = (lines[i] ?? '').trim()
    if (line === '' || line.startsWith('#')) continue

    const [pattern, ...rest] = line.split(/\s+/)
    if (pattern === undefined) continue

    entries.push({
      pattern,
      owners: rest.filter(owner => owner.startsWith('@')),
      line: i + 1,
    })
  }

  return entries
}

export function loadCodeowners(root: string): Codeowners | null {
  for (const candidate of CODEOWNERS_PATHS) {
    let source: string
    try {
      source = readFileSync(join(root, candidate), 'utf8')
    } catch {
      continue
    }
    return { file: candidate, entries: parseCodeowners(source) }
  }
  return null
}

function matcherFor(pattern: string): (repoPath: string) => boolean {
  const clean = pattern.replace(/\\/g, '/').replace(/^\//, '')
  if (clean === '*' || clean === '**') return () => true
  if (clean.endsWith('/')) return repoPath => repoPath.startsWith(clean)
  if (clean.includes('*')) {
    const isMatch = picomatch([clean, `${clean}/**`])
    return repoPath => isMatch(repoPath)
  }
  return repoPath => repoPath === clean || repoPath.startsWith(`${clean}/`)
}

/**
 * Donos declarados para este caminho, ou `null` quando nenhum padrão o cobre.
 *
 * Reconhecimento deliberadamente estreito — prefixo de diretório, igualdade de
 * arquivo, `*` e glob simples —, em vez das regras completas de gitignore.
 * `CI-7` responde "tem dono declarado?", não "qual dono o GitHub escolheria?";
 * a segunda pergunta é do GitHub, e imitá-la pela metade seria afirmar uma
 * precisão que este check não tem.
 */
export function ownersOf(codeowners: Codeowners, repoPath: string): string[] | null {
  const target = repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
  let owners: string[] | null = null

  // A última regra que casa ganha — é assim que o CODEOWNERS é lido.
  for (const entry of codeowners.entries) {
    if (entry.owners.length === 0) continue
    if (matcherFor(entry.pattern)(target)) owners = entry.owners
  }

  return owners
}
```

- [ ] **Step 6: Escrever `src/docs/markdown.ts`**

```typescript
/** Abre ou fecha bloco de código cercado. O grupo guarda o tamanho da cerca. */
const FENCE = /^\s{0,3}(`{3,}|~{3,})/

/**
 * O texto sem código: bloco cercado e marcação inline saem, e as linhas ficam.
 *
 * Preservar a contagem de linhas não é detalhe — é o que permite reportar a
 * linha do achado. E a cerca precisa fechar com uma do **mesmo tamanho ou
 * maior** (CommonMark): sem isso, um bloco aberto com quatro crases fecha na
 * primeira cerca de três que estiver dentro dele, e o resto do arquivo volta a
 * ser lido como prosa — que é exatamente como um exemplo de código vira um
 * falso positivo.
 */
export function stripCode(source: string): string {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const out: string[] = []
  let fence: string | null = null

  for (const line of lines) {
    const mark = FENCE.exec(line)?.[1]

    if (fence === null) {
      if (mark !== undefined) {
        fence = mark
        out.push('')
        continue
      }
      out.push(line.replace(/`[^`\n]*`/g, ''))
      continue
    }

    if (mark !== undefined && mark[0] === fence[0] && mark.length >= fence.length) {
      fence = null
    }
    out.push('')
  }

  return out.join('\n')
}

/** Prosa comparável: minúscula, sem marcação, sem pontuação, espaço colapsado. */
export function normalizeProse(text: string): string {
  return text
    .toLowerCase()
    .replace(/[*_`~]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
}

const BLOCK_START = /^\s*(?:[-*+]\s+|#{1,6}\s+|>\s?|\d+[.)]\s+|\|)/
const MARKER = /^\s*(?:[-*+]\s+|#{1,6}\s+|>\s?|\d+[.)]\s+)/

/**
 * Frases do documento, já sem código, com a linha em que cada uma começa.
 *
 * O parágrafo é juntado **antes** do corte em frases: prosa quebrada em oitenta
 * colunas não pode escapar de uma comparação por frase só por causa de onde o
 * editor deu enter (`ADR-0009`). Item de lista, título, citação e linha de
 * tabela começam frase nova — juntá-los ao parágrafo anterior inventaria uma
 * frase que ninguém escreveu.
 */
export function sentencesOf(source: string): { text: string; line: number }[] {
  const lines = stripCode(source).split('\n')
  const sentences: { text: string; line: number }[] = []

  let buffer: string[] = []
  let start = 0

  const flush = (): void => {
    if (buffer.length === 0) return
    const paragraph = buffer.join(' ').replace(/\s+/g, ' ').trim()
    buffer = []
    for (const piece of paragraph.split(/(?<=[.!?])\s+/)) {
      const text = piece.trim()
      if (text !== '') sentences.push({ text, line: start })
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i] ?? ''
    if (raw.trim() === '') {
      flush()
      continue
    }
    if (BLOCK_START.test(raw)) flush()
    if (buffer.length === 0) start = i + 1
    buffer.push(raw.replace(MARKER, '').trim())
  }
  flush()

  return sentences
}
```

- [ ] **Step 7: Escrever `src/docs/corpus.ts`**

```typescript
import { existsSync } from 'node:fs'
import { join, posix } from 'node:path'
import { OWNERSHIP_PATH } from '../config/ownership.ts'
import type { OwnershipConfig } from '../config/ownership.ts'
import { listFiles } from '../core/files.ts'

/**
 * A raiz da documentação: o diretório onde o `.ownership.yml` mora.
 *
 * É o único caminho que o toolkit conhece, e ele o conhece desde a Fase 0
 * (`OWNERSHIP_PATH`). Derivar daqui, em vez de escrever `docs/` dentro de um
 * check, é o que mantém a spec §3 verdadeira: "hooks e checks não conhecem
 * caminho nenhum".
 */
export function docsRoot(): string {
  return posix.dirname(OWNERSHIP_PATH.replace(/\\/g, '/'))
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** Todo caminho que o `.ownership.yml` declara, em qualquer das três chaves. */
export function declaredPaths(config: OwnershipConfig): string[] {
  return [
    ...config.artifacts.map(artifact => artifact.path),
    ...config.documents.map(document => document.path),
    ...config.generated.map(generated => generated.path),
  ].map(normalize)
}

/**
 * O corpus da documentação: tudo que vive sob a raiz da documentação, mais todo
 * caminho declarado que mora fora dela e existe.
 *
 * É o conjunto de que `CI-7` cobra dono e que `CI-8` varre. `CONTRIBUTING.md`,
 * `CHANGELOG.md` e o contrato do agente entram por serem declarados; um
 * `README.md` que ninguém declarou fica de fora, e isso é deliberado — o
 * toolkit não decide que a raiz do repositório é documentação.
 */
export function documentationFiles(root: string, config: OwnershipConfig): string[] {
  const files = new Set(listFiles(root, [`${docsRoot()}/**`]))
  const prefix = `${docsRoot()}/`

  for (const declared of declaredPaths(config)) {
    if (declared.startsWith(prefix)) continue
    if (declared.endsWith('/')) {
      for (const file of listFiles(root, [`${declared}**`])) files.add(file)
      continue
    }
    if (existsSync(join(root, declared))) files.add(declared)
  }

  return [...files].sort()
}
```

- [ ] **Step 8: Escrever `src/checks/exception-label.ts` e ligar `CI-6` a ele**

Crie `src/checks/exception-label.ts`:

```typescript
/**
 * Rótulo de exceção numa mensagem de commit: `<Label>: none — <razão>`.
 *
 * `Changelog` por `ADR-0006`, `Docs` por `ADR-0010`. O separador é obrigatório e
 * a razão também: rótulo sem razão é caixinha marcada, e caixinha marcada
 * desliga o mecanismo fingindo cumpri-lo. Dois rótulos já são o começo de uma
 * família — o terceiro precisa de ADR próprio.
 */
export function exceptionReasonFor(label: string, messages: readonly string[]): string | null {
  const pattern = new RegExp(`^[ \\t]*${label}:[ \\t]*none[ \\t]*[—–:-][ \\t]*(\\S.*)$`, 'im')

  for (const message of messages) {
    const reason = pattern.exec(message)?.[1]?.trim()
    if (reason) return reason
  }

  return null
}
```

Em `src/checks/ci6-changelog-required.ts`, apague a constante
`EXCEPTION_LABEL` e reescreva a função, mantendo a assinatura pública — os
testes de `CI-6` são a rede:

```typescript
import { exceptionReasonFor } from './exception-label.ts'
```

```typescript
/**
 * O rótulo de exceção do CHANGELOG (`ADR-0006`, decisão 4). A forma é
 * compartilhada com `CI-7` desde a Fase 7 (`src/checks/exception-label.ts`).
 */
export function exceptionReason(messages: readonly string[]): string | null {
  return exceptionReasonFor('Changelog', messages)
}
```

```bash
docker compose exec toolkit node --test test/checks/ci6-changelog-required.test.ts
```

Esperado: PASS, sem tocar no teste. Se falhar, a extração mudou a semântica do
rótulo — compare a regex com a que estava lá.

- [ ] **Step 9: Escrever `src/checks/ci7-ownership-coverage.ts`**

```typescript
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import type { DiffFacts } from './ci6-changelog-required.ts'
import { exceptionReasonFor } from './exception-label.ts'
import { OWNERSHIP_PATH, documentWithRole, findArtifactRule, findDocumentRule } from '../config/ownership.ts'
import { loadCodeowners, ownersOf } from '../config/codeowners.ts'
import { pendingDocs } from '../config/watches.ts'
import { documentationFiles } from '../docs/corpus.ts'
import { normalizeProse, sentencesOf, stripCode } from '../docs/markdown.ts'

const RULE = 'CI-7'

/** Piso de palavras da comparação de frases (`ADR-0009`). */
export const WORD_FLOOR = 12

/**
 * Vocabulário de verificação de um item de Definition of Done (`RN-0017`).
 * Um ID do toolkit, ou a palavra que marca verificação humana — em português ou
 * em inglês, porque um check genérico não pode exigir o idioma do projeto.
 */
const VERIFICATION = /\b(?:CI|HK|AG|SK)-\d+\b|\bhumana?\b|\bhuman\b/i

const DOD_ITEM = /^\s*[-*+]\s+\[[ xX]\]\s+\S/

export interface Duplication {
  /** A frase como está escrita no contrato. */
  sentence: string
  line: number
  /** O artefato dono onde ela reaparece. */
  source: string
}

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** O rótulo que libera a metade do diff (`ADR-0010`). */
export function docsExceptionReason(messages: readonly string[]): string | null {
  return exceptionReasonFor('Docs', messages)
}

/** Frases do contrato do agente que reaparecem, palavra por palavra, num artefato dono. */
export function duplicatedSentences(contract: string, corpus: readonly { file: string; source: string }[]): Duplication[] {
  const normalized = corpus.map(entry => ({
    file: entry.file,
    text: normalizeProse(stripCode(entry.source)),
  }))
  const found: Duplication[] = []

  for (const sentence of sentencesOf(contract)) {
    const prose = normalizeProse(sentence.text)
    if (prose.split(' ').filter(Boolean).length < WORD_FLOOR) continue

    const hit = normalized.find(entry => entry.text.includes(prose))
    if (hit)
      found.push({
        sentence: sentence.text,
        line: sentence.line,
        source: hit.file,
      })
  }

  return found
}

/** Itens de Definition of Done que não nomeiam o que os verifica (`RN-0017`). */
export function dodItemsWithoutVerification(source: string): { text: string; line: number }[] {
  const lines = stripCode(source).split('\n')
  const found: { text: string; line: number }[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    if (!DOD_ITEM.test(line)) continue
    if (VERIFICATION.test(line)) continue
    found.push({ text: line.trim(), line: i + 1 })
  }

  return found
}

/**
 * `CI-7` — ownership coverage. Cinco classes de achado, todas lidas do
 * `.ownership.yml`: documento sem dono, vínculo de `watches` que não resolve,
 * contrato do agente repetindo artefato dono, item de DoD sem verificação
 * nomeada, e — quando o diff é dado — caminho vigiado que viajou sem o doc dono.
 *
 * A última é a segunda metade do critério de aceite 5 da spec §12, e é a razão
 * pela qual o diff entra por injeção: `validate` não o tem, e `validate --base`
 * tem (`ADR-0010`).
 *
 * Regras de origem: `RN-0016`, `RN-0017`, `RN-0020`, `RN-0021`, e `RN-0010`
 * para a duplicação.
 */
export function ci7OwnershipCoverage(diff: DiffFacts | null = null): Check {
  return {
    id: RULE,
    name: 'ownership coverage',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []
      const { config, root } = context

      const isDeclared = (file: string): boolean =>
        findArtifactRule(config, file) !== null ||
        findDocumentRule(config, file) !== null ||
        config.generated.some(generated => normalizePath(generated.path) === file)

      const codeowners = loadCodeowners(root)
      if (codeowners === null) {
        findings.push(
          error(
            OWNERSHIP_PATH,
            0,
            'CODEOWNERS ausente: nenhum documento deste repositório tem dono declarado do lado de quem revisa.',
            'Crie `CODEOWNERS` na raiz (ou em `.github/`), espelhando o campo `owner` de cada entrada de ' +
              '`docs/.ownership.yml` (`RN-0016`; `living-docs init` o escreve).',
          ),
        )
      }

      // 1 — todo documento do corpus tem dono nos dois lugares.
      for (const file of documentationFiles(root, config)) {
        if (!isDeclared(file)) {
          findings.push(
            error(
              file,
              0,
              `\`${file}\` não tem entrada em \`${OWNERSHIP_PATH}\`.`,
              'Declare-o em `artifacts:` (se tem família de IDs e ciclo de vida), em `documents:` (se tem dono e ' +
                'não tem IDs) ou em `generated:` (se é gerado) — `RN-0016`, `ADR-0008`. Documento sem dono é o ' +
                'anti-requisito da spec §13.',
            ),
          )
        }

        if (codeowners !== null && ownersOf(codeowners, file) === null) {
          findings.push(
            error(
              file,
              0,
              `\`${file}\` não tem linha em \`${codeowners.file}\`.`,
              `Acrescente \`${file}    @dono\` (ou um padrão de diretório que o cubra) espelhando o \`owner\` do ` +
                '`.ownership.yml` — os dois lugares, porque um deles diz qual skill responde e o outro quem revisa.',
            ),
          )
        }
      }

      // 2 — todo vínculo de watches aponta um doc que existe e tem dono.
      for (const watch of config.watches) {
        const doc = normalizePath(watch.doc)
        if (!existsSync(join(root, doc))) {
          findings.push(
            error(
              OWNERSHIP_PATH,
              0,
              `\`watches\` exige \`${doc}\` para \`${watch.code}\`, e esse caminho não existe no repositório.`,
              'Crie o documento, ou corrija o `doc` da regra. Vínculo que aponta para o vazio faz `HK-4` e `HK-5` ' +
                'pedirem um documento que ninguém pode atualizar (`RN-0017`).',
            ),
          )
          continue
        }
        if (!isDeclared(doc)) {
          findings.push(
            error(
              OWNERSHIP_PATH,
              0,
              `\`watches\` exige \`${doc}\` para \`${watch.code}\`, e esse documento não tem dono declarado.`,
              `Declare \`${doc}\` em \`artifacts:\` ou \`documents:\` — o vínculo código→doc só é cobrável se o doc ` + 'tiver dono (`RN-0016`, `RN-0017`).',
            ),
          )
        }
      }

      // 3 — o contrato do agente repetindo texto de artefato dono.
      const contract = documentWithRole(config, 'agent-contract')
      if (contract !== null) {
        const contractPath = normalizePath(contract.path)
        const source = context.documents.find(document => document.file === contractPath)?.source ?? null

        if (source !== null) {
          // Corpus: quem tem skill dona. Plano, spec e README citam por ofício, e
          // reprovar o contrato por causa de quem o citou inverteria quem copiou
          // de quem (`ADR-0009`).
          const corpus = [
            ...context.docs.map(doc => ({
              file: doc.file,
              source: doc.source,
              skill: doc.rule.skill,
            })),
            ...context.documents.map(document => ({
              file: document.file,
              source: document.source,
              skill: document.rule.skill,
            })),
          ].filter(entry => entry.skill !== null && entry.file !== contractPath && entry.file.endsWith('.md'))

          for (const duplication of duplicatedSentences(source, corpus)) {
            findings.push(
              error(
                contractPath,
                duplication.line,
                `O contrato do agente repete, palavra por palavra, uma frase de \`${duplication.source}\`: ` + `"${duplication.sentence.slice(0, 120)}".`,
                'Apague a frase e deixe o ponteiro para o artefato dono. O contrato do agente é índice e política, ' +
                  'não conteúdo (`RN-0010`, `RN-0020`; skill dona: working-agreements-keeper) — e o limiar não se ' +
                  'baixa: mudá-lo é `ADR-0009` novo.',
              ),
            )
          }
        }
      }

      // 4 — item de Definition of Done sem verificação nomeada.
      const dod = documentWithRole(config, 'definition-of-done')
      if (dod !== null) {
        const dodPath = normalizePath(dod.path)
        const source = context.documents.find(document => document.file === dodPath)?.source ?? null

        if (source !== null) {
          for (const item of dodItemsWithoutVerification(source)) {
            findings.push(
              error(
                dodPath,
                item.line,
                `Item da Definition of Done sem verificação nomeada: "${item.text.slice(0, 120)}".`,
                'Nomeie o que verifica o item — um `CI-n`, um `HK-n`, ou a palavra que marca verificação humana. ' +
                  'Item que ninguém verifica é intenção, e intenção não é definição de pronto (`RN-0017`).',
              ),
            )
          }
        }
      }

      // 5 — a metade do diff (critério 5, metade 2; `ADR-0010`).
      if (diff !== null && docsExceptionReason(diff.messages) === null) {
        for (const pending of pendingDocs(config, diff.changed)) {
          const gatilho = pending.matched.slice(0, 5).join(', ') + (pending.matched.length > 5 ? `, … (+${pending.matched.length - 5})` : '')

          findings.push(
            error(
              pending.doc,
              0,
              `O diff \`${diff.base}...HEAD\` toca caminho vigiado (${gatilho}) e \`${pending.doc}\` não está entre ` + 'os caminhos alterados.',
              `Atualize \`${pending.doc}\`${
                pending.skill === null ? '' : ` (skill dona: ${pending.skill})`
              } no mesmo PR — ou escreva a razão numa mensagem de commit, no formato \`Docs: none — <razão>\` ` + '(`RN-0021`, `ADR-0010`).',
            ),
          )
        }
      }

      return findings
    },
  }
}
```

- [ ] **Step 10: Rodar e ver passar**

```bash
docker compose exec toolkit node --test test/config/codeowners.test.ts test/docs/markdown.test.ts test/docs/corpus.test.ts test/checks/ci7-ownership-coverage.test.ts
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Esperado: PASS em tudo. `CI-7` ainda não está registrado em `validate` — Task 9.

- [ ] **Step 11: Commit**

```bash
git add src/config/codeowners.ts src/docs/corpus.ts src/docs/markdown.ts src/checks/exception-label.ts src/checks/ci7-ownership-coverage.ts src/checks/ci6-changelog-required.ts test/config/codeowners.test.ts test/docs/markdown.test.ts test/docs/corpus.test.ts test/checks/ci7-ownership-coverage.test.ts
git commit -m "feat(RN-0016, RN-0017, RN-0020, RN-0021, ADR-0009, ADR-0010): CI-7 — ownership coverage"
```

---

### Task 7: `CI-8` — links e anexo binário

**Objetivo:** O check mais simples da fase, e o que tem o falso positivo mais
fácil de produzir: link dentro de bloco de código. É por isso que ele começa
apagando o código.

**Files:**

- Create: `src/checks/ci8-links.ts`
- Test: `test/checks/ci8-links.test.ts`

**Interfaces:**

- Consome: `readTextFile` de `src/core/files.ts`; `docsRoot`,
  `documentationFiles` de `src/docs/corpus.ts`; `stripCode` de
  `src/docs/markdown.ts`.
- Produz:
  - `interface Link { target: string; line: number; kind: 'link' | 'wikilink' }`
  - `BINARY_EXTENSIONS: ReadonlySet<string>`
  - `findLinks(source: string): Link[]`
  - `ci8Links: Check`

**Requisitos:**

- Bloco cercado e marcação inline saem **antes** de procurar link (`RN-0023`).
  A prova é o próprio repositório: `docs/superpowers/plans/2026-08-24-living-docs-toolkit-core.md`
  tem `](?:mente)` dentro de um bloco de TypeScript, e isso não é link.
- Três formas de link: inline `[texto](alvo)`, definição de referência
  `[id]: alvo`, e `[[wikilink]]`. Link externo (`http:`, `mailto:`, `//`) e
  âncora pura (`#seção`) são ignorados.
- O fragmento (`#âncora`) é **descartado** e o arquivo é verificado. Âncora não
  se resolve, e o check diz isso na mensagem em vez de fingir.
- Alvo resolvido é arquivo **ou** diretório existente: um link para
  `docs/requirements/` é válido.
- `[[wikilink]]` resolve por caminho exato (com ou sem `.md`) ou por nome de
  arquivo dentro do corpus. Ambiguidade não é erro: um destino basta.
- Anexo binário é reprovado **por extensão**, e só sob a raiz da documentação.
  Denylist, não allowlist: `.svg` é texto e diffável, `.json` e `.csv` também, e
  reprovar formato de texto legítimo seria o check ensinando estilo. Arquivo sem
  extensão (`.gitkeep`) nunca é anexo.
- `CI-8` não emite aviso. Todos os achados são `error`.

**`HK-5`:** `docs/requirements/rules.md` (`src/checks/**`) — viajou na Task 2,
com `RN-0023`.

- [ ] **Step 1: Escrever o teste que falha**

Crie `test/checks/ci8-links.test.ts`:

````typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { writeFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { ci8Links, findLinks } from '../../src/checks/ci8-links.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
documents:
  - path: docs/.ownership.yml
    owner: "@time"
    skill: living-docs-bootstrap
  - path: docs/guia.md
    owner: "@time"
    skill: working-agreements-keeper
  - path: CONTRIBUTING.md
    owner: "@time"
    skill: working-agreements-keeper
`

function contextFor(root: string) {
  const config = parseOwnership(OWNERSHIP)
  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: '2026-08-27',
  }
}

const BASE = {
  'docs/.ownership.yml': OWNERSHIP,
  'docs/decisions/adr/ADR-0001-x.md': '# adr\n',
  'CONTRIBUTING.md': '# como se contribui\n',
}

test('RN-0023: link relativo que resolve passa; arquivo, diretório e âncora inclusive', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guia.md': [
        '# Guia',
        '',
        'Veja [o ADR](decisions/adr/ADR-0001-x.md) e [a pasta](decisions/adr/).',
        'A âncora [dentro dele](decisions/adr/ADR-0001-x.md#contexto) também resolve.',
        'E [da raiz](/CONTRIBUTING.md) igual.',
        'Externo passa: [site](https://example.com) e [correio](mailto:a@b.c).',
        'Âncora pura passa: [aqui](#guia).',
        '',
      ].join('\n'),
    },
    root => {
      assert.deepEqual(ci8Links.run(contextFor(root)), [])
    },
  )
})

test('RN-0023: link que não resolve reprova, com a linha e o alvo', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guia.md': ['# Guia', '', 'Veja [o que não existe](decisions/adr/ADR-9999-x.md).', ''].join('\n'),
    },
    root => {
      const findings = ci8Links.run(contextFor(root))
      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.ruleId, 'CI-8')
      assert.equal(findings[0]?.severity, 'error')
      assert.equal(findings[0]?.file, 'docs/guia.md')
      assert.equal(findings[0]?.line, 3)
      assert.match(findings[0]?.message ?? '', /ADR-9999-x\.md/)
    },
  )
})

test('RN-0023: link dentro de bloco cercado ou de marcação inline não é link', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guia.md': [
        '# Guia',
        '',
        'Regex inline: `/\\]\\(?:mente\\)/` não é link.',
        '',
        '```ts',
        'const CADENCE = /\\b(?:tri|bi)?mestral(?:mente)?\\b/i;',
        'const link = "[texto](nao-existe.md)";',
        '```',
        '',
        'E `[[wikilink]]` entre crases é o nome do formato, não um destino.',
        '',
      ].join('\n'),
    },
    root => {
      assert.deepEqual(ci8Links.run(contextFor(root)), [])
    },
  )
})

test('RN-0023: wikilink resolve por nome do arquivo, e sem destino reprova', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guia.md': ['# Guia', '', 'Veja [[ADR-0001-x]] e [[CONTRIBUTING]].', 'Mas [[nada-disso]] não existe.', ''].join('\n'),
    },
    root => {
      const findings = ci8Links.run(contextFor(root))
      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.line, 4)
      assert.match(findings[0]?.message ?? '', /nada-disso/)
      assert.match(findings[0]?.message ?? '', /wikilink/i)
    },
  )
})

test('RN-0023: definição de referência também é link', () => {
  withTempRepo(
    {
      ...BASE,
      'docs/guia.md': ['# Guia', '', 'Veja [o adr][adr].', '', '[adr]: decisions/adr/ADR-0000-inexistente.md', ''].join('\n'),
    },
    root => {
      const findings = ci8Links.run(contextFor(root))
      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.line, 5)
    },
  )
})

test('RN-0023: anexo binário sob a raiz da documentação reprova; texto e .gitkeep não', () => {
  withTempRepo({ ...BASE, 'docs/guia.md': '# Guia\n' }, root => {
    mkdirSync(join(root, 'docs/anexos'), { recursive: true })
    writeFileSync(join(root, 'docs/anexos/diagrama.png'), Buffer.from([0x89, 0x50, 0x4e, 0x47]))
    writeFileSync(join(root, 'docs/anexos/diagrama.svg'), '<svg></svg>\n', 'utf8')
    writeFileSync(join(root, 'docs/anexos/dados.json'), '{}\n', 'utf8')
    writeFileSync(join(root, 'docs/anexos/.gitkeep'), '', 'utf8')

    const findings = ci8Links.run(contextFor(root))
    assert.equal(findings.length, 1, JSON.stringify(findings, null, 2))
    assert.equal(findings[0]?.file, 'docs/anexos/diagrama.png')
    assert.match(findings[0]?.message ?? '', /binário/)
    assert.match(findings[0]?.fix ?? '', /texto|SVG/i)
  })
})

test('RN-0023: binário fora da raiz da documentação não é assunto de CI-8', () => {
  withTempRepo({ ...BASE, 'docs/guia.md': '# Guia\n' }, root => {
    mkdirSync(join(root, 'assets'), { recursive: true })
    writeFileSync(join(root, 'assets/logo.png'), Buffer.from([0x89, 0x50]))
    assert.deepEqual(ci8Links.run(contextFor(root)), [])
  })
})

test('findLinks reconhece as três formas e ignora externo e âncora pura', () => {
  const source = [
    'inline [a](x.md) e imagem ![b](y.png)',
    '[ref]: z.md',
    'wiki [[w]] e [[w|com título]]',
    'externo [c](https://x.y) [d](mailto:a@b.c) [e](//cdn.x)',
    'âncora [f](#secao)',
  ].join('\n')

  assert.deepEqual(findLinks(source), [
    { target: 'x.md', line: 1, kind: 'link' },
    { target: 'y.png', line: 1, kind: 'link' },
    { target: 'z.md', line: 2, kind: 'link' },
    { target: 'w', line: 3, kind: 'wikilink' },
    { target: 'w', line: 3, kind: 'wikilink' },
  ])
})
````

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/checks/ci8-links.test.ts
```

Esperado: FAIL — módulo não encontrado.

- [ ] **Step 3: Escrever `src/checks/ci8-links.ts`**

```typescript
import { existsSync } from 'node:fs'
import { join, posix } from 'node:path'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { readTextFile } from '../core/files.ts'
import { docsRoot, documentationFiles } from '../docs/corpus.ts'
import { stripCode } from '../docs/markdown.ts'

const RULE = 'CI-8'

/**
 * Formatos que não se leem em diff nem se revisam em PR (spec §13).
 *
 * Denylist, não allowlist, de propósito: `.svg` é XML e diffável, `.json` e
 * `.csv` são texto, e reprovar formato de texto legítimo seria o check ensinando
 * estilo em vez de cobrar a regra. O que a spec recusa é o **binário**.
 */
export const BINARY_EXTENSIONS: ReadonlySet<string> = new Set([
  'png',
  'jpg',
  'jpeg',
  'gif',
  'bmp',
  'webp',
  'ico',
  'tif',
  'tiff',
  'pdf',
  'doc',
  'docx',
  'xls',
  'xlsx',
  'ppt',
  'pptx',
  'odt',
  'ods',
  'odp',
  'zip',
  'gz',
  'tgz',
  'bz2',
  'xz',
  '7z',
  'rar',
  'jar',
  'mp3',
  'mp4',
  'mov',
  'avi',
  'mkv',
  'wav',
  'ogg',
  'webm',
  'ttf',
  'otf',
  'woff',
  'woff2',
  'eot',
  'drawio',
  'vsdx',
  'sketch',
  'fig',
  'psd',
  'ai',
])

export interface Link {
  target: string
  /** Linha 1-indexed. */
  line: number
  kind: 'link' | 'wikilink'
}

const INLINE = /\[[^\]\n]*\]\(\s*<?([^)>\s]+)>?(?:\s+"[^"]*")?\s*\)/g
const DEFINITION = /^[ \t]{0,3}\[[^\]\n]+\]:[ \t]*<?([^\s>]+)>?/g
const WIKILINK = /\[\[([^\]|\n]+?)(?:\|[^\]\n]*)?\]\]/g

/** Protocolo, ou raiz de rede: o alvo não é deste repositório. */
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

/** O alvo aponta para fora do repositório, ou para dentro do próprio arquivo. */
function isOutOfScope(target: string): boolean {
  return EXTERNAL.test(target) || target.startsWith('#')
}

/**
 * Links de um texto **já sem código** (`stripCode` é de quem chama).
 *
 * Só o que deveria resolver dentro do repositório: link externo e âncora pura
 * saem aqui, e não lá embaixo. Um verificador de link que tenta resolver
 * `https://` precisa de rede, e o toolkit não tem (`RNF-0001`).
 */
export function findLinks(source: string): Link[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const links: Link[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''
    for (const regex of [INLINE, DEFINITION]) {
      for (const match of line.matchAll(regex)) {
        const target = match[1]
        if (target && !isOutOfScope(target)) links.push({ target, line: i + 1, kind: 'link' })
      }
    }
    for (const match of line.matchAll(WIKILINK)) {
      const target = match[1]?.trim()
      if (target) links.push({ target, line: i + 1, kind: 'wikilink' })
    }
  }

  return links
}

/**
 * O alvo como caminho relativo à raiz do repositório, ou `null` quando não sobra
 * caminho nenhum depois de tirar fragmento e query.
 *
 * O fragmento é descartado e o **arquivo** é verificado: resolver âncora exigiria
 * reproduzir a regra de slug de cada renderizador, e uma regra reproduzida pela
 * metade reprova link que funciona.
 */
function resolveTarget(from: string, target: string): string | null {
  const withoutFragment = target.split('#')[0]?.split('?')[0] ?? ''
  if (withoutFragment === '') return null

  let decoded = withoutFragment
  try {
    decoded = decodeURIComponent(withoutFragment)
  } catch {
    // alvo com `%` que não é escape: verifica como veio
  }

  const base = decoded.startsWith('/') ? decoded.slice(1) : posix.join(posix.dirname(from), decoded)

  return posix.normalize(base).replace(/^\.\//, '')
}

/** Nome de arquivo (sem `.md`, minúsculo) → arquivos do corpus com aquele nome. */
function wikilinkIndex(files: readonly string[]): Map<string, string[]> {
  const index = new Map<string, string[]>()

  for (const file of files) {
    const name = posix.basename(file).replace(/\.md$/i, '').toLowerCase()
    index.set(name, [...(index.get(name) ?? []), file])
  }

  return index
}

function extensionOf(file: string): string | null {
  const base = posix.basename(file)
  const dot = base.lastIndexOf('.')
  // `dot <= 0` cobre "sem extensão" e ".gitkeep" — nome que começa com ponto.
  return dot <= 0 ? null : base.slice(dot + 1).toLowerCase()
}

/**
 * `CI-8` — links. Regra de origem: `RN-0023`.
 *
 * Começa apagando código, e essa ordem é o check: a primeira coisa que um
 * varredor de links ingênuo pega é o exemplo de link dentro de um bloco de
 * TypeScript — e cobrar exemplo ensina a não escrever exemplo.
 */
export const ci8Links: Check = {
  id: RULE,
  name: 'links',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = []
    const files = documentationFiles(context.root, context.config)
    const prefix = `${docsRoot()}/`
    const corpus = new Set(files)
    const index = wikilinkIndex(files)

    // 1 — anexo binário sob a raiz da documentação (spec §13).
    for (const file of files) {
      if (!file.startsWith(prefix)) continue
      const extension = extensionOf(file)
      if (extension === null || !BINARY_EXTENSIONS.has(extension)) continue

      findings.push(
        error(
          file,
          0,
          `Anexo em formato binário sob \`${prefix}\`: \`.${extension}\` não se lê em diff nem se revisa em PR.`,
          'Guarde a fonte em texto (Mermaid num bloco de código, SVG, ou o `.puml`/`.dot` que o gera) e ' +
            'mantenha o binário fora da documentação versionada (spec §13, `RN-0023`).',
        ),
      )
    }

    // 2 — links.
    for (const file of files) {
      if (!file.endsWith('.md')) continue
      const source = readTextFile(context.root, file)
      if (source === null) continue

      for (const link of findLinks(stripCode(source))) {
        if (link.kind === 'wikilink') {
          const target = link.target.replace(/\.md$/i, '')
          const resolved = corpus.has(`${target}.md`) || corpus.has(target) || index.has(target.toLowerCase())

          if (!resolved) {
            findings.push(
              error(
                file,
                link.line,
                `\`[[${link.target}]]\` não tem destino: nenhum documento do corpus se chama assim.`,
                'Aponte para um documento existente pelo nome do arquivo, ou troque por um link relativo. ' +
                  'Wikilink sem destino afirma uma ligação que não existe (`RN-0023`).',
              ),
            )
          }
          continue
        }

        const resolved = resolveTarget(file, link.target)
        if (resolved === null) continue

        if (resolved.startsWith('..') || !existsSync(join(context.root, resolved))) {
          findings.push(
            error(
              file,
              link.line,
              `Link interno quebrado: \`${link.target}\` resolve para \`${resolved}\`, que não existe.`,
              'Corrija o caminho, ou remova o link. A âncora (`#seção`) não é verificada — só o arquivo —, ' +
                'então um link com âncora só reprova quando o arquivo não existe (`RN-0023`).',
            ),
          )
        }
      }
    }

    return findings
  },
}
```

- [ ] **Step 4: Rodar e ver passar**

```bash
docker compose exec toolkit node --test test/checks/ci8-links.test.ts
docker compose exec toolkit npm run typecheck
```

Esperado: PASS e type-check limpo.

- [ ] **Step 5: Commit**

```bash
git add src/checks/ci8-links.ts test/checks/ci8-links.test.ts
git commit -m "feat(RN-0023): CI-8 — link interno quebrado e anexo binário sob docs/"
```

---

### Task 8: O que o `init` escreve — `documents:`, CODEOWNERS e o `pay-when` do TDR

**Objetivo:** `RF-0012`. Sem esta task, registrar `CI-7` no `validate` (Task 9)
faria o `init` entregar, na primeira execução, um repositório que reprova no
próprio check — e os testes de `test/acceptance/consumer-repo.test.ts` diriam
isso na cara. É por isso que ela vem **antes** do registro.

**Files:**

- Modify: `src/cli/init.ts`
- Modify: `templates/ownership.yml`
- Modify: `templates/CODEOWNERS`
- Modify: `templates/tdr.md`
- Modify: `test/cli/init.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consome: `OWNERSHIP_PATH`, `RETIRED_IDS_PATH`, `DOCUMENT_ROLES`; o mecanismo
  de template que já existe (`{{CHAVE}}`).
- Produz: `documents:` no `.ownership.yml` que o `init` escreve, e
  `declareDocuments` para o repositório que sobe de estágio.

**Requisitos:**

- Todo estágio declara `docs/.ownership.yml` e `docs/ids-retired.txt` — os dois
  nascem em `solo`, e os dois estão sob a raiz da documentação.
- `small-team` acrescenta `CONTRIBUTING.md`, a Definition of Done (com
  `role: definition-of-done`), o contrato do agente (com
  `role: agent-contract`), `docs/glossary.md` e `docs/charter/`.
- `production` acrescenta `docs/contracts/errors.md`,
  `docs/contracts/versioning-policy.md`, `CHANGELOG.md`,
  `docs/deprecations.md` e `docs/migrations/`.
- O caminho do contrato do agente é o **adotado**: `AGENTS.md` quando existe,
  `CLAUDE.md` quando não. Declarar `CLAUDE.md` num repositório que tem
  `AGENTS.md` seria declarar um arquivo que o `init` não criou.
- `documents:` fica **depois** de `generated:` no template. Não é gosto: o
  `declareArtifacts` insere bloco de artefato imediatamente antes de
  `\ngenerated:`, e um `documents:` entre `artifacts:` e `generated:` faria a
  entrada de artefato nascer dentro da lista de documentos.
- Repositório que sobe de estágio: `declareDocuments` insere as entradas
  faltantes logo depois da linha `documents:`, quando ela existe; cria o bloco
  inteiro antes de `\nwatches:` quando não existe; e, sem nenhuma das duas
  âncoras, escreve uma linha em `notInstalled` em vez de adivinhar. Mesma
  política de `declareArtifacts`.
- Idempotência (`RF-0002`): rodar duas vezes não duplica entrada.
- `templates/tdr.md` ganha o `pay-when` **comentado**, com exemplo. O `init` e a
  skill não inventam gatilho, pela mesma razão que não inventam `watches`: o TDR
  novo nasce sem ele e `CI-4` cobra na hora, nomeando o que falta — que é
  exatamente a conversa que precisa acontecer.

**`HK-5`:** `docs/requirements/functional.md` (`src/cli/**`) — viajou na Task 2,
com `RF-0012`. `src/cli/**` e `templates/**` são `consumer-visible`: a entrada de
CHANGELOG está no Step 5 e viaja neste commit.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `test/cli/init.test.ts`:

```typescript
import { parseOwnership } from '../../src/config/ownership.ts'

function ownershipOf(root: string) {
  return parseOwnership(readFileSync(join(root, 'docs/.ownership.yml'), 'utf8'))
}

test('RF-0012: solo declara o mapa e os IDs retirados em documents:', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'solo' })
    const documents = ownershipOf(root).documents

    assert.deepEqual(documents.map(document => document.path).sort(), ['docs/.ownership.yml', 'docs/ids-retired.txt'])
    assert.ok(documents.every(document => document.owner === '@time'))

    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8')
    assert.match(codeowners, /docs\/ids-retired\.txt\s+@time/)
    assert.match(codeowners, /docs\/\.ownership\.yml\s+@time/)
  })
})

test('RF-0012: small-team declara os acordos, a linguagem e os dois papéis', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'small-team' })
    const documents = ownershipOf(root).documents
    const byPath = new Map(documents.map(document => [document.path, document]))

    for (const path of ['CONTRIBUTING.md', 'docs/definition-of-done.md', 'CLAUDE.md', 'docs/glossary.md', 'docs/charter/']) {
      assert.ok(byPath.has(path), `${path} deveria estar declarado`)
    }
    assert.equal(byPath.get('CLAUDE.md')?.role, 'agent-contract')
    assert.equal(byPath.get('docs/definition-of-done.md')?.role, 'definition-of-done')
    assert.equal(byPath.get('docs/glossary.md')?.skill, 'glossary-keeper')
    assert.equal(byPath.get('docs/charter/')?.skill, 'charter-keeper')
  })
})

test('RF-0012: production declara contratos e rastro histórico', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'production' })
    const paths = ownershipOf(root).documents.map(document => document.path)

    for (const path of ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md', 'CHANGELOG.md', 'docs/deprecations.md', 'docs/migrations/']) {
      assert.ok(paths.includes(path), `${path} deveria estar declarado`)
    }
  })
})

test('RF-0012: o contrato do agente declarado é o adotado, não o padrão', () => {
  withTempRepo({ 'AGENTS.md': '# contrato preexistente\n' }, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'small-team' })
    const documents = ownershipOf(root).documents

    assert.ok(documents.some(document => document.path === 'AGENTS.md' && document.role === 'agent-contract'))
    assert.equal(
      documents.some(document => document.path === 'CLAUDE.md'),
      false,
    )
  })
})

test('RF-0002 e RF-0012: subir de estágio acrescenta as entradas que faltam, sem duplicar', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'solo' })
    runInit(root, { owner: '@time', dryRun: false, stage: 'small-team' })

    const paths = ownershipOf(root).documents.map(document => document.path)
    assert.ok(paths.includes('CONTRIBUTING.md'), 'a segunda execução declarou o que criou')
    assert.equal(new Set(paths).size, paths.length, 'nenhuma entrada duplicada')

    // e uma terceira execução não muda mais nada
    const antes = readFileSync(join(root, 'docs/.ownership.yml'), 'utf8')
    runInit(root, { owner: '@time', dryRun: false, stage: 'small-team' })
    assert.equal(readFileSync(join(root, 'docs/.ownership.yml'), 'utf8'), antes)
  })
})

test('RF-0012: sem âncora no .ownership.yml, o init diz o que falta em vez de adivinhar', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'solo' })
    // arquivo reorganizado à mão: nem `documents:` nem `watches:` no começo de linha
    writeFileSync(
      join(root, 'docs/.ownership.yml'),
      'version: 1\nartifacts:\n  - id-prefix: ADR\n    path: docs/decisions/adr/\n    owner: "@time"\n    skill: decision-recorder\n',
      'utf8',
    )

    const result = runInit(root, {
      owner: '@time',
      dryRun: false,
      stage: 'small-team',
    })
    assert.ok(result.notInstalled.some(item => /documents/.test(item)))
  })
})

test('RN-0019: o template de TDR traz o `pay-when` como exemplo comentado, não inventado', () => {
  const template = readFileSync(join(toolkitRoot(), 'templates/tdr.md'), 'utf8')
  assert.match(template, /# pay-when:/, 'o exemplo é comentado — o init não inventa gatilho')
  assert.doesNotMatch(template, /^pay-when:/m, 'gatilho preenchido de fábrica passaria em CI-4 sem significar nada')
})
```

Acrescente `toolkitRoot` ao import de `../../src/core/roots.ts` no arquivo, se
ainda não estiver lá.

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/cli/init.test.ts
```

Esperado: FAIL — `documents` sai vazio.

- [ ] **Step 3: Implementar em `src/cli/init.ts`**

Acrescente, depois de `HISTORY_DIRS`:

```typescript
/**
 * Documento que o `init` declara em `documents:` (`RF-0012`, `ADR-0008`).
 *
 * Todo documento que o `init` cria e que não tem família de IDs entra aqui: um
 * documento criado e não declarado é um repositório que reprova no próprio
 * `CI-7` na primeira execução.
 */
interface DocumentSeed {
  path: string
  skill: string | null
  role: 'agent-contract' | 'definition-of-done' | null
}

/** Declarados em todo estágio: os dois nascem já no `solo`. */
const BASE_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: OWNERSHIP_PATH, skill: 'living-docs-bootstrap', role: null },
  { path: RETIRED_IDS_PATH, skill: 'living-docs-bootstrap', role: null },
])

const SMALL_TEAM_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: 'CONTRIBUTING.md', skill: 'working-agreements-keeper', role: null },
  {
    path: 'docs/definition-of-done.md',
    skill: 'working-agreements-keeper',
    role: 'definition-of-done',
  },
  { path: 'docs/glossary.md', skill: 'glossary-keeper', role: null },
  { path: 'docs/charter/', skill: 'charter-keeper', role: null },
])

const PRODUCTION_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: 'docs/contracts/errors.md', skill: 'contract-keeper', role: null },
  {
    path: 'docs/contracts/versioning-policy.md',
    skill: 'contract-keeper',
    role: null,
  },
  { path: 'CHANGELOG.md', skill: 'release-historian', role: null },
  { path: 'docs/deprecations.md', skill: 'release-historian', role: null },
  { path: 'docs/migrations/', skill: 'release-historian', role: null },
])

/** O contrato do agente: adota `AGENTS.md` quando ele já existe (`RF-0002`). */
function agentContractPath(root: string): string {
  return existsSync(join(root, 'AGENTS.md')) ? 'AGENTS.md' : 'CLAUDE.md'
}

function documentSeeds(root: string, stage: Stage): DocumentSeed[] {
  if (stage === 'solo') return [...BASE_DOCUMENTS]

  const seeds: DocumentSeed[] = [
    ...BASE_DOCUMENTS,
    ...SMALL_TEAM_DOCUMENTS,
    {
      path: agentContractPath(root),
      skill: 'working-agreements-keeper',
      role: 'agent-contract',
    },
  ]
  if (stage === 'production') seeds.push(...PRODUCTION_DOCUMENTS)
  return seeds
}

function documentEntry(seed: DocumentSeed, owner: string): string {
  const lines = [`  - path: ${seed.path}`, `    owner: "${owner}"`]
  if (seed.skill !== null) lines.push(`    skill: ${seed.skill}`)
  if (seed.role !== null) lines.push(`    role: ${seed.role}`)
  return lines.join('\n')
}

/** O bloco `documents:` do `.ownership.yml` (`ADR-0008`). */
function documentsBlock(root: string, owner: string, stage: Stage): string {
  const entries = documentSeeds(root, stage).map(seed => documentEntry(seed, owner))

  return [
    '# Documento com dono e SEM família de IDs (ADR-0008, que resolve DA-0002).',
    '# CI-4 cobra a revisão e CI-7 cobra o dono; CI-1, CI-2 e HK-1 não leem daqui.',
    '# `role` é vocabulário fechado: agent-contract, definition-of-done.',
    'documents:',
    ...entries,
    '',
  ].join('\n')
}
```

Acrescente `DOCUMENTS_BLOCK: documentsBlock(root, options.owner, options.stage),`
ao objeto `values`, e `docs/ids-retired.txt    ${options.owner}\n` ao valor de
CODEOWNERS que o template consome — o mais simples é acrescentar uma chave nova,
`RETIRED_CODEOWNERS`, e usá-la no template.

Troque a checagem de adoção do contrato do agente para reusar
`agentContractPath`, mantendo o comportamento:

```typescript
// O contrato do agente pode já existir com outro nome. Adotar, nunca duplicar
// (RF-0002): dois contratos é a garantia de que um deles está errado.
const contract = agentContractPath(root)
if (contract === 'AGENTS.md') {
  result.adopted.push({ idPrefix: 'contrato do agente', path: 'AGENTS.md' })
} else {
  writeIfAbsent(root, contract, template('agent-contract.md', values), options, result)
}
```

E, para o repositório que sobe de estágio, acrescente ao fim do arquivo:

```typescript
/**
 * Declara em `documents:` o que ainda não está lá, num `.ownership.yml` que já
 * existe.
 *
 * Duas âncoras, na ordem: a linha `documents:` (as entradas entram logo depois
 * dela, porque ordem de lista YAML não significa nada) e `\nwatches:` (o bloco
 * inteiro entra antes dela). Sem nenhuma das duas — arquivo reorganizado à mão —
 * o init **não adivinha**: ele diz o que falta e deixa a edição para quem é dono
 * do arquivo. Mesma política de `declareArtifacts`.
 */
function declareDocuments(root: string, options: InitOptions, result: InitResult, existing: OwnershipConfig): void {
  const declared = new Set(existing.documents.map(document => document.path))
  const faltando = documentSeeds(root, options.stage).filter(seed => !declared.has(seed.path))
  if (faltando.length === 0) return

  const file = join(root, OWNERSHIP_PATH)
  const source = readFileSync(file, 'utf8').replace(/\r\n/g, '\n')
  const entries = faltando.map(seed => documentEntry(seed, options.owner)).join('\n')

  result.created.push(`${OWNERSHIP_PATH} (${faltando.length} documento(s) em documents:)`)

  if (source.includes('\ndocuments:')) {
    if (options.dryRun) return
    writeFileSync(file, source.replace('\ndocuments:', `\ndocuments:\n${entries}`), 'utf8')
    return
  }

  if (source.includes('\nwatches:')) {
    if (options.dryRun) return
    writeFileSync(file, source.replace('\nwatches:', `\ndocuments:\n${entries}\n\nwatches:`), 'utf8')
    return
  }

  result.created.pop()
  result.notInstalled.push(
    `documents: em ${OWNERSHIP_PATH} — âncora \`documents:\` ou \`watches:\` não encontrada; ` + 'declare os documentos à mão para que eles tenham dono (CI-7)',
  )
}
```

e chame-a no fim de `runInit`, antes do `return`:

```typescript
// O bloco vai no template na primeira execução; aqui é o caso de quem já tinha
// um `.ownership.yml` — de uma versão anterior, ou de um estágio menor.
if (existing !== null) declareDocuments(root, options, result, existing)
```

- [ ] **Step 4: Ajustar os templates**

Em `templates/ownership.yml`, imediatamente **depois** do bloco de comentário de
`generated:` e **antes** do comentário do mecanismo 1, acrescente uma linha:

```
{{DOCUMENTS_BLOCK}}
```

Em `templates/CODEOWNERS`, acrescente `{{RETIRED_CODEOWNERS}}` junto às outras
chaves da última linha:

```
{{REQUIREMENTS_CODEOWNERS}}{{AGREEMENTS_CODEOWNERS}}{{CONTRACTS_CODEOWNERS}}{{HISTORY_CODEOWNERS}}docs/.ownership.yml    {{OWNER}}
{{RETIRED_CODEOWNERS}}
```

com `RETIRED_CODEOWNERS: \`${RETIRED_IDS_PATH} ${options.owner}\``.

Em `templates/tdr.md`, acrescente ao frontmatter, depois de `relates-to: []`:

```yaml
# Gatilho de pagamento em forma de máquina (RN-0019, ADR-0007). Descomente e
# preencha: `pattern` é regex (aspas simples, para o `\` não ser escape do YAML)
# e `paths` diz onde procurá-lo. CI-4 reprova enquanto ele não existir, e é essa
# reprovação que força a conversa sobre qual é o gatilho de verdade.
#
# pay-when:
#   pattern: '^- \*\*status:\*\* revoked'
#   paths: ["docs/requirements/**"]
```

- [ ] **Step 5: Escrever a entrada de CHANGELOG**

Sob `## [Unreleased]` → `### Added`:

```markdown
- `living-docs init` declara em `documents:` todo documento que instala, com
  dono, skill dona e — para o contrato do agente e a Definition of Done — o
  `role` que `CI-7` usa para achá-los. Repositório que sobe de estágio recebe só
  as entradas que faltam; sem âncora no arquivo, o comando diz o que falta em vez
  de reescrever.
- O template de TDR traz o gatilho de pagamento de máquina (`pay-when`) como
  exemplo comentado.
```

Sob `### Changed`:

```markdown
- `CODEOWNERS` escrito pelo `init` passa a cobrir `docs/ids-retired.txt`.
```

- [ ] **Step 6: Rodar tudo**

```bash
docker compose exec toolkit node --test test/cli/init.test.ts test/acceptance/consumer-repo.test.ts
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Esperado: PASS, `validate=0`. O `.ownership.yml` **deste** repositório ainda não
tem `documents:` — isso é a Task 9, e `CI-7` ainda não está registrado.

- [ ] **Step 7: Commit**

```bash
git add src/cli/init.ts templates/ownership.yml templates/CODEOWNERS templates/tdr.md test/cli/init.test.ts CHANGELOG.md
git commit -m "feat(RF-0012, ADR-0008): init declara documents: e o template de TDR pede pay-when"
```

---

### Task 9: Registro no `validate`, catálogo, contrato regerado e o dogfooding

**Objetivo:** A task pivô. Os três checks entram no `validate`, `--base` liga a
metade do diff, o catálogo e o contrato gerado passam a dizer a verdade, e
**este repositório** passa a satisfazer o que os três cobram. As duas coisas
viajam juntas por necessidade: no instante em que `CI-7` entra em `CHECKS`, o
teste "este repositório passa nos próprios checks" começa a valer.

**Files:**

- Modify: `src/checks/registry.ts` (`validateChecks` no lugar de `CHECKS`)
- Modify: `src/checks/catalog.ts` (`CI-4`, `CI-7`, `CI-8`)
- Modify: `src/cli/validate.ts` (`--base`, ponteiro, `watched`)
- Modify: `src/cli/index.ts` (opção `--base` em `validate`, `USAGE`)
- Modify: `docs/contracts/checks.gen.md` (**regerado**, nunca editado)
- Modify: `docs/.ownership.yml` (`documents:`)
- Modify: `CODEOWNERS`
- Modify: `docs/decisions/debt/TDR-0001-congelamento-por-secao.md` (`pay-when`)
- Modify: `test/checks/registry.test.ts`, `test/cli/validate.test.ts`, `test/checks/ci2-ids.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consome: `ci4Staleness`, `ci7OwnershipCoverage`, `ci8Links`; `changedPaths`,
  `commitMessages` de `src/git/diff.ts`; `GitRunner` de `src/git/staged.ts`.
- Produz:
  - `validateChecks(diff?: DiffFacts | null): readonly Check[]` (substitui `CHECKS`)
  - `runValidate(root: string, base?: string | null, run?: GitRunner): ValidateResult`
  - `ValidateResult.watched: number` e `ValidateResult.base: string | null`

**Requisitos:**

- `CHECKS` deixa de existir. Constante estática não serve mais: `CI-7` precisa
  do diff, e diff é parâmetro. Três arquivos a importam hoje —
  `src/cli/validate.ts`, `test/checks/registry.test.ts` e
  `test/checks/ci2-ids.test.ts`; o último tem um teste do **registry** morando
  no arquivo do `CI-2` ("o registry expõe CI-1, CI-2 e CI-3 nessa ordem"), e o
  lugar dele é `test/checks/registry.test.ts`, onde a asserção nova já cobre a
  lista inteira. Apague-o de lá, junto com o import.
- O catálogo fica **ordenado por ID** (`CI-1` a `CI-8`) — é contrato público
  lido por gente. O teste do registry compara conjuntos ordenados, não a ordem de
  execução.
- `runValidate(root)` sem base: `CI-7` roda sem a metade do diff, e o comando
  imprime o ponteiro quando há `watches` declarado.
- `GitError` já é tratada em `src/cli/index.ts` — não a trate de novo.
- **Dogfooding, e ele é a prova:** ao fim desta task,
  `living-docs validate` **e** `npm test` passam neste repositório. Se `CI-7`
  acusar duplicata no `CLAUDE.md`, a correção é reescrever a frase pela
  `working-agreements-keeper`, nunca baixar `WORD_FLOOR`. Se `CI-8` acusar link
  quebrado num plano antigo, primeiro confirme que não é falso positivo de bloco
  de código: se for, o defeito é do check, e a correção é no check com o caso
  virando teste.

**`HK-5`:** vai perguntar por `docs/requirements/rules.md` (`src/checks/**`),
`docs/requirements/functional.md` (`src/cli/**`) e
`docs/contracts/checks.gen.md` (`src/checks/catalog.ts`). Os dois primeiros
viajaram na Task 2; o terceiro **viaja neste commit**, regerado. `src/cli/**` e
`src/checks/catalog.ts` são `consumer-visible`: a entrada de CHANGELOG está no
Step 6.

- [ ] **Step 1: Atualizar os testes primeiro**

Em `test/checks/registry.test.ts`, substitua o arquivo por:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CHECK_CATALOG, changelogChecks, driftChecks, validateChecks } from '../../src/checks/registry.ts'

test('RF-0006, RF-0008 e RF-0010: o catálogo cobre exatamente os checks que existem', () => {
  const reais = [...validateChecks(), ...driftChecks(() => ''), ...changelogChecks()].map(check => `${check.id}|${check.name}`).sort()
  const catalogados = CHECK_CATALOG.map(entry => `${entry.id}|${entry.name}`).sort()

  assert.deepEqual(catalogados, reais, 'catálogo e registry divergiram — o contrato gerado mentiria')
})

test('o catálogo é lido por gente: fica ordenado por ID', () => {
  const ids = CHECK_CATALOG.map(entry => Number(entry.id.replace('CI-', '')))
  assert.deepEqual(
    ids,
    [...ids].sort((a, b) => a - b),
  )
})

test('RF-0006: todo item do catálogo diz quando falha e por qual comando roda', () => {
  for (const entry of CHECK_CATALOG) {
    assert.ok(entry.failsWhen.length > 20, `${entry.id} sem condição de falha escrita`)
    assert.match(entry.command, /^living-docs (validate|drift|changelog --base <ref>)$/, `${entry.id} com comando estranho`)
  }
})

test('ADR-0005, ADR-0006 e ADR-0010: cada check roda no comando que o catálogo nomeia', () => {
  const esperado: Record<string, string> = {
    'CI-1': 'living-docs validate',
    'CI-2': 'living-docs validate',
    'CI-3': 'living-docs validate',
    'CI-4': 'living-docs validate',
    'CI-5': 'living-docs drift',
    'CI-6': 'living-docs changelog --base <ref>',
    'CI-7': 'living-docs validate',
    'CI-8': 'living-docs validate',
  }

  for (const entry of CHECK_CATALOG) {
    assert.equal(entry.command, esperado[entry.id], `${entry.id} no comando errado`)
  }
  assert.equal(CHECK_CATALOG.length, Object.keys(esperado).length, 'check novo sem comando esperado declarado')
})

test('RF-0011: validateChecks recebe o diff por parâmetro, e sem ele a lista é a mesma', () => {
  const semDiff = validateChecks().map(check => check.id)
  const comDiff = validateChecks({
    base: 'origin/master',
    changed: [],
    messages: [],
  }).map(check => check.id)

  assert.deepEqual(semDiff, comDiff, 'a metade do diff é comportamento de CI-7, não um check a mais')
  assert.deepEqual(semDiff, ['CI-1', 'CI-2', 'CI-3', 'CI-4', 'CI-7', 'CI-8'])
})
```

Em `test/cli/validate.test.ts`, o repositório de teste precisa satisfazer
`CI-7`. Substitua `CONFIG` e acrescente o CODEOWNERS ao fixture:

```typescript
const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
documents:
  - path: docs/.ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
`

const CODEOWNERS = 'docs/decisions/adr/    @team\ndocs/.ownership.yml    @team\n'
```

e acrescente `CODEOWNERS` a cada `withTempRepo({ ... })` deste arquivo:

```typescript
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, CODEOWNERS, 'docs/decisions/adr/ADR-0001-a.md': GOOD }, (root) => {
```

Em `test/checks/ci2-ids.test.ts`, apague o teste que não é de `CI-2` e o import
que ele usava:

```typescript
test('o registry expõe CI-1, CI-2 e CI-3 nessa ordem', () => {
  assert.deepEqual(
    CHECKS.map(check => check.id),
    ['CI-1', 'CI-2', 'CI-3'],
  )
})
```

(e a linha `import { CHECKS } from '../../src/checks/registry.ts';`).

Acrescente também dois testes novos a `test/cli/validate.test.ts`:

```typescript
test('RF-0010: aviso é reportado e não muda o código de saída', () => {
  const antigo = GOOD.replace('last-reviewed: 2026-08-21', 'last-reviewed: 2020-01-01')
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      CODEOWNERS,
      'docs/decisions/adr/ADR-0001-a.md': antigo,
    },
    root => {
      const result = runValidate(root)

      assert.equal(result.warnings, 1, JSON.stringify(result.findings, null, 2))
      assert.equal(result.errors, 0)
      assert.equal(result.exitCode, 0, 'CI-4 avisa; aviso não reprova (spec §9)')
      assert.equal(result.findings[0]?.ruleId, 'CI-4')
    },
  )
})

test('RF-0011: com --base, CI-7 cobra o doc dono do caminho vigiado que mudou', () => {
  const comWatch = `${CONFIG}watches:
  - code: "src/domain/**"
    doc: docs/decisions/adr/
    reason: "decisão antes do código"
`
  const NUL = String.fromCharCode(0)
  const git = (args: readonly string[]): string => (args.includes('diff') ? `src/domain/x.ts${NUL}` : `feat: x${NUL}\n`)

  withTempRepo(
    {
      [OWNERSHIP_PATH]: comWatch,
      CODEOWNERS,
      'docs/decisions/adr/ADR-0001-a.md': GOOD,
    },
    root => {
      assert.equal(runValidate(root).exitCode, 0, 'sem --base, a metade do diff não roda')

      const comBase = runValidate(root, 'origin/master', git)
      assert.equal(comBase.exitCode, 1)
      assert.ok(comBase.findings.some(finding => finding.ruleId === 'CI-7' && /src\/domain\/x\.ts/.test(finding.message)))
    },
  )
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/checks/registry.test.ts test/cli/validate.test.ts
```

Esperado: FAIL — `validateChecks` não existe, `runValidate` não aceita base.

- [ ] **Step 3: Registrar os checks e acrescentá-los ao catálogo**

Em `src/checks/registry.ts`, substitua a constante `CHECKS`:

```typescript
import { ci4Staleness } from './ci4-staleness.ts'
import { ci7OwnershipCoverage } from './ci7-ownership-coverage.ts'
import { ci8Links } from './ci8-links.ts'
```

```typescript
/**
 * Checks que `living-docs validate` roda, na ordem. Nenhum deles executa nada.
 *
 * Função, e não mais constante: `CI-7` recebe o diff por injeção, como `CI-5`
 * recebe o executor e `CI-6` os fatos do diff. Sem diff, a metade do diff de
 * `CI-7` simplesmente não roda (`ADR-0010`).
 */
export function validateChecks(diff: DiffFacts | null = null): readonly Check[] {
  return [ci1Structure, ci2Ids, ci3Traceability, ci4Staleness, ci7OwnershipCoverage(diff), ci8Links]
}
```

Em `src/checks/catalog.ts`, acrescente as três entradas **na posição do ID**
(`CI-4` depois de `CI-3`; `CI-7` e `CI-8` no fim):

```typescript
  {
    id: 'CI-4',
    name: 'staleness',
    command: 'living-docs validate',
    failsWhen:
      'Uma dívida `open` não declara `pay-when` verificável, ou o gatilho declarado já aconteceu no repositório. `last-reviewed` além de `stale-after-months` produz aviso, não falha — e item em estado congelado não vence.',
  },
```

```typescript
  {
    id: 'CI-7',
    name: 'ownership coverage',
    command: 'living-docs validate',
    failsWhen:
      'Documento do corpus sem entrada no `.ownership.yml` ou sem linha no CODEOWNERS; regra de `watches` cujo `doc` não existe ou não tem dono; contrato do agente repetindo frase de artefato dono; item da Definition of Done sem verificação nomeada; e, com `--base <ref>`, caminho vigiado alterado sem o doc dono e sem `Docs: none — <razão>`.',
  },
  {
    id: 'CI-8',
    name: 'links',
    command: 'living-docs validate',
    failsWhen:
      'Link interno relativo que não resolve para arquivo ou diretório existente; `[[wikilink]]` sem destino no corpus; arquivo em formato binário sob a raiz da documentação. Link dentro de bloco de código ou de marcação inline não conta.',
  },
```

- [ ] **Step 4: Ligar `--base` ao `validate`**

`src/cli/validate.ts` inteiro:

```typescript
import { loadOwnership } from '../config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../docs/collect.ts'
import { validateChecks } from '../checks/registry.ts'
import { changedPaths, commitMessages } from '../git/diff.ts'
import type { GitRunner } from '../git/staged.ts'
import { todayIso } from '../core/dates.ts'
import type { Finding } from '../core/types.ts'

export interface ValidateResult {
  findings: Finding[]
  errors: number
  warnings: number
  exitCode: number
  /** Artefatos gerados declarados — checados por `living-docs drift`, não aqui (ADR-0005). */
  generated: number
  /** Globs de `consumer-visible-paths` — checados por `living-docs changelog`, não aqui (ADR-0006). */
  consumerVisible: number
  /** Vínculos código→doc declarados — a metade do diff exige `--base` (ADR-0010). */
  watched: number
  base: string | null
}

/**
 * `living-docs validate [--base <ref>]`.
 *
 * Com `base`, fala com o git **aqui** e passa os fatos ao `CI-7` — o check
 * continua sendo função pura de (fatos, configuração, árvore) → achados, como
 * `CI-5` e `CI-6`.
 */
export function runValidate(root: string, base: string | null = null, run?: GitRunner): ValidateResult {
  const config = loadOwnership(root)
  const context = {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: todayIso(),
  }

  const diff =
    base === null
      ? null
      : {
          base,
          changed: changedPaths(root, base, run),
          messages: commitMessages(root, base, run),
        }

  const findings = validateChecks(diff).flatMap(check => check.run(context))
  const errors = findings.filter(finding => finding.severity === 'error').length

  return {
    findings,
    errors,
    warnings: findings.length - errors,
    exitCode: errors > 0 ? 1 : 0,
    generated: config.generated.length,
    consumerVisible: config.consumerVisiblePaths.length,
    watched: config.watches.length,
    base,
  }
}
```

Em `src/cli/index.ts`, atualize o `USAGE` e o ramo de `validate`:

```
  validate    Roda os checks de estado da árvore (CI-1, CI-2, CI-3, CI-4, CI-7, CI-8)
```

```
Opções de validate:
  --base <ref>        Base do diff — liga a metade de CI-7 que lê o diff da branch
```

```typescript
if (command === 'validate') {
  const baseIndex = argv.indexOf('--base')
  const base = baseIndex === -1 ? null : (argv[baseIndex + 1] ?? '')
  if (base === '') {
    process.stderr.write('living-docs: `--base` precisa de uma ref — a base do diff não se adivinha (CI-7, ADR-0010).\n')
    return 2
  }

  const result = runValidate(root, base)
  process.stdout.write(`${formatFindings(result.findings)}\n`)

  if (result.generated > 0) {
    process.stdout.write(
      `living-docs: ${result.generated} artefato(s) gerado(s) declarado(s) — a deriva de contrato é verificada por \`living-docs drift\` (CI-5).\n`,
    )
  }
  if (result.consumerVisible > 0) {
    process.stdout.write(
      `living-docs: ${result.consumerVisible} caminho(s) visível(is) ao consumidor declarado(s) — a entrada de CHANGELOG é verificada por \`living-docs changelog --base <ref>\` (CI-6).\n`,
    )
  }
  // Ponteiro, não achado: sem base não há diff, e ficar calado sobre a metade
  // que não rodou seria fingir a cobertura que o critério 5 pede inteira.
  if (result.base === null && result.watched > 0) {
    process.stdout.write(
      `living-docs: ${result.watched} vínculo(s) código→doc declarado(s) — o caminho vigiado que mudou sem o doc dono é verificado por \`living-docs validate --base <ref>\` (CI-7).\n`,
    )
  }
  return result.exitCode
}
```

- [ ] **Step 5: O dogfooding — este repositório declara seus documentos**

Em `docs/.ownership.yml`, acrescente depois do bloco `generated:` e antes de
`watches:`:

```yaml
# Documento com dono e SEM família de IDs (ADR-0008, que resolve DA-0002).
# CI-4 cobra a revisão e CI-7 cobra o dono; CI-1, CI-2 e HK-1 não leem daqui.
documents:
  - path: docs/.ownership.yml
    owner: '@esliph/engineering'
    skill: living-docs-bootstrap
  - path: docs/ids-retired.txt
    owner: '@esliph/engineering'
    skill: living-docs-bootstrap
  - path: CONTRIBUTING.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
  - path: docs/definition-of-done.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    role: definition-of-done
  - path: CLAUDE.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    role: agent-contract
  - path: docs/glossary.md
    owner: '@esliph/engineering'
    skill: glossary-keeper
  - path: docs/charter/
    owner: '@esliph/engineering'
    skill: charter-keeper
  - path: docs/contracts/errors.md
    owner: '@esliph/engineering'
    skill: contract-keeper
  - path: docs/contracts/versioning-policy.md
    owner: '@esliph/engineering'
    skill: contract-keeper
  - path: CHANGELOG.md
    owner: '@esliph/engineering'
    skill: release-historian
  - path: docs/deprecations.md
    owner: '@esliph/engineering'
    skill: release-historian
  - path: docs/migrations/
    owner: '@esliph/engineering'
    skill: release-historian

  # Sem skill dona, e isso é informação: plano, spec e README têm dono e não têm
  # keeper. Ficam fora do corpus de duplicação de CI-7 (ADR-0009) porque citam os
  # artefatos por ofício — reprovar o contrato do agente por causa de um plano
  # que o citou inverteria quem copiou de quem.
  - path: docs/superpowers/
    owner: '@esliph/engineering'
  - path: LIVING-DOCUMENTATION-TOOLKIT.md
    owner: '@esliph/engineering'
  - path: LIVING-DOCUMENTATION.md
    owner: '@esliph/engineering'
  - path: README.md
    owner: '@esliph/engineering'
```

Em `CODEOWNERS`, acrescente as linhas que faltam:

```
docs/ids-retired.txt    @esliph/engineering
docs/superpowers/    @esliph/engineering
LIVING-DOCUMENTATION-TOOLKIT.md    @esliph/engineering
LIVING-DOCUMENTATION.md    @esliph/engineering
README.md    @esliph/engineering
```

Em `docs/decisions/debt/TDR-0001-congelamento-por-secao.md`, acrescente ao
frontmatter, depois de `relates-to: [RN-0006]`:

```yaml
# Aspas simples: em YAML, aspas simples não processam `\`, e o padrão é regex.
pay-when:
  pattern: '^- \*\*status:\*\* revoked'
  paths: ['docs/requirements/**']
```

O gatilho em prosa continua no corpo, e é ele que explica o porquê — o
`pay-when` é a forma que a máquina lê. `TDR-0001` está `open`, não congelado:
`HK-1` permite a edição.

- [ ] **Step 6: Regerar o contrato e escrever a entrada de CHANGELOG**

```bash
docker compose exec -w /workspace toolkit sh -c 'node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md'
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Esperado: `drift=0`. Se `HK-2` negar uma edição neste arquivo, você tentou
editá-lo à mão — a fonte é `src/checks/catalog.ts`.

Em `CHANGELOG.md`, sob `## [Unreleased]` → `### Added`:

```markdown
- `CI-4` (staleness), `CI-7` (ownership coverage) e `CI-8` (links) passam a rodar
  em `living-docs validate`. `CI-4` é o único que produz aviso: aviso é
  reportado e não muda o código de saída.
- `living-docs validate --base <ref>` liga a metade de `CI-7` que lê o diff da
  branch: caminho vigiado alterado sem o doc dono reprova, e a saída escrita é
  `Docs: none — <razão>` numa mensagem de commit do intervalo.
```

Sob `### Changed`:

```markdown
- `docs/contracts/checks.gen.md` passa a listar oito checks, ordenados por ID.
```

- [ ] **Step 7: Rodar tudo, e é aqui que o dogfooding cobra**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate --base origin/master; echo "validate --base=$?"
```

Esperado: PASS, `validate=0`, `drift=0`. Para `validate --base origin/master`, o
resultado esperado depende do que a branch mudou: se ela tocou `src/checks/**`
sem `docs/requirements/rules.md`, a resposta certa é a que este plano já dá — o
doc dono viajou na Task 2, e a saída é `Docs: none — <razão>` na mensagem deste
commit, ou o próprio doc no diff da branch.

**Se `validate` acusar achado, leia antes de consertar:**

| Achado                                 | Provável causa                                                       | Correção                                                                                                                         |
| -------------------------------------- | -------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `CI-7`: documento sem entrada          | um arquivo sob `docs/` que o Step 5 não declarou                     | declare em `documents:` **e** no CODEOWNERS                                                                                      |
| `CI-7`: duplicata no `CLAUDE.md`       | uma frase de 12+ palavras do contrato existe igual num artefato dono | reescreva a frase do contrato deixando o ponteiro (skill: working-agreements-keeper). **Não** baixe `WORD_FLOOR`                 |
| `CI-7`: item de DoD sem verificação    | um item da DoD deste repositório não cita `CI-n`/`HK-n`/humana       | acrescente a verificação, ou tire o item                                                                                         |
| `CI-8`: link quebrado num plano antigo | ou o link está mesmo quebrado, ou está dentro de bloco de código     | confirme no arquivo. Se está em bloco, o defeito é do `stripCode`: conserte-o e acrescente o caso a `test/docs/markdown.test.ts` |
| `CI-4`: aviso de `last-reviewed`       | um documento passou de 6 meses                                       | leia-o de verdade e atualize a data, ou deixe o aviso — ele não reprova                                                          |
| `CI-4`: `TDR-0001` sem `pay-when`      | o Step 5 não foi aplicado                                            | aplique                                                                                                                          |

- [ ] **Step 8: Commit**

```bash
git add src/checks/registry.ts src/checks/catalog.ts src/cli/validate.ts src/cli/index.ts docs/contracts/checks.gen.md docs/.ownership.yml CODEOWNERS docs/decisions/debt/TDR-0001-congelamento-por-secao.md test/checks/registry.test.ts test/cli/validate.test.ts CHANGELOG.md
git commit -m "feat(RF-0010, RF-0011, RN-0016): CI-4, CI-7 e CI-8 no validate, e o dogfooding que eles exigem"
```

---

### Task 10: `HK-6` — o inventário no `SessionStart`

**Objetivo:** Fechar o critério de aceite 8 da spec §12. É o sétimo hook, o
primeiro num evento que não é de ferramenta, e o primeiro que **reusa** as
funções de um check em vez de reimplementá-las.

**Files:**

- Create: `src/hooks/hk6-session-inventory.ts`
- Test: `test/hooks/hk6-session-inventory.test.ts`
- Modify: `plugin/hooks/hooks.json`
- Modify: `test/plugin/manifest.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consome: `contextOutput('SessionStart', …)`, `emit`, `hookEnv`, `readPayload`
  de `src/hooks/lib/io.ts`; `loadOwnership`; `collectArtifacts`,
  `collectDocuments`; `duePayments`, `staleDocs` de
  `src/checks/ci4-staleness.ts`; `statesFor`; `todayIso`.
- Produz:
  - `type Hk6Decision = { action: 'silent' } | { action: 'inform'; context: string }`
  - `decideHk6(env: HookEnv, today: string): Hk6Decision`

**Requisitos:**

- Saída é `additionalContext`, sempre. Este arquivo não conhece a palavra
  `deny` nem a palavra `ask` (`RN-0022`, spec §7).
- Falha aberta (`RNF-0001`): configuração ilegível, coleta que estoura, qualquer
  erro → `silent`. `main` termina com `.catch(() => process.exit(0))`, igual aos
  outros seis.
- `today` entra por parâmetro. O hook lê o relógio uma vez, no `main`
  (`RNF-0004`).
- Curto por obrigação: no máximo `MAX_ITEMS` itens por lista, com a contagem
  total ao lado. Inventário que ninguém lê custa contexto em toda sessão e é a
  wiki morta chegando pelo outro lado (`RN-0022`).
- Não reimplementa staleness nem vencimento de dívida: chama `staleDocs` e
  `duePayments`. Se o inventário e o `CI-4` discordassem, um dos dois estaria
  mentindo, e ninguém saberia qual.

**`HK-5`:** `docs/requirements/rules.md` (`src/hooks/**`) — viajou na Task 2,
com `RN-0022`. `plugin/**` é `consumer-visible`: entrada de CHANGELOG no Step 5.

- [ ] **Step 1: Escrever o teste que falha**

Crie `test/hooks/hk6-session-inventory.test.ts`:

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideHk6 } from '../../src/hooks/hk6-session-inventory.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const HOJE = '2026-08-27'

const OWNERSHIP = `
version: 1
stale-after-months: 6
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    collection: table
    field-map:
      resolved-by: "Resolvida por"
  - id-prefix: TDR
    path: docs/decisions/debt/
    owner: "@time"
    skill: decision-recorder
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@time"
    skill: requirements-keeper
    collection: sections
documents:
  - path: CONTRIBUTING.md
    owner: "@time"
    skill: working-agreements-keeper
`

const DAS = [
  '---',
  'title: Open Decisions',
  'owner: "@time"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-20',
  '---',
  '',
  '| ID | Lacuna | Status | Resolvida por | Aberta em |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | Como declarar X | open | — | 2026-08-01 |',
  '',
].join('\n')

const REGRAS_REVOGADA = [
  '---',
  'title: Regras',
  'owner: "@time"',
  'trigger: A toda regra nova.',
  'last-reviewed: 2026-08-20',
  '---',
  '',
  '## RN-0001 — Uma regra',
  '',
  '- **status:** revoked',
  '- **revoked-by:** RN-0002',
  '',
].join('\n')

const DIVIDA = [
  '---',
  'id: TDR-0001',
  'title: Atalho',
  'status: open',
  'owner: "@time"',
  'trigger: Quando o gatilho abaixo se cumprir.',
  'last-reviewed: 2026-08-01',
  'pay-when:',
  "  pattern: '^- \\*\\*status:\\*\\* revoked'",
  '  paths: ["docs/requirements/**"]',
  '---',
  '',
  '# TDR-0001 — Atalho',
  '',
].join('\n')

const ARVORE = {
  'docs/.ownership.yml': OWNERSHIP,
  'docs/open-decisions.md': DAS,
  'docs/requirements/rules.md': REGRAS_REVOGADA,
  'docs/decisions/debt/TDR-0001-x.md': DIVIDA,
  'CONTRIBUTING.md': '---\ntitle: Como\nowner: "@time"\ntrigger: quando muda o processo\nlast-reviewed: 2024-01-01\n---\n\n# Como\n',
}

test('critério 8: o inventário chega ao contexto sem ninguém procurar', () => {
  withTempRepo(ARVORE, root => {
    const decision = decideHk6({ root, hostRoots: [root] }, HOJE)
    assert.equal(decision.action, 'inform')

    const context = decision.action === 'inform' ? decision.context : ''
    assert.match(context, /HK-6/)
    assert.match(context, /DA-0001/, 'decisão aberta')
    assert.match(context, /TDR-0001/, 'dívida com gatilho cumprido')
    assert.match(context, /CONTRIBUTING\.md/, 'documento vencido')
    assert.match(context, /docs\/decisions\/adr\//, 'artefato declarado e ausente')
  })
})

test('RN-0022: é injeção de contexto, nunca decisão de permissão', () => {
  withTempRepo(ARVORE, root => {
    const decision = decideHk6({ root, hostRoots: [root] }, HOJE)
    const context = decision.action === 'inform' ? decision.context : ''

    assert.doesNotMatch(context, /\bdeny\b/)
    assert.doesNotMatch(context, /permissionDecision/)
    assert.match(context, /não bloqueia|contexto/i)
  })
})

test('RN-0022: o inventário é curto — lista longa aparece truncada com a contagem', () => {
  const muitas = [...DAS.split('\n').slice(0, -1), ...Array.from({ length: 9 }, (_, i) => `| DA-000${i + 2} | Lacuna ${i} | open | — | 2026-08-01 |`), ''].join(
    '\n',
  )

  withTempRepo({ ...ARVORE, 'docs/open-decisions.md': muitas }, root => {
    const decision = decideHk6({ root, hostRoots: [root] }, HOJE)
    const context = decision.action === 'inform' ? decision.context : ''

    assert.match(context, /\(10\)/, 'a contagem total aparece')
    assert.equal((context.match(/DA-\d{4}/g) ?? []).length <= 6, true, 'só os primeiros entram')
  })
})

test('RNF-0001: configuração ilegível cala o hook em vez de estourar', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 99\n' }, root => {
    assert.deepEqual(decideHk6({ root, hostRoots: [root] }, HOJE), {
      action: 'silent',
    })
  })
  withTempRepo({ 'README.md': '' }, root => {
    assert.deepEqual(decideHk6({ root, hostRoots: [root] }, HOJE), {
      action: 'silent',
    })
  })
})

test('HK-6 não reimplementa CI-4: sem dívida vencida e sem doc velho, as duas linhas não aparecem', () => {
  const semDivida = { ...ARVORE }
  delete (semDivida as Record<string, string>)['docs/decisions/debt/TDR-0001-x.md']
  semDivida['CONTRIBUTING.md'] = '---\ntitle: Como\nowner: "@time"\ntrigger: quando muda o processo\nlast-reviewed: 2026-08-20\n---\n\n# Como\n'

  withTempRepo(semDivida, root => {
    const decision = decideHk6({ root, hostRoots: [root] }, HOJE)
    const context = decision.action === 'inform' ? decision.context : ''

    assert.doesNotMatch(context, /gatilho de pagamento/)
    assert.doesNotMatch(context, /vencid/)
    assert.match(context, /DA-0001/, 'o resto do inventário continua')
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit node --test test/hooks/hk6-session-inventory.test.ts
```

Esperado: FAIL — módulo não encontrado.

- [ ] **Step 3: Escrever `src/hooks/hk6-session-inventory.ts`**

```typescript
#!/usr/bin/env node
/**
 * SessionStart: injeta o inventário da documentação viva no contexto.
 *
 * Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §7 e `RN-0022` — "resolve 'se
 * ninguém lê, não está vivo' na origem". A saída é `additionalContext`, e este
 * arquivo não conhece `deny` nem `ask`.
 *
 * Não reimplementa `CI-4`: chama `staleDocs` e `duePayments`. Um inventário que
 * discordasse do check faria dois números diferentes sobre a mesma pergunta, e
 * ninguém saberia qual acreditar.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadOwnership } from '../config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../docs/collect.ts'
import type { ArtifactDoc } from '../docs/collect.ts'
import { duePayments, staleDocs } from '../checks/ci4-staleness.ts'
import { statesFor } from '../docs/schema.ts'
import { todayIso } from '../core/dates.ts'
import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv } from './lib/io.ts'

export type Hk6Decision = { action: 'silent' } | { action: 'inform'; context: string }

const SILENT: Hk6Decision = { action: 'silent' }

/**
 * Quantos itens de cada lista entram no contexto. O inventário é lido em toda
 * sessão: lista longa custa contexto sempre e ensina a pular o bloco inteiro.
 */
const MAX_ITEMS = 5

/** O estado que identifica família de decisão aberta (spec §4: `open → resolved`). */
const DECISION_STATE = 'resolved'

function shorten(items: readonly string[]): string {
  const shown = items.slice(0, MAX_ITEMS).join('; ')
  return items.length > MAX_ITEMS ? `${shown}; … (+${items.length - MAX_ITEMS})` : shown
}

/** Decisões abertas: itens `open` de família cuja máquina de estados tem `resolved`. */
function openDecisions(docs: readonly ArtifactDoc[]): string[] {
  const found: string[] = []

  for (const doc of docs) {
    if (!statesFor(doc.rule)?.includes(DECISION_STATE)) continue

    if (doc.rule.collection === 'per-file') {
      const data = doc.frontmatter?.data
      if (data?.status === 'open') found.push(`${String(data.id)} (${doc.file})`)
      continue
    }

    for (const item of doc.items) {
      if (item.status === 'open') found.push(`${item.id} (${doc.file}:${item.line})`)
    }
  }

  return found
}

export function decideHk6(env: HookEnv, today: string): Hk6Decision {
  let inventory: { lines: string[] }
  try {
    const config = loadOwnership(env.root)
    const docs = collectArtifacts(env.root, config)
    const documents = collectDocuments(env.root, config)
    const context = { root: env.root, config, docs, documents, today }

    const ausentes = [
      ...config.artifacts.filter(artifact => !existsSync(join(env.root, artifact.path))).map(artifact => `${artifact.idPrefix} (${artifact.path})`),
      ...config.documents.filter(document => !existsSync(join(env.root, document.path))).map(document => document.path),
    ]

    const abertas = openDecisions(docs)
    const vencidas = duePayments(context)
    const velhos = staleDocs(context)

    const lines = [
      'HK-6: inventário da documentação viva (fonte: `docs/.ownership.yml`).',
      `Declarados: ${config.artifacts.length} artefato(s) e ${config.documents.length} documento(s).`,
    ]

    if (ausentes.length > 0) {
      lines.push(`Declarado e ausente (${ausentes.length}): ${shorten(ausentes)}.`)
    }
    if (abertas.length > 0) {
      lines.push(
        `Decisão aberta (${abertas.length}): ${shorten(abertas)}. Enquanto está aberta, a regra não existe e a ` + 'implementação para (`/open-decision`).',
      )
    }
    if (vencidas.length > 0) {
      lines.push(
        `Dívida com gatilho de pagamento cumprido (${vencidas.length}): ${shorten(
          vencidas.map(payment => `${payment.id} — ${payment.evidence}`),
        )}. \`living-docs validate\` reprova até pagar ou reclassificar (spec §12, critério 7).`,
      )
    }
    if (velhos.length > 0) {
      lines.push(
        `Documento vencido (${velhos.length}): ${shorten(
          velhos.map(stale => `${stale.file} (${stale.months} meses)`),
        )}. É aviso: releia antes de tocar em \`last-reviewed\`.`,
      )
    }

    lines.push('Nada aqui bloqueia — é contexto. O enforcement é `living-docs validate` e os hooks HK-1 a HK-5 e HK-7.')

    inventory = { lines }
  } catch {
    return SILENT // falha aberta (RNF-0001)
  }

  return { action: 'inform', context: inventory.lines.join('\n') }
}

async function main(): Promise<void> {
  // O payload de SessionStart não traz `tool_input`; lê-lo é só o contrato do
  // stdin, e um payload ilegível cala o hook como qualquer outro erro.
  const payload = await readPayload()
  if (!payload) return

  const decision = decideHk6(hookEnv(), todayIso())
  emit(decision.action === 'inform' ? contextOutput('SessionStart', decision.context) : null)
}

if (process.argv[1]?.endsWith('hk6-session-inventory.ts')) {
  main().catch(() => process.exit(0)) // falha aberta, sempre
}
```

- [ ] **Step 4: Registrar em `plugin/hooks/hooks.json` e no teste do manifesto**

Acrescente, ao objeto `hooks`, um evento novo — `SessionStart` não tem matcher:

```json
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk6-session-inventory",
            "shell": "bash",
            "async": false
          }
        ]
      }
    ]
```

`run-hook.sh` **não muda**: ele recebe o nome do hook como argumento e quem
distingue o evento é o arquivo. Mexer no wrapper aqui seria melhoria de graça em
código que funciona — e é onde a falha aberta mora.

Em `test/plugin/manifest.test.ts`, o grupo sem matcher precisa de chave própria:

```typescript
test('hooks.json registra os sete hooks nos eventos e matchers da spec §7', () => {
  const config = readJson('plugin/hooks/hooks.json')
  const hooks = config.hooks as Record<string, { matcher?: string; hooks: { command: string }[] }[]>

  const grupos = new Map<string, string[]>(
    Object.entries(hooks).flatMap(([evento, lista]) =>
      lista.map(grupo => [grupo.matcher === undefined ? evento : `${evento}:${grupo.matcher}`, grupo.hooks.map(hook => hook.command)] as const),
    ),
  )

  const esperado: Record<string, string[]> = {
    'PreToolUse:Edit|Write': ['hk1-append-only', 'hk2-generated-artifact', 'hk3-state-promotion'],
    'PreToolUse:Bash': ['hk5-commit-guard'],
    'PostToolUse:Edit|Write': ['hk4-watch-reminder', 'hk7-shortcut-debt'],
    // SessionStart não tem matcher: o evento não é de ferramenta (spec §7).
    SessionStart: ['hk6-session-inventory'],
  }

  assert.deepEqual([...grupos.keys()].sort(), Object.keys(esperado).sort())
  for (const [chave, nomes] of Object.entries(esperado)) {
    const comandos = grupos.get(chave) ?? []
    assert.equal(comandos.length, nomes.length, `${chave}: ${comandos.length} hooks`)
    for (const nome of nomes) {
      assert.ok(
        comandos.some(comando => comando.includes(nome)),
        `${chave} deveria invocar ${nome}`,
      )
    }
    for (const comando of comandos) {
      assert.ok(comando.includes('${CLAUDE_PLUGIN_ROOT}'), 'o comando precisa ser relocável')
    }
  }
})
```

e, no teste "todo hook referenciado existe no repositório", troque a contagem:

```typescript
assert.equal(vistos, 7, 'a varredura deveria ver os sete hooks das Fases 1, 3, 5, 6 e 7')
```

- [ ] **Step 5: Escrever a entrada de CHANGELOG**

Sob `## [Unreleased]` → `### Added`:

```markdown
- `HK-6`: no início da sessão, o inventário chega ao contexto — artefatos e
  documentos declarados e ausentes, decisões abertas, dívidas com gatilho
  cumprido e documentos vencidos. É injeção de contexto, nunca bloqueio.
```

- [ ] **Step 6: Rodar tudo**

```bash
docker compose exec toolkit node --test test/hooks/hk6-session-inventory.test.ts test/plugin/manifest.test.ts
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Esperado: PASS, `validate=0`.

- [ ] **Step 7: Ver o hook falar de verdade, com o repositório real**

```bash
echo '{}' | docker compose exec -T -w /workspace toolkit node /opt/living-docs/src/hooks/hk6-session-inventory.ts
```

Esperado: um JSON com `hookEventName: "SessionStart"` e `additionalContext`
citando `DA-0002` (se ela ainda estiver `open`) e nenhum bloqueio. É a única
forma de ver o critério 8 acontecendo antes de instalar o plugin.

- [ ] **Step 8: Commit**

```bash
git add src/hooks/hk6-session-inventory.ts test/hooks/hk6-session-inventory.test.ts plugin/hooks/hooks.json test/plugin/manifest.test.ts CHANGELOG.md
git commit -m "feat(RN-0022): HK-6 — inventário no SessionStart"
```

---

### Task 11: `AG-1` docs-divergence-auditor e `CM-5` `/docs-audit`

**Objetivo:** O segundo agent do plugin, e o único que responde a pergunta que
nenhum check responde: **o que este diff deveria ter atualizado e não
atualizou**. Nenhum requisito novo — agent é julgamento em contexto isolado, não
regra executável, e inventar um `CI-n` para medi-lo seria o erro que a Fase 4 já
recusou uma vez.

**Files:**

- Create: `plugin/agents/docs-divergence-auditor.md`
- Create: `plugin/commands/docs-audit.md`
- Modify: `test/plugin/manifest.test.ts`
- Modify: `CHANGELOG.md`

**Interfaces:**

- Consome: o formato de `plugin/agents/*.md` confirmado na Fase 4 — frontmatter
  com `name`, `description` (o gatilho), `tools` (allowlist) e `model`,
  descoberto por diretório, **sem** entrada em `plugin.json`.
- Produz: o agent `docs-divergence-auditor` e o comando `/docs-audit`.

**Requisitos:**

- `tools` inclui leitura, busca e `Bash` (a spec §6 pede `git`), e **não**
  inclui `Edit` nem `Write`: `AG-1` aponta e para. O teste do manifesto cobra.
- Três classes de achado, e só essas três (spec §6): doc desatualizado, doc
  mentiroso, comportamento sem regra. A terceira sai como `DA-nnnn` via `SK-3`.
- Cada achado traz arquivo, linha, severidade e o **artefato dono** que deveria
  mudar. Sem preferência estética.
- Declara o escopo na primeira linha do relatório. Diff grande demais: diz o
  tamanho e revisa por corte, **nunca** amostra fingindo que leu tudo.
- Insumo obrigatório: `docs/.ownership.yml` (os `watches`) e os artefatos que
  eles apontam. Nenhum caminho hardcoded na prosa do agent.

**`HK-5`:** `plugin/**` é `consumer-visible` — entrada de CHANGELOG no Step 3.
`plugin/agents/**` e `plugin/commands/**` não estão em `watches` como
`plugin/skills/**`, então `CONTRIBUTING.md` não é exigido aqui.

- [ ] **Step 1: Escrever `plugin/agents/docs-divergence-auditor.md`**

````markdown
---
name: docs-divergence-auditor
description: >
  Use este agent quando quiser saber o que um conjunto de mudanças deveria ter
  atualizado na documentação e não atualizou — antes de abrir o PR, depois de
  uma sequência longa de commits, ou quando alguém pergunta "a documentação
  ainda descreve isso?". Recebe um escopo (diff, ref, lista de caminhos ou
  `staged`) e devolve achados com o artefato dono de cada um. Isolado de
  propósito: quem escreveu o código revisa com o mesmo raciocínio que o
  produziu, e não vê os próprios pontos cegos.
tools: Glob, Grep, Read, Bash
model: inherit
---

Você audita divergência entre código e documentação num escopo dado. Você
**aponta e para**: não tem `Edit` nem `Write`, e mesmo que tivesse, corrigir não
é o seu papel — a correção é de quem é dono do artefato.

`Bash` está aqui para o `git` (`git diff`, `git log`, `git show`) e para nada
mais. Não instale, não construa, não rode teste, não escreva arquivo por
redirecionamento.

## Insumo obrigatório

1. **`docs/.ownership.yml`** — leia antes de qualquer coisa. É de lá que vem
   qual caminho de código tem qual documento dono (`watches`), quem responde por
   cada artefato, e o que é visível a quem consome. **Não adivinhe caminho**: se
   um documento não está declarado ali, o achado é outro, e ele é de `CI-7`.
2. **Os artefatos que os `watches` apontam** — leia os trechos relevantes, não o
   arquivo inteiro por hábito.

## Escopo

A primeira linha do relatório declara o escopo, sempre, nesta forma:

`Escopo: <o que foi lido> — <N> arquivos, <M> linhas de diff.`

Se o diff é grande demais para leitura honesta, **diga o tamanho e revise por
corte** (por diretório, por artefato dono, por commit), nomeando o que ficou
para o próximo corte. Amostrar e escrever como se tivesse lido tudo é o pior
resultado possível: produz confiança sem cobertura.

## As três classes de achado, e só essas três

1. **Doc desatualizado** — o código mudou e o documento dono não. Traga o
   caminho do código, a regra de `watches` que criou o vínculo, e o trecho do
   documento que ficou falso.
2. **Doc mentiroso** — o documento afirma um comportamento que o código deixou
   de ter. Traga a frase e a linha do código que a contradiz.
3. **Comportamento sem regra** — o código decide algo que nenhum requisito
   cobre. A saída é abrir `DA-nnnn` (`/open-decision`, skill
   `decision-recorder`) e **parar** — não é escrever a regra que falta.

Nada fora dessas três. Preferência estética, sugestão de refatoração, opinião
sobre nome de variável: fora do escopo, e incluí-las faz o relatório ser
descartado inteiro.

## Formato de cada achado

```
[<classe>] <arquivo>:<linha> — <severidade: alta|média|baixa>
  O que divergiu: <uma frase>
  Artefato dono: <caminho do .ownership.yml> (skill: <skill dona>)
  Evidência: <trecho do código> vs <trecho do documento>
```

## O que você não faz

- Não usa `Edit` nem `Write`, e não escreve arquivo por `Bash`.
- Não audita o repositório inteiro quando recebeu um escopo. Fora do escopo é
  fora do escopo, mesmo que você tenha visto algo interessante — se for grave,
  registre em uma linha ao fim, sob "fora do escopo recebido".
- Não conta documentos, não mede cobertura documental, não sugere criar
  documento novo para narrar código. As três coisas são anti-requisitos (spec
  §13).
- Não decide nada. Aceitar, promover, escrever a regra: tudo humano.

## Saída final

Os achados agrupados por artefato dono, e uma última linha dizendo o que **não**
foi verificado. Zero achado é um resultado legítimo, e nesse caso a última linha
é a única que importa.
````

- [ ] **Step 2: Escrever `plugin/commands/docs-audit.md`**

```markdown
---
description: Audita a divergência entre código e documentação num escopo — o que o diff deveria ter atualizado e não atualizou.
argument-hint: '[escopo: ref de diff, caminho, ou staged]'
---

Acione o agent `docs-divergence-auditor` com o escopo: $ARGUMENTS

Sem escopo, use o que está no índice (`git diff --cached --name-only`) e diga
isso na primeira linha do relatório.

O agent aponta e para: ele não tem `Edit` nem `Write`. Cada achado nomeia o
artefato dono que deveria mudar — a correção é de quem é dono dele, pela skill
dona que o `docs/.ownership.yml` declara.

Comportamento sem regra escrita não vira código: vira `DA-nnnn`
(`/open-decision`) e a implementação para.
```

- [ ] **Step 3: Cobrar o formato no teste do manifesto, e escrever o CHANGELOG**

Em `test/plugin/manifest.test.ts`, troque o teste que nomeia `AG-2` por um que
nomeia os dois, e acrescente a asserção de `AG-1`:

```typescript
test('AG-1 e AG-2: os dois agents da spec §6 existem', () => {
  assert.ok(AGENTS.includes('decision-adversary.md'), `plugin/agents: ${AGENTS.join(', ') || 'vazio'}`)
  assert.ok(AGENTS.includes('docs-divergence-auditor.md'), `plugin/agents: ${AGENTS.join(', ') || 'vazio'}`)
})

test('AG-1 e AG-2 apontam e param — sem Edit nem Write (spec §6)', () => {
  for (const file of ['decision-adversary.md', 'docs-divergence-auditor.md']) {
    const source = readFileSync(join(ROOT, 'plugin/agents', file), 'utf8')
    const toolsLine = source.match(/^tools:\s*(.+)$/m)?.[1] ?? ''
    assert.doesNotMatch(toolsLine, /\bEdit\b/, `${file}: agent que aponta não reescreve`)
    assert.doesNotMatch(toolsLine, /\bWrite\b/, `${file}: agent que aponta não reescreve`)
  }
})

test('AG-1 lê o mapa de propriedade em vez de adivinhar caminho', () => {
  const source = readFileSync(join(ROOT, 'plugin/agents/docs-divergence-auditor.md'), 'utf8')
  assert.match(source, /docs\/\.ownership\.yml/)
  assert.match(source, /DA-nnnn|open-decision/, 'comportamento sem regra vira decisão aberta, não código')
})
```

Em `CHANGELOG.md`, sob `## [Unreleased]` → `### Added`:

```markdown
- `AG-1` `docs-divergence-auditor` e o comando `/docs-audit`: auditoria de
  divergência código→documentação num escopo dado, em contexto isolado, sem
  `Edit` nem `Write`.
```

- [ ] **Step 4: Rodar tudo**

```bash
docker compose exec toolkit node --test test/plugin/manifest.test.ts test/plugin/authoring.test.ts
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Esperado: PASS, `validate=0`. Se `CI-8` acusar link no arquivo do agent, é o
bloco de formato de achado — confirme que ele está cercado por ```e que o`stripCode` o apaga.

- [ ] **Step 5: Commit**

```bash
git add plugin/agents/docs-divergence-auditor.md plugin/commands/docs-audit.md test/plugin/manifest.test.ts CHANGELOG.md
git commit -m "feat(CM-5): AG-1 docs-divergence-auditor e /docs-audit"
```

---

### Task 12: A prova de ponta a ponta — critérios 5 (metade 2), 7 e 8

**Objetivo:** Os critérios de aceite não são prova enquanto não existir um teste
que os execute pelo caminho de fora. E os invariantes do dogfooding — dono nos
dois lugares, dívida com gatilho verificável — precisam de um teste que impeça
que eles se afastem no primeiro PR seguinte, como
`test/docs/release-history.test.ts` fez pela Fase 6.

**Files:**

- Modify: `test/acceptance/spec-criteria.test.ts`
- Create: `test/docs/maintenance.test.ts`

**Interfaces:**

- Consome: `runValidate`, `decideHk6`, `loadOwnership`, `loadCodeowners`,
  `ownersOf`, `documentationFiles`, `debtsWithoutTrigger`, `duePayments`,
  `documentWithRole`, `repoRoot`.
- Produz: os testes que citam `RF-0010`, `RF-0011`, `RN-0016`, `RN-0019`,
  `RN-0022` — as citações que a Task 14 precisa que existam.

**Requisitos:**

- Os testes de critério rodam contra repositório temporário, não contra este.
  "Este repositório passa nos próprios checks" já existe e continua sendo o
  outro lado.
- `test/docs/maintenance.test.ts` roda contra **este** repositório: é
  dogfooding, e a falha dele é a informação.
- Nenhum teste novo lê o relógio: `today` fixo, ou `todayIso()` só onde a data
  não muda o resultado.

- [ ] **Step 1: Acrescentar os três critérios a `test/acceptance/spec-criteria.test.ts`**

Acrescente aos imports:

```typescript
import { decideHk6 } from '../../src/hooks/hk6-session-inventory.ts'
```

e ao fim do arquivo:

```typescript
const DIVIDA_CONFIG = [
  'version: 1',
  'stale-after-months: 6',
  'artifacts:',
  '  - id-prefix: TDR',
  '    path: docs/decisions/debt/',
  '    owner: "@team"',
  '    skill: decision-recorder',
  '    append-only: true',
  '  - id-prefix: RN',
  '    path: docs/requirements/rules.md',
  '    owner: "@team"',
  '    skill: requirements-keeper',
  '    collection: sections',
  'documents:',
  '  - path: docs/.ownership.yml',
  '    owner: "@team"',
  '    skill: living-docs-bootstrap',
  '',
].join('\n')

const DIVIDA_CODEOWNERS = 'docs/decisions/debt/    @team\ndocs/requirements/    @team\ndocs/.ownership.yml    @team\n'

function divida(status: string): string {
  return [
    '---',
    'id: TDR-0001',
    'title: Atalho consciente',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Quando o gatilho de pagamento abaixo se cumprir.',
    'last-reviewed: 2026-08-20',
    'pay-when:',
    "  pattern: '^- \\*\\*status:\\*\\* revoked'",
    '  paths: ["docs/requirements/**"]',
    '---',
    '',
    '# TDR-0001 — Atalho consciente',
    '',
  ].join('\n')
}

function regras(status: string): string {
  return [
    '---',
    'title: Regras',
    'owner: "@team"',
    'trigger: A toda regra nova ou alterada.',
    'last-reviewed: 2026-08-20',
    '---',
    '',
    '## RN-0001 — Uma regra',
    '',
    `- **status:** ${status}`,
    ...(status === 'revoked' ? ['- **revoked-by:** RN-0002'] : []),
    '',
  ].join('\n')
}

test('critério 7: dívida com gatilho cumprido reprova até ser paga ou reclassificada', () => {
  const arvore = (statusDivida: string, statusRegra: string) => ({
    [OWNERSHIP_PATH]: DIVIDA_CONFIG,
    CODEOWNERS: DIVIDA_CODEOWNERS,
    'docs/decisions/debt/TDR-0001-x.md': divida(statusDivida),
    'docs/requirements/rules.md': regras(statusRegra),
  })

  // gatilho não aconteceu: passa
  withTempRepo(arvore('open', 'active'), root => {
    assert.equal(runValidate(root).exitCode, 0)
  })

  // gatilho aconteceu e a dívida segue open: reprova, nomeando a evidência
  withTempRepo(arvore('open', 'revoked'), root => {
    const result = runValidate(root)
    assert.equal(result.exitCode, 1)

    const finding = result.findings.find(f => f.ruleId === 'CI-4' && f.severity === 'error')
    assert.ok(finding, JSON.stringify(result.findings, null, 2))
    assert.match(finding.message, /TDR-0001/)
    assert.match(finding.message, /docs\/requirements\/rules\.md/)
  })

  // reclassificada: volta a passar
  withTempRepo(arvore('paid', 'revoked'), root => {
    assert.equal(runValidate(root).exitCode, 0)
  })
})

test('critério 8: no início da sessão, o inventário e as pendências chegam ao contexto', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: DIVIDA_CONFIG,
      CODEOWNERS: DIVIDA_CODEOWNERS,
      'docs/decisions/debt/TDR-0001-x.md': divida('open'),
      'docs/requirements/rules.md': regras('revoked'),
    },
    root => {
      const decision = decideHk6({ root, hostRoots: [root] }, '2026-08-27')

      assert.equal(decision.action, 'inform', 'ninguém precisa procurar: o inventário chega')
      const context = decision.action === 'inform' ? decision.context : ''
      assert.match(context, /TDR-0001/)
      assert.doesNotMatch(context, /permissionDecision/, 'é contexto, não decisão de permissão')
    },
  )
})

test('critério 5, metade 2: o CI sinaliza pelo `watches`, e a razão escrita libera', () => {
  const config = `${WATCHED_CONFIG}documents:
  - path: docs/.ownership.yml
    owner: "@team"
    skill: living-docs-bootstrap
`
  const codeowners = 'docs/requirements/    @team\ndocs/.ownership.yml    @team\n'
  const arvore = {
    [OWNERSHIP_PATH]: config,
    CODEOWNERS: codeowners,
    'docs/requirements/rules.md': regras('draft'),
  }

  const git =
    (changed: string[], messages: string[]) =>
    (args: readonly string[]): string =>
      args.includes('diff') ? changed.join(NUL) + NUL : messages.join(`${NUL}\n`) + NUL + '\n'

  withTempRepo(arvore, root => {
    // sem o doc dono no diff: reprova, nomeando o caminho vigiado
    const reprovado = runValidate(root, 'origin/master', git(['src/domain/reembolso.ts'], ['feat: reembolso']))
    assert.equal(reprovado.exitCode, 1)
    const finding = reprovado.findings.find(f => f.ruleId === 'CI-7')
    assert.ok(finding)
    assert.match(finding.message, /src\/domain\/reembolso\.ts/)

    // com o doc no mesmo diff: passa
    const comDoc = git(['src/domain/reembolso.ts', 'docs/requirements/rules.md'], ['feat: reembolso'])
    assert.equal(runValidate(root, 'origin/master', comDoc).exitCode, 0)

    // com a razão escrita no histórico: passa
    assert.equal(
      runValidate(root, 'origin/master', git(['src/domain/reembolso.ts'], ['refactor: renomeia interno\n\nDocs: none — só renomeação, a regra não mudou']))
        .exitCode,
      0,
    )

    // e sem base, essa metade não roda
    assert.equal(runValidate(root).exitCode, 0)
  })
})
```

`WATCHED_CONFIG` e `NUL` já existem no arquivo desde a Fase 3 — reuse-os, não
declare de novo.

- [ ] **Step 2: Criar `test/docs/maintenance.test.ts`**

```typescript
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { documentWithRole, loadOwnership } from '../../src/config/ownership.ts'
import { loadCodeowners, ownersOf } from '../../src/config/codeowners.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { debtsWithoutTrigger, duePayments } from '../../src/checks/ci4-staleness.ts'
import { documentationFiles } from '../../src/docs/corpus.ts'
import { repoRoot } from '../../src/core/roots.ts'
import { todayIso } from '../../src/core/dates.ts'

const ROOT = repoRoot()
const CONFIG = loadOwnership(ROOT)

function contextFor() {
  return {
    root: ROOT,
    config: CONFIG,
    docs: collectArtifacts(ROOT, CONFIG),
    documents: collectDocuments(ROOT, CONFIG),
    today: todayIso(),
  }
}

test('RN-0016: todo documento deste repositório tem dono nos dois lugares', () => {
  const codeowners = loadCodeowners(ROOT)
  assert.ok(codeowners, 'CODEOWNERS deveria existir')

  const semDono: string[] = []
  for (const file of documentationFiles(ROOT, CONFIG)) {
    if (ownersOf(codeowners, file) === null) semDono.push(file)
  }

  assert.deepEqual(semDono, [], `sem linha no CODEOWNERS: ${semDono.join(', ')}`)
})

test('RN-0016: `documents:` e CODEOWNERS declaram o mesmo dono', () => {
  const codeowners = loadCodeowners(ROOT)
  assert.ok(codeowners)

  for (const document of CONFIG.documents) {
    const owners = ownersOf(codeowners, document.path.replace(/\/$/, '/x'))
    assert.ok(owners, `${document.path} sem dono no CODEOWNERS`)
    assert.ok(owners.includes(document.owner), `${document.path}: .ownership.yml diz ${document.owner}, CODEOWNERS diz ${owners.join(', ')}`)
  }
})

test('RN-0019: toda dívida `open` deste repositório tem gatilho verificável e não vencido', () => {
  const context = contextFor()
  assert.deepEqual(
    debtsWithoutTrigger(context).map(debt => debt.id),
    [],
    'dívida sem `pay-when` é `TODO` órfão com número',
  )
  assert.deepEqual(
    duePayments(context).map(payment => `${payment.id} — ${payment.evidence}`),
    [],
    'se aparecer aqui, a dívida venceu: pague ou reclassifique (ato humano)',
  )
})

test('ADR-0008: os dois papéis estão declarados e apontam para arquivos que existem', () => {
  for (const role of ['agent-contract', 'definition-of-done'] as const) {
    const document = documentWithRole(CONFIG, role)
    assert.ok(document, `nenhum documento declara role: ${role} — CI-7 não teria como achá-lo`)
    assert.ok(existsSync(join(ROOT, document.path)), `${document.path} declarado e ausente`)
  }
})

test('RN-0020: o contrato do agente continua sendo índice — sem frase copiada de artefato dono', () => {
  // A prova real é CI-7 rodando em `validate`; este teste existe para que a
  // falha aponte o contrato em vez de se perder no meio dos outros achados.
  const contract = documentWithRole(CONFIG, 'agent-contract')
  assert.ok(contract)

  const context = contextFor()
  const source = context.documents.find(document => document.file === contract.path)?.source
  assert.ok(source, `${contract.path} deveria estar coletado`)
})
```

- [ ] **Step 3: Rodar tudo**

```bash
docker compose exec toolkit node --test test/acceptance/spec-criteria.test.ts test/docs/maintenance.test.ts
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Esperado: PASS. Se `test/docs/maintenance.test.ts` acusar documento sem dono, a
correção é declarar — não afrouxar o teste.

- [ ] **Step 4: Commit**

```bash
git add test/acceptance/spec-criteria.test.ts test/docs/maintenance.test.ts
git commit -m "test(RF-0010, RF-0011, RN-0016, RN-0019, RN-0022): critérios 5, 7 e 8 e os invariantes do dogfooding"
```

---

### Task 13: Índices, contrato público, workflow e backlog

**Objetivo:** Fazer os documentos que apontam para o resto dizerem a verdade
nova. É a task em que a frase do README sobre "só metade do critério 5" muda, e
em que o vocabulário ganha a distinção que `ADR-0008` criou.

**Files:**

- Modify: `README.md`
- Modify: `CONTRIBUTING.md`
- Modify: `docs/definition-of-done.md`
- Modify: `CLAUDE.md`
- Modify: `docs/glossary.md`
- Modify: `plugin/skills/decision-recorder/SKILL.md`
- Modify: `plugin/skills/working-agreements-keeper/SKILL.md`
- Modify: `plugin/skills/living-docs-bootstrap/SKILL.md`
- Modify: `plugin/.claude-plugin/plugin.json`
- Modify: `.github/workflows/living-docs.yml`
- Modify: `CHANGELOG.md`
- Modify: `docs/superpowers/plans/BACKLOG-fases-3-7.md`

**Interfaces:**

- Consome: tudo que as Tasks 1 a 12 entregaram.
- Produz: os índices coerentes, o workflow que roda `validate --base` no PR, e o
  backlog com o estado real.

**Requisitos:**

- `CLAUDE.md` continua **índice e política**: nenhuma afirmação factual nova, e
  o teste de 60 linhas continua valendo. `CI-7` agora cobra a duplicação — se
  ele acusar uma frase, reescreva a frase, não o limiar.
- A Definition of Done ganha um item por check novo, cada um com a verificação
  nomeada (`RN-0017`, e `CI-7` cobra).
- O glossary ganha **Documento** e **Gatilho de pagamento**, e a linha
  **Artefato** passa a apontar para Documento em "não confundir com" — porque
  desde `ADR-0008` existem duas coisas com dono, e só uma delas tem família de
  IDs.
- O workflow roda `validate --base` **só** em `pull_request`: em `push` não há
  base, e inventar uma produziria achado sobre mudança que não é da branch.
- O backlog registra o estado real, incluindo o que **não** foi promovido. Se a
  Task 14 não acontecer, esta task não mente a respeito.

**`HK-5`:** `plugin/skills/**` exige `CONTRIBUTING.md` no mesmo commit — está
aqui. `plugin/**` é `consumer-visible`: entrada de CHANGELOG no Step 9.

- [ ] **Step 1: README**

Substitua o parágrafo de abertura:

```markdown
# living-docs-toolkit

Documentação viva com dono, gatilho e enforcement — Fases 0–7 da spec
`LIVING-DOCUMENTATION-TOOLKIT.md`: ADR, Open Decisions, Debt Register e
requisitos com ID estável; os oito checks `CI-1` a `CI-8`; os sete hooks `HK-1`
a `HK-7`; os acordos de trabalho (`SK-6`); o vocabulário do domínio e os
princípios invioláveis (`SK-2`, `SK-1`); o contrato público, com a metade gerada
que ninguém edita à mão (`SK-5`); o rastro histórico voltado a quem consome
(`SK-7`); e a manutenção contínua — inventário no início da sessão, staleness,
cobertura de propriedade, links, e o auditor de divergência em contexto isolado.

**Nada roda no host além de Docker.**
```

No bloco de uso, acrescente a linha do `--base`:

```bash
./bin/living-docs validate              # roda CI-1, CI-2, CI-3, CI-4, CI-7 e CI-8
./bin/living-docs validate --base origin/master   # + a metade de CI-7 que lê o diff da branch
```

Substitua o parágrafo dos estágios:

```markdown
Estágios de maturidade (`--stage`): `solo` instala decisões, lacunas e dívida;
`small-team` acrescenta a moldura de requisitos (`RF`, `RNF`, `RN`), os acordos
de trabalho, o glossary e o charter; `production` acrescenta a moldura de
contratos (catálogo de erros e política de versionamento) **e** o rastro
histórico (CHANGELOG, release notes, depreciações e guias de migração). Em todos
eles, o `init` declara em `documents:` o que criou — documento sem dono reprova
em `CI-7`.

**Não existe `--stage multi-team`**, e a razão é que a Fase 7 não instala
artefato nenhum: ela instala enforcement, e enforcement não é arquivo que o
`init` escreve — são os checks que já vêm com o toolkit e os hooks que já vêm
com o plugin. Um estágio com o mesmo conjunto de arquivos que `production` seria
um rótulo sem nada atrás.
```

Na seção do plugin, acrescente ao fim:

```markdown
`HK-6` injeta o inventário no início da sessão — o que está declarado e ausente,
as decisões abertas, as dívidas com gatilho cumprido e os documentos vencidos —,
e nunca bloqueia. `plugin/agents/docs-divergence-auditor.md` (`AG-1`, comando
`/docs-audit`) é o segundo agent: recebe um escopo, responde o que aquele diff
deveria ter atualizado e não atualizou, e aponta o artefato dono de cada achado.
Como `AG-2`, ele não tem `Edit` nem `Write`.
```

Substitua a seção "O que está fora" inteira:

```markdown
## O que está fora

Nada das Fases 0–7 da spec. As camadas que a spec §"Escopo" deixa
deliberadamente fora — C4/ERD/threat model, runbooks/SLO/postmortems, event
catalog, RFC longo, feature specs — continuam fora, e o caminho para elas é o
mesmo ponto de extensão: uma entrada em `docs/.ownership.yml` e uma skill dona.

Os dez critérios de aceite da spec §12 estão cobertos. O critério 5 fecha nas
duas metades desde a Fase 7: `HK-5` pergunta antes do commit, e
`living-docs validate --base <ref>` reprova no PR, com `Docs: none — <razão>`
como única saída escrita.

Dívida conhecida: `TDR-0001` — `HK-1` congela por arquivo, não por seção, então
um requisito `revoked` dentro de `docs/requirements/` não tem o corpo protegido
pelo hook. `CI-3` fecha a outra metade, e o gatilho de pagamento agora é
verificável: o `pay-when` do TDR procura `status: revoked` em
`docs/requirements/**`, e `CI-4` reprova no dia em que isso acontecer.
```

- [ ] **Step 2: CONTRIBUTING**

Atualize `last-reviewed: 2026-08-27` e acrescente, no fim de "O ciclo", um item:

```markdown
6. **Quando a mudança realmente não afeta o doc dono**, escreva a razão na
   mensagem de commit — `Docs: none — <razão>` —, e o CI aceita. Rótulo sem
   razão não vale: é a caixinha marcada. O mesmo formato vale para o CHANGELOG,
   com `Changelog: none — <razão>`.
```

Na tabela "Onde a verdade mora", acrescente uma linha:

```markdown
| Quem responde por cada documento sem ID | `docs/.ownership.yml` (`documents:`) |
```

E, na seção "O ambiente", acrescente ao bloco de comandos:

```bash
./bin/living-docs validate --base origin/master
```

- [ ] **Step 3: Definition of Done**

Atualize `last-reviewed: 2026-08-27` e acrescente três itens antes do item de
`npm test`:

```markdown
- [ ] Todo documento novo foi declarado em `docs/.ownership.yml` e no CODEOWNERS — verificação: `CI-7`.
- [ ] Nenhum link interno ficou quebrado, e nenhum anexo binário entrou sob `docs/` — verificação: `CI-8`.
- [ ] A dívida registrada declara `pay-when`, e nenhuma dívida com gatilho cumprido continua `open` — verificação: `CI-4`.
- [ ] O caminho vigiado que mudou levou o doc dono, ou a razão escrita no commit — verificação: `HK-5` pergunta, `CI-7` reprova (`living-docs validate --base <ref>`).
```

e troque o último item para citar os oito checks:

```markdown
- [ ] `npm test`, `npm run typecheck`, `living-docs validate --base <ref>`, `living-docs drift` e `living-docs changelog --base <ref>` passam no container — verificação: `CI-1` a `CI-8`, rodados pelo workflow do repositório.
```

- [ ] **Step 4: `CLAUDE.md`**

Na seção "Política", acrescente um item:

```markdown
- **Todo documento tem dono declarado.** `docs/.ownership.yml` diz qual skill
  responde; o CODEOWNERS, quem revisa — `CI-7` cobra os dois.
```

Na seção "Comandos", substitua a lista:

```markdown
`/adr`, `/open-decision`, `/debt`, `/docs-setup`, `/term`, `/release`,
`/docs-audit`. As skills `decision-recorder`, `requirements-keeper`,
`working-agreements-keeper`, `glossary-keeper`, `charter-keeper`,
`contract-keeper` e `release-historian` são selecionadas pela `description`; não
é preciso invocá-las pelo nome.
```

(`/release` e `release-historian` estavam faltando desde a Fase 6 — o índice
tinha ficado atrás do plugin.)

```bash
docker compose exec toolkit node --test test/docs/agent-contract.test.ts
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
```

Esperado: PASS e `validate=0`. Se o teste de 60 linhas reprovar, tire linha em
vez de acrescentar. Se `CI-7` acusar duplicata, **reescreva a frase do
contrato** — o limiar não se baixa (`ADR-0009`).

- [ ] **Step 5: Glossary**

Atualize `last-reviewed: 2026-08-27`. Na linha **Artefato**, troque a coluna
"Não confundir com":

```markdown
| Artefato | Documento de documentação viva com dono, gatilho, frontmatter padrão e ciclo de vida | `ArtifactRule`, `ArtifactDoc` | "Documento" — que tem dono e **não** tem família de IDs nem ciclo de vida (`ADR-0008`) | RN-0001 | active |
```

Acrescente duas linhas ao fim da tabela:

```markdown
| Documento | Arquivo com dono declarado e sem família de IDs, declarado em `documents:` | `DocumentRule`, `DocumentDoc` | "Artefato" — que tem ID, estado e congelamento; e "arquivo qualquer", que não tem dono nenhum | ADR-0008, RN-0016 | active |
| Gatilho de pagamento | Condição observável no repositório que torna uma dívida devida, declarada em `pay-when` | `PayWhen`, `duePayments` | "Prazo" — dívida não vence no calendário, vence quando a condição aparece | ADR-0007, RN-0019 | active |
```

- [ ] **Step 6: As três skills**

Em `plugin/skills/decision-recorder/SKILL.md`, acrescente ao procedimento, no
item que trata de TDR (ou como item novo logo depois dele):

```markdown
- **Toda dívida nasce com o gatilho de pagamento nas duas formas:** a prosa, em
  `## Gatilho de pagamento`, que explica o porquê; e `pay-when` no frontmatter,
  com `pattern` (regex em aspas simples) e `paths` (onde procurá-lo), que é o
  que `CI-4` avalia. Se você não consegue escrever a segunda, o gatilho não é
  observável — e aí a dívida não está pronta para ser registrada. Não invente um
  padrão que casa nada só para o check passar: isso é a caixinha marcada.
```

E ao checklist:

```markdown
- [ ] Toda dívida `open` declara `pay-when` verificável — verificação: `CI-4`.
```

Em `plugin/skills/working-agreements-keeper/SKILL.md`, acrescente ao
procedimento:

```markdown
- **O contrato do agente não repete texto de artefato dono, e isso agora é
  verificado.** `CI-7` compara frase por frase (piso de doze palavras,
  `ADR-0009`) contra os artefatos com skill dona. Quando ele acusa, a correção é
  apagar a frase e deixar o ponteiro — nunca mexer no limiar.
- **Documento novo é declarado nos dois lugares:** `documents:` no
  `docs/.ownership.yml` (com a skill dona, e o `role` quando for o contrato do
  agente ou a Definition of Done) e uma linha no CODEOWNERS.
```

e ao checklist:

```markdown
- [ ] Nenhuma frase do contrato do agente repete artefato dono — verificação: `CI-7`.
- [ ] Cada item novo da Definition of Done nomeia o que o verifica — verificação: `CI-7`.
```

Em `plugin/skills/living-docs-bootstrap/SKILL.md`, acrescente à tabela de
propriedade ou ao procedimento, onde o `.ownership.yml` é descrito:

```markdown
- **`documents:`** declara o que tem dono e não tem família de IDs
  (`CONTRIBUTING.md`, a Definition of Done, o contrato do agente, o glossary, o
  charter, o CHANGELOG, e o que mais o projeto tiver). `artifacts:` continua
  exigindo `id-prefix`; `CI-1`, `CI-2` e `HK-1` não leem `documents:`, e `CI-4` e
  `CI-7` leem (`ADR-0008`).
```

- [ ] **Step 7: `plugin.json`**

```json
  "description": "Documentação viva: ADR, Open Decisions, Debt Register, requisitos com ID estável, acordos de trabalho, vocabulário do domínio, princípios invioláveis, contrato público gerado, rastro histórico voltado a quem consome, e manutenção contínua — inventário de sessão, staleness, cobertura de propriedade, links e auditoria de divergência. Fases 0–7.",
```

- [ ] **Step 8: Workflow**

Em `.github/workflows/living-docs.yml`, troque o nome do passo de validate e
acrescente o passo com base:

```yaml
- name: CI-1 a CI-4, CI-7 e CI-8 — documentação viva
  run: >
    docker compose run --rm -w /workspace toolkit
    node /opt/living-docs/src/cli/index.ts validate

# A metade de CI-7 que lê o diff só existe com uma base (ADR-0010). Em
# `push` não há base, e inventar uma produziria achado sobre mudança que
# não é desta branch.
- name: CI-7 — vínculo código→doc no diff do PR
  if: github.event_name == 'pull_request'
  run: >
    docker compose run --rm -w /workspace toolkit
    node /opt/living-docs/src/cli/index.ts validate
    --base ${{ github.event.pull_request.base.sha }}
```

- [ ] **Step 9: CHANGELOG**

Sob `## [Unreleased]` → `### Changed`:

```markdown
- `living-docs validate` passa a exigir que todo documento sob a raiz da
  documentação tenha entrada no `docs/.ownership.yml` e linha no CODEOWNERS
  (`CI-7`). Repositório instalado por uma versão anterior precisa rodar
  `living-docs init` de novo, ou declarar os documentos à mão, para continuar
  passando.
```

- [ ] **Step 10: Backlog**

Em `docs/superpowers/plans/BACKLOG-fases-3-7.md`, acrescente ao bloco de estado,
depois do parágrafo da Fase 6:

```markdown
**Estado em 2026-08-27:** a Fase 7 está **implementada** —
`docs/superpowers/plans/2026-08-27-living-docs-toolkit-fase-7.md`, as 14 tasks
executadas. Os dez critérios de aceite da spec §12 estão cobertos: o 7 (`CI-4`),
o 8 (`HK-6`) e a segunda metade do 5 (`CI-7` com `--base`) fecharam aqui.
`DA-0002` está `resolved` por `ADR-0008`. Promoção humana (Task 14): registre
aqui o que foi e o que não foi aceito — **não presuma**.

O que o planejamento apurou, e que vale para quem continuar:

- **Não existe `--stage multi-team`, e a razão é estrutural.** A Fase 7 não
  instala artefato: instala enforcement, que já vem no toolkit e no plugin. O
  estágio teria o mesmo conjunto de arquivos que `production` — um rótulo sem
  nada atrás, que é o que o próprio backlog chamava de "wiki morta nascendo de
  fábrica". O que `CI-7` de fato exigiu do `init` foi outra coisa e vale para
  todos os estágios: declarar em `documents:` o que ele cria (`RF-0012`).
- **`DA-0002` virou uma chave nova, não um prefixo novo.** Tornar `id-prefix`
  opcional em `artifacts:` teria empurrado um `if` para dentro de `CI-1`,
  `CI-2`, `HK-1` e `HK-3` — o custo cairia na Fase 0, que é a parte que menos
  deveria mudar (`ADR-0008`).
- **`role` no `documents:` é o que permite a `CI-7` achar o contrato do agente e
  a Definition of Done sem conhecer caminho nenhum.** Isso não estava previsto e
  é a peça sem a qual duas das cinco classes de achado de `CI-7` não existiriam.
- **A severidade do sinal de `watches` no CI precisou de ADR.** A spec §9 ("só
  `CI-4` avisa"), `RN-0009` ("nunca bloqueia") e o critério 5 ("o CI sinaliza")
  não cabiam juntas. `ADR-0010` decidiu erro com rótulo de escape, e o
  precedente já estava no repositório desde a Fase 6: `CI-6` reprova por uma
  entrada de `watches` com `Changelog: none — <razão>` como saída.
- **`CI-4` precisou de duas coisas, não uma.** `CheckContext.today` era a
  prevista; a segunda foi o `pay-when`, porque "gatilho de pagamento observável"
  em prosa não se avalia. Item congelado não vence — sem essa regra, todo ADR
  aceito viraria aviso permanente e o caminho de calar o aviso seria o bump em
  massa que a spec §13 recusa.
- **O falso positivo mais provável de `CI-8` é link dentro de bloco de código**,
  e este repositório tem um (`](?:mente)` num plano da Fase 0). `stripCode`
  existe por causa dele, e fecha cerca por tamanho porque um plano usa cerca de
  quatro crases.
```

Substitua a seção "Ordem sugerida daqui" pelo estado novo:

```markdown
### Ordem sugerida daqui

As sete fases da spec §10 estão implementadas. O que resta não é fase:

1. **Aceitar `ADR-0001`, `ADR-0002` e `ADR-0006`** (hoje `draft`). Não depende
   de nada e continua sendo ato barato — com a pré-condição já anotada: o
   `relates-to` precisa estar preenchido **antes**, porque `accepted` congela o
   arquivo.
2. **`TDR-0001`** segue `open`, agora com gatilho verificável: `CI-4` reprova no
   primeiro PR que revogar um requisito. Não há o que fazer antes disso.
3. **Distribuição do toolkit.** `ADR-0003` decide as duas raízes e não decide
   como o toolkit chega a um projeto consumidor. Vale abrir uma `DA` no primeiro
   consumidor real — e é lá que a ruptura de `CI-7` (documento sem dono passa a
   reprovar) será sentida primeiro.
4. **Estender para as camadas fora do escopo** (C4, runbooks, event catalog) é o
   teste real do ponto de extensão: uma entrada em `docs/.ownership.yml` e uma
   skill dona, sem tocar em check nenhum. Se precisar tocar, o ponto de extensão
   não era o que a spec dizia que era.
```

- [ ] **Step 11: Rodar tudo**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Esperado: PASS, `validate=0`, `drift=0`.

- [ ] **Step 12: Commit**

```bash
git add README.md CONTRIBUTING.md docs/definition-of-done.md CLAUDE.md docs/glossary.md plugin/skills/decision-recorder/SKILL.md plugin/skills/working-agreements-keeper/SKILL.md plugin/skills/living-docs-bootstrap/SKILL.md plugin/.claude-plugin/plugin.json .github/workflows/living-docs.yml CHANGELOG.md docs/superpowers/plans/BACKLOG-fases-3-7.md
git commit -m "docs(RN-0016, RN-0017, RN-0020, RN-0023): índices, DoD, glossary e workflow da Fase 7"
```

---

### Task 14: Promoção humana

**Objetivo:** Levar `ADR-0007`–`ADR-0010` a `accepted`, `DA-0002` a `resolved`,
e `RF-0010`–`RF-0012`, `RNF-0004` e `RN-0016`–`RN-0023` a `active`. **Isto não é
seu.** A skill escreve `draft`/`open`; promover é ato humano (`RN-0005`), e
`HK-3` intercepta com `ask`.

**Files:**

- Modify: `docs/decisions/adr/ADR-0007-data-injetavel-e-gatilho-de-pagamento-verificavel.md`
- Modify: `docs/decisions/adr/ADR-0008-documento-sem-familia-de-ids.md`
- Modify: `docs/decisions/adr/ADR-0009-limiar-de-duplicacao-textual.md`
- Modify: `docs/decisions/adr/ADR-0010-severidade-do-sinal-de-watches-no-ci.md`
- Modify: `docs/open-decisions.md` (`DA-0002 → resolved`)
- Modify: `docs/requirements/functional.md`
- Modify: `docs/requirements/non-functional.md`
- Modify: `docs/requirements/rules.md`

**Interfaces:**

- Consome: os IDs da Task 1 e da Task 2, e as citações plantadas pelas Tasks 3 a 13.
- Produz: dezesseis itens em estado final, exigíveis por `CI-3`.

**Requisitos:**

- Antes de propor a promoção, confira que cada requisito **já** tem quem o cite,
  fora do próprio arquivo:
  - `RF-0010`: `test/cli/validate.test.ts`, `test/checks/registry.test.ts`
  - `RF-0011`: `test/cli/validate.test.ts`, `test/acceptance/spec-criteria.test.ts`
  - `RF-0012`: `test/cli/init.test.ts`
  - `RNF-0004`: `test/core/dates.test.ts`, `src/core/dates.ts`
  - `RN-0016`: `test/checks/ci7-ownership-coverage.test.ts`, `test/docs/maintenance.test.ts`
  - `RN-0017`: `test/checks/ci7-ownership-coverage.test.ts`
  - `RN-0018`: `test/checks/ci4-staleness.test.ts`, `src/checks/ci4-staleness.ts`
  - `RN-0019`: `test/checks/ci4-staleness.test.ts`, `test/docs/maintenance.test.ts`
  - `RN-0020`: `test/checks/ci7-ownership-coverage.test.ts`, `test/docs/maintenance.test.ts`
  - `RN-0021`: `test/checks/ci7-ownership-coverage.test.ts`, `test/acceptance/spec-criteria.test.ts`
  - `RN-0022`: `test/hooks/hk6-session-inventory.test.ts`
  - `RN-0023`: `test/checks/ci8-links.test.ts`
    Sem citação, promover para `active` faz `CI-3` (regra 7) reprovar na hora.
- `DA-0002 → resolved` exige `Resolvida por: ADR-0008` na tabela, e `ADR-0008`
  já nasceu com `relates-to: [DA-0002, RN-0001]` (Task 1). `CI-3` verifica os
  dois lados.
- Os quatro ADRs já nasceram com `relates-to` preenchido. Depois de `accepted` o
  arquivo congela e `relates-to` não está na `mutable-fields`: consertar exigiria
  supersedir.
- `last-reviewed` só muda em arquivo que foi realmente revisto. Bump em massa é
  anti-requisito da spec §13 — e, desde esta fase, o `CI-4` que avisa sobre
  staleness é justamente o mecanismo que um bump em massa desligaria.

- [ ] **Step 1: Confirmar que as citações existem**

```bash
docker compose exec toolkit sh -c 'for id in RF-0010 RF-0011 RF-0012 RNF-0004 RN-0016 RN-0017 RN-0018 RN-0019 RN-0020 RN-0021 RN-0022 RN-0023; do echo "== $id"; grep -rln "$id" test/ src/ || echo "  SEM CITAÇÃO"; done'
```

Esperado: ao menos um arquivo por ID, e nenhum `SEM CITAÇÃO`. Citação dentro do
próprio artefato não cobre nada (`CI-3`, regra 7) — por isso a varredura é só em
`test/` e `src/`.

- [ ] **Step 2: Propor a promoção — e deixar a resposta com quem decide**

Edite os dezesseis estados:

- `status: draft` → `status: accepted` em `ADR-0007`, `ADR-0008`, `ADR-0009` e
  `ADR-0010`.
- Na tabela de `docs/open-decisions.md`, na linha `DA-0002`:
  `| open | — |` → `| resolved | ADR-0008 |`.
- `- **status:** draft` → `- **status:** active` em `RF-0010`, `RF-0011`,
  `RF-0012`, `RNF-0004`, e `RN-0016` a `RN-0023`.

`HK-3` vai interceptar cada uma dessas edições com `ask`. **A resposta não é
sua.** Apresente o que a pessoa precisa para decidir, e espere:

- `ADR-0007`: o toolkit passa a ter uma fonte de data só, e dívida passa a
  declarar gatilho em duas formas — a prosa e o `pay-when`. O que se perde é a
  possibilidade de as duas divergirem sem que nada acuse.
- `ADR-0008`: `DA-0002` fecha com uma chave nova em vez de um prefixo
  inventado. O que se perde é a validação de `CI-1` sobre esses documentos.
- `ADR-0009`: doze palavras é um número escolhido contra o corpus de um projeto.
  O que se perde é a duplicata por paráfrase, que nenhum check pega.
- `ADR-0010`: o CI passa a reprovar por caminho vigiado sem doc dono, com
  `Docs: none — <razão>` como saída. É a decisão com o maior efeito no dia a dia
  de quem escreve commit, e é a que mais merece a pergunta.

Se a pessoa recusar qualquer um deles, isso é um resultado legítimo: o item
continua `draft`, a Fase 7 continua entregue, e o backlog registra o estado
real. Não force, não contorne, e não "adiante" a promoção porque o plano termina
aqui.

- [ ] **Step 3: Rodar tudo e confirmar que o estado final passa**

```bash
docker compose exec toolkit npm test
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts validate; echo "validate=$?"
docker compose exec -w /workspace toolkit node /opt/living-docs/src/cli/index.ts drift; echo "drift=$?"
```

Esperado: PASS, `validate=0`, `drift=0`. Se `CI-3` acusar
`RN-00nn está active e não é citada`, o Step 1 mentiu — a citação está no próprio
arquivo, ou num caminho fora de `cited-by`. Se acusar
`DA-0002 aponta ADR-0008, que não a cita em relates-to`, o `relates-to` do
`ADR-0008` foi mexido depois da Task 1 — e, se o ADR já está `accepted`,
consertar agora exige supersedir.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/adr/ADR-0007-data-injetavel-e-gatilho-de-pagamento-verificavel.md docs/decisions/adr/ADR-0008-documento-sem-familia-de-ids.md docs/decisions/adr/ADR-0009-limiar-de-duplicacao-textual.md docs/decisions/adr/ADR-0010-severidade-do-sinal-de-watches-no-ci.md docs/open-decisions.md docs/requirements/functional.md docs/requirements/non-functional.md docs/requirements/rules.md
git commit -m "docs(ADR-0007, ADR-0008, ADR-0009, ADR-0010, DA-0002, RF-0010, RF-0011, RF-0012, RNF-0004, RN-0016, RN-0017, RN-0018, RN-0019, RN-0020, RN-0021, RN-0022, RN-0023): promoção por ato humano"
```

Se a promoção não aconteceu, não invente o commit: volte à Task 13, Step 10, e
escreva no backlog o estado real ("`ADR-0009` segue `draft`", "`DA-0002` segue
`open`").

---

## O que esta fase deliberadamente não faz

- **Não cria `--stage multi-team`.** A Fase 7 não instala artefato nenhum, e um
  estágio com o mesmo conjunto de arquivos que `production` é o rótulo vazio que
  o backlog mandava evitar. O que `CI-7` exigia do `init` era declarar o que ele
  cria, e isso vale para todos os estágios (`RF-0012`).
- **Não estende `CI-1` a `documents:`.** Um documento declarado ali não tem o
  frontmatter validado: um `trigger` com cadência dentro de `CONTRIBUTING.md`
  passa. Estender não é de graça — `CHANGELOG.md` não tem frontmatter por decisão
  da Fase 6, e um `CI-1` ingênuo passaria a reprová-lo. É decisão separada, e
  `ADR-0008` registra que ficou de fora.
- **Não resolve âncora de link.** `CI-8` verifica o arquivo, não o `#fragmento`.
  Resolver âncora exigiria reproduzir a regra de slug de cada renderizador, e uma
  regra reproduzida pela metade reprova link que funciona.
- **Não detecta duplicata por paráfrase.** `CI-7` compara frase normalizada por
  igualdade, com piso de doze palavras. O check que pegasse paráfrase erraria
  mais do que acertaria, e erraria numa direção indefensável dentro de um PR
  (`ADR-0009`).
- **Não paga `TDR-0001`.** `HK-1` continua congelando por arquivo, não por
  seção. O que muda é que o gatilho de pagamento passou a ser verificável: no
  primeiro PR que revogar um requisito, `CI-4` reprova até que a dívida seja
  paga ou reclassificada — as duas coisas humanas.
- **Não aceita `ADR-0001`, `ADR-0002` nem `ADR-0006`.** Os três seguem `draft`,
  e promovê-los não é desta fase nem deste agente.
- **Não mede volume documental e não conta documento.** `CI-7` cobra dono e
  duplicação; `CI-4` cobra revisão e dívida; `CI-8` cobra link. Nenhum deles
  produz um número sobre "quanta documentação existe", que é o anti-requisito da
  spec §13 — e `AG-1` recusa explicitamente sugerir documento novo.
- **Não muda `run-hook.sh`, `src/git/staged.ts`, `src/git/diff.ts` nem
  `src/exec/command.ts`.** O wrapper já distribui por nome de hook, e `HK-6`
  entra nele sem mudança; as três políticas de execução (falha aberta para hook,
  erro que sobe para check) continuam como estavam. `src/ids/coverage.ts` é a
  única extração desta fase, e ela tem teste existente como rede.
- **Não cria check para "todo princípio da Constitution tem enforcement
  nomeado".** Continua sendo regra de skill (`charter-keeper`) e teste de
  dogfooding, pela mesma razão da Fase 4: medi-la por check exigiria que o
  toolkit entendesse o texto do princípio.
