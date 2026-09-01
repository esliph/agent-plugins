# Wrapper de execução em Docker — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Entregar um segundo caminho de execução, opcional, que roda qualquer comando de manutenção do toolkit dentro do container já descrito por `Dockerfile` e `compose.yaml` — sem tirar do host a execução de registro nem os hooks.

**Architecture:** Um wrapper bash genérico (`bin/dev`) garante o container, garante as dependências e repassa `"$@"` para dentro dele. Ele **não conhece comando nenhum**: não há tabela de subcomandos capaz de divergir da lista do host, e é essa ignorância — verificada por teste — que faz a paridade existir. `bin/living-docs` deixa de ter lógica própria e vira uma delegação de uma linha para `bin/dev`, o que conserta o arquivo morto que `TDR-0002` registrou. A estrutura é verificada em todo PR, no host, sem Docker; a execução é verificada por um workflow condicional por caminho.

**Tech Stack:** bash (só bash — sem `.ps1`, sem `.cmd`), Docker + Docker Compose (opcionais, do lado de quem escolhe o caminho), Node 24 + `node:test` para os testes de estrutura, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-09-01-wrapper-docker-design.md`

**Insumos obrigatórios:** `docs/decisions/adr/ADR-0015-execucao-no-node-do-host.md`, `docs/decisions/adr/ADR-0003-duas-raizes-toolkit-e-repositorio.md`, `docs/decisions/debt/TDR-0002-wrapper-docker-orfao.md`, `docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` §7.

---

## Global Constraints

Valem para **toda** task; os requisitos de cada uma as incluem implicitamente.

- **O toolkit roda no `node` do host** (`RNF-0002`). Os comandos deste plano são `npm ci`, `npm test`, `npm run typecheck` e `node src/cli/index.ts …`, executados no host. Nenhum passo deste plano exige Docker instalado — a verificação do caminho conteinerizado é do workflow (Task 5), não de quem implementa.
- **A regra vem antes do código** (`CLAUDE.md`). `RNF-0006` e `ADR-0016` são a Task 1 e nada depende de ordem diferente.
- **Nada é promovido pelo agente.** `RNF-0006` e `ADR-0016` nascem `draft`; a Constitution v3 é proposta escrita, promoção humana; `TDR-0002` só vai a `paid` com confirmação explícita da pessoa (Task 7).
- **Sem passo de build.** TypeScript executa direto, restrito a sintaxe apagável: sem `enum`, sem `namespace`, sem decorators. Imports carregam a extensão `.ts`.
- **Só bash.** Nenhum `.ps1`, nenhum `.cmd` (`E-4`). No Windows, invoca-se por Git Bash, WSL, ou `bash bin/dev …` a partir do PowerShell.
- **Nenhum script executável carrega CR.** `test/plugin/manifest.test.ts` já reprova CRLF em `bin/**` — o shebang quebra com `bad interpreter`. Se o editor converter finais de linha, o teste avisa.
- **Bit de execução vem do índice do git**, não do sistema de arquivos: `git update-index --chmod=+x` é o que chega a quem clona. Um checkout Windows não tem modo POSIX.
- **`Dockerfile`, `compose.yaml` e `.dockerignore` não mudam.** Já estão corretos para este desenho.
- **Idioma:** identificadores, nomes de arquivo e IDs em inglês/neutro; prosa e mensagem de commit em português, no formato `tipo(ID): assunto`.

### Duas consequências de CI que aparecem no meio do plano

Não são surpresas: são efeitos previstos, e cada task diz o que esperar.

1. **`CI-4` passa a reprovar entre a Task 5 e a Task 7.** O `pay-when` de `TDR-0002` é o padrão `bin/living-docs` nos caminhos `README.md`, `CONTRIBUTING.md`, `docs/definition-of-done.md` e `.github/workflows/**`. Quando a Task 6 escreve a prosa, o gatilho se cumpre e `node src/cli/index.ts validate` reprova com *"TDR-0002 está `open` e o gatilho de pagamento já aconteceu"*. É **esperado**, e é a Task 7 que o resolve. Nenhuma task anterior deve tentar silenciar isso.
2. **A branch inteira precisa terminar na Task 7** antes de ir para revisão. Uma branch entregue na Task 6 tem CI vermelho por construção.

### Uma divergência deliberada da spec, e por quê

`M-6` diz, literalmente: *"Em `consumer-visible-paths`, `bin/dev` é somado a `bin/living-docs`"*. Isso não pode ser feito ao pé da letra, e o motivo já está travado num teste que existe hoje — `test/docs/release-history.test.ts`:

```ts
test('ADR-0006: as duas listas do mecanismo concordam, e um teste as impede de derivar', () => {
  const gatilhos = new Set(config.consumerVisiblePaths);
  const vigiados = new Set(
    config.watches.filter((watch) => watch.consumerVisible).map((watch) => watch.code),
  );
  assert.deepEqual([...vigiados].sort(), [...gatilhos].sort(), '…');
});
```

As duas listas são comparadas por **igualdade textual de conjunto**. Se `watches` passa a `bin/**` (como `M-6` também manda) e `consumer-visible-paths` fica com `bin/living-docs` + `bin/dev`, o teste reprova.

**O que este plano faz:** as duas listas ficam com `bin/**`. É a leitura que satisfaz o propósito de `M-6` e a redação de `M-8` (*"cobre `bin/dev`"* — cobertura, não igualdade literal), porque as duas listas são casadas por glob, com `picomatch`, tanto em `src/config/watches.ts` quanto em `src/checks/ci6-changelog-required.ts`. Verificado:

```
picomatch('bin/**')('bin/dev')          → true
picomatch('bin/**')('bin/living-docs')  → true
```

O efeito colateral é positivo e vale registrar: um wrapper futuro em `bin/` nasce coberto sem ninguém lembrar de acrescentá-lo às duas listas — o mesmo raciocínio da §2 da spec, aplicado ao mapa de propriedade.

---

## File Structure

| Arquivo | Responsabilidade | Task |
| --- | --- | --- |
| `docs/requirements/non-functional.md` | `RNF-0006` nasce; `RNF-0002` ganha uma linha em *fora de escopo* | 1 |
| `docs/decisions/adr/ADR-0016-caminho-de-execucao-conteinerizado-opcional.md` | A decisão, carregando `ADR-0015` em vez de supersedê-lo | 1 |
| `bin/dev` | Wrapper genérico: garante o container, garante as dependências, repassa `"$@"` | 2 |
| `bin/living-docs` | Delegação de uma linha para `bin/dev` — nenhuma lógica própria | 3 |
| `test/plugin/wrapper-docker.test.ts` | Trava a delegação e a invariante da §2, no host, em todo PR | 2, 3, 4 |
| `test/plugin/manifest.test.ts` | Passa a cobrir `bin/dev` na varredura de CRLF que já existe | 2 |
| `docs/.ownership.yml` | `bin/**` vigiado nos dois lugares | 4 |
| `.github/workflows/wrapper-docker.yml` | Exercita o caminho Docker quando alguém toca no que pode quebrá-lo | 5 |
| `docs/charter/constitution.md` | Princípio 6 emendado; `version: 3` | 6 |
| `README.md`, `CONTRIBUTING.md` | Os dois caminhos, host primeiro, Docker rotulado como opcional | 6 |
| `CHANGELOG.md` | A entrada de `## [Unreleased]` | 6 |
| `docs/decisions/debt/TDR-0002-wrapper-docker-orfao.md` | `status: paid` — a última coisa a mudar | 7 |

`docs/definition-of-done.md` **não muda**: o que o CI reproduz em todo PR é o host, e transformar o caminho Docker em critério de pronto criaria uma segunda barra que ninguém mede. `CODEOWNERS` **não muda**: ele espelha o campo `owner` dos artefatos de documentação, e `bin/**` é caminho vigiado, não artefato.

---

## Task 1: A regra e a decisão

A regra vem antes do código (`CLAUDE.md`). Nada nesta task toca `bin/`.

**Files:**
- Modify: `docs/requirements/non-functional.md` (acrescenta `RNF-0006` ao fim; edita a linha *fora de escopo* de `RNF-0002`)
- Create: `docs/decisions/adr/ADR-0016-caminho-de-execucao-conteinerizado-opcional.md`

**Interfaces:**
- Consumes: nada.
- Produces: os IDs `RNF-0006` e `ADR-0016`, citados por todas as tasks seguintes — nos testes (Task 2–4), nos comentários dos scripts (Task 2–3), no workflow (Task 5) e no charter (Task 6).

- [ ] **Step 1: Conferir que os IDs estão livres**

Nenhum ID é reciclado. `docs/ids-retired.txt` é a lista de retirados, e o maior ADR existente é o `0015`.

Run:
```bash
cat docs/ids-retired.txt
ls docs/decisions/adr/
grep -n '^## RNF-' docs/requirements/non-functional.md
```

Expected: `docs/ids-retired.txt` só tem comentários; o último ADR é `ADR-0015-execucao-no-node-do-host.md`; o último requisito não funcional é `RNF-0005`. Se algum dos três não bater, **pare** — o próximo número livre é outro, e este plano precisa ser corrigido antes de seguir.

- [ ] **Step 2: Acrescentar `RNF-0006` ao fim de `docs/requirements/non-functional.md`**

Acrescente, depois da seção `## RNF-0005 …`, deixando uma linha em branco de separação:

```markdown
## RNF-0006 — Existe um caminho de execução conteinerizado, opcional e em paridade com o host

- **status:** draft
- **relates-to:** ADR-0016
- **fora de escopo:** os hooks, que rodam sempre no host (`RNF-0001`)

Quem não quer instalar Node no host consegue rodar qualquer comando de
manutenção do toolkit dentro de um container. O conjunto de comandos que funciona
por esse caminho é o mesmo que funciona no host, e é assim porque o ponto de
entrada não conhece comando nenhum: ele repassa o que recebeu. Uma lista de
comandos suportados não existe, e o que não existe não diverge.

O caminho de registro continua sendo o host (`RNF-0002`): é ele que o CI
reproduz em todo PR e é ele que a Definition of Done mede.
```

- [ ] **Step 3: Emendar a linha *fora de escopo* de `RNF-0002`**

Em `docs/requirements/non-functional.md`, dentro da seção `## RNF-0002 …`, substitua **exatamente** esta linha:

```markdown
- **fora de escopo:** o `git`, e como o toolkit chega ao repositório de quem o consome (`DA-0003`)
```

por:

```markdown
- **fora de escopo:** o `git`; o caminho conteinerizado opcional de `RNF-0006`, que é alternativa e não exigência; e como o toolkit chega ao repositório de quem o consome (`DA-0003`)
```

O enunciado de `RNF-0002` **não é reescrito** e não muda de sentido: a palavra que carrega a frase continua sendo *exigido*.

- [ ] **Step 4: Escrever `docs/decisions/adr/ADR-0016-caminho-de-execucao-conteinerizado-opcional.md`**

Conteúdo completo do arquivo:

```markdown
---
id: ADR-0016
title: Caminho de execução conteinerizado opcional, paridade por delegação
status: draft
owner: '@esliph/engineering'
trigger: >
    Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-01
relates-to: [ADR-0015, ADR-0003, RNF-0006]
supersedes: null
superseded-by: null
---

# ADR-0016 — Caminho de execução conteinerizado opcional, paridade por delegação

## Contexto

`ADR-0015` moveu a execução para o `node` do host e, ao fazê-lo, deixou
`Dockerfile`, `compose.yaml` e `bin/living-docs` no repositório sem nenhum
documento, teste ou passo de CI que os invocasse — atalho consciente, registrado
em `TDR-0002`. O gatilho de pagamento daquela dívida é verificável: quando o
wrapper voltar a ser ensinado ou executado, ele precisa ou funcionar, ou sair.

Existe uma razão para ele voltar a funcionar. Uma máquina sem Node, ou com Node
mais velho que 24, é exatamente o caso que `ADR-0001` comprava e que `ADR-0015`
declarou perder. Um ambiente previsível e portátil para **manutenção** — rodar os
testes, o type-check, o CLI — é conveniência real de quem desenvolve, e o
repositório já carrega tudo que ela exige.

O que não pode voltar é a dependência do enforcement local no estado de um
daemon. Esse é o núcleo de `ADR-0015`, e é ele que decide o desenho.

## Alternativas consideradas

- **Superseder `ADR-0015` e voltar o container a ser o caminho de registro.**
  Descartada: reabriria `ADR-0001` pela porta dos fundos, e `ADR-0001` continua
  superseiado pelos motivos que `ADR-0015` registrou — hook com teto de 5 s que
  falha aberta não pode depender de um daemon, sob pena de o enforcement local
  desaparecer em silêncio.
- **Um par de wrappers, bash e PowerShell, com a mesma lógica escrita duas
  vezes.** Descartada: duas cópias de uma lógica divergem, e a divergência
  aparece na máquina de quem menos consegue diagnosticá-la. O `git` já é exigido
  pelo toolkit, e o Git for Windows traz o bash junto — no Windows invoca-se pelo
  Git Bash, pelo WSL, ou com `bash bin/dev …` a partir do PowerShell.
- **Exercitar o caminho Docker em todo PR.** Descartada: devolveria ao CI a
  construção de imagem que `ADR-0015` tirou de lá, cobrando minutos de todo PR
  para verificar um caminho opcional. O filtro por caminho custa zero no PR comum
  e cobre o que de fato pode quebrar.
- **Generalizar `bin/living-docs` em vez de criar `bin/dev`.** Descartada: o
  wrapper do CLI tem um contrato público — invocá-lo roda o CLI — e transformá-lo
  num executor genérico quebraria esse contrato para ganhar um arquivo a menos.

## Decisão

Existe um segundo caminho de execução, **opcional**: `bin/dev` roda qualquer
comando de manutenção dentro do container, e `bin/living-docs` passa a ser uma
delegação de uma linha para ele.

**Este ADR não supersede `ADR-0015`, e o motivo é de substância, não de forma.**
O núcleo daquela decisão é que o enforcement local não pode depender do estado de
um daemon. Os hooks **nunca** entram no container: `plugin/hooks/run-hook.sh`
continua invocando `node` no host, sem tocar em Docker. Enquanto isso for
verdade, aquele núcleo fica intacto, e este caminho é acréscimo, não reversão.
Registrar isto como supersessão diria que `ADR-0015` deixou de valer — e ele
vale, inteiro.

A paridade entre os dois caminhos não é mantida por disciplina: `bin/dev` não tem
subcomando, não tem tabela de comandos suportados, não valida `argv` e não traduz
nada. Uma lista de comandos que funcionam no Docker não pode divergir da lista do
host porque essa lista não está escrita em lugar nenhum. Um comando de manutenção
novo passa a funcionar nos dois caminhos no mesmo commit que o cria.

`ADR-0003` não é tocado. As duas raízes continuam distintas e continuam vindo das
mesmas fontes: dentro do container elas chegam por variável de ambiente do
`compose.yaml`, nunca pelo diretório de trabalho.

## Consequências

### O que se ganha

Uma máquina sem Node, ou com Node velho, volta a conseguir rodar os testes, o
type-check e o CLI — que era precisamente o que `ADR-0015` declarou perder — sem
que o enforcement local passe a depender de um daemon. `TDR-0002` é pago por
conserto: o arquivo morto volta a funcionar em vez de sair.

### O que se aceita perder

**O daemon do Docker vira dependência de quem escolhe esse caminho**, e a
primeira invocação constrói uma imagem, o que não é rápido.

**I/O em bind mount de caminho Windows é lento**, e este repositório mora no
OneDrive, o que agrava. `bin/dev npm test` é sensivelmente mais lento que
`npm test` no host. Isso não invalida o caminho; invalida a ideia de que ele seja
o padrão, e é uma razão a mais para a documentação ensinar o host primeiro.

**Um caminho de execução público a mais para manter**, com cobertura de CI
deliberadamente parcial: o workflow que o exercita dispara por filtro de caminho,
então uma quebra causada por algo fora da lista vigiada só aparece na próxima vez
que alguém tocar naquela lista.
```

- [ ] **Step 5: Rodar os testes e a validação**

Run:
```bash
npm test
npm run typecheck
node src/cli/index.ts validate
```

Expected: tudo passa. Em particular, `CI-2` resolve `RNF-0006`, `ADR-0016`, `ADR-0015` e `ADR-0003`; `CI-1` aceita o frontmatter do ADR novo; `CI-3` não cobra citação por teste, porque `RNF-0006` nasce `draft` e a cobertura por citação só é exigida de requisito `active`.

Se `CI-8` reclamar de link quebrado, o alvo citado está errado — confira o nome do arquivo do ADR.

- [ ] **Step 6: Commit**

```bash
git add docs/requirements/non-functional.md docs/decisions/adr/ADR-0016-caminho-de-execucao-conteinerizado-opcional.md
git commit -m "docs(RNF-0006): registra o caminho de execução conteinerizado opcional e a decisão ADR-0016, que carrega ADR-0015 sem supersedê-lo

Docs: none — a regra e a decisão são o próprio doc dono desta mudança.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

---

## Task 2: `bin/dev` — o wrapper genérico

**Files:**
- Create: `bin/dev`
- Create: `test/plugin/wrapper-docker.test.ts`
- Modify: `test/plugin/manifest.test.ts:147` (a varredura de CRLF passa a cobrir `bin/dev`)

**Interfaces:**
- Consumes: `RNF-0006` e `ADR-0016` (Task 1), citados nos comentários e nos testes.
- Produces: o contrato de `bin/dev` — `bin/dev <comando> [args…]` executa `<comando>` dentro do container com working dir `/opt/living-docs`, e `bin/dev` sem argumentos abre `bash` interativo. O código de saída do comando é o código de saída do wrapper. A variável de ambiente `LIVING_DOCS_CONTAINER` escolhe o container, com `esliph-claude-plugins` como padrão. A Task 3 depende deste contrato.

- [ ] **Step 1: Escrever os dois primeiros testes de estrutura**

Crie `test/plugin/wrapper-docker.test.ts`. Nesta task ele nasce com **dois** testes; o terceiro chega na Task 4.

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { toolkitRoot } from '../../src/core/roots.ts';

const ROOT = toolkitRoot();

function source(relative: string): string {
  return readFileSync(join(ROOT, relative), 'utf8');
}

/**
 * O bit de execução vem do índice do git, não do sistema de arquivos: um
 * checkout Windows não tem modo POSIX, e o que chega a quem clona é o modo
 * versionado. Mesma escolha de `test/plugin/manifest.test.ts`.
 */
