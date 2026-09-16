# Rastro interno do toolkit — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O texto que o toolkit entrega a quem instala — sementes do `init`, templates, plugin e strings de `src/` — deixa de citar ADR, RN e seções da spec do toolkit, e um teste de distribuição trava isso.

**Architecture:** Nasce a decisão (`ADR-0018`) e a regra (`RN-0031`). Um teste novo, `test/distribution/internal-trail.test.ts`, lê o conjunto de prefixos internos de `loadOwnership(toolkitRoot()).artifacts` — nenhuma lista de prefixos no teste — e varre três superfícies: o que o `init` semeia em cada estágio (mais `templates/**` cru), todo arquivo sob `plugin/`, e só as strings literais de `src/**/*.ts` (lidas pelo AST do TypeScript; comentário fica de fora e continua citando). O teste nasce vermelho e cada tarefa seguinte torna uma superfície verde. O ID removido de uma mensagem vai para um comentário de código logo acima da string.

**Tech Stack:** Node ≥ 24 executando TypeScript direto (sem build), `node:test`, `typescript` (já é devDependency; usado pelo teste via `ts.createSourceFile`), Prettier, ESLint.

**Spec:** `docs/superpowers/specs/2026-09-15-rastro-interno-do-toolkit-design.md` (manda neste plano). Insumo citado por ela: `docs/superpowers/specs/2026-09-10-fronteira-de-leitor-design.md`; `docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` §8 e §11; `RF-0002`, `RF-0003`, `RF-0005`; o commit `9b79aea`; `RN-0010`/`RN-0020`.

## Global Constraints

- Rodar no `node` do host: `npm ci` antes de tudo; `npm test`, `npm run typecheck`, `node src/cli/index.ts …`.
- Trabalhar numa branch isolada (superpowers:using-git-worktrees; `.worktrees/` já é ignorado). A base de comparação é `master`.
- Pré-condição (spec): o plano da fronteira de leitor está executado. Confirme com `ls docs/decisions/adr/ADR-0017-fronteira-de-leitor.md src/checks/ci11-external-audience.ts` — os dois existem.
- Prosa em português com acentuação completa; identificadores, chaves e nomes de arquivo em inglês/neutro.
- Mensagem de commit em português, `tipo(ID): assunto`, terminando com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Commit que altera arquivo de artefato cita um ID declarado nele (`CI-9`).
- Caminho vigiado alterado sem o doc dono leva a linha `Docs: none — <razão>` no corpo da mensagem. O texto exato está em cada tarefa. `HK-5` pergunta antes do commit: a resposta é seguir, porque a razão está escrita. Nas Tarefas 3 a 6, `HK-5` também aponta `CHANGELOG.md` (os caminhos são `consumer-visible`): a entrada entra uma vez só, na Tarefa 7, e `CI-6` a cobra sobre o diff inteiro contra `master`.
- `ADR-0018` e `RN-0031` nascem `status: draft`. Promover é ato humano (`HK-3`); não promova nada.
- **Nenhum placeholder de preenchimento sai das sementes**: "Substitua por um princípio real…", "Termo exemplo", `CODIGO-EXEMPLO`, as perguntas da Vision, `RN-nnnn`, `DA-nnnn`, `ADR-nnnn`. São a estrutura da semente (`RF-0003`, commit `9b79aea`).
- **Não mexer nos documentos deste repositório** além de `docs/decisions/adr/ADR-0018-…`, `docs/requirements/rules.md`, `CLAUDE.md` e `CHANGELOG.md`. O `docs/.ownership.yml` daqui, `docs/contracts/` e `docs/deprecations.md` continuam citando: aqui o rastro é interno.
- **Não emendar a spec do toolkit** nem tocar comentário de código que já existe ou mensagem de commit antiga.
- Mensagem nova de check, hook ou CLI **mantém** `CI-n`, `HK-n`, `SK-n`, `EXIT-n`, "skill dona: …", nomes de skill e comandos. Sai só a citação a prefixo de `artifacts:` e a `spec §n` / caminho `docs/superpowers/`.
- O ID ou a seção removidos de uma string vão para um comentário `// Regra de origem: …` na linha imediatamente acima dela, com a mesma indentação (`E-5`). Nunca dentro da string.
- `CHECK_CATALOG` não muda: `docs/contracts/checks.gen.md` não é regerado. Se por engano alguma descrição mudar, regere **pelo tool Bash**: `node src/tools/gen-checks.ts > docs/contracts/checks.gen.md` (nunca à mão — `HK-2`).
- Documento com frontmatter cujo corpo muda no commit ganha `last-reviewed: 2026-09-16`. Nunca atualizar a data sem mudar o corpo (`CI-9`).
- A entrada de `CHANGELOG.md` é escrita **sem ID de artefato** (`CI-11`).
- `CLAUDE.md` fica com no máximo 60 linhas **medidas por `split('\n').length`** (`test/docs/agent-contract.test.ts`) e não repete frase de 12 palavras de artefato com skill dona (`CI-7`).
- `npm run lint:check` **já falha em `master`**: 20 erros `@typescript-eslint/no-base-to-string` em código que este plano não toca (`String(raw)` e afins). Não é escopo corrigi-los. A barra é não acrescentar erro: `npx eslint src test --quiet` continua em 20.
- Formatar o que tocar fora de `templates/`: `npx prettier --write <arquivos>`. `templates/`, `docs/contracts/checks.gen.md` e `docs/superpowers/plans/` são ignorados pelo Prettier de propósito.
- Os blocos `diff` deste plano mostram linhas exatas: `-` sai, `+` entra, e o conteúdo começa no segundo caractere (a indentação vem depois do sinal). Linhas sem sinal são contexto e não mudam. Aplique com o tool Edit, usando as linhas `-` (e o contexto) como `old_string`.

## Desvios da spec, decididos na leitura do código

1. **Superfícies que a spec não listou, mas o teste de `M-3` reprova** — e por isso entram:
   - `templates/release-note.md` traz `id: REL-0001` no frontmatter. Vira `id: {{ID}}`, como `adr.md` e `tdr.md` (Tarefa 3).
   - `templates/ownership.yml` usa `RN-0009` como exemplo de forma escrita de ID. Vira prosa (Tarefa 3).
   - `plugin/agents/decision-adversary.md` (`spec §4`) e `plugin/hooks/run-hook.sh` (caminho da spec e `ADR-0003` em comentário de shell, que é entregue com o plugin) (Tarefa 4).
   - `src/checks/ci11-external-audience.ts` (`RN-0030`, `ADR-0017`, escritos pela fronteira de leitor) e os hooks `hk1`, `hk3`, `hk4` e `hk5`, que citam o caminho da spec (Tarefas 5 e 6).
   - `src/cli/init.ts:571` (`DA-0003` no aviso de `notInstalled`), com o ajuste de `test/cli/init-enforcement.test.ts:105`, que casava com o ID (Tarefa 6).
2. **A orientação que sai das sementes entra na skill no mesmo commit** (Tarefa 3), e não junto de `M-7`. É uma mudança de lugar: separá-la em dois commits deixaria um intervalo em que a orientação não está em lugar nenhum. A Tarefa 4 fica com o resto de `M-7`.
3. **`M-8` em duas tarefas**: checks (Tarefa 5) e hooks, CLI e configuração (Tarefa 6). O caso 3 do teste fica verde no fim da Tarefa 6.
4. **`test/checks/ci7-ownership-coverage.test.ts`** casava `achado.fix` com `RN-0008`, `RN-0016` e `RN-0017` para distinguir qual correção foi dita. Passa a casar com o texto da correção (Tarefa 5).
5. **Narração de roteiro que a varredura humana pegou no mesmo texto** é reescrita junto: "Na Fase 7" em `templates/ownership.yml` (já na spec), "quando a Fase 6 existir" e "Fase 6" em `contract-keeper`, "`CI-7` na Fase 7; até lá, humana" em `working-agreements-keeper`, "via `SK-6` quando existir" em `living-docs-bootstrap`, "spec SK-2, regra 3" em `glossary-keeper` e "(spec\n§13)" quebrado em duas linhas em `docs-divergence-auditor` — que o padrão por linha do teste não pega.
6. **`templates/changelog.md` mantém uma frase para quem lê**: o que o arquivo registra e que o formato é Keep a Changelog. Sai a regra de redação ("Teste único…", "A entrada nasce no PR…"), que é `G` externo. O critério de `§1` da spec — serve a quem lê fica — decide a frase que sobra.
7. **A busca da verificação final** procura `ADR-[0-9]`, `DA-[0-9]`, `RN-[0-9]` etc., e não `ADR-`, `DA-`, `RN-`: os placeholders `RN-nnnn`, `DA-nnnn` e `ADR-nnnn` das sementes ficam por ordem da própria spec e fariam a busca literal nunca voltar vazia.
8. **`M-9` cabe em três linhas, não quatro**: `CLAUDE.md` mede hoje 57 por `split('\n').length`, e o teto é 60.

## Fora de escopo (a spec §5, mais o que apareceu na leitura)

- Migrar repositório já instalado; o `init` não reescreve nem avisa.
- Os documentos deste repositório, a spec do toolkit, comentário de código existente, mensagens de commit antigas.
- Criar check `CI-n` ou mudar o contrato público.
- Travar por teste a faixa `B`, a prosa `G` externa e narração de roteiro.
- "Mecanismo 1" nos comentários de `templates/ownership.yml` e dos hooks: vocabulário do toolkit, mas não é citação; fica.
- Os comentários de código que já citam `RNF-0001`, `RN-0012` etc. — comentário é rastro interno e continua citando.

## Mapa de arquivos

| Arquivo | Tarefa | Responsabilidade |
| --- | --- | --- |
| `docs/decisions/adr/ADR-0018-rastro-interno-do-toolkit.md` | 1 | Criar: a decisão |
| `docs/requirements/rules.md` | 1 | Acrescentar `RN-0031` |
| `test/distribution/internal-trail.test.ts` | 2 | Criar: o detector e os três casos |
| `templates/ownership.yml`, `templates/workflow.yml`, `templates/ids-retired.txt`, `templates/tdr.md`, `templates/release-note.md` | 3 | Comentários sem rastro; `id: {{ID}}` |
| `templates/constitution.md`, `vision.md`, `glossary.md`, `contributing.md`, `errors.md`, `versioning-policy.md`, `deprecations.md`, `requirements.md`, `changelog.md` | 3 | Sem faixa de semente, sem comentário final, sem regra de redação externa |
| `src/cli/init.ts` (`documentsBlock`, `releasesBlock`) | 3 | Comentários do `.ownership.yml` semeado sem rastro |
| `plugin/skills/{charter,glossary,contract,working-agreements,requirements}-keeper/SKILL.md` | 3 | Recebem a orientação que saiu das sementes |
| `plugin/skills/*/SKILL.md`, `plugin/agents/*.md`, `plugin/hooks/run-hook.sh` | 4 | Sem rastro; checklist de comentário de template |
| `src/checks/ci1` … `ci11`, `test/checks/ci7-ownership-coverage.test.ts` | 5 | Mensagens de check sem rastro |
| `src/hooks/hk1` … `hk8`, `src/cli/index.ts`, `src/cli/init.ts:571`, `src/config/ownership.ts`, `test/cli/init-enforcement.test.ts` | 6 | Mensagens de hook, CLI e configuração sem rastro |
| `CLAUDE.md`, `CHANGELOG.md` | 7 | A política e a entrada; verificação final |

---

