# Execução no Node do host — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrar a execução do toolkit do container para o Node e o npm do host, e deixar nenhum documento vivo mencionando Docker.

**Architecture:** Nada em `src/` muda — `toolkitRoot()` e `repoRoot()` já são independentes de container. O que muda é quem invoca: o wrapper de hooks passa a chamar `node` direto derivando a raiz do toolkit do próprio caminho, o CI troca `docker compose` por `actions/setup-node` + `npm ci`, e os documentos, testes e fixtures que **afirmam** o container passam a afirmar o host. Docker sobrevive como wrapper órfão registrado como dívida.

**Tech Stack:** Node ≥ 24 (type-stripping nativo, sem build step), npm, `node:test`, TypeScript com `tsc --noEmit`, GitHub Actions, bash.

**Spec:** `docs/superpowers/specs/2026-09-01-execucao-no-host-design.md`

## Global Constraints

- **Data de hoje: `2026-09-01`.** Todo `last-reviewed` e toda linha de log de emendas criados por este plano usam essa data.
- **`npm ci` na raiz do checkout é pré-requisito de toda verificação** (spec §4). `node_modules/` está vazio porque o `compose.yaml` o monta como volume nomeado. Nenhuma falha pode ser interpretada antes de o `npm ci` ter rodado.
- **`src/` não é tocado.** Nenhum arquivo sob `src/` muda neste plano. `ADR-0003` sai intacto, sem supersessão.
- **`Dockerfile`, `compose.yaml`, `.dockerignore` e `bin/living-docs` ficam intactos** (`E-1`, spec §3). Não são apagados, não são editados.
- **Registro histórico não é reescrito** (`E-2`): `docs/superpowers/plans/` (exceto este arquivo novo), `docs/superpowers/research/`, os ADRs anteriores no corpo e as entradas antigas do `CHANGELOG.md` ficam como estão.
- **`RNF-0002` é reescrito no lugar, mantendo o ID** (`E-3`). Não se cria `RNF-0006`, não se marca `revoked`.
- **ADR novo nasce `status: draft`.** Promover para `accepted` é ato humano; `HK-3` intercepta. Nenhuma tarefa deste plano promove estado.
- **Mensagem de commit em português, no formato `tipo(ID): assunto`**, citando o ID afetado (`CI-9`).
- **Idioma:** identificadores, nomes de arquivo e IDs em inglês/neutro; prosa e comentários em português.
- **Ocorrências de "container" em `src/` que nomeiam o *arquivo-container de uma coleção*** (`CONTAINER_REQUIRED_FIELDS`, `isContainer`, os comentários de `src/checks/ci1-structure.ts`, `src/checks/ci4-staleness.ts`, `src/checks/ci10-trigger-routing.ts`, `src/docs/schema.ts`) **são outra palavra e ficam.**
- **`CI-6` compara `<base>...HEAD`**, o diff inteiro da branch. A entrada de `CHANGELOG.md` da Tarefa 11 cobre os commits de todas as tarefas anteriores que tocam `plugin/**` e `.github/workflows/**` — ela não precisa vir antes deles, precisa vir **na mesma branch**.

## Linha de base medida no host (2026-09-01)

Antes de qualquer mudança, com `npm ci` já rodado e o glob de `npm test` corrigido (Tarefa 1):

```
ℹ tests 520
ℹ pass 516
ℹ fail 4
```

As quatro falhas, e qual tarefa fecha cada uma:

| Teste que falha | Arquivo | Fechado por |
| --- | --- | --- |
| `RF-0006: o contrato gerado deste repositório não derivou` | `test/contracts/drift.test.ts:11` | Tarefa 5 (`M-6`) |
| `RNF-0003: repoRoot respeita LIVING_DOCS_REPO_ROOT e não move toolkitRoot` | `test/core/roots.test.ts:12` | Tarefa 2 (falha de plataforma, não prevista pela spec) |
| `RNF-0003: o container declara as duas raízes, e elas são distintas` | `test/core/roots.test.ts:53` | Tarefa 2 (`M-8`) |
| `RNF-0002: o wrapper existe, é executável e falha aberta` | `test/plugin/manifest.test.ts:57` | Tarefa 3 (`M-1`/`M-8`) |

`npm run typecheck`, `node src/cli/index.ts validate` e `node src/cli/index.ts changelog --base origin/master` **já passam** no host sem nenhuma mudança. `node src/cli/index.ts drift` falha com `O gerador falhou: node /opt/living-docs/src/tools/gen-checks.ts`.

## Desvios da spec, e por quê

Três itens entram no plano sem estarem na tabela das onze mudanças. Cada um está isolado numa tarefa ou num passo marcado, para que possa ser rejeitado sem derrubar o resto.

1. **`package.json`: o glob de `npm test`** (Tarefa 1). Medido: `node --test 'test/**/*.test.ts'` sob `cmd.exe` não casa arquivo nenhum e sai com `ℹ tests 0` e código 0 — passa por vacuidade. A §5 exige que `npm test` passe no host; sem isso a prova é vazia, e pior que vazia: é verde.
2. **`RNF-0001`: a frase "container fora do ar"** (Tarefa 7). A §5, prova 1, varre `docs/requirements/` inteiro. `RNF-0001` está lá e menciona container. A tabela das onze mudanças só nomeia `RNF-0002`.
3. **`plugin/skills/working-agreements-keeper/SKILL.md` e `templates/workflow.yml`** (Tarefa 12). Nenhum dos dois está na lista de varredura da §5, e os dois afirmam o container: a skill ensina como exemplo de boa linha *"nunca rode `npm` fora do container"*, e o template instalado no repositório do consumidor diz *"o toolkit roda em container no repositório dele"*. São documentos vivos que passam a mentir. Tarefa separada, e a última.

## Estrutura de arquivos

**Criados:**

| Arquivo | Responsabilidade |
| --- | --- |
| `docs/decisions/adr/ADR-0015-execucao-no-node-do-host.md` | A decisão que supersede `ADR-0001`, preservando a metade não-Docker dela |
| `docs/decisions/debt/TDR-0002-wrapper-docker-orfao.md` | O atalho de `E-1`: `bin/living-docs` sem invocador, com gatilho de pagamento de máquina |

**Modificados:**

| Arquivo | O que muda |
| --- | --- |
| `package.json` | O glob de `npm test` passa a sobreviver ao shell do Windows |
| `plugin/hooks/run-hook.sh` | `docker exec` vira `node`; a raiz do toolkit sai do caminho do script |
| `.github/workflows/living-docs.yml` | `docker compose` vira `actions/setup-node` + `npm ci` |
| `docs/.ownership.yml` | `generated[].command` relativo; o `reason` do watch de `bin/living-docs` |
| `docs/requirements/non-functional.md` | `RNF-0001` sem "container"; `RNF-0002` reescrito no lugar |
| `docs/decisions/adr/ADR-0001-runtime-em-container-sem-build.md` | Só `status` e `superseded-by` — campos mutáveis, corpo intacto |
| `docs/charter/constitution.md` | Princípio 6, `version: 2`, linha no log de emendas |
| `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, `docs/definition-of-done.md`, `.gitattributes` | Prosa host-first |
| `test/core/roots.test.ts` | Duas asserções passam do container para o host |
| `test/plugin/manifest.test.ts` | O teste do wrapper exige `node` e proíbe `docker`; o bit de execução vem do git |
| `test/checks/ci7-ownership-coverage.test.ts` | A fixture de frase curta troca de frase |
| `test/cli/init-enforcement.test.ts` | A mensagem de erro deixa de atribuir a regra a `RNF-0002` |
| `CHANGELOG.md` | Entrada em `## [Unreleased] / ### Changed` |
| `plugin/skills/working-agreements-keeper/SKILL.md`, `templates/workflow.yml` | Tarefa 12, fora das onze mudanças |

