# Living-docs sobre o núcleo: plano de implementação

> **Para quem executar:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** fazer o `@esliph/living-docs` ler o esquema v2 pela biblioteca do
`@esliph/ownership`, entregar ao núcleo as regras que já são dele e renomear as
que ficam para `living-docs/nome`, sem perder caso de teste nenhum.

**Arquitetura:** o núcleo ganha duas mudanças pequenas (bloco de plugin no topo
da raiz e o erro de v1) e exporta o que o living-docs importa. O living-docs
passa a depender de `file:../ownership`, resolvido pelo código-fonte com a
condição `development`. A camada `src/config/ownership.ts` deixa de parsear YAML
e vira um adaptador do bloco `living-docs:` sobre `resolveOwnership`. As regras
que o núcleo já implementa saem do living-docs; os hooks correspondentes saem no
mesmo commit em que o plugin `ownership` passa a ser instalável. Por fim, a
renomeação troca `CI-n`/`HK-n` pelos nomes e os documentos vivos acompanham.

**Tech Stack:** Node ≥ 24 sem passo de build, `node --test`, TypeScript 5.9
(`tsc --noEmit`), npm workspaces com `file:` entre pacotes, bash (wrapper de
hooks), GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-18-living-docs-sobre-o-nucleo-design.md`.
O plano argumenta a partir dela, e quem executar lê as duas. As seções citadas
como "§n" são da spec.

## Restrições globais

- **Sem migração v1→v2 em código.** Nem comando, nem leitura dupla, nem alias de
  nome antigo, nem conversor de teste (§1). Fixture de teste v1 é reescrita à
  mão em v2.
- **Cada commit fica verde** em `npm test`, `npm run typecheck`,
  `node --conditions=development packages/living-docs/src/cli/index.ts validate`
  e, a partir da Tarefa 3,
  `node --conditions=development packages/ownership/src/cli/index.ts validate`,
  todos rodados da raiz do checkout (§8).
- **A regra antes do código.** Nenhum código da Tarefa 1 em diante é escrito
  antes do commit da Tarefa 0.
- **Você não aceita decisão.** ADR e TDR nascem `draft`/`open`; promover é ato
  humano, e o `HK-3` pergunta. Requisito revogado passa por `active → revoked`,
  que também é ato humano.
- **ADR aceito não se edita.** `ADR-0020` está `accepted`; a regra do bloco de
  topo o refina por ADR novo (§9). `HK-1` bloqueia o resto.
- **Registro histórico não muda.** ADRs, specs e planos antigos ficam com
  `CI-n`, `HK-n`, `docs/.ownership.yml` e `version: 1` (§7).
- **Texto entregue não cita o rastro interno.** `hooks/run-hook.sh`, skills,
  comandos, templates, `failsWhen` do catálogo e strings de `src/` ficam sem ID
  de artefato (`ADR-`, `RN-`, …), sem `spec §n` e sem `docs/superpowers/`.
  Comentário de código pode citar. Quem cobra: `test/distribution/internal-trail.test.ts`
  (living-docs) e `test/distribution/no-internal-trace.test.ts` (núcleo).
- **Texto `audience: external` não cita ID de artefato.** Vale para `README.md`,
  `CHANGELOG.md`, `docs/deprecations.md`, `docs/migrations/`, `docs/releases/`.
  `CI-n` e `HK-n` não são ID de artefato (§7) e podem aparecer no mapa do
  CHANGELOG.
- **`last-reviewed` não se bumpa** nos documentos editados, a menos que o
  `validate` exija.
- **`git mv`, nunca copiar e apagar**, para `.ownership.yml` e para cada arquivo
  renomeado na Tarefa 5. O checkout mora no OneDrive: se um `git mv` falhar com
  "Permission denied", pause a sincronização e repita o mesmo comando.
- **Type-check é `npm run typecheck`**, nunca `tsc` direto.
- **Mensagem de commit** em português, `tipo(ID): assunto`, terminada com
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Mudança visível a quem consome leva a entrada no `CHANGELOG.md`** no mesmo
  commit (skill `release-historian`), ou `Changelog: none — <razão>` na
  mensagem. O mapa antigo → novo é da Tarefa 6.
- **Hooks durante a execução.** O `HK-4` (depois, `ownership/watch-reminder`)
  lembra do doc dono a cada arquivo vigiado; o `HK-5` (depois,
  `ownership/commit-guard`) pergunta no commit. O doc dono viaja na tarefa, ou a
  mensagem traz `Docs: none — <razão>`.

## Review Focus

Entradas que a spec implica e que nenhum teste da própria spec exercita. Cada
linha tem teste na tarefa dona.

1. **Consumidor com `docs/.ownership.yml` v1 roda `living-docs init` de novo.**
   Esperado: o `init` não escreve `.ownership.yml` na raiz (isso criaria dois
   candidatos e travaria toda leitura por ambiguidade) e relata, em "não
   instalado", que o arquivo existente não lê na v2 e precisa ser reescrito.
   Teste na Tarefa 3, passo 3.11.
2. **Bloco `living-docs:` com valor que não é mapa** (`living-docs:` vazio,
   `true`, lista), no topo ou numa entrada. Esperado: erro de carga que nomeia o
   arquivo e o bloco, pela regra aceita em `ADR-0020` ("x: {} declara o vínculo;
   qualquer valor que não seja mapeamento é erro"). Teste na Tarefa 1, passo 1.1.
3. **Tabela de decisões sem coluna `Status`, ou requisito com título `###`.** O
   parser do núcleo lê só `##` e não exige a coluna de estado; o antigo exigia as
   duas colunas e aceitava `##` a `####`. Esperado: tabela sem `Status` produz
   itens sem estado, que o `living-docs/frontmatter` (hoje `CI-1`) reprova como
   "item sem status"; título `###` com ID deixa de ser item. Teste na Tarefa 3,
   passo 3.4.
4. **Arquivo local não versionado** (`.worktrees/`, `.claude/`, `.superpowers/`)
   no checkout de quem roda `ownership validate`. O núcleo varre o sistema de
   arquivos, não o índice do git. Esperado: nenhum achado para eles — ficam em
   `ignore`. Teste na Tarefa 3, passo 3.12: "este repositório passa nos checks
   do núcleo", que roda no checkout real, onde `.worktrees/` e `.claude/`
   existem.
5. **O mesmo defeito reportado pelos dois plugins.** Chave de item duplicada é
   achado de `ownership/declared-state` e também de `CI-2`. Esperado, pela regra
   única: cada regra movida só é reportada pelo núcleo. A duplicata de ID continua
   nos dois porque `CI-2` cobre também sequência e citação e não está na tabela
   da §6. O teste de regra única (Tarefa 3, passo 3.14) fixa isso explicitamente,
   para que a sobreposição seja vista e não descoberta.

## Pontos em aberto que o plano resolve por padrão

A spec não decide estes pontos. O plano adota o padrão indicado e a Tarefa 0
leva cada um à `decision-recorder` como parte do ADR correspondente, ou como
`DA` se ela julgar que não cabe no ADR.

- **Documento é a entrada com bloco `living-docs:` sem `id-prefix`**, não "a
  entrada sem `id-prefix`" (§5). `ADR-0020`, aceito, diz que um caminho só é do
  plugin se a entrada traz o bloco dele. Sem isso, `packages/living-docs/`,
  `bin/` e `.github/` virariam documentos e entrariam no corpus de `CI-4`,
  `CI-8` e `CI-10`. Cabe no ADR "v1 abandonada".
- **O corpus de documentação** (antes: tudo sob o diretório do
  `docs/.ownership.yml`) passa a ser a união dos caminhos das entradas com bloco
  `living-docs:`, mais os de `generated[]`. Com o arquivo na raiz, derivar do
  diretório dele faria da raiz inteira documentação. O anexo binário passa a ser
  cobrado em qualquer caminho do corpus. `RN-0016` e `RN-0023` são revistos na
  Tarefa 0.
- **DA declara `states: [open, resolved, dropped]`**, e não `[open, resolved]`
  como a tabela da §4 abrevia: é a máquina de hoje (`STATUS_MACHINE`), e
  encolhê-la mudaria achado.
- **`CI-1` "owner válido"** (frontmatter `owner` sem `@`) não existe no
  `ownership/declared-state`. É portado para lá na Tarefa 1 antes de sair do
  living-docs na Tarefa 3, como a §8 manda.
- **O workflow deste repositório muda na Tarefa 3, não na 4.** A Tarefa 3 apaga
  `drift` e `changelog`; o workflow que os chama quebraria o commit 3.
- **O `init` num repositório consumidor.** `ownership/owner-coverage` exige dono
  para todo arquivo, e nenhum `init` sabe onde mora o código de quem instala. O
  `init` semeia `ignore:` com `node_modules`, e relata em "não instalado" que o
  resto do repositório precisa ser declarado. Um `ownership validate` recém
  instalado reprova até isso ser feito. Cabe no ADR "hooks em dois plugins" ou
  vira `DA`.
- **O estágio deixa de parametrizar as regras movidas.** `ownership validate`
  roda as quatro regras de árvore em todo estágio, e `--base` roda as duas de
  diff juntas. No `production`, isso liga `ownership/watch-satisfied`, que antes
  só o `multi-team` ligava. `ADR-0012` é o afetado; mesma decisão.
- **Os utilitários de CODEOWNERS** (`parseCodeowners`, `loadCodeowners`,
  `ownersOf`) passam a ser importados do núcleo: o `init` e dois testes os usam,
  e a §5 tira `config/codeowners.ts` do living-docs. A API pública cresce nesses
  três nomes além da lista da §3, pelo mesmo critério ("só no que o living-docs
  importa").

## Linha de partida (medida em 2026-09-28, antes de qualquer mudança)

| Medida | Valor |
| --- | --- |
| `npm test --workspace packages/living-docs` | **551** testes: 549 passam, **2 falham** |
| `npm test --workspace packages/ownership` | **167** testes: 166 passam, **1 falha** |
| `living-docs validate` | **1 erro**: `CI-3` em `ADR-0020` ("resolve DA-0006, mas não a cita em `relates-to`") |
| `living-docs validate` (ponteiros) | 1 artefato gerado, 7 caminhos visíveis ao consumidor, 14 vínculos código→doc |
| `living-docs drift` | nenhuma violação |
| `living-docs changelog --base master` | nenhuma violação |
| `git hash-object docs/contracts/checks.gen.md` | `6d6030f810f62510db0c772145e24daaef3ab193` |
| `npm run typecheck` | limpo |

As três falhas de teste:

- `test/acceptance/spec-criteria.test.ts` "este repositório passa nos próprios
  checks": é o mesmo erro de `CI-3` do `validate`.
- `test/distribution/lockfile.test.ts` dos **dois** pacotes: o teste regenera o
  lockfile só a partir do `package.json`, e o registro já publicou
  `@types/node@24.19.0`. Ele reprova sempre que sai versão nova dentro da faixa.
  É defeito do teste, e a Tarefa 1 (núcleo) e a Tarefa 2 (living-docs) o
  corrigem regenerando a partir do lockfile existente.

**Pré-condição humana.** O erro de `CI-3` em `ADR-0020` não se corrige por
agente: `relates-to` não está em `mutable-fields`, e o `HK-1` nega a edição. A
Tarefa 0 começa parando e pedindo a decisão a uma pessoa.

---

### Tarefa 0: A regra antes do código

Commit de documentação. Nenhum arquivo de `packages/` muda.

**Files:**
- Create (pelas skills): `docs/decisions/adr/ADR-0028-bloco-de-plugin-no-topo-da-raiz.md`, `docs/decisions/adr/ADR-0029-living-docs-nasce-sobre-a-v2.md`, `docs/decisions/adr/ADR-0030-hooks-do-nucleo-no-plugin-ownership.md`, `docs/decisions/debt/TDR-0003-dependencia-local-do-nucleo.md`
- Modify (pela `requirements-keeper`): `docs/requirements/functional.md`, `docs/requirements/rules.md`
- Modify (pela `decision-recorder`, se abrir `DA`): `docs/open-decisions.md`
- Modify: este plano (tabela "Linha de partida", se a medida mudar)

**Interfaces:**
- Produz: os números `ADR-0028`, `ADR-0029`, `ADR-0030` e `TDR-0003`. As
  tarefas seguintes os citam em comentário de código e em mensagem de commit.
  Se a skill atribuir outros números, use os atribuídos e ajuste as citações.

- [ ] **Passo 0.1: Parar pela pré-condição**

Rode:

```bash
npm ci
node packages/living-docs/src/cli/index.ts validate
```

Esperado: o erro de `CI-3` em `ADR-0020`. Pare e pergunte à pessoa como ela quer
resolver — por exemplo, acrescentar `DA-0006` ao `relates-to` do `ADR-0020` à
mão, ou outra saída que ela escolha. Não edite o ADR. Retome quando
`living-docs validate` sair com 0.

- [ ] **Passo 0.2: Confirmar a linha de partida**

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
node packages/living-docs/src/cli/index.ts validate
node packages/living-docs/src/cli/index.ts drift
node packages/living-docs/src/cli/index.ts changelog --base master
git hash-object docs/contracts/checks.gen.md
```

Esperado: a tabela "Linha de partida", menos a falha de `spec-criteria`
(resolvida no passo 0.1). Se outro número divergir, grave o valor novo na tabela
com a razão, antes de seguir.

- [ ] **Passo 0.3: Abrir os três ADRs (`/adr`, skill `decision-recorder`)**

Cada um nasce `draft`. O conteúdo mínimo de cada um, para a skill escrever:

1. **Bloco de plugin no topo da raiz.** Contexto: a v1 tem configuração global do
   living-docs fora de entrada (`stale-after-months`, `id-format`,
   `last-reviewed-bump-limit`), e `ADR-0020` só prevê bloco dentro de `owned[]`.
   Decisão: o arquivo raiz aceita chaves de topo cujo nome está em `plugins:`,
   repassadas opacas ao plugin em `pluginBlocks`; num arquivo filho é erro; o
   valor segue a regra do `ADR-0020` (mapa, `{}` para vazio). Alternativas
   descartadas: repetir a configuração em cada entrada (~20 cópias, famílias com
   formatos de ID diferentes); arquivo de configuração próprio do plugin (o "um
   arquivo por plugin" que a pesquisa descartou). `relates-to: [ADR-0020]`.
   Refina o `ADR-0020` sem editá-lo.
2. **Living-docs nasce sobre a v2.** Decisão: sem comando de migração, sem
   leitura dupla, sem alias; o arquivo deste repositório é reescrito à mão, e
   quem clonou segue o CHANGELOG. Diverge da §10 da spec do núcleo, que pedia um
   comando. Consequências a registrar: o discriminador de documento é o bloco
   `living-docs:` presente sem `id-prefix` (seção "Pontos em aberto"), e o corpus
   é a união dos caminhos com esse bloco. `relates-to: [ADR-0020, ADR-0025]`.
3. **Hooks do núcleo no plugin `ownership`.** Decisão: o living-docs declara
   `dependencies: ["ownership"]` e deixa de registrar os hooks que o núcleo
   assume. A skill avalia se isto reabre `ADR-0012` com decisão nova (§9) —
   inclusive os dois pontos em aberto de estágio e de `init` consumidor listados
   acima. `relates-to: [ADR-0019, ADR-0026]`.

A skill `decision-adversary` pode ser chamada pela `decision-recorder`; deixe-a
seguir o próprio fluxo. Se ela concluir que algum ponto em aberto é lacuna e não
decisão, ela abre `DA` (`/open-decision`) e o plano **para** nesse ponto.

- [ ] **Passo 0.4: Registrar a dívida (`/debt`)**

`TDR-0003`, `open`. Atalho: `@esliph/ownership` como `file:../ownership`. Custo:
no cache do marketplace o `../ownership` não existe, o `npm ci` do living-docs
falha e todos os hooks do living-docs falham abertos; o padrão de
`--invoke-ownership` (`npx ownership`) não funciona fora deste repositório.
`pay-when` observável: `@esliph/ownership` publicado no npm. Pagamento: a
dependência vira faixa semver do registro, o `plugin-cache.test.ts` do
living-docs volta a exigir o hook, e `--invoke-ownership` passa a funcionar fora
daqui.

- [ ] **Passo 0.5: Revisar os requisitos (skill `requirements-keeper`)**

Peça à skill que revise, contra a §4 a §7 desta spec, os itens abaixo. O texto é
dela; a lista do que cada um precisa passar a dizer é esta:

| Item | O que muda |
| --- | --- |
| `RF-0006` | `living-docs drift` deixa de existir; a deriva é do núcleo. Proposta: `revoked` (ato humano). |
| `RF-0008` | `living-docs changelog` deixa de existir. Proposta: `revoked`. |
| `RF-0009` | o `REL` é declarado como entrada de `owned` com `living-docs.id-prefix: REL`; `consumer-visible-paths` não existe mais. |
| `RF-0011` | `validate --base` do living-docs deixa de cobrar o doc do caminho vigiado; fica a reivindicação por decisão aberta. |
| `RF-0012` | o `init` declara os documentos em `owned` com bloco `living-docs:`, não em `documents:`. |
| `RF-0013` | o workflow instalado roda as duas CLIs; entra `--invoke-ownership`. |
| `RN-0001` | o arquivo de ownership mora na raiz (`.ownership.yml`). |
| `RN-0013` | o gatilho são as regras de `watches` marcadas `consumer-visible: true`. |
| `RN-0016` | a cobertura do repositório inteiro é do núcleo; o living-docs cobre só o corpus. |
| `RN-0023` | "sob a raiz da documentação" vira "num caminho do corpus". |
| `RN-0030`, `RN-0031` | "prefixo declarado em `artifacts:`" vira "prefixo declarado em `living-docs.id-prefix`". |

Revogar requer ato humano: o `HK-3` pergunta, e a resposta é da pessoa.

- [ ] **Passo 0.6: Validar e commitar**

```bash
node packages/living-docs/src/cli/index.ts validate
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail)"
```

Esperado: `validate` sai com 0; os testes são os da linha de partida, com as
duas falhas de lockfile e nenhuma outra.

```bash
git add docs/
git commit -m "$(cat <<'EOF'
docs(ADR-0028): a regra antes do código do living-docs sobre o núcleo

Abre ADR-0028, ADR-0029 e ADR-0030 como draft, registra TDR-0003 e revisa
os requisitos que a adoção do núcleo invalida.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Tarefa 1: Núcleo — bloco de topo, erro de v1 e API pública

Tudo em `packages/ownership`. O living-docs não muda.

**Files:**
- Modify: `packages/ownership/src/schema/types.ts`, `packages/ownership/src/schema/parse.ts:131-174,200-272`
- Modify: `packages/ownership/src/resolve/hierarchy.ts:34-44,279-289`
- Modify: `packages/ownership/src/checks/declared-state.ts`
- Create: `packages/ownership/src/checks/catalog.ts`
- Modify: `packages/ownership/src/index.ts`
- Modify: `packages/ownership/test/helpers/config.ts`, `packages/ownership/test/schema/parse.test.ts`, `packages/ownership/test/resolve/hierarchy.test.ts`, `packages/ownership/test/checks/declared-state.test.ts`, `packages/ownership/test/distribution/lockfile.test.ts`
- Create: `packages/ownership/test/checks/catalog.test.ts`, `packages/ownership/test/distribution/public-api.test.ts`
- Modify: `CHANGELOG.md` (entrada em `[Unreleased]`)

**Interfaces:**
- Produz: `RootFile.pluginBlocks: Record<string, Record<string, unknown>>` e
  `ResolvedConfig.pluginBlocks: Record<string, Record<string, unknown>>`.
- Produz: `OwnedRuleRaw.pluginBlocks` e `ResolvedOwnedRule.pluginBlocks` passam a
  ter valores garantidamente mapas (`Record<string, Record<string, unknown>>`).
- Produz, exportado de `@esliph/ownership`: `parseItemsTable`,
  `parseItemsSections`, `normalizeFieldKey`, `isEmptyValue`, `type DocItem`,
  `parseCodeowners`, `loadCodeowners`, `ownersOf`, `type Codeowners`,
  `type CodeownersEntry`, `CORE_CHECK_CATALOG`, `type CatalogEntry`, além do que
  já exportava (`findTransitions`, `coreChecks`, `diffChecks`, `OwnershipError`,
  `resolveOwnership`, `findOwnedRule`, …).
- `CatalogEntry = { id: string; name: string; command: string; failsWhen: string }`.

- [ ] **Passo 1.1: Testes do parser (vermelho)**

Acrescente a `packages/ownership/test/schema/parse.test.ts`. O arquivo já define
`ROOT` (opções de raiz); defina as duas constantes abaixo junto dela se ainda
não existirem com esse nome:

```ts
const ROOT_OPTS = { isRoot: true, pluginNames: [] }
const CHILD_OPTS = { isRoot: false, pluginNames: ['living-docs'] }

test('a raiz aceita bloco de topo com nome listado em plugins, e o repassa opaco', () => {
  const parsed = parseOwnershipFile(
    'version: 2\nplugins: [living-docs]\nliving-docs:\n  stale-after-months: 6\nowned: []\n',
    '.ownership.yml',
    ROOT_OPTS,
  ) as RootFile

  assert.deepEqual(parsed.pluginBlocks, { 'living-docs': { 'stale-after-months': 6 } })
})

test('sem bloco de topo, pluginBlocks da raiz é vazio', () => {
  const parsed = parseOwnershipFile('version: 2\nplugins: [living-docs]\nowned: []\n', '.ownership.yml', ROOT_OPTS) as RootFile

  assert.deepEqual(parsed.pluginBlocks, {})
})

test('bloco de topo num arquivo filho é erro, mesmo com o nome listado na raiz', () => {
  assert.throws(
    () => parseOwnershipFile('version: 2\nliving-docs:\n  stale-after-months: 6\nowned: []\n', 'pkg/.ownership.yml', CHILD_OPTS),
    /pkg\/\.ownership\.yml.*living-docs.*exclusivo do arquivo raiz/,
  )
})

test('bloco de plugin que não é mapa é erro, no topo e na entrada', () => {
  assert.throws(
    () => parseOwnershipFile('version: 2\nplugins: [living-docs]\nliving-docs: true\nowned: []\n', '.ownership.yml', ROOT_OPTS),
    /\.ownership\.yml\.living-docs.*precisa ser um mapa/,
  )
  assert.throws(
    () =>
      parseOwnershipFile(
        "version: 2\nplugins: [living-docs]\nowned:\n  - path: a.md\n    owner: '@x'\n    living-docs:\n",
        '.ownership.yml',
        ROOT_OPTS,
      ),
    /owned\[0\]\.living-docs.*precisa ser um mapa/,
  )
})

test('plugin com o nome de uma chave do núcleo é erro', () => {
  assert.throws(() => parseOwnershipFile('version: 2\nplugins: [owned]\nowned: []\n', '.ownership.yml', ROOT_OPTS), /plugins.*"owned".*chave do núcleo/)
})
```

E troque a asserção do teste de v1 que já existe (linha 28) por:

```ts
assert.throws(() => parseOwnershipFile('version: 1\nartifacts: []\n', 'docs/.ownership.yml', ROOT), /esquema v1.*não é lido.*reescrit/)
```

Se `RootFile` ainda não estiver importado no topo do arquivo, acrescente-o ao
`import type` de `../../src/schema/parse.ts`.

- [ ] **Passo 1.2: Ver o vermelho**

```bash
cd packages/ownership && node --test test/schema/parse.test.ts; cd ../..
```

Esperado: os seis testes novos ou alterados falham (`pluginBlocks` indefinido,
"chave desconhecida" no lugar das mensagens novas, e a mensagem antiga de v1).

- [ ] **Passo 1.3: Implementar no parser**

Em `packages/ownership/src/schema/types.ts`, troque o tipo de `pluginBlocks` em
`OwnedRuleRaw` e acrescente o campo a `RootFile`:

```ts
  /** Por nome de plugin declarado em `plugins:`. Sempre um mapa; o conteúdo é opaco ao núcleo. */
  pluginBlocks: Record<string, Record<string, unknown>>
```

```ts
export interface RootFile extends ParsedFile {
  plugins: string[]
  /** Blocos de topo, por nome de plugin — só a raiz os tem (ADR-0028). */
  pluginBlocks: Record<string, Record<string, unknown>>
}
```

Em `packages/ownership/src/schema/parse.ts`:

1. Acrescente, depois de `assertKnownKeys`:

```ts
/**
 * O valor de um bloco de plugin é sempre um mapa: `x: {}` declara o vínculo sem
 * configuração, e qualquer outro valor é erro de carga (ADR-0020).
 */
function asPluginBlock(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new OwnershipError(`${where}: o bloco de plugin precisa ser um mapa — use \`{}\` para declarar o vínculo sem configuração.`)
  }

  return value as Record<string, unknown>
}
```

2. Em `parseOwned`, troque o laço que monta `pluginBlocks` por:

```ts
  const pluginBlocks: Record<string, Record<string, unknown>> = {}

  for (const name of pluginNames) {
    if (item[name] !== undefined) {
      pluginBlocks[name] = asPluginBlock(item[name], `${where}.${name}`)
    }
  }
```

   Note que `item[name]` é `null` quando o YAML traz `living-docs:` sem valor —
   `null !== undefined`, então cai em `asPluginBlock` e vira erro, como o teste
   pede.

3. Troque o trecho de `parseOwnershipFile` que vai de
   `assertKnownKeys(root, opts.isRoot ? ROOT_KEYS : CHILD_KEYS, …)` até
   `pluginNames = plugins` (linhas 248–253) por:

```ts
  if (opts.isRoot) {
    plugins = asStringList(root.plugins, `${file}.plugins`)

    for (const name of plugins) {
      if (ROOT_KEYS.has(name)) {
        throw new OwnershipError(`${file}.plugins: "${name}" é chave do núcleo e não pode nomear plugin.`)
      }
    }
    pluginNames = plugins
    // Bloco de topo: só a raiz, e só com nome listado em `plugins:` (ADR-0028).
    assertKnownKeys(root, new Set([...ROOT_KEYS, ...plugins]), file)
  } else {
    for (const key of Object.keys(root)) {
      if (opts.pluginNames.includes(key)) {
        throw new OwnershipError(`${file}: bloco de plugin "${key}" no topo é exclusivo do arquivo raiz.`)
      }
    }
    assertKnownKeys(root, CHILD_KEYS, file, ' `plugins` é exclusivo do arquivo raiz.')
  }