### Task 1: A decisão e a regra (`M-1`, `M-2`)

**Files:**
- Create: `docs/decisions/adr/ADR-0018-rastro-interno-do-toolkit.md`
- Modify: `docs/requirements/rules.md` (fim do arquivo, depois de `RN-0030`; `last-reviewed`)

**Interfaces:**
- Consumes: nada.
- Produces: os IDs `ADR-0018` e `RN-0031`, citados pelo teste da Tarefa 2, pelos comentários de código das Tarefas 5 e 6 e pelas mensagens de commit.

- [ ] **Step 1: Criar o ADR**

Crie `docs/decisions/adr/ADR-0018-rastro-interno-do-toolkit.md` com exatamente:

```markdown
---
id: ADR-0018
title: 'O que o toolkit entrega não cita o próprio rastro interno'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-16
relates-to: [RN-0031, ADR-0017]
supersedes: null
superseded-by: null
---

# ADR-0018 — O que o toolkit entrega não cita o próprio rastro interno

## Contexto

O toolkit escreve texto que passa a viver no repositório e na sessão de quem o
instala: os arquivos que o `init` semeia, os comentários do `.ownership.yml` e
do workflow, o texto das skills do plugin e as mensagens de check e de hook.
Esse texto cita ADR, RN e seções da spec do toolkit — rastro que só resolve
dentro do repositório do toolkit. Para quem instala, a citação não existe ou,
pior, resolve para um item dele com outro significado: o `ADR-0008` de quem
instala é a oitava decisão dele. E o `validate` passa sem dizer nada, porque
`CI-2` não lê comentário de YAML nem saída de check.

As sementes, além disso, trazem instrução de preenchimento — a faixa que diz
que o arquivo foi criado pelo `init`, o comentário que nomeia a skill dona — que
fica no documento depois de preenchido e passa a ser lida por quem nunca vai
escrever nele.

`ADR-0017` traçou a fronteira de leitor para os documentos de um repositório.
Esta decisão traça a irmã dela: o que atravessa do toolkit para quem instala.

## Alternativas consideradas

- **Manter.** Descartada: é o problema.
- **Qualificar a citação** ("`RN-0019` do toolkit"). Descartada: continua sem
  resolver para quem lê.
- **Linkar o repositório do toolkit.** Descartada: não há endereço estável
  enquanto `DA-0003` estiver aberta, e o link joga quem lê num documento interno
  de decisão — o motivo pelo qual `ADR-0017` descarta "ID com link".
- **Centralizar as mensagens num catálogo** e verificar só o catálogo.
  Descartada: refatora dezessete arquivos e afasta a mensagem do código que a
  produz.
- **Um check `CI-n` genérico**, ligado por chave no `.ownership.yml`. Descartada:
  cresce o contrato público para um problema que só o toolkit tem — só quem
  distribui texto a outros repositórios o tem, e hoje só o toolkit distribui.
- **Verificação só humana.** Descartada: é texto que agente e skill escrevem
  sozinhos, e a citação uniforme é o hábito que eles aprenderam; o ID volta sem
  que ninguém veja.

## Decisão

O texto que o toolkit entrega a quem instala não cita artefato nem seção da spec
do toolkit. Os identificadores da interface pública, os nomes de skill e os
comandos continuam citáveis: existem no ambiente de quem instala.

O formato de um documento mora no template; a regra de escrevê-lo mora na
skill. Orientação que só serve a quem escreve não fica em documento-coleção nem
em documento externo — nele, quem escreve não é quem lê.

O rastro continua existindo do lado de dentro: no comentário de código ao lado
da string que perdeu a citação, e na mensagem de commit. A verificação é um
teste do toolkit, que lê os prefixos internos do `.ownership.yml` do próprio
toolkit, e não um check que quem instala receba.

**Este ADR não emenda a spec do toolkit.** A citação uniforme segue valendo
dentro do repositório do toolkit — artefato, teste, código, commit. O que muda é
o que atravessa para quem instala; emendar a spec para dizer "uniforme, exceto…"
trocaria uma regra simples por uma regra com exceção no lugar em que ela é mais
lida.

## Consequências

### O que se ganha

Quem instala recebe semente, skill e mensagem que se sustentam sozinhas, e o
documento preenchido não carrega instrução para ninguém. A regra que o toolkit
impõe aos documentos externos de quem instala não nasce descumprida pelo próprio
toolkit, e uma família nova declarada no toolkit passa a ser vigiada no mesmo
commit.

### O que se aceita perder

**Quem instala e trabalha sem agente recebe a semente sem instrução de
preenchimento.** A instrução mora na skill.

**Repositório já instalado mantém o texto antigo.** O `init` não reescreve e não
passa a avisar.

**O teste pode reprovar uma string de `src/` que não é saída** — um regex, um
dado. Hoje nenhuma casa.

**Quem mantém o toolkit lê o porquê de uma mensagem no comentário ao lado**, não
na mensagem.

**A spec do toolkit continua afirmando a uniformidade.** Quem lê só a spec não
vê o recorte sem passar por este ADR.
```

- [ ] **Step 2: Acrescentar a regra**

Em `docs/requirements/rules.md`, troque `last-reviewed: 2026-09-15` por `last-reviewed: 2026-09-16` e acrescente ao fim do arquivo, depois do último parágrafo de `RN-0030` (com uma linha em branco antes):

```markdown
## RN-0031 — O que o toolkit entrega a quem instala não cita o rastro interno do toolkit

- **status:** draft
- **relates-to:** ADR-0018, RN-0030
- **fora de escopo:** comentário de código e mensagem de commit; os documentos do próprio repositório do toolkit; os IDs do projeto de quem instala que uma mensagem mostra; os identificadores da interface pública, os nomes de skill e os comandos

Os arquivos que o `init` semeia, os templates, o texto do plugin e a saída do
CLI e dos hooks não citam prefixo declarado em `artifacts:` do toolkit, seção da
spec do toolkit nem caminho de documento interno dele. Quem instala não resolve
a citação — ou a resolve para um item seu, com outro significado.
```

- [ ] **Step 3: Formatar**

Run: `npx prettier --write docs/decisions/adr/ADR-0018-rastro-interno-do-toolkit.md docs/requirements/rules.md`
Expected: os dois arquivos listados, sem erro.

- [ ] **Step 4: Verificar**

Run: `npm test && node src/cli/index.ts validate`
Expected: todos os testes passam (incluindo `RN-0010` de `test/docs/agent-contract.test.ts`, que lê os títulos de `rules.md`); `living-docs: nenhuma violação encontrada.` Se `CI-2` acusar citação que não resolve, o ID digitado em `relates-to` está errado.

- [ ] **Step 5: Commit**

```bash
git add docs/decisions/adr/ADR-0018-rastro-interno-do-toolkit.md docs/requirements/rules.md
git commit -F - <<'EOF'
docs(ADR-0018): registra que o que o toolkit entrega não cita o próprio rastro interno

Nasce a decisão de que sementes, templates, plugin e mensagens do CLI e dos
hooks não citam artefato nem seção da spec do toolkit, e a regra RN-0031 que
a torna verificável por um teste do toolkit. As duas nascem draft.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: O teste de distribuição, vermelho (`M-3`)

**Files:**
- Create: `test/distribution/internal-trail.test.ts`

**Interfaces:**
- Consumes: `runInit(root: string, options: InitOptions): InitResult` e `STAGES` de `src/cli/init.ts`; `loadOwnership(root: string): OwnershipConfig` de `src/config/ownership.ts` (usa `.artifacts[].idPrefix` e `.idFormat`); `toolkitRoot(): string` de `src/core/roots.ts`; `DEFAULT_ID_FORMAT` e `parseId(value, format): { prefix; number } | null` de `src/docs/schema.ts`; `findCitations(source, format): { id; line }[]` de `src/ids/citations.ts`; `withTempRepo(files, fn)` de `test/helpers/tmp.ts`.
- Produces: quatro testes com nomes estáveis, que as tarefas seguintes rodam por `--test-name-pattern`:
  - `RN-0031: o detector …` (verde desde já)
  - `RN-0031: o que o init semeia …` (verde na Tarefa 3)
  - `RN-0031: o texto do plugin …` (verde na Tarefa 4)
  - `RN-0031: as strings do código …` (verde na Tarefa 6)

`package.json` já roda `node --test "test/**/*.test.ts"`: o diretório novo entra sem configuração.

- [ ] **Step 1: Escrever o teste**

Crie `test/distribution/internal-trail.test.ts` com exatamente:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import ts from 'typescript'
import { runInit, STAGES } from '../../src/cli/init.ts'
import { loadOwnership } from '../../src/config/ownership.ts'
import { toolkitRoot } from '../../src/core/roots.ts'
import { DEFAULT_ID_FORMAT, parseId } from '../../src/docs/schema.ts'
import { findCitations } from '../../src/ids/citations.ts'
import { withTempRepo } from '../helpers/tmp.ts'

/**
 * RN-0031: o que o toolkit entrega a quem instala — os arquivos que o `init`
 * semeia, os templates, o texto do plugin e as strings do código — não cita o
 * rastro interno do toolkit (ADR-0018).
 *
 * Rastro interno é o prefixo declarado em `artifacts:` do `.ownership.yml` do
 * toolkit, mais `spec §<n>` e o caminho `docs/superpowers/`. Nenhuma lista de
 * prefixos mora aqui: `CI-n`, `HK-n`, `SK-n`, `CM-n` e `EXIT-n` ficam de fora
 * porque ninguém os declara como família de artefato — o mesmo desenho de CI-11.
 */
const ROOT = toolkitRoot()
const CONFIG = loadOwnership(ROOT)
const INTERNAL = new Set(CONFIG.artifacts.map(artifact => artifact.idPrefix))

interface Trail {
  file: string
  line: number
  excerpt: string
}

/** As ocorrências de rastro interno em `text`, com a linha 1-indexed. */
function trailIn(file: string, text: string): Trail[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n')
  const found: Trail[] = []

  for (const citation of findCitations(text, CONFIG.idFormat)) {
    const parsed = parseId(citation.id, CONFIG.idFormat)

    if (parsed !== null && INTERNAL.has(parsed.prefix)) {
      found.push({ file, line: citation.line, excerpt: citation.id })
    }
  }
  lines.forEach((line, index) => {
    for (const match of line.matchAll(/spec §\d+|docs\/superpowers\//g)) {
      found.push({ file, line: index + 1, excerpt: match[0] })
    }
  })

  return found
}

function report(found: readonly Trail[]): string {
  return found.map(trail => `${trail.file}:${trail.line} — ${trail.excerpt}`).join('\n')
}

function filesUnder(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? filesUnder(join(directory, entry.name)) : [join(directory, entry.name)],
  )
}

function toolkitPath(absolute: string): string {
  return relative(ROOT, absolute).split(sep).join('/')
}

test('RN-0031: o detector acha o rastro interno e deixa a interface pública e o placeholder', () => {
  const texto = [
    'Regra de origem: ADR-0011 e spec §3, em docs/superpowers/research/x.md.',
    'CI-7 reprova, HK-2 bloqueia, SK-7 e EXIT-2 são públicos.',
    '| Termo | Fonte | RN-nnnn |',
  ].join('\n')

  assert.deepEqual(
    trailIn('x', texto).map(trail => `${trail.line}:${trail.excerpt}`),
    ['1:ADR-0011', '1:spec §3', '1:docs/superpowers/'],
  )
  assert.ok(INTERNAL.has('ADR') && INTERNAL.has('RN'), 'o conjunto vem do .ownership.yml do toolkit')
})

test('RN-0031: o que o init semeia, em todo estágio, e os templates crus não citam o rastro interno do toolkit', () => {
  const found: Trail[] = []
  const comments: string[] = []
  let scanned = 0

  for (const stage of STAGES) {
    withTempRepo({}, root => {
      const result = runInit(root, {
        owner: '@time',
        dryRun: false,
        stage,
        idFormat: DEFAULT_ID_FORMAT,
        invoke: 'npx living-docs',
        marketplace: 'time/living-docs',
      })

      for (const entry of result.created) {
        // `created` traz diretório (`docs/decisions/adr/`) e a linha do settings
        // com um sufixo explicativo depois do caminho.
        const path = entry.split(' ')[0] ?? entry
        const absolute = join(root, path)

        if (!existsSync(absolute) || statSync(absolute).isDirectory()) {
          continue
        }
        const source = readFileSync(absolute, 'utf8')

        scanned++
        found.push(...trailIn(`[${stage}] ${path}`, source))
        // Nenhum estágio semeia artefato por arquivo: tudo que o init escreve é
        // documento-coleção ou documento externo, e nenhum dos dois guarda
        // comentário para quem escreve.
        if (path.endsWith('.md') && source.includes('<!--')) {
          comments.push(`[${stage}] ${path}`)
        }
      }
    })
  }

  // Os templates que o init não semeia (adr, tdr, migration, release-note) só
  // são cobertos por esta varredura crua.
  for (const absolute of filesUnder(join(ROOT, 'templates'))) {
    scanned++
    found.push(...trailIn(toolkitPath(absolute), readFileSync(absolute, 'utf8')))
  }

  assert.ok(scanned > 20, `varredura vazia demais: ${scanned} arquivo(s)`)
  assert.deepEqual(comments, [], `semente com comentário HTML:\n${comments.join('\n')}`)
  assert.equal(found.length, 0, `rastro interno do toolkit no que o init entrega:\n${report(found)}`)
})

test('RN-0031: o texto do plugin não cita o rastro interno do toolkit', () => {
  const files = filesUnder(join(ROOT, 'plugin'))
  const found = files.flatMap(absolute => trailIn(toolkitPath(absolute), readFileSync(absolute, 'utf8')))

  assert.ok(files.length > 10, `varredura vazia demais: ${files.length} arquivo(s)`)
  assert.equal(found.length, 0, `rastro interno do toolkit no plugin:\n${report(found)}`)
})

test('RN-0031: as strings do código não citam o rastro interno do toolkit — comentário pode', () => {
  const files = filesUnder(join(ROOT, 'src')).filter(absolute => absolute.endsWith('.ts'))
  const found: Trail[] = []

  for (const absolute of files) {
    const file = toolkitPath(absolute)
    const source = ts.createSourceFile(absolute, readFileSync(absolute, 'utf8'), ts.ScriptTarget.Latest, true)

    const visit = (node: ts.Node): void => {
      if (
        ts.isStringLiteral(node) ||
        ts.isNoSubstitutionTemplateLiteral(node) ||
        ts.isTemplateHead(node) ||
        ts.isTemplateMiddle(node) ||
        ts.isTemplateTail(node)
      ) {
        const start = source.getLineAndCharacterOfPosition(node.getStart(source)).line

        for (const trail of trailIn(file, node.text)) {
          found.push({ ...trail, line: start + trail.line })
        }
      }
      ts.forEachChild(node, visit)
    }

    visit(source)
  }

  assert.ok(files.length > 20, `varredura vazia demais: ${files.length} arquivo(s)`)
  assert.equal(found.length, 0, `rastro interno do toolkit em string de src/:\n${report(found)}`)
})
```

