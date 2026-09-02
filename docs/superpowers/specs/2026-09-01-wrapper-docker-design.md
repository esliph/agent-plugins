# Wrapper de execução em Docker — especificação

O toolkit executa no `node` do host (`RNF-0002`, `ADR-0015`), e continua
executando. Esta spec descreve um **segundo** caminho de execução, opcional: um
wrapper que roda qualquer comando de manutenção dentro do container já descrito
por `Dockerfile` e `compose.yaml`, para quem quiser um ambiente previsível e
portátil sem instalar Node na máquina.

Ela não repete o que os artefatos donos dizem. A regra vigente está em
`docs/requirements/`, a decisão em `docs/decisions/adr/`, o modo de trabalho em
`CONTRIBUTING.md` e o critério de pronto em `docs/definition-of-done.md`.

**Insumo obrigatório de quem for planejar:** `ADR-0015` (a execução no host, que
esta spec **não** supersede), `ADR-0003` (as duas raízes, que continuam valendo),
`TDR-0002` (a dívida que esta entrega paga) e
`docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` §7 (o teto
de 5 s do hook, razão de os hooks ficarem fora do container).

---

## 1. O que decidiu quem pediu

Seis escolhas foram tomadas antes desta spec e não são reabertas aqui:

| # | Escolha | Consequência aceita |
| --- | --- | --- |
| `E-1` | Os **hooks nunca entram no container**. O wrapper cobre manutenção: `npm`, o CLI, um shell | Numa máquina sem Node no host, os hooks continuam sem enforcement local. É o mesmo custo que `ADR-0015` já declarou, e não é agravado |
| `E-2` | Container **persistente**, e o wrapper o garante: se não está de pé, sobe sozinho | O wrapper passa a ter efeito colateral (`docker compose up -d`) numa invocação que parecia só de leitura. Em troca, some o modo de falha "container parado" que hoje devolve exit 2 |
| `E-3` | `bin/dev` genérico é o ponto de entrada; `bin/living-docs` sobrevive como delegação de uma linha | Dois arquivos em `bin/` em vez de um. Nenhuma lógica duplicada, e o caminho público que `TDR-0002` protege continua válido |
| `E-4` | **Só bash.** Nenhum `.ps1`, nenhum `.cmd` | No Windows invoca-se pelo Git Bash, pelo WSL, ou com `bash bin/dev …` a partir do PowerShell. O `git` já é exigido pelo toolkit e o Git for Windows traz o bash junto |
| `E-5` | O caminho Docker é verificado por **workflow condicional por caminho**, não em todo PR | Uma quebra causada por algo fora da lista de caminhos vigiados só aparece na próxima vez que alguém tocar naquela lista |
| `E-6` | Regra nova (`RNF-0006`), não emenda ao `RNF-0002` | Um ID a mais. Em troca, os dois caminhos têm ciclos de vida independentes: retirar o Docker um dia não mexe no requisito do host |

`E-1` é a que sustenta as outras. O núcleo de `ADR-0015` é que o enforcement
local não pode depender do estado de um daemon; enquanto os hooks executam no
host, esse núcleo fica intacto e o caminho conteinerizado é acréscimo, não
reversão.

---

## 2. A invariante que faz a paridade existir

**`bin/dev` não conhece comando nenhum.**

Não tem subcomando, não tem tabela de comandos suportados, não valida `argv`, não
traduz nada. Recebe argumentos e os repassa para dentro do container.

Isso não é economia de código: é o mecanismo. Não existe uma "lista de comandos
que funcionam no Docker" capaz de divergir da lista do host, porque essa lista
não está escrita em lugar nenhum. Um comando de manutenção novo passa a funcionar
nos dois caminhos no mesmo commit que o cria, sem que ninguém se lembre de
atualizar o wrapper.

`M-8` verifica essa invariante. Ela é o que `RNF-0006` chama de paridade.

---

## 3. As onze mudanças