function gitMode(relative: string): string {
  const entry = execFileSync('git', ['ls-files', '-s', '--', relative], { cwd: ROOT, encoding: 'utf8' });
  return entry.split(/\s+/)[0] ?? '';
}

test('RNF-0006: bin/dev é executável e não enumera comando nenhum', () => {
  assert.equal(gitMode('bin/dev'), '100755', 'bin/dev precisa estar versionado como executável');

  const wrapper = source('bin/dev');

  assert.match(wrapper, /"\$@"/, 'o wrapper repassa os argumentos que recebeu');
  assert.match(wrapper, /exec\s+docker\s+exec/, 'o comando substitui o wrapper — é assim que o código de saída é o do comando');

  // A invariante da spec §2, verificada em vez de prometida: uma tabela de
  // subcomandos é exatamente o que não pode existir aqui, porque é ela que
  // divergiria da lista do host.
  assert.doesNotMatch(wrapper, /\bcase\s+"?\$\{?[1@]/, 'tabela de subcomandos: a lista que diverge do host começa assim');
  assert.doesNotMatch(
    wrapper,
    /src\/cli\/index\.ts/,
    'bin/dev não conhece o CLI — quem o conhece é bin/living-docs',
  );
});

test('RNF-0006: bin/dev deriva a raiz do próprio caminho e respeita LIVING_DOCS_CONTAINER', () => {
  const wrapper = source('bin/dev');

  assert.match(
    wrapper,
    /LIVING_DOCS_CONTAINER:-esliph-claude-plugins/,
    'o nome do container vem do ambiente, com o padrão que bin/living-docs já publica',
  );
  assert.match(
    wrapper,
    /BASH_SOURCE\[0\]/,
    'a raiz do repositório sai do caminho do próprio script (ADR-0003), nunca do diretório de trabalho',
  );
});
```

- [ ] **Step 2: Rodar os testes para vê-los falhar**

Run: `node --test "test/plugin/wrapper-docker.test.ts"`

Expected: FAIL. As duas asserções morrem antes de asserção nenhuma, no `readFileSync` de `bin/dev` — `ENOENT: no such file or directory`. É o esperado: o arquivo ainda não existe.

- [ ] **Step 3: Escrever `bin/dev`**

Conteúdo completo do arquivo:

```bash
#!/usr/bin/env bash
# Caminho de execução conteinerizado, opcional (RNF-0006, ADR-0016). Roda
# qualquer comando de manutenção dentro do container descrito por compose.yaml.
#
# Este wrapper não conhece comando nenhum: não tem subcomando, não valida argv e
# não traduz nada. É essa ignorância que faz a paridade com o host existir sem
# uma lista de comandos suportados para manter — a lista não existe.
#
# O caminho de registro continua sendo o node do host (RNF-0002, ADR-0015), e os
# hooks nunca passam por aqui: plugin/hooks/run-hook.sh invoca node direto.
set -euo pipefail

CONTAINER="${LIVING_DOCS_CONTAINER:-esliph-claude-plugins}"

# Um nível acima de bin/ — mesma derivação que plugin/hooks/run-hook.sh faz com
# dois níveis, porque aquele script está mais fundo (ADR-0003: a raiz sai do
# caminho do próprio arquivo, nunca do diretório de trabalho de quem chamou).
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

# Garantir o container. Na primeira vez isto constrói a imagem; nas seguintes é
# quase instantâneo. O efeito colateral é deliberado: em troca dele some o modo
# de falha "container parado", que devolvia exit 2 sem fazer nada.
if [ "$(docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null)" != "true" ]; then
  docker compose -f "$ROOT/compose.yaml" up -d >&2
fi

# `-t` só quando stdin é um terminal: com um pipe na entrada, o docker exec
# recusa a alocação. A expansão com `+` é o que mantém o array vazio compatível
# com `set -u`.
TTY=()
if [ -t 0 ]; then TTY=(-t); fi

# Sem argumentos, o wrapper é o workspace: um shell dentro do container.
if [ "$#" -eq 0 ]; then
  exec docker exec -i ${TTY[@]+"${TTY[@]}"} -w /opt/living-docs "$CONTAINER" bash
fi

# O bootstrap acontece dentro do mesmo exec, sem round-trip extra: compose.yaml
# monta node_modules como volume nomeado e nada o popula, então mesmo com o
# container de pé o CLI quebraria por falta de `yaml` e `picomatch`.
#
# O `>&2` não é cosmético: a saída do npm ci não pode contaminar o stdout de um
# comando cuja saída alguém lê.
#
# O working dir é /opt/living-docs porque é onde npm faz sentido. O CLI continua
# validando /workspace porque LIVING_DOCS_REPO_ROOT vem do compose.yaml — a
# separação de ADR-0003 segue vindo de variável de ambiente, nunca do cwd.
exec docker exec -i ${TTY[@]+"${TTY[@]}"} -w /opt/living-docs "$CONTAINER" \
  bash -c '[ -d node_modules/yaml ] || npm ci >&2; exec "$@"' -- "$@"
```

- [ ] **Step 4: Marcar o bit de execução no índice do git**

O teste lê o modo versionado, não o do sistema de arquivos. Num checkout Windows, escrever o arquivo não basta.

Run:
```bash
git add bin/dev
git update-index --chmod=+x bin/dev
git ls-files -s -- bin/dev
```

Expected: a saída começa com `100755`.

- [ ] **Step 5: Acrescentar `bin/dev` à varredura de CRLF que já existe**

Em `test/plugin/manifest.test.ts`, no teste `RNF-0002: nenhum script executável carrega CR`, substitua **exatamente** esta linha:

```ts
  for (const relative of ['bin/living-docs', 'plugin/hooks/run-hook.sh']) {
```

por:

```ts
  for (const relative of ['bin/dev', 'bin/living-docs', 'plugin/hooks/run-hook.sh']) {
```

- [ ] **Step 6: Rodar os testes para vê-los passar**

Run:
```bash
node --test "test/plugin/wrapper-docker.test.ts" "test/plugin/manifest.test.ts"
npm test
npm run typecheck
```

Expected: PASS em tudo. Se o teste de CRLF reprovar em `bin/dev`, o editor converteu os finais de linha — reescreva o arquivo com LF.

- [ ] **Step 7: Commit**

```bash
git add bin/dev test/plugin/wrapper-docker.test.ts test/plugin/manifest.test.ts
git commit -m "feat(RNF-0006): cria bin/dev, o wrapper genérico que repassa qualquer comando para dentro do container

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

---

## Task 3: `bin/living-docs` vira delegação

É por conserto, não por remoção, que `TDR-0002` será pago: o wrapper deixa de exigir container previamente subido, deixa de sair com código 2, e volta a ser invocável.

**Files:**
- Modify: `bin/living-docs` (o arquivo inteiro é substituído)
- Modify: `test/plugin/wrapper-docker.test.ts` (acrescenta o teste da delegação)

**Interfaces:**
- Consumes: o contrato de `bin/dev` da Task 2 — `bin/dev <comando> [args…]` executa dentro do container, com working dir `/opt/living-docs`.
- Produces: `bin/living-docs [args…]` roda `node src/cli/index.ts [args…]` dentro do container. O contrato público não muda; muda o que acontece quando o container não está de pé.

- [ ] **Step 1: Escrever o teste da delegação**

Acrescente ao fim de `test/plugin/wrapper-docker.test.ts`:

```ts
test('RNF-0006: bin/living-docs delega a bin/dev, sem lógica de container própria', () => {
  assert.equal(gitMode('bin/living-docs'), '100755', 'bin/living-docs precisa continuar executável');

  const wrapper = source('bin/living-docs');

  assert.match(wrapper, /\/dev\b/, 'o wrapper do CLI invoca bin/dev');
  assert.match(wrapper, /node\s+src\/cli\/index\.ts/, 'e é ele, não bin/dev, que conhece o CLI');

  // O teste que impede a duplicação de lógica voltar: toda conversa com o
  // daemon mora em bin/dev, e um segundo lugar que a tenha é um segundo lugar
  // para divergir.
  assert.doesNotMatch(
    wrapper,
    /docker\s+(exec|inspect|compose)/,
    'lógica de container duplicada — ela pertence a bin/dev (ADR-0016)',
  );

  // O modo de falha que TDR-0002 descreveu: sair 2 porque o container não está
  // de pé. bin/dev sobe o container; ninguém mais precisa recusar-se a rodar.
  assert.doesNotMatch(wrapper, /exit\s+2\b/, 'o container ausente deixou de ser modo de falha (E-2)');
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `node --test "test/plugin/wrapper-docker.test.ts"`

Expected: FAIL em `RNF-0006: bin/living-docs delega a bin/dev, sem lógica de container própria`, com a mensagem `lógica de container duplicada — ela pertence a bin/dev (ADR-0016)` — o arquivo atual ainda tem `docker inspect` e `docker exec` próprios. Os testes da Task 2 continuam passando.

- [ ] **Step 3: Reescrever `bin/living-docs`**

Substitua o conteúdo **inteiro** do arquivo por:

```bash
#!/usr/bin/env bash
# Roda o CLI do toolkit pelo caminho conteinerizado opcional (RNF-0006).
# Delegação, não implementação: toda a conversa com o daemon mora em bin/dev, e
# um segundo lugar que a tivesse seria um segundo lugar para divergir (ADR-0016).
#
# No host, o comando equivalente é `node src/cli/index.ts …`, e é ele que o CI
# reproduz em todo PR (RNF-0002).
exec "$(dirname "${BASH_SOURCE[0]}")/dev" node src/cli/index.ts "$@"
```

Sem `set -euo pipefail`: a linha é um `exec`, e não há nada depois dele para proteger.

- [ ] **Step 4: Rodar os testes para vê-los passar**

Run:
```bash
node --test "test/plugin/wrapper-docker.test.ts"
npm test
npm run typecheck
```

Expected: PASS. Confira também que o modo continua `100755`:

```bash
git ls-files -s -- bin/living-docs
```

Expected: começa com `100755`. Se o arquivo perdeu o bit, `git update-index --chmod=+x bin/living-docs`.

- [ ] **Step 5: Commit**

```bash
git add bin/living-docs test/plugin/wrapper-docker.test.ts
git commit -m "fix(RNF-0006): bin/living-docs vira delegação de uma linha para bin/dev e deixa de exigir container previamente subido

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

---

## Task 4: O mapa de propriedade

**Files:**
- Modify: `docs/.ownership.yml:193` (a regra de `watches`) e `:204` (a lista `consumer-visible-paths`)
- Modify: `test/plugin/wrapper-docker.test.ts` (o terceiro teste)

**Interfaces:**
- Consumes: `bin/dev` (Task 2) e `bin/living-docs` (Task 3), que precisam existir para a cobertura significar alguma coisa.
- Produces: `bin/**` vigiado nos dois lugares — o que faz `HK-4`, `HK-5`, `CI-6` e `CI-7` cobrarem `CHANGELOG.md` de qualquer mudança em `bin/`. A Task 6 depende disso: é essa regra que exige a entrada de `## [Unreleased]`.

**Leia antes:** a seção *"Uma divergência deliberada da spec, e por quê"*, no topo deste plano. As duas listas vão para `bin/**`, não para `bin/living-docs` + `bin/dev`.

- [ ] **Step 1: Escrever o teste de cobertura**

Acrescente ao fim de `test/plugin/wrapper-docker.test.ts`. Note os imports novos no topo do arquivo — acrescente-os junto:

```ts
import picomatch from 'picomatch';
import { loadOwnership } from '../../src/config/ownership.ts';
import { watchesFor } from '../../src/config/watches.ts';
```

E o teste:

```ts
test('RNF-0006: docs/.ownership.yml cobre bin/dev em watches e em consumer-visible-paths', () => {
  const config = loadOwnership(ROOT);

  // Mecanismo 1: quem toca bin/dev leva o doc dono no mesmo commit.
  const matches = watchesFor(config, ['bin/dev']);
  assert.deepEqual(
    matches.map((match) => match.doc),
    ['CHANGELOG.md'],
    'bin/dev é ponto de entrada público e precisa de doc dono declarado',
  );
  assert.equal(matches[0]?.consumerVisible, true, 'a mudança é visível a quem consome (CI-6)');

  // A mesma cobertura pelo lado de CI-6, que lê a lista de globs.
  assert.ok(
    picomatch(config.consumerVisiblePaths)('bin/dev'),
    'bin/dev fora de consumer-visible-paths: CI-6 não cobraria a entrada de CHANGELOG',
  );

  // E o wrapper que já existia não pode ter sido descoberto no caminho.
  assert.ok(picomatch(config.consumerVisiblePaths)('bin/living-docs'));
});
```

- [ ] **Step 2: Rodar o teste para vê-lo falhar**

Run: `node --test "test/plugin/wrapper-docker.test.ts"`

Expected: FAIL em `RNF-0006: docs/.ownership.yml cobre bin/dev …`, com `AssertionError` na primeira asserção — `watchesFor(config, ['bin/dev'])` devolve `[]`, porque a regra vigente é o caminho literal `bin/living-docs`.

- [ ] **Step 3: Alargar a regra de `watches`**

Em `docs/.ownership.yml`, substitua **exatamente** este bloco:

```yaml
  - code: "bin/living-docs"
    doc: CHANGELOG.md
    consumer-visible: true
    reason: "o wrapper é um ponto de entrada público do toolkit — mudar como se invoca muda o que quem consome usa"
```

por:

```yaml
  - code: "bin/**"
    doc: CHANGELOG.md
    consumer-visible: true
    reason: "o wrapper é um ponto de entrada público do toolkit — mudar como se invoca muda o que quem consome usa"
```

A `reason` não muda: o motivo escrito ali vale igual para `bin/dev`.

- [ ] **Step 4: Alargar `consumer-visible-paths`**

No mesmo arquivo, na lista `consumer-visible-paths`, substitua **exatamente**:

```yaml
  - "bin/living-docs"
```

por:

```yaml
  - "bin/**"
```

As duas listas precisam ser o mesmo conjunto, palavra por palavra: `test/docs/release-history.test.ts` compara `consumer-visible-paths` com os `code` das regras marcadas `consumer-visible: true` por igualdade de conjunto, e é esse teste que as impede de derivar.

- [ ] **Step 5: Rodar os testes para vê-los passar**

Run:
```bash
node --test "test/plugin/wrapper-docker.test.ts" "test/docs/release-history.test.ts" "test/config/ownership.test.ts"
npm test
npm run typecheck
node src/cli/index.ts validate
```

Expected: PASS em tudo, e `validate` limpo. Se `ADR-0006: as duas listas do mecanismo concordam` reprovar, os Steps 3 e 4 não escreveram o mesmo glob — corrija antes de seguir.

- [ ] **Step 6: Commit**

```bash
git add docs/.ownership.yml test/plugin/wrapper-docker.test.ts
git commit -m "docs(RNF-0006): o caminho vigiado passa a ser bin/**, cobrindo bin/dev nos dois lados do mecanismo

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

---

## Task 5: O workflow que exercita o caminho Docker

Os testes das tasks 2 a 4 cobrem a **estrutura**, no host, em todo PR. Este workflow cobre a **execução**, e só quando ela pode ter quebrado. Os dois se completam.

**Files:**
- Create: `.github/workflows/wrapper-docker.yml`

**Interfaces:**
- Consumes: `bin/dev` (Task 2) e o contrato dele — working dir `/opt/living-docs`, `LIVING_DOCS_REPO_ROOT=/workspace` vindo do `compose.yaml`.
- Produces: nada que outra task consuma. Mas cumpre metade do gatilho de pagamento de `TDR-0002` (`.github/workflows/**` é um dos caminhos do `pay-when`) — o que a Task 7 fecha.

- [ ] **Step 1: Escrever `.github/workflows/wrapper-docker.yml`**

Conteúdo completo do arquivo:

```yaml
name: wrapper-docker

# Arquivo separado de living-docs.yml de propósito: o filtro `paths` do GitHub
# Actions é por workflow e não por job, e condicionar um job dentro do workflow
# existente exigiria uma action de terceiros para nada (ADR-0016).
#
# O efeito no PR comum é zero: nenhum build de imagem, nenhum minuto a mais. O
# caminho conteinerizado só é exercitado quando alguém toca no que pode
# quebrá-lo (RNF-0006).
on:
  push:
    paths: &wrapper-paths
      - 'Dockerfile'
      - 'compose.yaml'
      - '.dockerignore'
      - 'bin/**'
      - 'package.json'
      - 'package-lock.json'
      - '.github/workflows/wrapper-docker.yml'
  pull_request:
    paths: *wrapper-paths

jobs:
  wrapper:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      # A primeira invocação de bin/dev subiria o container sozinha (E-2). Subir
      # aqui, em passo próprio, mantém o tempo de build atribuível: uma falha de
      # imagem não se disfarça de falha de teste.
      - name: Subir o container
        run: docker compose up -d

      # Pelo wrapper, o que o host já roda. Nenhum dos dois comandos está escrito
      # dentro de bin/dev — é essa a paridade que RNF-0006 enuncia.
      - name: Testes, pelo wrapper
        run: bin/dev npm test

      - name: CI-1 a CI-4, CI-7, CI-8 e CI-10 — documentação viva, pelo wrapper
        run: bin/dev node src/cli/index.ts validate
```

Se o âncora YAML (`&wrapper-paths` / `*wrapper-paths`) for recusado pelo parser do GitHub Actions no primeiro push, escreva a lista duas vezes, literalmente — a duplicação é chata mas inofensiva, e não é hora de gastar a entrega nisso.

- [ ] **Step 2: Conferir que o workflow é YAML válido e que a lista de caminhos casa**

Run:
```bash
node -e "const {parse}=require('yaml');const {readFileSync}=require('fs');const w=parse(readFileSync('.github/workflows/wrapper-docker.yml','utf8'));console.log(JSON.stringify(w.on,null,2));console.log(w.jobs.wrapper.steps.map(s=>s.run??s.uses));"
```

Expected: `on.push.paths` e `on.pull_request.paths` saem com as mesmas seis entradas mais o próprio arquivo do workflow, e os passos saem como `actions/checkout@v4`, `docker compose up -d`, `bin/dev npm test`, `bin/dev node src/cli/index.ts validate`.

- [ ] **Step 3: Rodar os testes e a validação**

Run:
```bash
npm test
npm run typecheck
node src/cli/index.ts validate
```

Expected: PASS, e `validate` ainda limpo. **`CI-4` ainda não reprova aqui**: o `pay-when` de `TDR-0002` procura o padrão literal `bin/living-docs`, e este workflow usa `bin/dev`. O gatilho se cumpre na Task 6, com a prosa.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/wrapper-docker.yml
git commit -m "ci(RNF-0006): acrescenta o workflow condicional por caminho que exercita o caminho Docker pelo wrapper

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

---

## Task 6: O charter, a prosa e o `CHANGELOG`

**Files:**
- Modify: `docs/charter/constitution.md` (princípio 6, `version: 3`, log de emendas)
- Modify: `CONTRIBUTING.md` (bloco irmão sob `## O ambiente`)
- Modify: `README.md` (bloco irmão sob `## Desenvolvimento`)
- Modify: `CHANGELOG.md` (`## [Unreleased]`: uma entrada em `### Added`, uma em `### Changed`, e a correção de uma entrada que esta mudança tornou falsa)

**Interfaces:**
- Consumes: `bin/dev` e `bin/living-docs` (Tasks 2–3), `RNF-0006` e `ADR-0016` (Task 1), e a regra `bin/**` de `watches` (Task 4), que é quem exige a entrada de `CHANGELOG.md`.
- Produces: o gatilho de pagamento de `TDR-0002` cumprido — o padrão `bin/living-docs` passa a aparecer em `README.md` e `CONTRIBUTING.md`. A Task 7 depende disso.

**Esperado ao fim desta task:** `node src/cli/index.ts validate` **reprova** com o achado de `CI-4` sobre `TDR-0002`. Não silencie, não contorne: é a Task 7.

- [ ] **Step 1: Emendar o princípio 6 da Constitution**

Em `docs/charter/constitution.md`, substitua **exatamente** esta linha:

```markdown
6. O toolkit roda no Node do host, sem passo de build — verificado por `test/plugin/manifest.test.ts` (`RNF-0002`) e pelo workflow, que instala Node e npm e nada além.
```

por:

```markdown
6. O toolkit roda no Node do host, sem passo de build — verificado por `test/plugin/manifest.test.ts` (`RNF-0002`) e pelo workflow `living-docs`, que instala Node e npm e nada além. O caminho conteinerizado de `RNF-0006` é opcional, e não é a execução de registro.
```

A afirmação não muda — a execução de registro é o host, e não há passo de build. O que a emenda faz é tirar a ambiguidade que um segundo workflow, que constrói imagem, criaria na cláusula final. Todo princípio precisa continuar casando `/verificado por/`: `test/docs/language-and-intent.test.ts` cobra isso.

- [ ] **Step 2: Subir `version` para 3 e acrescentar a linha ao log de emendas**

No frontmatter do mesmo arquivo, substitua:

```yaml
version: 2
```

por:

```yaml
version: 3
```

E atualize `last-reviewed` para `2026-09-01` se ainda não estiver.

Ao fim de `## Log de emendas`, acrescente:

```markdown
- 2026-09-01 — v3 — O princípio 6 nomeia o workflow `living-docs` como a verificação de registro e declara opcional o caminho conteinerizado de `RNF-0006` — humana, acompanhando `ADR-0016`, que carrega `ADR-0015` sem supersedê-lo.
```

**Emenda de charter é ato humano.** O agente escreve a proposta e para aqui: quem promove é quem pediu. Se você é um agente executando este plano, escreva a mudança, diga em voz alta que ela precisa de aprovação humana, e siga — mas não a apresente como aceita.

- [ ] **Step 3: Acrescentar o bloco irmão a `CONTRIBUTING.md`**

Em `CONTRIBUTING.md`, na seção `## O ambiente`, **abaixo** do parágrafo que termina em *"não é o ambiente que está errado."* e **acima** de `## O ciclo`, acrescente:

````markdown
### Opcional: rodar pelo container

Quem não quiser instalar Node na máquina tem um segundo caminho (`RNF-0006`,
`ADR-0016`). `bin/dev` roda qualquer comando de manutenção dentro do container, e
sobe o container sozinho quando ele não está de pé:

```bash
bin/dev npm test
bin/dev npm run typecheck
bin/dev node src/cli/index.ts validate
bin/living-docs validate     # o mesmo, pelo wrapper do CLI
bin/dev                      # um shell dentro do container
```

Exige o daemon do Docker, e a primeira invocação constrói a imagem. No Windows,
invoque pelo Git Bash, pelo WSL, ou com `bash bin/dev …` a partir do PowerShell.

Duas coisas que este caminho **não** é. Ele não é a execução de registro: o que
o CI reproduz em todo PR e o que a Definition of Done mede continua sendo o host.
E ele não cobre os hooks, que rodam sempre no host (`RNF-0001`) — numa máquina
sem Node, o enforcement local não existe, e essa é a mesma perda que `ADR-0015`
já declarou.
````

- [ ] **Step 4: Acrescentar o bloco irmão a `README.md`**

Em `README.md`, na seção `## Desenvolvimento`, **abaixo** da linha *"Para contribuir, veja `CONTRIBUTING.md`."*, acrescente:

````markdown
### Opcional: sem Node no host

Há um segundo caminho de execução, para quem prefere um ambiente previsível a
instalar Node (`RNF-0006`). `bin/dev` recebe um comando e o roda dentro do
container, subindo-o quando preciso:

```bash
bin/dev npm test
bin/dev node src/cli/index.ts validate
bin/living-docs validate     # o mesmo, pelo wrapper do CLI
```

O padrão continua sendo o host: o bind mount é sensivelmente mais lento, e os
ganchos do plugin rodam sempre no `node` da máquina — numa máquina sem Node, o
plugin não bloqueia nada.
````

- [ ] **Step 5: Escrever as entradas de `CHANGELOG.md`**

Em `## [Unreleased]`, ao fim de `### Added`, acrescente:

```markdown
- `bin/dev`: ponto de entrada opcional que roda qualquer comando de manutenção
  dentro do container do repositório, subindo-o e instalando as dependências
  quando preciso — `bin/dev npm test`, `bin/dev node src/cli/index.ts validate`,
  ou `bin/dev` sozinho para um shell. Exige o daemon do Docker; o caminho de
  registro continua sendo o Node do host (`RNF-0006`, `ADR-0016`).
```

Ao fim de `### Changed`, acrescente:

```markdown
- `bin/living-docs` deixa de exigir que o container já esteja de pé e deixa de
  sair com código 2 quando ele não está: agora delega a `bin/dev`, que sobe o
  container antes de executar. O que se invoca não mudou; o que acontece com o
  ambiente parado, sim.
```

- [ ] **Step 6: Corrigir a entrada de `### Changed` que esta mudança tornou falsa**

Ainda em `## [Unreleased]`, na entrada que começa por *"O toolkit passa a rodar no Node do host"*, substitua **exatamente** este trecho:

```markdown
  container não está de pé. `compose.yaml`, `Dockerfile` e `./bin/living-docs`
  continuam no repositório, mas nada mais os invoca — registrado em `ADR-0015` e
  `TDR-0002`.
```

por:

```markdown
  container não está de pé. `compose.yaml`, `Dockerfile` e `./bin/living-docs`
  continuam no repositório, agora como o caminho de execução opcional descrito
  acima — registrado em `ADR-0015` e `ADR-0016`.
```

A entrada ainda está em `## [Unreleased]`, então corrigi-la não é reescrever história publicada: é impedir que a mesma release afirme duas coisas contraditórias sobre o mesmo arquivo.

- [ ] **Step 7: Rodar os testes e a validação, e confirmar o achado esperado**

Run:
```bash
npm test
npm run typecheck
node src/cli/index.ts validate
```

Expected: `npm test` e `npm run typecheck` **passam**. `validate` **reprova**, com um achado de `CI-4` cuja mensagem é da forma:

```
TDR-0002 está `open` e o gatilho de pagamento já aconteceu: <arquivo>:<linha> casa `bin/living-docs`.
```

É esse achado que confirma que a Task 6 fez o que devia. Se ele **não** aparecer, o padrão `bin/living-docs` não chegou a `README.md` nem a `CONTRIBUTING.md` — releia os Steps 3 e 4 antes de seguir.

Se aparecer **qualquer outro** achado, ele não é esperado: resolva antes do commit.

- [ ] **Step 8: Commit**

```bash
git add docs/charter/constitution.md CONTRIBUTING.md README.md CHANGELOG.md
git commit -m "docs(ADR-0016): ensina os dois caminhos com o host primeiro, emenda o princípio 6 para v3 e registra a mudança no CHANGELOG

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

---

## Task 7: `TDR-0002` a `paid`

**Esta é a última mudança, e é deliberadamente a última.** Marcar a dívida como paga antes de o wrapper funcionar seria registrar como fato algo que ainda não é.

**Files:**
- Modify: `docs/decisions/debt/TDR-0002-wrapper-docker-orfao.md` (só o frontmatter)

**Interfaces:**
- Consumes: tudo. O wrapper funciona (Tasks 2–3), é ensinado (Task 6) e é executado por um workflow (Task 5).
- Produces: `validate` limpo — o estado em que a branch pode ir para revisão.

- [ ] **Step 1: Parar e pedir a confirmação humana**

`paid` é estado congelado (`FROZEN_STATUSES` em `src/docs/schema.ts`), e `CLAUDE.md` é explícito: *"Você não aceita decisão. Skill escreve `draft`/`open`; promover é ato humano."*

Se você é um agente executando este plano, **pare aqui** e pergunte, em texto, algo com este conteúdo:

> `TDR-0002` está `open` e o gatilho que ele mesmo declarou se cumpriu: `bin/living-docs` voltou a ser ensinado em `README.md` e `CONTRIBUTING.md`, e o caminho é exercitado por `.github/workflows/wrapper-docker.yml`. O wrapper deixou de ser arquivo morto — passou a funcionar, por conserto e não por remoção. Posso marcá-lo como `paid`?

Uma nota sobre o mecanismo, para você não se enganar com o silêncio dos hooks: `HK-3` **não** vai interceptar esta edição. A allowlist `HUMAN_PROMOTIONS` cobre `draft → accepted`, `open → resolved`, `draft → active`, `active → revoked` e `draft → published`; `open → paid` não está lá. `HK-1` também não bloqueia, porque `status` é campo mutável de `TDR` e o estado atual ainda não é congelado. A ausência de um hook perguntando **não** é permissão — a política de `CLAUDE.md` vale igual, e é ela que manda aqui.

Só siga para o Step 2 com a resposta explícita da pessoa.

- [ ] **Step 2: Mudar `status` e `last-reviewed`**

Em `docs/decisions/debt/TDR-0002-wrapper-docker-orfao.md`, no frontmatter, substitua:

```yaml
status: open
```

por:

```yaml
status: paid
```

E confira que `last-reviewed: 2026-09-01` está lá.

**Só o frontmatter muda.** O corpo do TDR — o atalho, por que foi aceito, o gatilho, o custo de continuar devendo — é o registro histórico do que se aceitou dever, e ele continua verdadeiro sobre o período em que a dívida existiu. Não o reescreva.

Os campos `relates-to` também não mudam: `[ADR-0015, RNF-0002]` descreve o contexto em que a dívida nasceu. `ADR-0016` cita `TDR-0002` pelo texto, não por par bidirecional, e `CI-3` só fecha pares para `supersedes`/`superseded-by` e `revokes`/`revoked-by`.

- [ ] **Step 3: Rodar tudo e confirmar que o achado sumiu**

Run:
```bash
npm test
npm run typecheck
node src/cli/index.ts validate
node src/cli/index.ts drift
node src/cli/index.ts changelog --base origin/master
node src/cli/index.ts validate --base origin/master
```

Expected: **todos passam**. O achado de `CI-4` sobre `TDR-0002` desapareceu, porque a dívida deixou de estar `open`. `CI-6` está satisfeito pelas entradas escritas na Task 6, e `CI-7` pelo mapa de propriedade da Task 4.

Se `CI-9` reclamar de mensagem de commit sem ID citado, o commit do Step 4 é onde isso se corrige — cite `TDR-0002`.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/debt/TDR-0002-wrapper-docker-orfao.md
git commit -m "docs(TDR-0002): marca a dívida como paga — o wrapper voltou a funcionar, por conserto

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01J9EWhngovR8oYumsGik53a"
```

- [ ] **Step 5: Conferir a Definition of Done**

Leia `docs/definition-of-done.md` de ponta a ponta e confira cada caixa contra o que esta branch fez. As que exigem julgamento humano — a ordem regra-antes-do-código, a decisão que virou ADR, ninguém ter errado por falta de contexto — são para a pessoa marcar, não para o agente afirmar.

---

## O que este plano deliberadamente não faz

- **Não supersede `ADR-0015`**, e não reabre `ADR-0001`. Os hooks nunca entram no container, e é isso que garante o resto.
- **Não toca `ADR-0003`.** As duas raízes continuam distintas e continuam vindo das mesmas fontes.
- **Não resolve `DA-0003`** (como o toolkit chega a um repositório consumidor). Publicar imagem continua sendo decisão futura.
- **Não muda `docs/definition-of-done.md`.** Docker é conveniência de quem desenvolve, não é a verificação de registro.
- **Não muda `Dockerfile`, `compose.yaml` nem `.dockerignore`.** Já estão corretos para este desenho, e é essa a razão de a entrega ser pequena.
- **Não muda `CODEOWNERS`.** Ele espelha o campo `owner` dos artefatos de documentação, e `bin/**` é caminho vigiado, não artefato.
- **Não promove nada.** `RNF-0006` e `ADR-0016` nascem `draft`, a Constitution v3 é proposta escrita e `TDR-0002` só vai a `paid` com resposta explícita de uma pessoa.