- [ ] **Step 2: Rodar e ver falhar pelos motivos certos**

Run: `node --test --test-reporter=tap test/distribution/internal-trail.test.ts 2>&1 | grep -E "^(not ok|ok) |^# (pass|fail)"`
Expected:

```
ok 1 - RN-0031: o detector acha o rastro interno e deixa a interface pública e o placeholder
not ok 2 - RN-0031: o que o init semeia, em todo estágio, e os templates crus não citam o rastro interno do toolkit
not ok 3 - RN-0031: o texto do plugin não cita o rastro interno do toolkit
not ok 4 - RN-0031: as strings do código não citam o rastro interno do toolkit — comentário pode
# pass 1
# fail 3
```

Run: `node --test test/distribution/internal-trail.test.ts 2>&1 | grep -oE "semente com comentário HTML|\[production\] docs/deprecations\.md|plugin/skills/glossary-keeper/SKILL\.md:17 — ADR-0004|src/checks/ci1-structure\.ts:45 — spec §2" | sort -u`
Expected, as quatro linhas: `[production] docs/deprecations.md`, `plugin/skills/glossary-keeper/SKILL.md:17 — ADR-0004`, `semente com comentário HTML` e `src/checks/ci1-structure.ts:45 — spec §2`. O caso 2 falha primeiro na trava de comentário HTML: em `production` e `multi-team` ela lista nove caminhos (`docs/requirements/functional.md`, `non-functional.md`, `rules.md`, `docs/glossary.md`, `docs/charter/constitution.md`, `vision.md`, `docs/contracts/errors.md`, `versioning-policy.md`, `docs/deprecations.md`). Se o caso 1 falhar, o detector está errado: pare e corrija antes de seguir.

- [ ] **Step 3: Typecheck e lint**

Run: `npm run typecheck && npx eslint test/distribution && npx prettier --check test/distribution`
Expected: typecheck sem erro; ESLint só com os avisos `no-floating-promises` nas chamadas `test(...)`, iguais aos dos outros testes do repositório; Prettier `All matched files use Prettier code style!`.

- [ ] **Step 4: Commit**

```bash
git add test/distribution/internal-trail.test.ts
git commit -F - <<'EOF'
test(RN-0031): trava o rastro interno do toolkit no que ele entrega

O teste lê os prefixos internos do .ownership.yml do toolkit e varre três
superfícies: o que o init semeia em cada estágio (e os templates crus), o
plugin, e as strings literais de src/. Nasce vermelho nas três; cada uma fica
verde no commit que a limpa.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: As sementes, os templates e os comentários que o `init` monta (`M-4`, `M-5`, `M-6`, e a orientação de `M-7`)

**Files:**
- Modify: `templates/ownership.yml`, `templates/workflow.yml`, `templates/ids-retired.txt`, `templates/tdr.md`, `templates/release-note.md`
- Modify: `templates/constitution.md`, `templates/vision.md`, `templates/glossary.md`, `templates/contributing.md`, `templates/errors.md`, `templates/versioning-policy.md`, `templates/deprecations.md`, `templates/requirements.md`, `templates/changelog.md`
- Modify: `src/cli/init.ts` (`documentsBlock`, `releasesBlock`)
- Modify: `plugin/skills/charter-keeper/SKILL.md`, `plugin/skills/glossary-keeper/SKILL.md`, `plugin/skills/contract-keeper/SKILL.md`, `plugin/skills/working-agreements-keeper/SKILL.md`, `plugin/skills/requirements-keeper/SKILL.md`

**Interfaces:**
- Consumes: o teste `RN-0031: o que o init semeia …` da Tarefa 2.
- Produces: `templates/release-note.md` com `id: {{ID}}` (quem preenche troca o placeholder, como já faz em `adr.md`). Nenhuma assinatura de código muda.

**O critério de cada frase** (spec `§1`): serve a quem **lê** o documento, fica como prosa sem nome de toolkit nem de skill; serve só a quem **escreve**, sai — e, antes de sair, confirma-se que a skill dona já a diz. A tabela abaixo é essa confirmação:

| Frase que sai da semente | Onde a skill já diz, ou o que entra nela neste commit |
| --- | --- |
| constitution: formato `— verificado por`; princípio sem enforcement é slogan; recusa | `charter-keeper`, Procedimento passo 2 (já diz) |
| constitution, glossary, contributing, errors, versioning-policy: "Substitua o exemplo…; apagar o que sobra é parte do trabalho" | Entra: passo novo em `charter-keeper`, `glossary-keeper`, `contract-keeper` e `working-agreements-keeper` |
| vision: "se a alteração não muda nenhuma das três, não é mudança de Vision" | `charter-keeper`, passo 1 (já diz) |
| glossary: um significado só; dois termos e um `banned` | `glossary-keeper`, passo 2 (já diz) |
| glossary: "Termos entram como linhas acima" | `glossary-keeper`, "Formato da linha: `templates/glossary.md`" (já diz) |
| errors: código publicado nunca muda de significado; sem substituto é quebra, passa por política e ADR | `contract-keeper`, passo 6 (já diz) |
| versioning-policy: o que é gerado não se escreve aqui | `contract-keeper`, Overview (já diz) |
| deprecations: as quatro coisas; faltando uma é quebra | `release-historian`, passo 4 (já diz) |
| changelog: teste único; a entrada nasce no PR; Keep a Changelog | `release-historian`, passos 2 e 3 e a tabela (já diz) |
| requirements: "As seções entram abaixo" | Entra: `requirements-keeper`, passo 5 |
| comentários `Skill dona: …` | `docs/.ownership.yml` declara (`skill:`) |

- [ ] **Step 1: `templates/ownership.yml`**

```diff
 # O único arquivo específico deste projeto. Hooks e checks não conhecem
-# caminho nenhum — leem daqui. Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §3.
+# caminho nenhum — leem daqui.
 version: 1
 stale-after-months: 6
 
-# A forma escrita de um ID neste projeto (ADR-0011). A identidade NÃO depende
-# dela: `RN009` e `RN-0009` são o mesmo item. Mude isto para adotar um
-# repositório cujos IDs já se escrevem de outro jeito — nunca renumere o
-# repositório para caber no padrão.
+# A forma escrita de um ID neste projeto. A identidade NÃO depende dela: o mesmo
+# prefixo com o mesmo número é o mesmo item, com ou sem separador e com qualquer
+# quantidade de zeros à esquerda. Mude isto para adotar um repositório cujos IDs
+# já se escrevem de outro jeito — nunca renumere o repositório para caber no
+# padrão.
```

```diff
     # A tabela é lida por gente, em português; o check pergunta pelo nome
     # canônico. O mapeamento mora aqui porque é a única coisa específica do
-    # projeto (spec §3).
+    # projeto.
```

```diff
 # Mecanismo 1: código → doc dono. HK-4 lembra depois da edição, HK-5 pergunta
-# antes do commit. Na Fase 7, CI-7 lê daqui também. Preencha com os caminhos do
-# SEU código — o init não inventa vínculo, porque vínculo que ninguém reconhece
-# ensina a ignorar o lembrete. Exemplo:
+# antes do commit, e CI-7 lê daqui também. Preencha com os caminhos do SEU
+# código — o init não inventa vínculo, porque vínculo que ninguém reconhece
+# ensina a ignorar o lembrete. Exemplo:
```

Os comentários de `generated` e de `consumer-visible-paths` não mudam.

- [ ] **Step 2: `templates/workflow.yml`, `templates/ids-retired.txt`, `templates/tdr.md`, `templates/release-note.md`**

`templates/workflow.yml`:

```diff
 # Enforcement de documentação viva, instalado por `living-docs init`.
 #
