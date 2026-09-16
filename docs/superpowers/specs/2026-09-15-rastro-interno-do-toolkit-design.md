# Rastro interno do toolkit — especificação

O toolkit escreve texto que passa a viver no repositório e na sessão de quem o
instala: os arquivos que o `init` semeia, os comentários do `.ownership.yml` e do
workflow, o texto das skills do plugin e as mensagens de check e de hook. Hoje
esse texto cita ADR, RN e seções da spec do toolkit — rastro que só resolve
dentro do repositório do toolkit. Para quem instala, `ADR-0008` não existe ou,
pior, é a decisão 8 **dele**, e o `validate` passa sem dizer nada.

Esta spec tira o rastro interno do que o toolkit entrega e tira das sementes o
que só serve a quem escreve. A documentação é mantida e lida por agentes, mas
serve a humanos também, e texto que o leitor não usa é ruído.

Ela não repete o que os artefatos donos dizem. A regra vigente está em
`docs/requirements/`, a decisão em `docs/decisions/adr/`, o modo de trabalho em
`CONTRIBUTING.md` e o critério de pronto em `docs/definition-of-done.md`.

**Pré-condição:** o plano `docs/superpowers/plans/2026-09-15-fronteira-de-leitor.md`
executado — `ADR-0017`, `RN-0030` e `CI-11` existem, `templates/migration.md` e
`templates/agent-contract.md` já foram reescritos por ele, e `CHANGELOG.md` está
marcado `audience: external`.

**Insumo obrigatório de quem for planejar:**
`docs/superpowers/specs/2026-09-10-fronteira-de-leitor-design.md` (a fronteira
irmã, e o desenho que esta repete); a spec do toolkit
`docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` §8 (a
citação uniforme) e §11 (convenções de autoria de skill); `RF-0002` (o `init` não
reescreve), `RF-0003` e o commit `9b79aea` (os placeholders das sementes);
`RF-0005` (a semente é o formato); `RN-0010`/`RN-0020` (o que o contrato do agente
pode dizer).

---

## 1. O que decidiu quem pediu

### A classificação do ruído

| Tipo | O que é                                                                       | Exemplo de hoje                                           | Destino                                             |
| ---- | ----------------------------------------------------------------------------- | --------------------------------------------------------- | --------------------------------------------------- |
| `A`  | Citação a artefato ou seção da spec do toolkit                                | `ADR-0011`, `spec §3`, `docs/superpowers/…`               | Sai sempre                                          |
| `B`  | Faixa de semente — instrução a quem preenche, com nome do toolkit ou da skill | `> Semente criada por living-docs init…`                  | Sai do arquivo; a regra de escrita mora na skill    |
| `C`  | Posse repetida                                                                | `<!-- Skill dona: charter-keeper. -->`                    | Sai; o `.ownership.yml` já declara                  |
| `D`  | Identificador da interface pública                                            | "verificação: `CI-3`", `HK-8`, nome de skill, comando     | Fica                                                |
| `E`  | Explicação útil a quem instala, escrita com a voz do toolkit                  | o `command` de `generated` imprime e não escreve          | Fica, reescrita sem citar o toolkit                 |
| `F`  | Comentário por seção em template de artefato por arquivo                      | `<!-- Ao menos duas, com o motivo real do descarte… -->`  | Fica; some ao preencher                             |
| `G`  | Prosa renderizada que explica a regra do próprio documento                    | introdução de Open Decisions; "Teste único…" do CHANGELOG | Fica em documento interno; sai de documento externo |
| —    | Comentário fixo em documento-coleção                                          | `<!-- As seções entram abaixo. -->`                       | Sai                                                 |

O critério de `F`, `G` e do comentário de coleção é um só: **o texto serve a quem
lê o documento, ou a quem escreve nele?** O que serve a quem lê fica. O que serve
a quem escreve fica só enquanto é consumido pelo preenchimento — e nunca em
documento que quem escreve não é quem lê.

### As escolhas

