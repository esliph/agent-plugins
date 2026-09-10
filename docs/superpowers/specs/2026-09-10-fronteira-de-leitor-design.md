# Fronteira de leitor — especificação

A rastreabilidade por ID continua valendo entre os artefatos, os testes, o código
e as mensagens de commit. Esta spec traça a fronteira com **quem lê de fora** — o
visitante do README, quem lê o CHANGELOG para decidir se atualiza, quem segue um
guia de migração. Para esse leitor, `ADR-0003` ou `RNF-0006` é ruído: ele não tem
como saber o que o ID significa, e um link até o artefato o joga dentro de um
documento interno de decisão.

Ela não repete o que os artefatos donos dizem. A regra vigente está em
`docs/requirements/`, a decisão em `docs/decisions/adr/`, o modo de trabalho em
`CONTRIBUTING.md` e o critério de pronto em `docs/definition-of-done.md`.

**Insumo obrigatório de quem for planejar:**
`docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` §8 (a
citação uniforme) e §5, `SK-7`, regra 5 (o guia de migração apontando o ADR) —
os dois trechos que esta entrega **não** emenda; `ADR-0008` (`documents:`),
`ADR-0006` (`consumer-visible`), `RN-0007` e `RN-0013`;
`docs/contracts/versioning-policy.md` (o que é identificador público); e
`RN-0010`/`RN-0020` (o que o contrato do agente pode dizer).

---

## 1. O que decidiu quem pediu

| #     | Escolha                                                                                                                          | Consequência aceita                                                                                                                                             |
| ----- | -------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `E-1` | É **regra do toolkit**, não limpeza deste repositório                                                                            | Skill, templates e `init` mudam junto. Repositório já instalado só ganha a verificação se marcar os documentos à mão                                            |
| `E-2` | A regra se verifica por **check de CI** (`CI-11`), com severidade de erro e **sem rótulo de exceção**                            | O contrato público cresce: um check novo e uma chave nova no `.ownership.yml`. O conserto é sempre reescrever — não há como declarar "este ID pode ficar"       |
| `E-3` | A marca é **uma chave por entrada**, `audience: external`, em `documents:` e em `artifacts:`                                     | Sem a chave, o documento é interno e não é verificado. Não existe lista de caminhos paralela para divergir de `documents:`                                      |
| `E-4` | **Os IDs da interface pública continuam citáveis** — `CI-n`, `HK-n`, `SK-n`, `CM-n`, `EXIT-n`                                    | Quem lê de fora continua vendo IDs, só que os que a saída do CLI já mostra a ele e que a política de versionamento promete não redefinir                        |
| `E-5` | **A spec do toolkit não é emendada.** `ADR-0017` registra que ela vale para dentro, e que a fronteira com quem lê de fora é dele | A spec continua dizendo "uniforme em código, teste, doc e mensagem de commit" e "apontando o ADR que a decidiu". Quem lê só a spec não vê a fronteira sem o ADR |
| `E-6` | **ID no caminho de um link conta**, mesmo que não apareça no texto renderizado                                                   | O README não pode linkar um ADR pelo nome do arquivo. É a alternativa "ID com link" que `ADR-0017` descarta, aplicada de forma consistente                      |

`E-4` e `E-3` juntos são o que torna a regra barata: a fronteira sai da
configuração que já existe, e a §2 explica por quê.

---

## 2. A invariante: o check não conhece prefixo nenhum

**Interno é o prefixo declarado em `artifacts:`.**

`CI-11` não carrega lista de prefixos. Ele lê `config.artifacts[].idPrefix` e só
isso. Os identificadores públicos não são famílias de artefato — ninguém declara
`CI` em `artifacts:` —, então ficam de fora sem que nenhuma exceção precise ser
escrita. Um projeto que declara um prefixo novo ganha a fronteira no mesmo
commit, e um projeto em estágio `solo` que ainda não declarou `RN` não é cobrado
por um `RN-0001` solto: é a mesma fronteira que `CI-2` já usa (`RN-0007`, fora de
escopo).

