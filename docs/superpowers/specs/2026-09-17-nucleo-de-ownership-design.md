# Núcleo de ownership de artefatos — design

Extrai do living-docs o mecanismo que orquestra artefatos por dono e o publica
como `@esliph/ownership`: plugin e biblioteca ao mesmo tempo. Sai de
`docs/superpowers/research/2026-09-16-nucleo-de-ownership-de-artefatos.md`, que
levantou o terreno e deixou seis pontos em aberto — todos decididos aqui.

**Escopo desta spec: o núcleo.** Contrato, esquema, composição e distribuição. A
migração do living-docs e o plugin SDD são specs próprias, depois desta e nesta
ordem. O núcleo nasce com um consumidor real antes de ganhar o segundo; é o que
impede o protocolo de extensão prematuro.

**Nada aqui é decisão aceita.** As decisões que esta spec obriga a registrar
estão na seção 11, para abrir como `draft` e promover por ato humano.

## 1. O que o núcleo é

Três responsabilidades, e nada além delas.

**Dono.** Cada caminho governado tem exatamente um `owner` e, quando existe uma,
uma `skill` dona. É assim que o conflito entre plugins se resolve: cada plugin
oferece tipos de artefato e skills, o repositório liga cada caminho a uma skill
só, e o núcleo recusa duas. O plugin que não é dono lê o artefato e pode reagir a
ele por gatilho, mas não escreve.

**Ciclo de vida.** Estados declarados por caminho, identidade de item dentro do
arquivo, e o guarda de promoção por ato humano. O núcleo acha os itens, pareia
antes e depois pela chave e pergunta quando a transição exige gente. Não sabe o
que os estados significam.

**Gatilho.** Código → doc, que é o `watches` de hoje. Doc → doc, que é novo:
editar a origem avisa que o derivado ficou para trás.

### Fora do núcleo, e isso é decisão

**Governança de família de IDs** — prefixo, formato, padding, sequência sem
lacuna, IDs aposentados, cobertura de citação — e **congelamento de artefato
aceito** ficam inteiros no living-docs. Podem subir depois pelo mesmo caminho de
extensão; hoje não sobem porque não servem a todo artefato. Uma tarefa de plan
não quer prefixo de duas a quatro letras nem numeração sem lacuna.

### A divisão do que existe hoje

| Vai para o núcleo                        | Fica no living-docs                                |
| ---------------------------------------- | -------------------------------------------------- |
| `path`, `owner`, `skill`                 | `id-prefix`, `id-format`                           |
| `states`                                 | `field-map`                                        |
| `collection`, `key`, `state-field`       | `append-only`, `mutable-fields`                    |
| `watches` e o visível ao consumidor      | `stale-after-months`, `last-reviewed-bump-limit`   |
| `derives-from`                           | `audience`, `role`                                 |
| `generated[]` e `command`                | `cited-by`                                         |
| cobertura de dono contra o CODEOWNERS    | a separação entre `artifacts` e `documents`        |

Duas linhas que podem surpreender. `generated[]` é do núcleo porque "este arquivo
é produzido por um comando, editá-lo à mão é erro" não tem nada de documentação:
vale para schema, cliente gerado, lockfile. E `audience`/`role` ficam fora porque
`agent-contract`, `definition-of-done` e "texto externo não cita ID de artefato"
são vocabulário de documentação, não de ownership.

## 2. O esquema v2

### Uma lista só, chamada `owned`

O glossário trava **Artefato** e **Documento**, e define Documento como
"declarado em `documents:`". Fundir as duas listas sob qualquer um dos dois nomes
redefiniria um termo por tabela. `owned` é palavra que nenhum glossário
reivindicou, e é mais honesta: o arquivo governa caminhos, e só alguns deles são
artefato — `watches` e `generated` falam de `src/**`, `.github/**`, `plugin/**`.

Os dois termos sobrevivem no living-docs com o significado que têm. O que muda é
o discriminador: deixa de ser "em qual lista está" e passa a ser "tem
`living-docs.id-prefix`". Ajustar o glossário é trabalho da spec de migração.

### Blocos com o nome do plugin, e o nome declarado

