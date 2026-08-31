# Fechamento do toolkit de documentação viva — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fechar as nove lacunas `L-1`, `L-2`, `L-3`, `L-5`, `L-6`, `L-7`, `L-8`,
`L-9` e `L-10` da spec de fechamento — a forma escrita do ID deixa de ser do
toolkit e passa a ser do projeto, o `init` passa a instalar o enforcement que a
`SK-0` sempre declarou como seu, comportamento sem regra ganha a peça
determinística que faltava (`HK-8` e a metade nova do `CI-7`), as três regras
escritas sem check ganham `CI-9` e `CI-10`, o enforcement passa a se vigiar e a
caber num teto medido, e um consumidor real é adotado sem que nenhum arquivo
dele seja reescrito.

**Architecture:** Uma peça de engine nasce antes de tudo e é a razão de a ordem
ser esta: `IdFormat` separa **identidade** de **forma escrita**. A chave
canônica (`canonicalId`) continua interna, invariável e nunca exibida — é ela
que compara, detecta duplicata e fecha par bidirecional, e nenhum check muda de
lógica por causa disso. A forma escrita passa a ser lida de `id-format` no
`docs/.ownership.yml`, e vira o padrão que o parser reconhece e a única função
que imprime ID (`writeId`). Nenhum check volta a montar um ID por concatenação.

Sobre essa base, três frentes. **O `init` passa a escrever enforcement**: um
template de workflow parametrizado pelo modo de invocação (nunca Docker imposto
a quem instala), o registro do plugin no `.claude/settings.json` do consumidor e
o manifesto de marketplace na raiz do toolkit — os três instalados por
**mesclagem**, nunca por sobrescrita, e o estágio `multi-team` passa a existir
porque passa a ter enforcement atrás dele. **A decisão aberta ganha caminhos
reivindicados**: um campo opcional no contrato de máquina, `HK-8` que
**pergunta** (nunca nega — hook que julga está no lugar errado) e um sexto
achado no `CI-7`, na metade que já recebe o diff. **Duas regras viram check**:
`CI-9` cobra a disciplina do commit (bump em massa de `last-reviewed` e commit
que altera artefato sem citar o ID), `CI-10` cobra que o `trigger` do artefato e
a `description` da skill dona falem do mesmo evento.

O dogfooding é obrigatório e é a prova: este repositório passa a declarar
`.github/workflows/**` em `watches` e em `consumer-visible-paths`, o conjunto de
checks passa a ser medido contra um teto declarado, e a última task adota um
consumidor com 97 regras escritas como `RN001` sem tocar num arquivo dele.

**Tech Stack:** TypeScript (Node ≥ 24, executado só em container —
`RNF-0002`), `node:test`, `picomatch`, `yaml`, Claude Code plugin
(`SKILL.md`, `hooks.json`, `marketplace.json`), GitHub Actions no template.

**Spec:** `docs/superpowers/specs/2026-08-28-fechamento-do-toolkit-design.md` —
e, como insumo que ela não repete: `LIVING-DOCUMENTATION-TOOLKIT.md` (§2
contrato de máquina, §3 ponto de extensão, §5 `SK-0`, §7 hooks, §8 sintaxe de
citação, §9 checks e orçamento de tempo, §10 fases e estágios, §11 convenções de
autoria e commits, §12 critério 4, §13 anti-requisitos),
`LIVING-DOCUMENTATION.md` (a pesquisa) e
`docs/superpowers/plans/BACKLOG-fases-3-7.md` (o que cada fase apurou).

## Global Constraints

- **Nada roda no host além de Docker** (`RNF-0002`). Todo comando vai por
  `docker compose exec toolkit …` ou `./bin/living-docs`. Se um passo pede
  `node`, `npm` ou `npx` fora do container, o passo está errado.
- **Docker é regra deste toolkit, não de quem o instala.** O workflow que o
  `init` escreve no consumidor recebe o modo de invocação por parâmetro e não
  menciona Docker.
- Identificadores, nomes de arquivo e IDs em inglês/neutro; prosa em português
  (spec §11). Mensagem de commit em português, no formato `tipo(ID): assunto`.
- **ID nunca é reciclado** (spec §2). Confira `docs/ids-retired.txt` antes de
  tomar um número. Os números livres neste plano, e **nenhum outro**:
  `ADR-0011`, `ADR-0012`, `ADR-0013`; `DA-0003`; `RF-0013`, `RF-0014`;
  `RN-0024` a `RN-0029`; `RNF-0005`.
- **Nenhum agente promove estado.** Todo artefato criado aqui nasce `draft` ou
  `open`. A promoção é a última task e é ato humano (`HK-3` intercepta).
- **Nenhum artefato gerado é editado à mão.** `docs/contracts/checks.gen.md` só
  muda pela fonte (`src/checks/catalog.ts`) e pelo gerador:
  `docker compose exec toolkit node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md`.
  `HK-2` nega a edição direta e `CI-5` cobra a deriva.
- **Mudança em caminho visível ao consumidor viaja com a entrada de CHANGELOG.**
  Os caminhos são `src/cli/**`, `src/checks/catalog.ts`, `src/config/ownership.ts`,
  `plugin/**`, `templates/**`, `bin/living-docs` — e, a partir da Task 6,
  `.github/workflows/**`. `CI-6` cobra.
- **Teste antes da implementação, citando o ID do requisito que ele cobre.** É a
  citação que `CI-3` procura.
- Nenhum check mede volume, conta documentos ou estima cobertura documental
  (spec §13).
- Depois de cada task: `docker compose exec toolkit npm test`,
  `docker compose exec toolkit npm run typecheck` e `./bin/living-docs validate`
  passam. Não entregue com finding aberto.

## Cobertura da spec de fechamento

| Item da spec | Onde fecha |
| --- | --- |
| `L-10` — identidade × forma escrita | Tasks 3, 4, 5 |
| `L-1` — o `init` não instala enforcement | Tasks 6, 8 |
| `L-2` — o plugin não tem caminho de instalação | Task 7 |
| `L-7` — `--stage multi-team` não existe | Task 8 |
| `L-3` — critério 4 sem mecanismo | Tasks 9, 10 |
| `L-5` — bump em massa não é detectado | Task 11 |
| `L-8` — ID na mensagem de commit; orçamento de tempo | Tasks 11, 13 |
| `L-6` — `trigger` × `description` | Task 12 |
| `L-9` — o enforcement não é vigiado | Task 6 |
| Critérios de aceite 1 e 2 | Tasks 3, 4, 5 |
| Critérios 3, 4 e 5 | Tasks 6, 7, 8 |
| Critério 6 | Tasks 9, 10 |
| Critérios 7 e 8 | Task 11 |
| Critério 9 | Task 12 |
| Critério 10 | Task 13 |
| Critério 11 | Task 6 |
| Critério 12 | Task 15 |
| Critérios 9 e 10 da spec **original** (fora de escopo, linha humana na DoD) | Task 14 |

---

### Task 1: As três decisões — `ADR-0011`, `ADR-0012`, `ADR-0013` — e a `DA-0003`

**Objetivo:** Registrar, antes de qualquer código, as três decisões que este
plano toma e que não são óbvias, e abrir a lacuna que ele descobre e **não**
resolve. Cada uma nasce `draft`/`open`: promover é ato humano (Task 16).

**Files:**
- Create: `docs/decisions/adr/ADR-0011-identidade-e-forma-escrita-do-id.md`
- Create: `docs/decisions/adr/ADR-0012-o-que-o-estagio-parametriza.md`
- Create: `docs/decisions/adr/ADR-0013-os-dois-limiares-do-fechamento.md`
- Modify: `docs/open-decisions.md` (linha de `DA-0003`)

**Interfaces:**
- Consome: nada. É a primeira task.
- Produz: os IDs `ADR-0011`, `ADR-0012`, `ADR-0013` e `DA-0003`, citáveis por
  toda task seguinte. Nenhum outro ADR é criado neste plano.

**Requisitos:**
- Frontmatter completo: `id`, `title`, `status: draft`, `owner: "@dan"`,
  `trigger`, `last-reviewed`, `relates-to`, `supersedes`, `superseded-by`. O
  `trigger` de ADR é sempre "Nunca. Imutável após aceito; uma decisão nova o
  supersede." — cadência reprova em `CI-1`.
- `relates-to` preenchido **agora**, não na aceitação: `accepted` congela o
  arquivo e `relates-to` não está em `mutable-fields`, então um ADR aceito com
  `relates-to: []` só se conserta supersedindo.
- `CI-2` exige que toda citação resolva. Os requisitos citados aqui
  (`RN-0024`…) nascem na Task 2 — por isso as duas tasks viajam no **mesmo
  commit** não é obrigatório, mas `validate` só volta a passar depois da Task 2.
  Rode `validate` ao fim da Task 2, não ao fim desta.

**`HK-5`:** nenhum caminho vigiado é tocado — esta task só escreve documento.

- [ ] **Step 1: Escrever `ADR-0011`**

Crie `docs/decisions/adr/ADR-0011-identidade-e-forma-escrita-do-id.md`:

```markdown
---
id: ADR-0011
title: Identidade de um ID e a forma escrita dele são coisas diferentes
status: draft
owner: "@dan"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-28
relates-to: [RN-0003, RN-0024]
supersedes: null
superseded-by: null
---

# ADR-0011 — Identidade de um ID e a forma escrita dele são coisas diferentes

## Contexto

A spec §8 fixa uma sintaxe de citação — `<PREFIXO>-<número>` — e justifica:
"uma única forma, porque é ela que `CI-2` e `CI-3` reconhecem por `grep`". O
requisito real por trás disso é **uma forma por projeto**: é o `grep` que precisa
de determinismo, não o universo. A implementação codificou a forma do toolkit em
`src/docs/schema.ts` e `src/ids/citations.ts` e a tratou como universal.

Isso colide com duas exigências da mesma spec: o passo 1 da `SK-0` ("adotar o
que existe … **nunca** criar um paralelo") e o critério de aceite 1 ("nenhum
artefato preexistente foi duplicado ou sobrescrito"). Um repositório com 97
regras numeradas `RN001` não tem como ser adotado sem ser reescrito, e reescrever
é o que o critério proíbe.

## Alternativas consideradas

1. **Renumerar o consumidor.** Descartada, e é anti-requisito escrito: é
   sobrescrever preexistente, num diff de 97 regras que ninguém revisa.
2. **Aceitar as duas formas em todo lugar** (`RN009` e `RN-0009` sempre válidos).
   Descartada: mata o determinismo do `grep` que a spec §8 pede, e faz o próprio
   repositório aceitar duas grafias do mesmo item lado a lado.
3. **Uma tabela de apelidos por ID.** Descartada: configuração por item é o
   oposto de ponto de extensão único, e apodrece na primeira regra nova.
4. **Separar identidade de forma escrita.** Escolhida.

## Decisão

**A chave canônica é interna e invariável; a forma escrita é declarada pelo
projeto.**

- **Chave canônica** — `<PREFIXO>-<4 dígitos>`, produzida por `canonicalId`,
  **nunca exibida**. É o que compara, detecta duplicata, fecha par bidirecional e
  resolve citação. Nenhum check muda de lógica.
- **Forma escrita** — `id-format: { separator, padding }` em
  `docs/.ownership.yml`, com `separator: "-"` e `padding: 4` como padrão. É o que
  o parser reconhece ao ler e o que o toolkit imprime ao sugerir um ID novo.
- **A leitura aceita o padding declarado e um dígito a menos.** Com `padding: 4`
  são 3 ou 4 dígitos, que é exatamente o que o toolkit já fazia — `ADR-001` e
  `ADR-0001` são o mesmo item (`RN-0003`), e repadding nunca criou item novo.
- **Quem escreve ID é uma função só**: `writeId`. Nenhum check volta a montar um
  ID por concatenação — a mensagem de buraco de sequência do `CI-2` era o único
  vazamento e passa a chamá-la.
- **Adoção de formato não é silenciosa.** O inventário relata a forma detectada e
  quantos itens leu nela; declarar é ato de quem instala.

## Consequências

### O que se ganha

Um repositório real é adotado sem que nenhum arquivo dele seja tocado, que é o
critério 1 da spec original valendo para o mundo e não só para um repositório
vazio. E o formato deixa de estar escrito em cinco lugares: passa a existir uma
fonte e uma função que o imprime.

### O que se aceita perder

**Um projeto tem uma forma, não várias.** Um repositório que hoje mistura `RN001`
e `RN-0001` precisa escolher uma — e essa é a mesma exigência de determinismo que
a spec §8 sempre fez, agora aplicada ao projeto em vez de ao universo.

**A leitura fica um dígito mais larga do que a escrita.** `RN09` é lido como
`RN009` num projeto com `padding: 3`. É deliberado e é a regra que já existia:
identidade não depende de zeros à esquerda.

**Separador é vocabulário fechado** (`-`, `_`, `.`, `:` ou vazio). Separador
arbitrário viraria um padrão de expressão regular vindo de configuração, que é
uma superfície que este toolkit não quer.
```

- [ ] **Step 2: Escrever `ADR-0012`**

Crie `docs/decisions/adr/ADR-0012-o-que-o-estagio-parametriza.md`:

```markdown
---
id: ADR-0012
title: O estágio parametriza os checks do workflow; os hooks entram como peça única
status: draft
owner: "@dan"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-28
relates-to: [RF-0013, RN-0025]
supersedes: null
superseded-by: null
---

# ADR-0012 — O estágio parametriza os checks do workflow; os hooks entram como peça única

## Contexto

A `SK-0` declara como sua "a instalação de `HK-*` e `CI-*`" e o passo 4 manda
instalar **na ordem das fases**. A regra que sai disso é "o conjunto de
enforcement instalado é o das fases do estágio, nem mais nem menos".

Os `CI-*` cabem nessa regra: cada um é um passo do workflow, e um passo se
inclui ou não se inclui. Os `HK-*` não cabem: eles chegam ao consumidor por um
plugin, e um plugin registra o `hooks.json` inteiro. Não existe "meio plugin".

## Alternativas consideradas

1. **Um plugin por fase.** Descartada: sete plugins para sete hooks multiplica o
   caminho de instalação por sete e transforma "instalar o toolkit" num
   procedimento. O anti-requisito de duplicata vale para peça de instalação
   também.
2. **Reescrever o `hooks.json` do plugin no momento do `init`.** Descartada: o
   `init` passaria a editar um arquivo do **toolkit** para configurar o
   **consumidor**, que é exatamente a confusão de raízes que `ADR-0003` fechou.
3. **Registrar os hooks um a um no `.claude/settings.json` do consumidor.**
   Descartada: duplica o `hooks.json` do plugin num segundo lugar, e as duas
   cópias divergem no primeiro hook novo.
4. **Estagiar os checks e aceitar os hooks como peça única.** Escolhida.

## Decisão

**O estágio parametriza o workflow de CI. O registro do plugin é indivisível.**

- `solo` e `small-team` instalam o passo `validate`.
- `production` acrescenta `drift` (`CI-5`) e `changelog --base` (`CI-6`).
- `multi-team` acrescenta `validate --base` — a metade de `CI-7` que lê o diff, e
  `CI-9`.
- O registro do plugin liga os hooks **todos**, em qualquer estágio. O que
  estagia um hook não é o instalador: é a configuração que ele lê. `HK-2` sem
  `generated[]`, `HK-4` e `HK-5` sem `watches`, `HK-8` sem decisão aberta com
  caminho reivindicado — todos ficam em silêncio.
- `HK-6` e `HK-7` falam em qualquer estágio, e isso é aceito: os dois devolvem
  `additionalContext` e nenhum dos dois bloqueia nada.

## Consequências

### O que se ganha

`--stage multi-team` passa a existir com conteúdo — enforcement é arquivo, e a
partir daqui um estágio instala enforcement. A `SK-0` deixa de mandar escolher um
valor que o CLI rejeita.

### O que se aceita perder

**Um projeto `solo` recebe sete hooks e usa dois.** O custo é zero enquanto o
silêncio for real, e é por isso que o silêncio é testado: cada hook tem teste que
prova que ele se cala sem a configuração dele. No dia em que um hook falar sem
configuração, esta decisão é que está errada — não o teste.
```

- [ ] **Step 3: Escrever `ADR-0013`**

Crie `docs/decisions/adr/ADR-0013-os-dois-limiares-do-fechamento.md`:

```markdown
---
id: ADR-0013
title: Os dois limiares do fechamento — bump em massa e semelhança de gatilho
status: draft
owner: "@dan"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-28
relates-to: [RN-0027, RN-0029]
supersedes: null
superseded-by: null
---

# ADR-0013 — Os dois limiares do fechamento — bump em massa e semelhança de gatilho

## Contexto

`CI-9` e `CI-10` são os dois primeiros checks depois de `CI-7` a comparar coisas
sem resposta binária: "vários documentos" não é um número, e "dizem a mesma
coisa" não é uma igualdade. `ADR-0009` já fixou o precedente para esse tipo de
peça — o limiar precisa estar **escrito** para poder ser discutido dentro de um
PR, e a correção de um falso positivo é um ADR novo, nunca uma exceção local.

## Alternativas consideradas

1. **Nenhum limiar: qualquer mudança de `last-reviewed` reprova.** Descartada:
   revisar um documento e atualizar a data é o mecanismo funcionando.
2. **Similaridade estatística para o `trigger` × `description`.** Descartada pela
   mesma razão de `ADR-0009`: um número que ninguém explica no PR é adivinhação.
3. **Comparar por igualdade de frase.** Descartada: `trigger` e `description` são
   escritos para leitores diferentes — um para quem mantém o documento, outro
   para o índice de skills. Exigir igualdade seria exigir cópia, que é o
   anti-requisito de `RN-0010` vindo pela porta dos fundos.
4. **Dois números escritos, calibrados contra este repositório.** Escolhida.

## Decisão

**Bump em massa: três documentos.** Um diff em que **três ou mais** documentos
mudam **apenas** a linha de `last-reviewed`, e nada mais no corpo, reprova. O
número é configurável em `last-reviewed-bump-limit` no `.ownership.yml`.

- **A unidade é o diff da branch, não o commit.** É a unidade que o CI tem, e
  dividir o bump em três commits não o torna revisão de verdade.
- **Não há rótulo de escape.** O escape é o próprio anti-requisito da spec §13.
  Quem revisou de verdade mudou mais do que a data; quem não revisou não deve
  marcar que revisou.

**Semelhança de gatilho: duas raízes compartilhadas.** O `trigger` de um artefato
e a `description` da skill dona precisam compartilhar **ao menos duas** raízes de
palavra. Raiz é a palavra de cinco letras ou mais, normalizada como em
`ADR-0009` (minúscula, sem marcação, sem pontuação), truncada em seis
caracteres — o truncamento é o que faz "alterada" encontrar "alterar" sem que o
toolkit aprenda português.

- **Calibração:** contra os onze pares deste repositório. O par mais apertado é
  `docs/deprecations.md` × `release-historian`, com exatamente duas raízes
  (`anunci`, `deprec`); o mais folgado é `docs/requirements/*.md` ×
  `requirements-keeper`, com quatro.
- **Item de coleção não entra.** Só o gatilho do **documento** é comparado: o
  `trigger` de um ADR é "Nunca. Imutável após aceito", que é do item e não do
  artefato.
- **Skill dona ausente da raiz do toolkit avisa e segue.** É a única exceção ao
  "só `CI-4` avisa" da spec §9, e existe porque um projeto pode declarar skill
  própria — reprovar por isso seria o check exigindo que todo dono fosse do
  plugin.

## Consequências

### O que se ganha

Duas regras que a spec escreveu e nunca alocou a peça nenhuma passam a ter
enforcement, e os dois números que as sustentam estão escritos onde se discute
número: num ADR, com o corpus da calibração nomeado.

### O que se aceita perder

**Os dois números são escolhidos, não derivados.** Três documentos e duas raízes
são calibração contra um projeto. A primeira vez que qualquer um deles reprovar
um caso legítimo, o caminho é um ADR novo com o caso concreto anexado — não uma
exceção dentro do check, e não baixar o número em silêncio.

**Paráfrase completa passa no `CI-10`.** Um `trigger` reescrito com sinônimos
inteiros não compartilha raiz nenhuma e reprova mesmo dizendo a mesma coisa; um
`trigger` que compartilha duas raízes por acaso passa dizendo outra. É o preço de
uma comparação que cabe numa frase de mensagem de erro.
```

- [ ] **Step 4: Abrir `DA-0003`**

O toolkit decide as duas raízes (`ADR-0003`) e **não** decide como ele chega ao
CI de quem o instala — o workflow instalado recebe o modo de invocação por
parâmetro justamente porque essa resposta não existe. Acrescente a linha à tabela
de `docs/open-decisions.md`, logo abaixo da linha de `DA-0002`:

```markdown
| DA-0003 | Como o toolkit chega ao CI e à sessão de um repositório consumidor — imagem publicada, pacote, clone ou submódulo. `ADR-0003` separa as duas raízes e deliberadamente não decide esta; enquanto ela estiver aberta, o modo de invocação do workflow e a fonte do marketplace são parâmetros de quem instala | open | — | 2026-08-28 |
```

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr/ADR-0011-identidade-e-forma-escrita-do-id.md \
        docs/decisions/adr/ADR-0012-o-que-o-estagio-parametriza.md \
        docs/decisions/adr/ADR-0013-os-dois-limiares-do-fechamento.md \
        docs/open-decisions.md
git commit -m "docs(ADR-0011, ADR-0012, ADR-0013, DA-0003): as decisões do fechamento do toolkit

Docs: none — as três decisões e a lacuna são o doc dono desta mudança"
```

---

### Task 2: Os requisitos — `RF-0013`, `RF-0014`, `RN-0024`–`RN-0029`, `RNF-0005`

**Objetivo:** A regra antes do código. Nove requisitos com ID citável, cada um
enunciando o que o sistema deve fazer, sem descrever implementação. Nascem
`draft`; a promoção é a Task 16.

**Files:**
- Modify: `docs/requirements/functional.md` (acrescenta `RF-0013`, `RF-0014`)
- Modify: `docs/requirements/rules.md` (acrescenta `RN-0024`–`RN-0029`)
- Modify: `docs/requirements/non-functional.md` (acrescenta `RNF-0005`)

**Interfaces:**
- Consome: os IDs de `ADR-0011`, `ADR-0012` e `ADR-0013` da Task 1.
- Produz: `RF-0013`, `RF-0014`, `RN-0024`, `RN-0025`, `RN-0026`, `RN-0027`,
  `RN-0028`, `RN-0029`, `RNF-0005` — citados por todo teste deste plano.

**Requisitos:**
- Cada seção segue o formato de `templates/requirements.md`: título
  `## <ID> — <enunciado curto>`, depois `- **status:** draft`, `- **relates-to:**`
  quando houver, `- **fora de escopo:**`, e o enunciado em prosa.
- Enunciado diz **o que**, nunca **como**. "O `init` mescla" é requisito; "o
  `init` usa `JSON.parse`" não é.
- Numeração contígua: `CI-2` reprova buraco de sequência.

**`HK-5`:** nenhum caminho vigiado é tocado.

- [ ] **Step 1: Acrescentar `RF-0013` e `RF-0014` ao fim de `docs/requirements/functional.md`**

```markdown
## RF-0013 — `init` instala o enforcement do estágio, mesclando com o que já existe

- **status:** draft
- **relates-to:** ADR-0012
- **fora de escopo:** o modo de invocação do CLI dentro do workflow, que é parâmetro de quem instala (`DA-0003`); e `.claude/settings.json` e o workflow instalado, que não são documentação e por isso não entram em `documents:`

Além da moldura, `living-docs init` escreve as duas peças de enforcement: o
workflow de CI do estágio e o registro do plugin que liga os hooks na sessão. As
duas entram por **mesclagem**: um repositório com workflows próprios e hooks já
registrados mantém tudo o que tem, e o toolkit acrescenta o que falta e nada
mais. Rodar duas vezes não duplica entrada — a idempotência vale para o
enforcement igual vale para o documento.

Um repositório com documento e nenhum check rodando é a promessa que este toolkit
recusa: o enforcement é o que faz a regra valer.

## RF-0014 — O inventário relata a forma escrita dos IDs, e não a adota em silêncio

- **status:** draft
- **relates-to:** ADR-0011, RN-0024
- **fora de escopo:** converter IDs de uma forma para outra, que é reescrever preexistente

`living-docs init --dry-run` num repositório cujos IDs não estão na forma padrão
relata qual forma encontrou e quantos itens leu naquela forma. Declarar a forma é
ato de quem instala, não do inventário: adoção silenciosa de formato é a mesma
classe de erro que adoção silenciosa de caminho, e a `SK-0` já recusa a segunda.
```

- [ ] **Step 2: Acrescentar `RN-0024`–`RN-0029` ao fim de `docs/requirements/rules.md`**

```markdown
## RN-0024 — A forma escrita de um ID é do projeto; a identidade não depende dela

- **status:** draft
- **relates-to:** ADR-0011, RN-0003
- **fora de escopo:** qual forma um projeto deve escolher, que é decisão dele

Um projeto declara como seus IDs se escrevem — separador e número de dígitos — e
é essa forma que o toolkit reconhece ao ler e imprime ao sugerir um ID novo. A
identidade do item não depende da forma: `RN009` e `RN-0009` são o mesmo item,
pela mesma razão que `ADR-001` e `ADR-0001` sempre foram.

Quem escreve um ID é uma função só. Nenhum check monta ID por concatenação —
formato montado à mão em dois lugares é a garantia de que um deles vai divergir.

## RN-0025 — O enforcement instalado é o das fases do estágio

- **status:** draft
- **relates-to:** ADR-0012, RF-0013
- **fora de escopo:** quais fases cada estágio pede, que é a spec §10

O conjunto de checks que o workflow instalado roda é o das fases do estágio, nem
mais nem menos. Estágio que instala moldura vazia é a wiki morta nascendo de
fábrica; estágio que instala check de fase que o projeto não tem é enforcement
que reprova por algo que ninguém pediu.

Os hooks são peça única, e o que os estagia é a configuração que eles leem: hook
sem a configuração dele fica em silêncio.

## RN-0026 — Caminho reivindicado por decisão aberta é lembrado na edição e cobrado no diff

- **status:** draft
- **relates-to:** ADR-0010, RN-0009
- **fora de escopo:** julgar se uma edição é a implementação da regra que falta — hook que julga está no lugar errado

Uma decisão aberta pode nomear os caminhos que ela bloqueia. Quando nomeia,
editar um deles **pergunta**, nomeando a decisão, o que ela bloqueia e a skill
dona; e o diff que os leva **reprova**, com a razão escrita como única saída.

O campo é opcional: decisão aberta sem caminho declarado continua válida e não
bloqueia nada. O que não se aceita é o contrário — declarar o caminho e não ser
lembrado.

## RN-0027 — Bump em massa de `last-reviewed` reprova

- **status:** draft
- **relates-to:** ADR-0013
- **fora de escopo:** atualizar a data de um documento que mudou de verdade, que é o mecanismo funcionando

Um diff em que vários documentos alteram a data de revisão e nada mais no corpo
reprova, nomeando o anti-requisito. Um documento revisado de verdade muda em mais
do que a data; vinte documentos que só mudaram a data são o mecanismo de revisão
sendo desligado enquanto se finge cumpri-lo.

O limiar é escrito e configurável, e não existe rótulo de exceção: o rótulo seria
a caixinha marcada que o anti-requisito descreve.

## RN-0028 — Commit que altera artefato cita o ID afetado

- **status:** draft
- **fora de escopo:** o formato da mensagem de commit, que é acordo de trabalho e não regra do toolkit

Quando o diff altera um arquivo de artefato, alguma mensagem de commit do mesmo
diff cita ao menos um dos IDs declarados naquele arquivo. É o que torna o
`git log` navegável por regra: sem a citação, o histórico responde "o que mudou"
e nunca "por causa de qual regra".

## RN-0029 — O gatilho do artefato e a `description` da skill dona falam do mesmo evento

- **status:** draft
- **relates-to:** ADR-0013, RN-0010
- **fora de escopo:** o `trigger` de um item dentro de uma coleção, que é do item e não do artefato

O campo `trigger` de um documento e a `description` da skill declarada como dona
dele descrevem o mesmo evento. Se divergirem, o documento declara um gatilho que
nada dispara: o mecanismo de gatilho e o roteamento de skill deixam de se
encontrar, e o documento passa a depender de alguém lembrar dele.

Quando a skill dona declarada não existe na raiz do toolkit, o resultado é aviso
e não falha — um projeto pode declarar skill própria, e reprovar por isso seria
exigir que todo dono fosse do plugin.
```

- [ ] **Step 3: Acrescentar `RNF-0005` ao fim de `docs/requirements/non-functional.md`**

```markdown
## RNF-0005 — O conjunto de checks cabe num teto de tempo declarado e medido

- **status:** draft
- **fora de escopo:** o tempo de cada check isolado, e o tempo de construção da imagem

A spec exige que os checks rodem "em minutos, no PR". O teto é do **conjunto**,
não de cada check — é o conjunto que roda no PR —, está declarado no código e é
**medido** a cada execução, nunca estimado. Um orçamento que ninguém mede é uma
intenção, e a primeira execução lenta o descobre em produção.
```

- [ ] **Step 4: Rodar os checks**

```bash
docker compose exec toolkit npm test
./bin/living-docs validate
```

Esperado: sem finding. Se `CI-2` acusar citação que não resolve, o ID citado na
Task 1 e o criado aqui divergiram — corrija o texto, nunca o número.

- [ ] **Step 5: Commit**

```bash
git add docs/requirements/functional.md docs/requirements/rules.md docs/requirements/non-functional.md
git commit -m "docs(RF-0013, RF-0014, RN-0024, RN-0025, RN-0026, RN-0027, RN-0028, RN-0029, RNF-0005): os requisitos do fechamento"
```

---

### Task 3: `IdFormat` — a forma escrita entra no engine

**Objetivo:** Separar identidade de forma escrita nas duas peças que hoje
codificam o formato: `src/docs/schema.ts` (leitura e chave canônica) e
`src/ids/citations.ts` (varredura de citação). Mais a chave `id-format` no
`.ownership.yml`. Nada além destes três arquivos muda de comportamento nesta
task — os parsers e os checks vêm na Task 4.

**Files:**
- Modify: `src/docs/schema.ts`
- Modify: `src/ids/citations.ts`
- Modify: `src/config/ownership.ts`
- Test: `test/docs/schema.test.ts` (acrescenta casos)
- Test: `test/ids/citations.test.ts` (acrescenta casos)
- Test: `test/config/ownership.test.ts` (acrescenta casos)

**Interfaces:**
- Consome: `OwnershipError` e `asRecord` de `src/config/ownership.ts`.
- Produz:
  - `IdFormat { separator: string; padding: number }`
  - `DEFAULT_ID_FORMAT: IdFormat` — `{ separator: '-', padding: 4 }`
  - `SEPARATORS_ALLOWED: readonly string[]` — `['-', '_', '.', ':', '']`
  - `PADDING_RANGE: { min: 2; max: 6 }`
  - `digitRange(format): { min: number; max: number }`
  - `idPatternSource(format?): string` — grupo 1 prefixo, grupo 2 número
  - `parseId(value: unknown, format?): { prefix, number } | null`
  - `canonicalId(parsed): string` — **inalterada**
  - `writeId(prefix: string, number: number, format?): string`
  - `citationPattern(format?): RegExp`
  - `findCitations(source: string, format?): Citation[]`
  - `OwnershipConfig.idFormat: IdFormat`

**Requisitos:**
- Todo parâmetro `format` tem `DEFAULT_ID_FORMAT` como padrão. Sem isso, esta
  task quebraria os cinco chamadores de uma vez, e o valor de fazer a mudança em
  duas tasks é justamente que a Task 3 não quebra nada.
- `canonicalId` **não muda**: quatro dígitos, hífen, sempre. É chave interna;
  mudá-la mudaria a identidade de todo item já registrado.
- A leitura aceita `padding` e `padding - 1` dígitos. Com o padrão, isso é 3 ou
  4 — idêntico ao de hoje, e é o que faz `test/docs/schema.test.ts` continuar
  passando sem edição dos casos existentes.
- Separador é vocabulário fechado (`ADR-0011`). Valor fora da lista é
  `OwnershipError` com a lista na mensagem — configuração inválida não vira
  padrão silencioso.
- `padding` fora de 2..6 é `OwnershipError`. Um dígito não distingue item de
  ano; sete dígitos é dado, não ID.
- `src/ids/citations.ts` perde o comentário "se aquele formato mudar, mude aqui
  também": passa a **derivar** de `idPatternSource`, e o comentário deixa de ser
  verdade sobre duas cópias para virar verdade sobre uma fonte.

**`HK-5`:** vai lembrar de `docs/requirements/rules.md` (caminho vigiado
`src/checks/**` não é tocado aqui, mas `src/config/ownership.ts` é
consumer-visible) e vai pedir a entrada de CHANGELOG por `src/config/ownership.ts`.
A resposta: `RN-0024` viajou na Task 2, e o CHANGELOG entra no Step 6.

- [ ] **Step 1: Escrever o teste que falha — forma escrita no schema**

Acrescente a `test/docs/schema.test.ts`:

```typescript
import {
  DEFAULT_ID_FORMAT,
  canonicalId,
  digitRange,
  idPatternSource,
  parseId,
  writeId,
} from '../../src/docs/schema.ts';

const SEM_HIFEN = { separator: '', padding: 3 } as const;

test('RN-0024: parseId lê a forma declarada pelo projeto', () => {
  assert.deepEqual(parseId('RN009', SEM_HIFEN), { prefix: 'RN', number: 9 });
  assert.deepEqual(parseId('RN097', SEM_HIFEN), { prefix: 'RN', number: 97 });
  assert.deepEqual(parseId('RN09', SEM_HIFEN), { prefix: 'RN', number: 9 }, 'um dígito a menos ainda é o mesmo item');
  assert.equal(parseId('RN-009', SEM_HIFEN), null, 'um projeto tem uma forma, não duas');
  assert.equal(parseId('RN0097', SEM_HIFEN), null, 'quatro dígitos não é a forma declarada');
});

test('RN-0024: a forma padrão é a de hoje — 3 ou 4 dígitos com hífen', () => {
  assert.deepEqual(digitRange(DEFAULT_ID_FORMAT), { min: 3, max: 4 });
  assert.deepEqual(parseId('ADR-0042'), { prefix: 'ADR', number: 42 });
  assert.deepEqual(parseId('DA-007'), { prefix: 'DA', number: 7 });
  assert.equal(parseId('RN009'), null);
});

test('RN-0024: a chave canônica não depende da forma escrita', () => {
  const semHifen = parseId('RN009', SEM_HIFEN);
  const comHifen = parseId('RN-0009');
  assert.ok(semHifen && comHifen);
  assert.equal(canonicalId(semHifen), canonicalId(comHifen));
  assert.equal(canonicalId(semHifen), 'RN-0009');
});

test('RN-0024: writeId é a única função que imprime um ID', () => {
  assert.equal(writeId('RN', 9), 'RN-0009');
  assert.equal(writeId('RN', 9, SEM_HIFEN), 'RN009');
  assert.equal(writeId('ADR', 142, { separator: '_', padding: 4 }), 'ADR_0142');
  assert.equal(writeId('RN', 1234, SEM_HIFEN), 'RN1234', 'o número maior que o padding não é truncado');
});

test('idPatternSource entrega prefixo e número em dois grupos', () => {
  const match = new RegExp(`^${idPatternSource()}$`).exec('TDR-0003');
  assert.equal(match?.[1], 'TDR');
  assert.equal(match?.[2], '0003');
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0024"
```

Esperado: FALHA com `digitRange is not a function` / `writeId is not a function`.

- [ ] **Step 3: Implementar em `src/docs/schema.ts`**

Substitua o bloco final do arquivo (de `const ID = …` até o fim) por:

```typescript
/**
 * A forma **escrita** de um ID neste projeto (`ADR-0011`, `RN-0024`).
 *
 * Não é a identidade: a identidade é `canonicalId`, que não muda nunca e não é
 * exibida. Esta é a forma que o parser reconhece ao ler e a que `writeId`
 * imprime ao sugerir um ID novo — e é o que permite adotar um repositório cujos
 * IDs já se escrevem de outro jeito sem reescrever um arquivo dele.
 */
