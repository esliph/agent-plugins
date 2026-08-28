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
