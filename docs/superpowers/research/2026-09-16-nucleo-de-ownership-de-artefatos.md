# Núcleo de ownership de artefatos — levantamento

Levantamento de brainstorming sobre extrair do living-docs o mecanismo que
orquestra artefatos por dono, para que outros plugins o usem. Registra o que foi
observado no código e na documentação do Claude Code, as direções que o autor
escolheu e o que continua em aberto.

**Não é decisão.** As direções abaixo foram escolhidas pelo autor durante o
brainstorming e ainda não viraram ADR; nenhuma delas vale como regra até ser
registrada e aceita. A spec e os ADRs que saírem daqui são os donos do que for
decidido, e este documento não é atualizado depois deles.

## Motivação

O living-docs tem, no seu cerne, um orquestrador: o `.ownership.yml` liga
caminho a dono, a skill dona, a ciclo de vida e a gatilho, e hooks e checks leem
dali sem conhecer caminho nenhum. Esse mecanismo não é específico de
documentação viva.

O caso concreto que força a extração é **SDD** (spec-driven development): spec,
plan e constitution. São documentos vivos, mas o SDD precisa de um conjunto de
ferramentas próprio que fica fora do escopo do living-docs. A constitution já
existe no living-docs, o que faz do SDD também o primeiro caso de dois plugins
disputando o mesmo tipo de artefato.

Este repositório já tem artefatos SDD sem dono de skill: `docs/superpowers/specs/`
e `docs/superpowers/plans/` aparecem no `.ownership.yml` com dono e sem keeper.
Ele pode ser o primeiro consumidor dos dois plugins.

## O que o código mostra hoje

`src/config/ownership.ts` mistura, no mesmo esquema, chaves que valem para
qualquer artefato e chaves que só fazem sentido em documentação viva:

| Genérico                                       | Específico de documentação viva                             |
| ---------------------------------------------- | ----------------------------------------------------------- |
| `path` → `owner` → `skill`                     | `id-prefix` obrigatório (2 a 4 letras), `id-format`         |
| `states` (máquina de estados por artefato)     | `field-map`                                                 |
| `watches` e `consumer-visible`                 | `audience`, `role` (`agent-contract`, `definition-of-done`) |
| `generated[]` e `command`                      | `append-only` e `mutable-fields`                            |
| cobertura de dono contra o CODEOWNERS          | `stale-after-months`, `last-reviewed-bump-limit`            |
| `collection` (`per-file`, `table`, `sections`) | a separação entre `artifacts` (com IDs) e `documents` (sem) |

`collection` aparece na coluna genérica por causa do achado sobre identidade de
item, mais abaixo.

## Achados na documentação do Claude Code

Fonte: referência de plugins (`https://code.claude.com/docs/en/plugins-reference`),
consultada em 2026-09-16.

1. **Dependência entre plugins existe.** O `plugin.json` aceita
   `dependencies`, em forma de string (`"helper-lib"`) ou objeto com faixa
   semver (`{ "name": "...", "version": "~2.1.0" }`). Instalar um plugin instala
   as dependências dele; dependência puxada só por outro plugin é removida
   quando deixa de ser necessária.
2. **Plugin de marketplace é copiado para o cache**
   (`~/.claude/plugins/cache/{marketplace}/{plugin}/{versão}/`), exceto quando o
   marketplace é um diretório local e o plugin carrega no lugar.
3. **Plugin não pode referenciar arquivo fora do próprio diretório.** Caminho que
   escapa da raiz do plugin é recusado com `path escapes plugin directory`.
4. **Dependências Node são instaladas dentro do plugin copiado**, desde que a
   raiz do plugin tenha `package.json` **e** um lockfile suportado
   (`package-lock.json`, `npm-shrinkwrap.json`, `bun.lock`, `bun.lockb`).

### Consequência para o estado atual