```

4. Troque o `return` final por:

```ts
  if (!opts.isRoot) {
    return parsed
  }

  const pluginBlocks: Record<string, Record<string, unknown>> = {}

  for (const name of plugins ?? []) {
    if (root[name] !== undefined) {
      pluginBlocks[name] = asPluginBlock(root[name], `${file}.${name}`)
    }
  }

  return { ...parsed, plugins: plugins ?? [], pluginBlocks }
```

5. Troque a mensagem de v1 (linhas 239–242) por:

```ts
    throw new OwnershipError(
      `${file}: esquema v1 — este arquivo não é lido. O núcleo só lê a v2 (lista \`owned\`, blocos por plugin); ` +
        'reescreva o arquivo na v2.',
    )
```

   Atualize o comentário acima dela: a razão continua a mesma ("chave
   desconhecida esconderia o motivo real").

- [ ] **Passo 1.4: Ver o verde do parser**

```bash
cd packages/ownership && node --test test/schema/parse.test.ts; cd ../..
```

Esperado: todos passam. Se algum teste antigo de `parse.test.ts` quebrar por
causa da ordem nova das checagens (plugins antes das chaves), a mensagem que ele
espera mudou de lugar, não de conteúdo: ajuste a regex, nunca o comportamento.
A exceção é um teste que afirme que bloco nulo (`sdd:` sem valor) é aceito: ele
contradiz o `ADR-0020` aceito. Troque a asserção para erro e diga isso na
mensagem do commit.

- [ ] **Passo 1.5: `ResolvedConfig.pluginBlocks` (vermelho, depois verde)**

Em `packages/ownership/test/resolve/hierarchy.test.ts`, acrescente:

```ts
test('os blocos de topo da raiz chegam em ResolvedConfig.pluginBlocks', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nplugins: [living-docs]\nliving-docs:\n  stale-after-months: 3\nowned: []\n' }, root => {
    assert.deepEqual(resolveOwnership(root)?.pluginBlocks, { 'living-docs': { 'stale-after-months': 3 } })
  })
})
```

Rode `cd packages/ownership && node --test test/resolve/hierarchy.test.ts; cd ../..`:
falha (`undefined`). Em `packages/ownership/src/resolve/hierarchy.ts`, acrescente
a `ResolvedConfig`:

```ts
  /** Blocos de topo do arquivo raiz, por nome de plugin — opacos ao núcleo. */
  pluginBlocks: Record<string, Record<string, unknown>>
```

e, no objeto devolvido por `resolveOwnership`, `pluginBlocks: root.pluginBlocks,`
logo depois de `plugins: root.plugins,`. Troque também o tipo de `pluginBlocks`
em `ResolvedOwnedRule` para `Record<string, Record<string, unknown>>`.

Em `packages/ownership/test/helpers/config.ts`, acrescente `pluginBlocks: {},`
ao objeto devolvido por `buildConfig`.

Rode de novo: passa.

- [ ] **Passo 1.6: Portar "owner sem @" para `ownership/declared-state` (vermelho)**

A §6 manda o "owner válido" do `CI-1` para o núcleo, e o núcleo não o cobre.
Acrescente a `packages/ownership/test/checks/declared-state.test.ts`, no mesmo
estilo dos testes vizinhos (que usam `withTempRepo` e `buildConfig`):

```ts
test('per-file: owner do frontmatter sem @ é achado, na linha do campo', () => {
  withTempRepo({ 'docs/adr/ADR-0001.md': '---\nstatus: draft\nowner: time\n---\n' }, root => {
    const config = buildConfig({ owned: [{ path: 'docs/adr/', owner: '@x', states: ['draft'] }] })
    const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-28' })

    assert.equal(findings.length, 1)
    assert.equal(findings[0]?.line, 3)
    assert.match(findings[0]?.message ?? '', /owner.*"time".*@/)
  })
})

test('per-file: owner com @, ou ausente, não é achado — ausência é de quem cobra o frontmatter', () => {
  withTempRepo({ 'docs/adr/ADR-0001.md': "---\nstatus: draft\nowner: '@time'\n---\n", 'docs/adr/ADR-0002.md': '---\nstatus: draft\n---\n' }, root => {
    const config = buildConfig({ owned: [{ path: 'docs/adr/', owner: '@x', states: ['draft'] }] })

    assert.deepEqual(ownershipDeclaredState().run({ root, config, today: '2026-09-28' }), [])
  })
})
```

Rode `cd packages/ownership && node --test test/checks/declared-state.test.ts; cd ../..`:
o primeiro falha.

- [ ] **Passo 1.7: Implementar o "owner sem @"**

Em `packages/ownership/src/checks/declared-state.ts`, estenda `Observed` e
`observe`:

```ts
interface Observed {
  states: { state: string; line: number }[]
  duplicates: DocItem[]
  /** `owner` do frontmatter que não começa com `@`, só em per-file. */
  badOwner: { value: string; line: number } | null
}

const NOTHING: Observed = { states: [], duplicates: [], badOwner: null }
```

No ramo `per-file`, depois de obter `frontmatter`, troque o `return` por:

```ts
    const value = frontmatter?.data[rule.format.stateField]
    const owner = frontmatter?.data.owner
    const badOwner = typeof owner === 'string' && owner !== '' && !owner.startsWith('@') ? { value: owner, line: frontmatter?.lines.owner ?? 0 } : null

    return {
      states: typeof value === 'string' && value !== '' ? [{ state: value, line: frontmatter?.lines[rule.format.stateField] ?? 0 }] : [],
      duplicates: [],
      badOwner,
    }
```

No ramo de coleção, acrescente `badOwner: null` ao objeto devolvido. No `run`,
logo depois do laço de `duplicates`:

```ts
          if (observed.badOwner !== null) {
            findings.push(
              error(
                file,
                observed.badOwner.line,
                `\`owner\` "${observed.badOwner.value}" precisa começar com @ e espelhar o CODEOWNERS.`,
                'Use o handle de pessoa ou time, ex.: "@time-plataforma".',
              ),
            )
          }
```

Isso roda antes do `if (rule.states === null) continue`, de propósito: o dono
vale mesmo em caminho sem ciclo de vida. Rode o teste: passa.

- [ ] **Passo 1.8: Catálogo do núcleo (vermelho, depois verde)**

Crie `packages/ownership/test/checks/catalog.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { CORE_CHECK_CATALOG } from '../../src/checks/catalog.ts'
import { coreChecks, diffChecks } from '../../src/checks/registry.ts'

const NO_DIFF = { base: '', changed: [], messages: [] }

test('o catálogo cobre exatamente os checks registrados, com id, nome e comando', () => {
  const tree = coreChecks(() => '').map(check => `${check.id}|${check.name}|ownership validate`)
  const diff = diffChecks(NO_DIFF).map(check => `${check.id}|${check.name}|ownership validate --base <ref>`)
  const catalog = CORE_CHECK_CATALOG.map(entry => `${entry.id}|${entry.name}|${entry.command}`)

  assert.deepEqual(catalog.sort(), [...tree, ...diff].sort())
  for (const entry of CORE_CHECK_CATALOG) {
    assert.ok(entry.failsWhen.length > 20, `${entry.id} precisa dizer quando falha`)
  }
})
```

Rode: falha (módulo inexistente). Crie `packages/ownership/src/checks/catalog.ts`:

```ts
/**
 * O contrato público dos checks do núcleo. O `living-docs` o imprime junto do
 * dele em `docs/contracts/checks.gen.md`. Só tipos e dados, de propósito: um
 * gerador não precisa puxar YAML nem git para listar o que existe.
 */
export interface CatalogEntry {
  id: string
  name: string
  command: string
  failsWhen: string
}

export const CORE_CHECK_CATALOG: readonly CatalogEntry[] = Object.freeze([
  {
    id: 'ownership/declared-state',
    name: 'declared state',
    command: 'ownership validate',
    failsWhen:
      'O estado de um arquivo ou item (o campo de `state-field`, `status` por padrão) está fora de `states` declarado para o caminho; a mesma chave aparece duas vezes no mesmo arquivo; ou o `owner` do frontmatter não começa com `@`.',
  },
  {
    id: 'ownership/generated-drift',
    name: 'generated drift',
    command: 'ownership validate',
    failsWhen: 'A saída do comando declarado em `generated[]` difere do arquivo versionado; o comando falha; ou o arquivo declarado não existe.',
  },
  {
    id: 'ownership/owner-coverage',
    name: 'owner coverage',
    command: 'ownership validate',
    failsWhen:
      'Um arquivo do repositório não é coberto por `owned[]` nem por `ignore`; um caminho de `owned[]` não existe ou não tem linha no CODEOWNERS; o CODEOWNERS não existe; ou o `doc` de uma regra de `watches` não existe ou não tem entrada em `owned[]`.',
  },
  {
    id: 'ownership/derivation-resolves',
    name: 'derivation resolves',
    command: 'ownership validate',
    failsWhen: 'Um documento que deriva de uma fonte não declara o campo de derivação, ou o campo aponta para fora da fonte ou para arquivo inexistente.',
  },
  {
    id: 'ownership/watch-satisfied',
    name: 'watch satisfied',
    command: 'ownership validate --base <ref>',
    failsWhen:
      'O diff entre a base e `HEAD` toca um caminho de `watches` e o `doc` da regra não está no mesmo diff, sem `Docs: none — <razão>` em alguma mensagem de commit.',
  },
  {
    id: 'ownership/consumer-change-logged',
    name: 'consumer change logged',
    command: 'ownership validate --base <ref>',
    failsWhen:
      'O diff toca um caminho de `watches` marcado `consumer-visible: true` e o `doc` da regra não vem no mesmo diff com item em `## [Unreleased]`, sem `Changelog: none — <razão>` em alguma mensagem de commit.',
  },
])
```

Rode: passa. Confira o nome de cada check em `src/checks/*.ts` (`name: '…'`) se
o teste acusar diferença; o catálogo segue o registro, nunca o contrário.

- [ ] **Passo 1.9: API pública (vermelho, depois verde)**

Crie `packages/ownership/test/distribution/public-api.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import * as api from '../../src/index.ts'

test('a API pública expõe o que o living-docs importa', () => {
  for (const name of [
    'resolveOwnership',
    'findOwnedRule',
    'findTransitions',
    'coreChecks',
    'diffChecks',
    'OwnershipError',
    'parseItemsTable',
    'parseItemsSections',
    'normalizeFieldKey',
    'isEmptyValue',
    'parseCodeowners',
    'loadCodeowners',
    'ownersOf',
    'CORE_CHECK_CATALOG',
  ]) {
    assert.ok(name in api, `${name} deveria ser exportado`)
  }
})
```

Rode: falha. Acrescente a `packages/ownership/src/index.ts`:

```ts
export { parseItemsTable, parseItemsSections, normalizeFieldKey, isEmptyValue } from './schema/item.ts'
export type { DocItem } from './schema/item.ts'
export { parseCodeowners, loadCodeowners, ownersOf } from './core/codeowners.ts'
export type { Codeowners, CodeownersEntry } from './core/codeowners.ts'
export { CORE_CHECK_CATALOG } from './checks/catalog.ts'
export type { CatalogEntry } from './checks/catalog.ts'
```

Rode: passa.

- [ ] **Passo 1.10: Lockfile regenerado a partir do lockfile**

Em `packages/ownership/test/distribution/lockfile.test.ts`, logo depois do
`copyFileSync` do `package.json`, acrescente:

```ts
    // O lockfile entra junto: sem ele o npm resolve a versão mais nova de cada
    // faixa, e o teste reprovaria a cada publicação no registro, com o
    // package.json intocado. Com ele, o npm só muda o que o package.json pede.
    copyFileSync(join(PACKAGE_ROOT, 'package-lock.json'), join(isolated, 'package-lock.json'))
```

Rode `cd packages/ownership && node --test test/distribution/lockfile.test.ts; cd ../..`:
passa, sem regenerar o lockfile versionado.

- [ ] **Passo 1.11: Suíte, typecheck, CHANGELOG, commit**

```bash
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node packages/living-docs/src/cli/index.ts validate
```

Esperado: núcleo com **177** testes (167 + 10: cinco de parse, um de hierarquia,
dois de `declared-state`, um de catálogo, um de API; o de v1 muda sem somar),
todos passando. Living-docs como na linha de partida (só a falha de lockfile
dele). `typecheck` limpo; se o living-docs reclamar de `pluginBlocks`, é porque
algum teste dele constrói `ResolvedConfig` à mão — hoje nenhum constrói.

Peça à `release-historian` a entrada em `## [Unreleased]` do `CHANGELOG.md`, sem
ID de artefato:

- `Added`: "o arquivo de ownership raiz aceita, no topo, um bloco de
  configuração por plugin listado em `plugins:`; num arquivo incluído, é erro";
  "o `owner` do frontmatter sem `@` passa a ser achado de `ownership validate`".
- `Changed`: "o erro de esquema v1 diz que o arquivo precisa ser reescrito na
  v2"; "bloco de plugin que não é mapa passa a ser erro de carga".

```bash
git add packages/ownership CHANGELOG.md
git commit -m "$(cat <<'EOF'
feat(ADR-0028): bloco de plugin no topo da raiz e API do núcleo para o living-docs

Implementa ADR-0028 e a regra de tipo do bloco de ADR-0020. O owner sem @
do frontmatter passa a ser do ownership/declared-state (§6 da spec).
O teste de lockfile regenera a partir do lockfile e para de depender da
última publicação do registro.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Tarefa 2: Dependência `file:../ownership` e condição `development`

O living-docs passa a depender do núcleo, mas ainda não importa nada dele. O
commit prova que a resolução funciona em todo lugar que executa o living-docs.

**Files:**
- Modify: `packages/living-docs/package.json`, `packages/living-docs/package-lock.json`, `packages/living-docs/tsconfig.json`, `package-lock.json` (raiz)
- Modify: `packages/living-docs/hooks/run-hook.sh`
- Modify: `packages/living-docs/test/distribution/lockfile.test.ts`, `packages/living-docs/test/distribution/plugin-cache.test.ts`
- Create: `packages/living-docs/test/distribution/dev-resolution.test.ts`
- Modify: `.github/workflows/living-docs.yml`, `.github/workflows/wrapper-docker.yml`, `bin/living-docs`
- Modify (skill `working-agreements-keeper`): `CLAUDE.md`, `CONTRIBUTING.md`
- Modify: `README.md`
- Modify (skill `release-historian`): `CHANGELOG.md`

**Interfaces:**
- Consome: `@esliph/ownership` com `exports["."].development = "./src/index.ts"` (já existe).
- Produz: a convenção de invocação `node --conditions=development packages/<pacote>/src/cli/index.ts …`, que toda tarefa seguinte usa.

- [ ] **Passo 2.1: Teste de resolução (vermelho)**

Crie `packages/living-docs/test/distribution/dev-resolution.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { toolkitRoot } from '../../src/core/roots.ts'

test('RNF-0002: do pacote do living-docs, @esliph/ownership resolve pelo código-fonte, sem dist', { timeout: 30_000 }, () => {
  const script = 'import("@esliph/ownership").then(m => { if (typeof m.resolveOwnership !== "function") throw new Error("não resolveu pelo source"); console.log(import.meta.resolve("@esliph/ownership")) })'
  const result = spawnSync('node', ['--conditions=development', '--input-type=module', '-e', script], { cwd: toolkitRoot(), encoding: 'utf8' })

  assert.equal(result.status, 0, result.stderr)
  assert.match(result.stdout, /packages\/ownership\/src\/index\.ts/)
})

test('RNF-0002: o próprio runner de testes carrega @esliph/ownership pela condição development', async () => {
  // Sem a condição, a resolução cai em `default` (dist/), que não existe no
  // checkout: este import só passa se o worker do `node --test` herdou a flag.
  const core = await import('@esliph/ownership')

  assert.equal(typeof core.resolveOwnership, 'function')
})
```

Rode `cd packages/living-docs && npm test -- --test-name-pattern="RNF-0002: o próprio runner"; cd ../..`.
Esperado: o segundo teste **falha** com `ERR_MODULE_NOT_FOUND` apontando para
`dist/index.js`. O primeiro passa por acidente, porque o workspace da raiz já faz
o symlink de `node_modules/@esliph/ownership` e ele passa a flag por conta
própria; fica como guarda de regressão da resolução pelo pacote.

Se o `npm test` do passo 2.7 mostrar que os workers do `node --test` **não**
herdam `--conditions` (o segundo teste continua vermelho com o script novo),
troque o script por `"test": "node --test --test-isolation=none \"test/**/*.test.ts\""`
precedido de `--conditions=development`, e registre a troca na mensagem de
commit. Não use `NODE_OPTIONS` inline no script: o npm roda scripts no `cmd` no
Windows.

- [ ] **Passo 2.2: Declarar a dependência e a condição**

`packages/living-docs/package.json`, bloco `dependencies` e scripts:

```json
  "scripts": {
    "test": "node --conditions=development --test \"test/**/*.test.ts\"",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@esliph/ownership": "file:../ownership",
    "picomatch": "^4.0.2",
    "yaml": "^2.6.0"
  },
```

`packages/living-docs/tsconfig.json`, em `compilerOptions`:

```json
    "customConditions": ["development"],
```

`packages/living-docs/hooks/run-hook.sh`: troque a linha do `OUTPUT` por:

```bash
# A condição `development` resolve @esliph/ownership pelo src/ do pacote irmão:
# no checkout não existe dist/, e é isso que impede código velho de rodar em
# silêncio. Fora do checkout (cache do marketplace) o ../ownership não existe,
# e o hook falha aberto — TDR-0003.
OUTPUT="$(printf '%s' "$INPUT" | LIVING_DOCS_REPO_ROOT="$REPO_ROOT" \
  NODE_OPTIONS="--conditions=development" \
  timeout 5 node "${TOOLKIT_ROOT}/src/hooks/${HOOK}.ts" 2>/dev/null)"
```

- [ ] **Passo 2.3: Instalar e regenerar os lockfiles**

```bash
npm install
git diff --stat package-lock.json
```

Esperado: o `package-lock.json` da raiz ganha a aresta
`packages/living-docs → @esliph/ownership` (o pacote já é workspace; nada novo é
baixado). O lockfile do pacote é regenerado fora do workspace, com os dois
pacotes lado a lado para o `../ownership` resolver:

```bash
TMP="$(mktemp -d)"
mkdir -p "$TMP/packages/living-docs" "$TMP/packages/ownership"
cp packages/living-docs/package.json packages/living-docs/package-lock.json "$TMP/packages/living-docs/"
cp packages/ownership/package.json "$TMP/packages/ownership/"
(cd "$TMP/packages/living-docs" && npm install --package-lock-only --ignore-scripts)
cp "$TMP/packages/living-docs/package-lock.json" packages/living-docs/package-lock.json
rm -rf "$TMP"
git diff packages/living-docs/package-lock.json | head -40
```

Esperado: entram `node_modules/@esliph/ownership` com `"resolved": "../ownership", "link": true`
e a entrada `../ownership` com as dependências dele. Nenhuma versão de
`@types/node`, `yaml` ou `picomatch` muda (o lockfile existente foi copiado
junto).

- [ ] **Passo 2.4: Ajustar o teste de lockfile**

Substitua o corpo de `packages/living-docs/test/distribution/lockfile.test.ts`
a partir de `const PACKAGE_ROOT` por:

```ts
const PACKAGE_ROOT = toolkitRoot()
const CORE_ROOT = join(PACKAGE_ROOT, '..', 'ownership')

function packagesOf(lockfile: string): unknown {
  return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
}