export interface IdFormat {
  separator: string;
  padding: number;
}

export const DEFAULT_ID_FORMAT: IdFormat = Object.freeze({ separator: '-', padding: 4 });

/**
 * Vocabulário fechado (`ADR-0011`). Separador arbitrário viraria um padrão de
 * expressão regular vindo de configuração — superfície que este toolkit recusa.
 */
export const SEPARATORS_ALLOWED: readonly string[] = Object.freeze(['-', '_', '.', ':', '']);

export const PADDING_RANGE = Object.freeze({ min: 2, max: 6 });

/** Padding da chave canônica. Interno, nunca exibido, nunca configurável. */
const CANONICAL_PADDING = 4;

function escapeForRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Quantos dígitos a LEITURA aceita: o padding declarado e um a menos.
 *
 * É a regra que já existia com outro nome — `ADR-001` e `ADR-0001` são o mesmo
 * item (`RN-0003`), e repadding nunca criou item novo. Com o padrão isto dá 3 a
 * 4 dígitos, que é exatamente o que o toolkit lê desde a Fase 0.
 */
export function digitRange(format: IdFormat): { min: number; max: number } {
  return { min: Math.max(1, format.padding - 1), max: format.padding };
}

/** O corpo do padrão de um ID: grupo 1 é o prefixo, grupo 2 é o número. */
export function idPatternSource(format: IdFormat = DEFAULT_ID_FORMAT): string {
  const { min, max } = digitRange(format);
  return `([A-Z]{2,4})${escapeForRegExp(format.separator)}(\\d{${min},${max}})`;
}

export function parseId(
  value: unknown,
  format: IdFormat = DEFAULT_ID_FORMAT,
): { prefix: string; number: number } | null {
  if (typeof value !== 'string') return null;
  const match = new RegExp(`^${idPatternSource(format)}$`).exec(value.trim());
  if (!match?.[1] || !match[2]) return null;
  return { prefix: match[1], number: Number.parseInt(match[2], 10) };
}

/**
 * Forma canônica de um ID para comparação de identidade. **Não muda com o
 * projeto** (`ADR-0011`): é chave interna, e mudá-la mudaria a identidade de
 * todo item já registrado. `ADR-001`, `ADR-0001` e `ADR001` são a mesma coisa.
 */
export function canonicalId(parsed: { prefix: string; number: number }): string {
  return `${parsed.prefix}-${String(parsed.number).padStart(CANONICAL_PADDING, '0')}`;
}

/**
 * A única função que escreve um ID (`RN-0024`). Nenhum check monta ID por
 * concatenação: formato montado à mão em dois lugares diverge no primeiro
 * projeto que declarar outra forma.
 */
export function writeId(prefix: string, number: number, format: IdFormat = DEFAULT_ID_FORMAT): string {
  return `${prefix}${format.separator}${String(number).padStart(format.padding, '0')}`;
}
```

- [ ] **Step 4: Implementar em `src/ids/citations.ts`**

Troque a constante `CITATION` e a assinatura de `findCitations`:

```typescript
import { DEFAULT_ID_FORMAT, idPatternSource } from '../docs/schema.ts';
import type { IdFormat } from '../docs/schema.ts';

/**
 * Sintaxe de citação do projeto (spec §8, `ADR-0011`): a forma escrita declarada
 * em `id-format`, com o padrão `<PREFIXO>-<número>`.
 *
 * Derivada de `idPatternSource` — uma fonte, não duas cópias que se pedem para
 * mudar juntas. Um match com prefixo não declarado (uma referência a "ISO-8601",
 * por exemplo) é inofensivo: `ci2-ids.ts` só resolve citações cujo prefixo está
 * em `known`, e os demais são ignorados em silêncio.
 *
 * Global e sem âncoras de propósito: varre texto livre em busca de várias
 * citações por linha.
 */
export function citationPattern(format: IdFormat = DEFAULT_ID_FORMAT): RegExp {
  return new RegExp(`\\b${idPatternSource(format)}\\b`, 'g');
}

export function findCitations(source: string, format: IdFormat = DEFAULT_ID_FORMAT): Citation[] {
  const pattern = citationPattern(format);
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const citations: Citation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    for (const match of line.matchAll(pattern)) {
      citations.push({ id: match[0], line: i + 1 });
    }
  }

  return citations;
}
```

- [ ] **Step 5: Implementar `id-format` em `src/config/ownership.ts`**

Acrescente o import, a função de leitura, o campo da interface e a linha do
retorno:

```typescript
import { DEFAULT_ID_FORMAT, PADDING_RANGE, SEPARATORS_ALLOWED } from '../docs/schema.ts';
import type { IdFormat } from '../docs/schema.ts';

/**
 * A forma escrita dos IDs deste projeto (`ADR-0011`, `RN-0024`). Ausente, é a
 * do toolkit — e o padrão existe para que nenhum repositório já instalado
 * precise declarar nada.
 */
function parseIdFormat(raw: unknown): IdFormat {
  if (raw === undefined || raw === null) return DEFAULT_ID_FORMAT;
  const item = asRecord(raw, 'id-format');

  const separator = item.separator ?? DEFAULT_ID_FORMAT.separator;
  if (typeof separator !== 'string' || !SEPARATORS_ALLOWED.includes(separator)) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: id-format.separator "${String(separator)}" não é aceito. ` +
        `Válidos: ${SEPARATORS_ALLOWED.map((value) => `"${value}"`).join(', ')} (ADR-0011).`,
    );
  }

  const padding = item.padding ?? DEFAULT_ID_FORMAT.padding;
  if (
    typeof padding !== 'number' ||
    !Number.isInteger(padding) ||
    padding < PADDING_RANGE.min ||
    padding > PADDING_RANGE.max
  ) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: id-format.padding "${String(padding)}" precisa ser inteiro entre ` +
        `${PADDING_RANGE.min} e ${PADDING_RANGE.max} (ADR-0011).`,
    );
  }

  return { separator, padding };
}
```

Na interface `OwnershipConfig`, logo depois de `staleAfterMonths`:

```typescript
  /** A forma escrita dos IDs deste projeto (`ADR-0011`). Nunca a identidade. */
  idFormat: IdFormat;
```

E no objeto que `parseOwnership` devolve, logo depois de `staleAfterMonths`:

```typescript
    idFormat: parseIdFormat(root['id-format']),
```

- [ ] **Step 6: Escrever o teste de configuração e o de citação**

Acrescente a `test/config/ownership.test.ts`:

```typescript
test('RN-0024: id-format ausente é a forma do toolkit', () => {
  const config = parseOwnership(MINIMO);
  assert.deepEqual(config.idFormat, { separator: '-', padding: 4 });
});

test('RN-0024: id-format declarado é lido, e o inválido é erro e não padrão silencioso', () => {
  const config = parseOwnership(`${MINIMO}\nid-format:\n  separator: ""\n  padding: 3\n`);
  assert.deepEqual(config.idFormat, { separator: '', padding: 3 });

  assert.throws(
    () => parseOwnership(`${MINIMO}\nid-format:\n  separator: "~"\n`),
    /separator "~" não é aceito/,
  );
  assert.throws(() => parseOwnership(`${MINIMO}\nid-format:\n  padding: 9\n`), /padding "9"/);
});
```

`MINIMO` é a configuração mínima que o arquivo de teste já usa; se ela não
existir como constante, extraia-a das que já estão lá — não escreva uma nova.

Acrescente a `test/ids/citations.test.ts`:

```typescript
test('RN-0024: findCitations reconhece a forma declarada pelo projeto', () => {
  const texto = 'A RN009 diz, e a RN-0009 não é citação neste projeto.';
  const achadas = findCitations(texto, { separator: '', padding: 3 }).map((c) => c.id);
  assert.deepEqual(achadas, ['RN009']);
});

test('RN-0024: sem formato declarado, a varredura é a de sempre', () => {
  const achadas = findCitations('cita ADR-0001 e DA-007').map((c) => c.id);
  assert.deepEqual(achadas, ['ADR-0001', 'DA-007']);
});
```

- [ ] **Step 7: Rodar tudo e ver passar**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Esperado: todos os testes passam, incluindo os que já existiam — o padrão desta
task é literalmente o comportamento de antes.

- [ ] **Step 8: Entrada de CHANGELOG e commit**

`src/config/ownership.ts` é caminho visível ao consumidor. Acrescente sob
`## [Unreleased]`, na subseção `### Added` de `CHANGELOG.md`:

```markdown
- `id-format` em `docs/.ownership.yml`: um projeto declara como seus IDs se escrevem (`separator`, `padding`). Ausente, a forma continua sendo `<PREFIXO>-<4 dígitos>`.
```

```bash
git add src/docs/schema.ts src/ids/citations.ts src/config/ownership.ts \
        test/docs/schema.test.ts test/ids/citations.test.ts test/config/ownership.test.ts CHANGELOG.md
git commit -m "feat(RN-0024, ADR-0011): separa a forma escrita do ID da identidade dele"
```

---

### Task 4: A forma escrita atravessa parsers, checks e hooks

**Objetivo:** Ligar `config.idFormat` a todo lugar que lê ou escreve ID, e apagar
os três vazamentos de formato que sobraram: o regex de título de seção, a
montagem de ID do `CI-2` e as mensagens de correção do `CI-1`. Ao fim desta
task, **nenhum check monta um ID por concatenação** — critério de aceite 2.

**Files:**
- Modify: `src/docs/sections.ts` (o `HEADING` passa a ser derivado do formato)
- Modify: `src/docs/table.ts` (`parseItemTable` recebe o formato)
- Modify: `src/docs/collect.ts` (repassa `config.idFormat` aos dois parsers)
- Modify: `src/ids/coverage.ts` (`scanCitations` recebe o formato)
- Modify: `src/checks/ci1-structure.ts` (`parseId` com formato; correções via `writeId`)
- Modify: `src/checks/ci2-ids.ts` (`key`, citações e a mensagem de buraco de sequência)
- Modify: `src/checks/ci3-traceability.ts` (citações e canonização com formato)
- Modify: `src/hooks/hk3-state-promotion.ts` (repassa o formato aos parsers)
- Modify: `src/hooks/hk7-shortcut-debt.ts` (a citação de dívida deixa de exigir hífen)
- Test: `test/docs/sections.test.ts`, `test/docs/table.test.ts` (casos com outra forma)
- Test: `test/checks/ci2-ids.test.ts` (a mensagem de buraco usa a forma do projeto)
- Test: `test/acceptance/id-format.test.ts` (novo — o critério de aceite 2 inteiro)

**Interfaces:**
- Consome: `IdFormat`, `parseId`, `writeId`, `idPatternSource`,
  `findCitations`, `citationPattern`, `OwnershipConfig.idFormat` (Task 3).
- Produz:
  - `parseItemTable(source, startLine, format?)`
  - `parseItemSections(source, startLine, format?)`
  - `scanCitations(root, globs, format?)`
  - Nenhuma outra assinatura pública muda.

**Requisitos:**
- Todo check lê o formato de `context.config.idFormat`. Nenhum check recebe
  `IdFormat` por outro caminho, e nenhum usa o padrão implícito: o padrão existe
  para as funções, não para os checks.
- `src/hooks/hk7-shortcut-debt.ts` **continua sem ler o `.ownership.yml`**. Ele
  reconhece a citação de dívida em qualquer forma escrita (`/\bTDR-?\d{2,}\b/`),
  porque marcador de atalho é sintaxe de linguagem e não caminho de projeto — a
  razão que o comentário do arquivo já dá continua valendo.
- `src/docs/sections.ts` monta o `HEADING` a partir de `idPatternSource`, com o
  ID inteiro num grupo externo. A numeração dos grupos passa a ser: 1 o ID, 2 o
  prefixo, 3 o número, 4 o título.
- A mensagem de buraco de sequência do `CI-2` passa por `writeId`. É o único
  lugar do toolkit que montava ID à mão, e é o teste do critério 2.
- Comportamento com a forma padrão é **idêntico** ao de antes. Os testes que já
  existem são a rede: nenhum deles é editado para passar.

**`HK-5`:** vai pedir `docs/requirements/rules.md` (`src/checks/**`,
`src/hooks/**`). A resposta: `RN-0024` viajou na Task 2.

- [ ] **Step 1: Escrever o teste de aceite que falha**

Crie `test/acceptance/id-format.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, mkdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runValidate } from '../../src/cli/validate.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const CONFIG = `
version: 1
id-format:
  separator: ""
  padding: 3
artifacts:
  - id-prefix: RN
    path: docs/rules.md
    owner: "@time"
    skill: requirements-keeper
    collection: sections
    cited-by: ["test/**"]
documents:
  - path: docs/.ownership.yml
    owner: "@time"
    skill: living-docs-bootstrap
`;

const CODEOWNERS = 'docs/rules.md    @time\ndocs/.ownership.yml    @time\n';

function regras(ids: readonly string[]): string {
  return [
    '---',
    'title: Regras',
    'owner: "@time"',
    'trigger: A toda regra nova ou alterada.',
    'last-reviewed: 2026-08-28',
    '---',
    '',
    '# Regras',
    '',
    ...ids.flatMap((id) => [`## ${id} — Uma regra`, '', '- **status:** active', '']),
  ].join('\n');
}

function arvore(ids: readonly string[]): Record<string, string> {
  return {
    [OWNERSHIP_PATH]: CONFIG,
    CODEOWNERS,
    'docs/rules.md': regras(ids),
    'test/regras.test.ts': ids.map((id) => `// cobre ${id}`).join('\n') + '\n',
  };
}

test('critério 2: identidade, duplicata, sequência e citação funcionam na forma do projeto', () => {
  withTempRepo(arvore(['RN001', 'RN002', 'RN003']), (root) => {
    const result = runValidate(root);
    assert.deepEqual(result.findings, [], JSON.stringify(result.findings, null, 2));
  });
});

test('critério 2: duplicata é detectada mesmo escrita com padding diferente', () => {
  withTempRepo(arvore(['RN001', 'RN01']), (root) => {
    const result = runValidate(root);
    const duplicata = result.findings.find((f) => f.ruleId === 'CI-2' && /duplicad/.test(f.message));
    assert.ok(duplicata, JSON.stringify(result.findings, null, 2));
  });
});

test('critério 2: o buraco de sequência é relatado na forma escrita do projeto', () => {
  withTempRepo(arvore(['RN001', 'RN003']), (root) => {
    const result = runValidate(root);
    const buraco = result.findings.find((f) => f.ruleId === 'CI-2' && /buraco/.test(f.message));
    assert.ok(buraco, JSON.stringify(result.findings, null, 2));
    assert.match(buraco.message, /RN002/, 'o ID sugerido precisa vir na forma do projeto');
    assert.doesNotMatch(buraco.message, /RN-0002/, 'nenhum check monta ID por concatenação');
  });
});

test('critério 2: citação que não resolve continua reprovando na forma do projeto', () => {
  const arvoreComCitacao = arvore(['RN001']);
  arvoreComCitacao['docs/rules.md'] += '\nO enunciado cita RN042, que não existe.\n';

  withTempRepo(arvoreComCitacao, (root) => {
    const result = runValidate(root);
    const citacao = result.findings.find((f) => f.ruleId === 'CI-2' && /RN042/.test(f.message));
    assert.ok(citacao, JSON.stringify(result.findings, null, 2));
  });
});

