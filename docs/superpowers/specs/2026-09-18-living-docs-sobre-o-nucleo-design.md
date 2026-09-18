# Living-docs sobre o núcleo — design

Segunda fatia da migração do living-docs. A primeira
(`docs/superpowers/specs/2026-09-18-migracao-do-living-docs-para-packages-design.md`)
moveu o pacote para `packages/living-docs/` sem mudar o que ele faz. Esta faz o
living-docs **adotar** o `@esliph/ownership`: ler o esquema v2 pela biblioteca do
núcleo, entregar ao núcleo as regras que são dele e renomear as que ficam.

**Nada aqui é decisão aceita.** As decisões que esta spec obriga a registrar
estão na seção 9, para abrir como `draft` e promover por ato humano.

## 1. Escopo e fronteira

A spec anterior (§12) listou o que ficava para depois. Esta spec cobre dois
blocos, A e B, e deixa um terceiro, C, para outra:

- **A. Adoção do núcleo.** Esquema v2, `owned` único, blocos por plugin, fim de
  `consumer-visible-paths`, cobertura de citação estendida ao `ownership` e
  glossário.
- **B. Divisão e renomeação.** Cada regra roda num plugin só, e as regras do
  living-docs deixam de ser `CI-n`/`HK-n` e passam a ser `living-docs/nome`.
- **C (fora).** Publicação do `@esliph/ownership` no npm e a volta da instalação
  remota do living-docs.

**O living-docs nasce de novo sobre o núcleo.** Não há comando de migração v1→v2,
nem público nem interno, nem leitura dupla, nem alias de nome antigo. O arquivo
deste repositório é reescrito à mão na v2, e quem clonou o toolkit reescreve o
seu, guiado pelo CHANGELOG. Hoje só o autor usa o plugin, e nada foi lançado
(`CHANGELOG.md` só tem `[Unreleased]`). Isso diverge da spec do núcleo (§10), que
pedia um comando de migração, e a divergência vira decisão registrada (seção 9).

**Fora desta spec** está na seção 10.

## 2. Dependência

`packages/living-docs/package.json` ganha:

```json
"dependencies": { "@esliph/ownership": "file:../ownership" }
```

O npm (11.x, `install-links=false`) resolve isso por symlink. No checkout, o
living-docs importa o `src/*.ts` do núcleo com `--conditions=development`, a
mesma condição que o `dev-resolution.test.ts` do núcleo já prova. **Nenhum
`dist/` existe no checkout**, então não há código velho rodando em silêncio.

A condição fica ligada em todo lugar que executa o living-docs no checkout:

- `hooks/run-hook.sh` exporta `NODE_OPTIONS=--conditions=development`;
- os scripts `test` e `typecheck` do pacote; no `typecheck`, pela opção
  `customConditions: ["development"]` do `tsconfig.json`;
- a invocação documentada da CLI (`CLAUDE.md`, `CONTRIBUTING.md`, README e CI).

**O custo, registrado como dívida.** No cache do marketplace, o `../ownership`
aponta para um diretório que não existe. O `npm ci` do living-docs falha, e sem
`node_modules` todos os hooks do living-docs falham abertos. A instalação remota
do living-docs fica quebrada até a publicação. Isso vira um `TDR` (`/debt`) com
gatilho de pagamento observável: `@esliph/ownership` publicado no npm, momento em
que a dependência passa a ser uma faixa semver do registro.

Consequências nos testes da fatia anterior:

- `test/distribution/lockfile.test.ts` regenera o lockfile num diretório
  temporário que reproduz `packages/living-docs` e `packages/ownership` lado a
  lado, para o `../ownership` resolver.
- `test/distribution/plugin-cache.test.ts` mantém o controle (sem dependências, o
  hook se cala) e o modo `100755` do wrapper. A asserção de que o hook responde do
  cache vira `todo`, com o motivo por extenso. O comentário de código cita o TDR.

## 3. Mudanças no núcleo

Duas, pequenas e isoladas em `packages/ownership`.

**Bloco de plugin no topo da raiz.** A v1 tem configuração do living-docs fora
de qualquer entrada: `stale-after-months` (usado aqui), `id-format` e
`last-reviewed-bump-limit`. A v2 só aceitava bloco de plugin dentro de uma
entrada `owned[]`. Passa a aceitar também, **só no arquivo raiz**, chaves de topo
cujo nome está em `plugins:`, repassadas opacas em `RootFile.pluginBlocks` e
`ResolvedConfig.pluginBlocks`. Num arquivo filho é erro, pela mesma razão de
`plugins:` ser exclusivo da raiz.