-# O modo de invocação é parâmetro de quem instala (`--invoke`): como o toolkit
-# chega a este CI é decisão aberta — `DA-0003` no repositório do toolkit —, e
-# fixar aqui uma resposta transformaria a escolha do toolkit em regra do
-# consumidor.
+# O modo de invocação é parâmetro de quem instala: `--invoke` escolhe como o CLI
+# é chamado neste CI.
 #
 # Este arquivo é seu: o `init` só o cria quando ele não existe, e nunca o
 # reescreve.
```

`templates/ids-retired.txt` fica com exatamente:

```
# IDs retirados. Nunca são reciclados.
# Um ID por linha.
```

`templates/tdr.md`:

```diff
-# Gatilho de pagamento em forma de máquina (RN-0019, ADR-0007). Descomente e
+# Gatilho de pagamento em forma de máquina. Descomente e
```

`templates/release-note.md`:

```diff
 ---
-id: REL-0001
+id: {{ID}}
 title: v0.0.0
```

Os comentários `<!-- … -->` de `adr.md`, `tdr.md`, `release-note.md` e `migration.md` ficam: são `F`, somem ao preencher.

- [ ] **Step 3: As sementes de charter**

`templates/constitution.md` — o corpo, depois do frontmatter, fica com exatamente:

```markdown
# Constitution

O que é inviolável neste projeto. Cada princípio nomeia o que o verifica: um
hook, um lint, um teste, uma revisão ou um check.

## Princípios

1. Substitua por um princípio real deste projeto — verificado por <nomeie aqui>.

## Log de emendas

- {{TODAY}} — v1 — Criação inicial — humana.
```

`templates/vision.md` — o corpo, depois do frontmatter, fica com exatamente:

```markdown
# Product Vision

Três perguntas, e só elas: que problema este produto resolve, para quem, e como
se sabe que ele foi resolvido.

**Que problema:** substitua pelo problema real que este produto resolve.

**Para quem:** substitua por quem sente esse problema.

**Métrica de sucesso:** substitua pela métrica que prova que o problema foi resolvido.
```

O frontmatter dos dois não muda. Cada arquivo termina com uma quebra de linha depois da última linha mostrada.

- [ ] **Step 4: Glossário, contribuição e requisitos**

`templates/glossary.md` — o corpo, depois do frontmatter:

```markdown
# Glossary

Cada termo tem um significado só. Um termo `banned` não se usa: a coluna "Não
confundir com" aponta o substituto.

| Termo | Definição | Nome no código | Não confundir com | Fonte | Status |
| --- | --- | --- | --- | --- | --- |
| Termo exemplo | Substitua pela definição real | `nomeNoCodigo` | O que parece sinônimo mas não é | RN-nnnn | active |
```

`templates/contributing.md` — apague as duas linhas da faixa e a linha em branco que as segue:

```diff
 # Como se contribui
 
-> Semente criada por `living-docs init`. Substitua o que não for verdade neste
-> projeto; apagar o que sobra é parte do trabalho.
-
 ## O ciclo
```

`templates/requirements.md` — apague o comentário final e a linha em branco antes dele. O arquivo passa a terminar em:

```markdown
O `nnnn` acima é literal de propósito: o exemplo não pode virar um requisito de
verdade nem uma citação pendurada. Troque-o pelo próximo número livre, conferido
contra `docs/ids-retired.txt`.
```

- [ ] **Step 5: Contratos**

`templates/errors.md` — o corpo, depois do frontmatter:

```markdown
# Catálogo de erros

Um código, uma vez publicado, nunca muda de significado: quando sai de uso,
ganha `deprecated` e um substituto. O código é o contrato; a mensagem exibível
não é parte dele.

| Código | Significado | Quando ocorre | Transporte | Público | Status |
| --- | --- | --- | --- | --- | --- |
| CODIGO-EXEMPLO | Substitua pelo significado estável, não pela mensagem exibível | A condição observável que o dispara | HTTP 400 / exit 2 / evento | sim | active |
```

`templates/versioning-policy.md`:

```diff
 # Política de versionamento
 
-> Semente criada por `living-docs init`. É a política **em volta** do contrato,
-> não o contrato: o que é gerado não se escreve aqui. Substitua o que não for
-> verdade neste projeto.
+Esta é a política **em volta** do contrato público, não o contrato: o que é
+gerado mora no artefato gerado.
 
 ## O que é público
```

e, no fim do arquivo, apague a linha em branco e o comentário final:

```diff
 Mudança quebra-compatibilidade passa por um ADR — a decisão e o que se aceita
 perder ficam registrados, não na cabeça de quem estava na sala.
-
-<!-- Skill dona: contract-keeper. -->
```

- [ ] **Step 6: Rastro histórico (documentos externos)**

`templates/deprecations.md` — o corpo, depois do frontmatter:

```markdown
# Depreciações

| O que | Anunciado em | Removido em | Substituto | Guia de migração | Status |
| --- | --- | --- | --- | --- | --- |
```

`templates/changelog.md` fica com exatamente (desvio 6):

```markdown
# Changelog

O que muda para quem usa este projeto, versão a versão. O formato segue
[Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Unreleased]

### Added

### Changed

### Deprecated

### Removed

### Fixed

### Security
```

`templates/open-decisions.md`, `templates/definition-of-done.md` e `templates/agent-contract.md` não mudam: a prosa deles é para quem lê o documento interno, e os identificadores são `D`.

- [ ] **Step 7: Os comentários que o `init` monta**

Em `src/cli/init.ts`, `documentsBlock`:

```diff
   return [
-    '# Documento com dono e SEM família de IDs (ADR-0008, que resolve DA-0002).',
+    // Regra de origem: ADR-0008, que resolve DA-0002.
+    '# Documento com dono e SEM família de IDs.',
     '# CI-4 cobra a revisão e CI-7 cobra o dono; CI-1, CI-2 e HK-1 não leem daqui.',
```

Em `releasesBlock`:

```diff
       '    audience: external',
-      '    # Release note publicada é congelada por HK-1 (spec §5, SK-7, regra 4).',
+      // Regra de origem: spec §5, SK-7, regra 4.
+      '    # Release note publicada é congelada por HK-1.',
       '    append-only: true',
```

- [ ] **Step 8: A orientação de quem escreve entra nas skills**

`plugin/skills/charter-keeper/SKILL.md`, depois do passo 6 do Procedimento:

```diff
 6. **Pare depois de escrever a emenda.** Aceitar é ato humano — não altere
    o corpo publicado por conta própria.
+7. **A semente não é conteúdo.** Na primeira escrita sobre o que o `init`
+   semeou, substitua o exemplo pelo real e apague o que sobrar.
```

`plugin/skills/glossary-keeper/SKILL.md`, depois do passo 8:

```diff
 8. **Cite o termo (pelo nome) na mensagem de commit.**
+9. **A semente não é conteúdo.** Na primeira escrita sobre o que o `init`
+   semeou, a linha "Termo exemplo" sai e o vocabulário real entra.
```

`plugin/skills/contract-keeper/SKILL.md`, depois do passo 9:

```diff
 9. **Cite o ID afetado na mensagem de commit.**
+10. **A semente não é conteúdo.** Na primeira escrita sobre o que o `init`
+    semeou, `CODIGO-EXEMPLO` sai, e o que não for verdade na política de
+    versionamento deste projeto também.
```

`plugin/skills/working-agreements-keeper/SKILL.md`, depois do passo 9:

```diff
    agente ou a Definition of Done) e uma linha no CODEOWNERS.
+10. **A semente não é conteúdo.** Na primeira escrita sobre o que o `init`
+    semeou, o que não for verdade neste projeto sai — apagar o que sobra é parte
+    do trabalho.
```

`plugin/skills/requirements-keeper/SKILL.md`, passo 5:

```diff
 5. **Tome o próximo ID livre** do prefixo, conferindo `docs/ids-retired.txt`.
-   Nunca recicle, nunca pule.
+   Nunca recicle, nunca pule. A seção nova entra no fim do arquivo, depois das
+   que já existem.
```

- [ ] **Step 9: Rodar o caso e ver passar**

Run: `node --test --test-name-pattern="o que o init semeia" test/distribution/internal-trail.test.ts`
Expected: PASS (`# pass 1`, `# fail 0`). Se falhar, a mensagem lista `arquivo:linha — trecho`: corrija o trecho, nunca o teste.

- [ ] **Step 10: Nada mais quebrou**

Run: `npx prettier --write src/cli/init.ts plugin/skills/charter-keeper/SKILL.md plugin/skills/glossary-keeper/SKILL.md plugin/skills/contract-keeper/SKILL.md plugin/skills/working-agreements-keeper/SKILL.md plugin/skills/requirements-keeper/SKILL.md && npm run typecheck && node --test "test/cli/**/*.test.ts" "test/acceptance/**/*.test.ts" "test/plugin/**/*.test.ts" "test/config/**/*.test.ts" "test/docs/**/*.test.ts"`
Expected: typecheck limpo; todos PASS. `test/plugin/authoring.test.ts` continua verde (seções na ordem, checklist com verificação). `test/cli/init.test.ts` (`RN-0019`, o `pay-when` comentado em `tdr.md`) continua verde.

- [ ] **Step 11: Commit**

```bash
git add templates src/cli/init.ts plugin/skills/charter-keeper/SKILL.md plugin/skills/glossary-keeper/SKILL.md plugin/skills/contract-keeper/SKILL.md plugin/skills/working-agreements-keeper/SKILL.md plugin/skills/requirements-keeper/SKILL.md
git commit -F - <<'EOF'
docs(RN-0031): as sementes do init perdem o rastro do toolkit e a instrução de quem escreve

O .ownership.yml, o workflow, os IDs retirados e os templates deixam de citar
ADR, DA, RN e seções da spec do toolkit. As sementes Markdown perdem a faixa
de semente e o comentário de skill dona; o que servia a quem lê virou prosa, e
o que servia só a quem escreve mudou para a skill dona no mesmo commit. A
release note passa a nascer com id: {{ID}}, como ADR e TDR.

Docs: none — RN-0031, que esta mudança cumpre, nasceu no commit da decisão; o que muda em CONTRIBUTING é só a orientação de preenchimento, que mora na skill.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: O plugin (`M-7`)

**Files:**
- Modify: `plugin/skills/charter-keeper/SKILL.md`, `plugin/skills/contract-keeper/SKILL.md`, `plugin/skills/glossary-keeper/SKILL.md`, `plugin/skills/living-docs-bootstrap/SKILL.md`, `plugin/skills/release-historian/SKILL.md`, `plugin/skills/requirements-keeper/SKILL.md`, `plugin/skills/working-agreements-keeper/SKILL.md`, `plugin/skills/decision-recorder/SKILL.md`
- Modify: `plugin/agents/decision-adversary.md`, `plugin/agents/docs-divergence-auditor.md`, `plugin/hooks/run-hook.sh`

**Interfaces:**
- Consumes: o teste `RN-0031: o texto do plugin …` da Tarefa 2.
- Produces: nada de código. As referências a `templates/…` ficam: o agente lê o template na raiz do toolkit instalado.

As linhas de tabela Markdown mostradas abaixo são as de antes do Prettier; depois do Step 9 ele realinha as colunas.

- [ ] **Step 1: `charter-keeper`**

```diff
-estratégia. Nenhum dos dois tem família de ID numerada (`ADR-0004`) —
-mudança neles é rara o bastante para não precisar.
+estratégia. Nenhum dos dois tem família de ID numerada — mudança neles é rara
+o bastante para não precisar.
```

- [ ] **Step 2: `contract-keeper`**

```diff
 **Não use** para documentar comportamento interno: o que não é observável por
 um consumidor não é contrato, é implementação — e implementação não vira