test('RN-0024: nenhum arquivo de check monta um ID por concatenação', () => {
  const suspeito = /\$\{[A-Za-z.]*[Pp]refix\}[-_.:]?\$\{/;
  for (const file of ['ci1-structure.ts', 'ci2-ids.ts', 'ci3-traceability.ts']) {
    const source = readFileSync(join(process.cwd(), 'src/checks', file), 'utf8');
    assert.doesNotMatch(source, suspeito, `${file} monta ID à mão — use writeId (RN-0024)`);
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="critério 2"
```

Esperado: FALHA — os títulos `## RN001` não são reconhecidos pelo `HEADING` de
`src/docs/sections.ts`, então o documento não tem item nenhum.

- [ ] **Step 3: `src/docs/sections.ts` — o título deriva do formato**

Troque a constante `HEADING` por uma função e ajuste os índices dos grupos:

```typescript
import { DEFAULT_ID_FORMAT, idPatternSource, parseId } from './schema.ts';
import type { IdFormat } from './schema.ts';

/**
 * Grupos: 1 é o ID inteiro, 2 o prefixo, 3 o número, 4 o título.
 * O padrão do ID vem de `idPatternSource` (`ADR-0011`) — um projeto que escreve
 * `## RN001` é lido sem que nenhum arquivo dele mude.
 */
function headingPattern(format: IdFormat): RegExp {
  return new RegExp(`^#{2,4}\\s+(${idPatternSource(format)})\\s*(?:[—–-]\\s*(.*))?$`);
}

export function parseItemSections(
  source: string,
  startLine: number,
  format: IdFormat = DEFAULT_ID_FORMAT,
): DocItem[] {
  const HEADING = headingPattern(format);
  // … o corpo continua igual, com dois ajustes:
  //   const heading = HEADING.exec((lines[i] ?? '').trim());
  //   if (!heading?.[1] || !parseId(heading[1], format)) continue;
  //   … e o título passa a ser heading[4] em vez de heading[2]:
  //   if (heading[4] !== undefined && heading[4].trim() !== '') fields.title = heading[4].trim();
}
```

Aplique os três ajustes no corpo existente; não reescreva a função inteira. O
`break` interno que testa `HEADING.test(line)` continua valendo — ele agora usa
o padrão do projeto.

- [ ] **Step 4: `src/docs/table.ts` e `src/docs/collect.ts`**

Em `src/docs/table.ts`:

```typescript
export function parseItemTable(
  source: string,
  startLine: number,
  format: IdFormat = DEFAULT_ID_FORMAT,
): DocItem[] {
  // … no laço de linhas, a única mudança:
  //   if (!parseId(id, format)) continue;
}
```

Em `src/docs/collect.ts`, `parseItems` passa a receber o formato:

```typescript
function parseItems(
  rule: ArtifactRule,
  source: string,
  body: string | null,
  bodyStart: number,
  format: IdFormat,
): DocItem[] {
  const text = body ?? source;
  const start = body === null ? 1 : bodyStart;
  if (rule.collection === 'table') return parseItemTable(text, start, format);
  if (rule.collection === 'sections') return parseItemSections(text, start, format);
  return [];
}
```

`readDoc` ganha um parâmetro `format: IdFormat` e o repassa; `collectArtifacts`
passa `config.idFormat`.

- [ ] **Step 5: `src/ids/coverage.ts`**

```typescript
export function scanCitations(
  root: string,
  globs: readonly string[],
  format: IdFormat = DEFAULT_ID_FORMAT,
): Map<string, CitationSite[]> {
  // … a única mudança: findCitations(content, format)
}
```

- [ ] **Step 6: Os três checks**

`src/checks/ci1-structure.ts`:

```typescript
import { writeId } from '../docs/schema.ts';

// dentro do check, onde hoje está `parseId(data.id)`:
const format = context.config.idFormat;
const parsed = parseId(data.id, format);

// e as duas correções que montavam ID à mão:
`Use ${writeId(doc.rule.idPrefix, 1, format)} (spec §8).`

`Renomeie para o território de ${doc.rule.idPrefix} (ex.: ${writeId(doc.rule.idPrefix, 1, format)}) ` +
  'ou mova o arquivo para o artefato dono.'
```

`src/checks/ci2-ids.ts`:

```typescript
import { canonicalId, parseId, writeId } from '../docs/schema.ts';
import type { IdFormat } from '../docs/schema.ts';

function key(id: string, format: IdFormat): string {
  const parsed = parseId(id, format);
  return parsed ? canonicalId(parsed) : id;
}

// `collectDeclarations` recebe o formato e usa `parseId(id, format)`.
// No corpo do check:
const format = context.config.idFormat;
const retired = new Set([...loadRetiredIds(context.root)].map((id) => key(id, format)));
// … e a mensagem do buraco de sequência:
const missing = writeId(prefix, n, format);
// … e as citações:
for (const citation of findCitations(doc.source, format)) {
  const parsed = parseId(citation.id, format);
  …
}
```

`src/checks/ci3-traceability.ts`: todo `parseId(x)` vira `parseId(x, format)`,
todo `findCitations(x)` vira `findCitations(x, format)`, e a chamada de
`scanCitations(context.root, entry.rule.citedBy)` vira
`scanCitations(context.root, entry.rule.citedBy, format)`, com
`const format = context.config.idFormat` no topo do `run`.

- [ ] **Step 7: Os dois hooks**

`src/hooks/hk3-state-promotion.ts` — guarde a configuração para ter o formato:

```typescript
  let config;
  try {
    config = loadOwnership(env.root);
  } catch {
    return ALLOW; // falha aberta
  }
  const rule = findArtifactRule(config, repoPath);
  if (!rule) return ALLOW;
  // … e `findPromotion(current, next, rule, config.idFormat)`, que repassa o
  // formato aos dois parsers.
```

`src/hooks/hk7-shortcut-debt.ts` — a citação de dívida deixa de exigir hífen:

```typescript
/**
 * Citação de dívida, em qualquer forma escrita (`ADR-0011`). Este hook continua
 * sem ler o `.ownership.yml` de propósito: marcador de atalho é sintaxe da
 * linguagem, não caminho de projeto — e reconhecer `TDR001` e `TDR-0001` não
 * exige configuração nenhuma.
 */
const DEBT = /\bTDR-?\d{2,}\b/;
```

- [ ] **Step 8: Rodar tudo**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Esperado: tudo passa, incluindo `test/acceptance/id-format.test.ts`. Se algum
teste antigo quebrou, a mudança quebrou comportamento na forma padrão — conserte
o código, **não** o teste.

- [ ] **Step 9: Commit**

```bash
git add src/docs/sections.ts src/docs/table.ts src/docs/collect.ts src/ids/coverage.ts \
        src/checks/ci1-structure.ts src/checks/ci2-ids.ts src/checks/ci3-traceability.ts \
        src/hooks/hk3-state-promotion.ts src/hooks/hk7-shortcut-debt.ts \
        test/acceptance/id-format.test.ts test/docs/sections.test.ts test/docs/table.test.ts \
        test/checks/ci2-ids.test.ts
git commit -m "feat(RN-0024, ADR-0011): parsers, checks e hooks leem a forma escrita do projeto

Changelog: none — o comportamento na forma padrão é idêntico; a chave nova já foi anunciada"
```

---

### Task 5: O inventário relata a forma detectada

**Objetivo:** `RF-0014` e o critério de aceite 1. O `init` passa a varrer os
caminhos que vai adotar, relatar a forma escrita que encontrou e quantos itens
leu nela, e a escrever o bloco `id-format` no `.ownership.yml` a partir do que
quem instala declarou. Nenhum arquivo do repositório é alterado para que ele seja
adotado.

**Files:**
- Create: `src/ids/detect.ts`
- Create: `test/ids/detect.test.ts`
- Modify: `src/cli/init.ts` (`InitOptions.idFormat`, `InitResult.detected`)
- Modify: `src/cli/index.ts` (`--id-separator`, `--id-padding`, a linha de relato)
- Modify: `templates/ownership.yml` (bloco `id-format`)
- Modify: `plugin/skills/living-docs-bootstrap/SKILL.md` (passo 1 e checklist)
- Modify: `test/cli/init.test.ts` (o `InitOptions` novo)
- Modify: `test/acceptance/spec-criteria.test.ts` (critério 1 ganha a metade da forma)

**Interfaces:**
- Consome: `IdFormat`, `DEFAULT_ID_FORMAT` (Task 3); `listFiles`, `readTextFile`.
- Produz:
  - `detectIdFormat(root, paths): DetectedFormat | null`
  - `DetectedFormat { format: IdFormat; count: number; sample: string }`
  - `InitOptions.idFormat: IdFormat`
  - `InitResult.detected: DetectedFormat | null`

**Requisitos:**
- A varredura é **permissiva de propósito**: ela procura `<2 a 4 maiúsculas>`,
  separador opcional, `2 a 6 dígitos` — porque a pergunta é "que forma este
  repositório usa?", e um detector que já soubesse a resposta não detectaria
  nada.
- A varredura olha só os caminhos que o `init` resolveu (adotados ou padrão), não
  o repositório inteiro. Detectar formato no `node_modules` é ruído.
- `detectIdFormat` devolve a forma **dominante** e quantos itens leu nela.
  Empate resolve pela primeira em ordem de aparição — e o relato traz o exemplo,
  que é o que uma pessoa usa para decidir.
- O `init` relata quando a forma detectada difere da declarada. Igual, cala: não
  há nada a confirmar.
- O `init` **não** converte nem reescreve nada. `RF-0014` fora de escopo.
- `--id-separator ""` é um valor válido, não uma flag ausente.

**`HK-5`:** vai pedir `docs/requirements/functional.md` (`src/cli/**`) e
`CHANGELOG.md` (`src/cli/**`, `templates/**`, `plugin/**` são consumer-visible).
A resposta: `RF-0014` viajou na Task 2; o CHANGELOG entra no Step 7.

- [ ] **Step 1: Escrever o teste que falha — a detecção**

Crie `test/ids/detect.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { detectIdFormat } from '../../src/ids/detect.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const SEM_HIFEN = [
  '# Regras',
  '',
  '## RN001 — Uma regra',
  '- **status:** active',
  '',
  '## RN002 — Outra',
  '- **status:** active',
  '',
  '## RN003 — Mais uma',
  '- **status:** active',
  '',
].join('\n');

test('RF-0014: a varredura relata a forma dominante e quantos itens leu nela', () => {
  withTempRepo({ 'docs/business-rules.md': SEM_HIFEN }, (root) => {
    const detected = detectIdFormat(root, ['docs/business-rules.md']);
    assert.ok(detected);
    assert.deepEqual(detected.format, { separator: '', padding: 3 });
    assert.equal(detected.count, 3);
    assert.equal(detected.sample, 'RN001');
  });
});

test('RF-0014: repositório sem ID nenhum não inventa forma', () => {
  withTempRepo({ 'docs/vazio.md': '# nada aqui\n' }, (root) => {
    assert.equal(detectIdFormat(root, ['docs/vazio.md']), null);
  });
});

test('RF-0014: a forma padrão é detectada como padrão', () => {
  withTempRepo({ 'docs/adr/ADR-0001-x.md': '---\nid: ADR-0001\n---\n\n# ADR-0001\n' }, (root) => {
    const detected = detectIdFormat(root, ['docs/adr/']);
    assert.ok(detected);
    assert.deepEqual(detected.format, { separator: '-', padding: 4 });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RF-0014"
```

Esperado: FALHA — `Cannot find module '../../src/ids/detect.ts'`.

- [ ] **Step 3: Implementar `src/ids/detect.ts`**

```typescript
import { listFiles, readTextFile } from '../core/files.ts';
import { PADDING_RANGE, SEPARATORS_ALLOWED } from '../docs/schema.ts';
import type { IdFormat } from '../docs/schema.ts';

export interface DetectedFormat {
  format: IdFormat;
  /** Quantas ocorrências foram lidas nessa forma. */
  count: number;
  /** Uma ocorrência real, para quem instala reconhecer o que o toolkit viu. */
  sample: string;
}

/**
 * Varredura deliberadamente permissiva: prefixo de 2 a 4 maiúsculas, separador
 * opcional de um caractere, 2 a 6 dígitos. A pergunta é "que forma este
 * repositório usa?", e um detector que já soubesse a resposta não detectaria
 * nada (`RF-0014`).
 */
const ANY_ID = /\b([A-Z]{2,4})([-_.:]?)(\d{2,6})\b/g;

function keyOf(separator: string, digits: number): string {
  return `${separator}|${digits}`;
}

/**
 * A forma escrita dominante nos caminhos dados, ou `null` quando não há ID
 * nenhum. Só os caminhos que o `init` resolveu entram: detectar formato no
 * repositório inteiro é ruído, não inventário.
 */
export function detectIdFormat(root: string, paths: readonly string[]): DetectedFormat | null {
  const globs = paths.map((path) => (path.endsWith('/') ? `${path}**` : path));
  const tallies = new Map<string, { format: IdFormat; count: number; sample: string }>();

  for (const file of listFiles(root, globs)) {
    const content = readTextFile(root, file);
    if (content === null) continue;

    for (const match of content.matchAll(ANY_ID)) {
      const separator = match[2] ?? '';
      const digits = (match[3] ?? '').length;
      if (!SEPARATORS_ALLOWED.includes(separator)) continue;
      if (digits < PADDING_RANGE.min || digits > PADDING_RANGE.max) continue;

      const key = keyOf(separator, digits);
      const tally = tallies.get(key);
      if (tally) {
        tally.count += 1;
        continue;
      }
      tallies.set(key, { format: { separator, padding: digits }, count: 1, sample: match[0] });
    }
  }

  let winner: DetectedFormat | null = null;
  for (const tally of tallies.values()) {
    if (winner === null || tally.count > winner.count) winner = tally;
  }
  return winner;
}
```

- [ ] **Step 4: Ligar ao `init`**

Em `src/cli/init.ts`:

```typescript
import { detectIdFormat } from '../ids/detect.ts';
import type { DetectedFormat } from '../ids/detect.ts';
import { DEFAULT_ID_FORMAT } from '../docs/schema.ts';
import type { IdFormat } from '../docs/schema.ts';

export interface InitOptions {
  owner: string;
  dryRun: boolean;
  stage: Stage;
  /** A forma escrita declarada por quem instala (`ADR-0011`). */
  idFormat: IdFormat;
}

export interface InitResult {
  // … os campos que já existem
  /** A forma escrita que o inventário achou, quando difere da declarada (`RF-0014`). */
  detected: DetectedFormat | null;
}
```

Dentro de `runInit`, depois de resolver `paths` e antes de escrever qualquer
arquivo:

```typescript
  // Relatar, nunca adotar em silêncio (`RF-0014`): adoção silenciosa de formato
  // é a mesma classe de erro que adoção silenciosa de caminho.
  const detected = detectIdFormat(root, Object.values(paths));
  result.detected =
    detected !== null &&
    (detected.format.separator !== options.idFormat.separator ||
      detected.format.padding !== options.idFormat.padding)
      ? detected
      : null;
```

E nos `values` do template:

```typescript
    ID_SEPARATOR: options.idFormat.separator,
    ID_PADDING: String(options.idFormat.padding),
```

- [ ] **Step 5: O bloco no template e as flags no CLI**

Em `templates/ownership.yml`, logo depois de `stale-after-months: 6`:

```yaml

# A forma escrita de um ID neste projeto (ADR-0011). A identidade NÃO depende
# dela: `RN009` e `RN-0009` são o mesmo item. Mude isto para adotar um
# repositório cujos IDs já se escrevem de outro jeito — nunca renumere o
# repositório para caber no padrão.
id-format:
  separator: "{{ID_SEPARATOR}}"
  padding: {{ID_PADDING}}
```

Em `src/cli/index.ts`, na leitura das opções de `init`:

```typescript
      const separatorIndex = argv.indexOf('--id-separator');
      const separator = separatorIndex === -1 ? DEFAULT_ID_FORMAT.separator : (argv[separatorIndex + 1] ?? '');
      const paddingIndex = argv.indexOf('--id-padding');
      const padding =
        paddingIndex === -1 ? DEFAULT_ID_FORMAT.padding : Number.parseInt(argv[paddingIndex + 1] ?? '', 10);
      if (!SEPARATORS_ALLOWED.includes(separator) || !Number.isInteger(padding)) {
        process.stderr.write(
          `living-docs: forma de ID inválida. --id-separator aceita ${SEPARATORS_ALLOWED.map((s) => `"${s}"`).join(', ')} ` +
            `e --id-padding um inteiro entre ${PADDING_RANGE.min} e ${PADDING_RANGE.max} (ADR-0011).\n`,
        );
        return 2;
      }
```

E, na saída, depois das linhas `adotado`:

```typescript
      if (result.detected !== null) {
        const { format, count, sample } = result.detected;
        process.stdout.write(
          `formato   ${sample}  (${count} ocorrência(s) nesta forma) — o repositório escreve IDs de outro jeito.\n` +
            `          Para adotá-la: --id-separator "${format.separator}" --id-padding ${format.padding}. ` +
            'Nenhum arquivo foi alterado (RF-0014).\n',
        );
      }
```

Acrescente as duas opções ao texto de `USAGE`:

```
  --id-separator <s>  Separador do ID: "-" (padrão), "_", ".", ":" ou "" (vazio)
  --id-padding <n>    Dígitos do ID: 4 (padrão), entre 2 e 6
```

- [ ] **Step 6: O teste do critério 1**

Acrescente a `test/acceptance/spec-criteria.test.ts` (e atualize a constante
`OPTIONS` do arquivo para incluir `idFormat: DEFAULT_ID_FORMAT`):

```typescript
test('critério 1 (fechamento): o inventário relata a forma detectada e não toca em arquivo nenhum', () => {
  const preexistente = [
    '---',
    'title: Regras',
    'owner: "@time"',
    'trigger: A toda regra nova ou alterada.',
    'last-reviewed: 2026-08-28',
    '---',
    '',
    '## RN001 — Uma regra',
    '- **status:** active',
    '',
    '## RN002 — Outra',
    '- **status:** active',
    '',
  ].join('\n');

  withTempRepo({ 'docs/business-rules.md': preexistente }, (root) => {
    const antes = readFileSync(join(root, 'docs/business-rules.md'), 'utf8');

    const result = runInit(root, { ...OPTIONS, stage: 'small-team', dryRun: true });

    assert.ok(result.adopted.some((entry) => entry.path === 'docs/business-rules.md'));
    assert.ok(result.detected, 'a forma detectada precisa ser relatada');
    assert.deepEqual(result.detected.format, { separator: '', padding: 3 });
    assert.ok(result.detected.count >= 2);
    assert.equal(readFileSync(join(root, 'docs/business-rules.md'), 'utf8'), antes);
  });
});
```

- [ ] **Step 7: A `SK-0` para de adotar formato em silêncio**

Em `plugin/skills/living-docs-bootstrap/SKILL.md`, no passo 1, depois da frase
sobre as linhas `adotado`, acrescente:

```markdown
   Leia também a linha `formato`: quando o repositório escreve IDs de outro
   jeito (`RN001` em vez de `RN-0009`), o inventário diz qual forma achou e
   quantas ocorrências leu nela. **Confirme com quem é dono do repositório** e
   declare com `--id-separator` e `--id-padding` — nunca renumere o que já
   existe para caber no padrão do toolkit (`ADR-0011`, `RF-0014`).
```

E no checklist, depois da linha de `ids-retired.txt`:

```markdown
- [ ] A forma escrita dos IDs foi confirmada com quem é dono do repositório, e nenhum ID preexistente foi reescrito — verificação humana
```

- [ ] **Step 8: Rodar, anotar o CHANGELOG e commitar**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Em `CHANGELOG.md`, sob `### Added`:

```markdown
- `living-docs init --id-separator <s> --id-padding <n>`: declara a forma escrita dos IDs do projeto. `--dry-run` relata a forma que o repositório já usa, sem alterar arquivo nenhum.
```

```bash
git add src/ids/detect.ts test/ids/detect.test.ts src/cli/init.ts src/cli/index.ts \
        templates/ownership.yml plugin/skills/living-docs-bootstrap/SKILL.md \
        test/cli/init.test.ts test/acceptance/spec-criteria.test.ts CHANGELOG.md
git commit -m "feat(RF-0014, ADR-0011): o inventário relata a forma escrita dos IDs"
```

---

### Task 6: O workflow de CI instalado, e o enforcement entra em `watches`

**Objetivo:** `L-1` metade 1 e `L-9`. O `init` passa a escrever um workflow de CI
parametrizado pelo modo de invocação — sem impor Docker a quem instala —, e o
enforcement deste repositório passa a ter doc dono vigiado e a contar como
visível a quem consome, porque é literalmente o que o consumidor instala.

**Files:**
- Create: `templates/workflow.yml`
- Create: `test/cli/init-enforcement.test.ts`
- Modify: `src/cli/init.ts` (`STAGE_PHASES`, `InitOptions.invoke`, escrita do workflow)
- Modify: `src/cli/index.ts` (`--invoke`, `USAGE`)
- Modify: `docs/.ownership.yml` (duas regras de `watches` e um `consumer-visible-paths`)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consome: `writeIfAbsent`, `template`, `InitResult` (Task 5).
- Produz:
  - `WORKFLOW_PATH = '.github/workflows/living-docs.yml'`
  - `STAGE_PHASES: Readonly<Record<Stage, readonly number[]>>`
  - `InitOptions.invoke: string`

**Requisitos:**
- **O workflow instalado não menciona Docker.** `RNF-0002` é regra deste
  toolkit, não de quem o usa. O comando vem de `--invoke` e o padrão é
  `npx living-docs`.
- O template cita `DA-0003` no cabeçalho: como o toolkit chega ao CI do
  consumidor é decisão aberta, e é por isso que o modo de invocação é parâmetro.
- Mesclagem: o arquivo só é escrito se **não existir**. Um consumidor com
  workflows próprios mantém todos — o toolkit acrescenta um arquivo, nunca
  reescreve os que estão lá. Rodar duas vezes reporta `mantido`.
- Os passos são os das fases do estágio (`RN-0025`, `ADR-0012`): `validate`
  sempre; `drift` e `changelog --base` a partir de `production`. O passo de
  `validate --base` chega na Task 8, com o estágio que o pede.
- `.github/workflows/**` entra em `watches` **e** em `consumer-visible-paths`. As
  duas listas precisam continuar idênticas — `test/docs/release-history.test.ts`
  reprova se derivarem.

**`HK-5`:** vai pedir `docs/requirements/functional.md` (`src/cli/**`),
`CHANGELOG.md` (`src/cli/**`, `templates/**`) e, a partir desta task,
`docs/definition-of-done.md` para quem tocar `.github/workflows/**`. A resposta:
`RF-0013` viajou na Task 2 e o CHANGELOG entra no Step 8.

- [ ] **Step 1: Escrever o teste que falha**

Crie `test/cli/init-enforcement.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInit } from '../../src/cli/init.ts';
import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const OPTIONS = {
  owner: '@time',
  dryRun: false,
  stage: 'production' as const,
  idFormat: DEFAULT_ID_FORMAT,
  invoke: 'npx living-docs',
};

const WORKFLOW = '.github/workflows/living-docs.yml';

test('RF-0013: o init escreve o workflow de CI do estágio', () => {
  withTempRepo({}, (root) => {
    const result = runInit(root, OPTIONS);

    assert.ok(result.created.includes(WORKFLOW), JSON.stringify(result.created, null, 2));
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8');
    assert.match(yaml, /npx living-docs validate/);
    assert.match(yaml, /npx living-docs drift/);
    assert.match(yaml, /npx living-docs changelog --base/);
  });
});

test('RF-0013: o workflow instalado não impõe Docker a quem instala', () => {
  withTempRepo({}, (root) => {
    runInit(root, OPTIONS);
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8');
    assert.doesNotMatch(yaml, /docker/i, 'RNF-0002 é regra deste toolkit, não do consumidor');
  });
});

test('RN-0025: o estágio solo instala validate e nada além', () => {
  withTempRepo({}, (root) => {
    runInit(root, { ...OPTIONS, stage: 'solo' });
    const yaml = readFileSync(join(root, WORKFLOW), 'utf8');
    assert.match(yaml, /living-docs validate/);
    assert.doesNotMatch(yaml, /living-docs drift/);
    assert.doesNotMatch(yaml, /living-docs changelog/);
  });
});

test('RF-0013: workflow preexistente é mantido, e rodar duas vezes não duplica', () => {
  const meu = 'name: meu-ci\non:\n  push:\n';
  withTempRepo({ '.github/workflows/ci.yml': meu }, (root) => {
    runInit(root, OPTIONS);
    assert.equal(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8'), meu);

    const depois = readFileSync(join(root, WORKFLOW), 'utf8');
    const segunda = runInit(root, OPTIONS);
    assert.ok(segunda.skipped.includes(WORKFLOW));
    assert.equal(readFileSync(join(root, WORKFLOW), 'utf8'), depois);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RF-0013"
```

Esperado: FALHA — o `init` não conhece `invoke` e não escreve workflow nenhum.

- [ ] **Step 3: Escrever `templates/workflow.yml`**

```yaml
# Enforcement de documentação viva, instalado por `living-docs init`.
#
# O modo de invocação é parâmetro de quem instala (`--invoke`): o toolkit roda em
# container no repositório dele, e impor isso a quem o instala seria transformar
# regra do toolkit em regra do consumidor. Como o toolkit chega a este CI é
# decisão aberta — `DA-0003` no repositório do toolkit.
#
# Este arquivo é seu: o `init` só o cria quando ele não existe, e nunca o
# reescreve.
name: living-docs

on:
  push:
  pull_request:

jobs:
  living-docs:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          # O diff do PR compara <base>...HEAD, e um clone raso não tem a base.
          fetch-depth: 0

      - name: CI-1 a CI-4, CI-7 e CI-8 — estado da árvore
        run: {{INVOKE}} validate
{{WORKFLOW_STEPS}}
```

- [ ] **Step 4: Implementar no `init`**

Em `src/cli/init.ts`:

```typescript
/** Onde o workflow instalado mora no repositório de quem instala. */
export const WORKFLOW_PATH = '.github/workflows/living-docs.yml';

/**
 * As fases da spec §10 que cada estágio instala. É daqui que sai o conjunto de
 * enforcement do estágio — nem mais, nem menos (`RN-0025`, `ADR-0012`).
 */
const STAGE_PHASES: Readonly<Record<Stage, readonly number[]>> = Object.freeze({
  solo: [0, 1],
  'small-team': [0, 1, 2, 3, 4],
  production: [0, 1, 2, 3, 4, 5, 6],
});

/**
 * Os passos que este estágio acrescenta ao `validate`, que todo estágio roda.
 * Cada passo existe porque uma fase do estágio instalou o check que ele chama.
 */
function workflowSteps(stage: Stage, invoke: string): string {
  const phases = STAGE_PHASES[stage];
  const steps: string[] = [];

  if (phases.includes(5)) {
    steps.push(['', '      - name: CI-5 — deriva de contrato gerado', `        run: ${invoke} drift`].join('\n'));
  }
  if (phases.includes(6)) {
    steps.push(
      [
        '',
        '      - name: CI-6 — entrada de CHANGELOG',
        "        if: github.event_name == 'pull_request'",
        `        run: ${invoke} changelog --base \${{ github.event.pull_request.base.sha }}`,
      ].join('\n'),
    );
  }

  return steps.length === 0 ? '' : `${steps.join('\n')}\n`;
}
```

`InitOptions` ganha `invoke: string`. Nos `values`:

```typescript
    INVOKE: options.invoke,
    WORKFLOW_STEPS: workflowSteps(options.stage, options.invoke),
```

E, ao fim de `runInit`, antes do `declareDocuments`:

```typescript
  // O enforcement do estágio (`RF-0013`). Mesclar, nunca sobrescrever: o
  // workflow que já existe é de quem o escreveu.
  writeIfAbsent(root, WORKFLOW_PATH, template('workflow.yml', values), options, result);
```

- [ ] **Step 5: A flag `--invoke` no CLI**

Em `src/cli/index.ts`, junto das demais opções de `init`:

```typescript
      const invokeIndex = argv.indexOf('--invoke');
      const invoke = invokeIndex === -1 ? 'npx living-docs' : (argv[invokeIndex + 1] ?? '');
      if (invoke.trim() === '') {
        process.stderr.write(
          'living-docs: `--invoke` precisa do comando que roda o CLI no seu CI — ele não se adivinha (DA-0003).\n',
        );
        return 2;
      }
```

E no `USAGE`:

```
  --invoke <comando>  Como o CLI é chamado no CI de quem instala (padrão: npx living-docs)
```

- [ ] **Step 6: O enforcement deste repositório entra em `watches`**

Em `docs/.ownership.yml`, acrescente ao bloco `watches:` (as duas regras juntas,
depois da regra de `plugin/skills/**`):

```yaml
  - code: ".github/workflows/**"
    doc: docs/definition-of-done.md
    reason: "a última linha da Definition of Done nomeia o que o workflow roda — mudar o workflow muda o que 'pronto' significa"

  - code: ".github/workflows/**"
    doc: CHANGELOG.md
    consumer-visible: true
    reason: "o enforcement é literalmente o que o consumidor instala"
```

E em `consumer-visible-paths:`, no fim da lista:

```yaml
  - ".github/workflows/**"
```

As duas listas precisam continuar idênticas: `test/docs/release-history.test.ts`
compara os `code` das regras `consumer-visible: true` com
`consumer-visible-paths` e reprova se derivarem.

- [ ] **Step 7: Rodar tudo**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Esperado: tudo passa. `test/cli/init.test.ts` precisa do campo `invoke` nas
opções — acrescente-o à constante de opções do arquivo, sem mudar mais nada.

- [ ] **Step 8: CHANGELOG e commit**

Sob `### Added` de `CHANGELOG.md`:

```markdown
- `living-docs init` passa a instalar o workflow de CI do estágio em `.github/workflows/living-docs.yml`, com o comando de invocação vindo de `--invoke` (padrão `npx living-docs`). O workflow instalado não menciona Docker, e um workflow que já exista é mantido.
```

```bash
git add templates/workflow.yml src/cli/init.ts src/cli/index.ts \
        test/cli/init-enforcement.test.ts test/cli/init.test.ts docs/.ownership.yml CHANGELOG.md
git commit -m "feat(RF-0013, RN-0025): o init instala o workflow do estagio e o enforcement entra em watches"
```

---

### Task 7: O registro do plugin e o manifesto de marketplace

**Objetivo:** `L-2`. O plugin ganha caminho de instalação: um manifesto de
marketplace na raiz do toolkit, e a entrada no `.claude/settings.json` do
consumidor que liga os hooks na sessão — instalada por mesclagem, sem perder hook
nenhum de quem já tinha os seus.

**Files:**
- Create: `.claude-plugin/marketplace.json`
- Create: `src/config/claude-settings.ts`
- Create: `test/config/claude-settings.test.ts`
- Modify: `src/cli/init.ts` (escreve o registro)
- Modify: `src/cli/index.ts` (`--marketplace`, `USAGE`)
- Modify: `test/plugin/manifest.test.ts` (o manifesto de marketplace)
- Modify: `test/cli/init-enforcement.test.ts` (critérios 3 e 4)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consome: `InitOptions`, `InitResult` (Task 6).
- Produz:
  - `SETTINGS_PATH = '.claude/settings.json'`
  - `MARKETPLACE_NAME = 'living-docs'`, `PLUGIN_REF = 'living-docs@living-docs'`
  - `mergeSettings(current: string | null, marketplace: string): { text: string; added: string[] }`
  - `SettingsError`
  - `InitOptions.marketplace: string | null`

**Requisitos:**
- **Mesclagem, nunca sobrescrita.** Chave que já existe fica como está — inclusive
  uma entrada `living-docs` que o consumidor tenha escrito à mão. Só se
  acrescenta o que falta.
- Rodar duas vezes produz **o mesmo arquivo, byte a byte**. É a idempotência da
  `SK-0` valendo para o enforcement.
- `.claude/settings.json` ilegível (JSON inválido) **não é sobrescrito**: vira
  linha em `notInstalled` dizendo o que falta declarar. Um instalador que
  conserta arquivo de configuração alheia apaga trabalho de alguém.
- Sem `--marketplace <owner/repo>`, o registro **não é escrito**: a fonte não se
  adivinha (`DA-0003`), e a ausência vira linha em `notInstalled`. Mesma
  política de `watches` e `generated[]` — o `init` não inventa.
- O manifesto de marketplace e o `plugin.json` declaram a **mesma versão**. Duas
  versões é a garantia de que uma delas está errada.

**`HK-5`:** vai pedir `CHANGELOG.md` (`plugin/**` e `src/cli/**` são
consumer-visible) e `docs/requirements/functional.md`. A resposta: `RF-0013`
viajou na Task 2; o CHANGELOG entra no Step 7.

- [ ] **Step 1: Escrever o teste que falha — a mesclagem**

Crie `test/config/claude-settings.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SettingsError, mergeSettings } from '../../src/config/claude-settings.ts';

test('RF-0013: sem settings, o registro nasce com o marketplace e o plugin', () => {
  const { text, added } = mergeSettings(null, 'time/living-docs');
  const parsed = JSON.parse(text) as Record<string, Record<string, unknown>>;

  assert.deepEqual(parsed.extraKnownMarketplaces?.['living-docs'], {
    source: { source: 'github', repo: 'time/living-docs' },
  });
  assert.equal(parsed.enabledPlugins?.['living-docs@living-docs'], true);
  assert.equal(added.length, 2);
  assert.ok(text.endsWith('\n'));
});

test('RF-0013: o que o consumidor já tinha continua lá', () => {
  const meu = JSON.stringify(
    {
      hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: './meu-hook.sh' }] }] },
      enabledPlugins: { 'outro@loja': true },
    },
    null,
    2,
  );

  const { text } = mergeSettings(meu, 'time/living-docs');
  const parsed = JSON.parse(text) as Record<string, Record<string, unknown>>;

  assert.ok(parsed.hooks, 'nenhum hook do consumidor é perdido');
  assert.equal(parsed.enabledPlugins?.['outro@loja'], true);
  assert.equal(parsed.enabledPlugins?.['living-docs@living-docs'], true);
});

test('RF-0013: mesclar duas vezes não duplica e não muda um byte', () => {
  const primeira = mergeSettings(null, 'time/living-docs');
  const segunda = mergeSettings(primeira.text, 'time/living-docs');

  assert.equal(segunda.text, primeira.text);
  assert.deepEqual(segunda.added, []);
});

test('RF-0013: entrada que o consumidor escreveu à mão não é reescrita', () => {
  const meu = JSON.stringify(
    { extraKnownMarketplaces: { 'living-docs': { source: { source: 'git', url: 'file:///opt/toolkit' } } } },
    null,
    2,
  );

  const { text, added } = mergeSettings(meu, 'time/living-docs');
  const parsed = JSON.parse(text) as Record<string, Record<string, Record<string, unknown>>>;

  assert.deepEqual(parsed.extraKnownMarketplaces?.['living-docs']?.source, {
    source: 'git',
    url: 'file:///opt/toolkit',
  });
  assert.deepEqual(added, ['enabledPlugins["living-docs@living-docs"]']);
});

test('RF-0013: settings ilegível é erro, nunca sobrescrita', () => {
  assert.throws(() => mergeSettings('{ isto não é json', 'time/living-docs'), SettingsError);
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RF-0013"
```

Esperado: FALHA — `Cannot find module '../../src/config/claude-settings.ts'`.

- [ ] **Step 3: Implementar `src/config/claude-settings.ts`**

```typescript
/**
 * O registro do plugin no repositório de quem instala (`RF-0013`).
 *
 * Mesclagem, nunca sobrescrita: um consumidor com hooks próprios e outros
 * plugins mantém tudo o que tem, e o toolkit acrescenta só o que falta. É a
 * mesma regra que o `init` já pratica com o CODEOWNERS — e é o passo 1 da `SK-0`
 * ("nunca criar um paralelo") visto do lado do enforcement.
 */
export const SETTINGS_PATH = '.claude/settings.json';
export const MARKETPLACE_NAME = 'living-docs';
export const PLUGIN_REF = 'living-docs@living-docs';

export class SettingsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'SettingsError';
  }
}

type Json = Record<string, unknown>;

function objectAt(root: Json, key: string): Json {
  const value = root[key];
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) return value as Json;
  const created: Json = {};
  root[key] = created;
  return created;
}

/**
 * O `.claude/settings.json` com o registro do plugin acrescentado.
 *
 * `added` lista o que entrou — vazio significa "já estava tudo lá", e é o que
 * torna a segunda execução silenciosa em vez de mentirosa.
 */
export function mergeSettings(current: string | null, marketplace: string): { text: string; added: string[] } {
  let root: Json = {};
  if (current !== null && current.trim() !== '') {
    let parsed: unknown;
    try {
      parsed = JSON.parse(current);
    } catch (err) {
      throw new SettingsError(
        `${SETTINGS_PATH}: JSON inválido — ${err instanceof Error ? err.message : String(err)}`,
      );
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new SettingsError(`${SETTINGS_PATH}: o conteúdo não é um objeto JSON.`);
    }
    root = parsed as Json;
  }

  const added: string[] = [];

  const marketplaces = objectAt(root, 'extraKnownMarketplaces');
  if (marketplaces[MARKETPLACE_NAME] === undefined) {
    marketplaces[MARKETPLACE_NAME] = { source: { source: 'github', repo: marketplace } };
    added.push(`extraKnownMarketplaces["${MARKETPLACE_NAME}"]`);
  }

  const plugins = objectAt(root, 'enabledPlugins');
  if (plugins[PLUGIN_REF] === undefined) {
    plugins[PLUGIN_REF] = true;
    added.push(`enabledPlugins["${PLUGIN_REF}"]`);
  }

  return { text: `${JSON.stringify(root, null, 2)}\n`, added };
}
```

- [ ] **Step 4: O manifesto de marketplace**

Crie `.claude-plugin/marketplace.json` na raiz do toolkit:

```json
{
  "name": "living-docs",
  "description": "Toolkit de documentação viva: ADR, decisões abertas, dívida registrada, requisitos com ID estável, contrato gerado e o enforcement que os mantém vivos.",
  "owner": {
    "name": "Dan Ruan",
    "email": "danrsaquetti@gmail.com"
  },
  "plugins": [
    {
      "name": "living-docs",
      "description": "Sete skills donas de artefato, dois agents, oito hooks e sete comandos — o lado de sessão do toolkit de documentação viva.",
      "version": "0.1.0",
      "source": "./plugin"
    }
  ]
}
```

Acrescente a `test/plugin/manifest.test.ts`:

```typescript
test('o manifesto de marketplace aponta para o plugin deste repositório', () => {
  const marketplace = readJson('.claude-plugin/marketplace.json');
  const plugins = marketplace.plugins as { name: string; source: string; version: string }[];

  assert.equal(marketplace.name, 'living-docs');
  assert.equal(plugins.length, 1);
  assert.equal(plugins[0]?.name, 'living-docs');
  assert.equal(plugins[0]?.source, './plugin');
  assert.ok(existsSync(join(ROOT, 'plugin/.claude-plugin/plugin.json')), 'a fonte precisa ter manifesto');

  const plugin = readJson('plugin/.claude-plugin/plugin.json');
  assert.equal(plugins[0]?.version, plugin.version, 'duas versões é a garantia de que uma está errada');
});
```

- [ ] **Step 5: Ligar ao `init`**

Em `src/cli/init.ts`:

```typescript
import { SETTINGS_PATH, SettingsError, mergeSettings } from '../config/claude-settings.ts';
```

`InitOptions` ganha `marketplace: string | null`. E, logo depois da escrita do
workflow:

```typescript
  declarePlugin(root, options, result);
```

com:

```typescript
/**
 * O registro que liga os hooks na sessão (`RF-0013`).
 *
 * Sem `--marketplace`, nada é escrito: a fonte do marketplace não se adivinha
 * (`DA-0003`), e o init não inventa — mesma política de `watches` e
 * `generated[]`. Settings ilegível também não é tocado: consertar configuração
 * alheia apaga trabalho de alguém.
 */
function declarePlugin(root: string, options: InitOptions, result: InitResult): void {
  if (options.marketplace === null) {
    result.notInstalled.push(
      `registro do plugin em ${SETTINGS_PATH} — sem \`--marketplace <owner/repo>\` a fonte não se ` +
        'adivinha (`DA-0003`); os hooks não sobem na sessão até ele ser declarado',
    );
    return;
  }

  const file = join(root, SETTINGS_PATH);
  const current = existsSync(file) ? readFileSync(file, 'utf8') : null;

  let merged;
  try {
    merged = mergeSettings(current, options.marketplace);
  } catch (err) {
    result.notInstalled.push(
      `registro do plugin em ${SETTINGS_PATH} — ${err instanceof SettingsError ? err.message : String(err)}; ` +
        'declare-o à mão para não perder o que já está lá',
    );
    return;
  }

  if (merged.added.length === 0) {
    result.skipped.push(SETTINGS_PATH);
    return;
  }

  result.created.push(`${SETTINGS_PATH} (${merged.added.join(', ')})`);
  if (options.dryRun) return;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, merged.text, 'utf8');
}
```

Em `src/cli/index.ts`:

```typescript
      const marketplaceIndex = argv.indexOf('--marketplace');
      const marketplace = marketplaceIndex === -1 ? null : (argv[marketplaceIndex + 1] ?? '');
      if (marketplace !== null && !/^[\w.-]+\/[\w.-]+$/.test(marketplace)) {
        process.stderr.write('living-docs: `--marketplace` recebe `<owner>/<repo>` — ex.: time/living-docs.\n');
        return 2;
      }