As alternativas foram descartadas. Repetir a configuração em cada entrada faria
~20 cópias de um valor global e abriria famílias com formatos de ID diferentes.
Um arquivo de configuração próprio do living-docs seria o "um arquivo por plugin"
que a pesquisa já tinha descartado.

**Erro de v1.** O erro deixa de dizer "a migração ainda não tem comando próprio".
Passa a dizer que o esquema v1 não é lido e que o arquivo precisa ser escrito na
v2.

**API pública.** Cresce só no que o living-docs importa: `parseItemsTable`,
`parseItemsSections`, `DocItem`, `findTransitions` (já exportado), o registro de
checks do núcleo (para o contrato gerado, seção 6) e `pluginBlocks` da raiz.

## 4. O `.ownership.yml` deste repositório

`docs/.ownership.yml` vai por `git mv` para **`.ownership.yml`, na raiz**. O
arquivo governa `packages/**`, `.github/**`, `bin/**` e `CLAUDE.md`, não só
`docs/`, e a spec do núcleo (§7) já o desenhava ali. Todo texto que cita
`docs/.ownership.yml` passa a citar `.ownership.yml`.

**Topo:**

```yaml
version: 2
plugins: [living-docs]
living-docs:
  stale-after-months: 6
```

**`artifacts` e `documents` viram um `owned` só.** As chaves específicas descem
para `living-docs:`, e as de leitura descem para `format:`.

| Entrada                | Núcleo                                                                                    | Bloco `living-docs:`                                     |
| ---------------------- | ----------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| ADR, TDR, REL          | `states` declarado no arquivo                                                             | `id-prefix`, `append-only`, `mutable-fields`, `audience` |
| DA                     | `states: [open, resolved]`, `format: { collection: table, key: ID, state-field: Status }` | `id-prefix`, `field-map`                                 |
| RF, RNF, RN            | `format: { collection: sections, key: first-token }`                                      | `id-prefix`, `cited-by`                                  |
| documentos sem família | `path`, `owner`, `skill` quando houver                                                    | `role`, `audience`                                       |

- **Estados.** Hoje eles vêm embutidos no código, por prefixo (`statesFor`). Aqui
  passam a ser declarados por entrada, porque `states` é do núcleo e o
  vocabulário de estado é do projeto.
- **Cobertura de citação.** O `cited-by` de RF e RNF passa a incluir
  `packages/ownership/test/**`, e o de RN também `packages/ownership/src/**`.
- **A sobreposição sai.** As duas entradas de `docs/superpowers/research/…`
  somem, porque `docs/superpowers/` já as cobre com o mesmo `owner` e sem skill.
  A v2 recusa sobreposição.

**Cobertura sobre o repositório inteiro.** O `ownership/owner-coverage` exige que
todo arquivo tenha entrada `owned` ou esteja em `ignore`. A v1 só cobrava do
ownership para fora. O arquivo ganha:

- entradas `owned` sem skill para `packages/living-docs/`, `packages/ownership/`,
  `bin/`, `.github/`, `.claude-plugin/`, os arquivos soltos da raiz e o que de
  `docs/` ainda não tem dono;
- `ignore: ['node_modules/**', '**/node_modules/**']`;
- a linha correspondente no `CODEOWNERS` para cada entrada nova.

A lista exata sai do primeiro `ownership validate` durante a implementação.

**`generated`** não muda. **`watches`** continuam os mesmos, e `consumer-visible:
true` passa a ser a única lista de caminhos visíveis ao consumidor:
`consumer-visible-paths` deixa de existir, e o teste que mantinha as duas cópias
em sincronia sai com ela. O `ownership`, que não tinha vínculo nenhum, ganha o
espelho dos vínculos do living-docs:

- `packages/ownership/src/{checks,hooks}/**` → `docs/requirements/rules.md`;
- `packages/ownership/src/cli/**` e `packages/ownership/{.claude-plugin,hooks}/**`
  → `CHANGELOG.md`, com `consumer-visible: true`.

**`derives-from` fica de fora.** Os planos daqui não têm frontmatter e moram no
mesmo `docs/superpowers/` das specs. Ligar a derivação é trabalho do SDD.