O núcleo é estrito com toda chave de primeiro nível e de entrada, e ignora apenas
blocos cujo nome está em `plugins:`. Cada plugin valida o próprio bloco com o
mesmo rigor.

A lista `plugins:` custa uma linha e existe por um motivo: sem ela, `living-doc:`
digitado errado seria ignorado em silêncio pelo núcleo e nunca visto pelo plugin,
que não sabe que existe um bloco para ele. É a mesma falha que fez descartar
chaves soltas.

### Governança e leitura não se misturam na mesma indentação

As chaves que dizem **como achar as coisas dentro do arquivo** — `collection`,
`key`, `state-field` — descem para um bloco `format:`. Elas existem só porque os
itens governados moram dentro de markdown: é configuração de parser, não
política, e no mesmo nível das outras ela domina a leitura. Como a maioria das
entradas é `per-file`, elas não carregam bloco nenhum.

### A forma

```yaml
version: 2 # em todo arquivo de ownership, não só na raiz
plugins: [living-docs] # só na raiz; o núcleo ignora estes blocos, e qualquer outro nome é erro
# basePath: packages/api  # opcional: desloca a base dos caminhos abaixo, sempre para dentro (seção 5)

owned:
  # per-file: a identidade é o arquivo — sem bloco `format`
  - path: docs/decisions/adr/
    owner: '@esliph/engineering'
    skill: decision-recorder
    states: [draft, proposed, accepted, superseded]
    living-docs:
      id-prefix: ADR
      append-only: true
      mutable-fields: [status, superseded-by, last-reviewed]

  - path: docs/open-decisions.md
    owner: '@esliph/engineering'
    skill: decision-recorder
    states: [open, resolved]
    format:
      collection: table
      key: ID # nome da coluna
      state-field: Status
    living-docs:
      id-prefix: DA
      field-map: { resolved-by: 'Resolvida por' }

  - path: docs/requirements/rules.md
    owner: '@esliph/engineering'
    skill: requirements-keeper
    format:
      collection: sections
      key: first-token # `## RN-0001 — Título` -> "RN-0001"
    living-docs:
      id-prefix: RN
      cited-by: ['test/**', 'src/**']

  # dono sem skill dona continua sendo informação, não erro
  - path: docs/superpowers/plans/
    owner: '@esliph/engineering'
    derives-from:
      source: docs/superpowers/specs/
      field: spec

generated:
  - path: docs/contracts/checks.gen.md
    command: node src/tools/gen-checks.ts

watches:
  - code: 'src/hooks/**'
    doc: docs/requirements/rules.md
    reason: 'hook bloqueia em nome de uma regra'

  # `consumer-visible: true` marca o conjunto — não há segunda lista
  - code: 'src/cli/**'
    doc: CHANGELOG.md
    consumer-visible: true
    reason: 'subcomando, opção e código de saída são contrato público'

ignore:
  - 'node_modules/**'
  - 'vendor/**'
```

### `consumer-visible-paths` deixa de existir

Hoje o mesmo conjunto é declarado duas vezes: como `consumer-visible-paths` e
como os `code` das regras marcadas `consumer-visible: true`. O próprio arquivo
admite ("são o mesmo conjunto de propósito") e existe um teste cujo único
trabalho é impedir que as duas cópias divirjam. Um teste que mantém duas cópias
de uma lista em sincronia é a definição de declaração duplicada.

Na v2 as regras marcadas **são** a lista, e o check que cobra a entrada deriva os
globs dali. A única coisa que a separação permitiria em tese — um caminho que
reprova no PR mas não lembra na edição — é exatamente o que o teste proíbe hoje.

### `ignore:` tira caminhos da governança

Sem ele, a cobertura de dono cobraria dono de `node_modules/`, `vendor/` e
qualquer diretório gerado. É lista de topo, vale para a base de quem a
declara, e o que ela cobre some da cobertura, não da leitura.

## 3. Identidade de item

A chave é o identificador do item **dentro do arquivo**: é ela que pareia o antes
com o depois no guarda de promoção, e é ela que fica depois do `#` na referência
`caminho#chave`.

**O que o núcleo garante**, e só isto: a chave não é vazia, é única dentro do
arquivo, e é estável no sentido de que trocá-la é indistinguível de apagar um
item e criar outro. O núcleo observa; não sabe dizer se houve rename.