---

## Task 1: Dependências no host e um `npm test` que de fato roda

**Files:**
- Modify: `package.json:9`

**Interfaces:**
- Consumes: nada.
- Produces: `npm test` executando os 520 testes do repositório no host, com as quatro falhas de linha de base. Toda tarefa seguinte depende disso.

O `compose.yaml` monta `node_modules` como volume nomeado, então o `node_modules/` do checkout está vazio (spec §4). E o script `test` do `package.json` usa aspas simples ao redor do glob: em `sh` isso funciona, porque o shell as remove antes de o `node` ver o argumento; em `cmd.exe` — o shell que o npm usa no Windows — as aspas simples chegam ao `node` como parte do caminho, nada casa, e `node --test` sai com `ℹ tests 0` e código **0**. Um build verde que não rodou teste nenhum.

- [ ] **Step 1: Instalar as dependências no host**

```bash
npm ci
```

Esperado: termina sem erro, e `node_modules/` deixa de estar vazio. Sem este passo, tudo que segue falha com `ERR_MODULE_NOT_FOUND: Cannot find package 'yaml'` — e isso não é um bug da migração.

- [ ] **Step 2: Ver o `npm test` mentir**

```bash
npm test
```

Esperado (no Windows): `ℹ tests 0`, `ℹ pass 0`, `ℹ fail 0`, exit code 0. Em Linux/macOS este passo já mostra `ℹ tests 520` — nesse caso o Step 3 continua correto (aspas duplas funcionam nos dois shells), mas não há nada para observar aqui.

- [ ] **Step 3: Trocar as aspas do glob**

Em `package.json`, na chave `scripts.test`:

```json
    "test": "node --test \"test/**/*.test.ts\"",
```

Aspas duplas são removidas tanto por `sh` quanto por `cmd.exe`; nos dois casos o `node` recebe `test/**/*.test.ts` e expande o glob ele mesmo. Medido: com aspas duplas via `cmd /c`, os testes rodam; com aspas simples, zero.

- [ ] **Step 4: Confirmar a linha de base**

```bash
npm test
```

Esperado: `ℹ tests 520`, `ℹ fail 4`, exit code 1. As quatro falhas são exatamente as da tabela de linha de base acima. **Nenhuma outra.** Se aparecer uma quinta, pare e investigue antes de seguir — o resto do plano assume esta linha de base.

- [ ] **Step 5: Commit**

```bash
git add package.json
git commit -m "test(RNF-0002): faz o glob de npm test sobreviver ao shell do Windows"
```

---

## Task 2: As duas raízes deixam de ser afirmadas pelo container

**Files:**
- Modify: `test/core/roots.test.ts:1-5` (imports), `:12-23` (teste da variável), `:53-62` (teste do container)
- Test: `test/core/roots.test.ts`

**Interfaces:**
- Consumes: `repoRoot()`, `toolkitRoot()`, `templatesDir()` de `src/core/roots.ts` — assinaturas inalteradas, `() => string`.
- Produces: nada que outra tarefa consuma.

Duas asserções deste arquivo falham no host, por motivos diferentes:

- O teste da linha 53 lê `LIVING_DOCS_TOOLKIT_ROOT` e `LIVING_DOCS_REPO_ROOT` **do ambiente**. Elas só existiam porque o `compose.yaml` as injetava. Sem container, valem `undefined`. É `M-8`: o teste passa a afirmar o que continua verdade e é o coração de `ADR-0003` — `toolkitRoot()` deriva de `import.meta.dirname`, `repoRoot()` cai no diretório de trabalho.
- O teste da linha 12 fixa `/tmp/outro-projeto` e compara com `repoRoot()`. `repoRoot()` chama `resolve()`, e no Windows `resolve('/tmp/outro-projeto')` devolve `C:\tmp\outro-projeto`. A spec não previu isso; é falha de plataforma, não de container, e sem correção o host nunca fica verde.

O teste "nenhum caminho absoluto de container está embutido em `src/` ou `test/`" (linha 25) **fica como está**: ainda é a guarda de `ADR-0003` contra caminho embutido, e o código novo abaixo não introduz nenhum.

- [ ] **Step 1: Ver as duas falhas**

```bash
node --test test/core/roots.test.ts
```

Esperado: FAIL em dois testes —
`RNF-0003: repoRoot respeita LIVING_DOCS_REPO_ROOT e não move toolkitRoot` com `actual: 'C:\tmp\outro-projeto'` contra `expected: '/tmp/outro-projeto'` (em Linux este passa), e
`RNF-0003: o container declara as duas raízes, e elas são distintas` com `actual: 'undefined'` contra `expected: 'string'`.

- [ ] **Step 2: Trocar os imports**

Substitua as linhas 1-5 de `test/core/roots.test.ts` por:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { repoRoot, templatesDir, toolkitRoot } from '../../src/core/roots.ts';
```

- [ ] **Step 3: Tornar o teste da variável neutro de plataforma**

Substitua o teste inteiro das linhas 12-23 por:

```ts
test('RNF-0003: repoRoot respeita LIVING_DOCS_REPO_ROOT e não move toolkitRoot', () => {
  const antes = toolkitRoot();
  const anterior = process.env.LIVING_DOCS_REPO_ROOT;
  // Caminho derivado do sistema, não escrito à mão: `repoRoot()` resolve, e um
  // caminho POSIX literal vira `C:\...` no Windows.
  const outro = join(tmpdir(), 'outro-projeto');
  process.env.LIVING_DOCS_REPO_ROOT = outro;
  try {
    assert.equal(repoRoot(), resolve(outro));
    assert.equal(toolkitRoot(), antes, 'a raiz do toolkit não pode seguir a do repositório (ADR-0003)');
  } finally {
    if (anterior === undefined) delete process.env.LIVING_DOCS_REPO_ROOT;
    else process.env.LIVING_DOCS_REPO_ROOT = anterior;
  }
});
```

- [ ] **Step 4: Trocar a afirmação do container pela afirmação do host**

Substitua o teste inteiro das linhas 53-62 (`RNF-0003: o container declara as duas raízes, e elas são distintas`) por:

```ts
test('RNF-0003: sem variável nenhuma, cada raiz vem da sua própria fonte', () => {
  // Substitui a antiga asserção "o container declara as duas raízes", que lia
  // do ambiente duas variáveis que só existiam porque o compose as injetava.
  // O que ADR-0003 de fato exige sobrevive à saída do container: o toolkit se
  // acha pelo próprio arquivo, e o repositório validado é o cwd de quem chamou.
  const anteriorRepo = process.env.LIVING_DOCS_REPO_ROOT;
  const anteriorToolkit = process.env.LIVING_DOCS_TOOLKIT_ROOT;
  delete process.env.LIVING_DOCS_REPO_ROOT;
  delete process.env.LIVING_DOCS_TOOLKIT_ROOT;
  try {
    // Este arquivo está dois níveis abaixo da raiz, exatamente como
    // `src/core/roots.ts`: a derivação é a mesma, e é ela que se afirma.
    assert.equal(toolkitRoot(), resolve(join(import.meta.dirname, '..', '..')));
    assert.equal(repoRoot(), resolve(process.cwd()));
  } finally {
    if (anteriorRepo !== undefined) process.env.LIVING_DOCS_REPO_ROOT = anteriorRepo;
    if (anteriorToolkit !== undefined) process.env.LIVING_DOCS_TOOLKIT_ROOT = anteriorToolkit;
  }
});
```

- [ ] **Step 5: Rodar o arquivo**

```bash
node --test test/core/roots.test.ts
```

Esperado: PASS nos quatro testes do arquivo.

- [ ] **Step 6: Commit**

```bash
git add test/core/roots.test.ts
git commit -m "test(RNF-0003): afirma as duas raízes pela derivação, não pelo ambiente do container"
```

---

## Task 3: O wrapper de hooks chama o Node do host (`M-1`)

**Files:**
- Modify: `test/plugin/manifest.test.ts:1-5` (imports), `:57-66` (teste do wrapper), `:137-142` (comentário e mensagem do teste de CRLF)
- Modify: `plugin/hooks/run-hook.sh` (arquivo inteiro)
- Test: `test/plugin/manifest.test.ts`

**Interfaces:**
- Consumes: `toolkitRoot()` de `src/core/roots.ts`.
- Produces: `plugin/hooks/run-hook.sh <nome-do-hook>`, lendo o payload do hook em stdin e escrevendo a decisão em stdout. Contrato inalterado: teto de 5 s, saída vazia e `exit 0` em qualquer erro. `plugin/hooks/hooks.json` continua invocando `"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh" <hook>` e **não muda**.

O contrato do wrapper não muda (`RNF-0001`, spec §7). O que muda é quem executa: a raiz do toolkit sai do caminho do próprio script — `plugin/hooks/run-hook.sh` está dois níveis abaixo dela — e a raiz do repositório validado vem de `CLAUDE_PROJECT_DIR`. As duas continuam distintas, que é o que `ADR-0003` exige.

`LIVING_DOCS_HOST_ROOT` deixa de ser passada: ela existia para o hook reconhecer, num `file_path` do payload, o prefixo do lado de fora do container. Fora do container os dois prefixos são o mesmo, e `hookEnv()` em `src/hooks/lib/io.ts` já trata a ausência (`host ? [root, host] : [root]`). Por isso `src/` não precisa mudar.

O teste do bit de execução muda de fonte: `statSync(...).mode & 0o111` é sempre falso num checkout Windows, porque o sistema de arquivos não tem modo POSIX. O que importa é o modo **versionado** — é ele que o consumidor recebe —, e `git ls-files -s` o devolve igual em qualquer sistema. Medido: `100755` para `plugin/hooks/run-hook.sh` e `bin/living-docs`.

- [ ] **Step 1: Acrescentar o import de `execFileSync`**

Substitua as linhas 1-5 de `test/plugin/manifest.test.ts` por:

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { toolkitRoot } from '../../src/core/roots.ts';
```