-documento (spec §13). Regra de negócio é `requirements-keeper`; o "por quê" da
-mudança é `decision-recorder`.
+documento. Regra de negócio é `requirements-keeper`; o "por quê" da mudança é
+`decision-recorder`.
```

```diff
 2. **Para mudar o que é gerado, mude a fonte anotada** e rode o comando
    declarado em `generated[].command`. O comando imprime na saída padrão e não
-   escreve arquivo (`ADR-0005`) — redirecione você mesmo para o `path`.
+   escreve arquivo — redirecione você mesmo para o `path`.
```

```diff
-8. **Mudança visível ao consumidor gera entrada no CHANGELOG** — quando a
-   Fase 6 (`release-historian`, `CI-6`) existir. Até lá, isso é verificação
-   humana, e a política de versionamento diz o que fazer.
+8. **Mudança visível ao consumidor gera entrada no CHANGELOG** — a entrada é
+   de `release-historian`, e `CI-6` a cobra nos caminhos que o projeto declara
+   em `consumer-visible-paths`.
```

```diff
-| Exigir substituto antes de depreciar                          | Escrever o guia de migração (é `release-historian`, Fase 6) |
+| Exigir substituto antes de depreciar                          | Escrever o guia de migração (é `release-historian`) |
```

```diff
-- [ ] O gerador imprime na saída padrão e não escreve arquivo — verificação: humana (`ADR-0005`)
+- [ ] O gerador imprime na saída padrão e não escreve arquivo — verificação: humana
```

- [ ] **Step 3: `glossary-keeper`** (sete citações)

```diff
 O glossary é a única fonte de nome para um conceito. Um termo é identificado
-pelo **nome**, nunca por um ID numerado (`ADR-0004`, `RN-0011`) — divergência
-entre o nome no código e o termo é bug, não sinônimo.
+pelo **nome**, nunca por um ID numerado — divergência entre o nome no código e
+o termo é bug, não sinônimo.
```

```diff
 4. **Toda definição aponta a fonte** — a `RN`/`ADR` que a origina. Sem fonte,
-   a entrada nasce `status: draft` até que uma exista (spec SK-2, regra 3).
+   a entrada nasce `status: draft` até que uma exista.
```

```diff
 6. **Nomeie pelo termo, não por ID**, em qualquer citação — glossary não tem
-   sintaxe `<PREFIXO>-<número>` (`ADR-0004`, `RN-0011`).
-7. **Rode `living-docs validate`** antes de encerrar — sabendo que hoje ele
-   não varre `docs/glossary.md` (`DA-0002` aberta; `ADR-0004` explica por
-   quê). A verificação de duplicidade e de fonte é sua, não do CI.
+   sintaxe `<PREFIXO>-<número>`.
+7. **Rode `living-docs validate`** antes de encerrar — sabendo que ele não
+   verifica os termos: duplicidade e fonte são verificação sua, não do CI.
```

```diff
-- [ ] Nenhum termo ganhou um ID numerado — verificação humana (`RN-0011`)
+- [ ] Nenhum termo ganhou um ID numerado — verificação humana
```

- [ ] **Step 4: `living-docs-bootstrap`** (cinco citações)

```diff
    Leia também a linha `formato`: quando o repositório escreve IDs de outro
-   jeito (`RN001` em vez de `RN-0009`), o inventário diz qual forma achou e
-   quantas ocorrências leu nela. **Confirme com quem é dono do repositório** e
-   declare com `--id-separator` e `--id-padding` — nunca renumere o que já
-   existe para caber no padrão do toolkit (`ADR-0011`, `RF-0014`).
+   jeito (sem separador, ou com outra quantidade de zeros), o inventário diz
+   qual forma achou e quantas ocorrências leu nela. **Confirme com quem é dono
+   do repositório** e declare com `--id-separator` e `--id-padding` — nunca
+   renumere o que já existe para caber no padrão do toolkit.
```

```diff
    `production` (produção com usuários) ou `multi-team` (múltiplos times) — e
-   derive o conjunto **mínimo** de fases (spec §10). Os quatro nomes são os que
+   derive o conjunto **mínimo** de fases. Os quatro nomes são os que
```

```diff
      exigindo `id-prefix`; `CI-1`, `CI-2` e `HK-1` não leem `documents:`, e `CI-4` e
-     `CI-7` leem (`ADR-0008`).
+     `CI-7` leem.
```

```diff
-5. **Registre o índice no contrato do agente** (`AGENTS.md`/`CLAUDE.md`, via
-   `SK-6` quando existir): qual artefato responde a quê e qual skill é dona.
+5. **Registre o índice no contrato do agente** (`AGENTS.md`/`CLAUDE.md`, via
+   `working-agreements-keeper`): qual artefato responde a quê e qual skill é dona.
```

- [ ] **Step 5: `release-historian`** (duas citações e o item de checklist)

```diff
 O erro caro aqui tem nome: derivar o CHANGELOG do `git log`. O resultado é o
-documento que narra o código — exatamente o que a spec §13 recusa — e ele
-apodrece rápido, porque ninguém de fora consegue usá-lo para decidir se
-atualiza.
+documento que narra o código, e ele apodrece rápido, porque ninguém de fora
+consegue usá-lo para decidir se atualiza.
```

```diff
-- [ ] Toda depreciação registrada tem as quatro coisas — verificação: humana (`RN-0015`).
+- [ ] Toda depreciação registrada tem as quatro coisas — verificação: humana.
```

e, logo depois do item de guia de migração do Checklist:

```diff
 - [ ] Toda quebra de compatibilidade tem guia de migração que diz em texto corrido por que foi decidida, e o commit que o cria cita o ADR — verificação: humana.
+- [ ] Nenhum comentário do template sobreviveu ao preenchimento da release note ou do guia de migração — verificação: humana.
```

- [ ] **Step 6: `requirements-keeper`, `working-agreements-keeper`, `decision-recorder`**

`requirements-keeper`:

```diff
 **Não use** para descrever o que o código já faz. Isso não é requisito, é
-narração — e narração de código é o anti-requisito nº 4 da spec §13.
+narração — e documento que narra o código envelhece a cada commit que muda o
+código.
```

`working-agreements-keeper`:

```diff
 8. **O contrato do agente não repete texto de artefato dono, e isso agora é
-   verificado.** `CI-7` compara frase por frase (piso de doze palavras,
-   `ADR-0009`) contra os artefatos com skill dona. Quando ele acusa, a correção é
+   verificado.** `CI-7` compara frase por frase (piso de doze palavras) contra
+   os artefatos com skill dona. Quando ele acusa, a correção é
    apagar a frase e deixar o ponteiro — nunca mexer no limiar.
```

```diff
-- [ ] Cada afirmação factual do contrato do agente é um link para o artefato dono, não uma cópia — verificação: `CI-7` na Fase 7; até lá, humana.
+- [ ] Cada afirmação factual do contrato do agente é um link para o artefato dono, não uma cópia — verificação: humana; `CI-7` pega a cópia palavra por palavra.
```

```diff
-- [ ] `last-reviewed` foi atualizado só nos arquivos que mudaram de verdade — verificação: humana (bump em massa é anti-requisito da spec §13).
+- [ ] `last-reviewed` foi atualizado só nos arquivos que mudaram de verdade — verificação: humana (bump em massa desliga a revisão fingindo cumpri-la).
```

`decision-recorder`, ao fim do Checklist:

```diff
 - [ ] Toda dívida `open` declara `pay-when` verificável — verificação: `CI-4`.
+- [ ] Nenhum comentário do template sobreviveu ao preenchimento do ADR ou do TDR — verificação humana
```

- [ ] **Step 7: Os agents**

`plugin/agents/decision-adversary.md`:

```diff
-- Não decide se a proposta é aceita. Isso é ato humano em todos os casos
-  (spec §4).
+- Não decide se a proposta é aceita. Isso é ato humano em todos os casos.
```

`plugin/agents/docs-divergence-auditor.md`:

```diff
 - Não conta documentos, não mede cobertura documental, não sugere criar
-  documento novo para narrar código. As três coisas são anti-requisitos (spec
-  §13).
+  documento novo para narrar código. Nenhuma das três produz documentação que
+  alguém use.
```

- [ ] **Step 8: `plugin/hooks/run-hook.sh`**

```diff
-# Falha aberta por contrato (docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7):
+# Falha aberta por contrato:
 # node ausente, dependência faltando, timeout ou erro de execução resultam em
 # saída vazia e exit 0. Um hook quebrado não pode travar o trabalho.
 #
-# Duas raízes, e elas não se confundem (ADR-0003): o código do **toolkit** sai
+# Duas raízes, e elas não se confundem: o código do **toolkit** sai
```

Não mude mais nada no script: `test/plugin/manifest.test.ts` e `test/plugin/wrapper-docker.test.ts` leem o código dele.

- [ ] **Step 9: Formatar, rodar o caso e ver passar**

Run: `npx prettier --write "plugin/skills/**/SKILL.md" plugin/agents/decision-adversary.md plugin/agents/docs-divergence-auditor.md && node --test --test-name-pattern="texto do plugin" test/distribution/internal-trail.test.ts && node --test "test/plugin/**/*.test.ts"`
Expected: PASS nos dois. Se o caso ainda acusar algo, a mensagem diz `arquivo:linha — trecho`: reescreva em texto corrido o que o item diz, sem citar.

- [ ] **Step 10: Commit**

```bash
git add plugin
git commit -F - <<'EOF'
docs(RN-0031): skills, agents e wrapper dos hooks deixam de citar o rastro do toolkit

As citações a ADR, RN, DA e seções da spec do toolkit viram texto corrido que
diz o que o item diz, e a narração de roteiro (fases que ainda "vão existir")
some. decision-recorder e release-historian ganham no checklist que nenhum
comentário do template sobrevive ao preenchimento.

Docs: none — RN-0031, que esta reescrita cumpre, nasceu no commit da decisão; como se trabalha neste repositório não muda.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: As mensagens dos checks (`M-8`, primeira metade)

**Files:**
- Modify: `src/checks/ci1-structure.ts`, `ci2-ids.ts`, `ci3-traceability.ts`, `ci4-staleness.ts`, `ci5-contract-drift.ts`, `ci6-changelog-required.ts`, `ci7-ownership-coverage.ts`, `ci8-links.ts`, `ci9-commit-discipline.ts`, `ci10-trigger-routing.ts`, `ci11-external-audience.ts`
- Modify: `test/checks/ci7-ownership-coverage.test.ts:103-127`

**Interfaces:**
- Consumes: o teste `RN-0031: as strings do código …` da Tarefa 2.
- Produces: nenhuma assinatura muda. `Finding.message` e `Finding.fix` continuam trazendo `CI-n`, `HK-n` e "skill dona: …". `CHECK_CATALOG` (`src/checks/catalog.ts`) não muda.

- [ ] **Step 1: Ajustar o teste de `CI-7` que casava com ID**

Em `test/checks/ci7-ownership-coverage.test.ts`:

```diff
     assert.ok(achado)
-    // A regra citada é a do vínculo código→doc, não a da Definition of Done.
-    assert.match(achado.fix, /RN-0008/)
-    assert.doesNotMatch(achado.fix, /RN-0017/)
+    // A correção dita é a do vínculo código→doc, não a da Definition of Done.
+    assert.match(achado.fix, /ninguém pode atualizar/)
+    assert.doesNotMatch(achado.fix, /intenção não é definição de pronto/)
   })
```