```

E no `USAGE`:

```
  --marketplace <o/r>  Repositório do marketplace do plugin; sem ele os hooks não são registrados
```

- [ ] **Step 6: Os testes dos critérios 3 e 4**

Acrescente a `test/cli/init-enforcement.test.ts` (e passe
`marketplace: 'time/living-docs'` na constante `OPTIONS`):

```typescript
test('critério 3: sem enforcement, o init deixa workflow e registro de plugin — e rodar de novo não duplica', () => {
  withTempRepo({}, (root) => {
    runInit(root, OPTIONS);

    assert.ok(existsSync(join(root, WORKFLOW)));
    const settings = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8')) as Record<string, Record<string, unknown>>;
    assert.equal(settings.enabledPlugins?.['living-docs@living-docs'], true);

    const antes = readFileSync(join(root, '.claude/settings.json'), 'utf8');
    const segunda = runInit(root, OPTIONS);
    assert.equal(readFileSync(join(root, '.claude/settings.json'), 'utf8'), antes);
    assert.ok(segunda.skipped.includes('.claude/settings.json'));
  });
});

test('critério 4: hooks e workflows próprios continuam lá, e o do toolkit foi acrescentado', () => {
  const meusHooks = JSON.stringify(
    { hooks: { PostToolUse: [{ matcher: 'Write', hooks: [{ type: 'command', command: './formata.sh' }] }] } },
    null,
    2,
  );

  withTempRepo({ '.claude/settings.json': meusHooks, '.github/workflows/ci.yml': 'name: meu-ci\non:\n  push:\n' }, (root) => {
    runInit(root, OPTIONS);

    const settings = JSON.parse(readFileSync(join(root, '.claude/settings.json'), 'utf8')) as Record<string, Record<string, unknown>>;
    assert.ok(settings.hooks, 'nenhum hook do consumidor pode ser perdido');
    assert.equal(settings.enabledPlugins?.['living-docs@living-docs'], true);
    assert.match(readFileSync(join(root, '.github/workflows/ci.yml'), 'utf8'), /meu-ci/);
    assert.ok(existsSync(join(root, WORKFLOW)));
  });
});

test('RF-0013: sem --marketplace, o registro não é inventado — é relatado', () => {
  withTempRepo({}, (root) => {
    const result = runInit(root, { ...OPTIONS, marketplace: null });
    assert.equal(existsSync(join(root, '.claude/settings.json')), false);
    assert.ok(result.notInstalled.some((linha) => linha.includes('DA-0003')));
  });
});
```

- [ ] **Step 7: Rodar, anotar o CHANGELOG e commitar**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Sob `### Added` de `CHANGELOG.md`:

```markdown
- `.claude-plugin/marketplace.json`: o plugin `living-docs` passa a ter caminho de instalação.
- `living-docs init --marketplace <owner/repo>` registra o plugin em `.claude/settings.json` do repositório, por mesclagem — hooks e plugins que já estavam lá são preservados. Sem a opção, o registro não é escrito e o `init` diz o que faltou.
```

```bash
git add .claude-plugin/marketplace.json src/config/claude-settings.ts src/cli/init.ts src/cli/index.ts \
        test/config/claude-settings.test.ts test/plugin/manifest.test.ts test/cli/init-enforcement.test.ts CHANGELOG.md
git commit -m "feat(RF-0013, DA-0003): o plugin ganha manifesto de marketplace e registro por mesclagem"
```

---

### Task 8: `--stage multi-team` e o conjunto por fase

**Objetivo:** `L-7`. O estágio que a `SK-0` manda escolher e que o CLI rejeitava
passa a existir — e existe porque passa a ter enforcement atrás dele: é o
estágio que instala a Fase 7, com a metade de `CI-7` que lê o diff.

**Files:**
- Modify: `src/cli/init.ts` (`STAGES`, `STAGE_PHASES`, `NOT_INSTALLED`, `workflowSteps`, os testes de estágio)
- Modify: `src/cli/index.ts` (`USAGE`)
- Modify: `plugin/skills/living-docs-bootstrap/SKILL.md` (passo 2 e a tabela de propriedade)
- Modify: `test/cli/init-enforcement.test.ts` (critério 5)
- Modify: `test/plugin/authoring.test.ts` (a `SK-0` nomeia estágio que existe)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consome: `STAGE_PHASES`, `workflowSteps` (Task 6).
- Produz: `Stage` passa a incluir `'multi-team'`.

**Requisitos:**
- `multi-team` instala **os mesmos artefatos** que `production` e **um passo a
  mais** de enforcement: `validate --base`, que é a metade de `CI-7` que lê o
  diff. É isso que o faz deixar de ser rótulo sem conteúdo.
- Todo teste de estágio que hoje compara com a string `'production'` passa a
  perguntar às fases (`STAGE_PHASES[stage].includes(5)` para contratos,
  `includes(6)` para o rastro histórico). Sem isso, `multi-team` instalaria
  **menos** artefato que `production`, que é o oposto do que o estágio significa.
  Os pontos são: `kinds`, `CONTRACTS_CODEOWNERS`, `HISTORY_CODEOWNERS`,
  `releasesBlock`, `documentSeeds` e o bloco `if (options.stage === 'production')`
  dentro de `runInit`.
- `NOT_INSTALLED['multi-team']` é vazio: as sete fases existem.
- Nenhum hook é estagiado (`ADR-0012`).

**`HK-5`:** `src/cli/**` pede `docs/requirements/functional.md` e `CHANGELOG.md`;
`plugin/**` pede `CHANGELOG.md`. A resposta: `RN-0025` viajou na Task 2, e o
CHANGELOG entra no Step 5.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `test/cli/init-enforcement.test.ts`:

```typescript
test('critério 5: multi-team instala o enforcement da Fase 7', () => {
  withTempRepo({}, (root) => {
    const result = runInit(root, { ...OPTIONS, stage: 'multi-team' });

    const yaml = readFileSync(join(root, WORKFLOW), 'utf8');
    assert.match(yaml, /npx living-docs validate --base/, 'a metade de CI-7 que lê o diff é a Fase 7');
    assert.match(yaml, /npx living-docs drift/);
    assert.match(yaml, /npx living-docs changelog --base/);
    assert.deepEqual(result.notInstalled, [], 'as sete fases existem: nada fica de fora');
  });
});

test('RN-0025: multi-team instala tudo que production instala', () => {
  withTempRepo({}, (root) => {
    runInit(root, { ...OPTIONS, stage: 'multi-team' });
    for (const path of ['CHANGELOG.md', 'docs/contracts/errors.md', 'docs/deprecations.md']) {
      assert.ok(existsSync(join(root, path)), `${path} deveria existir no estágio multi-team`);
    }
  });
});

test('RN-0025: production não instala o passo da Fase 7', () => {
  withTempRepo({}, (root) => {
    runInit(root, { ...OPTIONS, stage: 'production' });
    assert.doesNotMatch(readFileSync(join(root, WORKFLOW), 'utf8'), /validate --base/);
  });
});
```

E a `test/plugin/authoring.test.ts`:

```typescript
test('a SK-0 não manda escolher estágio que o CLI rejeita', () => {
  const source = skillSource('living-docs-bootstrap');
  for (const stage of ['solo', 'small-team', 'production', 'multi-team']) {
    assert.ok(source.includes(stage), `a SK-0 precisa nomear o estágio \`${stage}\` como o CLI o chama`);
  }
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="critério 5"
```

Esperado: FALHA — `multi-team` não é um `Stage`.

- [ ] **Step 3: Implementar no `init`**

```typescript
/**
 * Estágios de maturidade (spec §10, `SK-0` passo 2). Cada estágio instala o
 * conjunto mínimo que ele pede — e nada além. `multi-team` existe desde o
 * fechamento porque passa a ter enforcement atrás dele: é o estágio que instala
 * a Fase 7 (`RN-0025`, `ADR-0012`). Um rótulo sem conteúdo é a wiki morta
 * nascendo de fábrica.
 */
export const STAGES = ['solo', 'small-team', 'production', 'multi-team'] as const;

const STAGE_PHASES: Readonly<Record<Stage, readonly number[]>> = Object.freeze({
  solo: [0, 1],
  'small-team': [0, 1, 2, 3, 4],
  production: [0, 1, 2, 3, 4, 5, 6],
  'multi-team': [0, 1, 2, 3, 4, 5, 6, 7],
});

const NOT_INSTALLED: Readonly<Record<Stage, readonly string[]>> = Object.freeze({
  solo: [],
  'small-team': [],
  production: [],
  // `multi-team` cobre a Fase 7 da spec §10, e ela existe.
  'multi-team': [],
});

/** Este estágio chega até a fase dada? É a pergunta que substitui comparar strings. */
function reaches(stage: Stage, phase: number): boolean {
  return STAGE_PHASES[stage].includes(phase);
}
```

Em `workflowSteps`, acrescente ao fim:

```typescript
  if (phases.includes(7)) {
    steps.push(
      [
        '',
        '      - name: CI-7 — vínculo código→doc no diff do PR',
        "        if: github.event_name == 'pull_request'",
        `        run: ${invoke} validate --base \${{ github.event.pull_request.base.sha }}`,
      ].join('\n'),
    );
  }
```

E troque cada `options.stage === 'production'` por `reaches(options.stage, 5)`
(contratos) ou `reaches(options.stage, 6)` (rastro histórico e `REL`), e cada
`stage === 'production'` dentro de `documentSeeds`, `releasesBlock` e a escolha
de `kinds` pela mesma pergunta.

- [ ] **Step 4: A `SK-0` nomeia os quatro estágios**

Em `plugin/skills/living-docs-bootstrap/SKILL.md`, passo 2, troque a frase dos
estágios por:

```markdown
2. **Determine o estágio** — `solo` (protótipo), `small-team` (time pequeno),
   `production` (produção com usuários) ou `multi-team` (múltiplos times) — e
   derive o conjunto **mínimo** de fases (spec §10). Os quatro nomes são os que
   `living-docs init --stage` aceita. Não instale o que o estágio não pede, e
   diga em voz alta qual estágio você concluiu e por quê.
```

E, na tabela "Do que você é dono", a linha da instalação passa a dizer o que ela
de fato instala:

```markdown
| Instalação de `HK-*` e `CI-*` | O enforcement das fases do estágio | Workflow em `.github/workflows/` + registro do plugin em `.claude/settings.json` |
```

- [ ] **Step 5: Rodar, anotar o CHANGELOG e commitar**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Sob `### Added` de `CHANGELOG.md`:

```markdown
- `living-docs init --stage multi-team`: o estágio de múltiplos times passa a existir e instala a Fase 7 — o passo de `validate --base <ref>` no workflow, além de tudo que `production` instala.
```

```bash
git add src/cli/init.ts src/cli/index.ts plugin/skills/living-docs-bootstrap/SKILL.md \
        test/cli/init-enforcement.test.ts test/plugin/authoring.test.ts CHANGELOG.md
git commit -m "feat(RN-0025, ADR-0012): --stage multi-team passa a existir, com a Fase 7 atras dele"
```

---

### Task 9: O campo `blocks` e `HK-8` — a decisão aberta reivindica caminhos

**Objetivo:** `L-3`, metade determinística 1. Uma decisão aberta ganha um campo
opcional que nomeia os caminhos que ela bloqueia, e `HK-8` **pergunta** quando um
deles é editado — nomeando a decisão, a lacuna e a skill dona. Um hook que
julgasse se aquela edição é a implementação da regra que falta estaria no lugar
errado (spec §1, corolário 1).

**Files:**
- Create: `src/docs/blocked.ts`
- Create: `src/hooks/hk8-open-decision-guard.ts`
- Create: `test/docs/blocked.test.ts`
- Create: `test/hooks/hk8-open-decision-guard.test.ts`
- Modify: `plugin/hooks/hooks.json` (o oitavo hook)
- Modify: `templates/open-decisions.md` (a coluna `Bloqueia`)
- Modify: `templates/ownership.yml` (o `field-map` de DA)
- Modify: `docs/open-decisions.md` (a coluna, com `—` nas linhas existentes)
- Modify: `docs/.ownership.yml` (o `field-map` de DA)
- Modify: `test/plugin/manifest.test.ts` (oito hooks, não sete)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consome: `ArtifactDoc` (`src/docs/collect.ts`), `fieldOf`, `picomatch`,
  `toRepoPath`, `askOutput`, `hookEnv`, `readPayload`.
- Produz:
  - `BlockedClaim { id, doc, line, paths, skill, owner, gap }`
  - `blockedClaims(docs: readonly ArtifactDoc[]): BlockedClaim[]`
  - `claimsFor(claims, paths): { claim: BlockedClaim; matched: string[] }[]`
  - `decideHk8(payload, env): Hk8Decision`

**Requisitos:**
- **`ask`, nunca `deny`.** O arquivo `hk8-open-decision-guard.ts` não conhece a
  palavra `deny`, e o teste prova isso lendo a fonte.
- O campo é **opcional**: decisão aberta sem caminho declarado continua válida e
  não bloqueia nada. O que a spec recusa é declarar o caminho e não ser lembrado.
- Só item com `status: open` reivindica. Decisão resolvida não bloqueia nada.
- Editar o **próprio documento da decisão** nunca é bloqueado: quem vai resolver
  a decisão precisa poder escrever nela.
- O nome canônico do campo é `blocks`; a coluna em português (`Bloqueia`) chega
  por `field-map`, que é onde o nome específico do projeto mora — nenhum hook
  aprende português.
- Falha aberta: configuração ilegível, artefato ausente ou erro de leitura
  devolvem `allow` (`RNF-0001`).
- Vale para as três formas de coleção: tabela, seções e um arquivo por decisão.

**`HK-5`:** `src/hooks/**` pede `docs/requirements/rules.md`; `plugin/**` e
`templates/**` pedem `CHANGELOG.md`. A resposta: `RN-0026` viajou na Task 2, e o
CHANGELOG entra no Step 7.

- [ ] **Step 1: Escrever o teste que falha — a leitura das reivindicações**