**O que o núcleo não sabe**: formato, prefixo, sequência, aposentadoria,
unicidade entre arquivos. O plugin dono cobra o que quiser sobre a chave que
recebe. O living-docs cobra forma de ID e unicidade no repositório — que hoje
existe e é política **dele**. Um plugin SDD pode cobrar outra coisa, ou nada.

Hoje isso não é separável: `parseItemSections` monta o regex do heading a partir
do formato de ID e `parseItemTable` exige uma coluna `Status` em código. Os dois
parsers perdem a dependência de formato de ID; a chave passa a ser opaca.

### `key` responde sempre a mesma pergunta, com forma diferente

| `collection` | `key`                                       | Exemplo                            |
| ------------ | ------------------------------------------- | ---------------------------------- |
| `per-file`   | declarar é erro — a identidade é o arquivo  | —                                  |
| `table`      | nome da coluna                              | `key: ID`                          |
| `sections`   | `first-token` (padrão) ou `heading`         | `## RN-0001 — Título` → `RN-0001`  |

A pergunta é sempre "onde está a chave"; a resposta depende de como o arquivo
guarda os itens, e fingir um formato único esconderia isso. Não há regex:
`first-token` cobre `RN-0001 — Título` e `T-003 — Escrever o parser`, e regex em
arquivo de configuração é armadilha que ninguém pediu ainda.

### `state-field`

Nomeia onde o estado mora: a coluna em `table`, o campo do bloco em `sections`, a
chave do frontmatter em `per-file`. Opcional, padrão `status`, sem distinção de
maiúscula. Existe porque `states` é do núcleo — se onde o estado mora ficasse do
lado de lá, um projeto que escreve "Situação" ficaria sem ciclo de vida sem
ninguém dizer nada.

## 4. Gatilho

**Código → doc** é o `watches` de hoje, inalterado em forma: glob de caminho
vigiado, doc dono, razão, e a marca `consumer-visible` que o torna também a
fronteira com quem consome.

**Doc → doc** é novo e tem duas metades. O arquivo de ownership declara que
artefatos de um caminho derivam de artefatos de outro e por qual campo; cada
instância declara de qual.

```yaml
- path: docs/superpowers/plans/
  derives-from:
    source: docs/superpowers/specs/
    field: spec
```

```yaml
---
spec: docs/superpowers/specs/2026-09-17-nucleo-de-ownership-design.md
---
```

O tipo dá alcance e validação — o campo existe? aponta para dentro de `source`? o
alvo existe? A instância dá o alvo exato, e é ela que faz o lembrete ser preciso
em vez de ruído: editar uma spec avisa sobre o plan que a deriva, não sobre todos
os plans do diretório.

Só por tipo seria grosseiro demais para servir ao SDD. Só por instância deixaria
o nome do campo virar convenção não validada — o mesmo problema que o `field-map`
existe para resolver — e um campo digitado errado sumiria em silêncio.

## 5. Composição entre arquivos

Um arquivo de ownership é uma unidade de governo autocontida: diz por qual
esquema é lido, contra qual base seus caminhos são escritos, e governa um
conjunto de caminhos que nenhum outro arquivo declara.

### Base

A base efetiva é o **diretório do arquivo mais o `basePath`**. O `basePath` é
opcional, não aceita `..` nem glob, e só desce. Sem ele a base é o diretório do
arquivo — com uma exceção: a base da raiz é a raiz do repositório, more ela em
`.ownership.yml` ou em `docs/.ownership.yml`. A raiz é achada pela ordem de
candidatos da seção 8; os demais arquivos não são candidatos, são incluídos.

```yaml
# packages/api/.ownership.yml — base: packages/api/
version: 2

# ownership.api.yml, na raiz — base: packages/api/
version: 2
basePath: packages/api
```

Os dois governam a mesma subárvore. Onde o arquivo mora passa a ser organização,
não semântica, e um monorepo que prefere ownership centralizado consegue isso sem
que nenhum arquivo alcance fora da própria base.

### `version` em todos, `plugins` só na raiz