| #     | Escolha                                                                                                                | Consequência aceita                                                                                                                      |
| ----- | ---------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `E-1` | **Três superfícies numa entrega**: arquivos semeados, texto do plugin, saída do CLI e dos hooks                        | A entrega é maior, mas a regra não nasce descumprida pelo próprio toolkit                                                                |
| `E-2` | **Spec própria, executada depois da fronteira de leitor**                                                              | Esta spec reescreve linhas que a fronteira acabou de escrever, se a varredura as pegar                                                   |
| `E-3` | **A regra se cobra por teste do toolkit**, não por check `CI-n` nem por catálogo de mensagens                          | Quem instala não ganha a verificação — o problema só existe em quem distribui texto, e hoje só o toolkit distribui                       |
| `E-4` | **O formato mora no template; a regra de escrita mora na skill**                                                       | Quem instala e trabalha sem agente recebe a semente sem instrução de preenchimento                                                       |
| `E-5` | **O rastro removido de uma mensagem vai para um comentário de código ao lado da string**                               | Quem mantém o toolkit lê o porquê no comentário, não na mensagem; `grep RN-0019` no toolkit continua achando o código que aplica a regra |
| `E-6` | **A spec do toolkit não é emendada.** `ADR-0018` registra que a citação uniforme vale dentro do repositório do toolkit | Quem lê só a spec não vê o recorte sem o ADR                                                                                             |

---

## 2. A invariante: o teste não conhece prefixo nenhum

**Rastro interno é o prefixo declarado em `artifacts:` do `.ownership.yml` do
toolkit**, mais os dois padrões que apontam para a spec: `spec §<n>` e o caminho
`docs/superpowers/`.

O teste lê os prefixos de `loadOwnership(toolkitRoot()).artifacts[].idPrefix` —
o mesmo desenho de `CI-11`. `CI-n`, `HK-n`, `SK-n`, `CM-n` e `EXIT-n` não são
famílias de artefato e ficam de fora sem exceção escrita. Uma família nova
declarada no toolkit é vigiada no mesmo commit.

---

## 3. As dez mudanças

| ID     | Mudança                                                                        | Arquivo                                                                                              |
| ------ | ------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------- |
| `M-1`  | Nasce `ADR-0018`, a decisão                                                    | `docs/decisions/adr/`                                                                                |
| `M-2`  | Nasce `RN-0031`, a regra                                                       | `docs/requirements/rules.md`                                                                         |
| `M-3`  | O teste trava as três superfícies                                              | `test/distribution/internal-trail.test.ts`                                                           |
| `M-4`  | Os comentários dos templates não-Markdown perdem o rastro                      | `templates/ownership.yml`, `templates/workflow.yml`, `templates/ids-retired.txt`, `templates/tdr.md` |
| `M-5`  | Os comentários que o `init` monta perdem o rastro                              | `src/cli/init.ts`                                                                                    |
| `M-6`  | As sementes Markdown perdem faixa, posse repetida e orientação de quem escreve | `templates/*.md`                                                                                     |
| `M-7`  | O plugin perde o rastro e recebe a orientação que saiu das sementes            | `plugin/skills/*/SKILL.md`                                                                           |
| `M-8`  | As mensagens de check, hook e CLI perdem o rastro                              | `src/checks/**`, `src/hooks/**`, `src/cli/**`, `src/config/ownership.ts`                             |
| `M-9`  | O contrato do agente deste repositório ganha a política                        | `CLAUDE.md`                                                                                          |
| `M-10` | A entrada de `## [Unreleased]` registra a mudança visível                      | `CHANGELOG.md`                                                                                       |

### `M-1` — a decisão

`ADR-0018 — O que o toolkit entrega não cita o próprio rastro interno`.
`relates-to: [RN-0031, ADR-0017]`, `supersedes: null`.

**Contexto.** O toolkit escreve arquivos, comentários, texto de skill e mensagens
que vivem no repositório e na sessão de quem instala. Esse texto cita ADR, RN e
seções da spec do toolkit, que para quem instala não existem ou resolvem para um
item dele com outro significado — e o `validate` passa, porque `CI-2` não lê
comentário de YAML nem saída de check. As sementes, além disso, trazem instrução
de preenchimento que fica no documento depois de preenchido.

**Alternativas a registrar como consideradas e descartadas:**

- **Manter.** É o problema.
- **Qualificar a citação** ("`RN-0019` do toolkit"). Continua sem resolver para
  quem lê.
- **Linkar o repositório do toolkit.** Não há endereço estável enquanto `DA-0003`
  estiver aberta, e o link joga quem lê num documento interno de decisão — o
  motivo pelo qual `ADR-0017` descarta "ID com link".
- **Centralizar as mensagens num catálogo** e verificar só o catálogo. Refatora
  dezessete arquivos e afasta a mensagem do código que a produz.
- **Um check `CI-n` genérico**, ligado por chave no `.ownership.yml`. Cresce o
  contrato público para um problema que só o toolkit tem.
- **Verificação só humana.** É texto que agente e skill escrevem sozinhos; o ID
  volta sem que ninguém veja.