**Template do `init`.** `templates/ownership.yml` passa a semear exatamente esta
forma, com os valores do `--stage` escolhido, e o `init` escreve `.ownership.yml`
na raiz de quem instala.

## 5. Por dentro do living-docs

**A camada de config troca de dono.** `src/config/ownership.ts` deixa de parsear
YAML e vira o adaptador do bloco `living-docs:`:

```ts
loadLivingDocsConfig(root): LivingDocsConfig
// = resolveOwnership(...) do núcleo  +  validação estrita dos blocos living-docs
```

- Chama `resolveOwnership`, que acha o arquivo pela ordem de candidatos, valida
  o esquema, a disjunção e as bases. `OwnershipError` sobe como está.
- Valida o bloco de topo (`stale-after-months`, `id-format`,
  `last-reviewed-bump-limit`) e o de cada entrada (`id-prefix`, `append-only`,
  `mutable-fields`, `cited-by`, `field-map`, `audience`, `role`) com o rigor de
  hoje: chave desconhecida é erro.
- **O discriminador muda.** Artefato é a entrada `owned` com
  `living-docs.id-prefix`, e documento é a entrada sem ele. `ArtifactRule` e
  `DocumentRule` sobrevivem como tipos, construídos a partir de
  `ResolvedOwnedRule`, para que os checks que ficam mudem pouco.
- `OWNERSHIP_PATH` some. Quem precisava do caminho usa `config.rootFile`.

**O que sai do living-docs porque o núcleo já tem:**

- **Parsing de itens.** `docs/table.ts`, `docs/sections.ts` e `docs/item.ts`
  saem, e entram `parseItemsTable`/`parseItemsSections` do núcleo, que leem por
  `format`. A forma de ID sai do parser: o living-docs aplica `id-format` sobre a
  chave opaca que recebe, e essa é política dele.
- **Estados por prefixo.** `statesFor` sai. Os estados vêm de `rule.states`.
- **`config/watches.ts` e `config/codeowners.ts`.** Só as regras que vão para o
  núcleo os usavam (seção 6).

**O que fica, de propósito:** `git/`, `exec/` e `frontmatter/`. O núcleo tem
cópias portadas deles, mas trocá-las por import é limpeza que não muda resultado
e incharia um diff que já é grande. Fica fora desta spec (seção 10).

**`HK-3` fica no living-docs.** Ele passa a usar `findTransitions` do núcleo
para parear antes e depois e mantém a lista fixa, por prefixo, de transições
que exigem gente. Tirá-lo antes da `DA-0004` apagaria o guarda, já que o
`promotion-guard` do núcleo espera essa decisão.

## 6. Divisão das regras

Cada regra roda uma vez, num plugin só. As que saem do living-docs já estão
implementadas no núcleo:

| Sai do living-docs                                                                    | Quem assume                        |
| ------------------------------------------------------------------------------------- | ---------------------------------- |
| `CI-5` (drift de gerado)                                                              | `ownership/generated-drift`        |
| `CI-6` (changelog exigido)                                                            | `ownership/consumer-change-logged` |
| `CI-1`, parte: `owner` válido e `status` dentro de `states`                           | `ownership/declared-state`         |
| `CI-7`, parte: entrada no ownership, CODEOWNERS, `watches[].doc` existente e com dono | `ownership/owner-coverage`         |
| `CI-7`, parte: caminho vigiado alterado sem o doc dono                                | `ownership/watch-satisfied`        |
| `HK-2` (artefato gerado)                                                              | `ownership/generated-guard`        |
| `HK-4` (lembrete de vigiado)                                                          | `ownership/watch-reminder`         |
| `HK-5` (guarda de commit)                                                             | `ownership/commit-guard`           |

O que fica de `CI-1` é o frontmatter completo e o `trigger` que não é cadência.
O que fica de `CI-7` é o contrato do agente repetindo frase, a Definition of Done
sem verificação e o caminho reivindicado por decisão aberta.

**CLIs.**

- O `living-docs` perde `drift` e `changelog` e fica com `validate [--base]`, que
  roda só as regras dele, e `init`.
- `.github/workflows/living-docs.yml` roda `ownership validate`,
  `ownership validate --base …`, `living-docs validate` e
  `living-docs validate --base …`, pelos caminhos
  `node packages/<pacote>/src/cli/index.ts`.
- O `init` semeia as duas CLIs no workflow de quem instala. `--invoke` continua
  sendo o do living-docs, e entra `--invoke-ownership`, com padrão
  `npx ownership`. Enquanto o pacote não estiver no npm, esse padrão não funciona
  fora daqui, e isso entra no mesmo TDR da seção 2.