test('RNF-0002: o package-lock.json do pacote está em dia com o package.json', { timeout: 120_000 }, () => {
  // Os dois pacotes lado a lado, como no checkout: sem o irmão, `file:../ownership`
  // não resolve. O lockfile entra junto para o npm só mudar o que o package.json pede.
  const isolated = mkdtempSync(join(tmpdir(), 'living-docs-lock-'))
  const pkg = join(isolated, 'packages', 'living-docs')
  const core = join(isolated, 'packages', 'ownership')

  try {
    mkdirSync(pkg, { recursive: true })
    mkdirSync(core, { recursive: true })
    copyFileSync(join(PACKAGE_ROOT, 'package.json'), join(pkg, 'package.json'))
    copyFileSync(join(PACKAGE_ROOT, 'package-lock.json'), join(pkg, 'package-lock.json'))
    copyFileSync(join(CORE_ROOT, 'package.json'), join(core, 'package.json'))
    const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: pkg, encoding: 'utf8', shell: true })

    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(
      packagesOf(join(pkg, 'package-lock.json')),
      packagesOf(join(PACKAGE_ROOT, 'package-lock.json')),
      'Lockfile desatualizado. Regere num diretório temporário com packages/living-docs e packages/ownership lado a lado (veja o passo 2.3 do plano de 2026-09-28).',
    )
  } finally {
    rmSync(isolated, { recursive: true, force: true })
  }
})
```

Acrescente `mkdirSync` ao `import` de `node:fs`.

A mensagem de asserção é texto de teste, não entregue; citar o plano é
permitido.

- [ ] **Passo 2.5: Cache do marketplace com a asserção em `todo`**

Em `packages/living-docs/test/distribution/plugin-cache.test.ts`, parta o teste
"copiado sozinho para o cache…" em dois: o controle continua sendo teste, e a
resposta do hook vira `test.todo`.

```ts
test('RNF-0002: copiado sozinho para o cache, sem dependências o hook se cala e sai com 0', { timeout: 60_000 }, t => {
  const bash = bashExecutable()

  if (bash === null) {
    t.skip('sem o bash do Git for Windows: o CI (ubuntu) roda esta prova')

    return
  }

  const cache = mkdtempSync(join(tmpdir(), 'living-docs-cache-'))
  const project = mkdtempSync(join(tmpdir(), 'living-docs-projeto-'))

  try {
    assert.ok(copyVersioned(cache) > 50, 'cópia vazia demais: o cache não recebeu o plugin')
    assert.equal(existsSync(join(cache, 'node_modules')), false)
    mkdirSync(join(project, 'docs'), { recursive: true })
    writeFileSync(join(project, 'docs/.ownership.yml'), OWNERSHIP, 'utf8')

    const semDependencias = runHook(bash, cache, project)

    assert.equal(semDependencias.status, 0, 'falha aberta: exit 0 mesmo quebrado')
    assert.equal(semDependencias.stdout.trim(), '', 'sem node_modules o hook deveria se calar')
  } finally {
    rmSync(cache, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  }
})

// TDR-0003: no cache do marketplace o `file:../ownership` aponta para um
// diretório que não existe, o `npm ci` falha e o hook só pode falhar aberto.
// A prova de que ele responde volta quando @esliph/ownership estiver no npm e a
// dependência for uma faixa semver do registro.
test.todo('RNF-0002: copiado sozinho para o cache, o plugin instala e o hook responde de lá — espera a publicação do núcleo no npm')
```

O `OWNERSHIP` e o nome do hook (`hk4-watch-reminder`) ficam como estão nesta
tarefa: o controle não depende do conteúdo do arquivo. A Tarefa 3 os passa para
v2 e a Tarefa 4 troca o hook.

- [ ] **Passo 2.6: Invocação documentada**

Acrescente `--conditions=development` logo depois de `node` em toda invocação de
`packages/living-docs/src/cli/index.ts` fora do registro histórico:

- `.github/workflows/living-docs.yml` (as quatro linhas `run: node packages/living-docs/…`);
- `.github/workflows/wrapper-docker.yml:43`;
- `bin/living-docs:6` (comentário) e `bin/living-docs:8`;
- `README.md` (linhas 20, 32, 33, 43–47, 76, 77, 137 da linha de partida);
- `CONTRIBUTING.md:24,25,40` e `CLAUDE.md:20`, pela `working-agreements-keeper`.

Confira que nada ficou de fora:

```bash
git grep -n "node packages/living-docs/src/cli/index.ts" -- . ':!docs/superpowers' ':!docs/decisions' ':!CHANGELOG.md'
```

Esperado: nenhuma linha. As duas ocorrências de `CHANGELOG.md` são entradas
antigas e ficam.

Se `packages/living-docs/test/plugin/wrapper-docker.test.ts` afirmar a linha
exata de `bin/living-docs` ou do workflow, atualize a string esperada, não a
asserção.

- [ ] **Passo 2.7: Suíte, validate, CHANGELOG, commit**

```bash
npm ci
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node --conditions=development packages/living-docs/src/cli/index.ts validate
```

Esperado: living-docs com **554** testes (551 + os dois de dev-resolution + o
`todo` que nasce da divisão do teste de cache), **0 falhas**, 1 `todo`. Núcleo com 177, 0
falhas. `validate` sai com 0.

`CHANGELOG.md`, `Changed`, sem ID: "a invocação da CLI no checkout passa a ser
`node --conditions=development packages/living-docs/src/cli/index.ts`, porque o
toolkit agora depende do núcleo de ownership pelo código-fonte"; `Known issues`
(ou `Changed`, se a seção não existir): "instalado pelo marketplace, o plugin
`living-docs` não instala as dependências até o núcleo ser publicado no npm; os
hooks falham abertos e não respondem".

```bash
git add packages/living-docs package-lock.json .github bin README.md CONTRIBUTING.md CLAUDE.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
build(TDR-0003): living-docs depende de @esliph/ownership pelo código-fonte

file:../ownership com a condição development no teste, no type-check, no
wrapper de hooks e na invocação documentada. O teste de cache mantém o
controle e o modo do wrapper; a resposta do hook vira todo até a
publicação do núcleo.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Tarefa 3: Adoção do núcleo e divisão dos checks

O commit grande (§8, item 3). O living-docs passa a ler a v2 pelo adaptador, o
`.ownership.yml` vai para a raiz em v2, e as regras que o núcleo já tem saem do
living-docs. `HK-2`, `HK-4` e `HK-5` continuam registrados, lendo a v2 pelo
adaptador; saem na Tarefa 4. O `init` passa a semear a v2, porque o
`init` que semeasse v1 produziria repositório que o próprio `validate` não lê.

**Files:**
- Create: `packages/living-docs/test/helpers/ownership.ts`, `packages/living-docs/test/distribution/single-rule.test.ts`
- Rewrite: `packages/living-docs/src/config/ownership.ts`, `packages/living-docs/test/config/ownership.test.ts`
- Move + rewrite: `docs/.ownership.yml` → `.ownership.yml`
- Modify: `CODEOWNERS`, `.github/workflows/living-docs.yml`, `docs/contracts/checks.gen.md` (regenerado)
- Modify (`src/`): `core/types.ts`, `docs/collect.ts`, `docs/corpus.ts`, `docs/schema.ts`, `docs/blocked.ts`, `checks/registry.ts`, `checks/catalog.ts`, `checks/ci1-structure.ts`, `checks/ci2-ids.ts`, `checks/ci3-traceability.ts`, `checks/ci4-staleness.ts`, `checks/ci7-ownership-coverage.ts`, `checks/ci8-links.ts`, `checks/ci9-commit-discipline.ts`, `checks/ci10-trigger-routing.ts`, `checks/ci11-external-audience.ts`, `config/watches.ts`, `cli/index.ts`, `cli/validate.ts`, `cli/init.ts`, `hooks/hk1-append-only.ts`, `hooks/hk2-generated-artifact.ts`, `hooks/hk3-state-promotion.ts`, `hooks/hk4-watch-reminder.ts`, `hooks/hk5-commit-guard.ts`, `hooks/hk6-session-inventory.ts`, `hooks/hk8-open-decision-guard.ts`, `tools/gen-checks.ts`
- Modify (templates): `templates/ownership.yml`, `templates/CODEOWNERS`, `templates/workflow.yml`
- Delete (`src/`): `checks/ci5-contract-drift.ts`, `checks/ci6-changelog-required.ts`, `cli/drift.ts`, `cli/changelog.ts`, `config/codeowners.ts`, `docs/table.ts`, `docs/sections.ts`, `docs/item.ts`
- Delete (`test/`): `checks/ci5-contract-drift.test.ts`, `checks/ci6-changelog-required.test.ts`, `cli/drift.test.ts`, `cli/changelog.test.ts`, `config/codeowners.test.ts`, `docs/table.test.ts`, `docs/sections.test.ts`
- Modify (`test/`): toda a lista do passo 3.12
- Modify (núcleo, portes): `packages/ownership/test/hooks/generated-guard.test.ts`, `packages/ownership/test/hooks/watch-reminder.test.ts`, `packages/ownership/test/hooks/commit-guard.test.ts`, `packages/ownership/test/checks/generated-drift.test.ts`, `packages/ownership/test/checks/consumer-change-logged.test.ts`, `packages/ownership/test/core/exception-label.test.ts`, `packages/ownership/test/core/codeowners.test.ts`, `packages/ownership/test/core/exec.test.ts`, `packages/ownership/test/cli/validate.test.ts`, `packages/ownership/test/schema/item.test.ts`, `packages/ownership/src/cli/index.ts` (o `GitError`), e o resto do `src/` do núcleo só se um porte ficar vermelho
- Modify (skill `release-historian`): `CHANGELOG.md`

**Interfaces:**
- Consome (de `@esliph/ownership`): `resolveOwnership`, `OwnershipError`,
  `findTransitions`, `parseItemsTable`, `parseItemsSections`,
  `normalizeFieldKey`, `isEmptyValue`, `parseCodeowners`, `loadCodeowners`,
  `ownersOf`, `coreChecks`, `diffChecks`, `CORE_CHECK_CATALOG`, e os tipos
  `ResolvedConfig`, `ResolvedOwnedRule`, `DocItem` (`{ key, state, line, fields }`).
- Produz, em `packages/living-docs/src/config/ownership.ts`:
  - `PLUGIN = 'living-docs'`
  - `loadLivingDocsConfig(root: string): LivingDocsConfig` (lança `OwnershipError`)
  - `adaptConfig(core: ResolvedConfig): LivingDocsConfig`
  - `interface LivingDocsConfig { rootFile: string; staleAfterMonths: number; lastReviewedBumpLimit: number; idFormat: IdFormat; artifacts: ArtifactRule[]; documents: DocumentRule[]; generated: GeneratedRule[]; watches: WatchRule[]; core: ResolvedConfig }`
  - `ArtifactRule` e `DocumentRule` com os campos de hoje, mais `core: ResolvedOwnedRule`; `ArtifactRule.states` vem de `rule.states` do núcleo.
  - `fieldOf`, `findArtifactRule`, `findDocumentRule`, `documentWithRole`, `AUDIENCES`, `DOCUMENT_ROLES`, `DEFAULT_BUMP_LIMIT` com as assinaturas de hoje (trocando `OwnershipConfig` por `LivingDocsConfig`), e `OwnershipError` reexportado.
  - Somem: `OWNERSHIP_PATH`, `parseOwnership`, `loadOwnership`, `OwnershipConfig`, a classe local `OwnershipError`.
- Produz, em `packages/living-docs/src/core/types.ts`: `interface DiffFacts { base: string; changed: string[]; messages: string[] }` (movida de `ci6-changelog-required.ts`); `CheckContext.config: LivingDocsConfig`.
- Produz, em `packages/living-docs/test/helpers/ownership.ts`: `OWNERSHIP_FILE = '.ownership.yml'`, `configFrom(yaml: string): LivingDocsConfig`.
- Some de `src/docs/schema.ts`: `STATUS_MACHINE`, `statesFor`. Ficam `FROZEN_STATUSES`, `HUMAN_PROMOTIONS` e o resto.
- `src/checks/registry.ts` perde `driftChecks` e `changelogChecks`.
- `src/docs/corpus.ts` perde `docsRoot`; `declaredPaths(config)` e `documentationFiles(root, config)` ficam, sobre `LivingDocsConfig`.

- [ ] **Passo 3.1: Helper de teste**

Crie `packages/living-docs/test/helpers/ownership.ts`:

```ts
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import type { LivingDocsConfig } from '../../src/config/ownership.ts'

/** Onde as fixtures escrevem o arquivo de ownership: a raiz, como o `init` semeia. */
export const OWNERSHIP_FILE = '.ownership.yml'

/**
 * A configuração que o adaptador lê deste YAML v2. Para teste de função pura
 * que não precisa do repositório: o arquivo vive num diretório descartável e
 * some antes do retorno. Quem precisa dos arquivos do repositório usa
 * `withTempRepo` com `OWNERSHIP_FILE` e `loadLivingDocsConfig(root)`.
 */
export function configFrom(yaml: string): LivingDocsConfig {
  const root = mkdtempSync(join(tmpdir(), 'living-docs-config-'))

  try {
    writeFileSync(join(root, OWNERSHIP_FILE), yaml, 'utf8')

    return loadLivingDocsConfig(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}
```

- [ ] **Passo 3.2: Testes do adaptador (vermelho)**

Substitua o conteúdo de `packages/living-docs/test/config/ownership.test.ts`
inteiro por:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { OwnershipError, documentWithRole, fieldOf, findArtifactRule, findDocumentRule, loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { DEFAULT_ID_FORMAT } from '../../src/docs/schema.ts'
import { checkoutRoot } from '../helpers/checkout.ts'
import { configFrom } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const HEAD = 'version: 2\nplugins: [living-docs]\n'

const ADR = `
  - path: docs/decisions/adr/
    owner: '@time'
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]
`

const DA = `
  - path: docs/open-decisions.md
    owner: '@produto'
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      field-map: { resolved-by: 'Resolvida por' }
`

function yaml(owned: string, top = ''): string {
  return `${HEAD}${top}owned:${owned}`
}

test('ADR-0029: entrada com living-docs.id-prefix é artefato, com os campos do bloco e os do núcleo', () => {
  const config = configFrom(yaml(ADR + DA))
  const adr = config.artifacts.find(rule => rule.idPrefix === 'ADR')
  const da = config.artifacts.find(rule => rule.idPrefix === 'DA')

  assert.equal(adr?.path, 'docs/decisions/adr/')
  assert.equal(adr?.owner, '@time')
  assert.equal(adr?.skill, 'decision-recorder')
  assert.equal(adr?.appendOnly, true)
  assert.deepEqual(adr?.mutableFields, ['status', 'superseded-by', 'last-reviewed'])
  assert.deepEqual(adr?.states, ['draft', 'accepted', 'superseded'])
  assert.equal(adr?.collection, 'per-file')
  assert.equal(adr?.audience, 'internal')
  assert.equal(da?.collection, 'table')
  assert.deepEqual(da?.fieldMap, { 'resolved-by': 'resolvida por' })
  assert.equal(da?.core.format.key, 'ID')
})

test('ADR-0029: entrada com bloco living-docs sem id-prefix é documento; sem bloco, não é do living-docs', () => {
  const config = configFrom(
    yaml(`${ADR}
  - path: CLAUDE.md
    owner: '@time'
    skill: working-agreements-keeper
    living-docs: { role: agent-contract }
  - path: README.md
    owner: '@time'
    living-docs: { audience: external }
  - path: src/
    owner: '@time'
`),
  )

  assert.deepEqual(
    config.documents.map(document => [document.path, document.skill, document.role, document.audience]),
    [
      ['CLAUDE.md', 'working-agreements-keeper', 'agent-contract', 'internal'],
      ['README.md', null, null, 'external'],
    ],
  )
  assert.equal(findDocumentRule(config, 'src/a.ts'), null)
  assert.equal(findArtifactRule(config, 'src/a.ts'), null)
  assert.equal(documentWithRole(config, 'agent-contract')?.path, 'CLAUDE.md')
})

test('ADR-0028: o bloco de topo carrega stale-after-months, id-format e last-reviewed-bump-limit; ausente, valem os padrões', () => {
  const declared = configFrom(
    yaml(ADR, "living-docs:\n  stale-after-months: 3\n  id-format: { separator: '_', padding: 3 }\n  last-reviewed-bump-limit: 5\n"),
  )
  const defaults = configFrom(yaml(ADR))

  assert.equal(declared.staleAfterMonths, 3)
  assert.deepEqual(declared.idFormat, { separator: '_', padding: 3 })
  assert.equal(declared.lastReviewedBumpLimit, 5)
  assert.equal(defaults.staleAfterMonths, 6)
  assert.deepEqual(defaults.idFormat, DEFAULT_ID_FORMAT)
  assert.equal(defaults.lastReviewedBumpLimit, 3)
})

test('chave desconhecida no bloco de topo é erro', () => {
  assert.throws(() => configFrom(yaml(ADR, 'living-docs:\n  stale-after: 3\n')), /\.ownership\.yml\.living-docs.*"stale-after" desconhecida/)
})

test('chave desconhecida no bloco da entrada é erro que nomeia a entrada', () => {
  const extra = ADR.replace('append-only: true', 'append-only: true\n      apend-only: true')

  assert.throws(() => configFrom(yaml(extra)), /entrada "docs\/decisions\/adr\/".*"apend-only" desconhecida/)
})

test('chave de artefato em documento é erro, e a mensagem diz por quê', () => {
  assert.throws(
    () => configFrom(yaml(`${ADR}\n  - path: CLAUDE.md\n    owner: '@time'\n    living-docs: { append-only: true }\n`)),
    /"append-only" desconhecida.*só valem com `id-prefix`/,
  )
})

test('id-prefix fora da forma, duplicado, ou artefato sem skill são erro', () => {
  assert.throws(() => configFrom(yaml(ADR.replace('id-prefix: ADR', 'id-prefix: adr'))), /id-prefix "adr".*2 a 4 letras maiúsculas/)
  assert.throws(() => configFrom(yaml(ADR + ADR.replace('docs/decisions/adr/', 'docs/adr2/'))), /id-prefix "ADR" declarado duas vezes/)
  assert.throws(() => configFrom(yaml(ADR.replace('    skill: decision-recorder\n', ''))), /artefato precisa de `skill`/)
})

test('papel declarado em dois documentos é erro, e papel desconhecido também', () => {
  const doc = (path: string, role: string) => `\n  - path: ${path}\n    owner: '@time'\n    living-docs: { role: ${role} }\n`

  assert.throws(() => configFrom(yaml(ADR + doc('A.md', 'agent-contract') + doc('B.md', 'agent-contract'))), /papel "agent-contract" declarado em dois documentos/)
  assert.throws(() => configFrom(yaml(ADR + doc('A.md', 'manual'))), /role "manual" desconhecido/)
})

test('id-format e last-reviewed-bump-limit fora da faixa são erro', () => {
  assert.throws(() => configFrom(yaml(ADR, "living-docs:\n  id-format: { separator: '/' }\n")), /separator "\/" não é aceito/)
  assert.throws(() => configFrom(yaml(ADR, 'living-docs:\n  id-format: { padding: 9 }\n')), /padding "9" precisa ser inteiro entre 2 e 6/)
  assert.throws(() => configFrom(yaml(ADR, 'living-docs:\n  last-reviewed-bump-limit: 1\n')), /last-reviewed-bump-limit "1".*maior ou igual a 2/)
})

test('sem nenhum artefato, o erro ensina a declarar o plugin e o bloco', () => {
  assert.throws(() => configFrom("version: 2\nowned:\n  - path: a.md\n    owner: '@time'\n"), /nenhuma entrada de `owned` traz `living-docs\.id-prefix`.*plugins: \[living-docs\]/)
})

test('sem arquivo de ownership, OwnershipError que aponta o init', () => {
  withTempRepo({}, root => {
    assert.throws(() => loadLivingDocsConfig(root), (err: unknown) => err instanceof OwnershipError && /living-docs init/.test(err.message))
  })
})

test('ADR-0029: arquivo v1 não é lido — o erro do núcleo sobe como está', () => {
  withTempRepo({ '.ownership.yml': 'version: 1\nartifacts: []\n' }, root => {
    assert.throws(() => loadLivingDocsConfig(root), (err: unknown) => err instanceof OwnershipError && /esquema v1/.test(err.message))
  })
})

test('fieldOf traduz o campo canônico pelo field-map e trata vazio como ausente', () => {
  const config = configFrom(yaml(DA))
  const rule = config.artifacts[0]!
  const item = { key: 'DA-0001', state: 'resolved', line: 3, fields: { 'resolvida por': 'ADR-0001', lacuna: '—' } }

  assert.equal(fieldOf(rule, item, 'resolved-by'), 'ADR-0001')
  assert.equal(fieldOf(rule, item, 'lacuna'), null)
})

test('este repositório: o .ownership.yml da raiz declara states de toda família, e o documento de cada papel', () => {
  const config = loadLivingDocsConfig(checkoutRoot())

  assert.equal(config.rootFile, '.ownership.yml')
  assert.deepEqual(config.artifacts.map(rule => rule.idPrefix).sort(), ['ADR', 'DA', 'REL', 'RF', 'RN', 'RNF', 'TDR'])
  for (const rule of config.artifacts) {
    assert.ok(rule.states !== null && rule.states.length > 0, `${rule.idPrefix} precisa declarar states`)
  }
  assert.equal(documentWithRole(config, 'agent-contract')?.path, 'CLAUDE.md')
  assert.equal(documentWithRole(config, 'definition-of-done')?.path, 'docs/definition-of-done.md')
})
```

São 14 testes. Rode
`cd packages/living-docs && node --conditions=development --test test/config/ownership.test.ts; cd ../..`:
falha por import (`loadLivingDocsConfig` não existe).

- [ ] **Passo 3.3: O adaptador (verde)**

Substitua o conteúdo de `packages/living-docs/src/config/ownership.ts` inteiro
por:

```ts
import { OwnershipError, isEmptyValue, normalizeFieldKey, resolveOwnership } from '@esliph/ownership'
import type { DocItem, ResolvedConfig, ResolvedOwnedRule } from '@esliph/ownership'
import { DEFAULT_ID_FORMAT, PADDING_RANGE, SEPARATORS_ALLOWED } from '../docs/schema.ts'
import type { IdFormat } from '../docs/schema.ts'

export { OwnershipError }

/**
 * O nome do bloco deste plugin no arquivo de ownership. Um caminho é do
 * living-docs se, e somente se, a entrada de `owned` que o cobre traz este
 * bloco (ADR-0020); com `id-prefix` é artefato, sem ele é documento (ADR-0029).
 */
export const PLUGIN = 'living-docs'

export type Collection = 'per-file' | 'table' | 'sections'

/**
 * Quem lê um documento ou artefato (`ADR-0017`). Ausente, vale `internal`.
 */
export const AUDIENCES = ['internal', 'external'] as const
export type Audience = (typeof AUDIENCES)[number]

/**
 * Papéis que o toolkit reconhece num documento (`ADR-0008`). Vocabulário
 * fechado: é o que permite achar o contrato do agente e a Definition of Done
 * sem conhecer caminho nenhum.
 */
export const DOCUMENT_ROLES = ['agent-contract', 'definition-of-done'] as const
export type DocumentRole = (typeof DOCUMENT_ROLES)[number]

export interface ArtifactRule {
  idPrefix: string
  path: string
  owner: string
  skill: string
  appendOnly: boolean
  mutableFields: string[]
  citedBy: string[]
  collection: Collection
  /** Canônico -> nome real do campo neste projeto. Ex.: { 'resolved-by': 'resolvida por' }. */
  fieldMap: Record<string, string>
  /** `states` da entrada, que é do núcleo; `null` quando a entrada não declara. */
  states: string[] | null
  audience: Audience
  /** A entrada resolvida pelo núcleo — é o que `findTransitions` recebe. */
  core: ResolvedOwnedRule
}

/** Documento com dono e sem família de IDs (`ADR-0008`). */
export interface DocumentRule {
  path: string
  owner: string
  /** Skill dona, quando existe uma. `null` é informação, não erro. */
  skill: string | null
  role: DocumentRole | null
  audience: Audience
  core: ResolvedOwnedRule
}

export interface GeneratedRule {
  path: string
  command: string
}

export interface WatchRule {
  code: string
  doc: string
  reason: string | null
  consumerVisible: boolean
}

export interface LivingDocsConfig {
  /** O arquivo de ownership raiz, relativo ao repositório (ex.: `.ownership.yml`). */
  rootFile: string
  staleAfterMonths: number
  /** Quantos documentos com bump de data seco reprovam (`ADR-0013`, `RN-0027`). */
  lastReviewedBumpLimit: number
  /** A forma escrita dos IDs deste projeto (`ADR-0011`). Nunca a identidade. */
  idFormat: IdFormat
  artifacts: ArtifactRule[]
  documents: DocumentRule[]
  generated: GeneratedRule[]
  watches: WatchRule[]
  /** A configuração inteira, como o núcleo a resolveu. */
  core: ResolvedConfig
}

const ID_PREFIX = /^[A-Z]{2,4}$/
const TOP_KEYS: ReadonlySet<string> = new Set(['stale-after-months', 'id-format', 'last-reviewed-bump-limit'])
const ARTIFACT_KEYS: ReadonlySet<string> = new Set(['id-prefix', 'append-only', 'mutable-fields', 'cited-by', 'field-map', 'audience'])
const DOCUMENT_KEYS: ReadonlySet<string> = new Set(['role', 'audience'])
const DEFAULT_STALE_AFTER_MONTHS = 6

/**
 * O limiar de bump em massa (`ADR-0013`). Piso 2, e não 1: um documento revisado
 * de verdade atualiza a data, e limiar 1 reprovaria o mecanismo funcionando.
 */
export const DEFAULT_BUMP_LIMIT = 3

function fail(where: string, message: string): never {
  throw new OwnershipError(`${where}: ${message}`)
}

function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    fail(where, 'precisa ser um mapa.')
  }

  return value as Record<string, unknown>
}

function asStringList(value: unknown, where: string): string[] {
  if (value === undefined || value === null) {
    return []
  }
  if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
    fail(where, 'precisa ser uma lista de strings.')
  }

  return value as string[]
}

function assertKnown(block: Record<string, unknown>, allowed: ReadonlySet<string>, where: string, hint = ''): void {
  for (const key of Object.keys(block)) {
    if (!allowed.has(key)) {
      fail(where, `chave "${key}" desconhecida.${hint}`)
    }
  }
}

function parseIdFormat(raw: unknown, where: string): IdFormat {
  if (raw === undefined || raw === null) {
    return DEFAULT_ID_FORMAT
  }
  const item = asRecord(raw, `${where}.id-format`)
  const separator = item.separator ?? DEFAULT_ID_FORMAT.separator

  if (typeof separator !== 'string' || !SEPARATORS_ALLOWED.includes(separator)) {
    // Regra de origem: ADR-0011.
    fail(where, `id-format.separator "${String(separator)}" não é aceito. Válidos: ${SEPARATORS_ALLOWED.map(value => `"${value}"`).join(', ')}.`)
  }

  const padding = item.padding ?? DEFAULT_ID_FORMAT.padding

  if (typeof padding !== 'number' || !Number.isInteger(padding) || padding < PADDING_RANGE.min || padding > PADDING_RANGE.max) {
    // Regra de origem: ADR-0011.
    fail(where, `id-format.padding "${String(padding)}" precisa ser inteiro entre ${PADDING_RANGE.min} e ${PADDING_RANGE.max}.`)
  }

  return { separator, padding }
}

function parseBumpLimit(raw: unknown, where: string): number {
  if (raw === undefined || raw === null) {
    return DEFAULT_BUMP_LIMIT
  }
  if (typeof raw !== 'number' || !Number.isInteger(raw) || raw < 2) {
    // Regra de origem: ADR-0013.
    fail(where, `last-reviewed-bump-limit "${String(raw)}" precisa ser inteiro maior ou igual a 2 (limiar 1 reprovaria a revisão legítima de um documento só).`)
  }

  return raw
}

function parseAudience(raw: unknown, where: string): Audience {
  if (raw === undefined) {
    return 'internal'
  }
  if (!AUDIENCES.includes(raw as Audience)) {
    fail(where, `audience "${String(raw)}" desconhecido. Válidos: ${AUDIENCES.join(', ')}.`)
  }

  return raw as Audience
}

function whereOf(rule: ResolvedOwnedRule): string {
  return `${rule.origin}: entrada "${rule.path}", bloco ${PLUGIN}`
}

function toArtifact(rule: ResolvedOwnedRule, block: Record<string, unknown>): ArtifactRule {
  const where = whereOf(rule)

  assertKnown(block, ARTIFACT_KEYS, where)

  const idPrefix = block['id-prefix']

  if (typeof idPrefix !== 'string' || !ID_PREFIX.test(idPrefix)) {
    fail(where, `id-prefix "${String(idPrefix)}" precisa ser 2 a 4 letras maiúsculas (ex.: ADR, DA, TDR).`)
  }
  if (rule.skill === null) {
    fail(where, 'artefato precisa de `skill` na entrada — é a skill dona que escreve os itens dele.')
  }

  const fieldMap: Record<string, string> = {}
  const fieldMapRaw = block['field-map']

  if (fieldMapRaw !== undefined && fieldMapRaw !== null) {
    for (const [canonical, real] of Object.entries(asRecord(fieldMapRaw, `${where}.field-map`))) {
      if (typeof real !== 'string' || real.trim() === '') {
        fail(where, `field-map.${canonical} precisa ser uma string não vazia.`)
      }
      fieldMap[normalizeFieldKey(canonical)] = normalizeFieldKey(real)
    }
  }

  return {
    idPrefix,
    path: rule.path,
    owner: rule.owner,
    skill: rule.skill,
    appendOnly: block['append-only'] === true,
    mutableFields: asStringList(block['mutable-fields'], `${where}.mutable-fields`),
    citedBy: asStringList(block['cited-by'], `${where}.cited-by`),
    collection: rule.format.collection,
    fieldMap,
    states: rule.states,
    audience: parseAudience(block.audience, where),
    core: rule,
  }
}

function toDocument(rule: ResolvedOwnedRule, block: Record<string, unknown>): DocumentRule {
  const where = whereOf(rule)

  assertKnown(block, DOCUMENT_KEYS, where, ' Chaves de artefato só valem com `id-prefix`.')

  const role = block.role

  if (role !== undefined && !DOCUMENT_ROLES.includes(role as DocumentRole)) {
    fail(where, `role "${String(role)}" desconhecido. Válidos: ${DOCUMENT_ROLES.join(', ')}.`)
  }

  return {
    path: rule.path,
    owner: rule.owner,
    skill: rule.skill,
    role: role === undefined ? null : (role as DocumentRole),
    audience: parseAudience(block.audience, where),
    core: rule,
  }
}

/** A configuração do living-docs sobre a que o núcleo resolveu. Função pura. */
export function adaptConfig(core: ResolvedConfig): LivingDocsConfig {
  const top = core.pluginBlocks[PLUGIN] ?? {}
  const topWhere = `${core.rootFile}.${PLUGIN}`

  assertKnown(top, TOP_KEYS, topWhere)

  const artifacts: ArtifactRule[] = []
  const documents: DocumentRule[] = []

  for (const rule of core.owned) {
    const block = rule.pluginBlocks[PLUGIN]

    if (block === undefined) {
      continue
    }
    if (block['id-prefix'] !== undefined) {
      artifacts.push(toArtifact(rule, block))
    } else {
      documents.push(toDocument(rule, block))
    }
  }

  if (artifacts.length === 0) {
    fail(
      core.rootFile,
      `nenhuma entrada de \`owned\` traz \`${PLUGIN}.id-prefix\` — sem artefato declarado nada é enforceável. ` +
        `Declare \`plugins: [${PLUGIN}]\` na raiz e o bloco \`${PLUGIN}:\` nas entradas.`,
    )
  }

  const prefixes = new Set<string>()

  for (const artifact of artifacts) {
    if (prefixes.has(artifact.idPrefix)) {
      fail(core.rootFile, `id-prefix "${artifact.idPrefix}" declarado duas vezes. Um artefato, um dono.`)
    }
    prefixes.add(artifact.idPrefix)
  }

  const roles = new Set<string>()

  for (const document of documents) {
    if (document.role === null) {
      continue
    }
    if (roles.has(document.role)) {
      fail(core.rootFile, `papel "${document.role}" declarado em dois documentos. Um papel, um documento.`)
    }
    roles.add(document.role)
  }

  const stale = top['stale-after-months']

  return {
    rootFile: core.rootFile,
    staleAfterMonths: typeof stale === 'number' ? stale : DEFAULT_STALE_AFTER_MONTHS,
    lastReviewedBumpLimit: parseBumpLimit(top['last-reviewed-bump-limit'], topWhere),
    idFormat: parseIdFormat(top['id-format'], topWhere),
    artifacts,
    documents,
    generated: core.generated.map(rule => ({ path: rule.path, command: rule.command })),
    watches: core.watches.map(rule => ({ code: rule.code, doc: rule.doc, reason: rule.reason, consumerVisible: rule.consumerVisible })),
    core,
  }
}