| ID | Mudança | Arquivo |
| --- | --- | --- |
| `M-1` | Nasce o wrapper genérico | `bin/dev` |
| `M-2` | O wrapper do CLI vira delegação de uma linha | `bin/living-docs` |
| `M-3` | `RNF-0006` nasce; `RNF-0002` marca o caminho conteinerizado como fora de escopo | `docs/requirements/non-functional.md` |
| `M-4` | `ADR-0016` nasce, carregando `ADR-0015` em vez de supersedê-lo | `docs/decisions/adr/` |
| `M-5` | `TDR-0002` é quitado por conserto | `docs/decisions/debt/` |
| `M-6` | `bin/**` passa a ser o caminho vigiado, e `bin/dev` entra em `consumer-visible-paths` | `docs/.ownership.yml` |
| `M-7` | Nasce o workflow que exercita o caminho Docker | `.github/workflows/wrapper-docker.yml` |
| `M-8` | Testes travam a delegação e a invariante da §2 | `test/plugin/` |
| `M-9` | O princípio 6 é emendado; a Constitution vai a `version: 3` | `docs/charter/constitution.md` |
| `M-10` | A prosa ensina os dois caminhos, host primeiro | `README.md`, `CONTRIBUTING.md` |
| `M-11` | A entrada de `## [Unreleased]` registra a mudança visível | `CHANGELOG.md` |

`Dockerfile`, `compose.yaml` e `.dockerignore` **não mudam**. Já estão corretos
para este desenho, e essa é a razão de a entrega ser pequena.

### `M-1` — `bin/dev`

Três responsabilidades, nesta ordem, e nada além delas.

**Garantir o container.** O nome vem de `LIVING_DOCS_CONTAINER`, com
`esliph-living-docs` como padrão — o mesmo contrato que `bin/living-docs` já
publica hoje. Se `docker inspect -f '{{.State.Running}}'` não devolver `true`, o
wrapper roda `docker compose up -d` a partir da raiz do repositório, que ele
deriva do caminho do próprio script — um nível acima de `bin/`, pelo mesmo padrão
que `plugin/hooks/run-hook.sh` usa (lá são dois, porque o script está mais
fundo). Na primeira vez isso constrói a imagem; nas seguintes é quase
instantâneo.

**Garantir as dependências.** `compose.yaml` monta `node_modules` como volume
nomeado, e hoje nada o popula: mesmo com o container de pé, o CLI quebraria por
falta de `yaml` e `picomatch`. O bootstrap acontece dentro do mesmo `docker exec`
que executa o comando, sem round-trip extra:

```bash
exec docker exec -i -w /opt/living-docs "$CONTAINER" \
  bash -c '[ -d node_modules/yaml ] || npm ci >&2; exec "$@"' -- "$@"
```

O `>&2` não é cosmético: a saída do `npm ci` não pode contaminar o stdout de um
comando cuja saída alguém lê.

**Executar.** O working dir é `/opt/living-docs`, porque é onde `npm` faz
sentido. O CLI continua validando `/workspace` porque `LIVING_DOCS_REPO_ROOT` já
vem do `compose.yaml`: a separação de `ADR-0003` segue vindo de variável de
ambiente, nunca do diretório de trabalho. Apontar o wrapper para outro projeto
continua sendo `LIVING_DOCS_TARGET=/caminho docker compose up -d`, como o
`compose.yaml` já previa.

Sem argumentos, `bin/dev` abre `bash` interativo — é o workspace. O `-t` do
`docker exec` entra quando stdin é TTY, e só então.

O código de saída do comando é o código de saída do wrapper. `exec` garante isso
sem nenhum cuidado adicional.

### `M-2` — `bin/living-docs`

Perde toda a lógica de `docker exec` e vira delegação:

```bash
exec "$(dirname "$0")/dev" node src/cli/index.ts "$@"
```

Deixa de exigir container previamente subido, deixa de sair com código 2, e volta
a ser invocável. É por conserto, não por remoção, que `TDR-0002` é pago.

### `M-3` — a regra

`RNF-0006` enuncia o caminho conteinerizado opcional e a paridade da §2.
`relates-to: ADR-0016`. Em **fora de escopo**: os hooks, que rodam sempre no host
por `RNF-0001` e `E-1`.