`version:` é obrigatório em todo arquivo, e divergência entre dois é erro que
nomeia os dois. Custa uma linha e paga que o arquivo se identifique sozinho: para
saber por qual esquema um subprojeto é lido não é preciso achar a raiz, e um
subprojeto que vira repositório próprio já sai pronto.

`plugins:` fica só na raiz. Uma lista por arquivo reabriria a falha que ela existe
para fechar — `plugins: [living-dcos]` digitado errado num filho faria o bloco
`living-docs:` daquele arquivo virar erro em um lugar e passar em outro, sem
ninguém revisando a lista de todos. Concentrá-la na raiz mantém a decisão num
ponto revisado uma vez.

### Caminhos governados são disjuntos

Resolvidos contra suas bases, todos os `owned[].path` de todos os arquivos formam
um conjunto disjunto: nenhum é igual a outro, e nenhum é prefixo de diretório de
outro — `docs/` e `docs/adr/x.md` colidem, `docs/adr/` e `docs/specs/` não.
Colisão é erro que nomeia os dois arquivos e o caminho, esteja ela dentro de um
arquivo, entre irmãos, ou entre um arquivo e outro que o inclui.

Não existe "nível", não existe cascata e não existe caminho mais específico
ganhando de menos específico. "Qual regra cobre este caminho" tem resposta única e
independente da ordem de declaração: prefixo quando a entrada termina em `/`,
igualdade quando não termina. E como nenhuma propriedade pode vir de outro
arquivo, `owner` é obrigatório em toda entrada.

A alternativa — sobreposição resolvida por especificidade — é o que a v1 tem hoje,
e não por desenho: a busca escolhe a **primeira** entrada declarada que casa,
enquanto a coleta de documentos aplica **todas** as que casam. São duas semânticas
para a mesma sobreposição, e um arquivo julgado duas vezes por regras que poderiam
divergir. Disjunção é o que faz as duas coincidirem.

**O que isso nega de propósito.** `docs/` com um dono geral e
`docs/decisions/adr/` com a `decision-recorder` deixa de ser expressável — as duas
entradas se contêm. Quem quer as duas coisas declara os irmãos um a um. O custo é
real e é aceito: as 23 entradas deste repositório já são disjuntas, tirando uma
sobreposição acidental que a seção 10 remove, e governo por herança é exatamente o
que torna "quem responde por este arquivo" uma pergunta que exige reconstruir uma
árvore para responder.

**Fora da conta.** `generated[].path` não é caminho governado: ele já satisfaz a
cobertura de dono sozinho, e um arquivo gerado dentro de um diretório governado
tem dono e tem gerador, o que faz sentido junto. A disjunção cobra dele só ele
mesmo — dois comandos produzindo o mesmo arquivo é erro. `watches` sobrepõe à
vontade: dois documentos vigiando `src/cli/**` por razões diferentes é o desenho
funcionando.

**Colisão é erro de carga, não check.** É levantada ao resolver, como qualquer
defeito de configuração: o `validate` reprova nomeando os dois lados, e o hook se
cala e libera, pela política de falha aberta. Um hook podado pode não enxergar
colisão que o CI enxerga, e é o certo — hook não é onde se descobre que a
configuração está quebrada.

### `include:`

Lista de caminhos relativos ao arquivo que a declara, apontando diretório quando
há um só arquivo de ownership lá dentro, ou arquivo quando há vários. Inclusão
aninhada é permitida; ciclo é erro; incluir o mesmo arquivo duas vezes é erro.

```yaml
# .ownership.yml, na raiz
include:
  - ownership.docs.yml # arquivo: há mais de um neste diretório
  - packages/api/ # diretório: há um só lá dentro
```

O que o `include` **não** faz é conferir escopo ou autoridade: ele diz "leia
também este arquivo", e o que o arquivo governa é assunto da base dele. É por isso
que a concessão de autoridade declarada no site de inclusão foi descartada — seria
uma segunda declaração de escopo, capaz de divergir da primeira.

### Confinamento

Um campo fica confinado à base quando o caminho que ele nomeia **pode ser um
caminho editado**. É esse o critério, e ele existe para manter a poda correta.

| Campo                                                                                  | Alcance                       |
| -------------------------------------------------------------------------------------- | ----------------------------- |
| `owned[].path`, `generated[].path`, `ignore[]`, `watches[].code`, `derives-from.source` | dentro da base                |
| `watches[].doc`                                                                        | qualquer lugar do repositório |