/**
 * Acha o arquivo de ownership pela ordem de candidatos do núcleo, valida o
 * esquema, a disjunção e as bases (o núcleo), e depois o bloco `living-docs:`
 * com o rigor de sempre: chave desconhecida é erro. `OwnershipError` sobe como está.
 */
export function loadLivingDocsConfig(root: string): LivingDocsConfig {
  const core = resolveOwnership(root)

  if (core === null) {
    throw new OwnershipError(`nenhum arquivo de ownership encontrado em ${root}. Rode \`living-docs init\` (skill dona: living-docs-bootstrap).`)
  }

  return adaptConfig(core)
}

/**
 * Valor de um campo canônico do item, respeitando o `field-map` do artefato.
 * Devolve null para célula vazia — ausente e vazio são a mesma coisa aqui.
 */
export function fieldOf(rule: ArtifactRule, item: DocItem, canonical: string): string | null {
  const key = rule.fieldMap[normalizeFieldKey(canonical)] ?? normalizeFieldKey(canonical)
  const value = item.fields[key]

  if (value === undefined || isEmptyValue(value)) {
    return null
  }

  return value.trim()
}

function normalizePath(repoPath: string): string {
  return repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** O caminho declarado cobre este caminho? Diretório por prefixo, arquivo por igualdade. */
function covers(declared: string, repoPath: string): boolean {
  const target = declared.replace(/\\/g, '/')

  return target.endsWith('/') ? repoPath.startsWith(target) : repoPath === target
}

/** Regra de artefato dona de um caminho relativo à raiz do repositório, ou null. */
export function findArtifactRule(config: LivingDocsConfig, repoPath: string): ArtifactRule | null {
  const normalized = normalizePath(repoPath)

  return config.artifacts.find(artifact => covers(artifact.path, normalized)) ?? null
}

/** Documento dono de um caminho relativo, ou null. Mesma semântica de `findArtifactRule`. */
export function findDocumentRule(config: LivingDocsConfig, repoPath: string): DocumentRule | null {
  const normalized = normalizePath(repoPath)

  return config.documents.find(document => covers(document.path, normalized)) ?? null
}

/** O documento que o projeto declarou com este papel, ou null. */
export function documentWithRole(config: LivingDocsConfig, role: DocumentRole): DocumentRule | null {
  return config.documents.find(document => document.role === role) ?? null
}
```

Rode o arquivo de teste do passo 3.2. Esperado: os 13 primeiros passam; o
último (dogfooding) falha porque o `.ownership.yml` da raiz ainda não existe —
fica vermelho até o passo 3.10.

- [ ] **Passo 3.4: Itens pelos parsers do núcleo**

1. Em `packages/living-docs/src/docs/collect.ts`, troque os imports de
   `./table.ts`, `./sections.ts` e `./item.ts` por
   `import { parseItemsSections, parseItemsTable } from '@esliph/ownership'` e
   `import type { DocItem } from '@esliph/ownership'`; troque
   `OwnershipConfig` por `LivingDocsConfig`; acrescente `parseId` ao import de
   `./schema.ts`; e troque `parseItems` por:

```ts
/**
 * Os itens de um artefato de coleção, lidos pelo núcleo segundo o `format` da
 * entrada. A forma do ID é política do living-docs, não do parser: a chave
 * chega opaca e só vira item o que é ID na forma declarada pelo projeto
 * (`ADR-0011`). Título sem ID, e linha de tabela sem ID, não são item.
 */
function parseItems(rule: ArtifactRule, source: string, body: string | null, bodyStart: number, format: IdFormat): DocItem[] {
  const text = body ?? source
  const start = body === null ? 1 : bodyStart
  const { format: read } = rule.core
  const items =
    read.collection === 'table'
      ? parseItemsTable(text, start, { key: read.key!, stateField: read.stateField })
      : read.collection === 'sections'
        ? parseItemsSections(text, start, { keyMode: read.keyMode!, stateField: read.stateField })
        : []

  return items.filter(item => parseId(item.key, format) !== null)
}
```

2. Apague `packages/living-docs/src/docs/table.ts`, `sections.ts`, `item.ts` e
   os testes `test/docs/table.test.ts`, `test/docs/sections.test.ts` com
   `git rm`. Antes de apagar, confira cada caso contra a tabela
   "Confronto dos testes removidos" no fim deste plano.

3. Troque `item.id` por `item.key` e `item.status` por `item.state` em todo
   `src/`:

```bash
git grep -n "item\.id\b\|item\.status\b" -- packages/living-docs/src
```

   Esperado antes da troca: `ci1-structure.ts`, `ci2-ids.ts`, `ci3-traceability.ts`,
   `ci4-staleness.ts`, `ci9-commit-discipline.ts`, `docs/blocked.ts`,
   `hooks/hk6-session-inventory.ts` (o `hk3` é reescrito no passo 3.9). Em
   `ci3-traceability.ts` o objeto montado continua com as chaves `id` e
   `status` que o resto do check lê: só o lado direito muda
   (`id: item.key`, `status: item.state`). Em `ci4-staleness.ts:125`, a checagem
   `item.status !== null` vira `item.state !== ''`.

4. Em `docs/blocked.ts` e onde mais `normalizeKey`/`isEmptyValue` vinham de
   `docs/item.ts`, importe `normalizeFieldKey`/`isEmptyValue` de
   `@esliph/ownership`.

5. Acrescente a `packages/living-docs/test/docs/collect.test.ts` os dois testes
   do Review Focus 3:

```ts
test('tabela de coleção sem coluna Status: os itens chegam sem estado, e quem reclama é o check de estrutura', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `version: 2
plugins: [living-docs]
owned:
  - path: docs/open-decisions.md
    owner: '@time'
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs: { id-prefix: DA }
`,
      // A linha `nota` não é ID: o núcleo a devolve como chave opaca, e é o
      // filtro de forma de ID do living-docs que a tira.
      'docs/open-decisions.md': '| ID | Lacuna |\n| --- | --- |\n| DA-0001 | x |\n| nota | y |\n',
    },
    root => {
      const docs = collectArtifacts(root, loadLivingDocsConfig(root))

      assert.deepEqual(
        docs[0]?.items.map(item => [item.key, item.state]),
        [['DA-0001', '']],
      )
    },
  )
})

test('requisito em título ### não é item — só ## declara requisito', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `version: 2
plugins: [living-docs]
owned:
  - path: docs/requirements/rules.md
    owner: '@time'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs: { id-prefix: RN }
`,
      'docs/requirements/rules.md': '## RN-0001 — Regra\n\n- **status:** active\n\n### RN-0002 — Sub\n\n- **status:** active\n\n## Contexto\n',
    },
    root => {
      const docs = collectArtifacts(root, loadLivingDocsConfig(root))

      assert.deepEqual(
        docs[0]?.items.map(item => item.key),
        ['RN-0001'],
      )
    },
  )
})
```

   Importe `OWNERSHIP_FILE` de `../helpers/ownership.ts` e `loadLivingDocsConfig`
   de `../../src/config/ownership.ts` no topo do arquivo.

- [ ] **Passo 3.5: Estados vêm da entrada**

Em `packages/living-docs/src/docs/schema.ts`, apague `STATUS_MACHINE` e
`statesFor` (e o `import type { ArtifactRule }`, que fica sem uso). Troque cada
uso:

- `src/checks/ci1-structure.ts`: `const states = statesFor(doc.rule)` →
  `const states = doc.rule.states`;
- `src/checks/ci4-staleness.ts:155`: `statesFor(doc.rule)?.includes(DEBT_STATE)` →
  `doc.rule.states?.includes(DEBT_STATE)`;
- `src/hooks/hk6-session-inventory.ts:49`: idem com `DECISION_STATE`.

Em `test/docs/schema.test.ts`, apague os três testes que liam a máquina embutida
(`'a máquina de estados da spec §4 está codificada'`,
`'as três famílias de requisito compartilham o ciclo draft → active → revoked'`,
`'statesFor prefere o states declarado no .ownership.yml'`). O último teste do
passo 3.2 é o substituto: os estados agora são declaração do projeto.

- [ ] **Passo 3.6: O corpus sem diretório de ownership**

Substitua `packages/living-docs/src/docs/corpus.ts` por:

```ts
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { LivingDocsConfig } from '../config/ownership.ts'
import { listFiles } from '../core/files.ts'

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** Todo caminho que é do living-docs: artefatos, documentos e gerados. */
export function declaredPaths(config: LivingDocsConfig): string[] {
  return [...config.artifacts.map(artifact => artifact.path), ...config.documents.map(document => document.path), ...config.generated.map(generated => generated.path)].map(
    normalize,
  )
}

/**
 * O corpus da documentação: tudo que mora num caminho do living-docs e existe.
 *
 * Antes era "tudo sob o diretório do arquivo de ownership, mais o declarado fora
 * dele". Com o arquivo na raiz, esse diretório seria o repositório inteiro. O
 * corpus passa a ser o que as entradas com bloco `living-docs:` declaram, que é
 * o que o projeto disse ser documentação (ADR-0029). É o conjunto que o check de
 * links varre e onde anexo binário reprova.
 */
export function documentationFiles(root: string, config: LivingDocsConfig): string[] {
  const files = new Set<string>()

  for (const declared of declaredPaths(config)) {
    if (declared.endsWith('/')) {
      for (const file of listFiles(root, [`${declared}**`])) {
        files.add(file)
      }
      continue
    }
    if (existsSync(join(root, declared))) {
      files.add(declared)
    }
  }

  return [...files].sort()
}
```

Em `src/checks/ci8-links.ts`: tire `docsRoot` do import, apague
`const prefix = …` e o `if (!file.startsWith(prefix)) continue` do laço de
binários, e troque a mensagem para
`` `Anexo em formato binário na documentação: \`.${extension}\` não se lê em diff nem se revisa em PR.` ``.

Em `test/docs/corpus.test.ts`: apague o teste `'docsRoot deriva da localização…'`
e reescreva `'documentationFiles = tudo sob a raiz + o que é declarado fora dela e existe'`
como `'documentationFiles = o que os caminhos do living-docs declaram e existe; o resto do repositório não entra'`,
com uma fixture v2 que tenha um arquivo sob `src/` coberto por entrada **sem**
bloco `living-docs:` e afirme que ele não está no resultado.

Em `test/checks/ci8-links.test.ts`, renomeie
`'RN-0023: binário fora da raiz da documentação não é assunto de CI-8'` para
`'RN-0023: binário fora do corpus não é assunto de CI-8'` e ajuste a fixture:
o binário mora num caminho sem bloco `living-docs:`.

- [ ] **Passo 3.7: Confrontar e portar para o núcleo, antes de apagar**

Para cada linha da tabela "Confronto dos testes removidos" (fim do plano)
marcada **portar**, acrescente o teste ao arquivo do núcleo indicado, rode-o, e
só então siga. Os testes a portar, no estilo dos vizinhos em cada arquivo
(`env`, `CONFIG`, `withTempRepo`, `buildConfig` já definidos neles):

`packages/ownership/test/hooks/generated-guard.test.ts`:

```ts
test('o marcador só conta na primeira linha — prosa sobre ele, ou marcador na linha 20, não congela o arquivo', () => {
  const corpo = ['# Título', ...Array.from({ length: 18 }, () => 'linha'), 'generated: do not edit', 'fim'].join('\n')

  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'x.md': corpo, 'y.md': 'Este texto fala de generated: do not edit.\n' }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root)).action, 'allow')
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'y.md' } }, env(root)).action, 'allow')
  })
})

test('payload sem file_path permite', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: {} }, env(root)).action, 'allow')
  })
})

test('file_path absoluto do host sob a raiz é traduzido e negado quando gerado', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\ngenerated:\n  - path: out.md\n    command: gen\n' }, root => {
    const absolute = `${root.replace(/\\/g, '/')}/out.md`

    assert.equal(decideGeneratedGuard({ tool_input: { file_path: absolute } }, env(root)).action, 'deny')
  })
})

test('generated[] exige caminho exato — diretório declarado não cobre o que está dentro dele', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\ngenerated:\n  - path: out/\n    command: gen\n', 'out/a.md': 'corpo\n' }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'out/a.md' } }, env(root)).action, 'allow')
  })
})
```

`packages/ownership/test/hooks/watch-reminder.test.ts`:

```ts
test('o lembrete nomeia o doc, o motivo e a skill dona, e não carrega decisão de permissão', () => {
  const config = "version: 2\nowned:\n  - path: docs/requirements/rules.md\n    owner: '@time'\n    skill: requirements-keeper\nwatches:\n  - code: 'src/**'\n    doc: docs/requirements/rules.md\n    reason: regra antes do código\n"

  withTempRepo({ '.ownership.yml': config }, root => {
    const decision = decideWatchReminder({ tool_input: { file_path: 'src/a.ts' } }, env(root))

    assert.equal(decision.action, 'remind')
    assert.ok(decision.action === 'remind')
    assert.match(decision.context, /docs\/requirements\/rules\.md/)
    assert.match(decision.context, /regra antes do código/)
    assert.match(decision.context, /requirements-keeper/)
    assert.doesNotMatch(decision.context, /permissionDecision/)
  })
})

test('doc dono sem skill declarada ainda é lembrado, e a mensagem aponta o CODEOWNERS', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideWatchReminder({ tool_input: { file_path: 'src/checks/a.ts' } }, env(root))

    assert.ok(decision.action === 'remind')
    assert.match(decision.context, /Sem skill declarada/)
  })
})

test('payload sem file_path é silêncio', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    assert.equal(decideWatchReminder({ tool_input: {} }, env(root)).action, 'silent')
  })
})
```

`packages/ownership/test/hooks/commit-guard.test.ts`:

```ts
test('a mensagem ensina as duas saídas legítimas: atualizar o doc, ou decisão humana', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => 'src/checks/a.ts\0')

    assert.ok(decision.action === 'ask')
    assert.match(decision.reason, /atualize o doc/i)
    assert.match(decision.reason, /decisão humana/i)
  })
})

test('comando que não é git commit passa sem consultar o git', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    let consultado = false
    const spy = () => {
      consultado = true

      return ''
    }

    for (const command of ['git status', 'npm test', 'git add -A', 'echo "git commit"']) {
      assert.equal(decideCommitGuard({ tool_name: 'Bash', tool_input: { command } }, env(root), spy).action, 'allow', command)
    }
    assert.equal(consultado, false)
  })
})

test('índice vazio passa', () => {
  withTempRepo({ '.ownership.yml': CONFIG }, root => {
    assert.equal(decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => '').action, 'allow')
  })
})
```

`packages/ownership/test/checks/generated-drift.test.ts`:

```ts
test('CR do checkout e quebra final a mais não são deriva', () => {
  withTempRepo({ 'out.md': 'a\r\nb\r\n\n\n' }, root => {
    const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })

    assert.deepEqual(ownershipGeneratedDrift(() => 'a\nb\n').run({ root, config, today: '2026-09-28' }), [])
  })
})
```

`packages/ownership/test/checks/consumer-change-logged.test.ts`:

```ts
test('item em Unreleased escrito com * conta como entrada', () => {
  withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n\n* algo novo\n' }, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })

    assert.deepEqual(
      ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({ root, config, today: '2026-09-28' }),
      [],
    )
  })
})

test('doc declarado, no diff e ausente do repositório é achado, não silêncio', () => {
  withTempRepo({}, root => {
    const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
    const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({ root, config, today: '2026-09-28' })

    assert.equal(findings.length, 1)
    assert.match(findings[0]!.message, /ausente/)
  })
})
```

`packages/ownership/test/core/exception-label.test.ts`:

```ts
test('aceita travessão, meia-risca, hífen e dois-pontos como separador', () => {
  for (const separator of ['—', '–', '-', ':']) {
    assert.equal(exceptionReasonFor('Changelog', [`Changelog: none ${separator} só teste`]), 'só teste', separator)
  }
})
```

`packages/ownership/test/core/codeowners.test.ts` — os quatro testes de
`packages/living-docs/test/config/codeowners.test.ts`, copiados como estão (a
constante `CODEOWNERS` junto), trocando só o import para
`import { loadCodeowners, ownersOf, parseCodeowners } from '../../src/core/codeowners.ts'`
e `import { withTempRepo } from '../helpers/tmp.ts'`. O primeiro comentário da
constante passa a citar `.ownership.yml`.

`packages/ownership/test/core/exec.test.ts` (importe `GitError` junto):

```ts
test('changedPaths com base que não resolve lança GitError — o check não inventa diff vazio', () => {
  assert.throws(
    () =>
      changedPaths('/repo', 'nao-existe', () => {
        throw new Error('fatal: bad revision')
      }),
    GitError,
  )
})
```

`packages/ownership/test/cli/validate.test.ts` — o living-docs saía com 2 e
ensinava o `fetch-depth` quando a base não resolvia; o CLI do núcleo hoje deixa
o `GitError` escapar como exceção:

```ts
test('base que não resolve: sai com 2 e diz que o clone precisa conter a base', { timeout: 30_000 }, () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    spawnSync('git', ['init', '-q'], { cwd: root })
    const cli = join(import.meta.dirname, '..', '..', 'src', 'cli', 'index.ts')
    const run = spawnSync('node', [cli, 'validate', '--base', 'nao-existe'], { cwd: root, encoding: 'utf8', env: { ...process.env, OWNERSHIP_REPO_ROOT: root } })

    assert.equal(run.status, 2, run.stderr)
    assert.match(run.stderr, /fetch-depth/)
  })
})
```

(importe `spawnSync` de `node:child_process`, `join` de `node:path` e
`withTempRepo` de `../helpers/tmp.ts` se o arquivo ainda não os tiver). Este
fica vermelho. Em `packages/ownership/src/cli/index.ts`, importe `GitError` de
`../core/exec.ts` e acrescente ao `catch`, depois do ramo de `OwnershipError`:

```ts
    if (err instanceof GitError) {
      process.stderr.write(`ownership: ${err.message}\n` + '           o clone precisa conter a base (em CI: `actions/checkout` com `fetch-depth: 0`).\n')

      return 2
    }
```

`packages/ownership/test/schema/item.test.ts`:

```ts
test('parseItemsTable para de ler na primeira linha que não é da tabela', () => {
  const items = parseItemsTable('| ID | Status |\n| --- | --- |\n| A-1 | open |\n\n| A-2 | open |\n', 1, { key: 'ID', stateField: 'status' })

  assert.deepEqual(
    items.map(item => item.key),
    ['A-1'],
  )
})

test('parseItemsTable traz todas as colunas no item, pela chave normalizada', () => {
  const items = parseItemsTable('| ID | Status | Resolvida por: |\n| --- | --- | --- |\n| A-1 | open | B-2 |\n', 1, { key: 'ID', stateField: 'status' })

  assert.deepEqual(items[0]?.fields, { id: 'A-1', status: 'open', 'resolvida por': 'B-2' })
})

test('parseItemsSections: a linha é deslocada por startLine, e seção sem estado devolve estado vazio', () => {
  const items = parseItemsSections('## RN-0001 — Regra\n\nTexto.\n', 10, { keyMode: 'first-token', stateField: 'status' })

  assert.equal(items[0]?.line, 10)
  assert.equal(items[0]?.state, '')
})
```

Rode `npm test --workspace packages/ownership`. Esperado: **200** testes (177 +
23 portes), todos passando. Porte que ficar vermelho é comportamento que o
núcleo não tem: implemente no `src/` do núcleo o mínimo que o faz passar, e
registre na tabela de confronto do PR.

- [ ] **Passo 3.8: Tirar do living-docs o que foi para o núcleo**

1. Apague com `git rm`: `src/checks/ci5-contract-drift.ts`,
   `src/checks/ci6-changelog-required.ts`, `src/cli/drift.ts`,
   `src/cli/changelog.ts`, `src/config/codeowners.ts`, e os testes
   `test/checks/ci5-contract-drift.test.ts`,
   `test/checks/ci6-changelog-required.test.ts`, `test/cli/drift.test.ts`,
   `test/cli/changelog.test.ts`, `test/config/codeowners.test.ts`.

2. Em `src/core/types.ts`, troque o import de `OwnershipConfig` por
   `LivingDocsConfig` (e `config: LivingDocsConfig` no `CheckContext`), e
   acrescente:

```ts
/** Fatos do diff da branch, entregues por injeção a quem os lê (`ADR-0006`). */
export interface DiffFacts {
  base: string
  changed: string[]
  messages: string[]
}
```

   Em `src/checks/ci9-commit-discipline.ts` e `src/checks/ci7-ownership-coverage.ts`,
   importe `DiffFacts` de `../core/types.ts`.

3. `src/checks/registry.ts`: apague `driftChecks`, `changelogChecks`, `NO_DIFF`
   e os imports de `ci5`, `ci6`, `runCommand`, `CommandRunner`. `validateChecks`
   fica igual. Atualize o comentário de `validateChecks` (sem `CI-5`/`CI-6`).