Isso mantém verdadeira a regra de §3 da spec do toolkit — hooks e checks não
conhecem caminho nenhum — estendida a prefixo.

---

## 3. As catorze mudanças

| ID     | Mudança                                                                 | Arquivo                                                                                        |
| ------ | ----------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `M-1`  | Nasce `ADR-0017`, a fronteira de leitor                                 | `docs/decisions/adr/`                                                                          |
| `M-2`  | Nasce `RN-0030`, a regra                                                | `docs/requirements/rules.md`                                                                   |
| `M-3`  | Nasce `RF-0015`, o que o `init` marca                                   | `docs/requirements/functional.md`                                                              |
| `M-4`  | Nasce o termo _Documento externo_                                       | `docs/glossary.md`                                                                             |
| `M-5`  | O parser aceita `audience`                                              | `src/config/ownership.ts`                                                                      |
| `M-6`  | Nasce `CI-11`                                                           | `src/checks/ci11-external-audience.ts`, `src/checks/registry.ts`                               |
| `M-7`  | O contrato público registra o check e a chave                           | `src/checks/catalog.ts`, `docs/contracts/checks.gen.md`, `docs/contracts/versioning-policy.md` |
| `M-8`  | Testes travam o parser e o check                                        | `test/config/ownership.test.ts`, `test/checks/ci11-external-audience.test.ts`                  |
| `M-9`  | O `init` marca o rastro histórico como externo, e avisa quando não pode | `src/cli/init.ts`, `test/cli/init.test.ts`                                                     |
| `M-10` | A skill e o template de migração param de pedir o ID do ADR             | `plugin/skills/release-historian/SKILL.md`, `templates/migration.md`                           |
| `M-11` | O contrato do agente ganha a política                                   | `CLAUDE.md`, `templates/agent-contract.md`                                                     |
| `M-12` | Este repositório reescreve em texto corrido o que cita ID               | `README.md`, `CHANGELOG.md`, `docs/deprecations.md`                                            |
| `M-13` | A entrada de `## [Unreleased]` registra a mudança visível               | `CHANGELOG.md`                                                                                 |
| `M-14` | Este repositório marca os próprios documentos externos                  | `docs/.ownership.yml`                                                                          |

### `M-1` — a decisão

`ADR-0017 — Fronteira de leitor: ID de artefato é rastro interno`.
`relates-to: [RN-0030, RF-0015, RN-0013, RN-0007]`, `supersedes: null`.

**Contexto.** A spec do toolkit manda citar por ID de forma uniforme e manda o
guia de migração apontar o ADR. Nenhum dos dois trechos distingue quem lê. O
resultado são documentos escritos para quem vem de fora carregando IDs que só
resolvem dentro do repositório — e, para quem instala o pacote ou o plugin,
`docs/` pode nem estar à mão.

**Alternativas a registrar como consideradas e descartadas:**

- **Manter a citação uniforme.** É o problema.
- **Permitir o ID desde que venha com link para o artefato.** O visitante cai num
  documento interno de decisão, e o texto de fora passa a depender do de dentro
  para fazer sentido.
- **Verificação só humana**, no checklist da skill. É justamente o texto que
  skill e agente escrevem sozinhos, e o ID volta sem que ninguém veja.
- **Uma lista de topo `external-docs:`**, como `consumer-visible-paths`. É uma
  segunda lista de caminhos que diverge de `documents:` — o repositório já
  precisou de um teste só para impedir duas listas assim de derivar
  (`test/docs/release-history.test.ts`).
- **Reaproveitar `role`.** O vocabulário é fechado e vale "um papel, um
  documento": não marca CHANGELOG, migrações e README ao mesmo tempo.

**Decisão.** Documento ou artefato declarado `audience: external` não cita ID de
artefato. O vínculo entre ele e o artefato continua existindo, e mora do lado de
dentro — no próprio artefato, quando ainda é editável, ou na mensagem de commit.
Os identificadores da interface pública continuam citáveis.

O ADR precisa dizer, no texto, **por que a spec não é emendada** (`E-5`): a
citação uniforme segue valendo em tudo que é interno, que é quase tudo; a
fronteira é um recorte, não uma reversão.