`statSync` continua importado: outros testes do arquivo o usam.

- [ ] **Step 2: Escrever o teste que falha**

Substitua o teste inteiro das linhas 57-66 (`RNF-0002: o wrapper existe, é executável e falha aberta — o host só empresta o Docker`) por:

```ts
test('RNF-0002: o wrapper existe, é executável e roda o node do host, falhando aberta', () => {
  const relative = 'plugin/hooks/run-hook.sh';
  const wrapper = join(ROOT, relative);
  assert.ok(existsSync(wrapper));

  // O bit de execução vem do índice do git, não do sistema de arquivos: um
  // checkout Windows não tem modo POSIX, e o que chega a quem instala é o modo
  // versionado.
  const entry = execFileSync('git', ['ls-files', '-s', '--', relative], { cwd: ROOT, encoding: 'utf8' });
  assert.equal(entry.split(/\s+/)[0], '100755', `${relative} precisa estar versionado como executável`);

  const source = readFileSync(wrapper, 'utf8');
  assert.match(source, /\bnode\b/, 'o hook roda no node do host (RNF-0002)');
  assert.doesNotMatch(source, /docker/i, 'não existe mais ponte para container nenhum');
  assert.match(source, /timeout 5/, 'precisa respeitar o teto de 5s da spec §7');
  assert.match(source, /exit 0/, 'precisa falhar aberta');
  assert.doesNotMatch(source, /set -e\b/, 'set -e mataria a falha aberta');
});
```

- [ ] **Step 3: Rodar para ver falhar**

```bash
node --test test/plugin/manifest.test.ts
```

Esperado: FAIL em `RNF-0002: o wrapper existe, é executável e roda o node do host, falhando aberta`, com a mensagem `não existe mais ponte para container nenhum` — o wrapper atual ainda diz `docker exec`.

- [ ] **Step 4: Reescrever o wrapper**

Conteúdo completo de `plugin/hooks/run-hook.sh`:

```bash
#!/usr/bin/env bash
# Wrapper dos hooks de documentação viva: executa o toolkit no node do host.
#
# Falha aberta por contrato (docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7):
# node ausente, dependência faltando, timeout ou erro de execução resultam em
# saída vazia e exit 0. Um hook quebrado não pode travar o trabalho.
#
# Duas raízes, e elas não se confundem (ADR-0003): o código do **toolkit** sai
# do caminho deste script, dois níveis acima dele; o `.ownership.yml` lido é o do
# **repositório validado**, que vem de CLAUDE_PROJECT_DIR.

HOOK="${1:-}"
TOOLKIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
REPO_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

[ -n "$HOOK" ] || exit 0

INPUT="$(cat)"

OUTPUT="$(printf '%s' "$INPUT" | LIVING_DOCS_REPO_ROOT="$REPO_ROOT" \
  timeout 5 node "${TOOLKIT_ROOT}/src/hooks/${HOOK}.ts" 2>/dev/null)"

if [ $? -eq 0 ] && [ -n "$OUTPUT" ]; then
  printf '%s\n' "$OUTPUT"
fi

exit 0
```

Três coisas que não podem se perder na reescrita, e que o teste do Step 2 verifica: `timeout 5`, `exit 0` e a **ausência** de `set -e`. São elas que impedem um hook quebrado de travar o trabalho.

- [ ] **Step 5: Confirmar que o modo versionado sobreviveu à edição**

```bash
git ls-files -s -- plugin/hooks/run-hook.sh
```

Esperado: a linha começa com `100755`. Se vier `100644`, rode `git update-index --chmod=+x plugin/hooks/run-hook.sh` e repita.

- [ ] **Step 6: Corrigir o comentário do teste de CRLF**

O teste de CRLF **fica**: `run-hook.sh` roda em bash e um CR no shebang continua quebrando o interpretador. Só o texto que atribuía o motivo ao container muda. Substitua as linhas 137-142 por:

```ts
test('RNF-0002: nenhum script executável carrega CR — o wrapper roda em bash', () => {
  for (const relative of ['bin/living-docs', 'plugin/hooks/run-hook.sh']) {
    const source = readFileSync(join(ROOT, relative), 'utf8');
    assert.equal(source.includes('\r'), false, `${relative} com CRLF: o shebang quebra com "bad interpreter"`);
  }
});
```

- [ ] **Step 7: Rodar para ver passar**

```bash
node --test test/plugin/manifest.test.ts
```

Esperado: PASS em todos os testes do arquivo.

- [ ] **Step 8: Commit**

```bash
git add plugin/hooks/run-hook.sh test/plugin/manifest.test.ts
git commit -m "feat(RNF-0002): o wrapper de hooks passa a executar no node do host"
```

---

## Task 4: O CI troca Docker por Node (`M-2`)

**Files:**
- Modify: `.github/workflows/living-docs.yml` (arquivo inteiro)

**Interfaces:**
- Consumes: `npm test` corrigido pela Tarefa 1; os subcomandos `validate`, `drift` e `changelog` de `node src/cli/index.ts`, inalterados.
- Produces: nada que outra tarefa consuma.

Os quatro passos de CLI passam a invocar `node src/cli/index.ts` com o diretório de trabalho na raiz do checkout — que é o default do runner, então nenhum `-w` é preciso.

Duas coisas ficam, e por motivo escrito: `fetch-depth: 0`, porque `CI-6` compara `<base>...HEAD` e um clone raso não tem a base (`ADR-0006`); e a condição `if: github.event_name == 'pull_request'` dos passos que leem o diff, pelo motivo registrado em `ADR-0010`.

- [ ] **Step 1: Reescrever o workflow**