4. `src/checks/ci1-structure.ts` — sai o que o `ownership/declared-state`
   cobre:
   - apague o bloco `else if (!states.includes(String(data.status)))` (status
     per-file fora de `states`), mantendo o `if (!states)` ("sem máquina de
     estados declarada"), cuja correção passa a dizer
     `'Declare \`states:\` na entrada deste artefato no arquivo de ownership.'`;
   - apague o bloco inteiro do `owner` sem `@`;
   - no laço de itens de coleção, apague o `if (!states.includes(item.state))`;
     fica só "item sem `status`".

   Em `test/checks/ci1-structure.test.ts`: apague
   `'status fora da máquina de estados falha na linha do campo'`; em
   `'owner sem @ e last-reviewed fora do ISO falham'` tire a metade do owner e
   renomeie para `'last-reviewed fora do ISO falha'`; em
   `'coleção em tabela: container não exige id, mas cada item exige status válido'`
   tire a metade "status fora da máquina" e renomeie para
   `'coleção em tabela: container não exige id, mas cada item exige status'`.

5. `src/checks/ci7-ownership-coverage.ts` — ficam as classes 3, 4 e 6:
   - apague os imports de `loadCodeowners`, `ownersOf`, `pendingDocs`,
     `documentationFiles`, `existsSync`, `join`, `findArtifactRule`,
     `findDocumentRule`, `OWNERSHIP_PATH`;
   - apague `isDeclared`, o bloco do CODEOWNERS ausente, o laço "1 — todo
     documento do corpus tem dono", o laço "2 — todo vínculo de watches", e o
     laço de `pendingDocs` dentro de "5"; o `if (diff !== null && docsExceptionReason(diff.messages) === null)`
     fica, envolvendo só o laço de `claimsFor` (renumere os comentários 3, 4, 5);
   - reescreva o comentário de cabeçalho: três classes (contrato repetindo
     artefato dono, item de DoD sem verificação, caminho reivindicado por
     decisão aberta no diff); a cobertura de dono e o vínculo de `watches`
     passaram para o núcleo (`ownership/owner-coverage` e
     `ownership/watch-satisfied`).

   Em `test/checks/ci7-ownership-coverage.test.ts`, apague:
   `'RN-0016: documento sob a raiz sem entrada no .ownership.yml reprova, nomeando o arquivo'`,
   `'RN-0016: CODEOWNERS ausente é uma finding, não uma por arquivo'`,
   `'RN-0008 (config): vínculo de watches que aponta doc inexistente ou sem dono reprova'`,
   `'critério 5, metade 2: o diff que leva caminho vigiado sem o doc dono reprova'`,
   `'critério 5, metade 2: com o doc no mesmo diff, ou com a razão escrita, passa'`,
   `'sem diff, a metade do diff não roda'`.
   Renomeie `'RN-0016: repositório com tudo declarado nos dois lugares passa'`
   para `'repositório sem nenhuma das três classes passa'` e ajuste a fixture.

6. `src/cli/validate.ts`: `loadOwnership` → `loadLivingDocsConfig`; tire
   `consumerVisible` de `ValidateResult` e do objeto devolvido. `src/cli/index.ts`:
   apague os ramos `drift` e `changelog` e os imports de `runDrift`/`runChangelog`;
   importe `OwnershipError` de `../config/ownership.ts` (o reexport); troque o
   `USAGE` por

```ts
const USAGE = `living-docs <comando>

  validate    Roda os checks da documentação viva sobre a árvore
  init        Cria a moldura de documentação viva (skill dona: living-docs-bootstrap)

Opções de init:
  --owner <@handle>   Dono padrão dos artefatos criados
  --stage <estágio>   Conjunto mínimo a instalar: solo (padrão), small-team, production ou multi-team
  --id-separator <s>  Separador do ID: "-" (padrão), "_", ".", ":" ou "" (vazio)
  --id-padding <n>    Dígitos do ID: 4 (padrão), entre 2 e 6
  --invoke <comando>  Como o CLI é chamado no CI de quem instala (padrão: npx living-docs)
  --marketplace <o/r>  Repositório do marketplace do plugin; sem ele os hooks não são registrados
  --dry-run           Mostra o que faria, sem escrever

Opções de validate:
  --base <ref>        Base do diff — liga os checks que leem o diff da branch

Dono, ciclo de vida, artefato gerado, vínculo código→doc e entrada de CHANGELOG
são verificados por \`ownership validate [--base <ref>]\`.
`
```

   e, no ramo `validate`, troque os três ponteiros (`generated`,
   `consumerVisible`, `watched`) por um só:

```ts
      // Ponteiro, não achado: artefato gerado e vínculo código→doc são do
      // núcleo agora, e ficar calado sobre isso seria fingir cobertura.
      if (result.generated > 0 || result.watched > 0) {
        process.stdout.write(
          `living-docs: ${result.generated} artefato(s) gerado(s) e ${result.watched} vínculo(s) código→doc declarado(s) — ` +
            'verificados por `ownership validate` (com `--base <ref>` para o diff).\n',
        )
      }
```

   A mensagem do `--base` vazio perde o `(CI-7)` do fim.

   Em `test/cli/validate.test.ts`, apague
   `'RF-0011: com --base, CI-7 cobra o doc dono do caminho vigiado que mudou'`
   (vai para o núcleo; ver o confronto).

7. `test/checks/budget.test.ts`: apague os imports e as chamadas de `runDrift` e
   `runChangelog`; o primeiro teste mede só `runValidate`, e o segundo afirma o
   `elapsedMs` só de `runValidate`. A contagem não muda.

8. `test/docs/release-history.test.ts`:
   - apague `'ADR-0006: as duas listas do mecanismo concordam, e um teste as impede de derivar'`
     (a segunda lista deixou de existir, §4);
   - reescreva `'RN-0013: este repositório declara o que é visível ao consumidor'`
     para afirmar que `config.watches.filter(w => w.consumerVisible)` não é vazio
     e cobre `bin/**` e `packages/living-docs/src/cli/**`;
   - troque o import de `unreleasedEntries` por uma função local no próprio
     arquivo de teste, com o mesmo corpo da função homônima de
     `packages/ownership/src/checks/consumer-change-logged.ts` (que não é
     exportada).

9. `test/contracts/drift.test.ts`: o primeiro teste deixa de usar `runDrift` e
   passa a rodar o check do núcleo contra o checkout:

```ts
import { coreChecks, resolveOwnership } from '@esliph/ownership'

test('RF-0006: o contrato gerado deste repositório não derivou — dogfooding com o gerador de verdade', () => {
  const config = resolveOwnership(ROOT)

  assert.ok(config !== null && config.generated.length >= 1, 'este repositório precisa declarar ao menos um artefato gerado')
  const drift = coreChecks().find(check => check.id === 'ownership/generated-drift')!
  const findings = drift.run({ root: ROOT, config, today: '2026-09-28' })

  assert.deepEqual(findings, [], JSON.stringify(findings, null, 2))
})
```

   O segundo teste passa a afirmar a fonte com
   `/src\/checks\/catalog\.ts/` **e** `/catálogo do núcleo/` (o cabeçalho novo do
   passo 3.13).

10. `test/checks/registry.test.ts`: tire `driftChecks`/`changelogChecks` do
    import e da lista `reais`; tire `'CI-5'` e `'CI-6'` do mapa de comandos; a
    regex de comando vira `/^living-docs validate$/`.

- [ ] **Passo 3.9: Hooks lendo a v2**

1. `hk1-append-only.ts`, `hk2-generated-artifact.ts`, `hk4-watch-reminder.ts`,
   `hk5-commit-guard.ts`, `hk6-session-inventory.ts`, `hk8-open-decision-guard.ts`:
   `loadOwnership` → `loadLivingDocsConfig`; `GeneratedRule` continua vindo de
   `../config/ownership.ts`. Em `hk6-session-inventory.ts:95`, a fonte citada
   passa a ser `` `fonte: \`${config.rootFile}\`` `` (o `config` já está em
   escopo; se não estiver, passe-o).

2. `src/config/watches.ts`: `OwnershipConfig` → `LivingDocsConfig`. O resto não
   muda — este arquivo sai na Tarefa 4, junto dos hooks que o usam.

3. Reescreva `findPromotion` em `src/hooks/hk3-state-promotion.ts` sobre
   `findTransitions` do núcleo (§5). Imports: tire `parseItemTable`,
   `parseItemSections`, `DocItem`, `DEFAULT_ID_FORMAT`, `IdFormat`; acrescente
   `import { findTransitions } from '@esliph/ownership'`; `loadOwnership` →
   `loadLivingDocsConfig`. O corpo:

```ts
/**
 * A primeira transição desta edição que exige gente. O pareamento antes/depois é
 * do núcleo (`findTransitions`); a lista de transições que exigem ato humano é
 * do living-docs, fixa, até `DA-0004` decidir como o núcleo a declara.
 */
function findPromotion(before: string, after: string, rule: ArtifactRule, repoPath: string): Promotion | null {
  for (const transition of findTransitions(before, after, rule.core, repoPath)) {
    if (!isHumanPromotion(transition.from, transition.to)) {
      continue
    }
    // Em per-file a chave do núcleo é o caminho; a mensagem nomeia o ID.
    const id = rule.collection === 'per-file' ? (statusOf(after)?.id ?? transition.key) : transition.key

    return { id, from: transition.from, to: transition.to }
  }

  return null
}
```

   e a chamada vira `findPromotion(current, next, rule, repoPath)`. `statusOf`
   fica (lê o `id` do frontmatter).

   Os testes de `test/hooks/hk3-state-promotion.test.ts` não mudam de asserção:
   só a fixture (passo 3.12). Se algum mudar de resultado, pare: é defeito do
   pareamento, não do teste.

- [ ] **Passo 3.10: `.ownership.yml` v2 na raiz e CODEOWNERS**

```bash
git mv docs/.ownership.yml .ownership.yml
```

Substitua o conteúdo de `.ownership.yml` por:

```yaml
# Dono, ciclo de vida e gatilho de cada caminho deste repositório. Hooks e
# checks não conhecem caminho nenhum: leem daqui. O núcleo (`ownership`) lê o
# esquema; o bloco `living-docs:` é do plugin de documentação viva, opaco ao
# núcleo. Regra de origem: ADR-0020, ADR-0028 e ADR-0029.
version: 2
plugins: [living-docs]

living-docs:
  stale-after-months: 6

owned:
  # --- Artefatos: entrada com `living-docs.id-prefix`. Família de IDs e ciclo de vida.
  - path: docs/decisions/adr/
    owner: '@esliph/engineering'
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]

  - path: docs/open-decisions.md
    owner: '@esliph/engineering'
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      # A tabela é lida por gente, em português; o check pergunta pelo nome
      # canônico. O mapeamento mora aqui porque é específico do projeto.
      field-map:
        resolved-by: 'Resolvida por'
        blocks: 'Bloqueia'
        gap: 'Lacuna'

  - path: docs/decisions/debt/
    owner: '@esliph/engineering'
    skill: decision-recorder
    states: [open, paid, accepted-permanently]
    living-docs:
      id-prefix: TDR
      append-only: true
      mutable-fields: [status, last-reviewed]

  - path: docs/requirements/functional.md
    owner: '@esliph/engineering'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs:
      id-prefix: RF
      cited-by: ['packages/living-docs/test/**', 'packages/ownership/test/**']

  - path: docs/requirements/non-functional.md
    owner: '@esliph/engineering'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs:
      id-prefix: RNF
      cited-by: ['packages/living-docs/test/**', 'packages/ownership/test/**']

  - path: docs/requirements/rules.md
    owner: '@esliph/engineering'
    skill: requirements-keeper
    states: [draft, active, revoked]
    format: { collection: sections, key: first-token }
    living-docs:
      id-prefix: RN
      cited-by: ['packages/living-docs/test/**', 'packages/living-docs/src/**', 'packages/ownership/test/**', 'packages/ownership/src/**']

  - path: docs/releases/
    owner: '@esliph/engineering'
    skill: release-historian
    states: [draft, published]
    living-docs:
      id-prefix: REL
      # Lida por quem consome: o texto não cita ID de artefato (ADR-0017).
      audience: external
      # Release note publicada é congelada: é por isso que REL tem família de
      # IDs e CHANGELOG.md não.
      append-only: true
      mutable-fields: [status, last-reviewed]

  # --- Documentos: bloco `living-docs:` sem `id-prefix` (ADR-0008, ADR-0029).
  # `role` é vocabulário fechado; `audience: external` marca o texto para quem
  # vem de fora, que não cita ID de artefato.
  - path: .ownership.yml
    owner: '@esliph/engineering'
    skill: living-docs-bootstrap
    living-docs: {}
  - path: docs/ids-retired.txt
    owner: '@esliph/engineering'
    skill: living-docs-bootstrap
    living-docs: {}
  - path: CONTRIBUTING.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    living-docs: {}
  - path: docs/definition-of-done.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    living-docs: { role: definition-of-done }
  - path: CLAUDE.md
    owner: '@esliph/engineering'
    skill: working-agreements-keeper
    living-docs: { role: agent-contract }
  - path: docs/glossary.md
    owner: '@esliph/engineering'
    skill: glossary-keeper
    living-docs: {}
  - path: docs/charter/
    owner: '@esliph/engineering'
    skill: charter-keeper
    living-docs: {}
  - path: docs/contracts/errors.md
    owner: '@esliph/engineering'
    skill: contract-keeper
    living-docs: {}
  - path: docs/contracts/versioning-policy.md
    owner: '@esliph/engineering'
    skill: contract-keeper
    living-docs: {}
  # Gerado: o guarda de gerado bloqueia editá-lo à mão, e
  # `ownership/generated-drift` compara com a saída do gerador.
  - path: docs/contracts/checks.gen.md
    owner: '@esliph/engineering'
    living-docs: {}
  - path: CHANGELOG.md
    owner: '@esliph/engineering'
    skill: release-historian
    living-docs: { audience: external }
  - path: docs/deprecations.md
    owner: '@esliph/engineering'
    skill: release-historian
    living-docs: { audience: external }
  - path: docs/migrations/
    owner: '@esliph/engineering'
    skill: release-historian
    living-docs: { audience: external }
  # Sem skill dona, e isso é informação: plano, spec e README têm dono e não têm
  # keeper. Ficam fora do corpus de duplicação do contrato do agente (ADR-0009).
  - path: docs/superpowers/
    owner: '@esliph/engineering'
    living-docs: {}
  - path: README.md
    owner: '@esliph/engineering'
    living-docs: { audience: external }

  # --- Só dono: fora da documentação viva. `ownership/owner-coverage` exige
  # dono para todo arquivo do repositório, não só para a documentação.
  - path: packages/living-docs/
    owner: '@esliph/engineering'
  - path: packages/ownership/
    owner: '@esliph/engineering'
  - path: bin/
    owner: '@esliph/engineering'
  - path: .github/
    owner: '@esliph/engineering'
  - path: .claude-plugin/
    owner: '@esliph/engineering'
  - path: CODEOWNERS
    owner: '@esliph/engineering'
  - path: package.json
    owner: '@esliph/engineering'
  - path: package-lock.json
    owner: '@esliph/engineering'
  - path: .gitattributes
    owner: '@esliph/engineering'
  - path: .gitignore
    owner: '@esliph/engineering'
  - path: .prettierignore
    owner: '@esliph/engineering'
  - path: .prettierrc
    owner: '@esliph/engineering'
  - path: .dockerignore
    owner: '@esliph/engineering'
  - path: Dockerfile
    owner: '@esliph/engineering'
  - path: compose.yaml
    owner: '@esliph/engineering'
  - path: eslint.config.mjs
    owner: '@esliph/engineering'

# O núcleo varre o sistema de arquivos, não o índice do git: o que existe só no
# checkout de quem roda (worktrees, estado local de sessão) fica de fora.
ignore:
  - 'node_modules/**'
  - '**/node_modules/**'
  - '.worktrees/**'
  - '.claude/**'
  - '.superpowers/**'

generated:
  # O comando IMPRIME o conteúdo esperado e não escreve arquivo nenhum: um check
  # que reescreve o que está checando apaga a evidência no mesmo instante em que
  # a reporta (ADR-0005).
  - path: docs/contracts/checks.gen.md
    command: node --conditions=development packages/living-docs/src/tools/gen-checks.ts

# Código → doc dono. O lembrete na edição, a pergunta no commit e a cobrança no
# diff do PR leem daqui. `consumer-visible: true` é a única lista de caminhos
# visíveis a quem consome (ADR-0020).
watches:
  - code: 'packages/living-docs/src/checks/**'
    doc: docs/requirements/rules.md
    reason: 'check é regra executável — a RN vem antes, e é ela que o check verifica'

  - code: 'packages/living-docs/src/checks/catalog.ts'
    doc: docs/contracts/checks.gen.md
    reason: 'o contrato público dos checks deriva do catálogo — regerar faz parte da mudança, e editar à mão é bloqueado. Skill dona: contract-keeper'

  - code: 'packages/living-docs/src/hooks/**'
    doc: docs/requirements/rules.md
    reason: 'hook bloqueia ou pergunta em nome de uma regra; sem RN citada, o bloqueio não tem origem'

  - code: 'packages/ownership/src/{checks,hooks}/**'
    doc: docs/requirements/rules.md
    reason: 'check e hook do núcleo são regra executável como os do living-docs'

  - code: 'packages/living-docs/src/cli/**'
    doc: docs/requirements/functional.md
    reason: 'o que o comando faz de observável é RF, não detalhe de implementação'

  - code: 'packages/living-docs/src/core/**'
    doc: docs/requirements/non-functional.md
    reason: 'as duas raízes são propriedade do sistema (ADR-0003), não comportamento de comando'

  - code: 'packages/living-docs/skills/**'
    doc: CONTRIBUTING.md
    reason: 'skill nova ou alterada muda como se trabalha aqui'

  - code: '.github/workflows/**'
    doc: docs/definition-of-done.md
    reason: "a última linha da Definition of Done nomeia o que o workflow roda — mudar o workflow muda o que 'pronto' significa"

  - code: '.github/workflows/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'o enforcement é literalmente o que o consumidor instala'

  - code: 'packages/living-docs/src/cli/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'subcomando, opção e código de saída são contrato público (docs/contracts/versioning-policy.md)'

  - code: 'packages/living-docs/src/checks/catalog.ts'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'os identificadores dos checks são públicos e não mudam de significado'

  - code: 'packages/living-docs/src/config/ownership.ts'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'o bloco living-docs do arquivo de ownership é contrato de quem instala'

  - code: 'packages/living-docs/{.claude-plugin,hooks,commands,skills,agents}/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'identificadores de skill, hook e comando são públicos'

  - code: 'packages/living-docs/templates/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'é o que `init` escreve no repositório de quem instala'

  - code: 'packages/ownership/src/cli/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'subcomando, opção e código de saída do núcleo são contrato público'

  - code: 'packages/ownership/{.claude-plugin,hooks}/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'o plugin do núcleo é o que quem instala recebe na sessão'

  - code: 'bin/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'o wrapper é um ponto de entrada público do toolkit — mudar como se invoca muda o que quem consome usa'
```

Reescreva o `CODEOWNERS`:

```
# Espelha o campo `owner` do .ownership.yml. Um caminho, um dono.

docs/decisions/adr/ @esliph/engineering
docs/open-decisions.md @esliph/engineering
docs/decisions/debt/ @esliph/engineering
docs/requirements/ @esliph/engineering
CONTRIBUTING.md @esliph/engineering
docs/definition-of-done.md @esliph/engineering
CLAUDE.md @esliph/engineering
docs/glossary.md @esliph/engineering
docs/charter/ @esliph/engineering
docs/contracts/ @esliph/engineering
CHANGELOG.md @esliph/engineering
docs/deprecations.md @esliph/engineering
docs/releases/ @esliph/engineering
docs/migrations/ @esliph/engineering
.ownership.yml @esliph/engineering
docs/ids-retired.txt @esliph/engineering
docs/superpowers/ @esliph/engineering
README.md @esliph/engineering
packages/living-docs/ @esliph/engineering
packages/ownership/ @esliph/engineering
bin/ @esliph/engineering
.github/ @esliph/engineering
.claude-plugin/ @esliph/engineering
CODEOWNERS @esliph/engineering
package.json @esliph/engineering
package-lock.json @esliph/engineering
.gitattributes @esliph/engineering
.gitignore @esliph/engineering
.prettierignore @esliph/engineering
.prettierrc @esliph/engineering
.dockerignore @esliph/engineering
Dockerfile @esliph/engineering
compose.yaml @esliph/engineering
eslint.config.mjs @esliph/engineering
```

Rode o primeiro `ownership validate` (§4: "a lista exata sai dele"):

```bash
node --conditions=development packages/ownership/src/cli/index.ts validate
```

Esperado: nenhum achado. Todo achado de `ownership/owner-coverage` aqui é um
arquivo versionado ou local que a lista acima esqueceu: acrescente a entrada (e
a linha do CODEOWNERS), ou o padrão em `ignore` se o arquivo não é versionado.
Achado de `ownership/declared-state` é item com estado fora de `states`: pare e
investigue, porque o `CI-1` o teria reportado antes.

- [ ] **Passo 3.11: O `init` semeia a v2**

`packages/living-docs/templates/ownership.yml` — substitua por:

```yaml
# Dono, ciclo de vida e gatilho de cada caminho deste repositório. Hooks e
# checks não conhecem caminho nenhum — leem daqui. O núcleo de ownership lê o
# esquema; o bloco `living-docs:` é da documentação viva.
version: 2
plugins: [living-docs]

living-docs:
  stale-after-months: 6
  # A forma escrita de um ID neste projeto. A identidade NÃO depende dela: o
  # mesmo prefixo com o mesmo número é o mesmo item, com ou sem separador e com
  # qualquer quantidade de zeros à esquerda. Mude isto para adotar um
  # repositório cujos IDs já se escrevem de outro jeito — nunca renumere o
  # repositório para caber no padrão.
  id-format:
    separator: "{{ID_SEPARATOR}}"
    padding: {{ID_PADDING}}

owned:
  # Artefato: entrada com `living-docs.id-prefix`. Família de IDs e ciclo de vida.
  - path: {{ADR_PATH}}
    owner: "{{OWNER}}"
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]

  - path: {{DA_PATH}}
    owner: "{{OWNER}}"
    skill: decision-recorder
    states: [open, resolved, dropped]
    format: { collection: table, key: ID, state-field: Status }
    living-docs:
      id-prefix: DA
      # A tabela é lida por gente, em português; o check pergunta pelo nome
      # canônico. O mapeamento mora aqui porque é específico do projeto.
      field-map:
        resolved-by: "Resolvida por"
        blocks: "Bloqueia"
        gap: "Lacuna"

  - path: {{TDR_PATH}}
    owner: "{{OWNER}}"
    skill: decision-recorder
    states: [open, paid, accepted-permanently]
    living-docs:
      id-prefix: TDR
      append-only: true
      mutable-fields: [status, last-reviewed]
{{REQUIREMENTS_BLOCK}}{{RELEASES_BLOCK}}
{{DOCUMENTS_BLOCK}}
  # O que o `init` cria e não é documentação: tem dono e não tem bloco.
  - path: CODEOWNERS
    owner: "{{OWNER}}"
  - path: .github/workflows/living-docs.yml
    owner: "{{OWNER}}"

# `ownership validate` exige dono para TODO arquivo do repositório, não só para
# a documentação. Declare o seu código em `owned` (sem bloco `living-docs:`) ou
# tire-o da governança aqui. O init não inventa esses caminhos. Exemplo:
#
# owned:
#   - path: src/
#     owner: "@time"
ignore: ["node_modules/**", "**/node_modules/**"]

generated: []
# Artefato gerado: é negado editar à mão, e `ownership validate` compara o
# arquivo versionado com a saída do gerador.
#
# O `command` IMPRIME o conteúdo esperado na saída padrão e NÃO escreve arquivo
# nenhum — um check que reescreve o que está checando apaga a evidência no mesmo
# instante em que a reporta. Gerador que só sabe escrever arquivo ganha um
# invólucro: gere num diretório temporário e imprima o resultado.
#
# O init não inventa gerador, pela mesma razão que não inventa `watches`.
# Declare o seu. Exemplo:
#
# generated:
#   - path: docs/contracts/openapi.gen.yaml
#     command: "node tools/gen-openapi.js"

# Código → doc dono: lembrado depois da edição, perguntado antes do commit e
# cobrado no diff do PR. Preencha com os caminhos do SEU código — o init não
# inventa vínculo, porque vínculo que ninguém reconhece ensina a ignorar o
# lembrete. A regra que aponta o CHANGELOG com `consumer-visible: true` diz quais
# caminhos são visíveis a quem consome. Exemplo:
#
# watches:
#   - code: "src/domain/**"
#     doc: docs/requirements/rules.md
#     reason: "comportamento novo exige regra com ID antes do código"
#   - code: "src/api/**"
#     doc: CHANGELOG.md
#     consumer-visible: true
#     reason: "mudança visível ao consumidor nasce com a entrada no mesmo PR"
watches: []
```

`packages/living-docs/templates/CODEOWNERS`: a primeira linha passa a citar
`.ownership.yml`, a linha `docs/.ownership.yml    {{OWNER}}` vira
`.ownership.yml    {{OWNER}}`, e entram, antes de `{{RETIRED_CODEOWNERS}}`,
`CODEOWNERS    {{OWNER}}` e `.github/workflows/living-docs.yml    {{OWNER}}`.

`packages/living-docs/templates/workflow.yml`: o nome do passo fixo passa a ser
`Documentação viva — estado da árvore`. Os passos de `drift` e `changelog` saem
de `workflowSteps` (abaixo); a Tarefa 4 põe no lugar os do núcleo.

`packages/living-docs/src/cli/init.ts`:

1. Imports: `loadLivingDocsConfig` e os tipos `Audience`, `DocumentRole`,
   `LivingDocsConfig` de `../config/ownership.ts`; `parseCodeowners` de
   `@esliph/ownership`. Some `OWNERSHIP_PATH`.
2. Acrescente, perto de `WORKFLOW_PATH`:

```ts
/** Onde o `init` escreve o arquivo de ownership: a raiz de quem instala. */
export const OWNERSHIP_FILE = '.ownership.yml'

/** Os candidatos que o núcleo lê, na ordem dele. Um só pode existir. */
const OWNERSHIP_CANDIDATES: readonly string[] = [OWNERSHIP_FILE, 'docs/.ownership.yml']
```

   e troque `OWNERSHIP_PATH` por `OWNERSHIP_FILE` em `BASE_DOCUMENTS`.
3. `documentEntry`:

```ts
function documentEntry(seed: DocumentSeed, owner: string): string {
  const lines = [`  - path: ${seed.path}`, `    owner: "${owner}"`]
  const block: string[] = []

  if (seed.skill !== null) {
    lines.push(`    skill: ${seed.skill}`)
  }
  if (seed.role !== null) {
    block.push(`role: ${seed.role}`)
  }
  if (seed.audience === 'external') {
    block.push('audience: external')
  }
  lines.push(`    living-docs: {${block.length === 0 ? '' : ` ${block.join(', ')} `}}`)

  return lines.join('\n')
}
```

4. `documentsBlock` devolve só os comentários e as entradas, sem a chave
   `documents:`:

```ts
function documentsBlock(root: string, owner: string, stage: Stage): string {
  const entries = documentSeeds(root, stage).map(seed => documentEntry(seed, owner))

  return [
    // Regra de origem: ADR-0008 e ADR-0029.
    '  # Documento: bloco `living-docs:` sem `id-prefix`. Tem dono e não tem família de IDs.',
    '  # `role` é vocabulário fechado: agent-contract, definition-of-done.',
    '  # `audience` diz quem lê: ausente é internal; external reprova ID de artefato no texto.',
    ...entries,
  ].join('\n')
}
```

5. `requirementsBlock`, para cada `kind`:

```ts
    return [
      `  - path: ${paths[kind]}`,
      `    owner: "${owner}"`,
      '    skill: requirements-keeper',
      '    states: [draft, active, revoked]',
      '    format: { collection: sections, key: first-token }',
      `    living-docs: { id-prefix: ${kind}, cited-by: [${citedBy}] }`,
    ].join('\n')
```

6. `releasesBlock`:

```ts
  return (
    '\n' +
    [
      `  - path: ${path}`,
      `    owner: "${owner}"`,
      '    skill: release-historian',
      '    states: [draft, published]',
      '    # A release note é lida por quem consome: o texto não cita ID de artefato.',
      // Regra de origem: spec §5, SK-7, regra 4.
      '    # Release note publicada é congelada.',
      '    living-docs: { id-prefix: REL, audience: external, append-only: true, mutable-fields: [status, last-reviewed] }',
    ].join('\n') +
    '\n'
  )
```

7. Em `runInit`, troque a leitura de `existing` por (Review Focus 1):

```ts
  // Um arquivo de ownership já existe? Então é dele que vêm os caminhos, e o
  // init não escreve outro ao lado: dois candidatos travam toda leitura por
  // ambiguidade. Arquivo que não lê na v2 é relatado, nunca sobrescrito.
  const existingFile = OWNERSHIP_CANDIDATES.find(candidate => existsSync(join(root, candidate))) ?? null
  let existing: LivingDocsConfig | null = null

  if (existingFile !== null) {
    try {
      existing = loadLivingDocsConfig(root)
    } catch (err) {
      result.notInstalled.push(
        `${existingFile} — o arquivo existe e não lê como v2 (${err instanceof Error ? err.message : String(err)}); ` +
          'reescreva-o na v2 à mão, guiado pelo CHANGELOG. O init não o sobrescreve nem cria outro ao lado',
      )
    }
  }
```

   e a escrita do arquivo por:

```ts
  if (existingFile === null) {
    writeIfAbsent(root, OWNERSHIP_FILE, template('ownership.yml', values), options, result)
  } else {
    result.skipped.push(existingFile)
  }
```

8. `declareArtifacts(root, options, result, block, what, file)` e
   `declareDocuments(root, options, result, existing)` passam a editar
   `existing.rootFile` (novo parâmetro `file` no primeiro, `existing.rootFile` no
   segundo) com uma âncora só, `\nowned:\n`: as entradas entram logo depois
   dela. Sem a âncora, o comportamento de hoje (relatar e não adivinhar).

```ts
const OWNED_ANCHOR = '\nowned:\n'