**O que se aceita perder:**

- **Quem lê de fora e quer o porquê perde o atalho.** O caminho vai de dentro
  para fora, não o contrário.
- **O vínculo guia de migração → ADR passa a morar na mensagem de commit.** Um
  ADR aceito é congelado por `HK-1` e não pode ganhar a citação ao guia escrito
  depois dele; o commit que cria o guia cita o ADR. A verificação era humana e
  continua humana — não se perde enforcement, mas o vínculo fica menos à vista.
- **Repositório já instalado não é verificado** até marcar os documentos à mão.
- **A spec continua afirmando a uniformidade** (`E-5`).
- **README e CHANGELOG deste repositório são reescritos** (`M-12`).

Nasce `draft`.

### `M-2` — a regra

`RN-0030 — Documento para quem vem de fora não cita ID de artefato`.
`relates-to: ADR-0017, RN-0013`.

**Fora de escopo:** os identificadores da interface pública, que a política de
versionamento declara; o frontmatter, que é contrato de máquina e é de `CI-1`; e
bloco de código cercado, que é exemplo.

O enunciado diz que o corpo de um documento ou artefato declarado
`audience: external` não contém citação a prefixo declarado em `artifacts:` — em
prosa, entre crases ou no caminho de um link —, e diz por quê: quem lê de fora
não resolve o ID, e o vínculo que o ID carregaria existe e mora do lado de
dentro.

Nasce `draft`.

### `M-3` — o `init`

`RF-0015 — init marca como externo o que é escrito para quem vem de fora`.
`relates-to: RF-0009, RF-0012, RN-0030`. `RF-0009` e `RF-0012` não são
reescritos.

No estágio `production` em diante, uma instalação nova declara `CHANGELOG.md`,
`docs/deprecations.md`, `docs/migrations/` e o artefato `REL` com
`audience: external`.

Num repositório que já declara essas entradas sem a chave, o `init` **não
reescreve a linha** — mesma política de `declareDocuments`, `declareArtifacts` e
`declareCodeowners`. Ele relata, em `notInstalled`, cada entrada declarada sem a
marca, dizendo que marcar é o que liga `CI-11` para ela.

**Fora de escopo:** o `README.md` de quem instala. O `init` não declara a raiz do
repositório como documentação (`src/docs/corpus.ts`), e não passa a declarar por
causa disto.

Nasce `draft`.

### `M-4` — o termo

Uma linha nova na tabela, `status: draft`:

- **Termo:** Documento externo.
- **Definição:** documento ou artefato declarado `audience: external`, escrito
  para quem lê o repositório sem participar dele.
- **Nome no código:** `audience`.
- **Não confundir com:** caminho `consumer-visible` — que é **código** cuja
  mudança exige entrada no CHANGELOG, e não um documento.
- **Fonte:** `ADR-0017`, `RN-0030`.

A confusão listada é real: os dois nomes falam de "quem consome", e um deles é
sobre código, o outro sobre texto.

### `M-5` — o parser

`ArtifactRule` e `DocumentRule` ganham `audience: Audience`, com
`AUDIENCES = ['internal', 'external'] as const` como vocabulário fechado, no
mesmo desenho de `DOCUMENT_ROLES`.

- Ausente, vale `internal`. Nenhum `.ownership.yml` escrito antes muda de
  significado.
- Valor fora do vocabulário é `OwnershipError`, com a lista dos aceitos — a
  mesma forma da mensagem de `role`.

### `M-6` — o check

`CI-11`, nome `external audience`. Entra em `validateChecks()`, depois de
`CI-10`: é check de estado da árvore e não precisa de diff.

**O que lê.** As entradas de `context.documents` e de `context.docs` cuja regra
tem `audience: 'external'`.

**Como lê.**

1. As linhas do frontmatter são apagadas **preservando a contagem**, para que a
   linha reportada seja a do arquivo. O frontmatter vem do `parseFrontmatter` que
   a coleta já fez.
2. Artefato com `syntaxError` no frontmatter é pulado: `CI-1` já reprova, e ler o
   frontmatter quebrado como corpo produziria achado duplicado sobre o `id:`.