`plugin/hooks/run-hook.sh` resolve a raiz do toolkit subindo dois níveis a partir
do próprio script e executa `src/hooks/*.ts` de lá. Pelos achados 2 e 3, isso só
funciona com o marketplace carregado no lugar, como neste repositório. Instalado
de um marketplace remoto, o cache recebe apenas `./plugin`, sem `src/` e sem
`node_modules`, e os hooks falham abertos em silêncio.

**Inferido da documentação, não testado** com uma instalação remota. É a lacuna
de `DA-0003` observada na prática, e a extração a resolve de qualquer forma:
cada plugin precisa ser um pacote autocontido.

## Achado sobre TypeScript em `node_modules`

O Node não remove tipos de arquivo `.ts` que mora em `node_modules`. Verificado
em 2026-09-16 com Node v24.18.0: um pacote em `node_modules` que exporta
`index.ts`, importado por um `main.ts`, falha com
`ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING` ("Stripping types is currently
unsupported for files under node_modules").

Isso colide com a direção 5 somada a `ADR-0015` (TypeScript executado
diretamente, sem build step). Um `@esliph/ownership` publicado como `.ts` não
executa quando instalado como dependência. Para a direção 5 valer, alguma coisa
precisa ceder: publicar JavaScript gerado (build step só na publicação), publicar
`.ts` com anotações só em JSDoc sobre `.js`, ou manter o núcleo fora de
`node_modules`. Nenhuma dessas foi discutida.

## Achado sobre identidade de item

O guarda de promoção de estado depende de identidade de item
(`src/hooks/hk3-state-promotion.ts`, `findPromotion`). Em `table` e `sections`,
vários itens moram num arquivo só, e o guarda só detecta a promoção pareando o
item de antes com o de depois **pela chave**. Em `per-file`, a identidade é o
próprio arquivo.

O SDD encontra o mesmo caso: tarefas de um plan são itens com estado num arquivo
só, e um gatilho que aponta para um item específico precisa de chave.

"Família de IDs" junta duas coisas:

| Identidade de item (mecânica)                      | Governança da família de IDs (política)  |
| -------------------------------------------------- | ---------------------------------------- |
| como achar os itens num arquivo (`collection`)     | prefixo, `id-format`, padding, separador |
| onde está a chave de cada item                     | numeração sem lacuna e sem repetição     |
| parear antes e depois; referenciar `caminho#chave` | IDs aposentados, cobertura de citação    |

## Direções escolhidas pelo autor

1. **Escopo do núcleo: dono, ciclo de vida e gatilho.** Ciclo de vida inclui o
   guarda de promoção por ato humano. Gatilho cobre código → doc (os `watches`
   de hoje) e doc → doc (editar a spec avisa que o plan derivado ficou
   desatualizado).
2. **Fora do núcleo, por ora: governança de IDs e congelamento.** Os dois
   continuam no living-docs. Podem subir para o núcleo no futuro, pelo mesmo
   caminho de extensão.
3. **Conflito de dono: o repositório escolhe.** Cada plugin oferece tipos de
   artefato e skills; o `.ownership.yml` do repositório liga cada caminho a
   exatamente uma skill, e o núcleo recusa duas. O plugin que não é dono só lê o
   artefato e pode reagir a ele por gatilho.
4. **Execução: o núcleo é plugin e biblioteca ao mesmo tempo.** O núcleo tem hooks
   e CLI próprios e executa só os mecanismos dele; cada regra roda uma vez,
   independentemente de quais plugins estão instalados. Os plugins de domínio
   importam o núcleo como biblioteca e registram apenas os hooks e checks do
   próprio domínio.
   - Descartado: núcleo só como biblioteca. O guarda de estado e o lembrete de
     gatilho passariam a rodar em cada plugin, e gatilho entre plugins não teria
     dono.
   - Descartado por ora: núcleo como anfitrião que carrega extensões. Exige
     projetar e versionar um protocolo de extensão com um consumidor e meio.
     Continua sendo o destino se um terceiro plugin tornar caro ter dois hooks
     por evento.
5. **Distribuição: monorepo como marketplace, núcleo publicado no npm.** Um
   diretório por plugin (núcleo, living-docs, SDD), cada um com `package.json` e
   lockfile próprios. O living-docs depende de `@esliph/ownership` numa versão
   publicada e declara o plugin do núcleo em `dependencies`.
   - Descartado: dependência git (pacote em subdiretório resolve mal).
   - Descartado como forma de publicação: npm workspaces, que deixa o lockfile
     só na raiz e, pelo achado 4, nada é instalado no plugin copiado. Pode servir
     ao desenvolvimento local se cada plugin mantiver o próprio lockfile.
   - Descartado agora: repositórios separados.
6. **Extensão do `.ownership.yml`: blocos com o nome do plugin.** O núcleo é
   estrito com as chaves de primeiro nível e ignora só blocos com nome de
   plugin; cada plugin valida o próprio bloco com o mesmo rigor. A lista passa a
   ser uma só, e "ter família de IDs" vira "ter `living-docs.id-prefix`". Exige
   uma versão nova do esquema e migração do arquivo existente.
   - Descartado: chaves soltas, porque nenhum validador recusaria um erro de
     digitação.
   - Descartado: um arquivo por plugin, porque os caminhos passariam a morar em
     dois lugares.

## Em aberto

### Identidade de item no núcleo

Opções levantadas:

1. **Nada de identidade no núcleo.** O guarda de estado do núcleo cobre só
   `per-file`, e o living-docs mantém um segundo guarda para `table` e
   `sections`. A regra passa a existir em dois lugares.
2. **Identidade de item no núcleo, governança no plugin.** `collection` e a
   chave do item passam a ser do núcleo, com referência `caminho#chave` e chave
   livre (ID, slug, número de tarefa). Prefixo, formato, sequência,
   aposentadoria e rastreabilidade continuam no living-docs.
3. **Família de IDs inteira no núcleo.** Todo plugin herda uma política que não
   serve a todo artefato.

Recomendação levantada: **2**, por trazer ao núcleo só o que ele não consegue
deixar de fora. Esboço:

```yaml
- path: docs/open-decisions.md
  owner: '@esliph/engineering'
  skill: decision-recorder
  collection: table # núcleo: como achar os itens
  key: ID # núcleo: onde está a chave de cada item
  states: [open, resolved]
  living-docs:
    id-prefix: DA # plugin: a política da família
    field-map: { resolved-by: 'Resolvida por' }
```

### Ainda não discutido

- Como a direção 5 convive com `ADR-0015`, dado que o Node não executa `.ts` em
  `node_modules`.
- Nome e forma do gatilho doc → doc no esquema, e se a relação é declarada por
  tipo de artefato, por instância (frontmatter do plan apontando a spec) ou
  pelos dois.
- Onde mora o arquivo de ownership, já que `docs/` é um lugar de documentação e o
  núcleo não é.
- Três raízes (núcleo, plugin de domínio, repositório validado) e como elas se
  resolvem no cache, no CI e no host.
- Migração de quem já tem `.ownership.yml` com `version: 1`.
- Decomposição do trabalho: contrato do núcleo e distribuição, migração do
  living-docs, e o plugin SDD como spec própria.

## Artefatos afetados

Registro para quem for escrever a spec e os ADRs, sem antecipar o que cada um
decide:

- `ADR-0002` (uma engine para CLI e hooks): a engine se divide entre núcleo e
  plugins de domínio.
- `ADR-0003` (duas raízes): passam a ser três.
- `ADR-0012` (hooks como peça única, sem um plugin por fase): a recusa a
  multiplicar o caminho de instalação é reaberta; `dependencies` é o argumento
  novo.
- `ADR-0014` (nome do projeto): o repositório passa a conter mais de um pacote.
- `ADR-0015` (Node do host, sem build step): colide com a direção 5, porque o
  Node não executa `.ts` em `node_modules` (achado acima). Um dos dois precisa
  ceder.
- `DA-0003` (como o toolkit chega ao consumidor): a direção 5 a responde.