function insertAfterOwned(source: string, entries: string): string | null {
  return source.includes(OWNED_ANCHOR) ? source.replace(OWNED_ANCHOR, `${OWNED_ANCHOR}${entries.replace(/^\n+/, '').replace(/\n*$/, '\n')}`) : null
}
```

   Em `declareArtifacts`, `source.replace(anchor, …)` vira
   `insertAfterOwned(source, block)`, e a mensagem de âncora ausente passa a
   dizer "âncora `owned:` não encontrada". Em `declareDocuments`, os dois ramos
   de âncora viram um: `insertAfterOwned(source, entries)`, e a mensagem de
   âncora ausente perde o `(CI-7)`. `unmarkedExternal` e as mensagens que citam
   `OWNERSHIP_PATH` passam a citar `existing.rootFile` — receba-o como
   parâmetro onde a função não tem `existing`.
9. `workflowSteps`: apague os ramos `phases.includes(5)` e `phases.includes(6)`.

Os testes do `init` (`test/cli/init.test.ts`, `test/cli/init-enforcement.test.ts`,
`test/acceptance/consumer-repo.test.ts`, `test/acceptance/spec-criteria.test.ts`)
mudam de forma, não de intenção: onde afirmavam `artifacts:`/`documents:`/
`version: 1`/`docs/.ownership.yml`/`consumer-visible-paths`, passam a afirmar a
entrada v2 correspondente em `.ownership.yml`, e onde afirmavam os passos
`drift`/`changelog` do workflow, passam a afirmar que eles não estão lá.
Acrescente a `test/cli/init.test.ts` o teste do Review Focus 1:

```ts
test('arquivo de ownership v1 existente: o init não cria outro na raiz, e diz que ele precisa ser reescrito', () => {
  withTempRepo({ 'docs/.ownership.yml': 'version: 1\nartifacts: []\n' }, root => {
    const result = runInit(root, { owner: '@time', dryRun: false, stage: 'solo', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', marketplace: null })

    assert.equal(existsSync(join(root, '.ownership.yml')), false)
    assert.ok(result.skipped.includes('docs/.ownership.yml'))
    assert.ok(result.notInstalled.some(item => /docs\/\.ownership\.yml.*não lê como v2.*reescreva/.test(item)))
  })
})
```

   (importe `existsSync`, `join` e `DEFAULT_ID_FORMAT` se o arquivo ainda não
   os importar).

- [ ] **Passo 3.12: Reescrever as fixtures dos testes em v2**

Toda fixture v1 vira v2 à mão, pela tabela abaixo. Não escreva conversor.

| v1 | v2 |
| --- | --- |
| `version: 1` | `version: 2` e `plugins: [living-docs]` |
| `stale-after-months`, `id-format`, `last-reviewed-bump-limit` no topo | as mesmas chaves sob `living-docs:` no topo |
| `artifacts:` e `documents:` | uma lista só, `owned:` |
| `id-prefix`, `append-only`, `mutable-fields`, `cited-by`, `field-map`, `audience` do artefato | sob `living-docs:` da entrada |
| `role`, `audience` do documento | sob `living-docs:` da entrada; documento sem nenhum dos dois leva `living-docs: {}` |
| `path`, `owner`, `skill` | ficam na entrada |
| `states:` declarado | fica na entrada |
| `states` ausente num artefato | `states:` da tabela abaixo, pelo prefixo |
| `collection: table` | `format: { collection: table, key: ID, state-field: Status }` |
| `collection: sections` | `format: { collection: sections, key: first-token }` |
| `consumer-visible-paths: [...]` | some; a marca `consumer-visible: true` nas regras de `watches` já é a lista |
| caminho `docs/.ownership.yml` na fixture | `OWNERSHIP_FILE` (`.ownership.yml`), de `../helpers/ownership.ts` |
| `parseOwnership(yaml)` | `configFrom(yaml)`, ou `loadLivingDocsConfig(root)` dentro de `withTempRepo` |
| `loadOwnership(root)` | `loadLivingDocsConfig(root)` |
| `OWNERSHIP_PATH` | `OWNERSHIP_FILE` |

Estados por prefixo (a máquina que `statesFor` embutia):

| Prefixo | `states` |
| --- | --- |
| `ADR` | `[draft, accepted, superseded]` |
| `DA` | `[open, resolved, dropped]` |
| `TDR` | `[open, paid, accepted-permanently]` |
| `RF`, `RNF`, `RN` | `[draft, active, revoked]` |
| `REL` | `[draft, published]` |

Arquivos a reescrever (todos em `packages/living-docs/test/`):
`acceptance/consumer-repo.test.ts`, `acceptance/id-format.test.ts`,
`acceptance/spec-criteria.test.ts`, `checks/ci1-structure.test.ts`,
`checks/ci2-ids.test.ts`, `checks/ci3-traceability.test.ts`,
`checks/ci4-staleness.test.ts`, `checks/ci7-ownership-coverage.test.ts`,
`checks/ci8-links.test.ts`, `checks/ci9-commit-discipline.test.ts`,
`checks/ci10-trigger-routing.test.ts`, `checks/ci11-external-audience.test.ts`,
`cli/init.test.ts`, `cli/init-enforcement.test.ts`, `cli/validate.test.ts`,
`config/watches.test.ts`, `core/files.test.ts`, `distribution/internal-trail.test.ts`,
`distribution/plugin-cache.test.ts`, `docs/agent-contract.test.ts`,
`docs/blocked.test.ts`, `docs/collect.test.ts`, `docs/corpus.test.ts`,
`docs/maintenance.test.ts`, `docs/release-history.test.ts`, `docs/schema.test.ts`,
`helpers/checkout.ts` (só o comentário), `hooks/hk1-append-only.test.ts`,
`hooks/hk2-generated-artifact.test.ts`, `hooks/hk3-state-promotion.test.ts`,
`hooks/hk4-watch-reminder.test.ts`, `hooks/hk5-commit-guard.test.ts`,
`hooks/hk6-session-inventory.test.ts`, `hooks/hk8-open-decision-guard.test.ts`,
`plugin/manifest.test.ts`, `plugin/wrapper-docker.test.ts`,
`contracts/drift.test.ts`, `checks/budget.test.ts`, `checks/registry.test.ts`.

Casos especiais:

- `test/docs/maintenance.test.ts` e `test/cli/init.test.ts` importam
  `loadCodeowners`/`ownersOf`/`parseCodeowners` de `@esliph/ownership`.
- `test/plugin/manifest.test.ts`: em `SKILL_REFERENCES`, a entrada do checkout
  passa a ler `.ownership.yml`.
- `test/plugin/wrapper-docker.test.ts`, `'RNF-0006: …'`: renomeie para
  `'RNF-0006: .ownership.yml cobre bin/dev em watches, marcado visível ao consumidor'`;
  troque `loadOwnership(ROOT)` por `loadLivingDocsConfig(ROOT)` e as duas
  asserções sobre `config.consumerVisiblePaths` por
  `picomatch(config.watches.filter(w => w.consumerVisible).map(w => w.code))`.
- `test/distribution/plugin-cache.test.ts`: o `OWNERSHIP` da fixture vira v2,
  escrito em `.ownership.yml` do projeto (o `mkdirSync` de `docs/` sai).
- `test/acceptance/spec-criteria.test.ts`:
  - `'critério 6: HK-2 nega editar o contrato gerado, e CI-5 falha se passar por fora'`:
    a metade de `runDrift` passa a rodar
    `coreChecks().find(c => c.id === 'ownership/generated-drift')!` sobre
    `resolveOwnership(root)!` (como no passo 3.8, item 9). A metade do `HK-2`
    fica.
  - `'mecanismo da Fase 6: mudança visível ao consumidor é cobrada, e a razão escrita libera'`:
    `runChangelog` vira
    `diffChecks({ base, changed, messages }).find(c => c.id === 'ownership/consumer-change-logged')!`
    sobre `resolveOwnership(root)!`, com os mesmos `changed` e `messages` que o
    `GitRunner` do teste devolvia.
  - `'critério 5, metade 2: o CI sinaliza pelo \`watches\`, e a razão escrita libera'`:
    idem com `ownership/watch-satisfied`.
  - As demais só mudam de fixture.
  - Acrescente, logo depois de `'este repositório passa nos próprios checks'`
    (Review Focus 4):

```ts
test('este repositório passa nos checks do núcleo — inclusive com o que só existe no checkout local', () => {
  const root = checkoutRoot()
  const config = resolveOwnership(root)

  assert.ok(config !== null, 'o checkout declara o arquivo de ownership na raiz')
  const findings = coreChecks().flatMap(check => check.run({ root, config, today: '2026-09-28' }))

  assert.deepEqual(findings, [], JSON.stringify(findings, null, 2))
})
```

    com `import { coreChecks, diffChecks, resolveOwnership } from '@esliph/ownership'`
    no topo. O `coreChecks()` sem argumento usa o executor real, e roda o
    gerador de verdade — é o mesmo dogfooding do `contracts/drift.test.ts`.

Rode, depois de cada grupo de arquivos:

```bash
cd packages/living-docs && node --conditions=development --test <arquivos do grupo>; cd ../..
```

Um teste que muda de **resultado**, e não só de fixture, é defeito da adoção:
pare e investigue antes de tocar a asserção. As exceções previstas são só as
listadas nos passos 3.4, 3.5, 3.6 e 3.8.

- [ ] **Passo 3.13: Contrato gerado com os dois plugins**

`packages/living-docs/src/checks/catalog.ts`: apague as entradas `CI-5` e
`CI-6`, e troque o `failsWhen` de `CI-1` e de `CI-7` por:

```ts
    failsWhen:
      'Frontmatter ausente ou inválido; campo obrigatório vazio; `id` fora do formato ou do território do artefato; `status` num artefato sem `states` declarado; item de coleção sem `status`; `trigger` ausente ou descrevendo cadência; `last-reviewed` fora do formato ISO.',
```

```ts
    failsWhen:
      'Contrato do agente repetindo frase de artefato dono; item da Definition of Done sem verificação nomeada; e, com `--base <ref>`, caminho reivindicado por decisão aberta — liberado por `Docs: none — <razão>`.',
```

Atualize o comentário de cabeçalho do arquivo: o catálogo do núcleo mora em
`@esliph/ownership` (`CORE_CHECK_CATALOG`).

Substitua `packages/living-docs/src/tools/gen-checks.ts` a partir do
`import` por:

```ts
import { CORE_CHECK_CATALOG } from '@esliph/ownership'
import type { CatalogEntry } from '@esliph/ownership'
import { CHECK_CATALOG } from '../checks/catalog.ts'

const HEADER = `<!-- generated: do not edit -->
<!-- fonte: src/checks/catalog.ts (CHECK_CATALOG) e o catálogo do núcleo (CORE_CHECK_CATALOG) — regerar: rode este arquivo com node --conditions=development -->

# Contrato dos checks

Os identificadores abaixo são públicos e estáveis: aparecem na saída do CLI, são
citados pela Definition of Done de quem usa o toolkit, e não mudam de significado
(\`docs/contracts/versioning-policy.md\`). Cada regra roda num plugin só.
`

/** `|` numa célula quebraria a tabela — escapar é do gerador, não de quem escreve. */
function cell(value: string): string {
  return value.replaceAll('|', '\\|')
}

function section(plugin: string, catalog: readonly CatalogEntry[]): string {
  const rows = catalog.map(entry => `| ${cell(entry.id)} | ${cell(entry.name)} | ${cell(entry.failsWhen)} | \`${cell(entry.command)}\` |`)

  return [`## ${plugin}`, '', '| ID | Check | Falha quando | Comando |', '| --- | --- | --- | --- |', ...rows].join('\n')
}

process.stdout.write(`${HEADER}\n${section('living-docs', CHECK_CATALOG)}\n\n${section('ownership', CORE_CHECK_CATALOG)}\n`)
```

Mantenha o comentário de bloco do topo do arquivo, acrescentando que a saída
cobre os dois plugins. `CHECK_CATALOG` e `CORE_CHECK_CATALOG` têm a mesma forma
(`id`, `name`, `command`, `failsWhen`); se o `typecheck` reclamar do tipo do
living-docs, tipe `section` com `readonly { id: string; name: string; command: string; failsWhen: string }[]`.

Regere pela via sancionada (redirecionamento no Bash — o guarda de gerado nega
Edit/Write no arquivo, e isso é o esperado):

```bash
node --conditions=development packages/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md
git diff --stat docs/contracts/checks.gen.md
```

Esperado: sem `CI-5`/`CI-6`, com a seção `## ownership` de seis linhas.

- [ ] **Passo 3.14: Regra única (§8)**

Crie `packages/living-docs/test/distribution/single-rule.test.ts`. Os IDs
esperados do lado do living-docs são os de hoje; a Tarefa 5 os troca pelos
nomes.

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { coreChecks, diffChecks, resolveOwnership } from '@esliph/ownership'
import type { Finding as CoreFinding } from '@esliph/ownership'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { validateChecks } from '../../src/checks/registry.ts'
import type { Finding } from '../../src/core/types.ts'
import { OWNERSHIP_FILE } from '../helpers/ownership.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const TODAY = '2026-09-28'

function coreFindings(root: string, diff: { base: string; changed: string[]; messages: string[] }): CoreFinding[] {
  const config = resolveOwnership(root)!
  const context = { root, config, today: TODAY }

  return [...coreChecks(() => 'saída do gerador\n'), ...diffChecks(diff)].flatMap(check => check.run(context))
}

function livingDocsFindings(root: string, diff: { base: string; changed: string[]; messages: string[] }): Finding[] {
  const config = loadLivingDocsConfig(root)
  const context = { root, config, docs: collectArtifacts(root, config), documents: collectDocuments(root, config), today: TODAY }

  return validateChecks({ ...diff, edits: [] }).flatMap(check => check.run(context))
}

const BASE_OWNED = `version: 2
plugins: [living-docs]
owned:
  - path: docs/decisions/adr/
    owner: '@time'
    skill: decision-recorder
    states: [draft, accepted, superseded]
    living-docs: { id-prefix: ADR, append-only: true }
  - path: docs/definition-of-done.md
    owner: '@time'
    skill: working-agreements-keeper
    living-docs: { role: definition-of-done }
  - path: CHANGELOG.md
    owner: '@time'
    living-docs: { audience: external }
  - path: .ownership.yml
    owner: '@time'
    living-docs: {}
  - path: CODEOWNERS
    owner: '@time'
  - path: out.md
    owner: '@time'
`

const ADR_OK = "---\nid: ADR-0001\ntitle: Decisão\nstatus: draft\nowner: '@time'\ntrigger: Nunca.\nlast-reviewed: 2026-09-01\nrelates-to: []\n---\n\n# ADR-0001\n"

test('cada regra movida é reportada pelo núcleo, e o living-docs fica calado sobre ela', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `${BASE_OWNED}generated:
  - path: out.md
    command: gen
watches:
  - code: 'src/**'
    doc: CHANGELOG.md
    consumer-visible: true
`,
      CODEOWNERS: 'docs/ @time\nCHANGELOG.md @time\n.ownership.yml @time\nCODEOWNERS @time\nout.md @time\n',
      // declared-state: status fora de states; owner sem @.
      'docs/decisions/adr/ADR-0001-a.md': ADR_OK.replace('status: draft', 'status: aceito').replace("owner: '@time'", 'owner: time'),
      'docs/definition-of-done.md': "---\ntitle: DoD\nowner: '@time'\ntrigger: Quando muda o que é pronto.\nlast-reviewed: 2026-09-01\n---\n\n- [ ] Algo — verificação: humana.\n",
      'CHANGELOG.md': '# Changelog\n\n## [Unreleased]\n',
      // generated-drift: diverge da saída do gerador.
      'out.md': 'editado à mão\n',
      // owner-coverage: arquivo sem dono.
      'solto.txt': 'x\n',
      'src/a.ts': 'export {}\n',
    },
    root => {
      // watch-satisfied e consumer-change-logged: o diff toca src/ sem o CHANGELOG.
      const diff = { base: 'main', changed: ['src/a.ts'], messages: ['feat: x'] }
      const core = new Set(coreFindings(root, diff).map(finding => finding.ruleId))

      for (const rule of ['ownership/declared-state', 'ownership/generated-drift', 'ownership/owner-coverage', 'ownership/watch-satisfied', 'ownership/consumer-change-logged']) {
        assert.ok(core.has(rule), `${rule} deveria reportar a violação plantada`)
      }

      // O living-docs pode achar outras coisas nesta fixture (ela não é um
      // repositório exemplar); não pode achar nada onde as violações movidas
      // foram plantadas. As linhas 4 e 5 do ADR são `status` e `owner`.
      const living = livingDocsFindings(root, diff)
      const plantados = new Set(['out.md', 'solto.txt', 'src/a.ts', 'CHANGELOG.md'])

      assert.deepEqual(
        living.filter(finding => plantados.has(finding.file)),
        [],
        'o living-docs não pode reportar o que é do núcleo',
      )
      assert.deepEqual(
        living.filter(finding => finding.file === 'docs/decisions/adr/ADR-0001-a.md' && (finding.line === 4 || finding.line === 5)),
        [],
        'status fora de states e owner sem @ são do ownership/declared-state',
      )
    },
  )
})

test('cada regra que ficou é reportada pelo living-docs, e o núcleo fica calado sobre ela', () => {
  withTempRepo(
    {
      [OWNERSHIP_FILE]: `${BASE_OWNED}`,
      CODEOWNERS: 'docs/ @time\nCHANGELOG.md @time\n.ownership.yml @time\nCODEOWNERS @time\nout.md @time\n',
      'out.md': 'x\n',
      // frontmatter: trigger com cadência.
      'docs/decisions/adr/ADR-0001-a.md': ADR_OK.replace('trigger: Nunca.', 'trigger: Revisar mensalmente.'),
      // done-verifiable: item sem verificação nomeada.
      'docs/definition-of-done.md': "---\ntitle: DoD\nowner: '@time'\ntrigger: Quando muda o que é pronto.\nlast-reviewed: 2026-09-01\n---\n\n- [ ] Algo sem quem verifique.\n",
      // external-audience e links: ID de artefato e link quebrado em texto externo.
      'CHANGELOG.md': '# Changelog\n\nVeja ADR-0001 e [isto](nao-existe.md).\n',
    },
    root => {
      const diff = { base: 'main', changed: [], messages: [] }
      const living = new Set(livingDocsFindings(root, diff).map(finding => finding.ruleId))

      for (const rule of ['CI-1', 'CI-7', 'CI-8', 'CI-11']) {
        assert.ok(living.has(rule), `${rule} deveria reportar a violação plantada`)
      }
      assert.deepEqual(
        coreFindings(root, diff).map(finding => finding.ruleId),
        [],
        'o núcleo não pode reportar o que é do living-docs',
      )
    },
  )
})
```

A lista de regras que ficaram, no segundo teste, é a que uma fixture pequena
aciona sem git (`CI-1`, `CI-7`, `CI-8`, `CI-11`). `CI-2`, `CI-3`, `CI-4`,
`CI-9` e `CI-10` já têm, cada uma, teste próprio que prova que só ela reporta o
que planta; acrescentá-las aqui não prova nada novo sobre a divisão.

Rode:

```bash
cd packages/living-docs && node --conditions=development --test test/distribution/single-rule.test.ts; cd ../..
```

Esperado: passa. Se o primeiro teste acusar vazamento, o check do living-docs
que ainda reporta a regra movida é o que o passo 3.8 esqueceu de podar. Se o
segundo acusar achado do núcleo, a fixture tem um arquivo sem dono: corrija a
fixture, não o check.

- [ ] **Passo 3.15: Workflow deste repositório**

Substitua os passos de checagem de `.github/workflows/living-docs.yml` (tudo
depois de `Type-check`) por:

```yaml
      - name: Dono, ciclo de vida e artefato gerado
        run: node --conditions=development packages/ownership/src/cli/index.ts validate

      - name: Documentação viva — estado da árvore
        run: node --conditions=development packages/living-docs/src/cli/index.ts validate

      # O diff só existe com uma base. Em `push` não há base, e inventar uma
      # produziria achado sobre mudança que não é desta branch.
      - name: Vínculo código→doc e entrada de CHANGELOG no diff do PR
        if: github.event_name == 'pull_request'
        run: node --conditions=development packages/ownership/src/cli/index.ts validate --base ${{ github.event.pull_request.base.sha }}

      - name: Documentação viva no diff do PR
        if: github.event_name == 'pull_request'
        run: node --conditions=development packages/living-docs/src/cli/index.ts validate --base ${{ github.event.pull_request.base.sha }}
```

E o comentário do `fetch-depth` passa a dizer "a metade de diff compara
`<base>...HEAD`; um clone raso não tem a base".

- [ ] **Passo 3.16: Suíte inteira, validates, CHANGELOG, commit**

```bash
npm ci
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node --conditions=development packages/ownership/src/cli/index.ts validate
node --conditions=development packages/living-docs/src/cli/index.ts validate
git hash-object docs/contracts/checks.gen.md
```

Esperado:

- **Núcleo: 200** testes, 0 falhas.
- **Living-docs: 493** testes, 0 falhas, 1 `todo`. A conta, a partir dos 554 da
  Tarefa 2:

  | Movimento | Δ |
  | --- | --- |
  | `test/config/ownership.test.ts` reescrito (28 → 14) | −14 |
  | apagados: `ci5` (6), `ci6` (10), `cli/drift` (4), `cli/changelog` (4), `config/codeowners` (4), `docs/table` (6), `docs/sections` (6) | −40 |
  | `docs/schema.test.ts` (máquina embutida) | −3 |
  | `ci1-structure` (status fora de states) | −1 |
  | `ci7-ownership-coverage` (as metades movidas) | −6 |
  | `docs/release-history` (as duas listas) | −1 |
  | `cli/validate` (vínculo no diff) | −1 |
  | `docs/corpus` (`docsRoot`) | −1 |
  | `docs/collect` (Review Focus 3) | +2 |
  | `cli/init` (Review Focus 1) | +1 |
  | `acceptance/spec-criteria` (Review Focus 4) | +1 |
  | `distribution/single-rule` | +2 |
  | **Total** | **−61** |

  554 − 61 = **493**. Se o número medido for outro, cada diferença precisa de
  explicação escrita no commit; diferença sem explicação é defeito (§8).
- `ownership validate` e `living-docs validate` saem com 0.
- O hash de `checks.gen.md` mudou (de propósito: `CI-5`/`CI-6` saíram e a seção
  do núcleo entrou). Confira o conteúdo com `git diff`.

`CHANGELOG.md` (skill `release-historian`), sem ID de artefato:

- `Changed`: "o arquivo de ownership passa a morar na raiz (`.ownership.yml`) e
  a ser lido no esquema v2: uma lista `owned`, com o bloco `living-docs:` em cada
  entrada da documentação viva e no topo para a configuração global. O esquema v1
  não é lido, e não há comando de migração — reescreva o arquivo seguindo o
  `templates/ownership.yml`"; "`living-docs init` semeia a v2 na raiz, e não
  escreve um arquivo novo quando já existe um".
- `Removed`: "`living-docs drift` e `living-docs changelog`: a deriva de
  artefato gerado e a entrada de CHANGELOG passam a ser verificadas por
  `ownership validate` (`--base <ref>` para o diff)"; "`consumer-visible-paths`:
  a marca `consumer-visible: true` nas regras de `watches` é a lista".
- `Changed`: "`living-docs validate` deixa de verificar o dono de cada
  documento, o CODEOWNERS, o vínculo de `watches`, o `owner` do frontmatter e o
  `status` fora dos estados declarados — tudo isso é de `ownership validate`".

```bash
git add -A packages .ownership.yml docs/.ownership.yml CODEOWNERS .github docs/contracts/checks.gen.md CHANGELOG.md
git status --short
git commit -m "$(cat <<'EOF'
feat(ADR-0029): living-docs lê a v2 pelo núcleo e entrega a ele as regras dele

O .ownership.yml vai para a raiz em v2. src/config/ownership.ts vira o
adaptador do bloco living-docs sobre resolveOwnership. Saem do living-docs
CI-5, CI-6, drift, changelog, a parte de CI-1 e de CI-7 que o núcleo já
tem, e os parsers de item. HK-3 pareia pelo findTransitions. Os casos que
o núcleo não cobria foram portados antes da remoção.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Tarefa 4: Plugins, hooks e CI

Os hooks do living-docs que o núcleo assume saem **no mesmo commit** em que o
plugin `ownership` passa a ser instalável (§8, item 4): nenhum commit fica sem
os guardas.

**Files:**
- Modify: `.claude-plugin/marketplace.json`, `packages/living-docs/.claude-plugin/plugin.json`, `packages/living-docs/hooks/hooks.json`
- Delete: `packages/living-docs/src/hooks/hk2-generated-artifact.ts`, `hk4-watch-reminder.ts`, `hk5-commit-guard.ts`, `packages/living-docs/src/config/watches.ts`, e os testes `test/hooks/hk2-generated-artifact.test.ts`, `test/hooks/hk4-watch-reminder.test.ts`, `test/hooks/hk5-commit-guard.test.ts`, `test/config/watches.test.ts`
- Create: `packages/ownership/test/distribution/plugin-cache.test.ts`
- Modify: `packages/living-docs/test/plugin/manifest.test.ts`, `packages/living-docs/test/acceptance/spec-criteria.test.ts`, `packages/living-docs/test/distribution/plugin-cache.test.ts`
- Modify: `packages/living-docs/src/cli/index.ts`, `packages/living-docs/src/cli/init.ts`, `packages/living-docs/templates/workflow.yml`, `packages/living-docs/src/config/claude-settings.ts`, `packages/living-docs/test/cli/init-enforcement.test.ts`, `packages/living-docs/test/config/claude-settings.test.ts`
- Modify (skill `release-historian`): `CHANGELOG.md`

**Interfaces:**
- Produz: `InitOptions.invokeOwnership: string` (padrão `'npx ownership'`) e o
  placeholder `{{INVOKE_OWNERSHIP}}` no template do workflow.
- Produz: `CORE_PLUGIN_REF = 'ownership@living-docs'` em
  `src/config/claude-settings.ts` (o sufixo é o `MARKETPLACE_NAME` que já existe).