3. `stripFences` tira o bloco cercado e **mantém** o código inline — é
   exatamente a função que existe para quem procura um ID escrito entre crases.
4. `findCitations(texto, config.idFormat)` acha as citações; cada uma passa por
   `parseId`, e conta quando o prefixo está no conjunto de `artifacts:`.

Conta **qualquer** citação a prefixo declarado: a que resolve, a retirada e a
que não resolve. A regra é sobre o que o leitor vê, não sobre o ID existir.

**Achado.** Severidade `error`, com arquivo e linha. A mensagem nomeia o ID e diz
que o arquivo é lido por quem vem de fora; a correção diz para escrever em texto
corrido o que o item decide ou exige, e que o vínculo fica no artefato ou na
mensagem de commit.

**Sem rótulo de exceção** (`E-2`).

### `M-7` — o contrato público

- **`CHECK_CATALOG`** ganha `CI-11`, comando `living-docs validate`, com o "falha
  quando" dizendo: documento ou artefato declarado `audience: external` cita, fora
  do frontmatter e de bloco de código cercado, um ID cujo prefixo está declarado
  em `artifacts:` — em prosa, entre crases ou no caminho de um link.
- **`docs/contracts/checks.gen.md`** é regerado por `node src/tools/gen-checks.ts`.
  Editar à mão é bloqueado por `HK-2`, e `CI-5` compara.
- **`versioning-policy.md`**, em "O que é público", ganha a chave `audience` de
  `documents:` e `artifacts:` e os dois valores que ela aceita, ao lado de
  `consumer-visible`.

### `M-8` — os testes

Escritos antes do código. Citam `RN-0030` (check) e `ADR-0017` (parser).

`test/checks/ci11-external-audience.test.ts`, com um caso por fronteira:

1. ID de artefato em prosa, em documento externo — reprova, na linha certa.
2. ID entre crases — reprova.
3. ID só no caminho de um link — reprova.
4. ID dentro de bloco cercado — passa.
5. ID só no frontmatter de um artefato externo (`id: REL-0001`) — passa.
6. `CI-11`, `HK-6` ou `EXIT-2` citado em documento externo — passa.
7. O mesmo ID em documento `internal` — passa.
8. ID de prefixo não declarado em `artifacts:` — passa.
9. Linha reportada correta num documento com frontmatter.

`test/config/ownership.test.ts`: chave ausente vira `internal`; `external` é
lido; valor inválido lança `OwnershipError`.

### `M-9` — o `init`

- `DocumentSeed` ganha `audience`; as três entradas de rastro histórico em
  `PRODUCTION_DOCUMENTS` nascem `external`.
- `documentEntry` escreve `audience: external` quando é o caso; `releasesBlock`
  escreve a chave no artefato `REL`.
- O comentário que `documentsBlock` escreve acima de `documents:` explica o que
  `audience` faz, em uma linha.
- Na subida de estágio, a entrada já declarada sem a marca vira aviso em
  `notInstalled` (`M-3`).

Testes em `test/cli/init.test.ts`, citando `RF-0015`: instalação nova em
`production` declara as quatro entradas externas; `small-team` não declara
nenhuma; repositório com `CHANGELOG.md` já declarado sem a chave recebe o aviso
e o arquivo não é reescrito.

### `M-10` — a skill e o template

`release-historian`:

- **Passo 5:** o guia de migração diz, em texto corrido, por que a quebra foi
  decidida; o commit que o cria cita o ADR. "Quebra sem ADR é decisão sem porquê"
  continua valendo.
- **Checklist:** a linha do guia de migração muda para a forma acima, e entra
  "nenhum documento externo cita ID de artefato — verificação: `CI-11`".

`templates/migration.md`: o comentário "O ADR que decidiu" vira a mesma
instrução.

`plugin/skills/**` é vigiado por `CONTRIBUTING.md`, e `HK-5` pergunta. A saída é
`Docs: none — <razão>` no commit: nada muda em como se trabalha neste
repositório.

### `M-11` — o contrato do agente