Crie `test/docs/blocked.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blockedClaims, claimsFor } from '../../src/docs/blocked.ts';
import { collectArtifacts } from '../../src/docs/collect.ts';
import { loadOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const CONFIG = `
version: 1
artifacts:
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    collection: table
    field-map:
      resolved-by: "Resolvida por"
      blocks: "Bloqueia"
      gap: "Lacuna"
`;

const TABELA = [
  '---',
  'title: Open Decisions',
  'owner: "@time"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-28',
  '---',
  '',
  '| ID | Lacuna | Status | Resolvida por | Bloqueia | Aberta em |',
  '| --- | --- | --- | --- | --- | --- |',
  '| DA-0001 | Como arredondar centavos | open | — | `src/cobranca/**`, `src/api/checkout/**` | 2026-08-28 |',
  '| DA-0002 | Já resolvida | resolved | ADR-0001 | `src/legado/**` | 2026-08-20 |',
  '| DA-0003 | Sem caminho declarado | open | — | — | 2026-08-28 |',
  '',
].join('\n');

function claims(root: string) {
  const config = loadOwnership(root);
  return blockedClaims(collectArtifacts(root, config));
}

test('RN-0026: só decisão aberta com caminho declarado reivindica', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, 'docs/open-decisions.md': TABELA }, (root) => {
    const found = claims(root);
    assert.equal(found.length, 1, JSON.stringify(found, null, 2));
    assert.equal(found[0]?.id, 'DA-0001');
    assert.deepEqual(found[0]?.paths, ['src/cobranca/**', 'src/api/checkout/**']);
    assert.equal(found[0]?.skill, 'decision-recorder');
    assert.match(found[0]?.gap ?? '', /centavos/);
  });
});

test('RN-0026: claimsFor devolve o que cada reivindicação pegou', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, 'docs/open-decisions.md': TABELA }, (root) => {
    const hits = claimsFor(claims(root), ['src/cobranca/taxa.ts', 'README.md']);
    assert.equal(hits.length, 1);
    assert.deepEqual(hits[0]?.matched, ['src/cobranca/taxa.ts']);

    assert.deepEqual(claimsFor(claims(root), ['README.md']), []);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0026"
```

Esperado: FALHA — `Cannot find module '../../src/docs/blocked.ts'`.

- [ ] **Step 3: Implementar `src/docs/blocked.ts`**

```typescript
import picomatch from 'picomatch';
import { fieldOf } from '../config/ownership.ts';
import type { ArtifactDoc } from './collect.ts';

/**
 * Uma decisão aberta que nomeou os caminhos que ela bloqueia (`RN-0026`).
 *
 * O campo é opcional de propósito: decisão aberta sem caminho declarado continua
 * válida e não bloqueia nada. O que a spec recusa é o contrário — declarar o
 * caminho e não ser lembrado.
 */
export interface BlockedClaim {
  id: string;
  /** O documento onde a decisão mora. */
  doc: string;
  line: number;
  /** Os globs declarados, como o projeto os escreveu. */
  paths: string[];
  skill: string;
  owner: string;
  /** O enunciado da lacuna, quando o item o traz. */
  gap: string | null;
}

const EMPTY = new Set(['', '-', '—', '–', 'n/a', 'na', 'nenhum', 'nenhuma']);

/** Um caminho por vírgula ou por espaço; crase é decoração de markdown. */
function splitPaths(raw: string): string[] {
  return raw
    .split(/[,\s]+/)
    .map((path) => path.replace(/`/g, '').trim())
    .filter((path) => path !== '' && !EMPTY.has(path.toLowerCase()));
}

/** As reivindicações declaradas por decisões `open`, em qualquer forma de coleção. */
export function blockedClaims(docs: readonly ArtifactDoc[]): BlockedClaim[] {
  const claims: BlockedClaim[] = [];

  for (const doc of docs) {
    if (doc.rule.collection === 'per-file') {
      const data = doc.frontmatter?.data;
      if (data?.status !== 'open' || typeof data.id !== 'string') continue;
      const raw = data.blocks;
      const paths = splitPaths(Array.isArray(raw) ? raw.join(' ') : String(raw ?? ''));
      if (paths.length === 0) continue;

      claims.push({
        id: data.id,
        doc: doc.file,
        line: doc.frontmatter?.lines.id ?? 1,
        paths,
        skill: doc.rule.skill,
        owner: doc.rule.owner,
        gap: typeof data.title === 'string' ? data.title : null,
      });
      continue;
    }

    for (const item of doc.items) {
      if (item.status !== 'open') continue;
      const raw = fieldOf(doc.rule, item, 'blocks');
      if (raw === null) continue;
      const paths = splitPaths(raw);
      if (paths.length === 0) continue;

      claims.push({
        id: item.id,
        doc: doc.file,
        line: item.line,
        paths,
        skill: doc.rule.skill,
        owner: doc.rule.owner,
        gap: fieldOf(doc.rule, item, 'gap') ?? item.fields.title ?? null,
      });
    }
  }

  return claims;
}

/** Que reivindicações este conjunto de caminhos toca, e o que cada uma pegou. */
export function claimsFor(
  claims: readonly BlockedClaim[],
  paths: readonly string[],
): { claim: BlockedClaim; matched: string[] }[] {
  const normalized = paths.map((path) => path.replace(/\\/g, '/').replace(/^\.\//, ''));
  const hits: { claim: BlockedClaim; matched: string[] }[] = [];

  for (const claim of claims) {
    const matches = picomatch(claim.paths);
    // O próprio documento da decisão nunca é bloqueado: quem vai resolvê-la
    // precisa poder escrever nela.
    const matched = normalized.filter((path) => path !== claim.doc && matches(path));
    if (matched.length > 0) hits.push({ claim, matched });
  }

  return hits;
}
```

- [ ] **Step 4: Escrever o teste que falha — `HK-8`**

Crie `test/hooks/hk8-open-decision-guard.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { decideHk8 } from '../../src/hooks/hk8-open-decision-guard.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { toolkitRoot } from '../../src/core/roots.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const CONFIG = `
version: 1
artifacts:
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    collection: table
    field-map:
      blocks: "Bloqueia"
      gap: "Lacuna"
`;

const TABELA = [
  '---',
  'title: Open Decisions',
  'owner: "@time"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-28',
  '---',
  '',
  '| ID | Lacuna | Status | Bloqueia | Aberta em |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | Como arredondar centavos | open | `src/cobranca/**` | 2026-08-28 |',
  '',
].join('\n');

const ARVORE = { [OWNERSHIP_PATH]: CONFIG, 'docs/open-decisions.md': TABELA };

test('RN-0026: editar caminho reivindicado pergunta, nomeando a decisão e a skill dona', () => {
  withTempRepo(ARVORE, (root) => {
    const decision = decideHk8(
      { tool_name: 'Edit', tool_input: { file_path: 'src/cobranca/taxa.ts', old_string: 'a', new_string: 'b' } },
      { root, hostRoots: [root] },
    );

    assert.equal(decision.action, 'ask');
    const reason = decision.action === 'ask' ? decision.reason : '';
    assert.match(reason, /DA-0001/);
    assert.match(reason, /centavos/, 'a lacuna precisa ser nomeada');
    assert.match(reason, /decision-recorder/);
    assert.match(reason, /docs\/open-decisions\.md/);
  });
});

test('RN-0026: caminho não reivindicado passa em silêncio', () => {
  withTempRepo(ARVORE, (root) => {
    const decision = decideHk8(
      { tool_name: 'Write', tool_input: { file_path: 'src/relatorio/pdf.ts', content: 'x' } },
      { root, hostRoots: [root] },
    );
    assert.equal(decision.action, 'allow');
  });
});

test('RN-0026: escrever na própria decisão nunca é bloqueado', () => {
  withTempRepo(ARVORE, (root) => {
    const decision = decideHk8(
      { tool_name: 'Edit', tool_input: { file_path: 'docs/open-decisions.md', old_string: 'open', new_string: 'resolved' } },
      { root, hostRoots: [root] },
    );
    assert.equal(decision.action, 'allow');
  });
});

test('RNF-0001: sem configuração legível, HK-8 falha aberta', () => {
  withTempRepo({}, (root) => {
    const decision = decideHk8({ tool_name: 'Edit', tool_input: { file_path: 'src/x.ts' } }, { root, hostRoots: [root] });
    assert.equal(decision.action, 'allow');
  });
});

test('RN-0026: HK-8 pergunta e não conhece a palavra deny', () => {
  const source = readFileSync(join(toolkitRoot(), 'src/hooks/hk8-open-decision-guard.ts'), 'utf8');
  assert.doesNotMatch(source, /\bdenyOutput\b/, 'hook que julga está no lugar errado (spec §1)');
});
```

- [ ] **Step 5: Implementar `src/hooks/hk8-open-decision-guard.ts`**

```typescript
#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): pergunta quando a edição toca um caminho que uma
 * decisão aberta reivindicou.
 *
 * Regra de origem: `RN-0026`, e o critério de aceite 4 da spec §12 —
 * comportamento sem regra escrita vira decisão aberta **e a implementação não
 * acontece**. Devolve `ask`, nunca `deny`: negar exigiria julgar se aquela
 * edição é a implementação da regra que falta ou outra coisa qualquer no mesmo
 * caminho, e hook que julga está no lugar errado (spec §1, corolário 1).
 */
import { loadOwnership } from '../config/ownership.ts';
import { collectArtifacts } from '../docs/collect.ts';
import { blockedClaims, claimsFor } from '../docs/blocked.ts';
import { toRepoPath } from './lib/paths.ts';
import { askOutput, emit, hookEnv, readPayload } from './lib/io.ts';
import type { HookEnv, HookPayload } from './lib/io.ts';

export type Hk8Decision = { action: 'allow' } | { action: 'ask'; reason: string };

const ALLOW: Hk8Decision = { action: 'allow' };

export function decideHk8(payload: HookPayload, env: HookEnv): Hk8Decision {
  const filePath = payload.tool_input?.file_path;
  if (typeof filePath !== 'string') return ALLOW;

  const repoPath = toRepoPath(filePath, env.hostRoots);
  if (repoPath === null) return ALLOW;

  let hits;
  try {
    const config = loadOwnership(env.root);
    hits = claimsFor(blockedClaims(collectArtifacts(env.root, config)), [repoPath]);
  } catch {
    return ALLOW; // falha aberta (`RNF-0001`)
  }

  const hit = hits[0];
  if (hit === undefined) return ALLOW;

  const { claim } = hit;
  return {
    action: 'ask',
    reason:
      `HK-8: \`${repoPath}\` está reivindicado por ${claim.id}, uma decisão **aberta** em ${claim.doc}` +
      `${claim.gap === null ? '' : ` — "${claim.gap}"`}. ` +
      `Ela bloqueia: ${claim.paths.join(', ')}. ` +
      'Regra de origem: `RN-0026` e o critério de aceite 4 da spec §12 — comportamento sem regra escrita vira ' +
      'decisão aberta, e a implementação não acontece enquanto ela estiver aberta. ' +
      `Resolva a decisão primeiro (skill dona: ${claim.skill}; dono: ${claim.owner}), ou confirme que esta edição ` +
      'não é a implementação da regra que falta.',
  };
}

async function main(): Promise<void> {
  const payload = await readPayload();
  if (!payload) return;
  const decision = decideHk8(payload, hookEnv());
  emit(decision.action === 'ask' ? askOutput(decision.reason) : null);
}

if (process.argv[1]?.endsWith('hk8-open-decision-guard.ts')) {
  main().catch(() => process.exit(0));
}
```

- [ ] **Step 6: Registrar o hook e a coluna**

Em `plugin/hooks/hooks.json`, no grupo `PreToolUse` / `Edit|Write`, depois de
`hk3-state-promotion`:

```json
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk8-open-decision-guard",
            "shell": "bash",
            "async": false
          }
```

Em `test/plugin/manifest.test.ts`, o esperado passa a ser:

```typescript
    'PreToolUse:Edit|Write': ['hk1-append-only', 'hk2-generated-artifact', 'hk3-state-promotion', 'hk8-open-decision-guard'],
```

e `assert.equal(vistos, 8, 'a varredura deveria ver os oito hooks')`.

Em `templates/open-decisions.md`, a tabela passa a ter a coluna, com a nota logo
acima dela:

```markdown
A coluna **Bloqueia** é opcional: quando preenchida com os caminhos que a lacuna
impede de implementar, `HK-8` pergunta na edição e `CI-7` reprova no diff
(`RN-0026`). Vazia (`—`), a decisão continua válida e não bloqueia nada.

| ID | Lacuna | Status | Resolvida por | Bloqueia | Aberta em |
| --- | --- | --- | --- | --- | --- |
```

Em `templates/ownership.yml` e em `docs/.ownership.yml`, o `field-map` do
artefato DA ganha as duas linhas:

```yaml
    field-map:
      resolved-by: "Resolvida por"
      blocks: "Bloqueia"
      gap: "Lacuna"
```

E em `docs/open-decisions.md`, acrescente a coluna ao cabeçalho, ao separador e
às três linhas existentes (`DA-0001`, `DA-0002` e `DA-0003`, todas com `—`).

- [ ] **Step 7: Rodar, anotar o CHANGELOG e commitar**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Sob `### Added` de `CHANGELOG.md`:

```markdown
- `HK-8`: editar um caminho reivindicado por uma decisão aberta passa a perguntar, nomeando a decisão, a lacuna e a skill dona. O campo é opcional — a coluna `Bloqueia` (canônico `blocks`) na lista de decisões abertas.
```

```bash
git add src/docs/blocked.ts src/hooks/hk8-open-decision-guard.ts plugin/hooks/hooks.json \
        templates/open-decisions.md templates/ownership.yml docs/open-decisions.md docs/.ownership.yml \
        test/docs/blocked.test.ts test/hooks/hk8-open-decision-guard.test.ts test/plugin/manifest.test.ts CHANGELOG.md
git commit -m "feat(RN-0026): decisao aberta reivindica caminhos, e HK-8 pergunta"
```

---

### Task 10: O `CI-7` cobra o caminho bloqueado no diff — e o critério 4 ganha prova

**Objetivo:** `L-3`, metade determinística 2. O diff que toca caminho
reivindicado por decisão aberta reprova, com a mesma saída escrita que as outras
metades do `CI-7` já aceitam. E o critério de aceite 4 da spec original — que
nunca teve teste — passa a ter.

**Files:**
- Modify: `src/checks/ci7-ownership-coverage.ts` (sexta classe de achado)
- Modify: `src/checks/catalog.ts` (`failsWhen` de `CI-7`)
- Modify: `docs/contracts/checks.gen.md` (**regerado**, nunca editado)
- Modify: `test/checks/ci7-ownership-coverage.test.ts`
- Modify: `test/acceptance/spec-criteria.test.ts` (critério 4 da spec original)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consome: `blockedClaims`, `claimsFor` (Task 9); `docsExceptionReason`,
  `DiffFacts`.
- Produz: nenhuma assinatura nova — `ci7OwnershipCoverage(diff)` ganha uma classe
  de achado.

**Requisitos:**
- A classe nova só existe **com diff** (`validate --base`), como a quinta. Sem
  base não há diff, e inventar um produziria achado sobre mudança que não é
  desta branch.
- A saída escrita é a mesma: `Docs: none — <razão>` libera as duas classes do
  diff de uma vez. Dois rótulos já são o começo de uma família; um terceiro
  precisaria de ADR próprio (`src/checks/exception-label.ts`).
- A mensagem nomeia a decisão, a lacuna, os caminhos que o diff levou e a skill
  dona. Mensagem de bloqueio que não ensina o caminho certo é ruído.
- `CI-5` cobra a deriva do catálogo: **regere** `docs/contracts/checks.gen.md`
  pelo gerador. Editá-lo à mão é negado por `HK-2`.

**`HK-5`:** `src/checks/**` pede `docs/requirements/rules.md`;
`src/checks/catalog.ts` pede `docs/contracts/checks.gen.md` e `CHANGELOG.md`. A
resposta: `RN-0026` viajou na Task 2, o contrato é regerado no Step 4 e o
CHANGELOG entra no Step 6.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente a `test/acceptance/spec-criteria.test.ts` (e o import
`import { decideHk8 } from '../../src/hooks/hk8-open-decision-guard.ts';`):

```typescript
const DECISAO_BLOQUEANTE = [
  'version: 1',
  'artifacts:',
  '  - id-prefix: DA',
  '    path: docs/open-decisions.md',
  '    owner: "@time"',
  '    skill: decision-recorder',
  '    collection: table',
  '    field-map:',
  '      blocks: "Bloqueia"',
  '      gap: "Lacuna"',
  'documents:',
  '  - path: docs/.ownership.yml',
  '    owner: "@time"',
  '    skill: living-docs-bootstrap',
  '',
].join('\n');

const DECISOES = [
  '---',
  'title: Open Decisions',
  'owner: "@time"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-28',
  '---',
  '',
  '| ID | Lacuna | Status | Bloqueia | Aberta em |',
  '| --- | --- | --- | --- | --- |',
  '| DA-0001 | Como arredondar centavos | open | `src/cobranca/**` | 2026-08-28 |',
  '',
].join('\n');

test('critério 4 da spec §12: comportamento sem regra é perguntado na edição e reprovado no diff', () => {
  const arvore = {
    [OWNERSHIP_PATH]: DECISAO_BLOQUEANTE,
    CODEOWNERS: 'docs/    @time\n',
    'docs/open-decisions.md': DECISOES,
  };

  const git = (changed: string[], messages: string[]) => (args: readonly string[]): string =>
    args.includes('diff') ? changed.join(NUL) + NUL : messages.join(`${NUL}\n`) + NUL + '\n';

  withTempRepo(arvore, (root) => {
    // Metade 1 — na edição, HK-8 pergunta nomeando a decisão.
    const pergunta = decideHk8(
      { tool_name: 'Edit', tool_input: { file_path: 'src/cobranca/taxa.ts', old_string: 'a', new_string: 'b' } },
      { root, hostRoots: [root] },
    );
    assert.equal(pergunta.action, 'ask');
    assert.match(pergunta.action === 'ask' ? pergunta.reason : '', /DA-0001/);

    // Metade 2 — no diff, CI-7 reprova.
    const reprovado = runValidate(root, 'origin/master', git(['src/cobranca/taxa.ts'], ['feat: centavos']));
    const finding = reprovado.findings.find((f) => f.ruleId === 'CI-7' && /DA-0001/.test(f.message));
    assert.ok(finding, JSON.stringify(reprovado.findings, null, 2));
    assert.equal(reprovado.exitCode, 1);

    // E a razão escrita é a única saída.
    const comRazao = git(
      ['src/cobranca/taxa.ts'],
      ['refactor: renomeia interno\n\nDocs: none — não é a implementação da regra que falta'],
    );
    assert.equal(runValidate(root, 'origin/master', comRazao).exitCode, 0);

    // Sem base, esta metade não roda.
    assert.equal(runValidate(root).exitCode, 0);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="critério 4"
```

Esperado: FALHA na metade 2 — `CI-7` não conhece reivindicação.

- [ ] **Step 3: Implementar a sexta classe no `CI-7`**

Em `src/checks/ci7-ownership-coverage.ts`, dentro do mesmo
`if (diff !== null && docsExceptionReason(diff.messages) === null)`, logo depois
do laço de `pendingDocs`:

```typescript
        // 6 — caminho reivindicado por decisão aberta (`RN-0026`).
        for (const { claim, matched } of claimsFor(blockedClaims(context.docs), diff.changed)) {
          const levados =
            matched.slice(0, 5).join(', ') + (matched.length > 5 ? `, … (+${matched.length - 5})` : '');

          findings.push(
            error(
              claim.doc,
              claim.line,
              `O diff \`${diff.base}...HEAD\` toca caminho reivindicado por ${claim.id}, que está \`open\`` +
                `${claim.gap === null ? '' : ` — "${claim.gap}"`}: ${levados}.`,
              `Resolva ${claim.id} antes de implementar (skill dona: ${claim.skill}) — enquanto a decisão está ` +
                'aberta não há regra, e a saída é o ID, não o código. Se esta mudança não é a implementação da ' +
                'regra que falta, escreva a razão numa mensagem de commit, no formato `Docs: none — <razão>` ' +
                '(`RN-0026`, `ADR-0010`).',
            ),
          );
        }
```

Com o import `import { blockedClaims, claimsFor } from '../docs/blocked.ts';` e o
comentário de cabeçalho da função atualizado: passam a ser **seis** classes de
achado, e a sexta é `RN-0026`.

- [ ] **Step 4: Catálogo e contrato regerado**

Em `src/checks/catalog.ts`, o `failsWhen` de `CI-7` ganha a cláusula final:

```typescript
      'Documento do corpus sem entrada no `.ownership.yml` ou sem linha no CODEOWNERS; regra de `watches` cujo `doc` não existe ou não tem dono; contrato do agente repetindo frase de artefato dono; item da Definition of Done sem verificação nomeada; e, com `--base <ref>`, caminho vigiado alterado sem o doc dono, ou caminho reivindicado por decisão aberta — os dois liberados por `Docs: none — <razão>`.',
```

Regere o contrato (nunca o edite à mão — `HK-2` nega):

```bash
docker compose exec toolkit node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md
./bin/living-docs drift
```

Esperado: `drift` sem finding.

- [ ] **Step 5: Rodar tudo**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate --base origin/master
```

- [ ] **Step 6: CHANGELOG e commit**

Sob `### Changed` de `CHANGELOG.md`:

```markdown
- `CI-7` ganha uma sexta classe de achado: com `--base <ref>`, o diff que toca caminho reivindicado por uma decisão aberta reprova. A saída continua sendo `Docs: none — <razão>`.
```

```bash
git add src/checks/ci7-ownership-coverage.ts src/checks/catalog.ts docs/contracts/checks.gen.md \
        test/checks/ci7-ownership-coverage.test.ts test/acceptance/spec-criteria.test.ts CHANGELOG.md
git commit -m "feat(RN-0026): o diff que toca caminho de decisao aberta reprova no CI-7"
```

---

### Task 11: `CI-9` — a disciplina do commit vira check

**Objetivo:** `L-5` e a primeira metade de `L-8`. Duas regras que a spec
original escreveu e não alocou a peça nenhuma passam a ter enforcement: o bump
em massa de `last-reviewed` (§2 regra 3, §13) e o commit que altera artefato sem
citar o ID afetado (§11). Fecha os critérios de aceite 7 e 8.

**Files:**
- Modify: `src/git/diff.ts` (`FileEdit`, `changedLines`)
- Modify: `src/config/ownership.ts` (`last-reviewed-bump-limit`)
- Create: `src/checks/ci9-commit-discipline.ts`
- Modify: `src/checks/registry.ts` (`CommitFacts`, `ci9` na lista de `validate`)
- Modify: `src/cli/validate.ts` (o terceiro fato do diff)
- Modify: `src/checks/catalog.ts` (entrada de `CI-9`)
- Modify: `docs/contracts/checks.gen.md` (**regerado**, nunca editado)
- Modify: `docs/definition-of-done.md` (a linha da citação deixa de ser humana)
- Create: `test/checks/ci9-commit-discipline.test.ts`
- Modify: `test/git/diff.test.ts`, `test/config/ownership.test.ts`,
  `test/checks/registry.test.ts`
- Modify: `test/acceptance/spec-criteria.test.ts` (critérios 7 e 8)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consome: `DiffFacts` (`src/checks/ci6-changelog-required.ts`), `git()` e
  `runGitDiff` (`src/git/diff.ts`), `findArtifactRule`, `parseId`,
  `canonicalId`, `findCitations`.
- Produz:
  - `interface FileEdit { path: string; added: string[]; removed: string[] }`
  - `changedLines(root: string, base: string, run?: GitRunner): FileEdit[]`
  - `interface CommitFacts extends DiffFacts { edits: readonly FileEdit[] }`
  - `isPureDateBump(edit: FileEdit): boolean`
  - `declaredIds(doc: ArtifactDoc, format: IdFormat): string[]` — canônicos
  - `ci9CommitDiscipline(facts: CommitFacts | null): Check`
  - `OwnershipConfig.lastReviewedBumpLimit: number` e `DEFAULT_BUMP_LIMIT`
  - `validateChecks(diff: CommitFacts | null)` — a assinatura estreita

**Requisitos:**
- **O check só existe com diff.** Sem `--base` não há commit para ler, e
  inventar um produziria achado sobre mudança que não é desta branch — a mesma
  regra das duas metades do diff no `CI-7` (`ADR-0010`).
- **A unidade é o diff da branch, não o commit** (`ADR-0013`). Dividir o bump em
  três commits não o torna revisão de verdade.
- **A metade do bump não tem rótulo de exceção** (`ADR-0013`, `RN-0027`). Um
  rótulo aqui seria a caixinha marcada que o anti-requisito da §13 descreve.
- **Nenhum ID é montado por concatenação** (`RN-0024`): a citação se compara por
  `canonicalId`, e quem lê a forma escrita é `findCitations(source, idFormat)`.
- O limiar entra em `docs/.ownership.yml` como `last-reviewed-bump-limit`,
  inteiro **maior ou igual a 2**, padrão 3. Limiar 1 reprovaria a revisão
  legítima de um documento só, que é o mecanismo funcionando.
- `CI-9` entra no catálogo, e o catálogo é contrato gerado: **regere**
  `docs/contracts/checks.gen.md` pelo gerador. `HK-2` nega a edição à mão.

**`HK-5`:** `src/checks/**` e `src/git/**` pedem `docs/requirements/rules.md`
(`RN-0027` e `RN-0028` viajaram na Task 2); `src/checks/catalog.ts` pede
`docs/contracts/checks.gen.md` e `CHANGELOG.md`; `src/cli/**` e
`src/config/ownership.ts` pedem `docs/requirements/functional.md` e
`CHANGELOG.md`. O contrato é regerado no Step 9 e o CHANGELOG entra no Step 13.

- [x] **Step 1: Escrever o teste do parser de linhas (falha)**

Acrescente a `test/git/diff.test.ts`, e ao import do topo acrescente
`changedLines`:

```typescript
const PATCH = [
  'diff --git a/docs/glossary.md b/docs/glossary.md',
  'index 1111111..2222222 100644',
  '--- a/docs/glossary.md',
  '+++ b/docs/glossary.md',
  '@@ -6 +6 @@',
  '-last-reviewed: 2026-01-01',
  '+last-reviewed: 2026-08-31',
  'diff --git a/docs/apagado.md b/docs/apagado.md',
  'deleted file mode 100644',
  '--- a/docs/apagado.md',
  '+++ /dev/null',
  '@@ -1,2 +0,0 @@',
  '-titulo',
  '--- isto e conteudo removido, nao cabecalho',
  '',
].join('\n');

test('RN-0027: changedLines separa por arquivo e nao confunde conteudo com cabecalho', () => {
  const git = fake(PATCH);
  const edits = changedLines('/repo', 'origin/master', git.run);

  // O arquivo apagado nao vira edicao: `+++ /dev/null` nao abre secao, e as
  // linhas removidas dele nao vazam para o arquivo anterior.
  assert.deepEqual(edits, [
    {
      path: 'docs/glossary.md',
      added: ['last-reviewed: 2026-08-31'],
      removed: ['last-reviewed: 2026-01-01'],
    },
  ]);

  assert.deepEqual(git.calls[0], [
    '-c',
    'safe.directory=*',
    '-c',
    'core.quotePath=false',
    'diff',
    '--unified=0',
    '--no-color',
    '--no-renames',
    'origin/master...HEAD',
  ]);
});
```

- [x] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="changedLines"
```

Esperado: FALHA — `changedLines` não é exportado.

- [x] **Step 3: Implementar `changedLines`**

Ao fim de `src/git/diff.ts`:

```typescript
/** O que um arquivo ganhou e perdeu neste diff. Ordem de leitura, sem contexto. */
export interface FileEdit {
  /** Caminho relativo à raiz, sempre com `/`. */
  path: string;
  added: string[];
  removed: string[];
}

/** Só o cabeçalho de destino abre seção — `+++ /dev/null` (remoção) não abre. */
const FILE_HEADER = /^\+\+\+ b\/(.+)$/;

/**
 * O diff linha a linha, por arquivo (`RN-0027`).
 *
 * `--unified=0` porque a pergunta é "o que mudou", e não "em volta de quê":
 * linha de contexto aqui só aumentaria o texto a percorrer no PR (`RNF-0005`).
 * `--no-renames` para que renomear não vire um par de arquivos fantasma, e
 * `core.quotePath=false` pela mesma razão do `-z` de `changedPaths` — caminho
 * com acento escapado não casa com caminho nenhum.
 *
 * O estado `inHunk` não é zelo: uma linha **removida** cujo conteúdo começa com
 * `--` é escrita como `--- ...`, idêntica a um cabeçalho de origem. Só depois de
 * um `@@` uma linha é conteúdo.
 */
export function changedLines(root: string, base: string, run: GitRunner = runGitDiff): FileEdit[] {
  const output = git(
    ['-c', 'core.quotePath=false', 'diff', '--unified=0', '--no-color', '--no-renames', `${base}...HEAD`],
    root,
    run,
    `git diff --unified=0 ${base}...HEAD`,
  );

  const edits: FileEdit[] = [];
  let current: FileEdit | null = null;
  let inHunk = false;

  for (const line of output.split('\n')) {
    if (line.startsWith('diff --git ')) {
      current = null;
      inHunk = false;
      continue;
    }
    if (line.startsWith('@@')) {
      inHunk = true;
      continue;
    }
    if (!inHunk) {
      const path = FILE_HEADER.exec(line)?.[1];
      if (path !== undefined) {
        current = { path: path.replace(/\\/g, '/'), added: [], removed: [] };
        edits.push(current);
      }
      continue;
    }
    if (current === null) continue;
    if (line.startsWith('+')) current.added.push(line.slice(1));
    else if (line.startsWith('-')) current.removed.push(line.slice(1));
  }

  return edits;
}
```

- [x] **Step 4: Rodar e ver passar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="changedLines"
```

Esperado: PASSA.

- [x] **Step 5: Escrever o teste do `CI-9` (falha)**

Crie `test/checks/ci9-commit-discipline.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ci9CommitDiscipline, isPureDateBump } from '../../src/checks/ci9-commit-discipline.ts';
import { parseOwnership } from '../../src/config/ownership.ts';
import { collectArtifacts } from '../../src/docs/collect.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@time"
    skill: requirements-keeper
    collection: sections
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
`;

const REGRAS = [
  '---',
  'title: Regras',
  'owner: "@time"',
  'trigger: Antes de implementar comportamento novo.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '## RN-0001 — Centavos arredondam para cima',
  '',
  '- **status:** active',
  '',
  'Prosa.',
  '',
].join('\n');

const ARVORE = { 'docs/requirements/rules.md': REGRAS };

function contextFor(root: string, ownership = OWNERSHIP) {
  const config = parseOwnership(ownership);
  return { root, config, docs: collectArtifacts(root, config), documents: [], today: '2026-08-31' };
}

/** Uma edição que só mexeu na data de revisão. */
function bump(path: string) {
  return { path, added: ['last-reviewed: 2026-08-31'], removed: ['last-reviewed: 2026-01-01'] };
}

test('RN-0027: tres documentos que so mudaram a data reprovam, nomeando o anti-requisito', () => {
  withTempRepo(ARVORE, (root) => {
    const findings = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md', 'docs/c.md'],
      messages: ['chore: revisao da documentacao'],
      edits: [bump('docs/a.md'), bump('docs/b.md'), bump('docs/c.md')],
    }).run(contextFor(root));

    const bumpFinding = findings.find((f) => /last-reviewed/.test(f.message));
    assert.ok(bumpFinding, JSON.stringify(findings, null, 2));
    assert.equal(bumpFinding?.ruleId, 'CI-9');
    assert.equal(bumpFinding?.severity, 'error');
    assert.match(bumpFinding?.message ?? '', /docs\/a\.md/);
    assert.match(bumpFinding?.message ?? '', /docs\/c\.md/);
  });
});