`RNF-0002` não é reescrito e não muda de sentido. Ganha uma linha em **fora de
escopo** apontando para `RNF-0006`, para que quem leia "Node 24 e o npm são o
único toolchain exigido" entenda que Docker é alternativa, não exigência — a
palavra que carrega a frase continua sendo *exigido*.

Nasce `draft`. Promover é ato humano (`HK-3`).

### `M-4` — a decisão

`ADR-0016 — Caminho de execução conteinerizado opcional, paridade por delegação`.
`relates-to: [ADR-0015, ADR-0003, RNF-0006]`, `supersedes: null`.

O ADR precisa dizer, no texto e não só no frontmatter, **por que não supersede
`ADR-0015`**: porque o núcleo daquela decisão — enforcement local independente do
estado de um daemon — sobrevive intacto enquanto os hooks ficam no host (`E-1`).
Escrevê-lo como supersessão reabriria `ADR-0001` pela porta dos fundos, e
`ADR-0001` continua superseiado pelos motivos que `ADR-0015` registrou.

Alternativas a registrar como consideradas e descartadas: o par bash + PowerShell
com lógica duplicada (`E-4`), o job de CI em todo PR (`E-5`), e generalizar
`bin/living-docs` em vez de criar `bin/dev` (`E-3`).

Custos a declarar em **o que se aceita perder**:

- **Docker daemon vira dependência de quem escolhe esse caminho** — e a primeira
  invocação constrói uma imagem, o que não é rápido.
- **I/O lento em bind mount de caminho Windows**, agravado por este repositório
  morar no OneDrive. `bin/dev npm test` é sensivelmente mais lento que `npm test`
  no host. Isso não invalida o caminho; invalida a ideia de que ele seja o padrão,
  e é uma razão a mais para host-first.
- **Um caminho de execução público a mais para manter**, com a cobertura de CI
  deliberadamente parcial que `E-5` escolheu.

Nasce `draft`.

### `M-5` — a dívida

`TDR-0002` vai a `status: paid`. O gatilho de pagamento que ele mesmo declarou —
"quando `bin/living-docs` voltar a ser ensinado em `README.md`,
`CONTRIBUTING.md`, `docs/definition-of-done.md` ou em qualquer workflow" — é
cumprido por `M-10` e `M-7`, e o wrapper deixa de ser o arquivo morto que o TDR
descreve: passa a funcionar.

`paid` é estado válido de `TDR` (`src/docs/schema.ts`). Como `status` é campo
mutável, `HK-3` pergunta; a resposta não é do agente.

Esta é a **última** mudança a ser aplicada. Marcar a dívida como paga antes de o
wrapper funcionar seria registrar como fato algo que ainda não é.

### `M-6` — o mapa de propriedade