```diff
     assert.ok(achado)
-    assert.match(achado.fix, /RN-0016/)
-    assert.match(achado.fix, /RN-0008/)
-    assert.doesNotMatch(achado.fix, /RN-0017/)
+    assert.match(achado.fix, /só é cobrável se o doc tiver dono/)
+    assert.doesNotMatch(achado.fix, /intenção não é definição de pronto/)
   })
```

Run: `node --test test/checks/ci7-ownership-coverage.test.ts`
Expected: PASS — as duas frases já existem nas correções de hoje; o teste passa antes e depois da reescrita.

- [ ] **Step 2: `ci1-structure.ts`**

```diff
         'Frontmatter ausente — todo artefato de documentação viva abre com o bloco YAML padrão.',
-        'Adicione `id`, `title`, `status`, `owner`, `trigger` e `last-reviewed` entre `---` no topo (spec §2).',
+        // Regra de origem: spec §2.
+        'Adicione `id`, `title`, `status`, `owner`, `trigger` e `last-reviewed` entre `---` no topo.',
```

```diff
-          `Use ${writeId(doc.rule.idPrefix, 1, format)} (spec §8).`,
+          // Regra de origem: spec §8.
+          `Use ${writeId(doc.rule.idPrefix, 1, format)}.`,
```

As duas ocorrências de `Estados válidos` — a do frontmatter e a do item de coleção:

```diff
           `\`status\` "${String(data.status)}" fora da máquina de estados de ${doc.rule.idPrefix}.`,
-          `Estados válidos: ${states.join(' → ')} (spec §4).`,
+          // Regra de origem: spec §4.
+          `Estados válidos: ${states.join(' → ')}.`,
```

```diff
             `Item ${item.id} com status "${item.status}" fora da máquina de estados de ${doc.rule.idPrefix}.`,
-            `Estados válidos: ${states.join(' → ')} (spec §4).`,
+            // Regra de origem: spec §4.
+            `Estados válidos: ${states.join(' → ')}.`,
```

```diff
-          'Nomeie o evento: "no mesmo PR que altera src/domain/billing", "quando um código de erro novo é adicionado" (spec §2, mecanismo 2).',
+          // Regra de origem: spec §2, mecanismo 2.
+          'Nomeie o evento: "no mesmo PR que altera src/domain/billing", "quando um código de erro novo é adicionado".',
```

```diff
-        'Use YYYY-MM-DD, e só toque neste campo se você realmente reviu o documento (spec §2).',
+        // Regra de origem: spec §2.
+        'Use YYYY-MM-DD, e só toque neste campo se você realmente reviu o documento.',
```

```diff
       if (item.status === '') {
         findings.push(
-          error(doc.file, item.line, `Item ${item.id} não declara \`status\`.`, `Acrescente \`- **status:** ${states[0]}\` logo abaixo do título (spec §4).`),
+          // Regra de origem: spec §4.
+          error(doc.file, item.line, `Item ${item.id} não declara \`status\`.`, `Acrescente \`- **status:** ${states[0]}\` logo abaixo do título.`),
         )
```

- [ ] **Step 3: `ci2-ids.ts` e `ci3-traceability.ts`**

`ci2-ids.ts`:

```diff
-            'Use o próximo número livre; IDs retirados nunca voltam (spec §2).',
+            // Regra de origem: spec §2.
+            'Use o próximo número livre; IDs retirados nunca voltam.',
```

`ci3-traceability.ts`:

```diff
-                  'Cite um ID existente, ou remova o campo (spec §8).',
+                  // Regra de origem: spec §8.
+                  'Cite um ID existente, ou remova o campo.',
```

```diff
-                  `Acrescente \`${side.to}: ${entry.id}\` em ${target.file}:${target.line} — o par fecha dos dois lados (spec §8).`,
+                  // Regra de origem: spec §8.
+                  `Acrescente \`${side.to}: ${entry.id}\` em ${target.file}:${target.line} — o par fecha dos dois lados.`,
```

```diff
-            'Regra removida é revogada, não deletada — aponte o ID que a substituiu (spec §5, SK-4).',
+            // Regra de origem: spec §5, SK-4.
+            'Regra removida é revogada, não deletada — aponte o ID que a substituiu.',
```

```diff
-              'Toda decisão aberta fechada aponta o ADR que a fechou (spec §5, SK-3, regra 7).',
+              // Regra de origem: spec §5, SK-3, regra 7.
+              'Toda decisão aberta fechada aponta o ADR que a fechou.',
```

```diff
-                `Acrescente ${entry.id} a \`relates-to\` — CI-3 verifica os dois lados (spec §5, SK-3, regra 7).`,
+                // Regra de origem: spec §5, SK-3, regra 7.
+                `Acrescente ${entry.id} a \`relates-to\` — CI-3 verifica os dois lados.`,
```

```diff
-            'Um ADR aceito cita ao menos um requisito, decisão aberta ou princípio — decisão que não se liga a nada é sinal de contexto faltando (spec §8).',
+            // Regra de origem: spec §8.
+            'Um ADR aceito cita ao menos um requisito, decisão aberta ou princípio — decisão que não se liga a nada é sinal de contexto faltando.',
```

```diff
-            `Cite ${entry.id} no teste que a cobre — rastreabilidade fecha nos dois lados (spec §5, SK-4, regra 6).`,
+            // Regra de origem: spec §5, SK-4, regra 6.
+            `Cite ${entry.id} no teste que a cobre — rastreabilidade fecha nos dois lados.`,
```

- [ ] **Step 4: `ci4-staleness.ts` e `ci5-contract-drift.ts`**

`ci4-staleness.ts` — a frase que se apoiava na spec vira o que ela dizia:

```diff
+          // Regra de origem: spec §13 (bump sem leitura é anti-requisito).
           `Releia o documento e, se ele ainda é verdade, atualize \`last-reviewed\`${
             stale.skill === null ? '' : ` (skill dona: ${stale.skill})`
-          }. Bump sem leitura, ou bump em massa, é anti-requisito da spec §13: desliga o mecanismo fingindo cumpri-lo.`,
+          }. Bump sem leitura, ou bump em massa, desliga o mecanismo de revisão fingindo cumpri-lo.`,
```

```diff
           'Declare `pay-when` com `pattern` (regex, em aspas simples) e `paths` (globs onde procurá-lo) — ' +
-            'uma condição que alguém consegue apontar acontecendo (`RN-0019`, `ADR-0007`; skill dona: decision-recorder). ' +
+            // Regra de origem: RN-0019, ADR-0007.
+            'uma condição que alguém consegue apontar acontecendo (skill dona: decision-recorder). ' +
```

```diff
-          'Pague a dívida, ou reclassifique-a (`paid`, `accepted-permanently`) — as duas coisas são ato humano ' +
-            '(`RN-0005`, e `HK-3` intercepta). Enquanto ela seguir `open` com o gatilho cumprido, o CI reprova ' +
-            '(spec §12, critério 7).',
+          // Regra de origem: RN-0005; spec §12, critério 7.
+          'Pague a dívida, ou reclassifique-a (`paid`, `accepted-permanently`) — as duas coisas são ato humano, ' +
+            'e `HK-3` intercepta. Enquanto ela seguir `open` com o gatilho cumprido, o CI reprova.',
```

`ci5-contract-drift.ts`:

```diff
-              `Gere-o e versione o resultado: \`${rule.command} > ${rule.path}\` (spec §3).`,
+              // Regra de origem: spec §3.
+              `Gere-o e versione o resultado: \`${rule.command} > ${rule.path}\`.`,
```

```diff
-              `Regenere: \`${rule.command} > ${rule.path}\`. Nunca edite o arquivo à mão ` + '(`HK-2` bloqueia; regra de origem: spec §5, SK-5, regra 1).',
+              // Regra de origem: spec §5, SK-5, regra 1.
+              `Regenere: \`${rule.command} > ${rule.path}\`. Nunca edite o arquivo à mão ` + '(`HK-2` bloqueia).',
```

- [ ] **Step 5: `ci6-changelog-required.ts` e `ci7-ownership-coverage.ts`**

`ci6-changelog-required.ts`:

```diff
               `Acrescente a entrada em \`## [Unreleased]\` de \`${target}\`, voltada a quem consome — ou escreva a razão ` +
-                'na mensagem de commit, no formato `Changelog: none — <razão>` (RN-0013; skill dona: release-historian).',
+                // Regra de origem: RN-0013.
+                'na mensagem de commit, no formato `Changelog: none — <razão>` (skill dona: release-historian).',
```

```diff
-                'caminho é `Changelog: none — <razão>` (RN-0013).',
+                // Regra de origem: RN-0013.
+                'caminho é `Changelog: none — <razão>`.',
```

`ci7-ownership-coverage.ts`:

```diff
             'Crie `CODEOWNERS` na raiz (ou em `.github/`), espelhando o campo `owner` de cada entrada de ' +
-              '`docs/.ownership.yml` (`RN-0016`; `living-docs init` o escreve).',
+              // Regra de origem: RN-0016.
+              '`docs/.ownership.yml` (`living-docs init` o escreve).',
```

```diff
               'Declare-o em `artifacts:` (se tem família de IDs e ciclo de vida), em `documents:` (se tem dono e ' +
-                'não tem IDs) ou em `generated:` (se é gerado) — `RN-0016`, `ADR-0008`. Documento sem dono é o ' +
-                'anti-requisito da spec §13.',
+                // Regra de origem: RN-0016, ADR-0008; documento sem dono é anti-requisito da spec §13.
+                'não tem IDs) ou em `generated:` (se é gerado). Documento sem dono é documento que ninguém mantém.',
```

```diff
               'Crie o documento, ou corrija o `doc` da regra. Vínculo que aponta para o vazio faz `HK-4` e `HK-5` ' +
-                'pedirem um documento que ninguém pode atualizar (`RN-0008`).',
+                // Regra de origem: RN-0008.
+                'pedirem um documento que ninguém pode atualizar.',
```

```diff
-              `Declare \`${doc}\` em \`artifacts:\` ou \`documents:\` — o vínculo código→doc só é cobrável se o doc ` + 'tiver dono (`RN-0016`, `RN-0008`).',
+              // Regra de origem: RN-0016, RN-0008.
+              `Declare \`${doc}\` em \`artifacts:\` ou \`documents:\` — o vínculo código→doc só é cobrável se o doc ` + 'tiver dono.',
```

A frase que dependia do ID (`mudá-lo é ADR-0009 novo`) diz o que o ID dizia: o limiar é do toolkit, não do projeto.

```diff
                 'Apague a frase e deixe o ponteiro para o artefato dono. O contrato do agente é índice e política, ' +
-                  'não conteúdo (`RN-0010`, `RN-0020`; skill dona: working-agreements-keeper) — e o limiar não se ' +
-                  'baixa: mudá-lo é `ADR-0009` novo.',
+                  // Regra de origem: RN-0010, RN-0020; o limiar é o de ADR-0009.
+                  'não conteúdo (skill dona: working-agreements-keeper). O limiar é do toolkit, não deste projeto: ' +
+                  'não se baixa aqui.',
```

```diff
-                  'Item que ninguém verifica é intenção, e intenção não é definição de pronto (`RN-0017`).',
+                  // Regra de origem: RN-0017.
+                  'Item que ninguém verifica é intenção, e intenção não é definição de pronto.',
```

```diff
+              // Regra de origem: RN-0021, ADR-0010.
               `Atualize \`${pending.doc}\`${
                 pending.skill === null ? '' : ` (skill dona: ${pending.skill})`
-              } no mesmo PR — ou escreva a razão numa mensagem de commit, no formato \`Docs: none — <razão>\` ` + '(`RN-0021`, `ADR-0010`).',
+              } no mesmo PR — ou escreva a razão numa mensagem de commit, no formato \`Docs: none — <razão>\`.`,
```

```diff
+              // Regra de origem: RN-0026, ADR-0010.
               `Resolva ${claim.id} antes de implementar (skill dona: ${claim.skill}) — enquanto a decisão está ` +
                 'aberta não há regra, e a saída é o ID, não o código. Se esta mudança não é a implementação da ' +