Os cinco primeiros nomeiam caminhos cuja edição dispara alguma coisa: guarda de
gerado, guarda de promoção, lembrete de vigiado, lembrete de derivação. Um
`derives-from.source` apontando para fora é o caso mais traiçoeiro — editar a spec
deixaria de avisar sobre o plano, porque o arquivo que declara a derivação teria
sido podado, e o lembrete sumiria em silêncio.

`watches[].doc` é o único campo que nunca é gatilho: nada dispara por editá-lo,
ele é sempre o alvo apontado, e a poda é dirigida por `code`. Deixá-lo livre
atende um caso real — `packages/api/.ownership.yml` vigiando
`packages/api/src/**` e apontando para o `CHANGELOG.md` da raiz. Sob confinamento
estrito, um pacote seria obrigado a ter changelog próprio, decisão de projeto que
o núcleo não tem por que impor.

### Poda

Resolvendo para um conjunto de caminhos (`onlyFor`), um arquivo cuja base não é
ancestral de nenhum deles é descartado sem ser aberto — comparação de caminho de
diretório, sem leitura. Como o `basePath` só desce, a base é sempre descendente do
diretório do arquivo, e a poda continua correta conhecendo apenas o lugar do
arquivo. É o que mantém o hook dentro do teto de cinco segundos com falha aberta.

Hooks podam. `validate` e `explain` não — e a cobertura de dono em particular
nunca poda, porque afirmar que um caminho não tem dono exige ter lido todos os
arquivos.

### `ownership explain <caminho>`

Entrega obrigatória, não conveniência. Responde qual entrada cobre o caminho, de
qual arquivo; quando nenhuma cobre, responde qual arquivo tem base
que o contém — que é exatamente o que falta saber quando a cobertura de dono
reprova.

O arquivo de ownership incluído é ele próprio um caminho governado e precisa de
dono como qualquer outro.

## 6. Hooks e checks

Cada regra roda uma vez, num plugin só.

| Hook de hoje                     | Vai para     |
| -------------------------------- | ------------ |
| append-only (congelamento)       | living-docs  |
| artefato gerado                  | **núcleo**   |
| promoção de estado               | **núcleo**   |
| lembrete de vigiado              | **núcleo**   |
| guarda de commit                 | **núcleo**   |
| inventário de sessão             | living-docs  |
| atalho vira dívida               | living-docs  |
| guarda de decisão aberta         | living-docs  |
| **novo** — lembrete de derivação | **núcleo**   |

| Check de hoje                                                                                                     | Vai para                                                                                                                                                                                                                                                       |
| ----------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| drift de gerado, changelog exigido                                                                                | **núcleo**, inteiros                                                                                                                                                                                                                                           |
| IDs, rastreabilidade, staleness, links, disciplina de commit, roteamento de gatilho, audiência externa             | living-docs, inteiros                                                                                                                                                                                                                                          |
| lint estrutural                                                                                                   | **parte-se**: `owner` válido e `status` dentro de `states` vão para o núcleo; frontmatter completo e `trigger` que não é cadência ficam                                                                                                                         |
| cobertura de propriedade                                                                                          | **parte-se**: entrada no ownership, linha no CODEOWNERS, `watches` com `doc` existente e com dono, e vigiado alterado sem o doc dono vão para o núcleo; contrato do agente repetindo frase, Definition of Done sem verificação e caminho reivindicado por decisão aberta ficam |

O roteamento de gatilho fica no living-docs apesar de comparar com a `skill`
dona, que é chave do núcleo — porque o que ele lê do outro lado é o `trigger` do
frontmatter, e frontmatter padronizado é contrato de documentação viva.

### Identificador nomeado e qualificado

Check e hook deixam de ser numerados. O ID passa a ser `plugin/nome-descritivo`:
`ownership/generated-drift`, `living-docs/id-sequence`. Numerado, o ID obriga quem
lê a consultar uma tabela para saber o que falhou; nomeado, ele diz.

O namespace é do plugin que publica, então um plugin novo — o SDD, ou o terceiro
que vier — nunca colide com um nome existente e quebra a Definition of Done de
quem já instalou. E ele diz qual comando reproduz a falha.