- O `hooks.json` do living-docs fica com cinco hooks: `hk1-append-only`,
  `hk3-state-promotion`, `hk8-open-decision-guard` (PreToolUse `Edit|Write`),
  `hk7-shortcut-debt` (PostToolUse `Edit|Write`), `hk6-session-inventory`
  (SessionStart). O grupo PreToolUse `Bash` some.
- `src/git/staged.ts` fica (§5: `git/` fica de propósito), mesmo sem o `HK-5`.

- [ ] **Passo 4.1: Teste de hooks sem sobreposição (vermelho)**

Em `packages/living-docs/test/plugin/manifest.test.ts`:

1. No teste `'hooks.json registra os oito hooks…'`, renomeie para
   `'hooks.json registra os cinco hooks do living-docs nos eventos e matchers da spec §7'`
   e troque `esperado` por:

```ts
  const esperado: Record<string, string[]> = {
    'PreToolUse:Edit|Write': ['hk1-append-only', 'hk3-state-promotion', 'hk8-open-decision-guard'],
    'PostToolUse:Edit|Write': ['hk7-shortcut-debt'],
    // SessionStart não tem matcher: o evento não é de ferramenta (spec §7).
    SessionStart: ['hk6-session-inventory'],
  }
```

2. Em `'todo hook referenciado existe no repositório'`, `assert.equal(vistos, 8, …)`
   vira `assert.equal(vistos, 5, 'a varredura deveria ver os cinco hooks')`.

3. Acrescente:

```ts
function hookNames(pluginRoot: string): string[] {
  const config = JSON.parse(readFileSync(join(pluginRoot, 'hooks/hooks.json'), 'utf8')) as { hooks: Record<string, { hooks: { command: string }[] }[]> }

  return Object.values(config.hooks).flatMap(grupos => grupos.flatMap(grupo => grupo.hooks.map(hook => hook.command.trim().split(/\s+/).pop()?.replace(/"/g, '') ?? '')))
}

test('os dois plugins não registram hook em comum — cada guarda roda num plugin só', () => {
  const living = hookNames(ROOT)
  const core = hookNames(join(ROOT, '..', 'ownership'))

  assert.ok(core.length >= 3, 'a varredura deveria ver os hooks do núcleo')
  assert.deepEqual(
    living.filter(name => core.includes(name)),
    [],
  )
  for (const assumido of ['generated', 'watch-reminder', 'commit-guard']) {
    assert.ok(!living.some(name => name.includes(assumido)), `o living-docs não pode mais registrar o hook de ${assumido}: é do núcleo`)
  }
})

test('o living-docs declara o plugin ownership como dependência, e o marketplace publica os dois', () => {
  const manifest = readJson('.claude-plugin/plugin.json')
  const marketplace = JSON.parse(readFileSync(join(CHECKOUT, '.claude-plugin/marketplace.json'), 'utf8')) as { plugins: { name: string; source: string; version: string }[] }
  const core = JSON.parse(readFileSync(join(ROOT, '..', 'ownership', '.claude-plugin/plugin.json'), 'utf8')) as { version: string }

  assert.deepEqual(manifest.dependencies, ['ownership'])
  assert.deepEqual(
    marketplace.plugins.map(plugin => plugin.name).sort(),
    ['living-docs', 'ownership'],
  )
  const entry = marketplace.plugins.find(plugin => plugin.name === 'ownership')!

  assert.equal(entry.source, './packages/ownership')
  assert.equal(entry.version, core.version)
})
```

Rode `cd packages/living-docs && npm test -- --test-name-pattern="hooks|dependência"; cd ../..`:
os quatro falham.

- [ ] **Passo 4.2: Manifestos e marketplace**

`.claude-plugin/marketplace.json`, em `plugins`, depois do `living-docs`:

```json
    {
      "name": "ownership",
      "description": "Dono, ciclo de vida e gatilho de cada caminho: o núcleo que a documentação viva usa, e que roda sozinho.",
      "version": "0.1.0",
      "source": "./packages/ownership"
    }
```

e a descrição do `living-docs` passa a dizer "cinco hooks" no lugar de "oito
hooks".

`packages/living-docs/.claude-plugin/plugin.json`: acrescente
`"dependencies": ["ownership"]`.

`packages/living-docs/hooks/hooks.json`: apague as entradas de
`hk2-generated-artifact`, `hk4-watch-reminder` e o grupo PreToolUse `Bash`
inteiro (só tinha `hk5-commit-guard`).

- [ ] **Passo 4.3: Apagar os hooks assumidos**

Antes de apagar, confira cada caso contra a tabela "Confronto dos testes
removidos" (os portes já entraram na Tarefa 3).

```bash
git rm packages/living-docs/src/hooks/hk2-generated-artifact.ts packages/living-docs/src/hooks/hk4-watch-reminder.ts packages/living-docs/src/hooks/hk5-commit-guard.ts packages/living-docs/src/config/watches.ts
git rm packages/living-docs/test/hooks/hk2-generated-artifact.test.ts packages/living-docs/test/hooks/hk4-watch-reminder.test.ts packages/living-docs/test/hooks/hk5-commit-guard.test.ts packages/living-docs/test/config/watches.test.ts
git grep -n "hk2-generated-artifact\|hk4-watch-reminder\|hk5-commit-guard\|config/watches" -- packages/living-docs
```

Esperado no último comando: só `test/acceptance/spec-criteria.test.ts`
(passo 4.4) e `test/distribution/plugin-cache.test.ts` (passo 4.5).

- [ ] **Passo 4.4: Critérios de aceite sem os hooks assumidos**

Em `packages/living-docs/test/acceptance/spec-criteria.test.ts`:

- apague os imports de `decideHk2`, `decideHk4`, `decideHk5`;
- apague `'critério 5: alterar caminho vigiado sem tocar o doc dono é lembrado e perguntado'`
  (inteiro de hook; o núcleo prova o lembrete e a pergunta em
  `watch-reminder.test.ts` e `commit-guard.test.ts`, ver o confronto);
- em `'critério 6: …'`, apague a metade do `HK-2` e renomeie para
  `'critério 6: o contrato gerado editado por fora reprova no núcleo'`.

- [ ] **Passo 4.5: Cache dos dois plugins**

Em `packages/living-docs/test/distribution/plugin-cache.test.ts`, o hook do
controle passa a ser `hk1-append-only` (o `hk4` não existe mais), com o
payload `{ tool_name: 'Edit', tool_input: { file_path: 'docs/decisions/adr/ADR-0001.md' } }`.
O controle continua afirmando silêncio e `exit 0`.

Crie `packages/ownership/test/distribution/plugin-cache.test.ts`, espelho do
original do living-docs, que aqui **passa de verdade** (§6):

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'

/**
 * Simulação do cache do marketplace: o Claude Code copia só o diretório do
 * plugin, instala dependências a partir do lockfile que está nele e roda os
 * hooks de lá. O núcleo não depende de pacote irmão nenhum, e por isso
 * funciona sozinho no cache.
 */
const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')

const OWNERSHIP = [
  'version: 2',
  'owned:',
  '  - path: docs/requirements/rules.md',
  "    owner: '@time'",
  'watches:',
  "  - code: 'src/domain/**'",
  '    doc: docs/requirements/rules.md',
  "    reason: 'comportamento novo exige regra antes do código'",
  '',
].join('\n')

const PAYLOAD = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: 'src/domain/reembolso.ts' } })

/** No Windows, o `bash` do PATH pode ser o do WSL; o Claude Code usa o do Git for Windows. */
function bashExecutable(): string | null {
  if (process.platform !== 'win32') {
    return 'bash'
  }
  const candidate = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe')

  return existsSync(candidate) ? candidate : null
}

function copyVersioned(to: string): number {
  const files = execFileSync('git', ['ls-files', '-z', '--', '.'], { cwd: PACKAGE_ROOT, encoding: 'utf8' })
    .split('\0')
    .filter(file => file !== '')

  for (const file of files) {
    mkdirSync(dirname(join(to, file)), { recursive: true })
    copyFileSync(join(PACKAGE_ROOT, file), join(to, file))
  }

  return files.length
}

function runHook(bash: string, cache: string, project: string): { status: number | null; stdout: string; stderr: string } {
  const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_PROJECT_DIR: project }

  delete env.OWNERSHIP_REPO_ROOT
  delete env.NODE_OPTIONS

  const script = join(cache, 'hooks', 'run-hook.sh').split(sep).join('/')
  const run = spawnSync(bash, [script, 'watch-reminder'], { cwd: project, env, input: PAYLOAD, encoding: 'utf8' })

  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}

test('o wrapper de hooks do núcleo chega a quem instala como executável', () => {
  const entry = execFileSync('git', ['ls-files', '-s', '--', 'hooks/run-hook.sh'], { cwd: PACKAGE_ROOT, encoding: 'utf8' })

  assert.equal(entry.split(/\s+/)[0], '100755')
})

test('copiado sozinho para o cache, o plugin do núcleo instala e o hook responde de lá', { timeout: 180_000 }, t => {
  const bash = bashExecutable()

  if (bash === null) {
    t.skip('sem o bash do Git for Windows: o CI (ubuntu) roda esta prova')

    return
  }

  const cache = mkdtempSync(join(tmpdir(), 'ownership-cache-'))
  const project = mkdtempSync(join(tmpdir(), 'ownership-projeto-'))

  try {
    assert.ok(copyVersioned(cache) > 30, 'cópia vazia demais: o cache não recebeu o plugin')
    assert.equal(existsSync(join(cache, 'node_modules')), false)
    writeFileSync(join(project, '.ownership.yml'), OWNERSHIP, 'utf8')

    // Controle: sem dependências o hook quebra e, por contrato, se cala.
    const semDependencias = runHook(bash, cache, project)

    assert.equal(semDependencias.status, 0, 'falha aberta: exit 0 mesmo quebrado')
    assert.equal(semDependencias.stdout.trim(), '', 'sem node_modules o hook deveria se calar')

    const install = spawnSync('npm', ['ci', '--ignore-scripts'], { cwd: cache, encoding: 'utf8', shell: true })

    assert.equal(install.status, 0, install.stderr)

    const run = runHook(bash, cache, project)

    assert.equal(run.status, 0, run.stderr)
    assert.notEqual(run.stdout.trim(), '', 'saída vazia é o que um hook quebrado também produz: não é sucesso')

    const output = JSON.parse(run.stdout) as { hookSpecificOutput: { hookEventName: string; additionalContext: string } }

    assert.equal(output.hookSpecificOutput.hookEventName, 'PostToolUse')
    assert.match(output.hookSpecificOutput.additionalContext, /docs\/requirements\/rules\.md/)
  } finally {
    rmSync(cache, { recursive: true, force: true })
    rmSync(project, { recursive: true, force: true })
  }
})
```

`--ignore-scripts` no `npm ci`: o `prepack` do núcleo compila `dist/`, e o cache
roda `.ts` direto — nenhum script de ciclo de vida é necessário. Se a saída do
hook do núcleo tiver outra forma que não `hookSpecificOutput.additionalContext`,
leia `packages/ownership/src/hooks/lib/io.ts` e ajuste a asserção à forma real;
o que o teste prova é que o hook respondeu do cache.

Rode `cd packages/ownership && node --test test/distribution/plugin-cache.test.ts; cd ../..`:
passa (no Windows sem o bash do Git, o segundo é `skip`).

- [ ] **Passo 4.6: `init` com as duas CLIs e o registro do núcleo**

1. `packages/living-docs/templates/workflow.yml`: antes do passo fixo do
   living-docs, acrescente

```yaml
      - name: Dono, ciclo de vida e artefato gerado
        run: {{INVOKE_OWNERSHIP}} validate

```

   e o comentário de cabeçalho passa a dizer que `--invoke` e
   `--invoke-ownership` escolhem como cada CLI é chamada.

2. `src/cli/init.ts`: `InitOptions` ganha

```ts
  /** Como o CLI do núcleo é chamado no CI de quem instala. Padrão `npx ownership` (TDR-0003). */
  invokeOwnership: string
```

   `values` ganha `INVOKE_OWNERSHIP: options.invokeOwnership`, e
   `workflowSteps(stage, invoke)` vira `workflowSteps(stage, invoke, invokeOwnership)`,
   com o ramo da fase 6 de volta, agora sobre o núcleo:

```ts
  if (phases.includes(6)) {
    steps.push(
      [
        '',
        '      - name: Vínculo código→doc e entrada de CHANGELOG no diff do PR',
        "        if: github.event_name == 'pull_request'",
        `        run: ${invokeOwnership} validate --base \${{ github.event.pull_request.base.sha }}`,
      ].join('\n'),
    )
  }
```

   O ramo da fase 7 (`${invoke} validate --base …`) fica, com o nome
   `Documentação viva no diff do PR`.

3. `src/cli/index.ts`: logo depois do bloco de `--invoke`,

```ts
      const invokeOwnershipIndex = argv.indexOf('--invoke-ownership')
      const invokeOwnership = invokeOwnershipIndex === -1 ? 'npx ownership' : (argv[invokeOwnershipIndex + 1] ?? '')

      if (invokeOwnership.trim() === '') {
        process.stderr.write('living-docs: `--invoke-ownership` precisa do comando que roda o CLI do núcleo no seu CI — ele não se adivinha.\n')

        return 2
      }
```

   passe `invokeOwnership` a `runInit`, e acrescente ao `USAGE`, depois de
   `--invoke`:
   `  --invoke-ownership <comando>  Como o CLI do núcleo é chamado no CI (padrão: npx ownership)`.

   Todo `runInit(root, { … })` dos testes ganha `invokeOwnership: 'npx ownership'`.

4. `src/config/claude-settings.ts`:

```ts
/** O plugin do núcleo: o living-docs depende dele, e os guardas de dono moram lá. */
export const CORE_PLUGIN_REF = `ownership@${MARKETPLACE_NAME}`
```

   e, em `mergeSettings`, depois do bloco de `PLUGIN_REF`, o mesmo bloco para
   `CORE_PLUGIN_REF`.

5. Testes, em `test/cli/init-enforcement.test.ts`:

```ts
test('RF-0013: o workflow semeado roda as duas CLIs, cada uma pelo seu comando de invocação', () => {
  withTempRepo({}, root => {
    runInit(root, { owner: '@time', dryRun: false, stage: 'production', idFormat: DEFAULT_ID_FORMAT, invoke: 'npx living-docs', invokeOwnership: 'pnpm ownership', marketplace: null })
    const workflow = readFileSync(join(root, WORKFLOW_PATH), 'utf8')

    assert.match(workflow, /run: pnpm ownership validate\n/)
    assert.match(workflow, /run: pnpm ownership validate --base /)
    assert.match(workflow, /run: npx living-docs validate\n/)
    assert.doesNotMatch(workflow, /drift|changelog/)
  })
})
```

   (importe o que faltar), e em `test/config/claude-settings.test.ts`, no teste
   que afirma o que `mergeSettings` acrescenta num arquivo vazio, acrescente a
   asserção de `enabledPlugins["ownership@living-docs"] === true`.

- [ ] **Passo 4.7: Habilitar o plugin do núcleo na sessão (humano)**

Nenhum arquivo versionado deste repositório habilita plugin (`.claude/` não é
versionado). Peça à pessoa para habilitar `ownership@esliph` ao lado de
`living-docs@esliph` nas configurações do Claude Code dela, antes do commit
deste passo — é o que mantém os guardas de gerado, lembrete e commit ativos
quando os hooks do living-docs saem. Não siga sem a confirmação.

- [ ] **Passo 4.8: Suíte, validates, CHANGELOG, commit**

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail|skipped)"
npm run typecheck
node --conditions=development packages/ownership/src/cli/index.ts validate
node --conditions=development packages/living-docs/src/cli/index.ts validate
```

Esperado:

- **Núcleo: 202** (200 + os dois de cache), 0 falhas.
- **Living-docs: 459**, 0 falhas, 1 `todo`: 493 − 10 (`hk2`) − 7 (`hk4`) − 10
  (`hk5`) − 9 (`config/watches`) − 1 (critério 5) + 2 (manifesto) + 1
  (workflow com as duas CLIs). O `claude-settings.test.ts` ganha asserção, não
  teste.

`CHANGELOG.md`, sem ID:

- `Added`: "plugin `ownership` no marketplace: dono, ciclo de vida, artefato
  gerado e vínculo código→doc, com os próprios hooks"; "`living-docs init
  --invoke-ownership <comando>`: como o CLI do núcleo é chamado no workflow
  instalado (padrão `npx ownership`, que só funciona depois da publicação do
  núcleo no npm)".
- `Changed`: "o plugin `living-docs` passa a depender do plugin `ownership`, e
  deixa de registrar os hooks de artefato gerado, de lembrete de caminho vigiado
  e de guarda de commit — eles moram no `ownership`"; "o workflow instalado roda
  `ownership validate` e `living-docs validate`, e, em PR, os dois com `--base`";
  "`living-docs init --marketplace` habilita os dois plugins".

```bash
git add -A packages .claude-plugin CHANGELOG.md
git commit -m "$(cat <<'EOF'
feat(ADR-0030): hooks do núcleo no plugin ownership, e o living-docs depende dele

O marketplace publica o plugin ownership. O living-docs declara a
dependência e deixa de registrar HK-2, HK-4 e HK-5 no mesmo commit. O init
semeia as duas CLIs, com --invoke-ownership. O plugin do núcleo prova que
responde do cache.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Tarefa 5: Renomeação

Mecânica (§7): mesmos achados, só o identificador muda. A única parte que não é
substituição de texto é a divisão do resto do `CI-7` em três checks.

**Files:**
- Move (`git mv`), em `packages/living-docs/`:

  | De | Para |
  | --- | --- |
  | `src/checks/ci1-structure.ts` | `src/checks/frontmatter.ts` |
  | `src/checks/ci2-ids.ts` | `src/checks/id-integrity.ts` |
  | `src/checks/ci3-traceability.ts` | `src/checks/citation-coverage.ts` |
  | `src/checks/ci4-staleness.ts` | `src/checks/staleness.ts` |
  | `src/checks/ci7-ownership-coverage.ts` | `src/checks/agent-contract-duplication.ts` |
  | `src/checks/ci8-links.ts` | `src/checks/links.ts` |
  | `src/checks/ci9-commit-discipline.ts` | `src/checks/commit-discipline.ts` |
  | `src/checks/ci10-trigger-routing.ts` | `src/checks/trigger-routing.ts` |
  | `src/checks/ci11-external-audience.ts` | `src/checks/external-audience.ts` |
  | `src/hooks/hk1-append-only.ts` | `src/hooks/append-only.ts` |
  | `src/hooks/hk3-state-promotion.ts` | `src/hooks/state-promotion.ts` |
  | `src/hooks/hk6-session-inventory.ts` | `src/hooks/session-inventory.ts` |
  | `src/hooks/hk7-shortcut-debt.ts` | `src/hooks/shortcut-debt.ts` |
  | `src/hooks/hk8-open-decision-guard.ts` | `src/hooks/open-decision-guard.ts` |

  e o `.test.ts` de cada um, de `test/checks/` e `test/hooks/`, do mesmo jeito.
- Create: `src/checks/done-verifiable.ts`, `src/checks/open-decision-claim.ts`, `test/checks/done-verifiable.test.ts`, `test/checks/open-decision-claim.test.ts`
- Modify: todo arquivo versionado de `packages/living-docs/` que cite os nomes antigos (o passo 5.2 os acha)
- Modify: `docs/contracts/checks.gen.md` (regenerado)
- Modify (skill `release-historian`): `CHANGELOG.md`

**Interfaces:**
- Mapa de identificadores (a fonte de verdade desta tarefa e do CHANGELOG):

  | Antigo | Novo | Export |
  | --- | --- | --- |
  | `CI-1` | `living-docs/frontmatter` | `livingDocsFrontmatter` |
  | `CI-2` | `living-docs/id-integrity` | `livingDocsIdIntegrity` |
  | `CI-3` | `living-docs/citation-coverage` | `livingDocsCitationCoverage` |
  | `CI-4` | `living-docs/staleness` | `livingDocsStaleness` |
  | `CI-7` (contrato) | `living-docs/agent-contract-duplication` | `livingDocsAgentContractDuplication` |
  | `CI-7` (DoD) | `living-docs/done-verifiable` | `livingDocsDoneVerifiable` |
  | `CI-7` (decisão aberta) | `living-docs/open-decision-claim` | `livingDocsOpenDecisionClaim(diff)` |
  | `CI-8` | `living-docs/links` | `livingDocsLinks` |
  | `CI-9` | `living-docs/commit-discipline` | `livingDocsCommitDiscipline(facts)` |
  | `CI-10` | `living-docs/trigger-routing` | `livingDocsTriggerRouting()` |
  | `CI-11` | `living-docs/external-audience` | `livingDocsExternalAudience` |
  | `HK-1` | `living-docs/append-only` | `decideAppendOnly` |
  | `HK-3` | `living-docs/state-promotion` | `decideStatePromotion` |
  | `HK-6` | `living-docs/session-inventory` | `decideSessionInventory` |
  | `HK-7` | `living-docs/shortcut-debt` | `decideShortcutDebt` |
  | `HK-8` | `living-docs/open-decision-guard` | `decideOpenDecisionGuard` |
  | `CI-5` | `ownership/generated-drift` | — (núcleo) |
  | `CI-6` | `ownership/consumer-change-logged` | — (núcleo) |
  | `HK-2` | `ownership/generated-guard` | — (núcleo) |
  | `HK-4` | `ownership/watch-reminder` | — (núcleo) |
  | `HK-5` | `ownership/commit-guard` | — (núcleo) |

  Os tipos de decisão seguem o export: `Hk1Decision` → `AppendOnlyDecision`,
  `Hk3Decision` → `StatePromotionDecision`, `Hk6Decision` →
  `SessionInventoryDecision`, `Hk7Decision` → `ShortcutDebtDecision`,
  `Hk8Decision` → `OpenDecisionGuardDecision`.
- `validateChecks(diff)` devolve, nesta ordem: frontmatter, id-integrity,
  citation-coverage, staleness, agent-contract-duplication, done-verifiable,
  open-decision-claim(diff), links, commit-discipline(diff), trigger-routing(),
  external-audience.

- [ ] **Passo 5.1: Mover os arquivos**

```bash
cd packages/living-docs
for pair in \
  "checks/ci1-structure:checks/frontmatter" "checks/ci2-ids:checks/id-integrity" \
  "checks/ci3-traceability:checks/citation-coverage" "checks/ci4-staleness:checks/staleness" \
  "checks/ci7-ownership-coverage:checks/agent-contract-duplication" "checks/ci8-links:checks/links" \
  "checks/ci9-commit-discipline:checks/commit-discipline" "checks/ci10-trigger-routing:checks/trigger-routing" \
  "checks/ci11-external-audience:checks/external-audience" "hooks/hk1-append-only:hooks/append-only" \
  "hooks/hk3-state-promotion:hooks/state-promotion" "hooks/hk6-session-inventory:hooks/session-inventory" \
  "hooks/hk7-shortcut-debt:hooks/shortcut-debt" "hooks/hk8-open-decision-guard:hooks/open-decision-guard"; do
  from="${pair%%:*}"; to="${pair##*:}"
  git mv "src/$from.ts" "src/$to.ts"
  git mv "test/$from.test.ts" "test/$to.test.ts"
done
cd ../..
```

- [ ] **Passo 5.2: Substituir os identificadores**

Os padrões mais longos primeiro, para que `CI-1` não coma `CI-10`. Só em
arquivos versionados de `packages/living-docs/` (o registro histórico em
`docs/` não muda, §7; os documentos vivos são da Tarefa 6):

```bash
FILES=$(git ls-files packages/living-docs | grep -v 'package-lock.json$')
sed -i -E \
  -e 's#\bci10-trigger-routing\b#trigger-routing#g; s#\bci11-external-audience\b#external-audience#g' \
  -e 's#\bci1-structure\b#frontmatter#g; s#\bci2-ids\b#id-integrity#g; s#\bci3-traceability\b#citation-coverage#g' \
  -e 's#\bci4-staleness\b#staleness#g; s#\bci8-links\b#links#g; s#\bci9-commit-discipline\b#commit-discipline#g' \
  -e 's#\bhk1-append-only\b#append-only#g; s#\bhk3-state-promotion\b#state-promotion#g; s#\bhk6-session-inventory\b#session-inventory#g' \
  -e 's#\bhk7-shortcut-debt\b#shortcut-debt#g; s#\bhk8-open-decision-guard\b#open-decision-guard#g' \
  -e 's#\bci10TriggerRouting\b#livingDocsTriggerRouting#g; s#\bci11ExternalAudience\b#livingDocsExternalAudience#g' \
  -e 's#\bci1Structure\b#livingDocsFrontmatter#g; s#\bci2Ids\b#livingDocsIdIntegrity#g; s#\bci3Traceability\b#livingDocsCitationCoverage#g' \
  -e 's#\bci4Staleness\b#livingDocsStaleness#g; s#\bci8Links\b#livingDocsLinks#g; s#\bci9CommitDiscipline\b#livingDocsCommitDiscipline#g' \
  -e 's#\bdecideHk1\b#decideAppendOnly#g; s#\bdecideHk3\b#decideStatePromotion#g; s#\bdecideHk6\b#decideSessionInventory#g' \
  -e 's#\bdecideHk7\b#decideShortcutDebt#g; s#\bdecideHk8\b#decideOpenDecisionGuard#g' \
  -e 's#\bHk1Decision\b#AppendOnlyDecision#g; s#\bHk3Decision\b#StatePromotionDecision#g; s#\bHk6Decision\b#SessionInventoryDecision#g' \
  -e 's#\bHk7Decision\b#ShortcutDebtDecision#g; s#\bHk8Decision\b#OpenDecisionGuardDecision#g' \
  -e 's#\bCI-10\b#living-docs/trigger-routing#g; s#\bCI-11\b#living-docs/external-audience#g' \
  -e 's#\bCI-1\b#living-docs/frontmatter#g; s#\bCI-2\b#living-docs/id-integrity#g; s#\bCI-3\b#living-docs/citation-coverage#g' \
  -e 's#\bCI-4\b#living-docs/staleness#g; s#\bCI-8\b#living-docs/links#g; s#\bCI-9\b#living-docs/commit-discipline#g' \
  -e 's#\bCI-5\b#ownership/generated-drift#g; s#\bCI-6\b#ownership/consumer-change-logged#g' \
  -e 's#\bHK-1\b#living-docs/append-only#g; s#\bHK-2\b#ownership/generated-guard#g; s#\bHK-3\b#living-docs/state-promotion#g' \
  -e 's#\bHK-4\b#ownership/watch-reminder#g; s#\bHK-5\b#ownership/commit-guard#g; s#\bHK-6\b#living-docs/session-inventory#g' \
  -e 's#\bHK-7\b#living-docs/shortcut-debt#g; s#\bHK-8\b#living-docs/open-decision-guard#g' \
  $FILES