-                'regra que falta, escreva a razão numa mensagem de commit, no formato `Docs: none — <razão>` ' +
-                '(`RN-0026`, `ADR-0010`).',
+                'regra que falta, escreva a razão numa mensagem de commit, no formato `Docs: none — <razão>`.',
```

- [ ] **Step 6: `ci8-links.ts`, `ci9-commit-discipline.ts`, `ci10-trigger-routing.ts`, `ci11-external-audience.ts`**

`ci8-links.ts`:

```diff
           'Guarde a fonte em texto (Mermaid num bloco de código, SVG, ou o `.puml`/`.dot` que o gera) e ' +
-            'mantenha o binário fora da documentação versionada (spec §13, `RN-0023`).',
+            // Regra de origem: spec §13, RN-0023.
+            'mantenha o binário fora da documentação versionada.',
```

```diff
                 'Aponte para um documento existente pelo nome do arquivo, ou troque por um link relativo. ' +
-                  'Wikilink sem destino afirma uma ligação que não existe (`RN-0023`).',
+                  // Regra de origem: RN-0023.
+                  'Wikilink sem destino afirma uma ligação que não existe.',
```

```diff
               'Corrija o caminho, ou remova o link. A âncora (`#seção`) não é verificada — só o arquivo —, ' +
-                'então um link com âncora só reprova quando o arquivo não existe (`RN-0023`).',
+                // Regra de origem: RN-0023.
+                'então um link com âncora só reprova quando o arquivo não existe.',
```

`ci9-commit-discipline.ts`:

```diff
               'sendo desligado enquanto se finge cumpri-lo. Reverta a data dos que não foram revisados, ou revise-os ' +
-              '(`RN-0027`, `ADR-0013`; o limiar é `last-reviewed-bump-limit` no `.ownership.yml`).',
+              // Regra de origem: RN-0027, ADR-0013.
+              '(o limiar é `last-reviewed-bump-limit` no `.ownership.yml`).',
```

```diff
               'citação que torna o `git log` navegável por regra: sem ela o histórico responde "o que mudou" e ' +
-              `nunca "por causa de qual regra" (\`RN-0028\`; skill dona: ${doc.rule.skill}).`,
+              // Regra de origem: RN-0028.
+              `nunca "por causa de qual regra" (skill dona: ${doc.rule.skill}).`,
```

`ci10-trigger-routing.ts`:

```diff
               `Se \`${routed.skill}\` é skill deste projeto, não há nada a fazer. Se era para ser do toolkit, ` +
-              'confira o nome em `plugin/skills/` (`RN-0029`).',
+              // Regra de origem: RN-0029.
+              'confira o nome em `plugin/skills/`.',
```

```diff
             'precisam estar falando da mesma coisa, senão o documento declara um gatilho que nada dispara ' +
-            `(\`RN-0029\`, \`ADR-0013\`; skill dona: ${routed.skill}).`,
+            // Regra de origem: RN-0029, ADR-0013.
+            `(skill dona: ${routed.skill}).`,
```

`ci11-external-audience.ts`:

```diff
             'Escreva em texto corrido o que o item decide ou exige, sem apontá-lo. O vínculo continua existindo ' +
-            'e mora do lado de dentro — no próprio artefato ou na mensagem de commit (`RN-0030`, `ADR-0017`). ' +
+            // Regra de origem: RN-0030, ADR-0017.
+            'e mora do lado de dentro — no próprio artefato ou na mensagem de commit. ' +
             'Não há rótulo de exceção.',
```

- [ ] **Step 7: Formatar e verificar o que sobrou**

Run: `npx prettier --write src/checks test/checks/ci7-ownership-coverage.test.ts && npm run typecheck && node --test "test/checks/**/*.test.ts" "test/acceptance/**/*.test.ts"`
Expected: typecheck limpo; todos PASS.

Run: `node --test --test-name-pattern="strings do código" test/distribution/internal-trail.test.ts 2>&1 | grep -oE "src/[a-z0-9/-]+\.ts" | sort -u`
Expected: nenhum caminho sob `src/checks/`. Sobram exatamente `src/cli/index.ts`, `src/cli/init.ts`, `src/config/ownership.ts` e os oito `src/hooks/hk1-append-only.ts` … `src/hooks/hk8-open-decision-guard.ts` — o que a Tarefa 6 limpa.

Run: `node src/tools/gen-checks.ts | diff - docs/contracts/checks.gen.md && echo "catálogo intacto"`
Expected: `catálogo intacto` (as descrições do `CHECK_CATALOG` não mudaram).

- [ ] **Step 8: Commit**

```bash
git add src/checks test/checks/ci7-ownership-coverage.test.ts
git commit -F - <<'EOF'
fix(RN-0031): as mensagens dos checks deixam de citar o rastro do toolkit

A correção de cada achado perde o parêntese com RN, ADR e seção da spec do
toolkit, que para quem instala não resolve; CI-n, HK-n e a skill dona ficam.
A frase que se apoiava no ID diz o que ele dizia, e o ID removido foi para um
comentário acima da string. O teste de CI-7 passa a distinguir as correções
pelo texto delas.

Docs: none — RN-0031, que esta reescrita cumpre, nasceu no commit da decisão; nenhuma regra de check mudou.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 6: As mensagens dos hooks, do CLI e da configuração (`M-8`, segunda metade)

**Files:**
- Modify: `src/hooks/hk1-append-only.ts`, `hk2-generated-artifact.ts`, `hk3-state-promotion.ts`, `hk4-watch-reminder.ts`, `hk5-commit-guard.ts`, `hk6-session-inventory.ts`, `hk7-shortcut-debt.ts`, `hk8-open-decision-guard.ts`
- Modify: `src/cli/index.ts`, `src/cli/init.ts` (`declarePlugin`), `src/config/ownership.ts`
- Modify: `test/cli/init-enforcement.test.ts:105`

**Interfaces:**
- Consumes: o teste `RN-0031: as strings do código …` da Tarefa 2.
- Produces: nenhuma assinatura, código de saída ou formato de saída muda. `HookDecision.reason`/`context` continuam começando por `HK-n` e nomeando a skill dona.

- [ ] **Step 1: Ajustar o teste que casava com `DA-0003`**

Em `test/cli/init-enforcement.test.ts`:

```diff
     assert.equal(existsSync(join(root, '.claude/settings.json')), false)
-    assert.ok(result.notInstalled.some(linha => linha.includes('DA-0003')))
+    assert.ok(result.notInstalled.some(linha => linha.includes('--marketplace <owner/repo>') && linha.includes('não se adivinha')))
   })
```

Run: `node --test test/cli/init-enforcement.test.ts`
Expected: PASS — as duas frases já estão na linha de hoje.

- [ ] **Step 2: Os hooks**

`hk1-append-only.ts`:

```diff
-      'Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §4 — nenhum estado terminal permite edição do corpo; ' +
+      // Regra de origem: spec §4.
+      'Nenhum estado terminal permite edição do corpo; ' +
```

`hk2-generated-artifact.ts`:

```diff
-        'Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §5 (SK-5, regra 1) — se pode ser gerado, não se escreve; ' +
+        // Regra de origem: spec §5, SK-5, regra 1.
+        'Se pode ser gerado, não se escreve: ' +
```

```diff
-      `HK-2 bloqueou: \`${repoPath}\` abre com o marcador \`generated: do not edit\` (spec §2). ` +
-      'Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §5 (SK-5, regra 1) — o que é gerado muda pela fonte, não pelo arquivo. ' +
+      // Regra de origem: spec §2 (o marcador) e spec §5, SK-5, regra 1.
+      `HK-2 bloqueou: \`${repoPath}\` abre com o marcador \`generated: do not edit\`. ` +
+      'O que é gerado muda pela fonte, não pelo arquivo. ' +
```

`hk3-state-promotion.ts`:

```diff
-      'Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §4 — nenhum agente promove estado sozinho; ' +
+      // Regra de origem: spec §4.
+      'Nenhum agente promove estado sozinho: ' +
```

`hk4-watch-reminder.ts`:

```diff
-      'Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7 — a atualização do doc dono cabe no mesmo PR; ' +
+      // Regra de origem: spec §7.
+      'A atualização do doc dono cabe no mesmo PR; ' +
```

`hk5-commit-guard.ts`:

```diff
-      'Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7 — se a atualização da documentação não cabe no ' +
+      // Regra de origem: spec §7.
+      'Se a atualização da documentação não cabe no ' +
```

`hk6-session-inventory.ts`:

```diff
       lines.push(
+        // Regra de origem: spec §12, critério 7.
         `Dívida com gatilho de pagamento cumprido (${vencidas.length}): ${shorten(
           vencidas.map(payment => `${payment.id} — ${payment.evidence}`),
-        )}. \`living-docs validate\` reprova até pagar ou reclassificar (spec §12, critério 7).`,
+        )}. \`living-docs validate\` reprova até pagar ou reclassificar.`,
       )