| Peça do núcleo                             | Nome                              |
| ------------------------------------------ | --------------------------------- |
| `owner` válido, `status` dentro de `states` | `ownership/declared-state`        |
| drift de gerado                            | `ownership/generated-drift`       |
| mudança visível sem entrada                | `ownership/consumer-change-logged` |
| cobertura de dono e CODEOWNERS             | `ownership/owner-coverage`        |
| vigiado alterado sem o doc dono            | `ownership/watch-satisfied`       |
| derivação declarada resolve                | `ownership/derivation-resolves`   |
| artefato gerado (hook)                     | `ownership/generated-guard`       |
| promoção de estado (hook)                  | `ownership/promotion-guard`       |
| lembrete de vigiado (hook)                 | `ownership/watch-reminder`        |
| guarda de commit (hook)                    | `ownership/commit-guard`          |
| lembrete de derivação (hook)               | `ownership/derivation-reminder`   |

A cobertura de propriedade vira **dois** nomes. Hoje ela cobra cobertura de dono e
caminho vigiado sem doc no mesmo ID porque número é caro e nome não é — e "falhou
o check sete" nunca disse qual dos dois.

A forma vale para o living-docs também: numerados ao lado de nomeados, quem lê o
relatório aprende duas convenções. Renomear lá é quebra de contrato público e é
trabalho da spec de migração; o que esta spec fixa é a forma.

## 7. Distribuição e execução

### Layout

O repositório vira o marketplace. Um diretório por plugin, cada um autocontido
com `package.json` e lockfile próprios — que é o que o Node exige para instalar
dependência dentro do plugin copiado para o cache.

```
esliph/
  .claude-plugin/marketplace.json     # source: ./packages/ownership, ./packages/living-docs
  .ownership.yml                      # governança deste repositório
  docs/
  packages/
    ownership/                        # @esliph/ownership — plugin E biblioteca
      .claude-plugin/plugin.json
      hooks/{hooks.json,run-hook.sh}
      src/**.ts                       # fonte; dist/ só existe no tarball
      package.json + package-lock.json
    living-docs/
      .claude-plugin/plugin.json      # dependencies: [{ name: ownership, version: ~1.0 }]
      hooks/{hooks.json,run-hook.sh}
      {commands,skills,agents,templates}/
      src/**.ts
      package.json + package-lock.json   # dependencies: @esliph/ownership
```

### Build só na publicação

**Medido em 2026-09-17, Node v24.18.0:** o Node recusa apagar tipos de `.ts` sob
`node_modules` com `ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING`, e não há saída
por flag — `--experimental-transform-types` e `NODE_OPTIONS` falham igual. Um
`@esliph/ownership` publicado como `.ts` não executa quando instalado como
dependência.

A mesma fonte executa de duas formas. Quando o núcleo é o plugin, roda do próprio
diretório em `.ts`, por type-stripping — não está sob `node_modules`. Quando é
biblioteca de um plugin de domínio, roda como `dist/*.js` de dentro de
`node_modules`. **Nenhum `dist` no repositório**: ele é gerado no `prepack` e só
existe dentro do tarball.

Isso supersede a decisão de executar sem build step, mas só na metade que precisa
ceder: o que se executa do checkout continua sendo TypeScript direto. O medo
registrado lá — um `dist` desatualizado fazendo o hook rodar código velho em
silêncio — não volta, porque nenhum `dist` existe numa máquina de desenvolvimento.

### Desenvolvimento sem build

**Medido em 2026-09-17:** com symlink de workspace e uma condição `development` no
`exports`, o Node resolve o caminho real (`packages/ownership/src/index.ts`), que
não está sob `node_modules`, e o type-stripping funciona.

```jsonc
// packages/ownership/package.json
"exports": { ".": { "development": "./src/index.ts", "default": "./dist/index.js" } },
"files": ["dist"]   // src/ nunca vai no tarball
```

O monorepo liga a condição para si mesmo por uma variável que o wrapper de hook
lê; num consumidor ela não existe e a resolução cai no `dist`. Nenhum build em
desenvolvimento e nenhum `dist` que possa envelhecer.