**Plugins e marketplace.**

- `.claude-plugin/marketplace.json` ganha o plugin `ownership`
  (`source: ./packages/ownership`, versão igual à do `plugin.json` dele).
- O `plugin.json` do living-docs ganha `dependencies: ["ownership"]`.
- O `hooks.json` do living-docs perde as três entradas que foram para o núcleo.
- O plugin `ownership` funciona sozinho no cache: roda `.ts` do próprio
  diretório, fora de `node_modules`, e as dependências dele (`yaml`, `picomatch`)
  vêm do npm. Ele ganha o próprio `plugin-cache.test.ts`, espelho do living-docs,
  e esse passa de verdade.
- As configurações deste projeto passam a habilitar `ownership@esliph` ao lado de
  `living-docs@esliph`.

**Contrato gerado.** `docs/contracts/checks.gen.md` passa a listar as regras dos
dois plugins, uma seção por plugin. O `gen-checks.ts` importa o registro de
checks do núcleo. A Definition of Done passa a citar os nomes dos dois.

## 7. Renomeação

Mecânica: mesmos achados, e só o identificador muda.

| Hoje                 | Nome                                                                                                       |
| -------------------- | ---------------------------------------------------------------------------------------------------------- |
| `CI-1` (o que resta) | `living-docs/frontmatter`                                                                                  |
| `CI-2`               | `living-docs/id-integrity`                                                                                 |
| `CI-3`               | `living-docs/citation-coverage`                                                                            |
| `CI-4`               | `living-docs/staleness`                                                                                    |
| `CI-7` (o que resta) | `living-docs/agent-contract-duplication`, `living-docs/done-verifiable`, `living-docs/open-decision-claim` |
| `CI-8`               | `living-docs/links`                                                                                        |
| `CI-9`               | `living-docs/commit-discipline`                                                                            |
| `CI-10`              | `living-docs/trigger-routing`                                                                              |
| `CI-11`              | `living-docs/external-audience`                                                                            |
| `HK-1`               | `living-docs/append-only`                                                                                  |
| `HK-3`               | `living-docs/state-promotion`                                                                              |
| `HK-6`               | `living-docs/session-inventory`                                                                            |
| `HK-7`               | `living-docs/shortcut-debt`                                                                                |
| `HK-8`               | `living-docs/open-decision-guard`                                                                          |

**O resto de `CI-7` vira três nomes.** São três regras sem relação entre si. A
spec do núcleo partiu a cobertura de propriedade justamente porque "falhou o
check sete" nunca disse qual parte falhou. Um nome só repetiria o defeito, agora
com nome.

**O que acompanha a renomeação:**

- **Arquivos.** Por `git mv`, sem o prefixo numérico: `hk1-append-only.ts` →
  `append-only.ts`, `ci2-ids.ts` → `id-integrity.ts`, e assim por diante. O
  argumento do `run-hook.sh` no `hooks.json` passa a ser o nome.
- **Texto entregue.** Mensagens de CLI e de hook, skills e comandos trocam a
  citação numerada pelo nome novo, ou deixam de citar regra.
- **Documentos vivos.** `CLAUDE.md`, `CONTRIBUTING.md`, Definition of Done e
  glossário passam pelas skills donas. Os requisitos que citam `CI-n` no texto
  passam pela `requirements-keeper`.
- **Registro histórico não muda.** ADRs aceitos, specs e planos antigos ficam
  com os nomes antigos.
- **O mapa antigo → novo mora na entrada do `CHANGELOG.md`**, que é onde quem
  tinha `CI-7` na própria Definition of Done vai procurar. `CI-n` não é ID de
  artefato, e a regra de audiência externa não o cobra.

**Glossário.** **Artefato** e **Documento** passam a ser discriminados por
`living-docs.id-prefix`, e não mais pela lista em que a entrada está.

## 8. Execução e prova

Cada commit fica verde em `npm test`, `npm run typecheck`,
`ownership validate` (a partir do commit 3) e `living-docs validate`.

0. **A regra antes do código.** Os ADRs e o TDR da seção 9, e a
   `requirements-keeper` revisando os requisitos que os commits seguintes
   invalidam.