test('RN-0027: dois bumps passam, e documento que mudou de verdade nunca conta', () => {
  withTempRepo(ARVORE, (root) => {
    const doisBumps = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md'],
      messages: ['docs: revisao'],
      edits: [bump('docs/a.md'), bump('docs/b.md')],
    }).run(contextFor(root));
    assert.deepEqual(doisBumps.filter((f) => /last-reviewed/.test(f.message)), []);

    // Tres documentos tocados, mas um deles mudou no corpo: revisao de verdade.
    const comCorpo = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md', 'docs/c.md'],
      messages: ['docs: revisao'],
      edits: [
        bump('docs/a.md'),
        bump('docs/b.md'),
        {
          path: 'docs/c.md',
          added: ['last-reviewed: 2026-08-31', 'paragrafo novo'],
          removed: ['last-reviewed: 2026-01-01'],
        },
      ],
    }).run(contextFor(root));
    assert.deepEqual(comCorpo.filter((f) => /last-reviewed/.test(f.message)), []);
  });
});

test('RN-0027: o limiar e configuravel, e o padrao e tres', () => {
  withTempRepo(ARVORE, (root) => {
    const facts = {
      base: 'origin/master',
      changed: ['docs/a.md', 'docs/b.md'],
      messages: ['docs: revisao'],
      edits: [bump('docs/a.md'), bump('docs/b.md')],
    };
    const comLimiar2 = ci9CommitDiscipline(facts).run(
      contextFor(root, `${OWNERSHIP}last-reviewed-bump-limit: 2\n`),
    );
    assert.ok(comLimiar2.some((f) => /last-reviewed/.test(f.message)));
  });
});

test('RN-0028: commit que altera artefato sem citar o ID declarado nele reprova', () => {
  withTempRepo(ARVORE, (root) => {
    const findings = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/requirements/rules.md'],
      messages: ['docs: ajusta a prosa da regra'],
      edits: [],
    }).run(contextFor(root));

    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.file, 'docs/requirements/rules.md');
    assert.match(findings[0]?.message ?? '', /RN-0001/);
    assert.match(findings[0]?.fix ?? '', /mensagem de commit/);
  });
});

test('RN-0028: basta uma mensagem do diff citar um dos IDs do arquivo', () => {
  withTempRepo(ARVORE, (root) => {
    const findings = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['docs/requirements/rules.md'],
      messages: ['chore: mexe em outra coisa', 'docs(RN-0001): a regra ganha o caso do negativo'],
      edits: [],
    }).run(contextFor(root));

    assert.deepEqual(findings, []);
  });
});

test('RN-0028: arquivo que nao e artefato, e artefato ausente, nao sao cobrados', () => {
  withTempRepo(ARVORE, (root) => {
    const findings = ci9CommitDiscipline({
      base: 'origin/master',
      changed: ['src/cli/index.ts', 'docs/decisions/adr/ADR-0001-apagado.md'],
      messages: ['refactor: renomeia interno'],
      edits: [],
    }).run(contextFor(root));

    assert.deepEqual(findings, []);
  });
});

test('RN-0024: a citacao e comparada por identidade, nao pela forma escrita', () => {
  withTempRepo(
    { 'docs/requirements/rules.md': REGRAS.replace('## RN-0001', '## RN001') },
    (root) => {
      // O projeto escreve `RN001`; o commit cita `RN001`. Mesma identidade que
      // `RN-0001` teria — e quem compara e `canonicalId`, nao a forma escrita.
      const findings = ci9CommitDiscipline({
        base: 'origin/master',
        changed: ['docs/requirements/rules.md'],
        messages: ['docs(RN001): a regra ganha o caso do negativo'],
        edits: [],
      }).run(contextFor(root, `${OWNERSHIP}id-format:\n  separator: ""\n  padding: 3\n`));

      assert.deepEqual(findings, []);
    },
  );
});

test('ADR-0010: sem diff, CI-9 nao tem o que dizer', () => {
  withTempRepo(ARVORE, (root) => {
    assert.deepEqual(ci9CommitDiscipline(null).run(contextFor(root)), []);
  });
});

test('RN-0027: isPureDateBump e so a data, e nada mais', () => {
  assert.equal(isPureDateBump(bump('docs/a.md')), true);
  assert.equal(
    isPureDateBump({ path: 'docs/a.md', added: ['last-reviewed: x', 'outra'], removed: ['last-reviewed: y'] }),
    false,
  );
  assert.equal(isPureDateBump({ path: 'docs/a.md', added: ['titulo'], removed: ['titulo antigo'] }), false);
});
```

- [x] **Step 6: Rodar e ver falhar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0027|RN-0028"
```

Esperado: FALHA — `src/checks/ci9-commit-discipline.ts` não existe.

- [x] **Step 7: Acrescentar o limiar ao `.ownership.yml`**

Em `src/config/ownership.ts`, no `OwnershipConfig`, logo abaixo de
`staleAfterMonths`:

```typescript
  /** Quantos documentos com bump de data seco reprovam (`ADR-0013`, `RN-0027`). */
  lastReviewedBumpLimit: number;
```

Antes de `parseOwnership`:

```typescript
/**
 * O limiar de bump em massa (`ADR-0013`). Piso 2, e não 1: um documento revisado
 * de verdade atualiza a data, e limiar 1 reprovaria o mecanismo funcionando.
 */
export const DEFAULT_BUMP_LIMIT = 3;

function parseBumpLimit(raw: unknown): number {
  if (raw === undefined || raw === null) return DEFAULT_BUMP_LIMIT;
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 2) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: last-reviewed-bump-limit "${String(raw)}" precisa ser inteiro maior ou igual a 2 ` +
        '(limiar 1 reprovaria a revisão legítima de um documento só — ADR-0013).',
    );
  }
  return raw;
}
```

E no `return` de `parseOwnership`, junto de `staleAfterMonths`:

```typescript
    lastReviewedBumpLimit: parseBumpLimit(root['last-reviewed-bump-limit']),
```

Acrescente a `test/config/ownership.test.ts`:

```typescript
test('RN-0027: last-reviewed-bump-limit tem padrao 3 e piso 2', () => {
  const base = 'version: 1\nartifacts:\n  - id-prefix: ADR\n    path: docs/adr/\n    owner: "@t"\n    skill: s\n';
  assert.equal(parseOwnership(base).lastReviewedBumpLimit, 3);
  assert.equal(parseOwnership(`${base}last-reviewed-bump-limit: 5\n`).lastReviewedBumpLimit, 5);
  assert.throws(() => parseOwnership(`${base}last-reviewed-bump-limit: 1\n`), /maior ou igual a 2/);
});
```

- [x] **Step 8: Implementar `CI-9`**

Crie `src/checks/ci9-commit-discipline.ts`:

```typescript
import type { Check, CheckContext, Finding } from '../core/types.ts';
import type { DiffFacts } from './ci6-changelog-required.ts';
import type { FileEdit } from '../git/diff.ts';
import type { ArtifactDoc } from '../docs/collect.ts';
import { findArtifactRule } from '../config/ownership.ts';
import { canonicalId, parseId } from '../docs/schema.ts';
import type { IdFormat } from '../docs/schema.ts';
import { findCitations } from '../ids/citations.ts';

const RULE = 'CI-9';

/**
 * O diff com as linhas, e não só os caminhos. É o fato a mais que `CI-9` pede e
 * que `CI-6` e `CI-7` não precisam — por isso um tipo próprio, e não um campo
 * opcional em `DiffFacts`: campo opcional que alguém esquece de preencher vira
 * check que se cala sem dizer que se calou.
 */
export interface CommitFacts extends DiffFacts {
  edits: readonly FileEdit[];
}

const LAST_REVIEWED = /^\s*last-reviewed\s*:/i;

/** A edição mexeu na data de revisão e em mais nada (`RN-0027`). */
export function isPureDateBump(edit: FileEdit): boolean {
  return (
    edit.added.length === 1 &&
    edit.removed.length === 1 &&
    LAST_REVIEWED.test(edit.added[0] ?? '') &&
    LAST_REVIEWED.test(edit.removed[0] ?? '')
  );
}

/**
 * Os IDs que este arquivo declara, em forma canônica (`RN-0024`). Artefato
 * individual declara um no frontmatter; coleção declara um por item.
 */
export function declaredIds(doc: ArtifactDoc, format: IdFormat): string[] {
  const raw: unknown[] =
    doc.rule.collection === 'per-file' ? [doc.frontmatter?.data?.id] : doc.items.map((item) => item.id);

  const ids: string[] = [];
  for (const value of raw) {
    const parsed = parseId(value, format);
    if (parsed !== null) ids.push(canonicalId(parsed));
  }
  return ids;
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '');
}

function error(file: string, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line: 0, severity: 'error', message, fix };
}

/**
 * `CI-9` — commit discipline. Duas metades, as duas lidas do diff da branch: o
 * bump em massa de `last-reviewed` (`RN-0027`, anti-requisito da spec §13) e o
 * commit que altera artefato sem citar o ID afetado (`RN-0028`, spec §11).
 *
 * Roda no grupo que já recebe o diff por injeção, pela mesma razão de `CI-6` e
 * da metade do diff de `CI-7`: sem base não há commit para ler, e inventar um
 * produziria achado sobre mudança que não é desta branch (`ADR-0010`).
 *
 * A unidade das duas metades é o **diff da branch**, não o commit: é a unidade
 * que o CI tem, e partir um bump em três commits não o torna revisão de verdade
 * (`ADR-0013`).
 */
export function ci9CommitDiscipline(facts: CommitFacts | null): Check {
  return {
    id: RULE,
    name: 'commit discipline',
    run(context: CheckContext): Finding[] {
      if (facts === null) return [];
      const findings: Finding[] = [];
      const { config } = context;

      // 1 — bump em massa de `last-reviewed` (`RN-0027`).
      // Sem rótulo de exceção, de propósito: o rótulo seria a caixinha marcada
      // que o anti-requisito da spec §13 descreve (`ADR-0013`).
      const bumps = facts.edits.filter(isPureDateBump).map((edit) => normalizePath(edit.path));
      if (bumps.length >= config.lastReviewedBumpLimit) {
        const lista = bumps.slice(0, 5).join(', ') + (bumps.length > 5 ? `, … (+${bumps.length - 5})` : '');
        findings.push(
          error(
            bumps[0] ?? '',
            `O diff \`${facts.base}...HEAD\` altera a data de revisão de ${bumps.length} documentos e nada mais ` +
              `no corpo de nenhum deles (limiar: ${config.lastReviewedBumpLimit}): ${lista}.`,
            'Um documento revisado de verdade muda em mais do que a data — bump em massa é o mecanismo de revisão ' +
              'sendo desligado enquanto se finge cumpri-lo. Reverta a data dos que não foram revisados, ou revise-os ' +
              '(`RN-0027`, `ADR-0013`; o limiar é `last-reviewed-bump-limit` no `.ownership.yml`).',
          ),
        );
      }

      // 2 — commit que altera artefato sem citar o ID afetado (`RN-0028`).
      const citados = new Set<string>();
      for (const message of facts.messages) {
        for (const citation of findCitations(message, config.idFormat)) {
          const parsed = parseId(citation.id, config.idFormat);
          if (parsed !== null) citados.add(canonicalId(parsed));
        }
      }

      for (const path of facts.changed.map(normalizePath)) {
        if (findArtifactRule(config, path) === null) continue;
        const doc = context.docs.find((candidate) => candidate.file === path);
        if (doc === undefined) continue; // apagado no diff: não há ID a citar

        const ids = declaredIds(doc, config.idFormat);
        if (ids.length === 0) continue; // arquivo de artefato sem item: nada a citar
        if (ids.some((id) => citados.has(id))) continue;

        const lista = ids.slice(0, 5).join(', ') + (ids.length > 5 ? `, … (+${ids.length - 5})` : '');
        findings.push(
          error(
            path,
            `O diff \`${facts.base}...HEAD\` altera \`${path}\` e nenhuma mensagem de commit cita um dos IDs ` +
              `declarados nele (${lista}).`,
            'Cite o ID afetado na mensagem de commit — o formato deste projeto está em `CONTRIBUTING.md`. É a ' +
              'citação que torna o `git log` navegável por regra: sem ela o histórico responde "o que mudou" e ' +
              `nunca "por causa de qual regra" (\`RN-0028\`; skill dona: ${doc.rule.skill}).`,
          ),
        );
      }

      return findings;
    },
  };
}
```

- [x] **Step 9: Ligar no `validate`, no catálogo e regerar o contrato**

Em `src/checks/registry.ts`, importe `ci9CommitDiscipline` e o tipo
`CommitFacts`, troque o tipo do parâmetro e acrescente o check:

```typescript
export function validateChecks(diff: CommitFacts | null = null): readonly Check[] {
  return [
    ci1Structure,
    ci2Ids,
    ci3Traceability,
    ci4Staleness,
    ci7OwnershipCoverage(diff),
    ci8Links,
    ci9CommitDiscipline(diff),
  ];
}
```

E reexporte o tipo junto de `CatalogEntry`:

```typescript
export type { CatalogEntry, CommitFacts };
```

Em `src/cli/validate.ts`, importe `changedLines` e acrescente o terceiro fato:

```typescript
  const diff =
    base === null
      ? null
      : {
          base,
          changed: changedPaths(root, base, run),
          messages: commitMessages(root, base, run),
          edits: changedLines(root, base, run),
        };
```

Em `src/checks/catalog.ts`, ao fim do array:

```typescript
  {
    id: 'CI-9',
    name: 'commit discipline',
    command: 'living-docs validate',
    failsWhen:
      'Com `--base <ref>`: o diff altera apenas a data de revisão de `last-reviewed-bump-limit` documentos ou mais, sem outra mudança no corpo de nenhum deles; ou altera um arquivo de artefato e nenhuma mensagem de commit do diff cita um dos IDs declarados nele.',
  },
```

Atualize os três testes de `test/checks/registry.test.ts` que enumeram os
checks: o mapa `esperado` ganha `'CI-9': 'living-docs validate'`, as duas
`assert.deepEqual` de IDs passam a esperar
`['CI-1', 'CI-2', 'CI-3', 'CI-4', 'CI-7', 'CI-8', 'CI-9']`, e no teste
`RF-0011` o diff de exemplo ganha `edits: []`.

Regere o contrato (nunca o edite à mão — `HK-2` nega):

```bash
docker compose exec toolkit node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md
./bin/living-docs drift
```

Esperado: `drift` sem finding.

- [x] **Step 10: O teste de aceite dos critérios 7 e 8**

Acrescente a `test/acceptance/spec-criteria.test.ts`. Note a forma do git falso:
ele agora despacha **três** comandos, porque `validate --base` faz três
perguntas ao git — caminhos, mensagens e linhas.

```typescript
const fakeGit =
  (changed: string[], messages: string[], patch = '') =>
  (args: readonly string[]): string => {
    if (args.includes('log')) return messages.join(`${NUL}\n`) + NUL + '\n';
    if (args.includes('--unified=0')) return patch;
    return changed.join(NUL) + NUL;
  };

const bumpPatch = (paths: string[]): string =>
  paths
    .flatMap((path) => [
      `diff --git a/${path} b/${path}`,
      `--- a/${path}`,
      `+++ b/${path}`,
      '@@ -5 +5 @@',
      '-last-reviewed: 2026-01-01',
      '+last-reviewed: 2026-08-31',
    ])
    .join('\n');

const REGRAS_COM_RN_0001 = [
  '---',
  'title: Regras',
  'owner: "@time"',
  'trigger: Antes de implementar comportamento novo.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '## RN-0001 — Centavos arredondam para cima',
  '',
  '- **status:** draft',
  '',
  'Prosa.',
  '',
].join('\n');

const OWNERSHIP_COM_REGRAS = [
  'version: 1',
  'artifacts:',
  '  - id-prefix: RN',
  '    path: docs/requirements/rules.md',
  '    owner: "@time"',
  '    skill: requirements-keeper',
  '    collection: sections',
  'documents:',
  '  - path: docs/.ownership.yml',
  '    owner: "@time"',
  '    skill: living-docs-bootstrap',
  '',
].join('\n');

test('criterios 7 e 8 da spec §12: a disciplina do commit e cobrada no CI', () => {
  const arvore = {
    [OWNERSHIP_PATH]: OWNERSHIP_COM_REGRAS,
    CODEOWNERS: 'docs/    @time\n',
    'docs/requirements/rules.md': REGRAS_COM_RN_0001,
  };

  withTempRepo(arvore, (root) => {
    // Criterio 7 — tres documentos que so mudaram a data.
    const bumps = ['docs/a.md', 'docs/b.md', 'docs/c.md'];
    const massa = runValidate(
      root,
      'origin/master',
      fakeGit(bumps, ['chore: revisao geral'], bumpPatch(bumps)),
    );
    const bumpFinding = massa.findings.find((f) => f.ruleId === 'CI-9' && /last-reviewed/.test(f.message));
    assert.ok(bumpFinding, JSON.stringify(massa.findings, null, 2));
    assert.equal(massa.exitCode, 1);

    // Criterio 8 — artefato alterado sem o ID na mensagem.
    const semCitacao = runValidate(
      root,
      'origin/master',
      fakeGit(['docs/requirements/rules.md'], ['docs: ajusta a prosa']),
    );
    assert.ok(
      semCitacao.findings.some((f) => f.ruleId === 'CI-9' && /RN-0001/.test(f.message)),
      JSON.stringify(semCitacao.findings, null, 2),
    );

    // E citar o ID em qualquer commit do diff basta.
    const comCitacao = runValidate(
      root,
      'origin/master',
      fakeGit(['docs/requirements/rules.md'], ['docs(RN-0001): o caso do negativo']),
    );
    assert.deepEqual(comCitacao.findings.filter((f) => f.ruleId === 'CI-9'), []);

    // Sem base, CI-9 nao roda.
    assert.deepEqual(runValidate(root).findings.filter((f) => f.ruleId === 'CI-9'), []);
  });
});
```

Se `OWNERSHIP_PATH`, `NUL` ou `withTempRepo` já estiverem importados no arquivo,
não os duplique.

- [x] **Step 11: Rodar tudo e consertar o que a mudança revelou**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate --base origin/master
```

Dois efeitos esperados, e os dois são o check funcionando:

1. Todo teste que chamava `runValidate(root, base, fake)` com um runner de saída
   única passa a receber essa mesma saída na pergunta `--unified=0`. Troque-os
   pela forma de `fakeGit` do Step 10 — despachar por argumento, não por
   posição.
2. Se `validate --base origin/master` acusar `CI-9` num artefato desta branch,
   **não** afrouxe o check nem baixe o limiar: a mensagem daquele commit é que
   não citou o ID, e o caminho é citá-lo no commit seguinte.

- [x] **Step 12: A Definition of Done deixa de chamar isto de humano**

Em `docs/definition-of-done.md`, troque a linha da citação:

```markdown
- [ ] A mensagem de commit cita o ID afetado — verificação: `CI-9` (`living-docs validate --base <ref>`).
```

E na última linha da lista, troque o conjunto nomeado para
``verificação: `CI-1` a `CI-9`, rodados pelo workflow do repositório.``

- [x] **Step 13: CHANGELOG e commit**

Sob `### Added` de `CHANGELOG.md`:

```markdown
- `CI-9` (`living-docs validate --base <ref>`): reprova o diff que só altera a
  data de revisão de vários documentos, e o que altera um arquivo de artefato sem
  que nenhuma mensagem de commit cite um ID declarado nele.
- `last-reviewed-bump-limit` em `docs/.ownership.yml`: quantos documentos com
  bump de data seco reprovam. Padrão 3, piso 2.
```

```bash
git add src/git/diff.ts src/config/ownership.ts src/checks/ci9-commit-discipline.ts \
        src/checks/registry.ts src/checks/catalog.ts src/cli/validate.ts \
        docs/contracts/checks.gen.md docs/definition-of-done.md \
        test/checks/ci9-commit-discipline.test.ts test/checks/registry.test.ts \
        test/git/diff.test.ts test/config/ownership.test.ts \
        test/acceptance/spec-criteria.test.ts CHANGELOG.md
git commit -m "feat(RN-0027, RN-0028): CI-9 cobra bump em massa e ID na mensagem de commit"
```

---

### Task 12: `CI-10` — o gatilho do artefato e a `description` da skill dona dizem a mesma coisa

**Objetivo:** `L-6`. A §11 da spec original diz que os dois "dizem a mesma
coisa" e nada compara: `test/plugin/authoring.test.ts` valida a `description`,
`CI-1` valida o `trigger`, e nada cruza os dois. Fecha o critério de aceite 9.

**Files:**
- Create: `src/checks/ci10-trigger-routing.ts`
- Modify: `src/checks/registry.ts` (`ci10` na lista de `validate`)
- Modify: `src/checks/catalog.ts` (entrada de `CI-10`)
- Modify: `docs/contracts/checks.gen.md` (**regerado**, nunca editado)
- Modify: `docs/decisions/adr/ADR-0013-os-dois-limiares-do-fechamento.md`
  (a calibração, agora medida)
- Modify: `docs/definition-of-done.md` (o conjunto nomeado na última linha)
- Create: `test/checks/ci10-trigger-routing.test.ts`
- Modify: `test/checks/registry.test.ts`
- Modify: `test/acceptance/spec-criteria.test.ts` (critério 9)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consome: `normalizeProse` (`src/docs/markdown.ts`), `parseFrontmatter`,
  `toolkitRoot`, `ArtifactDoc`/`DocumentDoc`.