```

`hk7-shortcut-debt.ts`:

```diff
-      'Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7 e `RN-0014` — atalho consciente vira `TDR-nnnn` ' +
+      // Regra de origem: spec §7 e RN-0014.
+      'Atalho consciente vira `TDR-nnnn` ' +
```

`hk8-open-decision-guard.ts`:

```diff
-      'Regra de origem: `RN-0026` e o critério de aceite 4 da spec §12 — comportamento sem regra escrita vira ' +
+      // Regra de origem: RN-0026 e o critério de aceite 4 da spec §12.
+      'Comportamento sem regra escrita vira ' +
```

- [ ] **Step 3: `src/cli/index.ts`**

```diff
 function reportElapsed(elapsedMs: number): void {
-  process.stdout.write(`living-docs: conjunto de checks em ${formatElapsed(elapsedMs)} ` + `(teto declarado: ${formatElapsed(CHECK_BUDGET_MS)} — RNF-0005).\n`)
+  // Regra de origem: RNF-0005.
+  process.stdout.write(`living-docs: conjunto de checks em ${formatElapsed(elapsedMs)} ` + `(teto declarado: ${formatElapsed(CHECK_BUDGET_MS)}).\n`)
   if (elapsedMs > CHECK_BUDGET_MS) {
-    process.stderr.write('living-docs: o conjunto passou do teto declarado. Meça o que ficou lento antes de subir o número ' + '(RNF-0005).\n')
+    process.stderr.write('living-docs: o conjunto passou do teto declarado. Meça o que ficou lento antes de subir o número.\n')
   }
```

```diff
-        process.stderr.write('living-docs: `--base` precisa de uma ref — a base do diff não se adivinha (CI-7, ADR-0010).\n')
+        // Regra de origem: ADR-0010.
+        process.stderr.write('living-docs: `--base` precisa de uma ref — a base do diff não se adivinha (CI-7).\n')
```

```diff
-        process.stderr.write('living-docs: `changelog` precisa de `--base <ref>` — a base do diff não se adivinha (CI-6, ADR-0006).\n')
+        // Regra de origem: ADR-0006.
+        process.stderr.write('living-docs: `changelog` precisa de `--base <ref>` — a base do diff não se adivinha (CI-6).\n')
```

```diff
+        // Regra de origem: ADR-0011.
         process.stderr.write(
           `living-docs: forma de ID inválida. --id-separator aceita ${SEPARATORS_ALLOWED.map(s => `"${s}"`).join(', ')} ` +
-            `e --id-padding um inteiro entre ${PADDING_RANGE.min} e ${PADDING_RANGE.max} (ADR-0011).\n`,
+            `e --id-padding um inteiro entre ${PADDING_RANGE.min} e ${PADDING_RANGE.max}.\n`,
         )
```

```diff
-        process.stderr.write('living-docs: `--invoke` precisa do comando que roda o CLI no seu CI — ele não se adivinha (DA-0003).\n')
+        // Regra de origem: DA-0003.
+        process.stderr.write('living-docs: `--invoke` precisa do comando que roda o CLI no seu CI — ele não se adivinha.\n')
```

```diff
             `          Para adotá-la: --id-separator "${format.separator}" --id-padding ${format.padding}. ` +
-            'Nenhum arquivo foi alterado (RF-0014).\n',
+            // Regra de origem: RF-0014.
+            'Nenhum arquivo foi alterado.\n',
```

- [ ] **Step 4: `src/cli/init.ts` (`declarePlugin`) e `src/config/ownership.ts`**

`src/cli/init.ts`:

```diff
     result.notInstalled.push(
+      // Regra de origem: DA-0003.
       `registro do plugin em ${SETTINGS_PATH} — sem \`--marketplace <owner/repo>\` a fonte não se ` +
-        'adivinha (`DA-0003`); os hooks não sobem na sessão até ele ser declarado',
+        'adivinha; os hooks não sobem na sessão até ele ser declarado',
     )
```

`src/config/ownership.ts`:

```diff
     throw new OwnershipError(
+      // Regra de origem: ADR-0011.
       `${OWNERSHIP_PATH}: id-format.separator "${String(separator)}" não é aceito. ` +
-        `Válidos: ${SEPARATORS_ALLOWED.map(value => `"${value}"`).join(', ')} (ADR-0011).`,
+        `Válidos: ${SEPARATORS_ALLOWED.map(value => `"${value}"`).join(', ')}.`,
     )
```

```diff
     throw new OwnershipError(
-      `${OWNERSHIP_PATH}: id-format.padding "${String(padding)}" precisa ser inteiro entre ` + `${PADDING_RANGE.min} e ${PADDING_RANGE.max} (ADR-0011).`,
+      // Regra de origem: ADR-0011.
+      `${OWNERSHIP_PATH}: id-format.padding "${String(padding)}" precisa ser inteiro entre ` + `${PADDING_RANGE.min} e ${PADDING_RANGE.max}.`,
     )
```

```diff
     throw new OwnershipError(
+      // Regra de origem: ADR-0013.
       `${OWNERSHIP_PATH}: last-reviewed-bump-limit "${String(raw)}" precisa ser inteiro maior ou igual a 2 ` +
-        '(limiar 1 reprovaria a revisão legítima de um documento só — ADR-0013).',
+        '(limiar 1 reprovaria a revisão legítima de um documento só).',
     )
```

- [ ] **Step 5: Formatar e ver o caso passar**

Run: `npx prettier --write src/hooks src/cli/index.ts src/cli/init.ts src/config/ownership.ts test/cli/init-enforcement.test.ts && node --test --test-name-pattern="strings do código" test/distribution/internal-trail.test.ts`
Expected: PASS. Se sobrar alguma linha, a mensagem diz `arquivo:linha — trecho`; aplique o mesmo padrão (citação sai da string, vai para `// Regra de origem: …` acima).

- [ ] **Step 6: A suíte inteira**

Run: `npm test && npm run typecheck && npx eslint src test --quiet 2>&1 | tail -1`
Expected: `npm test` e typecheck PASS; o ESLint termina em `✖ 20 problems (20 errors, 0 warnings)` — os mesmos 20 erros `no-base-to-string` que `master` já tem, nenhum novo (veja Global Constraints). Os testes passam incluindo os quatro casos de `test/distribution/internal-trail.test.ts`. Os `assert.match` de `test/hooks/` casam com `HK-n`, nomes de skill, caminhos e IDs das fixtures — nenhum casava com a citação removida. Um teste que quebrar é lido antes de ser ajustado: se ele cobra uma frase que ainda deveria estar na mensagem, é a mensagem que está errada.

- [ ] **Step 7: Commit**

```bash
git add src/hooks src/cli/index.ts src/cli/init.ts src/config/ownership.ts test/cli/init-enforcement.test.ts
git commit -F - <<'EOF'
fix(RN-0031): hooks, CLI e configuração deixam de citar o rastro do toolkit

As mensagens dos oito hooks perdem o caminho da spec do toolkit e os IDs; o
porquê continua dito, em texto corrido. A saída do CLI e os erros do
.ownership.yml perdem ADR, DA, RF e RNF do toolkit, e a linha de orçamento
mostra o teto sem citar a regra. Os IDs foram para comentários acima das
strings. Nenhum código de saída nem formato muda.

Docs: none — RN-0031, que esta reescrita cumpre, nasceu no commit da decisão; nenhum comando mudou de comportamento observável além do texto.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 7: O contrato do agente, o CHANGELOG e a verificação final (`M-9`, `M-10`, spec `§4`)

**Files:**
- Modify: `CLAUDE.md` (seção `## Política`)
- Modify: `CHANGELOG.md` (fim de `### Changed` em `## [Unreleased]`, logo antes de `### Fixed`)

**Interfaces:**
- Consumes: todas as tarefas anteriores.
- Produces: nada de código.

- [ ] **Step 1: Medir o contrato antes de escrever**

Run: `node -e "console.log(require('fs').readFileSync('CLAUDE.md','utf8').split('\n').length)"`
Expected: `57`. O teto é 60: a linha nova cabe em **três** linhas. Se o número for outro, recalcule e mantenha o total ≤ 60.

- [ ] **Step 2: A política**

Em `CLAUDE.md`, logo depois do item que começa por `- **Texto para quem lê de fora não carrega ID de artefato.**` (três linhas), acrescente:

```markdown
- **O que o toolkit entrega não aponta para dentro dele.** Semente, skill e
  mensagem de CLI ou hook ficam sem o ID e sem a seção da spec daqui; o porquê
  vai para o comentário de código — o teste de distribuição cobra.
```

Não vai para `templates/agent-contract.md`: é política de quem mantém o toolkit.

- [ ] **Step 3: A entrada de CHANGELOG**

Em `CHANGELOG.md`, como último item de `### Changed` sob `## [Unreleased]` (a linha em branco antes de `### Fixed` continua):

```markdown
- As sementes que `living-docs init` escreve e os comentários do
  `docs/.ownership.yml` e do workflow instalados deixam de citar decisões
  internas do toolkit e de trazer instrução de preenchimento; o que ajudava a
  ler o documento virou prosa, e a orientação de quem escreve passou para as
  skills. As mensagens dos checks, dos hooks e do CLI e o texto das skills
  deixam de citar regras internas do toolkit. Repositório já instalado mantém o
  texto antigo.
```

- [ ] **Step 4: Formatar e verificar**

Run: `npx prettier --write CLAUDE.md CHANGELOG.md && npm test && node src/cli/index.ts validate`
Expected: PASS em tudo, incluindo `RN-0010: o contrato é índice, não manual — cabe numa tela` (60 linhas ou menos); `living-docs: nenhuma violação encontrada.` Se `CI-7` acusar frase repetida no contrato, reescreva a linha nova com outras palavras — nunca mexa no limiar. Se `CI-11` acusar o CHANGELOG, a entrada citou um ID: reescreva em texto corrido.

- [ ] **Step 5: Commit**

```bash
git add CLAUDE.md CHANGELOG.md
git commit -F - <<'EOF'
docs(RN-0031): o contrato do agente ganha a política e o CHANGELOG registra a mudança

CLAUDE.md passa a dizer que o que o toolkit entrega não carrega o rastro
interno dele, e quem cobra. A entrada de Unreleased diz a quem instala o que
muda nas sementes, no plugin e nas mensagens, sem citar ID de artefato.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 6: Verificação final (spec §4)**

Run:

```bash
npm test
npm run typecheck
npx eslint src test --quiet 2>&1 | tail -1
node src/cli/index.ts validate
node src/cli/index.ts validate --base master
node src/cli/index.ts drift
node src/cli/index.ts changelog --base master
```

Expected: todos com código de saída 0, menos o ESLint, que termina em `✖ 20 problems (20 errors, 0 warnings)` — os 20 erros que `master` já tem, nenhum novo. `validate --base master` não acusa `CI-7` (cada caminho vigiado viajou com o doc dono ou com `Docs: none — <razão>`) nem `CI-9` (o commit que tocou `ADR-0018` e `rules.md` cita IDs declarados neles). `changelog --base master` encontra a entrada em `## [Unreleased]`.

- [ ] **Step 7: A prova que motivou a spec, repetida**

Run (tool Bash):

```bash
for stage in production multi-team; do
  D="$(mktemp -d)"
  LIVING_DOCS_REPO_ROOT="$D" node src/cli/index.ts init --stage "$stage" --owner @time --marketplace time/living-docs > /dev/null
  grep -rnE 'ADR-[0-9]|DA-[0-9]|TDR-[0-9]|RF-[0-9]|RNF-[0-9]|RN-[0-9]|REL-[0-9]|spec §|docs/superpowers|Semente criada|Skill dona' "$D"
  echo "$stage: grep exit=$?"
  rm -rf "$D"
done
```

Expected: nenhuma linha de `grep` e, para os dois estágios, `grep exit=1`. A busca usa `-[0-9]` e não `-` sozinho (desvio 7): os placeholders `RN-nnnn`, `DA-nnnn` e `ADR-nnnn` ficam por ordem da spec.

Se algum passo falhar, pare e diagnostique (superpowers:systematic-debugging); não emende commit já feito sem necessidade.

---

## Cobertura da spec

| Mudança da spec | Task |
| --- | --- |
| `M-1` ADR-0018 | 1 |
| `M-2` RN-0031 | 1 |
| `M-3` o teste, as três superfícies e a trava de comentário HTML | 2 |
| `M-4` templates não-Markdown (`ownership.yml`, `workflow.yml`, `ids-retired.txt`, `tdr.md`), mais `release-note.md` (desvio 1) | 3 |
| `M-5` `documentsBlock` e `releasesBlock` | 3 |
| `M-6` sementes Markdown | 3 |
| `M-7` orientação que saiu das sementes (desvio 2) | 3 |
| `M-7` as 21 citações das sete skills, agents e `run-hook.sh` (desvio 1), checklist de comentário de template | 4 |
| `M-8` checks, `ci11` e o teste de `CI-7` (desvios 1, 3 e 4) | 5 |
| `M-8` hooks, CLI, `init` e configuração, e o teste de `init-enforcement` (desvios 1 e 3) | 6 |
| `M-9` `CLAUDE.md` (três linhas, desvio 8) | 7 |
| `M-10` `CHANGELOG.md` | 7 |
| §4 verificação final e a prova do `init` (desvio 7) | 7 |