1. **Núcleo.** Bloco de topo, erro de v1 e API pública (seção 3).
2. **Dependência.** `file:../ownership`, condição `development`,
   `lockfile.test.ts` ajustado e `plugin-cache.test.ts` do living-docs com a
   asserção em `todo` (seção 2).
3. **Adoção e divisão dos checks.** O adaptador de config, o `.ownership.yml` v2
   na raiz, o CODEOWNERS e a remoção dos checks que foram para o núcleo (seções 4
   a 6). Os hooks `HK-2`, `HK-4` e `HK-5` passam a ler a v2 pelo adaptador e
   continuam registrados. É o commit grande.
4. **Plugins, hooks e CI.** Marketplace, `dependencies`, a remoção de `HK-2`,
   `HK-4` e `HK-5` junto com as entradas deles no `hooks.json`,
   `plugin-cache.test.ts` do `ownership`, workflow com as duas CLIs, `init` com
   `--invoke-ownership` e as configurações do projeto. Os hooks saem no mesmo
   commit em que o plugin que os assume passa a ser instalável, e o repositório
   não fica nenhum commit sem os guardas.
5. **Renomeação** (seção 7).
6. **Documentos vivos.** `CLAUDE.md`, `CONTRIBUTING.md`, Definition of Done,
   glossário, README e CHANGELOG com o mapa antigo → novo.

**Linha de partida.** Gravada no plano antes do commit 2: os achados de
`validate`, `drift` e `changelog`, as contagens de teste dos dois pacotes e o
hash de `docs/contracts/checks.gen.md`.

**Nenhum caso de teste se perde.** Antes de apagar os testes de `CI-5`, `CI-6`,
`HK-2`, `HK-4`, `HK-5` e das partes de `CI-1` e `CI-7`, cada caso é confrontado
com os testes do núcleo. O que o núcleo não cobre é portado para lá antes da
remoção, e a descrição do PR leva a tabela desse confronto.

**Regra única.** Um teste novo monta um repositório de fixture com uma violação
de cada regra movida: o `ownership validate` a reporta e o `living-docs validate`
fica calado. Um segundo teste faz a recíproca para as regras que ficaram. Um
terceiro afirma que os `hooks.json` dos dois plugins não têm hook em comum.

**Cache.** O `plugin-cache.test.ts` do `ownership` passa de verdade. O do
living-docs fica `todo`, amarrado ao TDR.

**Renomeação.** Mesmos achados antes e depois, com o ID trocado. O
`checks.gen.md` muda de hash de propósito, e o conteúdo novo é conferido.

**Contagens.** As contagens de teste vão mudar: testes saem com as regras
movidas, e entram os de regra única e de cache. O plano grava o delta esperado
por commit, e diferença sem explicação é defeito.

## 9. Decisões a registrar

Como `draft`, para promoção humana.

| Decisão a abrir         | Sobre                                                                               | Efeito                                                                                     |
| ----------------------- | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| bloco de plugin no topo | a raiz aceita blocos com nome listado em `plugins:`, opacos ao núcleo               | refina `ADR-0020` sem editá-lo                                                             |
| v1 abandonada           | o living-docs nasce sobre a v2; não há comando de migração nem leitura dupla        | diverge da §10 da spec do núcleo                                                           |
| hooks em dois plugins   | o living-docs depende do plugin `ownership` e deixa de registrar os hooks do núcleo | a `decision-recorder` avalia se reabre `ADR-0012` (hooks como peça única) com decisão nova |

| Dívida a registrar              | Gatilho de pagamento                                                                                                                                                                                  |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| dependência `file:../ownership` | `@esliph/ownership` publicado no npm: a dependência vira faixa semver, o `plugin-cache.test.ts` do living-docs volta a exigir o hook, e o padrão de `--invoke-ownership` passa a funcionar fora daqui |

A renomeação já está coberta por `ADR-0026` (identificador nomeado), e a
fronteira das regras, por `ADR-0019`.

## 10. Fora desta spec

- **Publicação no npm** e a volta da instalação remota do living-docs (fatia C).
- **O `promotion-guard` do núcleo**, que espera a `DA-0004`. Até lá, `HK-3`, já
  como `living-docs/state-promotion`, continua sendo o guarda.
- **A troca das cópias portadas** de `git/`, `exec/` e `frontmatter/` por import
  do núcleo.
- **`derives-from` neste repositório** e o **plugin SDD**.
- **Composição entre arquivos** neste repositório. O arquivo continua sendo uma
  raiz única, sem `include` e sem `basePath`.