**Decisão.** O texto que o toolkit entrega a quem instala não cita artefato nem
seção da spec do toolkit. Os identificadores da interface pública, os nomes de
skill e os comandos continuam citáveis: existem no ambiente de quem instala. O
formato de um documento mora no template e a regra de escrevê-lo mora na skill;
orientação que só serve a quem escreve não fica em documento-coleção nem em
documento externo. O rastro continua existindo do lado de dentro — comentário de
código e mensagem de commit.

O ADR diz, no texto, **por que a spec do toolkit não é emendada** (`E-6`): a
citação uniforme segue valendo dentro do repositório do toolkit; o que muda é o
que atravessa para quem instala.

**O que se aceita perder:**

- **Quem instala e trabalha sem agente recebe a semente sem instrução de
  preenchimento** (`E-4`).
- **Repositório já instalado mantém o texto antigo.** O `init` não reescreve
  (`RF-0002`) e não passa a avisar.
- **O teste pode reprovar uma string de `src/` que não é saída** — um regex, um
  dado. Hoje nenhuma casa.
- **Quem mantém o toolkit lê o porquê de uma mensagem no comentário ao lado**, não
  na mensagem (`E-5`).
- **A spec do toolkit continua afirmando a uniformidade** (`E-6`).

Nasce `draft`.

### `M-2` — a regra

`RN-0031 — O que o toolkit entrega a quem instala não cita o rastro interno do toolkit`.
`relates-to: ADR-0018, RN-0030`.

**Fora de escopo:** comentário de código e mensagem de commit; os documentos do
próprio repositório do toolkit; os IDs do projeto de quem instala que uma mensagem
mostra ("`ADR-0001` duplicado"); os identificadores da interface pública, os nomes
de skill e os comandos.

O enunciado diz que os arquivos que o `init` semeia, os templates, o texto do
plugin e a saída do CLI e dos hooks não citam prefixo declarado em `artifacts:`
do toolkit, seção da spec do toolkit nem caminho de documento interno dele — e diz
por quê: quem instala não resolve a citação, ou a resolve para um item seu com
outro significado.

Nasce `draft`.

### `M-3` — o teste

`test/distribution/internal-trail.test.ts`. Escrito antes das mudanças `M-4` a
`M-8`, e vermelho até elas. Cita `RN-0031`.

**A leitura de citação** é uma função do próprio teste:
`findCitations(texto, config.idFormat)` em `src/ids/citations.ts`, cada citação
passada por `parseId` (`src/docs/schema.ts`) e contada quando o prefixo está no
conjunto lido de `loadOwnership(toolkitRoot()).artifacts`; somam-se as ocorrências
de `/spec §\d/` e de `docs/superpowers/`. O achado diz arquivo, linha e o trecho.

**Um caso por superfície**, para que cada passo de `§4` torne um verde:

1. **Arquivos semeados.** Para cada valor de `STAGES` (`solo`, `small-team`,
   `production`, `multi-team`), `runInit` roda dentro de `withTempRepo`
   (`test/helpers/tmp.ts`) e o teste varre todo arquivo de `result.created`.
   Separadamente, varre `templates/**` cru — é o que cobre `adr.md`, `tdr.md`,
   `migration.md` e `release-note.md`, que o `init` não semeia. Os placeholders
   `RN-nnnn` não casam com o padrão e ficam.
2. **Plugin.** Todo arquivo de texto sob `plugin/`, por varredura de diretório —
   o mesmo desenho de `test/plugin/authoring.test.ts`.
3. **Código.** Cada `.ts` sob `src/` passa por `ts.createSourceFile` (TypeScript
   já é dependência de desenvolvimento), e o teste lê só `StringLiteral`,
   `NoSubstitutionTemplateLiteral` e o texto de `TemplateHead`, `TemplateMiddle` e
   `TemplateTail`. Comentário não é lido: é rastro interno e continua citando.

**A trava de comentário HTML.** No mesmo caso 1: nenhum `.md` de
`result.created`, em nenhum estágio, contém `<!--`. Nenhum estágio semeia artefato
por arquivo — os diretórios de ADR, TDR, migração e release nascem só com
`.gitkeep` —, então tudo que o `init` semeia é documento-coleção ou documento
externo, e a trava cobra de uma vez o tipo `C` e o comentário de coleção. Hoje ela
reprova nove arquivos.

**Fica fora do teste**, com verificação humana: a faixa `B`, a prosa `G` de
documento externo e narração de roteiro ("Na Fase 7…"). Não há padrão genérico
que as detecte sem travar frases.

### `M-4` — os templates não-Markdown