Conteúdo completo de `.github/workflows/living-docs.yml`:

```yaml
name: living-docs

on:
  push:
  pull_request:

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          # CI-6 compara <base>...HEAD; um clone raso não tem a base (ADR-0006).
          fetch-depth: 0

      - uses: actions/setup-node@v4
        with:
          # O piso é `engines.node` do package.json (RNF-0002).
          node-version: '24'
          cache: npm

      - name: Instalar dependências
        run: npm ci

      - name: Testes
        run: npm test

      - name: Type-check
        run: npm run typecheck

      - name: CI-1 a CI-4, CI-7 e CI-8 — documentação viva
        run: node src/cli/index.ts validate

      # A metade de CI-7 que lê o diff só existe com uma base (ADR-0010). Em
      # `push` não há base, e inventar uma produziria achado sobre mudança que
      # não é desta branch.
      - name: CI-7 — vínculo código→doc no diff do PR
        if: github.event_name == 'pull_request'
        run: node src/cli/index.ts validate --base ${{ github.event.pull_request.base.sha }}

      - name: CI-5 — deriva de contrato gerado
        run: node src/cli/index.ts drift

      - name: CI-6 — entrada de CHANGELOG
        if: github.event_name == 'pull_request'
        run: node src/cli/index.ts changelog --base ${{ github.event.pull_request.base.sha }}
```

`cache: npm` exige `package-lock.json` na raiz — ele existe (foi o que `npm ci` da Tarefa 1 consumiu).

- [ ] **Step 2: Conferir que o YAML é válido e não menciona Docker**

```bash
node -e "const {parse}=require('yaml');const s=require('fs').readFileSync('.github/workflows/living-docs.yml','utf8');parse(s);if(/docker/i.test(s))throw new Error('ainda menciona Docker');console.log('ok')"
```

Esperado: `ok`.

- [ ] **Step 3: Rodar no host o que o workflow roda**

```bash
npm test
npm run typecheck
node src/cli/index.ts validate
```

Esperado: `npm test` com `ℹ fail 2` (restam `RF-0006` e o `drift`, que a Tarefa 5 fecha); `typecheck` silencioso; `validate` com `nenhuma violação encontrada`.

- [ ] **Step 4: Commit**

```bash
git add .github/workflows/living-docs.yml
git commit -m "ci(RNF-0002): o workflow instala Node e npm em vez de construir a imagem"
```

---

## Task 5: O comando do gerador deixa de ser caminho de container (`M-6`)

**Files:**
- Modify: `docs/.ownership.yml:71`
- Test: `test/contracts/drift.test.ts` (já existe; hoje falha)

**Interfaces:**
- Consumes: `runCommand` de `src/exec/command.ts`, que executa com `cwd` na raiz do repositório validado — por isso um caminho relativo resolve.
- Produces: `generated[].command` igual a `node src/tools/gen-checks.ts`.

`generated[].command` aponta hoje para `/opt/living-docs/src/tools/gen-checks.ts`, que não existe no host. A saída do gerador não contém o comando, então `CI-5` não deve acusar deriva de conteúdo — mas isso se **prova** rodando `drift`, não se presume.

- [ ] **Step 1: Ver a falha**

```bash
node --test test/contracts/drift.test.ts
```

Esperado: FAIL em `RF-0006: o contrato gerado deste repositório não derivou`, com `O gerador falhou: \`node /opt/living-docs/src/tools/gen-checks.ts\``.

- [ ] **Step 2: Trocar o comando**

Em `docs/.ownership.yml`, na chave `generated`, substitua a linha 71:

```yaml
    command: node src/tools/gen-checks.ts
```

O bloco fica assim (os comentários acima dele não mudam):

```yaml
generated:
  # O comando IMPRIME o conteúdo esperado na saída padrão e não escreve arquivo
  # nenhum: um check que reescreve o que está checando apaga a evidência no
  # mesmo instante em que a reporta (ADR-0005). HK-2 bloqueia editar `path` à
  # mão; CI-5 (`living-docs drift`) compara.
  - path: docs/contracts/checks.gen.md
    command: node src/tools/gen-checks.ts
```

- [ ] **Step 3: Provar que não há deriva**

```bash
node --test test/contracts/drift.test.ts
node src/cli/index.ts drift
```

Esperado: PASS nos dois testes do arquivo, e `living-docs: nenhuma violação encontrada.` no `drift`. Se `drift` acusar deriva de conteúdo, **não edite `docs/contracts/checks.gen.md`** — `HK-2` bloqueia, e a fonte é `src/checks/catalog.ts`.

- [ ] **Step 4: A suíte inteira fica verde**

```bash
npm test
```

Esperado: `ℹ tests 520`, `ℹ fail 0`. As quatro falhas da linha de base acabaram.

- [ ] **Step 5: Commit**

```bash
git add docs/.ownership.yml
git commit -m "fix(CI-5): o comando do gerador passa a ser relativo à raiz do repositório validado"
```

---

## Task 6: `ADR-0015` nasce e supersede `ADR-0001` (`M-3`)

**Files:**
- Create: `docs/decisions/adr/ADR-0015-execucao-no-node-do-host.md`
- Modify: `docs/decisions/adr/ADR-0001-runtime-em-container-sem-build.md:4` (`status`), `:11` (`superseded-by`)

**Interfaces:**
- Consumes: nada.
- Produces: o ID `ADR-0015`, citável por `RNF-0002` (Tarefa 7), pela Constitution (Tarefa 8) e pelo `TDR-0002` (Tarefa 10).

`status` e `superseded-by` são campos mutáveis declarados em `docs/.ownership.yml` (`mutable-fields: [status, superseded-by, last-reviewed]`), então `HK-1` permite a edição do frontmatter de `ADR-0001` e **o corpo dele fica intacto**. `CI-3` fecha o par `supersedes`/`superseded-by` dos dois lados.

O ADR precisa dizer o que se **ganha** — o enforcement local deixa de sumir quando o container está parado, que era a perda declarada em `ADR-0001` — e o que se **perde**: o host passa a precisar de Node ≥ 24. E precisa dizer explicitamente que a metade não-Docker de `ADR-0001` sobrevive, senão a supersessão parece revogar também o que não foi revogado.

- [ ] **Step 1: Escrever o ADR**

Conteúdo completo de `docs/decisions/adr/ADR-0015-execucao-no-node-do-host.md`:

```markdown
---
id: ADR-0015
title: Execução no Node do host, TypeScript sem build step
status: draft
owner: '@esliph/engineering'
trigger: >
    Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-01
relates-to: [RNF-0002, RNF-0003]
supersedes: ADR-0001
superseded-by: null
---

# ADR-0015 — Execução no Node do host, TypeScript sem build step

## Contexto

`ADR-0001` decidiu o container partindo de uma premissa sobre a máquina de quem
desenvolve: que ela não tem Node e não deve passar a ter. A premissa deixou de
valer, e a perda que aquele ADR declarou e aceitou passou a ser cobrada todo dia:
com o container parado, o CLI sai com código 2 e os hooks falham abertos, então
**o enforcement local desaparece em silêncio** — exatamente no componente cuja
falha precisa ser visível.

Node 24 é o mesmo runtime que o container carregava. Trazê-lo para o host não
muda o que executa; muda apenas quem hospeda.

## Alternativas consideradas

- **Manter o container e detectar quando ele está parado.** Descartada: o hook
  tem teto de 5 s e falha aberta por contrato (`RNF-0001`); um aviso emitido de
  dentro de um caminho que precisa calar em caso de erro ou vira ruído em toda
  invocação, ou não aparece justamente quando importa.
- **Publicar o toolkit em npm e instalá-lo como dependência do próprio
  repositório.** Descartada nesta decisão: é `DA-0003`, e ela é sobre como o
  toolkit chega a um repositório **consumidor**. Resolver a execução local não
  exige resolvê-la, e misturar as duas emperra a que já está madura.
- **Compilar TypeScript para `dist/` agora que não há container.** Descartada
  pelo mesmo motivo de `ADR-0001`, que continua valendo: um `dist/`
  desatualizado faz o hook rodar código velho silenciosamente.

## Decisão

O toolkit executa no `node` do host, versão 24 ou maior, com as dependências
instaladas por `npm ci`. `plugin/hooks/run-hook.sh` invoca `node` direto,
derivando a raiz do toolkit do caminho do próprio script; o workflow instala
Node com `actions/setup-node` e roda `node src/cli/index.ts`.

**A metade não-Docker de `ADR-0001` sobrevive intacta e passa a ser carregada
por esta decisão:** o código continua sendo TypeScript executado diretamente
pelo type-stripping nativo, sem build step, com `tsc --noEmit` como
type-checker — e continuamos restritos à sintaxe TypeScript apagável: sem
`enum`, sem `namespace`, sem decorators.

`ADR-0003` não é tocado. As duas raízes continuam distintas e continuam vindo
das mesmas fontes: `import.meta.dirname` para a do toolkit, diretório de
trabalho para a do repositório validado.

## Consequências

### O que se ganha

O enforcement local para de depender do estado de um daemon: não há mais janela
em que os hooks calam porque alguém não subiu o container. Some a construção de
imagem do CI e some a camada de indireção entre editar e executar — o comando
que a documentação ensina é o comando que roda.

### O que se aceita perder

**O host passa a precisar de Node ≥ 24.** Uma máquina com Node mais velho, ou
sem Node, deixa de conseguir rodar o toolkit sem instalar nada — que era
precisamente o que `ADR-0001` comprava. Quem clonar numa máquina assim descobre
pelo erro do `node`, não por uma mensagem nossa.

Perde-se também a reprodutibilidade que a imagem dava: a versão exata do runtime
passa a ser responsabilidade de cada máquina, e uma diferença de patch entre o
host de alguém e o `ubuntu-latest` do CI vira uma classe de divergência que antes
não existia.

`compose.yaml`, `Dockerfile` e `bin/living-docs` ficam no repositório sem nenhum
documento, teste ou passo de CI que os invoque. É atalho consciente, registrado
em `TDR-0002`.
```

- [ ] **Step 2: Marcar `ADR-0001` como superseded**

Em `docs/decisions/adr/ADR-0001-runtime-em-container-sem-build.md`, **só no frontmatter**:

Linha 4:
```yaml
status: superseded
```

Linha 11:
```yaml
superseded-by: ADR-0015
```

O corpo não é tocado — nem uma vírgula. É o que `HK-1` protege e o que `E-2` preserva.

- [ ] **Step 3: Provar que o par fecha dos dois lados**

```bash
node src/cli/index.ts validate
```