A lacuna é uma só: o desenvolvedor nunca exercita a forma empacotada, então um
`exports` mal escrito ou um arquivo faltando em `files` só apareceria no primeiro
consumidor. O teste de empacotamento da seção 9 a fecha, e é obrigatório.

### Duas raízes, não três

O levantamento previu que as duas raízes virariam três. Não viram. Todo processo
precisa de duas coisas: onde eu estou, derivada de `import.meta.dirname` e própria
de cada plugin, e qual repositório eu julgo, vinda do ambiente ou do diretório de
trabalho. A terceira — onde está o núcleo — deixa de ser um caminho que alguém
calcula e vira resolução do Node.

É por isso que a recusa de plugin a referenciar arquivo fora do próprio diretório
para de doer: nada sai do diretório do plugin. E é por isso que a decisão sobre as
duas raízes sobrevive intacta.

### Versões que discordam

O plugin do núcleo numa versão e um living-docs dependendo de outra leriam o mesmo
arquivo com esquemas diferentes. Duas camadas contra isso: `dependencies` no
`plugin.json` com faixa semver, com a dependência npm presa ao mesmo major; e
`version: 2` no arquivo, com **todo leitor recusando em voz alta** versão que não
conhece. Skew vira erro, não interpretação divergente.

### Duas CLIs

`ownership validate` cobre dono, ciclo de vida, gatilho e gerado; `living-docs
validate` cobre família de IDs, congelamento, staleness e citação. O CI chama as
duas. O `init` não se divide assim porque não é regra: o comando de setup continua
sendo um só e escreve o esqueleto do arquivo de ownership chamando o núcleo como
biblioteca.

## 8. Onde mora o arquivo

O caminho é configurável — os artefatos de um projeto não moram necessariamente em
`docs/`, e quem instala escolhe. A resolução é por ordem de candidatos:

1. explícito: `--ownership <caminho>` ou variável de ambiente;
2. `./.ownership.yml`;
3. `./docs/.ownership.yml`;
4. nenhum — silêncio, porque é um repositório sem o toolkit.

**Dois candidatos presentes é erro que nomeia os dois, nunca escolha.** Um arquivo
recém-migrado convivendo com um esquecido significaria validar pelo esquecido sem
aviso — e enforcement que some em silêncio é a falha que este repositório já pagou
uma reorganização inteira para matar.

A regra vale só para a raiz: os demais arquivos não são candidatos, são incluídos
(seção 5). E a base da raiz é a raiz do repositório qualquer que seja o candidato
que venceu — é o que mantém um `docs/.ownership.yml` governando `src/**` e
`CLAUDE.md` sem declarar base nenhuma.

## 9. Prova

Os achados sobre cache e fronteira de plugin estão marcados no levantamento como
inferidos da documentação e não testados, e o desenho da distribuição repousa
neles. Três provas que hoje não existem:

- **empacotamento** — `npm pack`, instalar o tarball num diretório temporário,
  importar e afirmar que funciona. Fecha a lacuna da condição `development`.
- **instalação remota de verdade** — instalar o marketplace de um repositório
  remoto e observar os hooks rodarem do cache. Transforma o achado inferido em
  fato, e é o que a decisão aberta sobre como o toolkit chega ao consumidor nunca
  teve.
- **regra única** — afirmar que as duas CLIs não reportam a mesma coisa duas
  vezes.

Mais o que o repositório já pratica, estendido ao que é novo:

- cada hook do núcleo se cala sem a configuração dele;
- a migração é exercitada contra o arquivo real deste repositório, com as 23
  entradas de `artifacts` e `documents`;
- a composição é exercitada com raiz mais um subprojeto, provando acúmulo de
  `watches`, `basePath` deslocando a base, `basePath` com `..` recusado, caminho
  fora da base recusado, `watches[].doc` fora da base aceito, versão divergente
  entre dois arquivos recusada, ciclo de inclusão recusado, e colisão de caminho
  recusada nas três formas — dentro de um arquivo, entre irmãos, e entre um
  arquivo e outro que o inclui;
- a poda descarta um arquivo sem abri-lo, e nenhuma regra de arquivo podado
  alcançaria os caminhos resolvidos;