Hoje, um `init --stage production` num repositório vazio escreve no
`.ownership.yml` e no workflow: o caminho da spec do toolkit, `ADR-0011`,
`ADR-0008` e `DA-0002`, `spec §3`, `spec §5, SK-7, regra 4`, "Na Fase 7" e
`DA-0003`.

- **`templates/ownership.yml`**
  - O cabeçalho perde "Regra de origem: …§3" e mantém que este é o único arquivo
    específico do projeto e que hooks e checks leem daqui.
  - `id-format` perde `(ADR-0011)` e mantém a explicação da forma escrita.
  - O comentário de `field-map` perde `(spec §3)`.
  - O comentário de `watches` troca "Na Fase 7, CI-7 lê daqui também" pelo que é
    verdade hoje: `CI-7` também lê daqui.
  - Os comentários de `generated` e de `consumer-visible-paths` ficam (`D`, `E`).
- **`templates/workflow.yml`** perde o parágrafo da decisão aberta do toolkit e
  mantém: `--invoke` escolhe como o CLI é chamado, e o arquivo é de quem instala.
- **`templates/ids-retired.txt`** perde o caminho da spec: "IDs retirados. Nunca
  são reciclados." e "Um ID por linha."
- **`templates/tdr.md`** — o comentário de `pay-when` no frontmatter perde
  `(RN-0019, ADR-0007)` e mantém a instrução, que é `F`: some quando o gatilho é
  preenchido.

### `M-5` — o `init`

- `documentsBlock` perde `(ADR-0008, que resolve DA-0002)`. A linha que a
  fronteira de leitor acrescenta, sobre `audience`, cita só `CI-11` e fica.
- `releasesBlock` perde `(spec §5, SK-7, regra 4)`.
- As citações removidas vão para um comentário TypeScript acima de cada linha
  (`E-5`).

### `M-6` — as sementes Markdown

Nenhum placeholder de preenchimento sai — "Substitua por um princípio real…",
"Termo exemplo", `CODIGO-EXEMPLO`, as perguntas da Vision. São a estrutura da
semente (`RF-0003`, commit `9b79aea`).

| Template                                                                                                                 | O que muda                                                                                                                                                                                       |
| ------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `constitution.md`, `vision.md`, `glossary.md`, `contributing.md`, `errors.md`, `versioning-policy.md`                    | A faixa `B` deixa de existir como bloco. Cada frase passa pelo critério de `§1`: a que serve a quem lê vira prosa do documento, sem nome de toolkit nem de skill; a que serve a quem escreve sai |
| `constitution.md`, `vision.md`, `glossary.md`, `errors.md`, `versioning-policy.md`, `deprecations.md`, `requirements.md` | O comentário final (`C`, e o de coleção) sai. O que ele carregava para quem lê vira prosa — "a mensagem exibível não é parte do contrato", em `errors.md`                                        |
| `changelog.md`, `deprecations.md`                                                                                        | A introdução com regra de redação (`G` externo) sai                                                                                                                                              |
| `requirements.md`, `open-decisions.md`, `definition-of-done.md`, `contributing.md`                                       | A prosa `G` interna e os identificadores `D` ficam                                                                                                                                               |
| `adr.md`, `release-note.md`                                                                                              | Os comentários `F` ficam                                                                                                                                                                         |

**Antes de tirar uma frase de quem escreve**, confirma-se que a skill dona já a
diz; se não diz, ela entra na skill em `M-7`. Nada que hoje orienta o
preenchimento se perde — muda de lugar.

`agent-contract.md` e `migration.md` só mudam se a varredura de `M-3` os pegar
depois da fronteira de leitor.

### `M-7` — o plugin

- As 21 citações ao rastro interno em sete skills (sete só em `glossary-keeper`;
  nenhuma em `decision-recorder` nem nos comandos) viram texto corrido que diz o
  que o item diz.
- As referências a `templates/…` ficam: o agente lê o template na raiz do toolkit
  instalado.
- `charter-keeper`, `glossary-keeper`, `working-agreements-keeper`,
  `contract-keeper`, `requirements-keeper` e `release-historian` recebem a
  orientação de escrita que saiu das sementes em `M-6`, só a que ainda faltar.
- `decision-recorder` e `release-historian` ganham no checklist: nenhum comentário
  do template sobrevive ao preenchimento — verificação: humana.
- O que `test/plugin/authoring.test.ts` já cobra continua valendo: seções da §11 na
  ordem, e todo item de checklist nomeia sua verificação.

### `M-8` — as mensagens

Hoje, cerca de 60 linhas de string em dezessete arquivos: `src/checks/ci1` a
`ci10` (`catalog.ts` não cita), `src/hooks/hk2`, `hk6`, `hk7` e `hk8`,
`src/cli/index.ts`, `src/cli/init.ts` (`M-5`) e `src/config/ownership.ts`. A
lista exata é a que o caso 3 de `M-3` reprova.