Esperado: `living-docs: nenhuma violação encontrada.` Um par aberto produziria achado de `CI-3` nomeando `supersedes`/`superseded-by`.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/adr/ADR-0015-execucao-no-node-do-host.md docs/decisions/adr/ADR-0001-runtime-em-container-sem-build.md
git commit -m "docs(ADR-0015): registra a execução no node do host e supersede ADR-0001"
```

`ADR-0015` fica `draft`. **Não promova para `accepted`** — `HK-3` intercepta, e a resposta não é sua.

---

## Task 7: `RNF-0002` reescrito no lugar, e `RNF-0001` sem "container" (`M-4`)

**Files:**
- Modify: `docs/requirements/non-functional.md:19-21` (corpo de `RNF-0001`), `:24-31` (`RNF-0002` inteiro)

**Interfaces:**
- Consumes: o ID `ADR-0015` criado na Tarefa 6.
- Produces: `RNF-0002` com enunciado novo e o mesmo ID, citado por `test/plugin/manifest.test.ts`.

`RNF-0002` mantém o ID e troca de enunciado (`E-3`). `CI-3` regra 7 exige que requisito `active` seja citado por ao menos um teste em `test/**`: a citação existe em `test/plugin/manifest.test.ts` (dois nomes de teste começam com `RNF-0002:`) e a Tarefa 3 a preservou.

`RNF-0001` também muda, e não está na tabela das onze mudanças: seu corpo diz "container fora do ar" como exemplo de erro, e a §5 varre `docs/requirements/` inteiro. O ID, o `status` e o sentido da regra não mudam — só o exemplo.

- [ ] **Step 1: Trocar o exemplo de `RNF-0001`**

Substitua as linhas 19-21 (o parágrafo do corpo de `RNF-0001`) por:

```markdown
Qualquer erro na execução de um hook — configuração ilegível, dependência
ausente, timeout — resulta em deixar passar. O enforcement que sobrevive a hook
quebrado é o CI; hook quebrado que trava o trabalho é removido pelo usuário no
primeiro dia, e aí não há enforcement nenhum.
```

O título da seção (`## RNF-0001 — Hook falha aberta, em até 5 segundos, sem rede`) e os bullets de `status` e `fora de escopo` **não mudam**.

- [ ] **Step 2: Reescrever `RNF-0002`**

Substitua as linhas 24-31 (da linha `## RNF-0002 — ...` até a linha antes de `## RNF-0003`) por:

```markdown
## RNF-0002 — O toolkit roda no Node do host, sem passo de build

- **status:** active
- **relates-to:** ADR-0015
- **fora de escopo:** o `git`, e como o toolkit chega ao repositório de quem o consome (`DA-0003`)

Node 24 ou maior, e o npm que vem com ele, são o único toolchain exigido de quem
clona este repositório. `npm ci` instala as dependências; `node` executa a fonte
TypeScript direto, sem artefato compilado no meio.
```

O `fora de escopo` do texto anterior já isentava o `git`, e isso não mudou.

- [ ] **Step 3: Provar que a regra continua coberta**

```bash
node src/cli/index.ts validate
```

Esperado: `nenhuma violação encontrada`. Um `RNF-0002` `active` sem citação em `test/**` produziria achado de `CI-3`.

- [ ] **Step 4: Confirmar que nenhuma menção sobrou nos requisitos**

```bash
grep -rniE "docker|container" docs/requirements/ ; echo "exit: $?"
```

Esperado: nenhuma linha, `exit: 1` (grep sem match).

- [ ] **Step 5: Commit**

```bash
git add docs/requirements/non-functional.md
git commit -m "docs(RNF-0002): a regra passa a enunciar a execução no Node do host"
```

---

## Task 8: O princípio 6 da Constitution é emendado (`M-5`)

**Files:**
- Modify: `docs/charter/constitution.md:7` (`version`), `:22` (princípio 6), `:26` (log de emendas)

**Interfaces:**
- Consumes: `ADR-0015` (Tarefa 6) e o novo `RNF-0002` (Tarefa 7).
- Produces: nada que outra tarefa consuma.

O princípio 6 afirma o que deixou de ser verdade. A emenda é ato deliberado — é o que o `trigger` do documento diz —, então: texto novo, `version: 2`, e uma linha no log de emendas datada de 2026-09-01. `test/docs/language-and-intent.test.ts` exige que todo princípio contenha "verificado por": o princípio reescrito **nomeia** o que o verifica, não só afirma.

- [ ] **Step 1: Subir a versão**

Linha 7 do frontmatter:

```yaml
version: 2
```

`last-reviewed` também passa a `2026-09-01`, porque o documento foi de fato relido nesta mudança:

```yaml
last-reviewed: 2026-09-01
```

- [ ] **Step 2: Reescrever o princípio 6**

Substitua a linha 22 por:

```markdown
6. O toolkit roda no Node do host, sem passo de build — verificado por `test/plugin/manifest.test.ts` (`RNF-0002`) e pelo workflow, que instala Node e npm e nada além.
```

- [ ] **Step 3: Acrescentar a linha de emenda**

Ao final da seção `## Log de emendas`, **depois** da linha de v1 (que não muda):

```markdown
- 2026-09-01 — v2 — Princípio 6 passa a afirmar a execução no Node do host, acompanhando `ADR-0015`, que supersede `ADR-0001` — humana, migração da execução para o host.
```

- [ ] **Step 4: Rodar os testes do charter**

```bash
node --test test/docs/language-and-intent.test.ts
node src/cli/index.ts validate
```

Esperado: PASS em todos, incluindo `a Constitution: todo princípio nomeia o que o verifica`; `validate` sem violação.

- [ ] **Step 5: Commit**

```bash
git add docs/charter/constitution.md
git commit -m "docs(ADR-0015): emenda o princípio 6 da Constitution para a execução no host"
```

---

## Task 9: A prosa e as fixtures passam a host-first (`M-7` e `M-9`)

**Files:**
- Modify: `CLAUDE.md`, `CONTRIBUTING.md:15-30`, `README.md`, `docs/definition-of-done.md:30`, `.gitattributes:1-2`, `docs/.ownership.yml:196`
- Modify: `test/checks/ci7-ownership-coverage.test.ts:217`, `test/cli/init-enforcement.test.ts:36`
- Test: `test/docs/agent-contract.test.ts`, `test/checks/ci7-ownership-coverage.test.ts`, `test/cli/init-enforcement.test.ts`

**Interfaces:**
- Consumes: `RNF-0002` reescrito (Tarefa 7).
- Produces: `CONTRIBUTING.md` e `README.md` sem nenhuma menção a `bin/living-docs` — pré-condição do `pay-when` do `TDR-0002` (Tarefa 10). Se você mudar a redação abaixo, confira o `paths` daquele gatilho.

Restrições verificadas que não podem quebrar:

- `CLAUDE.md` tem no máximo 60 linhas (`test/docs/agent-contract.test.ts`) — hoje são 52 — e não pode conter, literal, o título de nenhum requisito. O bullet de política diz a regra **sem repetir** o enunciado de `RNF-0002`; `CI-7` também reprova frase longa duplicada entre o contrato do agente e o artefato dono (piso de doze palavras, `ADR-0009`).
- Todo item da Definition of Done nomeia sua verificação (`CI-\d`, `HK-\d` ou humana) — a reescrita do penúltimo item preserva isso.

- [ ] **Step 1: `CLAUDE.md` — o bullet de política**

Na seção `## Política`, substitua o primeiro bullet inteiro:

```markdown
- **O toolkit roda no `node` do host.** `npm ci` antes de tudo; depois
  `npm test`, `npm run typecheck` e `node src/cli/index.ts …`. A regra vigente é
  `RNF-0002`.
```

(era: `- **Nada roda no host além de Docker.** Todo comando vai por / \`docker compose exec toolkit …\` ou \`./bin/living-docs\`.`)

- [ ] **Step 2: `CONTRIBUTING.md` — a seção do ambiente**

Substitua a seção `## O ambiente` inteira (linhas 15-30) por:

`````markdown
## O ambiente

Node 24 ou maior e o npm que vem com ele — nada além disso (`RNF-0002`). As
dependências entram com `npm ci`, e ele vem antes de qualquer outro comando:

```bash
npm ci
npm test
npm run typecheck
node src/cli/index.ts validate
node src/cli/index.ts validate --base origin/master
```

Comando que falha com `ERR_MODULE_NOT_FOUND` é comando rodado antes do
`npm ci` — não é o ambiente que está errado.
`````

- [ ] **Step 3: `README.md` — os quatro trechos**

**3a.** Na seção `## Como funciona`, substitua o parágrafo final (linhas 20-21):

```markdown
O toolkit roda no Node do host: `npm ci` uma vez, e `node src/cli/index.ts` a
partir daí. Não há passo de build entre editar e executar.
```

**3b.** Substitua a seção `## Pré-requisitos` inteira:

```markdown
## Pré-requisitos

- Node 24 ou maior, com npm.
- Claude Code, para usar a parte de plugin (skills, comandos e ganchos).
```

**3c.** Substitua a seção `## Instalação e primeiro uso` — o bloco de código, o parágrafo seguinte e a coluna `Comando` da tabela:

````markdown
## Instalação e primeiro uso

```bash
npm ci                                          # instala as dependências
node src/cli/index.ts init --stage solo         # cria a estrutura inicial de pastas e arquivos
node src/cli/index.ts validate                  # verifica a documentação do repositório
```

Sem `LIVING_DOCS_REPO_ROOT`, o CLI valida o **diretório de trabalho** — rodando
da raiz deste checkout, ele valida a si mesmo: o toolkit usa-se como teste.

Comandos disponíveis:

| Comando | O que faz |
| --- | --- |
| `node src/cli/index.ts init --stage <estágio>` | Cria a estrutura inicial do estágio e declara em `docs/.ownership.yml` o que criou. |
| `node src/cli/index.ts validate` | Verifica frontmatter, IDs únicos, rastreabilidade entre documentos, documentos vencidos e cobertura de dono. |
| `node src/cli/index.ts validate --base <ref>` | Além do acima, compara com o diff da branch: código que mudou sem o documento dono, e mudança visível a quem consome sem entrada no `CHANGELOG.md`. |
| `node src/cli/index.ts drift` | Confere se cada documento gerado ainda bate com o comando que o gera. |
| `node src/cli/index.ts changelog --base <ref>` | Confere se toda mudança visível a quem consome levou entrada no `CHANGELOG.md`, ou uma razão escrita no commit. |
````

**3d.** Substitua a seção `## Validar outro projeto` inteira:

`````markdown
## Validar outro projeto

A fonte do toolkit e o repositório validado são raízes independentes
(`ADR-0003`): a primeira sai do caminho do próprio código, a segunda do
diretório de trabalho ou de `LIVING_DOCS_REPO_ROOT`.

```bash
LIVING_DOCS_REPO_ROOT=/caminho/do/projeto node src/cli/index.ts init --stage small-team --owner @time
LIVING_DOCS_REPO_ROOT=/caminho/do/projeto node src/cli/index.ts validate
```
`````

**3e.** No parágrafo de `**Ganchos:**` (seção `## O plugin do Claude Code`), a frase final atribui a falha aberta ao container parado. Substitua a frase final por:

```markdown
Os ganchos que lembram e perguntam nunca bloqueiam; quando o toolkit não
consegue executar, nenhum gancho bloqueia nada — a camada que sobrevive a isso é
o CI.
```

**3f.** Substitua a seção `## Desenvolvimento` inteira:

````markdown
## Desenvolvimento

```bash
npm ci
npm test
npm run typecheck
```

Para contribuir, veja `CONTRIBUTING.md`.
````

- [ ] **Step 4: `docs/definition-of-done.md` — o penúltimo item**

Substitua a linha 30:

```markdown
- [ ] `npm test`, `npm run typecheck`, `living-docs validate --base <ref>`, `living-docs drift` e `living-docs changelog --base <ref>` passam no host — verificação: `CI-1` a `CI-10`, rodados pelo workflow do repositório.
```

Também atualize `last-reviewed` no frontmatter para `2026-09-01`.

- [ ] **Step 5: `.gitattributes` — o comentário**

Substitua as duas primeiras linhas:

```
# O wrapper de hooks roda em bash (RNF-0002). Um CR no shebang o quebra com
# "bad interpreter", e quem clona no Windows não vê o motivo.
```

O resto do arquivo (`* text=auto eol=lf` e as linhas `binary`) não muda.

- [ ] **Step 6: `docs/.ownership.yml` — o `reason` do watch de `bin/living-docs`**

Substitua a linha 196:

```yaml
    reason: "o wrapper é um ponto de entrada público do toolkit — mudar como se invoca muda o que quem consome usa"
```

O `code`, o `doc` e o `consumer-visible: true` daquela entrada **não mudam**.

- [ ] **Step 7: `test/checks/ci7-ownership-coverage.test.ts` — a fixture de frase curta**

A frase é arbitrária: ela existe para demonstrar que uma frase curta é vocabulário compartilhado e **não** duplicata (`ADR-0009`). Substitua a linha 217:

```ts
  const curta = 'O teste vem antes da implementação.';
```

O resto do teste não muda — a asserção continua sendo `assert.deepEqual(ci7OwnershipCoverage().run(contextFor(root)), [])`.

- [ ] **Step 8: `test/cli/init-enforcement.test.ts` — a mensagem de erro**

A asserção continua correta e ganha valor: agora nem o workflow deste repositório menciona Docker. Só a mensagem, que atribuía a regra a `RNF-0002`, muda. Substitua a linha 36:

```ts
    assert.doesNotMatch(yaml, /docker/i, 'como o toolkit chega ao CI de quem instala é DA-0003, não uma imposição nossa');
```

- [ ] **Step 9: Rodar a suíte e os checks**

```bash
npm test
node src/cli/index.ts validate
```

Esperado: `ℹ fail 0`, e `nenhuma violação encontrada`. Se `CI-7` acusar frase duplicada entre `CLAUDE.md` e um artefato dono, a correção é **apagar a frase do contrato e deixar o ponteiro** — nunca mexer no limiar de `ADR-0009`.

- [ ] **Step 10: Conferir o teto de linhas do contrato**

```bash
node -e "console.log(require('fs').readFileSync('CLAUDE.md','utf8').split('\n').length)"
```

Esperado: um número ≤ 60.

- [ ] **Step 11: Commit**

```bash
git add CLAUDE.md CONTRIBUTING.md README.md docs/definition-of-done.md .gitattributes docs/.ownership.yml test/checks/ci7-ownership-coverage.test.ts test/cli/init-enforcement.test.ts
git commit -m "docs(RNF-0002): a prosa e as fixtures passam a afirmar o host"
```

---

## Task 10: O wrapper órfão vira dívida com gatilho observável (`M-11`)

**Files:**
- Create: `docs/decisions/debt/TDR-0002-wrapper-docker-orfao.md`

**Interfaces:**
- Consumes: `ADR-0015` (Tarefa 6); e a Tarefa 9, que tirou `bin/living-docs` de `CONTRIBUTING.md` e `README.md` — sem isso o gatilho abaixo dispara na hora.
- Produces: o ID `TDR-0002`.

`E-1` deixa `bin/living-docs` como ponte `docker exec` sem nenhum documento, teste ou passo de CI que o invoque. Atalho consciente vira `TDR` com gatilho de pagamento **observável** — `CI-4` reprova `pay-when` que ninguém consegue verificar.

O gatilho que a spec propõe em prosa ("quando alguém invocar `bin/living-docs` e ele falhar por ausência do container") não é observável por arquivo, e `CI-4` só sabe procurar `pattern` dentro de `paths`. A forma de máquina abaixo captura o mesmo momento pelo lado que deixa rastro: o dia em que um documento vivo ou o CI voltar a **ensinar** o wrapper, ele precisa funcionar.

Dois cuidados no `paths`:

- **`test/**` fica de fora.** `test/plugin/manifest.test.ts` cita `bin/living-docs` no teste de CRLF, que a spec manda manter. Incluí-lo dispararia o gatilho no mesmo commit em que ele nasce.
- **`CHANGELOG.md` e `docs/.ownership.yml` ficam de fora** pelo mesmo motivo: os dois citam o wrapper hoje, e `E-2` os preserva.

- [ ] **Step 1: Escrever o TDR**

Conteúdo completo de `docs/decisions/debt/TDR-0002-wrapper-docker-orfao.md`:

```markdown
---
id: TDR-0002
title: bin/living-docs continua exigindo Docker sem ninguém que o invoque
status: open
owner: '@esliph/engineering'
trigger: >
    Quando o gatilho de pagamento abaixo se cumprir.
last-reviewed: 2026-09-01
relates-to: [ADR-0015, RNF-0002]
# Aspas simples: em YAML, aspas simples não processam `\`, e o padrão é regex.
pay-when:
    pattern: 'bin/living-docs'
    paths:
        - CONTRIBUTING.md
        - README.md
        - docs/definition-of-done.md
        - '.github/workflows/**'
---

# TDR-0002 — bin/living-docs continua exigindo Docker sem ninguém que o invoque

## O atalho

A migração para o Node do host tirou todos os invocadores de `bin/living-docs`:
nenhum documento vivo o ensina, nenhum teste o executa, nenhum passo de CI o
chama. O arquivo continua no repositório, continua sendo uma ponte `docker exec`
para um container que ninguém mais sobe, e continua declarado em
`consumer-visible-paths` — ou seja, ainda é tratado como contrato público.

`Dockerfile`, `compose.yaml` e `.dockerignore` ficam pelo mesmo motivo: o build
que sobrou precisa deles.

## Por que foi aceito

Apagá-los junto com a migração misturaria duas mudanças com riscos diferentes: a
que troca quem executa, verificável rodando os cinco comandos, e a que remove um
caminho de execução que alguém pode estar usando sem ter dito. A primeira é o
escopo desta entrega; a segunda pede uma release e uma linha de depreciação.

Enquanto o wrapper não é invocado por nada, o custo do atraso é um arquivo morto
— barato, e visível para quem o abrir.

## Gatilho de pagamento

Quando `bin/living-docs` voltar a ser ensinado ou executado: uma menção em
`CONTRIBUTING.md`, `README.md`, `docs/definition-of-done.md` ou em qualquer
workflow. É a forma verificável de "alguém tentou usá-lo": a partir daí ele
deixa de ser arquivo morto e passa a ser caminho de execução — e um caminho de
execução que falha por container ausente precisa ou funcionar, ou sair.

## Custo de continuar devendo

Um caminho de execução público que falha com uma mensagem de Docker num
repositório cuja documentação inteira diz que Docker não é necessário. Quem
tropeçar nele não tem como saber se o errado é o wrapper ou a documentação — e
`RNF-0002` diz que é o wrapper.
```

- [ ] **Step 2: Provar que o gatilho não está cumprido**

```bash
node src/cli/index.ts validate
```

Esperado: `nenhuma violação encontrada`. Se `CI-4` acusar `TDR-0002` com o gatilho já cumprido, ele nomeia o arquivo e a linha da evidência: é uma menção a `bin/living-docs` que a Tarefa 9 deixou passar. Corrija a menção, não o `pay-when`.

- [ ] **Step 3: Confirmar a varredura à mão**

```bash
grep -n "bin/living-docs" CONTRIBUTING.md README.md docs/definition-of-done.md .github/workflows/living-docs.yml ; echo "exit: $?"
```

Esperado: nenhuma linha, `exit: 1`.

- [ ] **Step 4: Commit**

```bash
git add docs/decisions/debt/TDR-0002-wrapper-docker-orfao.md
git commit -m "docs(TDR-0002): registra o wrapper Docker órfão com gatilho de pagamento verificável"
```

---

## Task 11: O CHANGELOG e as duas provas que nenhum check faz (`M-10`, §5)

**Files:**
- Modify: `CHANGELOG.md` (entrada nova em `## [Unreleased]` / `### Changed`)

**Interfaces:**
- Consumes: tudo que as Tarefas 3 a 10 produziram.
- Produces: a entrega fechada.

`.github/workflows/**` e `plugin/**` estão em `consumer-visible-paths`, e `CI-6` reprova o diff da branch que os toca sem entrada em `## [Unreleased]`. A entrada é escrita para quem **consome** o toolkit — o teste do arquivo é o declarado no seu próprio cabeçalho: se a entrada só faz sentido para quem escreveu o código, ela não pertence ali.

- [ ] **Step 1: Escrever a entrada**

Em `CHANGELOG.md`, como **primeiro** item de `### Changed` dentro de `## [Unreleased]` (acima da entrada que começa com "O nome do pacote passa a ser `@esliph/claude-plugins`"):

```markdown
- O toolkit passa a rodar no Node do host: os ganchos do plugin invocam `node`
  direto, e o workflow de CI deste repositório instala Node e npm em vez de
  construir uma imagem. Quem clona precisa de Node 24 ou maior e de um `npm ci`
  antes do primeiro comando; em troca, os ganchos param de calar quando o
  container não está de pé. `compose.yaml`, `Dockerfile` e `./bin/living-docs`
  continuam no repositório, mas nada mais os invoca — registrado em `ADR-0015` e
  `TDR-0002`.
```

- [ ] **Step 2: Rodar `CI-6`**

```bash
node src/cli/index.ts changelog --base origin/master
```

Esperado: `living-docs: nenhuma violação encontrada.`

- [ ] **Step 3: Os cinco comandos da §5, na ordem**

```bash
npm ci
npm test
npm run typecheck
node src/cli/index.ts validate --base origin/master
node src/cli/index.ts drift
node src/cli/index.ts changelog --base origin/master
```

Esperado: `npm test` com `ℹ tests 520` e `ℹ fail 0`; `typecheck` sem saída; os três subcomandos com `nenhuma violação encontrada`. É a **execução** deles, não a leitura do diff, que fecha a migração.

- [ ] **Step 4: Prova 1 — nenhum documento vivo menciona Docker**

```bash
grep -rniE "docker|container" CLAUDE.md CONTRIBUTING.md README.md docs/definition-of-done.md docs/.ownership.yml docs/requirements/ docs/charter/ .gitattributes ; echo "exit: $?"
```

Esperado: nenhuma linha, `exit: 1`. Qualquer ocorrência aqui é trabalho não terminado das Tarefas 7, 8 ou 9.

- [ ] **Step 5: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs(ADR-0015): registra no CHANGELOG a migração para o Node do host"
```

- [ ] **Step 6: Prova 2 — um hook realmente roda**

`M-1` reescreveu o caminho que nenhum teste executa de ponta a ponta: `test/hooks/` exercita as decisões por payload, não o wrapper. A prova é uma sessão em que um hook responde de verdade, **com Docker parado**.

Primeiro, garanta que o container não está de pé:

```bash
docker compose down 2>/dev/null || true
```

Depois, invoque o wrapper como o Claude Code o invoca — payload em stdin, nome do hook como argumento:

```bash
CLAUDE_PROJECT_DIR="$PWD" printf '%s' '{"tool_name":"Edit","tool_input":{"file_path":"src/checks/ci1-structure.ts"}}' | bash plugin/hooks/run-hook.sh hk4-watch-reminder
```

Esperado: um JSON com `hookSpecificOutput.additionalContext` citando `docs/requirements/rules.md` — o doc dono de `src/checks/**` segundo `watches`. `HK-4` lembra, não bloqueia.

E a falha aberta, com um hook que não existe:

```bash
printf '%s' '{}' | bash plugin/hooks/run-hook.sh hk99-inexistente ; echo "exit: $?"
```

Esperado: saída vazia e `exit: 0`.

Se o primeiro comando não produzir saída, **não conclua que o wrapper está errado antes de conferir se o `npm ci` rodou** (spec §4): sem `node_modules/`, `node` sai com `ERR_MODULE_NOT_FOUND`, o wrapper cala por contrato, e o sintoma é idêntico ao de um wrapper quebrado.

---

## Task 12: Os dois documentos vivos que a §5 não varreu

**Files:**
- Modify: `plugin/skills/working-agreements-keeper/SKILL.md:63`
- Modify: `templates/workflow.yml:1-9` (o comentário de cabeçalho)

**Interfaces:**
- Consumes: `RNF-0002` reescrito (Tarefa 7).
- Produces: nada.

**Esta tarefa está fora das onze mudanças da spec.** Ela é separável de propósito: rejeitá-la não derruba nada. O que ela conserta é que dois documentos vivos passariam a afirmar o container depois da migração — um deles instalado no repositório de quem consome.

- [ ] **Step 1: A skill que ensina a escrever acordos**

`working-agreements-keeper` usa, como **exemplo** de linha bem escrita no formato "o que nunca fazer", a frase `"nunca rode \`npm\` fora do container"`. O exemplo passou a ensinar o oposto da regra vigente. Substitua a linha 63:

```markdown
   ("nunca promova uma decisão sem revisão humana").
```

O item 4 inteiro fica assim (o resto não muda):

```markdown
4. **Escreva uma linha, não um parágrafo.** Forma: *onde está a verdade* ("a
   regra de X mora em `docs/requirements/rules.md`") ou *o que nunca fazer*
   ("nunca promova uma decisão sem revisão humana").
```

- [ ] **Step 2: O template de workflow que o `init` instala**

O comentário de cabeçalho afirma que o toolkit roda em container. Substitua as linhas 1-9 de `templates/workflow.yml`:

```yaml
# Enforcement de documentação viva, instalado por `living-docs init`.
#
# O modo de invocação é parâmetro de quem instala (`--invoke`): como o toolkit
# chega a este CI é decisão aberta — `DA-0003` no repositório do toolkit —, e
# fixar aqui uma resposta transformaria a escolha do toolkit em regra do
# consumidor.
#
# Este arquivo é seu: o `init` só o cria quando ele não existe, e nunca o
# reescreve.
```

O resto do arquivo (de `name: living-docs` em diante) **não muda** — `test/cli/init-enforcement.test.ts` e `test/acceptance/consumer-repo.test.ts` afirmam o conteúdo dos passos.

- [ ] **Step 3: Rodar a suíte e os checks**

```bash
npm test
node src/cli/index.ts validate
node src/cli/index.ts changelog --base origin/master
```

Esperado: `ℹ fail 0` e `nenhuma violação encontrada` nos dois. `templates/**` e `plugin/**` são consumer-visible, e a entrada de `CHANGELOG.md` da Tarefa 11 já cobre a branch inteira.

- [ ] **Step 4: Commit**

```bash
git add plugin/skills/working-agreements-keeper/SKILL.md templates/workflow.yml
git commit -m "docs(RNF-0002): corrige o exemplo da skill e o cabeçalho do template de workflow"
```

---

## O que este plano deliberadamente não faz

- **Não toca `src/`.** `toolkitRoot()` e `repoRoot()` já são independentes de container; `hookEnv()` já trata a ausência de `LIVING_DOCS_HOST_ROOT`. `ADR-0003` sai intacto, sem supersessão.
- **Não apaga `Dockerfile`, `compose.yaml`, `.dockerignore` nem `bin/living-docs`.** `.dockerignore` serve ao `Dockerfile` que ficou: apagá-lo quebraria o build que sobrou.
- **Não reescreve registro histórico.** `docs/superpowers/plans/`, `research/`, o corpo dos ADRs anteriores e as entradas antigas do `CHANGELOG` ficam como estão.
- **Não revoga a metade não-Docker de `ADR-0001`** — TypeScript sem build step continua vigente, agora carregado por `ADR-0015`.
- **Não promove `ADR-0015` para `accepted`.** É ato humano; `HK-3` intercepta.
- **Não publica pacote nem imagem.** Como o toolkit chega ao CI de um consumidor continua sendo `DA-0003`, aberta.
- **Não remove `bin/living-docs` de `consumer-visible-paths` nem de `watches`.** Ele continua sendo contrato público até que `TDR-0002` seja pago.