- `ownership explain` aponta o arquivo da entrada que cobre o caminho,
  e o arquivo de base quando nenhuma cobre.

## 10. Migração

Um comando lê a v1 e escreve a v2: move o arquivo se preciso, funde `artifacts` e
`documents` numa lista só, aninha as chaves específicas sob o bloco do plugin e
desce as chaves de leitura para `format:`. Encontrando v1 depois disso, o núcleo
falha com erro que nomeia o comando. Um esquema vivo no código.

O comando também precisa **desfazer sobreposição**, porque a v1 a tolera e a v2 a
recusa. Este repositório tem uma: `docs/superpowers/` e dois arquivos de dentro
dele, entrados por acidente quando os dois foram movidos para um diretório já
declarado, com o mesmo `owner` e sem `skill`. O migrador remove as entradas
contidas quando elas não dizem nada que a entrada que as contém já não diga, e
para nomeando as duas quando dizem — misturar remoção com perda de regra seria
migração que apaga governança em silêncio. Aqui a remoção corrige de quebra um
defeito latente: hoje esses dois arquivos entram duas vezes na coleta de
documentos e são julgados duas vezes pelos checks que a percorrem.

Composição não entra na migração: um arquivo v1 é sempre único e migra para uma
raiz única, que ganha `version: 2` e nenhum `basePath` — a base da raiz já é a
raiz do repositório. Dividir em vários arquivos é opt-in depois, e nenhum
consumidor existente é obrigado a isso.

## 11. Decisões a registrar

Como `draft`, para promoção humana. A decisão sobre o nome do projeto está
`accepted` e por isso ganha decisão nova em vez de edição. As demais afetadas —
engine única, hooks como peça única, execução sem build step — estão `draft` e
também vão de decisão nova, porque o conteúdo muda em vez de se refinar. A
decisão sobre as duas raízes está `accepted` e **não** é afetada: a seção 7
mostra que a terceira raiz não se materializa.

| Decisão a abrir        | Sobre                                                                                                        | Efeito                                                                                                                                                                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| fronteira do núcleo    | dono, ciclo e gatilho dentro; IDs e congelamento fora                                                        | reabre a decisão da engine única — ela se divide                                                                                                                                                                                                   |
| esquema v2             | lista `owned`, blocos por plugin, `plugins:` na raiz, `version` em todo arquivo, `basePath`, `format:`, fim da lista duplicada de caminhos visíveis | —                                                                                                                                                                                                             |
| identidade de item     | chave opaca, `key` por coleção, `state-field`                                                                | —                                                                                                                                                                                                                                                  |
| gatilho doc → doc      | tipo no ownership, instância no frontmatter                                                                  | —                                                                                                                                                                                                                                                  |
| composição entre arquivos | base por arquivo com `basePath` só descendo, caminhos governados disjuntos, inclusão explícita sem concessão de autoridade, confinamento pelo critério de gatilho | —                                                                                                                                                                                       |
| resolução do arquivo   | ordem de candidatos, ambiguidade é erro                                                                      | —                                                                                                                                                                                                                                                  |
| distribuição           | monorepo-marketplace, npm, build na publicação                                                               | supersede a decisão de executar sem build step, resolve a decisão aberta sobre como o toolkit chega ao consumidor, reabre a de hooks como peça única, e obriga decisão nova sobre o nome do projeto — o repositório passa a ter mais de um pacote |
| identificador nomeado  | `plugin/nome-descritivo` para check e hook                                                                   | —                                                                                                                                                                                                                                                  |

## 12. Fora desta spec

- **Migração do living-docs**: renomear os checks, ajustar o glossário, mover o
  arquivo, adotar o núcleo como dependência. Spec própria, logo depois desta.
- **Plugin SDD**: spec, plan e constitution como tipos de artefato próprios. Spec
  própria, depois da migração.
- **Protocolo de extensão** — o núcleo como anfitrião que carrega extensões em vez
  de biblioteca importada. Continua sendo o destino se um terceiro plugin tornar
  caro ter dois hooks por evento; hoje seria projetar e versionar um protocolo com
  um consumidor e meio.
- **Governança de IDs e congelamento no núcleo**: podem subir pelo mesmo caminho
  de extensão, quando houver um segundo domínio que os queira iguais.