- Produz:
  - `SHARED_ROOTS_FLOOR`, `ROOT_FLOOR`, `ROOT_LENGTH` — os três números de
    `ADR-0013`, exportados para o teste os citar em vez de repetir
  - `rootsOf(text: string): Set<string>`
  - `sharedRoots(trigger: string, description: string): string[]`
  - `loadSkillDescriptions(root?: string): Map<string, string>`
  - `routedDocs(context: CheckContext): RoutedDoc[]`
  - `ci10TriggerRouting(descriptions?: ReadonlyMap<string, string>): Check`

**Requisitos:**
- **Só o gatilho do documento entra** (`ADR-0013`). Artefato `per-file` fica de
  fora: cada arquivo dele é um **item**, e o `trigger` de um ADR é "Nunca.
  Imutável após aceito", que é do item e não do artefato. Entram os containers
  de coleção (`table`, `sections`) e as entradas de `documents:` que declaram
  skill.
- **Documento sem `trigger` não é achado.** `CI-1` não lê `documents:`, e
  `CHANGELOG.md` e `CLAUDE.md` legitimamente não têm frontmatter com gatilho.
- **Skill dona ausente da raiz do toolkit avisa e segue** (`RN-0029`). É a única
  exceção ao "só `CI-4` avisa" da spec §9, e existe porque um projeto pode
  declarar skill própria: reprovar por isso seria o check exigindo que todo dono
  fosse do plugin.
- **Nenhuma contagem de volume.** O check conta **divergência entre duas coisas
  que deveriam concordar**, não documentos, linhas nem cobertura (spec §13).
- O limiar mora no código, exportado e citando `ADR-0013` — é o precedente do
  `WORD_FLOOR` de `CI-7`.
- O leitor de `SKILL.md` mora **dentro** de `src/checks/ci10-trigger-routing.ts`,
  e não num diretório novo: `src/checks/**` já é caminho vigiado com doc dono
  (`docs/requirements/rules.md`), e criar `src/plugin/` inauguraria código de
  produção que nenhuma regra de `watches` cobre.

**`HK-5`:** `src/checks/**` pede `docs/requirements/rules.md` (`RN-0029` viajou
na Task 2); `src/checks/catalog.ts` pede `docs/contracts/checks.gen.md` e
`CHANGELOG.md`. O contrato é regerado no Step 5 e o CHANGELOG entra no Step 8.

- [x] **Step 1: Escrever o teste (falha)**

Crie `test/checks/ci10-trigger-routing.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ci10TriggerRouting,
  loadSkillDescriptions,
  rootsOf,
  sharedRoots,
  SHARED_ROOTS_FLOOR,
} from '../../src/checks/ci10-trigger-routing.ts';
import { parseOwnership } from '../../src/config/ownership.ts';
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts';
import { runValidate } from '../../src/cli/validate.ts';
import { toolkitRoot } from '../../src/core/roots.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@time"
    skill: decision-recorder
    collection: table
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
documents:
  - path: docs/glossary.md
    owner: "@time"
    skill: glossary-keeper
  - path: CHANGELOG.md
    owner: "@time"
    skill: release-historian
`;

const container = (trigger: string): string =>
  [
    '---',
    'title: Open Decisions',
    'owner: "@time"',
    `trigger: ${trigger}`,
    'last-reviewed: 2026-08-31',
    '---',
    '',
    '| ID | Lacuna | Status | Aberta em |',
    '| --- | --- | --- | --- |',
    '',
  ].join('\n');

const ADR_CONGELADO = [
  '---',
  'id: ADR-0001',
  'title: X',
  'status: draft',
  'owner: "@time"',
  'trigger: Nunca. Imutavel apos aceito; uma decisao nova o supersede.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  'corpo',
  '',
].join('\n');

const DESCRICOES = new Map([
  [
    'decision-recorder',
    'Use quando alguem trombar numa lacuna — comportamento sem regra escrita — ou quando tomar decisao custosa de reverter.',
  ],
  ['glossary-keeper', 'Use quando um termo de dominio novo aparecer em codigo, spec ou conversa.'],
]);

function contextFor(root: string) {
  const config = parseOwnership(OWNERSHIP);
  return {
    root,
    config,
    docs: collectArtifacts(root, config),
    documents: collectDocuments(root, config),
    today: '2026-08-31',
  };
}

test('RN-0029: gatilho e description que falam do mesmo evento passam', () => {
  const arvore = {
    'docs/open-decisions.md': container('Toda vez que alguem trombou numa lacuna — comportamento sem regra escrita.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
  };

  withTempRepo(arvore, (root) => {
    assert.deepEqual(ci10TriggerRouting(DESCRICOES).run(contextFor(root)), []);
  });
});

test('RN-0029: gatilho que fala de outro evento reprova, nomeando os dois', () => {
  const arvore = {
    'docs/open-decisions.md': container('Quando o deploy quebrar em producao.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
  };

  withTempRepo(arvore, (root) => {
    const findings = ci10TriggerRouting(DESCRICOES).run(contextFor(root));

    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.ruleId, 'CI-10');
    assert.equal(findings[0]?.severity, 'error');
    assert.equal(findings[0]?.file, 'docs/open-decisions.md');
    assert.match(findings[0]?.message ?? '', /decision-recorder/);
    assert.match(findings[0]?.message ?? '', /deploy quebrar/);
  });
});

test('ADR-0013: o trigger de um item nunca entra — artefato per-file fica fora', () => {
  const arvore = {
    'docs/open-decisions.md': container('Toda vez que alguem trombou numa lacuna — comportamento sem regra escrita.'),
    // "Nunca. Imutavel apos aceito" nao compartilha raiz nenhuma com a
    // description da decision-recorder, e ainda assim nao e achado.
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
  };

  withTempRepo(arvore, (root) => {
    const findings = ci10TriggerRouting(DESCRICOES).run(contextFor(root));
    assert.deepEqual(findings.filter((f) => f.file.startsWith('docs/decisions/')), []);
  });
});

test('RN-0029: skill dona ausente da raiz do toolkit avisa e segue', () => {
  const arvore = {
    'docs/open-decisions.md': container('Toda vez que alguem trombou numa lacuna — comportamento sem regra escrita.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
    'docs/glossary.md': [
      '---',
      'title: Glossario',
      'owner: "@time"',
      'trigger: Termo de dominio novo em codigo, spec ou conversa.',
      'last-reviewed: 2026-08-31',
      '---',
      '',
      'corpo',
      '',
    ].join('\n'),
  };

  // A description da glossary-keeper sai do mapa: e o repositorio que declarou
  // uma skill que a raiz do toolkit nao tem.
  const semGlossario = new Map([...DESCRICOES].filter(([name]) => name !== 'glossary-keeper'));

  withTempRepo(arvore, (root) => {
    const findings = ci10TriggerRouting(semGlossario).run(contextFor(root));

    assert.equal(findings.length, 1);
    assert.equal(findings[0]?.severity, 'warning');
    assert.equal(findings[0]?.file, 'docs/glossary.md');
    assert.match(findings[0]?.message ?? '', /glossary-keeper/);
  });
});

test('RN-0029: documento sem trigger no frontmatter nao e achado', () => {
  const arvore = {
    'docs/open-decisions.md': container('Toda vez que alguem trombou numa lacuna — comportamento sem regra escrita.'),
    'docs/decisions/adr/ADR-0001-x.md': ADR_CONGELADO,
    // CHANGELOG.md tem dono e skill e nao tem frontmatter. E legitimo.
    'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
  };

  withTempRepo(arvore, (root) => {
    assert.deepEqual(ci10TriggerRouting(DESCRICOES).run(contextFor(root)), []);
  });
});

test('ADR-0013: a raiz e a palavra de cinco letras ou mais, truncada em seis', () => {
  const raizes = rootsOf('Toda alterada de **regra**, com pontuacao!');
  assert.ok(raizes.has('altera'), [...raizes].join(', '));
  assert.ok(raizes.has('regra'));
  // "Toda" e "com" tem menos de cinco letras: nao sao raiz.
  assert.ok(!raizes.has('toda'));
  assert.ok(!raizes.has('com'));
  // O truncamento e o que faz "alterada" encontrar "alterar".
  assert.deepEqual(sharedRoots('regra alterada', 'a regra vai alterar'), ['regra', 'altera']);
});

test('ADR-0013: a raiz do toolkit e legivel, e os pares dela cabem no piso', () => {
  // Dogfooding, e e a calibracao do ADR-0013: se um par do proprio toolkit
  // ficar abaixo do piso, o numero esta errado — nao o documento.
  const descricoes = loadSkillDescriptions(toolkitRoot());
  assert.ok(descricoes.size >= 8, `so ${descricoes.size} skills lidas da raiz do toolkit`);
  assert.ok((descricoes.get('release-historian') ?? '').length > 0, 'description da release-historian nao foi lida');
  assert.ok(SHARED_ROOTS_FLOOR >= 2, 'o piso e escrito, e esta abaixo do que o ADR-0013 fixou');

  // Os doze pares deste repositorio, medidos pelo check e nao repetidos aqui:
  // repetir o `trigger` num teste seria a copia que RN-0010 recusa.
  const findings = runValidate(toolkitRoot()).findings.filter((f) => f.ruleId === 'CI-10');
  assert.deepEqual(
    findings.filter((f) => f.severity === 'error'),
    [],
    JSON.stringify(findings, null, 2),
  );
});
```

- [x] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0029"
```

Esperado: FALHA — `src/checks/ci10-trigger-routing.ts` não existe.

- [x] **Step 3: Implementar `CI-10`**

Crie `src/checks/ci10-trigger-routing.ts`:

```typescript
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Check, CheckContext, Finding } from '../core/types.ts';
import { normalizeProse } from '../docs/markdown.ts';
import { parseFrontmatter } from '../frontmatter/parse.ts';
import { toolkitRoot } from '../core/roots.ts';

const RULE = 'CI-10';

/** Palavra curta não é raiz: "toda", "com" e "que" casariam com tudo (`ADR-0009`). */
export const ROOT_FLOOR = 5;

/**
 * O truncamento é o que faz "alterada" encontrar "alterar" sem que o toolkit
 * aprenda português (`ADR-0013`).
 */
export const ROOT_LENGTH = 6;

/**
 * Quantas raízes o `trigger` e a `description` precisam compartilhar
 * (`ADR-0013`). Escrito aqui, e não escondido numa comparação, porque é número
 * calibrado: a correção de um falso positivo é um ADR novo, nunca uma exceção
 * local.
 */
export const SHARED_ROOTS_FLOOR = 2;

export function rootsOf(text: string): Set<string> {
  return new Set(
    normalizeProse(text)
      .split(' ')
      .filter((word) => word.length >= ROOT_FLOOR)
      .map((word) => word.slice(0, ROOT_LENGTH)),
  );
}

/** As raízes que os dois textos têm em comum, na ordem do primeiro. */
export function sharedRoots(trigger: string, description: string): string[] {
  const other = rootsOf(description);
  return [...rootsOf(trigger)].filter((root) => other.has(root));
}

/**
 * A `description` de cada skill da raiz do **toolkit** (`ADR-0003`).
 *
 * É o único check que atravessa as duas raízes: o artefato mora no repositório
 * validado e a skill mora no toolkit. Diretório ausente devolve mapa vazio, e
 * mapa vazio vira aviso — nunca falha.
 */
export function loadSkillDescriptions(root: string = toolkitRoot()): Map<string, string> {
  const dir = join(root, 'plugin', 'skills');
  const found = new Map<string, string>();

  let names: string[];
  try {
    names = readdirSync(dir);
  } catch {
    return found;
  }

  for (const name of names) {
    let source: string;
    try {
      source = readFileSync(join(dir, name, 'SKILL.md'), 'utf8');
    } catch {
      continue;
    }

    let description: unknown;
    try {
      description = parseFrontmatter(source)?.data.description;
    } catch {
      continue; // SKILL.md com frontmatter quebrado é achado de `authoring`, não daqui
    }
    if (typeof description === 'string') found.set(name, description);
  }

  return found;
}

export interface RoutedDoc {
  file: string;
  line: number;
  skill: string;
  trigger: string;
}

function triggerOf(frontmatter: { data: Record<string, unknown>; lines: Record<string, number> } | null): {
  trigger: string;
  line: number;
} | null {
  const value = frontmatter?.data.trigger;
  if (typeof value !== 'string' || value.trim() === '') return null;
  return { trigger: value, line: frontmatter?.lines.trigger ?? 1 };
}

/**
 * Os pares (documento, skill dona) que este check compara.
 *
 * Artefato `per-file` fica de fora de propósito: cada arquivo dele é um **item**,
 * e o `trigger` de um ADR — "Nunca. Imutável após aceito" — é do item, não do
 * artefato (`ADR-0013`). Entram os containers de coleção e as entradas de
 * `documents:` que declaram skill.
 */
export function routedDocs(context: CheckContext): RoutedDoc[] {
  const routed: RoutedDoc[] = [];

  for (const doc of context.docs) {
    if (doc.rule.collection === 'per-file') continue;
    const found = triggerOf(doc.frontmatter);
    if (found === null) continue;
    routed.push({ file: doc.file, line: found.line, skill: doc.rule.skill, trigger: found.trigger });
  }

  for (const document of context.documents) {
    if (document.rule.skill === null) continue;
    const found = triggerOf(document.frontmatter);
    if (found === null) continue;
    routed.push({ file: document.file, line: found.line, skill: document.rule.skill, trigger: found.trigger });
  }

  return routed;
}

/**
 * `CI-10` — trigger routing. O `trigger:` de um documento e a `description:` da
 * skill declarada como dona dele descrevem o mesmo evento (`RN-0029`). Se
 * divergirem, o documento declara um gatilho que nada dispara: o mecanismo de
 * gatilho e o roteamento de skill deixam de se encontrar (spec §11).
 *
 * Não conta documento, linha nem cobertura: conta **divergência entre duas
 * coisas que deveriam concordar** (spec §13).
 *
 * As descrições entram por injeção, como o executor em `CI-5` e o diff em
 * `CI-7`: o padrão lê a raiz do toolkit, e o teste passa um mapa.
 */
export function ci10TriggerRouting(
  descriptions: ReadonlyMap<string, string> = loadSkillDescriptions(),
): Check {
  return {
    id: RULE,
    name: 'trigger routing',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = [];

      for (const routed of routedDocs(context)) {
        const description = descriptions.get(routed.skill);

        // Aviso, não falha: um projeto pode declarar skill própria, e reprovar
        // por isso seria exigir que todo dono fosse do plugin (`RN-0029`).
        if (description === undefined) {
          findings.push({
            ruleId: RULE,
            file: routed.file,
            line: routed.line,
            severity: 'warning',
            message:
              `\`${routed.file}\` declara \`${routed.skill}\` como skill dona, e a raiz do toolkit não tem uma ` +
              'skill com esse nome — o gatilho deste documento não pôde ser cruzado com o roteamento.',
            fix:
              `Se \`${routed.skill}\` é skill deste projeto, não há nada a fazer. Se era para ser do toolkit, ` +
              'confira o nome em `plugin/skills/` (`RN-0029`).',
          });
          continue;
        }

        const shared = sharedRoots(routed.trigger, description);
        if (shared.length >= SHARED_ROOTS_FLOOR) continue;

        findings.push({
          ruleId: RULE,
          file: routed.file,
          line: routed.line,
          severity: 'error',
          message:
            `O \`trigger\` de \`${routed.file}\` ("${routed.trigger.trim().replace(/\s+/g, ' ').slice(0, 120)}") e a ` +
            `\`description\` de \`${routed.skill}\` falam de eventos diferentes: ` +
            `${shared.length} raiz(es) em comum, mínimo ${SHARED_ROOTS_FLOOR}.`,
          fix:
            'Reescreva um dos dois para nomear o mesmo evento — quem mantém o documento e quem roteia a skill ' +
            'precisam estar falando da mesma coisa, senão o documento declara um gatilho que nada dispara ' +
            `(\`RN-0029\`, \`ADR-0013\`; skill dona: ${routed.skill}).`,
        });
      }

      return findings;
    },
  };
}
```

- [x] **Step 4: Rodar e ver passar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RN-0029|ADR-0013"
```

Esperado: PASSA.

- [x] **Step 5: Ligar no `validate`, no catálogo e regerar o contrato**

Em `src/checks/registry.ts`, importe `ci10TriggerRouting` e acrescente-o ao fim
da lista de `validateChecks`:

```typescript
    ci9CommitDiscipline(diff),
    ci10TriggerRouting(),
```

Em `src/checks/catalog.ts`, ao fim do array:

```typescript
  {
    id: 'CI-10',
    name: 'trigger routing',
    command: 'living-docs validate',
    failsWhen:
      'O `trigger` de um documento e a `description` da skill declarada como dona dele compartilham menos raízes de palavra do que o piso declarado. Skill dona ausente da raiz do toolkit produz aviso, não falha; e o `trigger` de um item de coleção não é comparado.',
  },
```

Atualize `test/checks/registry.test.ts`: o mapa `esperado` ganha
`'CI-10': 'living-docs validate'`, e as duas `assert.deepEqual` de IDs passam a
esperar `['CI-1', 'CI-2', 'CI-3', 'CI-4', 'CI-7', 'CI-8', 'CI-9', 'CI-10']`.

O teste "o catálogo é lido por gente: fica ordenado por ID" continua valendo:
`CI-10` vem depois de `CI-9` porque a ordenação é numérica, não textual.

Regere o contrato:

```bash
docker compose exec toolkit node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md
./bin/living-docs drift
```

- [x] **Step 6: Rodar contra este repositório e corrigir a calibração do `ADR-0013`**

```bash
./bin/living-docs validate
```

Esperado: nenhum achado de `CI-10`. Os doze pares deste repositório foram
medidos e o mais apertado é `docs/contracts/errors.md` × `contract-keeper`, com
**três** raízes (`código`, `saída`, `signif`).

O `ADR-0013` está `draft` — a promoção é a Task 16 —, e a calibração escrita
nele nomeia o par errado. Corrija o bloco de calibração da decisão de
semelhança para o que foi medido:

```markdown
- **Calibração:** contra os doze pares deste repositório. O par mais apertado é
  `docs/contracts/errors.md` × `contract-keeper`, com três raízes (`código`,
  `saída`, `signif`); o mais folgado é `CONTRIBUTING.md` ×
  `working-agreements-keeper`, com sete. O piso é dois, e a margem de um é
  deliberada: um par que já nasce no piso é um par que qualquer reescrita
  quebra.
```

Isto **não** é editar item congelado: `HK-1` congela `accepted`, e este ADR é
`draft`. Se ele já tiver sido promovido, pare — o caminho é `superseded` e um
ADR novo, e o número não está na lista desta Task.

- [x] **Step 7: O teste de aceite do critério 9**

Acrescente a `test/acceptance/spec-criteria.test.ts`:

```typescript
test('criterio 9 da spec de fechamento: gatilho e roteamento sao cruzados no CI', () => {
  const ownership = [
    'version: 1',
    'artifacts:',
    '  - id-prefix: DA',
    '    path: docs/open-decisions.md',
    '    owner: "@time"',
    '    skill: decision-recorder',
    '    collection: table',
    'documents:',
    '  - path: docs/.ownership.yml',
    '    owner: "@time"',
    '    skill: living-docs-bootstrap',
    '',
  ].join('\n');

  const decisoes = (trigger: string): string =>
    [
      '---',
      'title: Open Decisions',
      'owner: "@time"',
      `trigger: ${trigger}`,
      'last-reviewed: 2026-08-31',
      '---',
      '',
      '| ID | Lacuna | Status | Aberta em |',
      '| --- | --- | --- | --- |',
      '',
    ].join('\n');

  // Divergente: reprova nomeando os dois.
  withTempRepo(
    {
      [OWNERSHIP_PATH]: ownership,
      CODEOWNERS: 'docs/    @time\n',
      'docs/open-decisions.md': decisoes('Quando o deploy quebrar em producao.'),
    },
    (root) => {
      const result = runValidate(root);
      const finding = result.findings.find((f) => f.ruleId === 'CI-10');
      assert.ok(finding, JSON.stringify(result.findings, null, 2));
      assert.equal(finding?.severity, 'error');
      assert.match(finding?.message ?? '', /decision-recorder/);
      assert.equal(result.exitCode, 1);
    },
  );

  // Skill que a raiz do toolkit nao tem: avisa e segue.
  withTempRepo(
    {
      [OWNERSHIP_PATH]: ownership.replace('skill: decision-recorder', 'skill: decisoes-do-time'),
      CODEOWNERS: 'docs/    @time\n',
      'docs/open-decisions.md': decisoes('Quando o deploy quebrar em producao.'),
    },
    (root) => {
      const result = runValidate(root);
      const finding = result.findings.find((f) => f.ruleId === 'CI-10');
      assert.equal(finding?.severity, 'warning');
      assert.equal(result.exitCode, 0);
    },
  );
});
```

- [x] **Step 8: Rodar tudo, CHANGELOG e commit**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate --base origin/master
./bin/living-docs drift
```

Em `docs/definition-of-done.md`, a última linha passa a nomear
``verificação: `CI-1` a `CI-10`, rodados pelo workflow do repositório.``

Sob `### Added` de `CHANGELOG.md`:

```markdown
- `CI-10` (`living-docs validate`): o `trigger` de um documento e a
  `description` da skill declarada como dona dele precisam falar do mesmo
  evento. Skill dona que não existe na raiz do toolkit produz aviso, não falha.
```

```bash
git add src/checks/ci10-trigger-routing.ts src/checks/registry.ts src/checks/catalog.ts \
        docs/contracts/checks.gen.md docs/definition-of-done.md \
        docs/decisions/adr/ADR-0013-os-dois-limiares-do-fechamento.md \
        test/checks/ci10-trigger-routing.test.ts test/checks/registry.test.ts \
        test/acceptance/spec-criteria.test.ts CHANGELOG.md
git commit -m "feat(RN-0029, ADR-0013): CI-10 cruza o gatilho do artefato com a description da skill dona"
```

---

### Task 13: O conjunto de checks cabe num teto declarado — e medido

**Objetivo:** A segunda metade de `L-8`. A §9 da spec exige que os checks rodem
"em minutos, no PR" e nada mede. `RNF-0001` cobre o teto de 5 s do hook e não
diz nada do check. Fecha o critério de aceite 10.

**Files:**
- Create: `src/checks/budget.ts`
- Modify: `src/cli/validate.ts`, `src/cli/drift.ts`, `src/cli/changelog.ts`
  (cada resultado passa a trazer o que mediu)
- Modify: `src/cli/index.ts` (o relato, e o texto de `--stage`)
- Create: `test/checks/budget.test.ts` — é ele o teste de aceite do critério 10:
  a medida é do conjunto, contra o corpus real, e é o que cobra o teto
- Modify: `test/cli/validate.test.ts` (o campo novo no resultado)
- Modify: `CHANGELOG.md`

**Interfaces:**
- Consome: `runValidate`, `runDrift`, `runChangelog`.
- Produz:
  - `CHECK_BUDGET_MS` (`src/checks/budget.ts`)
  - `formatElapsed(ms: number): string`
  - `ValidateResult.elapsedMs`, `DriftResult.elapsedMs`,
    `ChangelogResult.elapsedMs`

**Requisitos:**
- **O teto é do conjunto, não de cada check** (`RNF-0005`): é o conjunto que
  roda no PR. Um teto por check aprovaria oito checks lentos.
- **Medido, nunca estimado.** O CLI mede a execução real e imprime o que mediu,
  a cada execução. Um orçamento que ninguém mede é uma intenção.
- **Quem reprova é o teste, não o `validate`.** Um `validate` que saísse com 1
  por lentidão trocaria um enforcement por um teste instável: o runner do
  consumidor não é o do toolkit, e reprovar um PR correto porque a máquina
  estava carregada é pior do que não medir. O CLI **relata** — e diz alto quando
  passou do teto; o teste é que **cobra**, contra o corpus real deste
  repositório.
- **O teto não conta volume** (spec §13): mede tempo de execução, que é
  propriedade do sistema, não tamanho de documentação.
- O teto declarado é **120 000 ms** para o conjunto. É "minutos, no PR" com uma
  ordem de grandeza de folga sobre a medida real — e é isso que ele precisa
  pegar: regressão de ordem de grandeza, não ruído de máquina.

**`HK-5`:** `src/checks/**` pede `docs/requirements/rules.md`; `src/cli/**` pede
`docs/requirements/functional.md` e `CHANGELOG.md`. `RNF-0005` viajou na Task 2
e o CHANGELOG entra no Step 6.

- [x] **Step 1: Escrever o teste do orçamento (falha)**

Crie `test/checks/budget.test.ts`:

```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CHECK_BUDGET_MS, formatElapsed } from '../../src/checks/budget.ts';
import { runValidate } from '../../src/cli/validate.ts';
import { runDrift } from '../../src/cli/drift.ts';
import { runChangelog } from '../../src/cli/changelog.ts';
import { toolkitRoot } from '../../src/core/roots.ts';

const NUL = String.fromCharCode(0);

/** O git falso deste teste: o custo medido e o dos checks, nao o do git. */
const git = (args: readonly string[]): string => {
  if (args.includes('log')) return `docs(RN-0001): x${NUL}\n`;
  if (args.includes('--unified=0')) return '';
  return `src/cli/index.ts${NUL}CHANGELOG.md${NUL}`;
};

test('RNF-0005: o conjunto completo de checks cabe no teto declarado, medido', () => {
  const root = toolkitRoot();
  const inicio = process.hrtime.bigint();

  // O conjunto e o que roda no PR: as duas execucoes de `validate`, o `drift`
  // com o gerador de verdade, e o `changelog`. Nao e o tempo de um check.
  runValidate(root);
  runValidate(root, 'origin/master', git);
  runDrift(root);
  runChangelog(root, 'origin/master', git);

  const decorrido = Number(process.hrtime.bigint() - inicio) / 1e6;

  assert.ok(
    decorrido < CHECK_BUDGET_MS,
    `o conjunto levou ${formatElapsed(decorrido)}, e o teto declarado e ${formatElapsed(CHECK_BUDGET_MS)} ` +
      '(RNF-0005) — meça antes de subir o teto',
  );
});

test('RNF-0005: cada comando devolve o que mediu, e a medida nao e estimada', () => {
  const root = toolkitRoot();

  const validado = runValidate(root);
  assert.equal(typeof validado.elapsedMs, 'number');
  assert.ok(validado.elapsedMs >= 0);
  // Uma varredura da arvore inteira nao custa zero: medida zerada e medida
  // que ninguem tomou.
  assert.ok(validado.elapsedMs > 0, 'elapsedMs veio zerado — o relogio nao foi lido');

  assert.equal(typeof runDrift(root).elapsedMs, 'number');
});

test('RNF-0005: formatElapsed e legivel por quem le o log do PR', () => {
  assert.equal(formatElapsed(842), '842 ms');
  assert.equal(formatElapsed(1500), '1.5 s');
  assert.equal(formatElapsed(120_000), '120.0 s');
});
```