O `watches` de `bin/living-docs` passa a `bin/**`, mesma `reason` e mesmo
`consumer-visible: true` — o motivo já escrito lá ("o wrapper é um ponto de
entrada público do toolkit") vale igual para `bin/dev`. Em
`consumer-visible-paths`, `bin/dev` é somado a `bin/living-docs`.

`CODEOWNERS` **não muda**: ele espelha o campo `owner` dos artefatos de
documentação, e `bin/**` é caminho vigiado, não artefato.

### `M-7` — o workflow

Arquivo novo, separado de `living-docs.yml`, porque o filtro `paths` do GitHub
Actions é por workflow e não por job — condicionar um job dentro do workflow
existente exigiria uma action de terceiros para nada.

Dispara em `push` e `pull_request` restritos a `Dockerfile`, `compose.yaml`,
`.dockerignore`, `bin/**`, `package.json` e `package-lock.json`. Sobe o container
e roda, pelo wrapper, o que o host já roda: `bin/dev npm test` e
`bin/dev node src/cli/index.ts validate`.

O efeito no PR comum é **zero**: nenhum build de imagem, nenhum minuto a mais. O
ganho que `ADR-0015` declarou ao tirar a construção de imagem do CI fica de pé, e
o caminho Docker só é exercitado quando alguém toca no que pode quebrá-lo.

`.github/workflows/**` é `consumer-visible-path`; a entrada de `CHANGELOG` de
`M-11` cobre isso.

### `M-8` — os testes

Rodam no host, em todo PR, sem Docker. Citam `RNF-0006`. São três, e nenhum deles
finge provar que o Docker funciona — provam que a **estrutura** que sustenta a
paridade não se desfez:

1. `bin/living-docs` delega a `bin/dev` e não contém `docker exec` próprio. É o
   teste que impede a duplicação de lógica voltar.
2. `bin/dev` repassa `"$@"` e não enumera comando nenhum — a invariante da §2,
   verificada em vez de prometida.
3. `docs/.ownership.yml` cobre `bin/dev` em `watches` e em
   `consumer-visible-paths`.

São asserções textuais sobre os scripts, no mesmo espírito de
`test/core/roots.test.ts` ("nenhum caminho absoluto de container está embutido em
`src/` ou `test/`"), que já existe e já funciona assim.

A verificação de que o caminho **executa** é `M-7`. Os dois se completam: `M-8`
cobre a estrutura em todo PR, `M-7` cobre a execução quando ela pode ter
quebrado.

### `M-9` — o princípio 6

Hoje: *"O toolkit roda no Node do host, sem passo de build — verificado por
`test/plugin/manifest.test.ts` (`RNF-0002`) e pelo workflow, que instala Node e
npm e nada além."*

A cláusula final fica ambígua com um segundo workflow que constrói imagem. A
emenda mantém a afirmação — a execução de registro é o host, e não há passo de
build — e torna explícito que o caminho conteinerizado de `RNF-0006` é opcional e
não é a verificação de registro. `version` vai a `3`, com entrada no histórico de
emendas citando `ADR-0016`.

Emenda de charter é ato humano. O agente escreve a proposta; quem promove é quem
pediu.

### `M-10` — a prosa

`README.md` e `CONTRIBUTING.md` passam a ensinar os dois caminhos, **com o host
primeiro** e o Docker rotulado como opcional em ambos. O bloco do host que já
existe não é reescrito nem realocado: ganha um bloco irmão abaixo.

`docs/definition-of-done.md` **não muda**. O que o CI reproduz em todo PR é o
host; fazer do caminho Docker um critério de pronto criaria uma segunda barra que
ninguém mede. Docker é conveniência de quem desenvolve, não é a verificação de
registro — a mesma afirmação que `M-9` leva ao charter.

### `M-11` — o `CHANGELOG`

`bin/**` e `.github/workflows/**` são `consumer-visible-paths`; `CI-6` cobra a
entrada. Ela registra o ponto de entrada novo (`bin/dev`) e a mudança de
comportamento de `bin/living-docs`, que deixou de exigir container previamente
subido.

---

## 4. Ordem de aplicação

A ordem não é preferência de estilo: cada passo só afirma o que já é verdade
quando ele roda.

1. `M-3`, `M-4` — a regra e a decisão vêm antes do código (`CLAUDE.md`).
2. `M-1` — `bin/dev`.
3. `M-2` — `bin/living-docs` reescrito.
4. `M-8` — os testes, que só passam depois de `M-1` e `M-2`.
5. `M-6` — o mapa de propriedade.
6. `M-7` — o workflow.
7. `M-9`, `M-10`, `M-11` — charter, prosa e `CHANGELOG`.
8. `M-5` — `TDR-0002` a `paid`, quando o gatilho de fato se cumpriu.

---

## 5. O que esta spec não faz

- **Não supersede `ADR-0015`**, e não reabre `ADR-0001`. `E-1` é o que garante isso.
- **Não toca `ADR-0003`.** As duas raízes continuam distintas e continuam vindo
  das mesmas fontes.
- **Não resolve `DA-0003`** (como o toolkit chega a um repositório consumidor).
  Publicar imagem é caminho possível, e continua sendo decisão futura — do mesmo
  jeito que `ADR-0003` deliberadamente não a tomou.
- **Não promove nada.** `RNF-0006` e `ADR-0016` nascem `draft`, `TDR-0002` vai a
  `paid` sob pergunta de `HK-3`, e a Constitution v3 é emenda humana.