Uma linha na seção de política do `CLAUDE.md` e de `templates/agent-contract.md`,
dizendo que texto para quem lê de fora não carrega ID de artefato e que `CI-11`
cobra.

A frase é redigida de propósito diferente do enunciado de `RN-0030`: `CI-7`
reprova contrato que repete frase de artefato dono (`RN-0020`). O `CLAUDE.md` tem
hoje 49 linhas, e o teto de `test/docs/agent-contract.test.ts` é 60.

### `M-12` — a prosa deste repositório

Cada ocorrência vira texto corrido que diz o que o item diz, sem apontá-lo:

| Arquivo                | Linha | ID                     |
| ---------------------- | ----- | ---------------------- |
| `README.md`            | 72    | `ADR-0003`             |
| `README.md`            | 131   | `RNF-0006`             |
| `CHANGELOG.md`         | 14    | `RNF-0005`             |
| `CHANGELOG.md`         | 91    | `RNF-0006`, `ADR-0016` |
| `CHANGELOG.md`         | 101   | `ADR-0015`, `ADR-0016` |
| `CHANGELOG.md`         | 106   | `ADR-0014`             |
| `CHANGELOG.md`         | 160   | `RN-0008`              |
| `docs/deprecations.md` | 14    | `RN-0015`              |

As entradas do `CHANGELOG.md` estão todas em `## [Unreleased]`: não há seção de
versão publicada sendo reescrita.

`CHANGELOG.md:63` traz `TDR-nnnn`, que não é citação — `nnnn` não casa com o
padrão — e fica.

### `M-13` — o `CHANGELOG`

`src/checks/catalog.ts`, `src/config/ownership.ts`, `src/cli/**`, `plugin/**` e
`templates/**` são `consumer-visible-paths`; `CI-6` cobra a entrada. Ela registra,
sem nenhum ID de artefato:

- **Added:** `CI-11`; a chave `audience` e o valor padrão; o `init` de
  `production` declarando o rastro histórico como externo, e avisando em vez de
  reescrever.
- **Changed:** a skill `release-historian` e o template de migração deixam de
  pedir que o guia aponte o ADR pelo ID.

### `M-14` — a marcação deste repositório

`audience: external` em `README.md`, `CHANGELOG.md`, `docs/deprecations.md`,
`docs/migrations/` e no artefato `REL`.

É a última mudança do repositório: marcar antes de `M-12` e `M-13` reprovaria o
próprio `validate`.

---

## 4. Ordem de aplicação

Cada passo só afirma o que já é verdade quando ele roda.

1. `M-1`, `M-2`, `M-3`, `M-4` — a regra e a decisão vêm antes do código.
2. `M-8` (parser) e `M-5`.
3. `M-8` (check), `M-6` e `M-7`.
4. `M-9`.
5. `M-10` e `M-11`.
6. `M-12` e `M-13`.
7. `M-14`.

**Verificação final:** `npm test`, `npm run typecheck`,
`node src/cli/index.ts validate` (com `CI-11` ligado sobre o próprio
repositório), `node src/cli/index.ts drift` e
`node src/cli/index.ts changelog --base master`.

---

## 5. O que esta spec não faz

- **Não emenda a spec do toolkit** (`E-5`), e não toca a Constitution — a regra
  não vira princípio.
- **Não marca `docs/contracts/` como externo.** O catálogo de erros e a política
  de versionamento são lidos por quem consome, mas citam ADR e RN como fonte das
  próprias cláusulas, e o `init` também os semeia. Marcá-los é decisão própria,
  com o custo de reescrevê-los.
- **Não verifica o README de quem instala.** O `init` não o declara (`M-3`).
- **Não verifica a saída do CLI nem as mensagens de commit.** Quem lê a saída de
  um check é quem mantém o repositório, e o commit é o lugar onde o vínculo passa
  a morar.
- **Não corrige `RF-0010`**, cuja lista de "checks de hoje" já estava
  desatualizada antes desta entrega.
- **Não promove nada.** `ADR-0017`, `RN-0030`, `RF-0015` e o termo do glossário
  nascem `draft`.