- [x] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="RNF-0005"
```

Esperado: FALHA — `src/checks/budget.ts` não existe.

- [x] **Step 3: Declarar o teto**

Crie `src/checks/budget.ts`:

```typescript
/**
 * O teto de tempo do **conjunto** de checks (`RNF-0005`, spec §9).
 *
 * Do conjunto, e não de cada check: é o conjunto que roda no PR, e um teto por
 * check aprovaria oito checks lentos. Os três candidatos conhecidos a estourá-lo
 * são `CI-5` (executa subprocesso), `CI-7` (compara frase com frase) e `CI-8`
 * (varre o corpus inteiro).
 *
 * Dois minutos é "minutos, no PR" com uma ordem de grandeza de folga sobre a
 * medida real deste repositório — e é isso que um orçamento precisa pegar:
 * regressão de ordem de grandeza, não ruído de máquina carregada. Subir este
 * número sem uma medida nova ao lado é transformá-lo de volta em intenção.
 */
export const CHECK_BUDGET_MS = 120_000;

/** Milissegundos como quem lê o log do PR os lê. */
export function formatElapsed(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`;
}
```

- [x] **Step 4: Medir em cada comando**

Nos três CLIs, o padrão é o mesmo — marque o início, meça o fim, devolva.

Em `src/cli/validate.ts`: acrescente `elapsedMs: number;` a `ValidateResult`
(com o comentário `/** Quanto o conjunto de checks levou, medido (RNF-0005). */`),
e dentro de `runValidate`:

```typescript
  const inicio = process.hrtime.bigint();
```

logo antes de `forgetTree(root);`, e no `return`:

```typescript
    elapsedMs: Number(process.hrtime.bigint() - inicio) / 1e6,
```

Repita em `src/cli/drift.ts` (`DriftResult`) e em `src/cli/changelog.ts`
(`ChangelogResult`) — inclusive no retorno curto de `changelog` quando
`consumerVisiblePaths` está vazio, senão o campo mente quando o comando não
faz nada.

- [x] **Step 5: Relatar a medida, e consertar o texto de `--stage`**

Em `src/cli/index.ts`, importe `CHECK_BUDGET_MS` e `formatElapsed`, e escreva
uma função só, usada pelos três comandos:

```typescript
/**
 * O relato da medida (`RNF-0005`). Sai a cada execução: um orçamento que só
 * aparece quando estoura é um orçamento que ninguém sabe que existe.
 *
 * Não muda o código de saída. Quem reprova por lentidão é o teste do orçamento,
 * contra o corpus deste repositório — um `validate` que saísse com 1 porque a
 * máquina estava carregada trocaria um enforcement por um teste instável.
 */
function reportElapsed(elapsedMs: number): void {
  process.stdout.write(
    `living-docs: conjunto de checks em ${formatElapsed(elapsedMs)} ` +
      `(teto declarado: ${formatElapsed(CHECK_BUDGET_MS)} — RNF-0005).\n`,
  );
  if (elapsedMs > CHECK_BUDGET_MS) {
    process.stderr.write(
      'living-docs: o conjunto passou do teto declarado. Meça o que ficou lento antes de subir o número ' +
        '(RNF-0005).\n',
    );
  }
}
```

Chame `reportElapsed(result.elapsedMs)` logo antes de cada `return
result.exitCode;` de `validate`, `drift` e `changelog` — inclusive nos retornos
curtos, que também mediram.

E, no `USAGE`, a linha de `--stage` ainda lista três estágios enquanto o CLI
aceita quatro desde a Task 8. Troque-a por:

```
  --stage <estágio>   Conjunto mínimo a instalar: solo (padrão), small-team, production ou multi-team
```

- [x] **Step 6: Rodar tudo, CHANGELOG e commit**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate
```

Esperado: a última linha do `validate` traz a medida. Anote o número no corpo do
commit — é a primeira medida registrada, e é contra ela que a próxima se compara.

Se algum teste de `test/cli/` comparar `ValidateResult` inteiro com
`assert.deepEqual`, ele quebra por causa do campo novo: compare campo a campo,
nunca fixe o valor medido.

Sob `### Added` de `CHANGELOG.md`:

```markdown
- `validate`, `drift` e `changelog` passam a relatar quanto o conjunto de checks
  levou e qual é o teto declarado (`RNF-0005`). A medida não altera o código de
  saída.
```

Sob `### Fixed`:

```markdown
- `living-docs --help` passa a listar `multi-team` entre os estágios de
  `--stage`; o CLI já o aceitava.
```

```bash
git add src/checks/budget.ts src/cli/validate.ts src/cli/drift.ts src/cli/changelog.ts \
        src/cli/index.ts test/checks/budget.test.ts test/cli/validate.test.ts CHANGELOG.md
git commit -m "feat(RNF-0005): o conjunto de checks ganha teto declarado e medida a cada execucao"
```

---

### Task 14: A Definition of Done recebe o que só gente verifica

**Objetivo:** Os critérios de aceite 9 e 10 da spec **original** — os dois que a
§2 desta spec deixou **fora** de escopo por serem verificação humana por
natureza. Eles não ganham check: ganham linha marcada humana, dita como tal. Um
check que fingisse medi-los seria pior que a ausência dele (§11,
anti-requisitos).

**Files:**
- Modify: `docs/definition-of-done.md`
- Modify: `test/docs/maintenance.test.ts`

**Interfaces:**
- Consome: nada. É documento e o teste que o lê.
- Produz: nenhuma assinatura.

**Requisitos:**
- Cada item da Definition of Done **nomeia o que o verifica** — é `RN-0017`, e
  `CI-7` reprova item que não nomeia. "verificação: humana" satisfaz a regra: o
  vocabulário aceito inclui a palavra, e é deliberado.
- **Não inventar `CI-11`.** "Um agente errou por falta de contexto" não é
  observável por máquina, e "nenhuma métrica de volume documental" é a ausência
  de uma coisa. Contar qualquer um dos dois seria o check que a spec recusa.
- O teste garante que os dois itens continuam **marcados como humanos** — se
  alguém os trocar por um ID de check no futuro, o teste conta o que aconteceu.

**`HK-5`:** nenhum caminho vigiado é tocado.

- [x] **Step 1: Escrever o teste (falha)**

Acrescente a `test/docs/maintenance.test.ts`, que já tem `ROOT`, `CONFIG` e
`documentWithRole` no topo. O caminho vem do **papel**, nunca adivinhado — é a
mesma regra que o resto do arquivo já pratica:

```typescript
test('spec §12 criterios 9 e 10: o que so gente verifica entra como linha humana', () => {
  const documento = documentWithRole(CONFIG, 'definition-of-done');
  assert.ok(documento);
  const dod = readFileSync(join(ROOT, documento.path), 'utf8');

  const humanos = [/falta de contexto/i, /volume documental/i];
  for (const padrao of humanos) {
    const linha = dod.split('\n').find((l) => padrao.test(l));
    assert.ok(linha, `a Definition of Done nao tem a linha de ${padrao}`);
    assert.match(linha ?? '', /^- \[ \] /, 'precisa ser item de checklist');
    assert.match(
      linha ?? '',
      /verificacao: humana|verificação: humana/,
      'estes dois sao verificacao humana por natureza — um check que fingisse medi-los seria pior que a ausencia dele',
    );
    assert.doesNotMatch(linha ?? '', /\bCI-\d+\b/, 'nenhum check mede estes dois');
  }
});
```

- [x] **Step 2: Rodar e ver falhar**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="criterios 9 e 10"
```

Esperado: FALHA — as linhas não existem.

- [x] **Step 3: Escrever as duas linhas**

Em `docs/definition-of-done.md`, ao fim da lista de itens, antes da seção
`## O que esta lista não é`:

```markdown
- [ ] Nenhum agente e nenhuma pessoa errou por falta de contexto que caberia num artefato existente — e, quando errou, o artefato dono ganhou a linha que faltava — verificação: humana (spec §12, critério 9).
- [ ] Nenhuma métrica de volume documental foi usada como sinal de qualidade: nem contagem de páginas, nem cobertura, nem "documentar o que foi feito" — verificação: humana (spec §12, critério 10).
```

Os dois nomeiam o que os verifica, como `RN-0017` exige, e o que os verifica é
gente. Não é lacuna de enforcement: é o único enforcement honesto que estes dois
admitem, e a §11 da spec original já admite item de checklist verificável só por
gente, dito explicitamente.

- [x] **Step 4: Rodar tudo**

```bash
docker compose exec toolkit npm test
./bin/living-docs validate
```

Esperado: sem finding. Se `CI-7` acusar item sem verificação nomeada, a palavra
"verificação" saiu da linha — recoloque-a; não invente um ID de check.

- [x] **Step 5: Commit**

```bash
git add docs/definition-of-done.md test/docs/maintenance.test.ts
git commit -m "docs(RN-0017): os criterios 9 e 10 da spec entram como linha humana na Definition of Done

Docs: none — a Definition of Done e o doc dono desta mudanca"
```

---

### Task 15: A adoção do consumidor real — a prova, não o experimento

**Objetivo:** O critério de aceite 12, que é o único item cujo resultado pode
**invalidar** uma decisão desta spec. O consumidor tem 97 regras com IDs sem
hífen já citadas nos testes dele, duas decisões abertas em prosa, `docs/adr/`
vazio, hooks próprios registrados, CI por diretório e sem Docker,
`docs/architecture/` e `docs/domains/` (camada 4), e nenhum CODEOWNERS. A
instalação atravessa tudo isso **sem reescrever um arquivo dele**.

E o teste da camada 4 é binário: **se adotá-la exigir tocar em algum check, o
ponto de extensão não era o que a spec dizia que era**. Esse resultado é
entregável, seja qual for.

**Files:**
- Modify: `test/acceptance/consumer-repo.test.ts`
- Modify: `CHANGELOG.md` (só se algo mudar de público — veja o Step 6)

**Interfaces:**
- Consome: `runInit`, `runValidate`, `mergeSettings`, `WORKFLOW_PATH`,
  `SETTINGS_PATH`, `DetectedFormat`.
- Produz: nenhuma assinatura. Produz uma **prova**.

**Requisitos:**
- **Nenhum arquivo preexistente é reescrito.** O teste tira uma impressão
  (conteúdo byte a byte) de tudo que existia antes do `init` e compara depois.
  Qualquer diferença reprova — é o critério 1 da spec original.
- **Nenhum check muda nesta task.** O commit desta task não pode tocar
  `src/checks/**`. Se para a camada 4 passar for preciso mudar um check, **pare
  e escreva o achado**: é o resultado que invalida a §8 da spec de fechamento, e
  vale mais que o teste verde.
- **A camada 4 entra com dono e sem skill** — a categoria que este repositório
  já usa para planos, spec e README. Ganha dono, link verificado e cobrança de
  revisão; não ganha keeper, máquina de estados nem família de IDs.
- **A situação em prosa das decisões abertas não é convertida automaticamente.**
  Virar estado da máquina é ato humano. O teste fixa que o `init` **não** a
  reescreve.
- O consumidor não roda Docker: o workflow instalado recebe `--invoke` e não
  menciona Docker (`RNF-0002` é regra deste toolkit, não de quem o instala).

**`HK-5`:** nenhum caminho vigiado é tocado, e é assim que tem de ser — esta
task só escreve teste.

- [x] **Step 1: Montar o consumidor, com tudo que ele tem hoje**

O arquivo já importa `runInit`, `runValidate`, `toolkitRoot`, `withTempRepo`,
`DEFAULT_ID_FORMAT` e os utilitários de `node:fs`. Acrescente ao bloco de
imports o que falta:

```typescript
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { SETTINGS_PATH } from '../../src/config/claude-settings.ts';
import { WORKFLOW_PATH } from '../../src/cli/init.ts';
```

E, ao topo do arquivo:

```typescript
/** As 97 regras do consumidor, escritas como ele as escreve: `RN001`. */
const REGRAS_DO_CONSUMIDOR = [
  '---',
  'title: Regras de negocio',
  'owner: "@consumidor"',
  'trigger: >',
  '  Antes de implementar qualquer comportamento, e a toda regra nova ou alterada.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '# Regras de negocio',
  '',
  ...Array.from({ length: 97 }, (_, i) => {
    const id = `RN${String(i + 1).padStart(3, '0')}`;
    return [`## ${id} — Regra numero ${i + 1}`, '', '- **status:** active', '', 'Prosa da regra.', ''].join('\n');
  }),
].join('\n');

const DECISOES_EM_PROSA = [
  '---',
  'title: Decisoes em aberto',
  'owner: "@consumidor"',
  'trigger: >',
  '  Toda vez que alguem trombou numa lacuna — comportamento sem regra escrita.',
  'last-reviewed: 2026-08-31',
  '---',
  '',
  '## DA001 — Como arredondar centavos',
  '',
  '- **status:** open',
  '',
  '**Contexto:** a cobranca arredonda hoje de tres jeitos.',
  '**Alternativas:** para cima, bancario, truncar.',
  '**Recomendacao:** bancario.',
  '**Situacao:** ainda em discussao com o financeiro.',
  '',
  '## DA002 — Fuso do fechamento',
  '',
  '- **status:** open',
  '',
  '**Contexto:** o fechamento roda em UTC e o relatorio sai em BRT.',
  '**Situacao:** aguardando o time de dados.',
  '',
].join('\n');

/** O `.claude/settings.json` que o consumidor ja tem, com hooks proprios. */
const SETTINGS_DO_CONSUMIDOR = JSON.stringify(
  {
    hooks: {
      PreToolUse: [{ matcher: 'Bash', hooks: [{ type: 'command', command: './scripts/audita.sh' }] }],
    },
    extraKnownMarketplaces: { 'time-interno': { source: { source: 'github', repo: 'time/plugins' } } },
  },
  null,
  2,
);

const WORKFLOW_DO_CONSUMIDOR = [
  'name: api',
  'on:',
  '  pull_request:',
  '    paths: ["services/api/**"]',
  'jobs:',
  '  test:',
  '    runs-on: ubuntu-latest',
  '    steps:',
  '      - uses: actions/checkout@v4',
  '      - run: npm ci && npm test',
  '',
].join('\n');

const CONSUMIDOR = {
  'docs/regras-de-negocio.md': REGRAS_DO_CONSUMIDOR,
  'docs/decisoes-em-aberto.md': DECISOES_EM_PROSA,
  'docs/adr/.gitkeep': '',
  'docs/architecture/contexto.md': '# Contexto\n\nDesenho C4 nivel 1.\n',
  'docs/domains/cobranca.md': '# Cobranca\n\nInvariantes do dominio.\n',
  'test/cobranca.test.ts': "test('RN001: arredonda para cima', () => {});\n",
  '.claude/settings.json': SETTINGS_DO_CONSUMIDOR,
  '.github/workflows/api.yml': WORKFLOW_DO_CONSUMIDOR,
  'README.md': '# consumidor\n',
};

/** Impressao byte a byte da arvore, para provar que nada preexistente mudou. */
function impressao(root: string, arquivos: readonly string[]): Record<string, string> {
  const registro: Record<string, string> = {};
  for (const arquivo of arquivos) registro[arquivo] = readFileSync(join(root, arquivo), 'utf8');
  return registro;
}

const OPCOES_DO_CONSUMIDOR = {
  owner: '@consumidor',
  dryRun: false,
  stage: 'production' as const,
  idFormat: { separator: '', padding: 3 },
  // O consumidor nao roda Docker: e assim que ele chama o CLI.
  invoke: 'npx living-docs',
  marketplace: 'time/living-docs',
};
```

- [x] **Step 2: Escrever o teste do critério 12 (falha)**

Ainda em `test/acceptance/consumer-repo.test.ts`:

```typescript
test('criterio 12: o consumidor real e adotado, e nenhum arquivo dele e reescrito', () => {
  withTempRepo(CONSUMIDOR, (root) => {
    const preexistentes = Object.keys(CONSUMIDOR).filter((p) => p !== 'docs/adr/.gitkeep');
    const antes = impressao(root, preexistentes);

    // --dry-run primeiro: o inventario relata a forma que ele achou, e nao a
    // adota em silencio (RF-0014).
    const seco = runInit(root, { ...OPCOES_DO_CONSUMIDOR, idFormat: DEFAULT_ID_FORMAT, dryRun: true });
    assert.ok(seco.detected, 'o inventario nao relatou a forma escrita do consumidor');
    assert.equal(seco.detected?.format.separator, '');
    assert.equal(seco.detected?.format.padding, 3);
    assert.ok((seco.detected?.count ?? 0) >= 97, `so ${seco.detected?.count} ocorrencias lidas`);
    assert.deepEqual(impressao(root, preexistentes), antes, '--dry-run escreveu no repositorio');

    // Agora a instalacao, com a forma declarada.
    const result = runInit(root, OPCOES_DO_CONSUMIDOR);

    // 1 — nada preexistente foi reescrito.
    assert.deepEqual(impressao(root, preexistentes), antes, 'o init reescreveu arquivo preexistente');

    // 2 — as regras e as decisoes foram ADOTADAS, nao recriadas.
    const adotados = result.adopted.map((e) => e.path);
    assert.ok(adotados.includes('docs/regras-de-negocio.md'), JSON.stringify(result.adopted));
    assert.ok(adotados.includes('docs/decisoes-em-aberto.md'), JSON.stringify(result.adopted));
    assert.ok(!existsSync(join(root, 'docs/requirements/rules.md')), 'o init criou um paralelo');
    assert.ok(!existsSync(join(root, 'docs/open-decisions.md')), 'o init criou um paralelo');

    // 3 — o diretorio de ADRs vazio nasce adotado.
    assert.ok(adotados.includes('docs/adr/'), JSON.stringify(result.adopted));

    // 4 — os hooks e o workflow do consumidor continuam la, e o do toolkit entrou.
    const settings = JSON.parse(readFileSync(join(root, SETTINGS_PATH), 'utf8'));
    assert.ok(settings.hooks.PreToolUse.some((e: { matcher: string }) => e.matcher === 'Bash'));
    assert.ok(settings.extraKnownMarketplaces['time-interno']);
    assert.ok(settings.extraKnownMarketplaces['living-docs']);
    assert.ok(existsSync(join(root, '.github/workflows/api.yml')));
    assert.ok(existsSync(join(root, WORKFLOW_PATH)));

    // 5 — o workflow instalado nao impoe Docker a quem instala.
    const workflow = readFileSync(join(root, WORKFLOW_PATH), 'utf8');
    assert.doesNotMatch(workflow, /docker/i);
    assert.match(workflow, /npx living-docs validate/);

    // 6 — o CODEOWNERS, que ele nao tinha, foi escrito.
    assert.ok(existsSync(join(root, 'CODEOWNERS')));

    // 7 — a situacao em prosa continua prosa: virar estado e ato humano.
    assert.match(readFileSync(join(root, 'docs/decisoes-em-aberto.md'), 'utf8'), /ainda em discussao/);

    // 8 — rodar de novo nao duplica nada.
    const segunda = runInit(root, OPCOES_DO_CONSUMIDOR);
    assert.deepEqual(segunda.created, [], JSON.stringify(segunda.created));
    const settingsDepois = readFileSync(join(root, SETTINGS_PATH), 'utf8');
    assert.equal(settingsDepois.match(/living-docs@living-docs/g)?.length ?? 0, 1);
  });
});
```

- [x] **Step 3: Rodar e ver o que falha**

```bash
docker compose exec toolkit npm test -- --test-name-pattern="criterio 12"
```

Espere falhas de **adoção de caminho**: o `init` procura os caminhos conhecidos
de cada família, e `docs/regras-de-negocio.md` já está na lista de `RN`
(`src/cli/init.ts`), mas `docs/decisoes-em-aberto.md` e `docs/adr/` podem não
estar nas de `DA` e `ADR`.

Se faltar, acrescente o caminho à lista de adoção daquela família em
`src/cli/init.ts` — **isso é dado de adoção, não check**, e é exatamente o que a
`SK-0` passo 1 manda fazer. Se para passar for preciso mudar um **check**, pare:
veja o Step 6.

- [x] **Step 4: A camada 4 entra com dono e sem skill**

Ainda no mesmo arquivo, o segundo teste — o binário:

```typescript
test('criterio 12: a camada 4 entra com dono e sem skill, sem que nenhum check mude', () => {
  withTempRepo(CONSUMIDOR, (root) => {
    runInit(root, OPCOES_DO_CONSUMIDOR);

    // Antes de declarar: os documentos de arquitetura caem no corpus de CI-7 e
    // reprovam por falta de dono. E o comportamento correto — o corpus e tudo
    // que vive sob a raiz da documentacao, e nao uma lista de tipos conhecidos.
    const semDono = runValidate(root);
    assert.ok(
      semDono.findings.some((f) => f.ruleId === 'CI-7' && f.file.startsWith('docs/architecture/')),
      JSON.stringify(semDono.findings, null, 2),
    );

    // A declaracao: dono, sem skill. Nada alem disso.
    const ownership = readFileSync(join(root, OWNERSHIP_PATH), 'utf8');
    writeFileSync(
      join(root, OWNERSHIP_PATH),
      `${ownership}\n  - path: docs/architecture/\n    owner: "@consumidor"\n  - path: docs/domains/\n    owner: "@consumidor"\n`,
      'utf8',
    );
    // E o CODEOWNERS, que CI-7 tambem cobra.
    const codeowners = readFileSync(join(root, 'CODEOWNERS'), 'utf8');
    writeFileSync(
      join(root, 'CODEOWNERS'),
      `${codeowners}docs/architecture/    @consumidor\ndocs/domains/    @consumidor\n`,
      'utf8',
    );

    const result = runValidate(root);
    assert.deepEqual(
      result.findings.filter((f) => f.file.startsWith('docs/architecture/') || f.file.startsWith('docs/domains/')),
      [],
      'a camada 4 exigiu mais do que dono e linha no CODEOWNERS',
    );
    assert.equal(result.exitCode, 0, JSON.stringify(result.findings, null, 2));

    // Sem skill dona, CI-10 nao tem par a cruzar: documento sem skill nao e achado.
    assert.deepEqual(result.findings.filter((f) => f.ruleId === 'CI-10'), []);
  });
});
```

Note a ordem em que o `.ownership.yml` recebe as duas entradas: elas precisam
cair **dentro** do bloco `documents:` que o `init` escreveu. Se o bloco não for o
último do arquivo, insira as linhas no lugar certo em vez de concatenar ao fim —
YAML mal colocado vira `OwnershipError`, e o achado seria sobre o teste, não
sobre o toolkit.

- [x] **Step 5: Rodar tudo**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate --base origin/master
```

E a prova de que nenhum check mudou:

```bash
git status --porcelain src/checks/
```

Esperado: **saída vazia**. Se houver qualquer arquivo aí, vá para o Step 6.

- [x] **Step 6: Se algum check precisou mudar, o achado é o entregável**

Não conserte em silêncio. Abra a decisão e pare:

```bash
./bin/living-docs validate    # confirme o achado que forcou a mudanca
```

Escreva o caso concreto — qual check, qual documento, o que ele exigiu — e abra
uma `DA` pela `decision-recorder` (`/open-decision`), citando a §8 da spec de
fechamento: *"se adotar a camada 4 exigir tocar em algum check, o ponto de
extensão não era o que a spec dizia que era"*. O número sai da skill, não deste
plano. Esse resultado invalida uma decisão da spec, e é mais valioso que um
teste verde.

- [x] **Step 7: Commit**

Só toque `CHANGELOG.md` se o Step 3 tiver acrescentado caminho de adoção em
`src/cli/init.ts` — aí a mudança é visível a quem instala:

```markdown
- `living-docs init` passa a reconhecer `docs/decisoes-em-aberto.md` e `docs/adr/`
  entre os caminhos que adota quando já existem.
```

```bash
git add test/acceptance/consumer-repo.test.ts
git commit -m "test(RF-0001, RN-0024): o consumidor real e adotado sem reescrever arquivo nenhum"
```

---

### Task 16: A promoção — e ela não é sua

**Objetivo:** Tudo que este plano escreveu nasceu `draft`/`open`. Promover é ato
humano: `HK-3` intercepta, e a resposta não é do agente (spec §4, `CLAUDE.md`).
Esta task **não promove nada**. Ela entrega a lista, com o que sustenta cada
item, para que uma pessoa decida.

**Files:**
- Nenhum, pelo agente. Os arquivos que a **pessoa** pode promover:
  `docs/decisions/adr/ADR-0011-*.md`, `ADR-0012-*.md`, `ADR-0013-*.md`,
  `docs/requirements/functional.md`, `docs/requirements/rules.md`,
  `docs/requirements/non-functional.md`.

**Interfaces:**
- Consome: tudo. É a última task.
- Produz: uma decisão humana, ou o registro de que ela ainda não foi tomada.

**Requisitos:**
- **Nenhum agente promove estado** (spec §4). Se você é o agente executando este
  plano, o Step 3 é onde você para.
- `DA-0003` continua `open` — ela é uma lacuna de verdade, não um resto de
  processo: como o toolkit chega ao CI e à sessão de quem o instala não foi
  decidido, e o `--invoke` e o `--marketplace` são a consequência disso.

- [x] **Step 1: Confirmar que tudo está em pé**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate --base origin/master
./bin/living-docs drift
./bin/living-docs changelog --base origin/master
```

Esperado: os cinco sem finding. Não entregue com finding aberto.

- [x] **Step 2: Montar a lista para quem decide**

```bash
./bin/living-docs validate | tail -5
git log --oneline origin/master..HEAD
```

Escreva, na descrição do PR:

- **`ADR-0011`** — identidade e forma escrita do ID. Sustentado pela Task 15: um
  repositório com 97 regras em `RN001` foi adotado sem um arquivo reescrito.
- **`ADR-0012`** — o que o estágio parametriza. Sustentado pela Task 8:
  `multi-team` instala a Fase 7, e nada mais.
- **`ADR-0013`** — os dois limiares. Sustentado pela medida da Task 12: doze
  pares, o mais apertado com três raízes sobre um piso de duas.
- **`RF-0013`, `RF-0014`, `RN-0024` a `RN-0029`, `RNF-0005`** — cada um com o
  teste que o cita, encontrável por `CI-3`.
- **`DA-0003`** — continua `open`, e é para continuar.

- [x] **Step 3: Parar**

A promoção de `draft` para `accepted`/`active` é do humano. `HK-3` intercepta a
edição do campo `status` e pergunta; a resposta não é sua.

Se você é uma pessoa lendo isto: promova o que você aceita, um item por vez, e
deixe `draft` o que ainda não decidiu. Um ADR promovido fica congelado — `HK-1`
bloqueia o corpo dele a partir daí, e o conserto passa a ser `superseded` mais um
ADR novo. É esse custo que torna a promoção uma decisão, e não um passo de
processo.