git grep -n "\bCI-[0-9]\+\b\|\bHK-[0-9]\+\b\|ci7OwnershipCoverage\|ci7-ownership-coverage" -- packages/living-docs
```

Esperado no último comando: só as ocorrências de `CI-7` (e de
`ci7OwnershipCoverage`), que o passo 5.3 resolve à mão, e as do vocabulário da
Definition of Done em `agent-contract-duplication.ts` (a regex `(?:CI|HK|AG|SK)-\d+`
não tem dígito literal e não é tocada).

Leia o diff de uma skill e de um comando antes de seguir: `sed` em prosa pode
produzir frase estranha ("o `living-docs/links` reprova…"). Frase estranha em
texto entregue se reescreve à mão, ou deixa de citar regra (§7).

- [ ] **Passo 5.3: Partir o `CI-7` em três**

Em `src/checks/agent-contract-duplication.ts` (o antigo `ci7`):

1. Crie `src/checks/done-verifiable.ts` com `DOD_ITEM`, `VERIFICATION`,
   `dodItemsWithoutVerification` (movidos daqui) e:

```ts
const RULE = 'living-docs/done-verifiable'

/**
 * `living-docs/done-verifiable` — item de Definition of Done sem verificação
 * nomeada (`RN-0017`). Um dos três pedaços do antigo check de cobertura de
 * propriedade: nomes separados porque "falhou o check sete" nunca disse qual
 * parte falhou (§7 da spec de 2026-09-18).
 */
export const livingDocsDoneVerifiable: Check = {
  id: RULE,
  name: 'done verifiable',
  run(context: CheckContext): Finding[] {
    // o bloco "4 — item de Definition of Done sem verificação nomeada", movido
    // como está, com `error()` local usando RULE
  },
}
```

   O corpo do `run` é o bloco "4" do check antigo, copiado sem mudança, com
   `const findings: Finding[] = []` antes e `return findings` depois. A
   função `error` e `normalizePath` são copiadas também (são duas linhas
   cada; não compartilhe módulo por causa delas).

2. Crie `src/checks/open-decision-claim.ts` com `docsExceptionReason` (movido
   daqui) e:

```ts
const RULE = 'living-docs/open-decision-claim'

/**
 * `living-docs/open-decision-claim` — o diff toca caminho reivindicado por
 * decisão aberta (`RN-0026`). Só roda com o diff (`ADR-0010`), e o rótulo
 * `Docs: none — <razão>` o libera.
 */
export function livingDocsOpenDecisionClaim(diff: DiffFacts | null = null): Check {
  return {
    id: RULE,
    name: 'open decision claim',
    run(context: CheckContext): Finding[] {
      // o bloco do diff do check antigo (`if (diff !== null && docsExceptionReason(…) === null)`
      // com o laço de `claimsFor`), movido como está
    },
  }
}
```

   Mesma regra: o corpo é o bloco do diff do check antigo, copiado sem mudança.

3. O que sobra em `agent-contract-duplication.ts` é o bloco "3" (contrato
   repetindo artefato dono), `WORD_FLOOR`, `Duplication`, `duplicatedSentences`,
   exportado como `export const livingDocsAgentContractDuplication: Check` com
   `id: 'living-docs/agent-contract-duplication'` e
   `name: 'agent contract duplication'`. Deixa de ser função com `diff`.

4. `src/checks/registry.ts`: os três no lugar do antigo, na ordem da seção
   "Interfaces".

5. `src/checks/catalog.ts`: a entrada `CI-7` (o `sed` não a toca, de
   propósito) vira três:

```ts
  {
    id: 'living-docs/agent-contract-duplication',
    name: 'agent contract duplication',
    command: 'living-docs validate',
    failsWhen: 'O contrato do agente repete, palavra por palavra, uma frase de artefato ou documento com skill dona, acima do piso de palavras do toolkit.',
  },
  {
    id: 'living-docs/done-verifiable',
    name: 'done verifiable',
    command: 'living-docs validate',
    failsWhen: 'Item da Definition of Done não nomeia o que o verifica — um identificador de check ou de hook, ou a marca de verificação humana.',
  },
  {
    id: 'living-docs/open-decision-claim',
    name: 'open decision claim',
    command: 'living-docs validate --base <ref>',
    failsWhen: 'O diff entre a base e `HEAD` toca caminho reivindicado por uma decisão aberta, sem `Docs: none — <razão>` em alguma mensagem de commit.',
  },
```

   Mantenha o catálogo ordenado por ID (o teste `'o catálogo é lido por gente:
   fica ordenado por ID'` cobra).

6. A regex `VERIFICATION` de `done-verifiable.ts` passa a aceitar os nomes, sem
   deixar de aceitar os numerados — a Definition of Done deste repositório só
   muda na Tarefa 6:

```ts
/**
 * Vocabulário de verificação de um item de Definition of Done (`RN-0017`): o
 * identificador de um check ou hook (`plugin/nome`), o de agente ou skill, ou a
 * palavra que marca verificação humana — em português ou em inglês. Os
 * numerados `CI-n`/`HK-n` saem na Tarefa 6 do plano de 2026-09-28, junto da
 * Definition of Done que ainda os cita.
 */
const VERIFICATION = /\b(?:CI|HK|AG|SK)-\d+\b|\b(?:living-docs|ownership)\/[a-z]+(?:-[a-z]+)*\b|\bhumana?\b|\bhuman\b/i
```

7. Parta `test/checks/agent-contract-duplication.test.ts` (o antigo teste do
   `ci7`) do mesmo jeito: os testes de DoD (`RN-0017: …`,
   `dodItemsWithoutVerification …`) vão para `test/checks/done-verifiable.test.ts`;
   os de decisão aberta (`RN-0026: …`) e o `'ADR-0010: rótulo sem razão não é
   exceção'` vão para `test/checks/open-decision-claim.test.ts`; os de
   duplicação ficam. Cada um importa o check novo, e a asserção de `ruleId`
   passa ao nome do check dele. O teste `'repositório sem nenhuma das três
   classes passa'` fica em `agent-contract-duplication.test.ts`, rodando os
   três checks.

- [ ] **Passo 5.4: Ver o verde e regenerar o contrato**

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node --conditions=development packages/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md
git diff docs/contracts/checks.gen.md
node --conditions=development packages/ownership/src/cli/index.ts validate
node --conditions=development packages/living-docs/src/cli/index.ts validate
```

Esperado: a **mesma contagem** da Tarefa 4 nos dois pacotes (a renomeação não
cria nem apaga teste; a divisão do `ci7` só troca testes de arquivo), 0 falhas.
O `checks.gen.md` muda de hash de propósito: confira que cada linha é a antiga
com o ID trocado, e que as três linhas do antigo `CI-7` somam o `failsWhen`
dele. Os dois `validate` saem com 0.

Um teste que muda de **resultado** aqui é defeito: a renomeação não muda achado.

`CHANGELOG.md`, `Changed`, sem ID de artefato: "os checks e hooks do
`living-docs` passam a ser identificados por nome (`living-docs/frontmatter`, …)
em vez de número; o mapa completo está na entrada de renomeação desta versão".
(O mapa é escrito na Tarefa 6.)

```bash
git add -A packages docs/contracts/checks.gen.md CHANGELOG.md
git commit -m "$(cat <<'EOF'
refactor(ADR-0026): checks e hooks do living-docs passam a ter nome

CI-n e HK-n viram living-docs/nome; o resto de CI-7 vira três checks
(agent-contract-duplication, done-verifiable, open-decision-claim). Mesmos
achados, com o identificador trocado.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

---

### Tarefa 6: Documentos vivos

Cada documento passa pela skill dona (§7). Nenhum ADR, spec ou plano antigo é
editado.

**Files:**
- Modify (`working-agreements-keeper`): `CLAUDE.md`, `CONTRIBUTING.md`, `docs/definition-of-done.md`
- Modify (`glossary-keeper`): `docs/glossary.md`
- Modify (`requirements-keeper`): `docs/requirements/*.md`, onde o texto cita `CI-n`/`HK-n`
- Modify (`contract-keeper`): `docs/contracts/errors.md`, `docs/contracts/versioning-policy.md`, se citarem `CI-n`/`HK-n`
- Modify (`living-docs-bootstrap`): `.ownership.yml` (só comentários que citem `CI-n`/`HK-n`)
- Modify: `README.md`
- Modify (`release-historian`): `CHANGELOG.md`
- Modify: `packages/living-docs/src/checks/done-verifiable.ts` (a regex), `packages/living-docs/test/checks/done-verifiable.test.ts`

- [ ] **Passo 6.1: Achar o que cita os nomes antigos**

```bash
git grep -n "\bCI-[0-9]\+\b\|\bHK-[0-9]\+\b\|docs/\.ownership\.yml\|living-docs drift\|living-docs changelog\|consumer-visible-paths" -- \
  CLAUDE.md CONTRIBUTING.md README.md CHANGELOG.md .ownership.yml docs/definition-of-done.md docs/glossary.md docs/contracts docs/charter docs/requirements docs/deprecations.md docs/migrations
```

Cada linha vai para a skill dona do arquivo (a de `.ownership.yml`), com o mapa
da Tarefa 5. As linhas de `CHANGELOG.md` que são entradas antigas ficam como
estão: o CHANGELOG é registro, e a entrada nova (passo 6.3) é que explica.

- [ ] **Passo 6.2: O que cada documento passa a dizer**

- `CLAUDE.md`: cada `HK-n`/`CI-n` pelo nome novo (`HK-1` →
  `living-docs/append-only`, `HK-2` → `ownership/generated-guard`, `HK-3` →
  `living-docs/state-promotion`, `HK-4` → `ownership/watch-reminder`, `HK-5` →
  `ownership/commit-guard`, `CI-5` → `ownership/generated-drift`, `CI-6` →
  `ownership/consumer-change-logged`, `CI-7` na linha "Todo documento tem dono
  declarado" → `ownership/owner-coverage`, `CI-11` →
  `living-docs/external-audience`); `docs/.ownership.yml` → `.ownership.yml`; a
  seção "Comandos" continua sem `drift`/`changelog` (nunca os citou).
- `docs/definition-of-done.md`: cada item nomeia o check ou hook novo que o
  verifica, e a última linha lista o que o workflow roda:
  `ownership validate [--base <ref>]` e `living-docs validate [--base <ref>]`
  (em vez de `drift` e `changelog`). O item "Todo documento novo foi declarado…"
  passa a citar `.ownership.yml` e `ownership/owner-coverage`.
- `CONTRIBUTING.md`: os comandos de verificação local (os dois `validate`, com
  `--conditions=development`) e os nomes novos onde cita regra.
- `docs/glossary.md`: **Artefato** é a entrada de `owned` com
  `living-docs.id-prefix`; **Documento** é a entrada com bloco `living-docs:` e
  sem `id-prefix` (§7). Nenhum dos dois é mais definido pela lista em que mora.
- `README.md`: a tabela de comandos perde `drift` e `changelog` e ganha
  `node --conditions=development packages/ownership/src/cli/index.ts validate [--base <ref>]`;
  `docs/.ownership.yml` → `.ownership.yml`; sem ID de artefato (é
  `audience: external`).
- Requisitos: o texto que cita `CI-n`/`HK-n` passa ao nome, pela
  `requirements-keeper` (§7). Estado não muda aqui.

- [ ] **Passo 6.3: O mapa no CHANGELOG**

Peça à `release-historian`, em `## [Unreleased]`, `Changed`, uma entrada de
renomeação com o mapa completo antigo → novo (as 21 linhas da tabela
"Interfaces" da Tarefa 5, sem a coluna de export), e a frase: "quem cita um
destes identificadores na própria Definition of Done precisa trocá-lo pelo nome
novo — o número não é mais reconhecido como verificação". `CI-n` e `HK-n` não
são ID de artefato, e o check de audiência externa não os cobra (§7).

- [ ] **Passo 6.4: A Definition of Done deixa de aceitar número**

Com a Definition of Done já nos nomes novos, a regex de
`packages/living-docs/src/checks/done-verifiable.ts` perde `CI|HK`:

```ts
const VERIFICATION = /\b(?:AG|SK)-\d+\b|\b(?:living-docs|ownership)\/[a-z]+(?:-[a-z]+)*\b|\bhumana?\b|\bhuman\b/i
```

e o comentário perde a frase sobre a Tarefa 6. Em
`test/checks/done-verifiable.test.ts`, no teste
`'dodItemsWithoutVerification aceita ID de check, de hook e a marca humana'`,
acrescente a asserção de que `'- [ ] Algo — verificação: \`CI-3\`.'` é item
sem verificação (sem alias de nome antigo, §1).

- [ ] **Passo 6.5: Verificação final e commit**

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "^ℹ (tests|pass|fail|todo)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node --conditions=development packages/ownership/src/cli/index.ts validate
node --conditions=development packages/living-docs/src/cli/index.ts validate
git grep -n "\bCI-[0-9]\+\b\|\bHK-[0-9]\+\b" -- CLAUDE.md CONTRIBUTING.md README.md docs/definition-of-done.md docs/glossary.md docs/requirements docs/contracts packages
```

Esperado: as contagens da Tarefa 5, 0 falhas; os dois `validate` saem com 0; o
`git grep` não acha nada (o `CHANGELOG.md` e o registro histórico ficam fora da
busca de propósito).

```bash
git add CLAUDE.md CONTRIBUTING.md README.md CHANGELOG.md .ownership.yml docs packages/living-docs
git commit -m "$(cat <<'EOF'
docs(ADR-0026): documentos vivos com os nomes novos e o mapa no CHANGELOG

CLAUDE.md, CONTRIBUTING.md, Definition of Done, glossário, README e
requisitos passam aos nomes; o CHANGELOG leva o mapa antigo → novo. A
Definition of Done deixa de aceitar CI-n/HK-n como verificação.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
EOF
)"
```

A descrição do PR leva a tabela "Confronto dos testes removidos" abaixo,
preenchida com o que de fato aconteceu (§8).

---

## Confronto dos testes removidos

Cada caso apagado do living-docs e onde ele passa a ser provado. "Portar" são
os testes do passo 3.7. Nenhuma linha fica sem destino.

### Tarefa 3

| Caso removido (living-docs) | Destino |
| --- | --- |
| `ci5`: arquivo igual não é achado | núcleo `generated-drift`: "igual, sem achado" |
| `ci5`: diferença aponta a primeira linha | núcleo `generated-drift`: "divergência … com a linha certa" |
| `ci5`: CR e quebra final não são deriva | **portar** → `generated-drift`: "CR do checkout e quebra final a mais não são deriva" |
| `ci5`: gerador que falha é erro | núcleo `generated-drift`: "gerador que falha é achado" |
| `ci5`: artefato ausente é erro | núcleo `generated-drift`: "artefato ausente é achado" |
| `ci5`: `firstDifferentLine` devolve 0 sem divergência | núcleo `generated-drift`: "igual, sem achado" (o 0 é o que o check lê como igual) |
| `ci6`: a entrada precisa viajar no mesmo diff | núcleo `consumer-change-logged`: "o changelog não veio junto" |
| `ci6`: entrada no diff e Unreleased preenchido aprova | núcleo: "changelog veio junto com item em Unreleased" |
| `ci6`: Unreleased vazio não conta | núcleo: "changelog veio junto mas sem item em Unreleased" |
| `ci6`: rótulo com razão libera; sem razão, não | núcleo: "Changelog: none — razão libera" + `exception-label`: "rótulo sem razão não conta" |
| `ci6`: caminho fora do gatilho não dispara | núcleo: "cada doc visível só é cobrado pelos caminhos da própria regra" |
| `ci6`: gatilho vazio se cala | núcleo: "sem watches consumer-visible, nenhum achado" |
| `ci6`: gatilho sem doc marcado é erro de configuração | **deixa de existir**: não há segunda lista (§4, `ADR-0020`) |
| `ci6`: doc alvo ausente é achado | **portar** → `consumer-change-logged`: "doc declarado, no diff e ausente…" |
| `ci6`: `unreleasedEntries` lê `-` e `*` | **portar** → `consumer-change-logged`: "item em Unreleased escrito com * conta" |
| `ci6`: `exceptionReason` aceita separadores | **portar** → `exception-label`: "aceita travessão, meia-risca, hífen e dois-pontos" |
| `cli/drift`: sem gerado declarado, sai 0 | núcleo `generated-drift`: "sem generated declarado, nenhum achado" |
| `cli/drift`: deriva leva a exit 1 | núcleo `cli/validate`: "com achado de erro, exitCode 1" |
| `cli/drift`: validate conta o que deixou para o drift | **deixa de existir**: o ponteiro novo do `living-docs validate` aponta o `ownership validate` (passo 3.8, item 6) |
| `cli/drift`: `.ownership.yml` ausente propaga erro | núcleo `cli/validate`: "sem arquivo de ownership, installed: false" (o núcleo trata ausência como "nada a validar", e o living-docs continua lançando — `test/cli/validate.test.ts`) |
| `cli/changelog`: reprova sem a entrada | núcleo `consumer-change-logged` (idem acima) |
| `cli/changelog`: com a entrada, sai 0 | núcleo `consumer-change-logged` |
| `cli/changelog`: sem gatilho, nada a checar | núcleo: "sem watches consumer-visible" |
| `cli/changelog`: base que não resolve vira `GitError` | **portar** → `exec`: "changedPaths com base que não resolve lança GitError" e `cli/validate`: "base que não resolve: sai com 2…" |
| `config/codeowners` (4 casos) | **portar** → `core/codeowners.test.ts`, os quatro como estão |
| `config/ownership` (28 casos do parser v1) | o novo `config/ownership.test.ts` (passo 3.2) para o bloco `living-docs:`; o parser do núcleo (`schema/parse.test.ts`) para `version`, `owner` com `@`, `skill` vazia, `collection`. Ao apagar, confira caso a caso; regra sem destino volta como teste do adaptador |
| `docs/table`: extrai id, status e linha | núcleo `schema/item`: "parseItemsTable lê pela coluna nomeada" |
| `docs/table`: para ao fim da tabela | **portar** → `item`: "para de ler na primeira linha que não é da tabela" |
| `docs/table`: sem colunas ID e Status, lista vazia | **muda de comportamento** (Review Focus 3): sem `Status` há itens sem estado → `collect.test`: "tabela de coleção sem coluna Status…" |
| `docs/table`: ignora linha cuja chave não é ID | `collect.test`: a linha `nota` da mesma fixture (o filtro é do living-docs) |
| `docs/table`: o item traz todas as colunas | **portar** → `item`: "traz todas as colunas no item" |
| `docs/table`: forma escrita do projeto (`RN-0024`) | `acceptance/id-format.test.ts` (o filtro de forma é do living-docs) |
| `docs/sections`: lê id, título, status, campos | núcleo `item`: "keyMode first-token: primeiro token é a chave" |
| `docs/sections`: linha deslocada por `startLine` | **portar** → `item`: "a linha é deslocada por startLine…" |
| `docs/sections`: seção sem status, status vazio | **portar** → o mesmo teste acima |
| `docs/sections`: título sem ID é ignorado | `collect.test`: "requisito em título ###…" (o `## Contexto` da fixture) |
| `docs/sections`: exemplo em bloco de código | núcleo `item`: "parseItemsSections pula bloco de código cercado" |
| `docs/sections`: forma escrita do projeto | `acceptance/id-format.test.ts` |
| `docs/schema`: máquina de estados codificada (2 casos) e `statesFor` | **deixa de existir** no código: `config/ownership.test.ts`, "este repositório … declara states de toda família" |
| `ci1`: status fora da máquina | núcleo `declared-state`: "per-file: status fora dos states declarados" |
| `ci1`: owner sem `@` (metade) | núcleo `declared-state`: "per-file: owner do frontmatter sem @" (Tarefa 1) |
| `ci1`: item com status fora da máquina (metade) | núcleo `declared-state`: "table/sections: item com status fora dos states" |
| `ci7`: documento sem entrada, nomeado | núcleo `owner-coverage`: "arquivo sem regra em owned[] é achado" |
| `ci7`: CODEOWNERS ausente, um achado só | núcleo `owner-coverage`: "CODEOWNERS ausente é achado" |
| `ci7`: `watches` com doc inexistente ou sem dono | núcleo `owner-coverage`: "watches com doc inexistente ou sem regra" |
| `ci7`: diff com vigiado sem o doc reprova | núcleo `watch-satisfied`: "diff toca o código vigiado sem o doc dono" |
| `ci7`: com o doc, ou com a razão, passa | núcleo `watch-satisfied`: "diff traz os dois" e "Docs: none — razão … libera" |
| `ci7`: sem diff, a metade do diff não roda | núcleo `cli/validate`: "sem --base, os checks de diff não rodam" |
| `release-history`: as duas listas concordam | **deixa de existir** (§4) |
| `cli/validate`: com `--base`, o vínculo vigiado | núcleo `watch-satisfied` (idem) |
| `docs/corpus`: `docsRoot` deriva do arquivo | **deixa de existir**: o corpus é o que as entradas declaram (passo 3.6) |

### Tarefa 4

| Caso removido (living-docs) | Destino |
| --- | --- |
| `hk2`: nega editar gerado declarado | núcleo `generated-guard`: "caminho declarado em generated[] é negado" |
| `hk2`: nega criar gerado que ainda não existe | núcleo: "… mesmo se o arquivo ainda não existe" |
| `hk2`: o marcador vale sozinho | núcleo: "arquivo com o marcador na primeira linha é negado" |
| `hk2`: marcador só na primeira linha | **portado** na Tarefa 3 → "o marcador só conta na primeira linha…" |
| `hk2`: marcador na linha ~20 é permitido | **portado** → o mesmo teste |
| `hk2`: caminho comum passa | núcleo: "arquivo comum é permitido" |
| `hk2`: configuração ilegível permite | núcleo: "sem .ownership.yml, falha aberta" |
| `hk2`: payload sem `file_path` | **portado** → "payload sem file_path permite" |
| `hk2`: `file_path` absoluto do host | **portado** → "file_path absoluto do host sob a raiz…" |
| `hk2`: diretório em `generated[]` não cobre | **portado** → "generated[] exige caminho exato…" |
| `hk4`: lembra com motivo e skill | **portado** → "o lembrete nomeia o doc, o motivo e a skill dona…" |
| `hk4`: lembra e não bloqueia | **portado** → o mesmo teste (sem `permissionDecision`) |
| `hk4`: doc sem skill ainda é lembrado | **portado** → "doc dono sem skill declarada ainda é lembrado" |
| `hk4`: editar o próprio doc não lembra | núcleo `watch-reminder`: "editar o próprio doc dono não lembra dele mesmo" |
| `hk4`: fora de `watches`, silêncio | núcleo: "caminho não vigiado, silêncio" |
| `hk4`: sem configuração, silêncio | núcleo: "sem arquivo de ownership, o hook se cala" |
| `hk4`: payload sem `file_path` | **portado** → "payload sem file_path é silêncio" |
| `hk5`: pergunta e lista os pendentes | núcleo `commit-guard`: "staged toca vigiado sem o doc: pergunta" |
| `hk5`: staged com o doc passa | núcleo: "staged traz os dois: allow" |
| `hk5`: pergunta, nunca nega | núcleo: o tipo `CommitGuardDecision` não tem `deny` (checado pelo `typecheck`) |
| `hk5`: a mensagem ensina as duas saídas | **portado** → "a mensagem ensina as duas saídas legítimas…" |
| `hk5`: comando que não é commit não consulta o git | **portado** → "comando que não é git commit passa sem consultar o git" |
| `hk5`: `git commit` em cadeia e com opções | núcleo: os dois testes de `isGitCommit` |
| `hk5`: git indisponível passa | núcleo: "git runner falha (sem git): falha aberta" |
| `hk5`: sem `.ownership.yml` passa | núcleo: "sem arquivo de ownership, o hook se cala" |
| `hk5`: índice vazio passa | **portado** → "índice vazio passa" |
| `hk5`: `tool_name` diferente de Bash | núcleo: "não é Bash, allow" |
| `config/watches` (9 casos) | núcleo `triggers/watches.test.ts` (agrupa por doc, `consumerVisible`, doc sem owned, `coversDoc`, `pendingDocs`); "caminho em formato de host é normalizado" e "sem `watches`, nada é exigido" — confira no arquivo do núcleo ao apagar, e porte se faltar |
| `spec-criteria`: critério 5 (lembrado e perguntado) | núcleo `watch-reminder` e `commit-guard` (linhas acima) |
| `spec-criteria`: critério 6, metade do `HK-2` | núcleo `generated-guard`: "caminho declarado em generated[] é negado" |

## Fora deste plano

- Publicação de `@esliph/ownership` no npm e a volta da instalação remota do
  living-docs (§10, fatia C); o `TDR-0003` é o gatilho.
- O `promotion-guard` do núcleo, que espera a `DA-0004`. Até lá,
  `living-docs/state-promotion` é o guarda.
- A troca das cópias de `git/`, `exec/` e `frontmatter/` por import do núcleo.
- `derives-from` neste repositório, o plugin SDD, e composição entre arquivos
  (`include`, `basePath`).
- O aviso de `ADR-0020` para plugin listado em `plugins:` sem nenhuma entrada
  com o bloco dele.
- A divergência entre `MARKETPLACE_NAME = 'living-docs'` em
  `src/config/claude-settings.ts` e o nome real do marketplace (`esliph`) é
  anterior a este plano e não é corrigida aqui.