- **Parêntese de rastro** — "(spec §4)", "(`RN-0013`; skill dona:
  release-historian)": a citação ao toolkit sai; "skill dona", `CI-n` e `HK-n`
  ficam. O ID removido vai para um comentário acima da string (`E-5`).
- **Frase que se apoia no ID** — "mudá-lo é `ADR-0009` novo", "anti-requisito da
  spec §13": vira o que o ID dizia, na língua de quem instala. No primeiro
  exemplo: o limiar é do toolkit, não do projeto.
- **A linha de orçamento do `validate`** mostra o teto sem `RNF-0005`.
- **`CHECK_CATALOG`** não cita hoje. Se alguma descrição mudar,
  `docs/contracts/checks.gen.md` é regerado por `node src/tools/gen-checks.ts` —
  editar à mão é bloqueado por `HK-2`.

Os `assert` que casam com ID em `test/` olham para os IDs das fixtures
(`ADR-0001`, `DA-0001`), não para o parêntese de rastro; a reescrita não deve
exigir mudança de teste além de `M-3`. Teste que quebrar é lido antes de ser
ajustado.

### `M-9` — o contrato do agente

Uma linha na seção de política do `CLAUDE.md`, dizendo que texto que o toolkit
entrega a quem instala não carrega o rastro interno do toolkit, e que o teste de
distribuição cobra.

- **Não vai para `templates/agent-contract.md`**: é política de quem mantém o
  toolkit, não de quem o instala.
- A frase é redigida diferente do enunciado de `RN-0031` (`RN-0020`).
- O `CLAUDE.md` tem hoje 53 linhas; a fronteira de leitor acrescenta três, e o
  teto de `test/docs/agent-contract.test.ts` é 60. O item cabe em até quatro
  linhas — o plano mede antes de escrever.

### `M-10` — o `CHANGELOG`

`src/cli/**`, `src/config/ownership.ts`, `plugin/**` e `templates/**` são
`consumer-visible-paths`; `CI-6` cobra a entrada, e `CI-11` cobra que ela não
cite ID de artefato.

- **Changed:** as sementes do `init` e os comentários do `.ownership.yml` e do
  workflow deixam de citar decisões internas do toolkit e de trazer instrução de
  preenchimento; as mensagens dos checks e hooks e o texto das skills deixam de
  citar regras internas do toolkit.

---

## 4. Ordem de aplicação

Cada passo só afirma o que já é verdade quando ele roda.

1. `M-1` e `M-2` — a regra e a decisão vêm antes do código.
2. `M-3` — o teste, com os três casos vermelhos.
3. `M-4`, `M-5` e `M-6` — o caso 1 fica verde.
4. `M-7` — o caso 2 fica verde.
5. `M-8` — o caso 3 fica verde.
6. `M-9` e `M-10`.

**Os lembretes de commit.** `src/checks/**` e `src/hooks/**` são vigiados por
`docs/requirements/rules.md`, `src/cli/**` por `functional.md` e
`plugin/skills/**` por `CONTRIBUTING.md`: `HK-5` pergunta. Fora do passo 1, a
saída é `Docs: none — <razão>` no commit — a regra já foi escrita, e nada muda em
como se trabalha neste repositório além de `M-9`.

**Verificação final:** `npm test`, `npm run typecheck`,
`node src/cli/index.ts validate`, `node src/cli/index.ts drift`,
`node src/cli/index.ts changelog --base master` — e a prova que motivou esta spec,
repetida: `init --stage production` e `--stage multi-team` num diretório
temporário, com a busca por `ADR-`, `DA-`, `RN-`, `spec §`, `docs/superpowers`,
`Semente criada` e `Skill dona` voltando vazia.

---

## 5. O que esta spec não faz

- **Não migra repositório já instalado.** O `init` não reescreve e não avisa.
- **Não mexe nos documentos deste repositório.** Os comentários `Skill dona` em
  `docs/contracts/` e em `docs/deprecations.md` ficam: aqui o rastro é interno.
- **Não emenda a spec do toolkit** (`E-6`), e não toca comentário de código nem
  mensagem de commit.
- **Não cria check `CI-n`** nem muda o contrato público: nenhuma chave, nenhum
  código de saída, nenhum formato de saída muda.
- **Não trava por teste** a faixa `B`, a prosa `G` externa nem narração de roteiro
  (`M-3`).
- **Não promove nada.** `ADR-0018` e `RN-0031` nascem `draft`.
