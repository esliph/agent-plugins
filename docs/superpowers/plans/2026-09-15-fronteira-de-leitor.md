# Fronteira de leitor — plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Documento ou artefato declarado `audience: external` deixa de citar ID de artefato, e `CI-11` cobra isso no `living-docs validate`.

**Architecture:** O `.ownership.yml` ganha a chave `audience` (vocabulário fechado, padrão `internal`) em `documents:` e `artifacts:`. `CI-11` lê só `config.artifacts[].idPrefix` para saber o que é interno: nenhuma lista de prefixos no check. O `init` de `production` marca o rastro histórico como externo e avisa (sem reescrever) quando a entrada já existe sem a marca. Skill, templates, contrato do agente e a prosa deste repositório acompanham.

**Tech Stack:** Node ≥ 24 executando TypeScript direto (sem build), `node:test`, `yaml`, `tsc --noEmit`, Prettier.

**Spec:** `docs/superpowers/specs/2026-09-10-fronteira-de-leitor-design.md` (manda neste plano). Insumo obrigatório, citado por ela: `docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` §8 e §5 (`SK-7`, regra 5), `ADR-0008`, `ADR-0006`, `RN-0007`, `RN-0013`, `docs/contracts/versioning-policy.md`, `RN-0010`/`RN-0020`.

## Global Constraints

- Rodar no `node` do host: `npm ci` antes de tudo; `npm test`, `npm run typecheck`, `node src/cli/index.ts …`.
- Trabalhar numa branch isolada (superpowers:using-git-worktrees; `.worktrees/` já é ignorado). A base de comparação é `master`.
- Prosa em português com acentuação completa; identificadores, chaves e nomes de arquivo em inglês/neutro.
- Mensagem de commit em português, `tipo(ID): assunto`, terminando com `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`. Commit que altera arquivo de artefato cita um ID declarado nele (`CI-9`).
- Caminho vigiado alterado sem o doc dono no mesmo commit leva a linha `Docs: none — <razão>` no corpo da mensagem. O texto exato está em cada tarefa.
- `ADR-0017`, `RN-0030` e `RF-0015` nascem `status: draft`. Promover é ato humano (`HK-3`); não promova nada.
- `docs/contracts/checks.gen.md` nunca se edita à mão (`HK-2`). Regerar **pelo tool Bash** (o `>` do PowerShell grava UTF-16): `node src/tools/gen-checks.ts > docs/contracts/checks.gen.md`.
- `CI-11` tem severidade `error` e **não tem rótulo de exceção**. O check **não conhece prefixo nenhum**: interno é o que está em `config.artifacts[].idPrefix`.
- Documento com frontmatter cujo corpo muda no commit ganha `last-reviewed: 2026-09-15`. Nunca atualizar a data sem mudar o corpo (`CI-9`).
- Toda entrada nova de `CHANGELOG.md` é escrita **sem ID de artefato** (`ADR-`, `DA-`, `TDR-`, `RF-`, `RNF-`, `RN-`, `REL-`). `CI-n`, `HK-n`, `SK-n`, `CM-n` e `EXIT-n` podem.
- `CLAUDE.md` fica com no máximo 60 linhas (`test/docs/agent-contract.test.ts`) e não repete frase de `RN-0030` (`CI-7`, limiar de 12 palavras).
- Formatar o que tocar: `npx prettier --write <arquivos>`. `templates/`, `docs/contracts/checks.gen.md` e `docs/superpowers/plans/` são ignorados pelo Prettier de propósito.

## Desvios da spec, decididos por quem pediu

1. **`M-4`:** o termo _Documento externo_ nasce `status: active`, e não `draft`. O ciclo de vida de termo da spec do toolkit (§4) não tem `draft`, e `test/docs/language-and-intent.test.ts` só aceita `active|banned|renamed`.
2. **`M-13`:** a entrada de `## [Unreleased]` não vem num commit no fim. Cada mudança visível leva a sua linha no próprio commit (Tarefas 2, 3, 4 e 5). O conteúdo final é o que `M-13` pede.
3. **Definition of Done:** a verificação da última linha passa de `CI-1` a `CI-10` para `CI-1` a `CI-11` (Tarefa 3).
4. **`M-7`:** a chave `audience` entra em `versioning-policy.md` junto do parser (Tarefa 2), e não junto do check.
5. **Testes a mais**, baratos e que travam regressão: um caso de frontmatter quebrado em `CI-11` e as asserções da skill, do template de migração, do contrato do agente e da marcação deste repositório.

## Fora de escopo (a spec §5, mais o que apareceu na leitura)

- Emendar a spec do toolkit ou a Constitution.
- Marcar `docs/contracts/` como externo.
- Verificar o README de quem instala, a saída do CLI ou as mensagens de commit.
- Corrigir `RF-0010`.
- O nome do passo em `.github/workflows/wrapper-docker.yml` ("CI-1 a CI-4, CI-7, CI-8 e CI-10"), que também já não lista tudo.

## Mapa de arquivos

| Arquivo                                                  | Tarefa | Responsabilidade                                                          |
| -------------------------------------------------------- | ------ | ------------------------------------------------------------------------- |
| `docs/decisions/adr/ADR-0017-fronteira-de-leitor.md`     | 1      | Criar: a decisão                                                          |
| `docs/requirements/rules.md`                             | 1      | Acrescentar `RN-0030`                                                     |
| `docs/requirements/functional.md`                        | 1      | Acrescentar `RF-0015`                                                     |
| `docs/glossary.md`                                       | 1      | Acrescentar o termo _Documento externo_                                   |
| `src/config/ownership.ts`                                | 2      | `AUDIENCES`, `Audience`, `parseAudience`, campo em `ArtifactRule`/`DocumentRule` |
| `test/config/ownership.test.ts`                          | 2      | Testes do parser                                                          |
| `test/docs/schema.test.ts`                               | 2      | O literal de `ArtifactRule` ganha `audience`                              |
| `docs/contracts/versioning-policy.md`                    | 2      | A chave `audience` passa a ser pública                                    |
| `src/checks/ci11-external-audience.ts`                   | 3      | Criar: o check                                                            |
| `test/checks/ci11-external-audience.test.ts`             | 3      | Criar: os casos de fronteira                                              |
| `src/checks/registry.ts`, `test/checks/registry.test.ts` | 3      | `CI-11` em `validateChecks()`                                             |
| `src/checks/catalog.ts`, `docs/contracts/checks.gen.md`  | 3      | O contrato público do check                                               |
| `docs/definition-of-done.md`                             | 3      | `CI-1` a `CI-11`                                                          |
| `src/cli/init.ts`, `test/cli/init.test.ts`               | 4      | O `init` marca e avisa                                                    |
| `plugin/skills/release-historian/SKILL.md`               | 5      | O guia de migração deixa de pedir o ID                                    |
| `templates/migration.md`, `templates/agent-contract.md`  | 5      | Idem, e a política                                                        |
| `CLAUDE.md`                                              | 5      | A política                                                                |
| `test/plugin/authoring.test.ts`, `test/docs/agent-contract.test.ts` | 5 | Asserções                                                            |
| `README.md`, `docs/deprecations.md`                      | 6      | Prosa sem ID                                                              |
| `CHANGELOG.md`                                           | 2–6    | Entradas novas (2–5) e prosa sem ID (6)                                   |
| `docs/.ownership.yml`, `test/docs/release-history.test.ts` | 7    | Marcação deste repositório                                                |

---

### Task 1: A decisão e a regra (`M-1`, `M-2`, `M-3`, `M-4`)

**Files:**
- Create: `docs/decisions/adr/ADR-0017-fronteira-de-leitor.md`
- Modify: `docs/requirements/rules.md` (fim do arquivo, depois de `RN-0029`; `last-reviewed`)
- Modify: `docs/requirements/functional.md` (fim do arquivo, depois de `RF-0014`; `last-reviewed`)
- Modify: `docs/glossary.md` (última linha da tabela; `last-reviewed`)

**Interfaces:**
- Consumes: nada.
- Produces: os IDs `ADR-0017`, `RN-0030`, `RF-0015`, que as tarefas seguintes citam nos testes, nas mensagens de achado e nos commits. O nome da chave, `audience`, com os valores `internal` e `external`.

- [ ] **Step 1: Criar o ADR**

Crie `docs/decisions/adr/ADR-0017-fronteira-de-leitor.md` com exatamente:

```markdown
---
id: ADR-0017
title: 'Fronteira de leitor: ID de artefato é rastro interno'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-15
relates-to: [RN-0030, RF-0015, RN-0013, RN-0007]
supersedes: null
superseded-by: null
---

# ADR-0017 — Fronteira de leitor: ID de artefato é rastro interno

## Contexto

A spec do toolkit manda citar item por ID de forma uniforme — em código, teste,
documento e mensagem de commit — e manda o guia de migração apontar o ADR que
decidiu a quebra. Nenhum dos dois trechos distingue quem lê.

Dentro do repositório, é isso que torna a rastreabilidade navegável: `RN-0007`
exige que toda citação resolva, e quem mantém o código segue o ID até o
artefato. Fora dele, o mesmo ID é ruído. Quem lê o README para decidir se
instala, o CHANGELOG para decidir se atualiza, ou um guia de migração para
atravessar uma quebra não tem como saber o que `RNF-0006` significa — e, para
quem instala o pacote ou o plugin, `docs/` pode nem estar à mão. O resultado são
documentos escritos para quem vem de fora carregando referências que só resolvem
do lado de dentro.

`RN-0013` já traçou uma fronteira parecida para o CHANGELOG: a entrada é voltada
a quem consome, e o que só faz sentido para quem escreveu o código não pertence
a ela. Um ID de artefato é exatamente isso.

## Alternativas consideradas

- **Manter a citação uniforme.** Descartada: é o problema. O texto de fora
  continua dependendo de um documento interno para fazer sentido.
- **Permitir o ID desde que venha com link para o artefato.** Descartada: o link
  resolve, mas leva o visitante a um documento interno de decisão, escrito para
  quem mantém o repositório, e o texto de fora passa a depender do de dentro para
  fazer sentido. Pela mesma razão, um ID no caminho de um link conta como
  citação, mesmo quando não aparece no texto renderizado.
- **Verificação só humana, no checklist da skill.** Descartada: o texto em
  questão é justamente o que skill e agente escrevem sozinhos, e a citação
  uniforme é o hábito que eles aprenderam. O ID volta sem que ninguém veja.
- **Uma lista de topo `external-docs:`**, no molde de `consumer-visible-paths`.
  Descartada: é uma segunda lista de caminhos para divergir de `documents:`, e o
  repositório já precisou de um teste só para impedir duas listas assim de
  derivar.
- **Reaproveitar `role`.** Descartada: o vocabulário de `role` é fechado e vale
  "um papel, um documento" (`ADR-0008`); ele não marca CHANGELOG, guias de
  migração e README ao mesmo tempo.

## Decisão

Documento ou artefato declarado `audience: external` não cita ID de artefato. O
vínculo entre ele e o artefato continua existindo, e mora do lado de dentro: no
próprio artefato, enquanto ele ainda é editável, ou na mensagem de commit que
escreveu o texto de fora. Os identificadores da interface pública — `CI-n`,
`HK-n`, `SK-n`, `CM-n`, `EXIT-n` — continuam citáveis: são os que a saída do
CLI já mostra a quem vem de fora, e os que a política de versionamento promete
não redefinir.

A marca é uma chave por entrada, em `documents:` e em `artifacts:`; sem ela, o
documento é interno. Interno é o prefixo declarado em `artifacts:`, e só ele: a
verificação não carrega lista de prefixos, então um projeto que declara uma
família nova ganha a fronteira no mesmo commit, e um projeto que ainda não
declarou uma família não é cobrado por um ID solto dela — a mesma fronteira que
`RN-0007` já usa. `CI-11` reprova com severidade de erro e sem rótulo de
exceção: o conserto é sempre reescrever, em texto corrido, o que o item decide
ou exige.

**Este ADR não emenda a spec do toolkit, e o motivo é de substância.** A citação
uniforme continua valendo em tudo que é interno — artefato, teste, código,
mensagem de commit —, que é quase tudo. A fronteira é um recorte do lado de
fora, não uma reversão da regra; emendar a spec para dizer "uniforme, exceto…"
trocaria uma regra simples por uma regra com exceção no lugar em que ela é mais
lida.

## Consequências

### O que se ganha

Quem lê de fora recebe texto que se sustenta sozinho. A fronteira sai da
configuração que já existe — `artifacts:` diz o que é interno, e a interface
pública fica de fora sem nenhuma exceção escrita — e é verificada no CI, não
lembrada num checklist.

### O que se aceita perder

**Quem lê de fora e quer o porquê perde o atalho.** O caminho vai de dentro para
fora, não o contrário.

**O vínculo entre guia de migração e ADR passa a morar na mensagem de commit.**
Um ADR aceito é congelado por `HK-1` e não pode ganhar a citação a um guia
escrito depois dele; o commit que cria o guia cita o ADR. A verificação desse
vínculo era humana e continua humana — não se perde enforcement, mas o vínculo
fica menos à vista.

**Repositório já instalado não é verificado** até marcar os próprios documentos
à mão: o `init` avisa, e não reescreve a linha.

**A spec do toolkit continua afirmando a uniformidade.** Quem lê só a spec não
vê a fronteira sem passar por este ADR.

**O README e o CHANGELOG deste repositório são reescritos** em texto corrido
onde citavam ID.
```

- [ ] **Step 2: Acrescentar `RN-0030` ao fim de `docs/requirements/rules.md`**

Troque `last-reviewed: 2026-08-27` por `last-reviewed: 2026-09-15` no frontmatter e acrescente, depois do último parágrafo de `RN-0029`, uma linha em branco e:

```markdown
## RN-0030 — Documento para quem vem de fora não cita ID de artefato

- **status:** draft
- **relates-to:** ADR-0017, RN-0013
- **fora de escopo:** os identificadores da interface pública, que a política de versionamento declara; o frontmatter, que é contrato de máquina e é de `CI-1`; e o bloco de código cercado, que é exemplo

O corpo de um documento ou artefato declarado `audience: external` não contém
citação a um prefixo declarado em `artifacts:` — nem em prosa, nem entre
crases, nem no caminho de um link. Quem lê de fora não tem como resolver o ID, e
um link até o artefato o leva a um documento escrito para quem mantém o
repositório.

O vínculo que o ID carregaria não se perde: ele existe e mora do lado de dentro,
no próprio artefato ou na mensagem de commit. Conta toda citação a prefixo
declarado — a que resolve, a retirada e a que não resolve —, porque a regra é
sobre o que o leitor vê, e não sobre o item existir.
```

- [ ] **Step 3: Acrescentar `RF-0015` ao fim de `docs/requirements/functional.md`**

Troque `last-reviewed: 2026-08-27` por `last-reviewed: 2026-09-15` e acrescente, depois do último parágrafo de `RF-0014`, uma linha em branco e:

```markdown
## RF-0015 — `init` marca como externo o que é escrito para quem vem de fora

- **status:** draft
- **relates-to:** RF-0009, RF-0012, RN-0030
- **fora de escopo:** o `README.md` de quem instala, que o `init` não declara como documentação e não passa a declarar por causa disto

No estágio `production` em diante, uma instalação nova declara `CHANGELOG.md`,
`docs/deprecations.md`, `docs/migrations/` e o artefato `REL` com
`audience: external`. É o rastro histórico, e ele é escrito para quem consome.

Num repositório que já declara essas entradas sem a marca, o `init` não
reescreve a linha: relata, entre o que não instalou, cada entrada declarada sem
a marca, dizendo que marcá-la é o que liga a verificação para ela. É a mesma
política de quando ele acrescenta ao `.ownership.yml` e ao CODEOWNERS: o que já
está escrito é de quem escreveu.
```

- [ ] **Step 4: Acrescentar o termo ao glossário**

Em `docs/glossary.md`, troque `last-reviewed: 2026-08-27` por `last-reviewed: 2026-09-15` e acrescente esta linha logo depois da linha de `Gatilho de pagamento` (a última da tabela):

```markdown
| Documento externo | Documento ou artefato declarado `audience: external`, escrito para quem lê o repositório sem participar dele | `audience` | Caminho `consumer-visible` — que é **código** cuja mudança exige entrada no CHANGELOG, e não um documento | ADR-0017, RN-0030 | active |
```

`active`, e não `draft`: é o desvio 1 deste plano.

- [ ] **Step 5: Formatar**

Run: `npx prettier --write docs/decisions/adr/ADR-0017-fronteira-de-leitor.md docs/requirements/rules.md docs/requirements/functional.md docs/glossary.md`
Expected: os quatro arquivos listados. A tabela do glossário é realinhada.

- [ ] **Step 6: Verificar**

Run: `npm test && node src/cli/index.ts validate`
Expected: todos os testes passam, incluindo `RN-0011` (glossário) e `RN-0010` (contrato do agente); `living-docs: nenhuma violação encontrada.` Se `CI-2` acusar citação que não resolve, o ID digitado no `relates-to` está errado.

- [ ] **Step 7: Commit**

```bash
git add docs/decisions/adr/ADR-0017-fronteira-de-leitor.md docs/requirements/rules.md docs/requirements/functional.md docs/glossary.md
git commit -F - <<'EOF'
docs(ADR-0017): registra a fronteira de leitor e as regras que ela pede

Nasce a decisão de que texto escrito para quem lê de fora não cita ID de
artefato, a regra RN-0030 que a torna verificável, o RF-0015 que diz o que
o init marca, e o termo "Documento externo". Tudo nasce draft, menos o termo,
que segue o ciclo de vida de termo da spec do toolkit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 2: `audience` no `.ownership.yml` (`M-5`, `M-8` parser, `M-7` política)

**Files:**
- Modify: `src/config/ownership.ts`
- Modify: `test/config/ownership.test.ts` (acrescentar ao fim)
- Modify: `test/docs/schema.test.ts:20-34` (a função `rule`)
- Modify: `docs/contracts/versioning-policy.md` (seção "O que é público"; `last-reviewed`)
- Modify: `CHANGELOG.md` (fim de `### Added` em `## [Unreleased]`)

**Interfaces:**
- Consumes: nada de código.
- Produces, exportados de `src/config/ownership.ts`:
  - `export const AUDIENCES = ['internal', 'external'] as const`
  - `export type Audience = (typeof AUDIENCES)[number]`
  - `ArtifactRule.audience: Audience`
  - `DocumentRule.audience: Audience`
  - Ausente → `'internal'`. Valor fora do vocabulário → `OwnershipError` cuja mensagem contém `Válidos: internal, external`.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente ao fim de `test/config/ownership.test.ts`:

```ts
const COM_AUDIENCE = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
  - id-prefix: REL
    path: docs/releases/
    owner: "@time"
    skill: release-historian
    audience: external
documents:
  - path: CONTRIBUTING.md
    owner: "@time"
  - path: CHANGELOG.md
    owner: "@time"
    skill: release-historian
    audience: external
`

test('ADR-0017: audience ausente é internal — nenhum .ownership.yml escrito antes muda de significado', () => {
  const config = parseOwnership(COM_AUDIENCE)

  assert.equal(config.artifacts.find(artifact => artifact.idPrefix === 'ADR')?.audience, 'internal')
  assert.equal(config.documents.find(document => document.path === 'CONTRIBUTING.md')?.audience, 'internal')
  assert.ok(parseOwnership(VALID).artifacts.every(artifact => artifact.audience === 'internal'))
})

test('ADR-0017: audience external é lido em artifacts: e em documents:', () => {
  const config = parseOwnership(COM_AUDIENCE)

  assert.equal(config.artifacts.find(artifact => artifact.idPrefix === 'REL')?.audience, 'external')
  assert.equal(config.documents.find(document => document.path === 'CHANGELOG.md')?.audience, 'external')
})

test('ADR-0017: audience fora do vocabulário é erro e nomeia os válidos', () => {
  // O artefato REL é o único seguido de `documents:`; o CHANGELOG é a última linha do YAML.
  const noArtefato = COM_AUDIENCE.replace('audience: external\ndocuments:', 'audience: publico\ndocuments:')
  const noDocumento = COM_AUDIENCE.replace(/audience: external\n$/, 'audience: publico\n')

  assert.notEqual(noDocumento, COM_AUDIENCE, 'o replace do documento precisa casar')
  assert.notEqual(noArtefato, COM_AUDIENCE, 'o replace do artefato precisa casar')
  for (const source of [noDocumento, noArtefato]) {
    assert.throws(
      () => parseOwnership(source),
      (err: unknown) => err instanceof OwnershipError && /audience "publico"/.test(err.message) && /internal, external/.test(err.message),
    )
  }
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/config/ownership.test.ts`
Expected: FAIL nos três testes novos (`audience` é `undefined`, e o valor inválido não lança).

- [ ] **Step 3: Implementar no parser**

Em `src/config/ownership.ts`, logo depois de `export type Collection = 'per-file' | 'table' | 'sections'`, acrescente:

```ts
/**
 * Quem lê um documento ou artefato (`ADR-0017`).
 *
 * Vocabulário fechado, no mesmo desenho de `DOCUMENT_ROLES`: é o que permite a
 * `CI-11` achar o texto escrito para quem vem de fora sem conhecer caminho
 * nenhum. Ausente, vale `internal` — nenhum `.ownership.yml` escrito antes muda
 * de significado.
 */
export const AUDIENCES = ['internal', 'external'] as const
export type Audience = (typeof AUDIENCES)[number]
```

Em `interface ArtifactRule`, depois de `states: string[] | null`:

```ts
  /** Quem lê este artefato (`ADR-0017`). `external` liga `CI-11` sobre ele. */
  audience: Audience
```

Em `interface DocumentRule`, depois de `role: DocumentRole | null`:

```ts
  /** Quem lê este documento (`ADR-0017`). `external` liga `CI-11` sobre ele. */
  audience: Audience
```

Logo depois da função `requireString`, acrescente:

```ts
function parseAudience(raw: unknown, where: string): Audience {
  if (raw === undefined) {
    return 'internal'
  }
  if (!AUDIENCES.includes(raw as Audience)) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.audience "${String(raw)}" desconhecido. Válidos: ${AUDIENCES.join(', ')}.`)
  }

  return raw as Audience
}
```

No `return` de `parseArtifact`, depois de `states,`:

```ts
    audience: parseAudience(item.audience, where),
```

No `return` de `parseDocument`, depois de `role: role === undefined ? null : (role as DocumentRole),`:

```ts
    audience: parseAudience(item.audience, where),
```

- [ ] **Step 4: Ajustar o literal de `ArtifactRule` em `test/docs/schema.test.ts`**

Na função `rule`, depois de `states: null,`:

```ts
    audience: 'internal',
```

- [ ] **Step 5: Rodar e ver passar**

Run: `node --test test/config/ownership.test.ts test/docs/schema.test.ts && npm run typecheck`
Expected: PASS e `tsc` sem erro.

- [ ] **Step 6: Tornar a chave pública na política de versionamento**

Em `docs/contracts/versioning-policy.md`, troque `last-reviewed: 2026-08-25` por `last-reviewed: 2026-09-15` e acrescente, logo depois do item que termina em `` `docs/.ownership.yml` (`ADR-0006`). `` na seção `## O que é público`:

```markdown
- A chave `audience` de `documents:` e de `artifacts:` no
  `docs/.ownership.yml`, e os dois valores que ela aceita: `internal`, que é o
  padrão, e `external`, que marca o texto escrito para quem lê de fora
  (`ADR-0017`).
```

- [ ] **Step 7: Entrada de CHANGELOG**

Em `CHANGELOG.md`, acrescente ao fim da lista `### Added` de `## [Unreleased]`, logo antes da linha `### Changed`, com uma linha em branco antes do título:

```markdown
- `audience` em `documents:` e em `artifacts:` do `docs/.ownership.yml`:
  declara quem lê o documento. Aceita `internal` e `external`; ausente, vale
  `internal`, e nenhum `.ownership.yml` já escrito muda de significado.
```

- [ ] **Step 8: Formatar e verificar**

Run: `npx prettier --write src/config/ownership.ts test/config/ownership.test.ts test/docs/schema.test.ts docs/contracts/versioning-policy.md CHANGELOG.md && npm test && node src/cli/index.ts validate`
Expected: todos os testes passam; `nenhuma violação encontrada`.

- [ ] **Step 9: Commit**

```bash
git add src/config/ownership.ts test/config/ownership.test.ts test/docs/schema.test.ts docs/contracts/versioning-policy.md CHANGELOG.md
git commit -F - <<'EOF'
feat(ADR-0017): o .ownership.yml aceita audience em documents: e artifacts:

Vocabulário fechado, internal ou external, com internal como padrão: nenhum
.ownership.yml escrito antes muda de significado. A chave entra na política
de versionamento como interface pública.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 3: `CI-11` — external audience (`M-6`, `M-8` check, `M-7` catálogo)

**Files:**
- Create: `src/checks/ci11-external-audience.ts`
- Create: `test/checks/ci11-external-audience.test.ts`
- Modify: `src/checks/registry.ts` (import e `validateChecks`)
- Modify: `test/checks/registry.test.ts:28-54`
- Modify: `src/checks/catalog.ts` (entrada nova no fim)
- Regenerate: `docs/contracts/checks.gen.md`
- Modify: `docs/definition-of-done.md:30` (e `last-reviewed`)
- Modify: `CHANGELOG.md` (fim de `### Added`)

**Interfaces:**
- Consumes: `Audience` e `ArtifactRule.audience`/`DocumentRule.audience` (Task 2); `CheckContext`, `Finding`, `Check` de `src/core/types.ts`; `stripFences(source: string): string` de `src/docs/markdown.ts`; `findCitations(source: string, format: IdFormat): Citation[]` de `src/ids/citations.ts`; `parseId(value: unknown, format: IdFormat): { prefix: string; number: number } | null` de `src/docs/schema.ts`; `Frontmatter` (com `endLine: number`, 1-indexed, a linha do `---` que fecha) de `src/frontmatter/parse.ts`.
- Produces, exportados de `src/checks/ci11-external-audience.ts`:
  - `export const ci11ExternalAudience: Check` com `id: 'CI-11'` e `name: 'external audience'`
  - `export interface ExternalText { file: string; source: string; frontmatter: Frontmatter | null }`
  - `export function externalTexts(context: CheckContext): ExternalText[]`
  - `export function bodyOf(source: string, frontmatter: Frontmatter | null): string`

- [ ] **Step 1: Escrever os testes do check**

Crie `test/checks/ci11-external-audience.test.ts`:

````ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { ci11ExternalAudience } from '../../src/checks/ci11-external-audience.ts'
import { parseOwnership } from '../../src/config/ownership.ts'
import type { Finding } from '../../src/core/types.ts'
import { collectArtifacts, collectDocuments } from '../../src/docs/collect.ts'
import { withTempRepo } from '../helpers/tmp.ts'

// ADR, RN e REL são internos porque estão declarados. TDR, de propósito, não
// está: é o caso do projeto que ainda não instalou a família.
const OWNERSHIP = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@time"
    skill: decision-recorder
  - id-prefix: RN
    path: docs/requirements/rules.md
    owner: "@time"
    skill: requirements-keeper
    collection: sections
  - id-prefix: REL
    path: docs/releases/
    owner: "@time"
    skill: release-historian
    audience: external
documents:
  - path: CHANGELOG.md
    owner: "@time"
    skill: release-historian
    audience: external
  - path: CONTRIBUTING.md
    owner: "@time"
    skill: working-agreements-keeper
`

function findingsFor(files: Record<string, string>): Finding[] {
  let findings: Finding[] = []

  withTempRepo(files, root => {
    const config = parseOwnership(OWNERSHIP)

    findings = ci11ExternalAudience.run({
      root,
      config,
      docs: collectArtifacts(root, config),
      documents: collectDocuments(root, config),
      today: '2026-09-15',
    })
  })

  return findings
}

const changelog = (...entries: string[]): string => ['# Changelog', '', '## [Unreleased]', '', ...entries, ''].join('\n')

const releaseNote = (frontmatterExtra: string[], body: string[]): string =>
  [
    '---',
    'id: REL-0001',
    'title: v1.0.0',
    'status: draft',
    'owner: "@time"',
    'trigger: Nunca. Congelada depois de publicada.',
    ...frontmatterExtra,
    'last-reviewed: 2026-09-15',
    '---',
    '',
    ...body,
    '',
  ].join('\n')

test('RN-0030: ID de artefato em prosa, em documento externo, reprova na linha certa', () => {
  const findings = findingsFor({ 'CHANGELOG.md': changelog('- A regra RN-0001 passa a valer.') })

  assert.equal(findings.length, 1)
  assert.equal(findings[0]?.ruleId, 'CI-11')
  assert.equal(findings[0]?.severity, 'error')
  assert.equal(findings[0]?.file, 'CHANGELOG.md')
  assert.equal(findings[0]?.line, 5)
  assert.match(findings[0]?.message ?? '', /RN-0001/)
})

test('RN-0030: ID entre crases reprova — marcação inline não esconde o que o leitor vê', () => {
  const findings = findingsFor({ 'CHANGELOG.md': changelog('- Decidido em `ADR-0003`.') })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0003/)
})

test('RN-0030: ID só no caminho de um link reprova, mesmo fora do texto renderizado', () => {
  const findings = findingsFor({ 'CHANGELOG.md': changelog('- Veja [a decisão](docs/decisions/adr/ADR-0003-duas-raizes.md).') })

  assert.equal(findings.length, 1)
  assert.match(findings[0]?.message ?? '', /ADR-0003/)
})

test('RN-0030: ID dentro de bloco de código cercado passa — é exemplo', () => {
  assert.deepEqual(findingsFor({ 'CHANGELOG.md': changelog('```text', 'RN-0001', '```') }), [])
})

test('RN-0030: ID só no frontmatter de um artefato externo passa — é contrato de máquina', () => {
  const nota = releaseNote(['relates-to: [ADR-0003]'], ['# v1.0.0', '', 'Nada muda para quem usa.'])

  assert.deepEqual(findingsFor({ 'docs/releases/REL-0001-v1.md': nota }), [])
})

test('RN-0030: identificador da interface pública citado em documento externo passa', () => {
  assert.deepEqual(findingsFor({ 'CHANGELOG.md': changelog('- `CI-11` reprova, `HK-6` avisa, e o código de saída é `EXIT-2`.') }), [])
})

test('RN-0030: o mesmo ID em documento interno passa', () => {
  assert.deepEqual(findingsFor({ 'CONTRIBUTING.md': '# Como se contribui\n\nA regra RN-0001 e o `ADR-0003`.\n' }), [])
})

test('RN-0030: ID de prefixo não declarado em artifacts: passa — o check não conhece prefixo nenhum', () => {
  assert.deepEqual(findingsFor({ 'CHANGELOG.md': changelog('- Paga a `TDR-0001` e segue a ISO-8601.') }), [])
})

test('RN-0030: num documento com frontmatter, a linha reportada é a do arquivo', () => {
  const nota = releaseNote([], ['# v1.0.0', '', 'Corrige o que RN-0001 exigia.'])
  const findings = findingsFor({ 'docs/releases/REL-0001-v1.md': nota })

  // 8 linhas de frontmatter, uma em branco, o título, outra em branco: linha 12.
  assert.equal(findings.length, 1, 'o id: REL-0001 do frontmatter não pode virar achado')
  assert.equal(findings[0]?.file, 'docs/releases/REL-0001-v1.md')
  assert.equal(findings[0]?.line, 12)
})

test('RN-0030: artefato com frontmatter quebrado é pulado — CI-1 já reprova', () => {
  const quebrada = ['---', 'id: [REL-0001', 'title: v1.0.0', '---', '', 'Corrige RN-0001.', ''].join('\n')

  assert.deepEqual(findingsFor({ 'docs/releases/REL-0001-v1.md': quebrada }), [])
})
````

Conta de linhas do caso 9, que é o que trava `bodyOf`: `---` (1), `id` (2), `title` (3), `status` (4), `owner` (5), `trigger` (6), `last-reviewed` (7), `---` (8), vazia (9), `# v1.0.0` (10), vazia (11), a frase (12).

- [ ] **Step 2: Atualizar o teste do registry**

Em `test/checks/registry.test.ts`, no objeto `esperado`, depois de `'CI-10': 'living-docs validate',`:

```ts
    'CI-11': 'living-docs validate',
```

E troque a última asserção por:

```ts
  assert.deepEqual(semDiff, ['CI-1', 'CI-2', 'CI-3', 'CI-4', 'CI-7', 'CI-8', 'CI-9', 'CI-10', 'CI-11'])
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `node --test test/checks/ci11-external-audience.test.ts test/checks/registry.test.ts`
Expected: FAIL. O primeiro arquivo, com `ERR_MODULE_NOT_FOUND` para `ci11-external-audience.ts`; o registry, porque `CI-11` não está no catálogo nem em `validateChecks()`.

- [ ] **Step 4: Implementar o check**

Crie `src/checks/ci11-external-audience.ts`:

```ts
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { stripFences } from '../docs/markdown.ts'
import { parseId } from '../docs/schema.ts'
import type { Frontmatter } from '../frontmatter/parse.ts'
import { findCitations } from '../ids/citations.ts'

const RULE = 'CI-11'

export interface ExternalText {
  file: string
  source: string
  frontmatter: Frontmatter | null
}

/**
 * O texto que quem vem de fora lê: documentos e artefatos declarados
 * `audience: external` (`ADR-0017`).
 *
 * Artefato com frontmatter quebrado fica de fora: `CI-1` já reprova, e ler o
 * bloco quebrado como corpo produziria um segundo achado sobre o próprio `id:`.
 */
export function externalTexts(context: CheckContext): ExternalText[] {
  const texts: ExternalText[] = []

  for (const doc of context.docs) {
    if (doc.rule.audience !== 'external' || doc.syntaxError !== null) {
      continue
    }
    texts.push({ file: doc.file, source: doc.source, frontmatter: doc.frontmatter })
  }

  for (const document of context.documents) {
    if (document.rule.audience !== 'external') {
      continue
    }
    texts.push({ file: document.file, source: document.source, frontmatter: document.frontmatter })
  }

  return texts
}

/**
 * O texto com o frontmatter apagado **linha a linha**: a contagem fica, e a
 * linha do achado é a do arquivo. O frontmatter é contrato de máquina e é de
 * `CI-1` (`RN-0030`).
 */
export function bodyOf(source: string, frontmatter: Frontmatter | null): string {
  const lines = source.replace(/^﻿/, '').replace(/\r\n/g, '\n').split('\n')

  if (frontmatter === null) {
    return lines.join('\n')
  }

  return lines.map((line, index) => (index < frontmatter.endLine ? '' : line)).join('\n')
}

/**
 * `CI-11` — external audience. Regra de origem: `RN-0030`.
 *
 * Não carrega lista de prefixos: interno é o que `artifacts:` declara, e só
 * isso. `CI-n`, `HK-n` e `EXIT-n` não são família de artefato — ninguém os
 * declara ali —, então ficam de fora sem que nenhuma exceção precise ser
 * escrita; e um projeto que ainda não declarou `RN` não é cobrado por um
 * `RN-0001` solto, a mesma fronteira de `CI-2` (`RN-0007`).
 *
 * `stripFences`, e não `stripCode`: o ID entre crases é exatamente o que se
 * procura, e o exemplo dentro de uma cerca continua sendo exemplo. O ID no
 * caminho de um link é pego sem esforço, porque a varredura é do texto cru.
 *
 * Conta qualquer citação a prefixo declarado — a que resolve, a retirada e a
 * que não resolve —: a regra é sobre o que o leitor vê. Sem rótulo de exceção
 * (`ADR-0017`).
 */
export const ci11ExternalAudience: Check = {
  id: RULE,
  name: 'external audience',
  run(context: CheckContext): Finding[] {
    const format = context.config.idFormat
    const internal = new Set(context.config.artifacts.map(artifact => artifact.idPrefix))
    const findings: Finding[] = []

    for (const text of externalTexts(context)) {
      for (const citation of findCitations(stripFences(bodyOf(text.source, text.frontmatter)), format)) {
        const parsed = parseId(citation.id, format)

        if (parsed === null || !internal.has(parsed.prefix)) {
          continue
        }

        findings.push({
          ruleId: RULE,
          file: text.file,
          line: citation.line,
          severity: 'error',
          message:
            `\`${citation.id}\` é ID de artefato, e \`${text.file}\` é lido por quem vem de fora ` +
            '(`audience: external`): esse leitor não tem como resolver o ID.',
          fix:
            'Escreva em texto corrido o que o item decide ou exige, sem apontá-lo. O vínculo continua existindo ' +
            'e mora do lado de dentro — no próprio artefato ou na mensagem de commit (`RN-0030`, `ADR-0017`). ' +
            'Não há rótulo de exceção.',
        })
      }
    }

    return findings
  },
}
```

- [ ] **Step 5: Registrar no `validate`**

Em `src/checks/registry.ts`, depois de `import { ci10TriggerRouting } from './ci10-trigger-routing.ts'`:

```ts
import { ci11ExternalAudience } from './ci11-external-audience.ts'
```

E em `validateChecks`:

```ts
  return [ci1Structure, ci2Ids, ci3Traceability, ci4Staleness, ci7OwnershipCoverage(diff), ci8Links, ci9CommitDiscipline(diff), ci10TriggerRouting(), ci11ExternalAudience]
```

- [ ] **Step 6: Catalogar**

Em `src/checks/catalog.ts`, depois da entrada de `CI-10` (antes do `])` final):

```ts
  {
    id: 'CI-11',
    name: 'external audience',
    command: 'living-docs validate',
    failsWhen:
      'Documento ou artefato declarado `audience: external` cita, fora do frontmatter e de bloco de código cercado, um ID cujo prefixo está declarado em `artifacts:` — em prosa, entre crases ou no caminho de um link.',
  },
```

- [ ] **Step 7: Rodar e ver passar**

Run: `node --test test/checks/ci11-external-audience.test.ts test/checks/registry.test.ts && npm run typecheck`
Expected: PASS nos 10 casos e nos 5 testes do registry; `tsc` sem erro.

- [ ] **Step 8: Regerar o contrato (tool Bash, nunca Edit/Write)**

Run: `node src/tools/gen-checks.ts > docs/contracts/checks.gen.md && node src/cli/index.ts drift`
Expected: `git diff docs/contracts/checks.gen.md` mostra só a linha nova de `CI-11`; `drift` diz `nenhuma violação encontrada`.

- [ ] **Step 9: Definition of Done**

Em `docs/definition-of-done.md`, troque `last-reviewed: 2026-09-01` por `last-reviewed: 2026-09-15` e, na linha de `npm test`, troque `` `CI-1` a `CI-10` `` por `` `CI-1` a `CI-11` ``.

- [ ] **Step 10: Entrada de CHANGELOG**

Em `CHANGELOG.md`, acrescente ao fim de `### Added` (logo depois da entrada de `audience` da Task 2):

```markdown
- `CI-11` (`living-docs validate`): documento ou artefato declarado
  `audience: external` não pode citar ID de artefato — em prosa, entre crases ou
  no caminho de um link. O frontmatter e os blocos de código cercados ficam de
  fora, e os identificadores da interface pública (`CI-n`, `HK-n`, `SK-n`,
  `CM-n`, `EXIT-n`) continuam citáveis. Não há rótulo de exceção: o conserto é
  reescrever em texto corrido.
```

- [ ] **Step 11: Formatar e verificar tudo**

Run: `npx prettier --write src/checks/ci11-external-audience.ts src/checks/registry.ts src/checks/catalog.ts test/checks/ci11-external-audience.test.ts test/checks/registry.test.ts docs/definition-of-done.md CHANGELOG.md && npm test && npm run typecheck && node src/cli/index.ts validate && node src/cli/index.ts drift`
Expected: tudo passa. `validate` segue limpo, porque nada deste repositório está marcado `external` ainda. Se o Prettier quebrar a linha de `validateChecks`, tudo bem.

- [ ] **Step 12: Commit**

```bash
git add src/checks/ci11-external-audience.ts test/checks/ci11-external-audience.test.ts src/checks/registry.ts test/checks/registry.test.ts src/checks/catalog.ts docs/contracts/checks.gen.md docs/definition-of-done.md CHANGELOG.md
git commit -F - <<'EOF'
feat(RN-0030): CI-11 reprova ID de artefato em documento externo

O check lê só os prefixos declarados em artifacts: — nenhuma lista própria —,
ignora frontmatter e bloco cercado, conta crase e caminho de link, e não tem
rótulo de exceção. Entra no validate depois de CI-10, no catálogo e no
contrato gerado; a Definition of Done passa a nomear CI-1 a CI-11.

Docs: none — a RN-0030 que este check verifica nasceu no commit da decisão, antes do código.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 4: O `init` marca o rastro histórico e avisa (`M-9`)

**Files:**
- Modify: `src/cli/init.ts` (import; `DocumentSeed` e as três listas; `documentSeeds`; `documentEntry`; `documentsBlock`; `releasesBlock`; `runInit`; função nova `reportUnmarkedExternal`)
- Modify: `test/cli/init.test.ts` (acrescentar ao fim)
- Modify: `CHANGELOG.md` (fim de `### Added`)

**Interfaces:**
- Consumes: `type Audience` e `ArtifactRule.audience`/`DocumentRule.audience` de `src/config/ownership.ts` (Task 2). Em `test/cli/init.test.ts` já existem `PRODUCTION`, `SMALL_TEAM`, `loadOwnership`, `runValidate`, `readFileSync`, `writeFileSync`, `join`, `withTempRepo` e `OWNERSHIP_PATH`.
- Produces: `DocumentSeed.audience: Audience` (interno ao módulo). Os itens de `InitResult.notInstalled` para entrada sem a marca contêm o caminho (ou `o artefato REL`), `audience: external` e `CI-11`.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente ao fim de `test/cli/init.test.ts`:

```ts
test('RF-0015: production declara o rastro histórico como externo, e só ele', () => {
  withTempRepo({}, root => {
    const result = runInit(root, PRODUCTION)
    const config = loadOwnership(root)
    const byPath = new Map(config.documents.map(document => [document.path, document]))

    for (const path of ['CHANGELOG.md', 'docs/deprecations.md', 'docs/migrations/']) {
      assert.equal(byPath.get(path)?.audience, 'external', `${path} é escrito para quem consome`)
    }
    assert.equal(config.artifacts.find(artifact => artifact.idPrefix === 'REL')?.audience, 'external')

    for (const path of ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md', 'CONTRIBUTING.md', 'docs/.ownership.yml']) {
      assert.equal(byPath.get(path)?.audience, 'internal', `${path} não é marcado pelo init`)
    }
    assert.ok(
      config.artifacts.filter(artifact => artifact.idPrefix !== 'REL').every(artifact => artifact.audience === 'internal'),
      'só REL nasce externo',
    )

    assert.deepEqual(result.notInstalled, [])
    assert.equal(runValidate(root).exitCode, 0, JSON.stringify(runValidate(root).findings, null, 2))
  })
})

test('RF-0015: small-team não declara nada como externo', () => {
  withTempRepo({}, root => {
    runInit(root, SMALL_TEAM)
    const config = loadOwnership(root)

    assert.ok(config.documents.every(document => document.audience === 'internal'))
    assert.ok(config.artifacts.every(artifact => artifact.audience === 'internal'))
  })
})

test('RF-0015: entrada já declarada sem a marca vira aviso, e o .ownership.yml não é reescrito', () => {
  withTempRepo({}, root => {
    runInit(root, PRODUCTION)

    // O repositório instalado por uma versão anterior: as mesmas entradas, sem a chave.
    const file = join(root, OWNERSHIP_PATH)
    const semMarca = readFileSync(file, 'utf8').replace(/^ {4}audience: external\r?\n/gm, '')

    writeFileSync(file, semMarca, 'utf8')
    assert.ok(loadOwnership(root).documents.every(document => document.audience === 'internal'), 'o cenário precisa estar sem marca')

    const changelogAntes = readFileSync(join(root, 'CHANGELOG.md'), 'utf8')
    const result = runInit(root, PRODUCTION)

    assert.equal(readFileSync(file, 'utf8'), semMarca, 'o init não reescreve linha já declarada')
    assert.equal(readFileSync(join(root, 'CHANGELOG.md'), 'utf8'), changelogAntes)

    for (const alvo of [/CHANGELOG\.md/, /docs\/deprecations\.md/, /docs\/migrations\//, /REL/]) {
      assert.ok(
        result.notInstalled.some(item => alvo.test(item) && /audience: external/.test(item) && /CI-11/.test(item)),
        `esperava aviso para ${alvo} — ${JSON.stringify(result.notInstalled)}`,
      )
    }
  })
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/cli/init.test.ts`
Expected: FAIL nos três testes novos (`audience` sai `internal` em tudo, e nenhum aviso aparece). Os 60+ testes existentes continuam passando.

- [ ] **Step 3: As sementes ganham `audience`**

Em `src/cli/init.ts`, troque o import de tipos de `../config/ownership.ts` por:

```ts
import type { Audience, DocumentRole, OwnershipConfig } from '../config/ownership.ts'
```

Troque `interface DocumentSeed` e as três listas por:

```ts
interface DocumentSeed {
  path: string
  skill: string | null
  role: DocumentRole | null
  /** `external` para o que é escrito para quem vem de fora (`RF-0015`). */
  audience: Audience
}

/** Declarados em todo estágio: os dois nascem já no `solo`. */
const BASE_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: OWNERSHIP_PATH, skill: 'living-docs-bootstrap', role: null, audience: 'internal' },
  { path: RETIRED_IDS_PATH, skill: 'living-docs-bootstrap', role: null, audience: 'internal' },
])

const SMALL_TEAM_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: 'CONTRIBUTING.md', skill: 'working-agreements-keeper', role: null, audience: 'internal' },
  { path: 'docs/definition-of-done.md', skill: 'working-agreements-keeper', role: 'definition-of-done', audience: 'internal' },
  { path: 'docs/glossary.md', skill: 'glossary-keeper', role: null, audience: 'internal' },
  { path: 'docs/charter/', skill: 'charter-keeper', role: null, audience: 'internal' },
])

/**
 * O rastro histórico nasce externo: é escrito para quem consome (`RF-0015`).
 * Os contratos não — citam as próprias fontes, e marcá-los é decisão de quem os
 * mantém.
 */
const PRODUCTION_DOCUMENTS: readonly DocumentSeed[] = Object.freeze([
  { path: 'docs/contracts/errors.md', skill: 'contract-keeper', role: null, audience: 'internal' },
  { path: 'docs/contracts/versioning-policy.md', skill: 'contract-keeper', role: null, audience: 'internal' },
  { path: 'CHANGELOG.md', skill: 'release-historian', role: null, audience: 'external' },
  { path: 'docs/deprecations.md', skill: 'release-historian', role: null, audience: 'external' },
  { path: 'docs/migrations/', skill: 'release-historian', role: null, audience: 'external' },
])
```

Em `documentSeeds`, a semente do contrato do agente passa a ser:

```ts
    { path: agentContractPath(root), skill: 'working-agreements-keeper', role: 'agent-contract', audience: 'internal' },
```

- [ ] **Step 4: Escrever a chave no YAML**

Em `documentEntry`, antes do `return`:

```ts
  if (seed.audience === 'external') {
    lines.push('    audience: external')
  }
```

Em `documentsBlock`, depois da linha ``'# `role` é vocabulário fechado: agent-contract, definition-of-done.',``:

```ts
    '# `audience` diz quem lê: ausente é internal; external liga CI-11, que reprova ID de artefato no texto.',
```

Em `releasesBlock`, o array passa a ser:

```ts
    [
      '  - id-prefix: REL',
      `    path: ${path}`,
      `    owner: "${owner}"`,
      '    skill: release-historian',
      '    # A release note é lida por quem consome: CI-11 cobra que ela não cite ID de artefato.',
      '    audience: external',
      '    # Release note publicada é congelada por HK-1 (spec §5, SK-7, regra 4).',
      '    append-only: true',
      '    mutable-fields: [status, last-reviewed]',
    ].join('\n') +
```

- [ ] **Step 5: Avisar, sem reescrever**

Em `runInit`, troque o bloco final:

```ts
  if (existing !== null) {
    declareDocuments(root, options, result, existing)
  }
```

por:

```ts
  if (existing !== null) {
    declareDocuments(root, options, result, existing)
    reportUnmarkedExternal(root, options.stage, result, existing)
  }
```

E acrescente, logo depois da função `declareDocuments`:

```ts
/**
 * Relata a entrada já declarada que este estágio marcaria como externa e que
 * não está marcada (`RF-0015`).
 *
 * Não reescreve a linha: mesma política de `declareDocuments`,
 * `declareArtifacts` e `declareCodeowners`. A entrada é de quem a escreveu, e
 * marcá-la liga `CI-11` sobre um texto que talvez ainda cite ID — a decisão é de
 * quem responde por ele.
 */
function reportUnmarkedExternal(root: string, stage: Stage, result: InitResult, existing: OwnershipConfig): void {
  for (const seed of documentSeeds(root, stage)) {
    if (seed.audience !== 'external') {
      continue
    }
    const declared = existing.documents.find(document => document.path === seed.path)

    if (declared !== undefined && declared.audience !== 'external') {
      result.notInstalled.push(unmarkedExternal(`\`${seed.path}\` em documents:`))
    }
  }

  const rel = existing.artifacts.find(artifact => artifact.idPrefix === 'REL')

  if (reaches(stage, 6) && rel !== undefined && rel.audience !== 'external') {
    result.notInstalled.push(unmarkedExternal('o artefato REL em artifacts:'))
  }
}

function unmarkedExternal(what: string): string {
  return (
    `audience: external para ${what}, em ${OWNERSHIP_PATH} — a entrada já estava declarada sem a marca, ` +
    'e o init não reescreve linha já escrita; marcá-la é o que liga CI-11 para ela'
  )
}
```

- [ ] **Step 6: Rodar e ver passar**

Run: `node --test test/cli/init.test.ts test/cli/init-enforcement.test.ts test/acceptance/consumer-repo.test.ts && npm run typecheck`
Expected: PASS em tudo, incluindo `RF-0009: production não deixa nada da spec §10 de fora` (instalação nova não avisa nada) e o aceite de consumidor (segunda execução num repositório escrito por esta versão também não avisa).

- [ ] **Step 7: Entrada de CHANGELOG**

Em `CHANGELOG.md`, acrescente ao fim de `### Added`:

```markdown
- `living-docs init --stage production` passa a declarar `CHANGELOG.md`,
  `docs/deprecations.md`, `docs/migrations/` e as release notes com
  `audience: external`. Num repositório que já declara essas entradas sem a
  marca, o `init` não reescreve a linha: avisa, entre o que não instalou, que
  marcá-la é o que liga `CI-11` para ela.
```

- [ ] **Step 8: Formatar e verificar**

Run: `npx prettier --write src/cli/init.ts test/cli/init.test.ts CHANGELOG.md && npm test && node src/cli/index.ts validate`
Expected: tudo passa.

- [ ] **Step 9: Commit**

```bash
git add src/cli/init.ts test/cli/init.test.ts CHANGELOG.md
git commit -F - <<'EOF'
feat(RF-0015): init de production marca o rastro histórico como externo

CHANGELOG, depreciações, migrações e o artefato REL nascem audience: external.
Num .ownership.yml que já declara essas entradas sem a marca, o init avisa
em notInstalled e não reescreve a linha.

Docs: none — o RF-0015 que este comportamento cumpre nasceu no commit da decisão, antes do código.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 5: Skill, templates e contrato do agente (`M-10`, `M-11`)

**Files:**
- Modify: `plugin/skills/release-historian/SKILL.md` (passo 5 do Procedimento; Checklist)
- Modify: `templates/migration.md` (o comentário de `## Por que`)
- Modify: `templates/agent-contract.md` (fim da seção `## Política`)
- Modify: `CLAUDE.md` (seção `## Política`)
- Modify: `test/plugin/authoring.test.ts` (acrescentar ao fim)
- Modify: `test/docs/agent-contract.test.ts` (acrescentar ao fim)
- Modify: `CHANGELOG.md` (fim de `### Changed`)

**Interfaces:**
- Consumes: `CI-11` existe e roda no `validate` (Task 3).
- Produces: nenhum símbolo de código.

- [ ] **Step 1: Escrever os testes que falham**

Acrescente ao fim de `test/plugin/authoring.test.ts`:

```ts
test('RN-0030: release-historian não pede que o guia de migração aponte o ADR pelo ID', () => {
  const source = skillSource('release-historian')

  assert.doesNotMatch(source, /apontando o ADR/, 'o guia é lido por quem vem de fora: o porquê vai em texto corrido')
  assert.match(source, /commit que cria o guia cita o ADR/, 'o vínculo passa a morar no commit')
  assert.match(source, /CI-11/, 'o checklist nomeia quem verifica')
})

test('RN-0030: o template de migração pede o porquê em texto corrido, não o ID do ADR', () => {
  const template = readFileSync(join(ROOT, 'templates/migration.md'), 'utf8')

  assert.doesNotMatch(template, /O ADR que decidiu\./)
  assert.match(template, /commit que cria o guia cita o ADR/)
})
```

Acrescente ao fim de `test/docs/agent-contract.test.ts`:

```ts
test('RN-0030: o contrato do agente e o template dele dizem que texto para fora não carrega ID, e quem cobra', () => {
  const template = readFileSync(join(ROOT, 'templates/agent-contract.md'), 'utf8')

  for (const [nome, fonte] of [
    ['CLAUDE.md', CONTRATO],
    ['templates/agent-contract.md', template],
  ] as const) {
    assert.match(fonte, /quem lê de fora/, `${nome} sem a política de fronteira de leitor`)
    assert.match(fonte, /CI-11/, `${nome} sem nomear quem cobra`)
  }
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/plugin/authoring.test.ts test/docs/agent-contract.test.ts`
Expected: FAIL nos três testes novos.

- [ ] **Step 3: A skill**

Em `plugin/skills/release-historian/SKILL.md`, troque o passo 5:

```markdown
5. **Guia de migração por mudança quebra-compatibilidade**, em
   `docs/migrations/`, apontando o ADR que a decidiu. Quebra sem ADR é decisão
   sem porquê — o caminho é `/adr` antes.
```

por:

```markdown
5. **Guia de migração por mudança quebra-compatibilidade**, em
   `docs/migrations/`. O guia diz, em texto corrido, por que a quebra foi
   decidida — sem o ID do ADR, porque quem o lê está do lado de fora —, e o
   commit que cria o guia cita o ADR. Quebra sem ADR é decisão sem porquê — o
   caminho é `/adr` antes.
```

No Checklist, troque a linha:

```markdown
- [ ] Toda quebra de compatibilidade tem guia de migração apontando o ADR — verificação: humana.
```

por estas duas:

```markdown
- [ ] Toda quebra de compatibilidade tem guia de migração que diz em texto corrido por que foi decidida, e o commit que o cria cita o ADR — verificação: humana.
- [ ] Nenhum documento externo cita ID de artefato — verificação: `CI-11`.
```

- [ ] **Step 4: O template de migração**

Em `templates/migration.md`, troque:

```markdown
<!-- O ADR que decidiu. Migração sem decisão registrada é quebra sem porquê. -->
```

por:

```markdown
<!-- Em texto corrido, o que foi decidido e por quê — sem o ID do ADR: quem lê este guia está do lado de fora. O commit que cria o guia cita o ADR. Migração sem decisão registrada é quebra sem porquê. -->
```

- [ ] **Step 5: O contrato do agente**

Em `CLAUDE.md`, acrescente logo depois do item de política que começa com `- **Mudança visível a quem consome viaja com a entrada de`, e termina em `o formato do rótulo está no contrato.`:

```markdown
- **Texto para quem lê de fora não carrega ID de artefato.** O que está marcado
  `audience: external` explica em texto corrido; o vínculo fica no artefato ou
  no commit — `CI-11` cobra.
```

Em `templates/agent-contract.md`, acrescente o mesmo item como último da seção `## Política`, logo depois de `- **Atalho consciente vira \`TDR\`** (\`/debt\`) com gatilho de pagamento observável.`.

Run: `wc -l CLAUDE.md`
Expected: no máximo 60.

- [ ] **Step 6: Rodar e ver passar**

Run: `node --test test/plugin/authoring.test.ts test/docs/agent-contract.test.ts test/docs/maintenance.test.ts`
Expected: PASS, incluindo `RN-0020: o contrato do agente continua sendo índice — sem frase copiada de artefato dono`.

- [ ] **Step 7: Entrada de CHANGELOG**

Em `CHANGELOG.md`, acrescente ao fim da lista `### Changed` de `## [Unreleased]`, logo antes da linha `### Fixed`, com uma linha em branco antes do título:

```markdown
- A skill `release-historian` e o template de guia de migração deixam de pedir
  que o guia aponte a decisão pelo ID: o guia diz, em texto corrido, por que a
  quebra foi decidida, e o commit que o cria cita a decisão. O contrato do agente
  semeado pelo `init` ganha a mesma política.
```

- [ ] **Step 8: Formatar e verificar**

Run: `npx prettier --write plugin/skills/release-historian/SKILL.md CLAUDE.md test/plugin/authoring.test.ts test/docs/agent-contract.test.ts CHANGELOG.md && npm test && node src/cli/index.ts validate`
Expected: tudo passa (`templates/` é ignorado pelo Prettier de propósito). `CI-7` e `CI-10` seguem limpos.

- [ ] **Step 9: Commit**

```bash
git add plugin/skills/release-historian/SKILL.md templates/migration.md templates/agent-contract.md CLAUDE.md test/plugin/authoring.test.ts test/docs/agent-contract.test.ts CHANGELOG.md
git commit -F - <<'EOF'
docs(ADR-0017): skill, template de migração e contrato do agente param de pedir o ID do ADR

O guia de migração explica em texto corrido por que a quebra foi decidida, e
o commit que o cria cita o ADR. O contrato do agente, aqui e no template,
ganha a política, redigida sem repetir a RN-0030.

Docs: none — a skill muda o texto que ela escreve para quem lê de fora, e não como se trabalha neste repositório.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 6: A prosa deste repositório (`M-12`)

**Files:**
- Modify: `README.md` (linhas 71–73 e 130–132)
- Modify: `CHANGELOG.md` (linhas 13–15, 90–91, 100–101, 106, 159–160 — os números podem ter andado com as Tasks 2–5; ache pelo texto)
- Modify: `docs/deprecations.md:12-15` (e `last-reviewed`)

**Interfaces:**
- Consumes: as entradas de CHANGELOG das Tasks 2–5, que já nasceram sem ID.
- Produces: README, CHANGELOG e depreciações sem citação a prefixo de `artifacts:`, pré-condição da Task 7.

- [ ] **Step 1: Registrar o estado de partida**

Run: `grep -nE "\b(ADR|DA|TDR|RF|RNF|RN|REL)-[0-9]{3,4}\b" README.md CHANGELOG.md docs/deprecations.md`
Expected: exatamente as 8 ocorrências da tabela de `M-12` na spec (README 2, CHANGELOG 5 linhas, deprecations 1). Se aparecer outra, ela veio de uma Task anterior: reescreva-a também.

- [ ] **Step 2: README**

Troque:

```markdown
A fonte do toolkit e o repositório validado são raízes independentes
(`ADR-0003`): a primeira sai do caminho do próprio código, a segunda do
diretório de trabalho ou de `LIVING_DOCS_REPO_ROOT`.
```

por:

```markdown
A fonte do toolkit e o repositório validado são raízes independentes, e
nenhuma é deduzida da outra: a primeira sai do caminho do próprio código, a
segunda do diretório de trabalho ou de `LIVING_DOCS_REPO_ROOT`.
```

Troque:

```markdown
Há um segundo caminho de execução, para quem prefere um ambiente previsível a
instalar Node (`RNF-0006`). `bin/dev` recebe um comando e o roda dentro do
container, subindo-o quando preciso:
```

por:

```markdown
Há um segundo caminho de execução, opcional, para quem prefere um ambiente
previsível a instalar Node. `bin/dev` recebe um comando e o roda dentro do
container, subindo-o quando preciso:
```

Se `README.md` abrir com frontmatter, atualize o `last-reviewed` dele para `2026-09-15`.

- [ ] **Step 3: CHANGELOG**

Cinco trocas, todas dentro de `## [Unreleased]`:

(a) Troque:

```markdown
  levou e qual é o teto declarado (`RNF-0005`). A medida não altera o código de
  saída.
```

por:

```markdown
  levou e qual é o teto declarado. A medida não altera o código de saída.
```

(b) Troque:

```markdown
  ou `bin/dev` sozinho para um shell. Exige o daemon do Docker; o caminho de
  registro continua sendo o Node do host (`RNF-0006`, `ADR-0016`).
```

por:

```markdown
  ou `bin/dev` sozinho para um shell. Exige o daemon do Docker; o caminho de
  registro continua sendo o Node do host, e os ganchos nunca entram no container.
```

(c) Troque:

```markdown
  continuam no repositório, agora como o caminho de execução opcional descrito
  acima — registrado em `ADR-0015` e `ADR-0016`.
```

por:

```markdown
  continuam no repositório, agora como o caminho de execução opcional descrito
  acima.
```

(d) Troque:

```markdown
  novo; o comando `living-docs` em si não muda. Registrado em `ADR-0014`.
```

por:

```markdown
  novo; o comando `living-docs` em si não muda.
```

(e) Troque:

```markdown
- As mensagens de `CI-7` sobre um vínculo de `watches` quebrado passam a citar
  `RN-0008`, a regra que de fato governa o vínculo código→doc.
```

por:

```markdown
- As mensagens de `CI-7` sobre um vínculo de `watches` quebrado passam a apontar
  a regra que de fato governa o vínculo código→doc: caminho vigiado e documento
  dono viajam no mesmo commit.
```

`TDR-nnnn` (por volta da linha 63) não é citação — `nnnn` não casa com o padrão — e fica.

- [ ] **Step 4: Depreciações**

Em `docs/deprecations.md`, troque `last-reviewed: 2026-08-26` por `last-reviewed: 2026-09-15` e troque:

```markdown
Uma depreciação registra quatro coisas, sem exceção: a data do anúncio, a
versão ou data de remoção, o substituto, e o link para o guia de migração
(`RN-0015`). Faltando qualquer uma, não é depreciação — é quebra de
compatibilidade, e passa por um ADR.
```

por:

```markdown
Uma depreciação registra quatro coisas, sem exceção: a data do anúncio, a
versão ou data de remoção, o substituto, e o link para o guia de migração.
Faltando qualquer uma, não é depreciação — é quebra de compatibilidade, e passa
por um ADR.
```

- [ ] **Step 5: Verificar que não sobrou nada**

Run: `grep -nE "\b(ADR|DA|TDR|RF|RNF|RN|REL)-[0-9]{3,4}\b" README.md CHANGELOG.md docs/deprecations.md; ls docs/migrations docs/releases`
Expected: o `grep` não imprime nada; os dois diretórios só têm `.gitkeep`.

- [ ] **Step 6: Formatar e verificar**

Run: `npx prettier --write README.md CHANGELOG.md docs/deprecations.md && npm test && node src/cli/index.ts validate`
Expected: tudo passa, incluindo `RN-0013` e `RN-0015` em `test/docs/release-history.test.ts`.

- [ ] **Step 7: Commit**

```bash
git add README.md CHANGELOG.md docs/deprecations.md
git commit -F - <<'EOF'
docs(RN-0030): README, CHANGELOG e depreciações dizem em texto corrido o que citavam por ID

Cada ocorrência passa a dizer o que o item diz, sem apontá-lo. Todas as
entradas reescritas do CHANGELOG estão em Unreleased: nenhuma seção de
versão publicada muda.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Task 7: Este repositório marca os próprios documentos externos (`M-14`) e verificação final

**Files:**
- Modify: `docs/.ownership.yml` (artefato `REL`; entradas `CHANGELOG.md`, `docs/deprecations.md`, `docs/migrations/`, `README.md`; comentário de `documents:`)
- Modify: `test/docs/release-history.test.ts` (acrescentar ao fim)

**Interfaces:**
- Consumes: tudo das Tasks 2–6. `config` já é `loadOwnership(ROOT)` no topo de `test/docs/release-history.test.ts`.
- Produces: `CI-11` ligado sobre este repositório.

- [ ] **Step 1: Escrever o teste que falha**

Acrescente ao fim de `test/docs/release-history.test.ts`:

```ts
test('RN-0030: este repositório marca como externo o que escreve para quem vem de fora', () => {
  for (const path of ['README.md', 'CHANGELOG.md', 'docs/deprecations.md', 'docs/migrations/']) {
    assert.equal(config.documents.find(document => document.path === path)?.audience, 'external', `${path} deveria estar marcado`)
  }
  assert.equal(config.artifacts.find(artifact => artifact.idPrefix === 'REL')?.audience, 'external')

  // docs/contracts/ fica de fora: cita as próprias fontes, e marcá-lo é decisão própria.
  for (const path of ['docs/contracts/errors.md', 'docs/contracts/versioning-policy.md']) {
    assert.equal(config.documents.find(document => document.path === path)?.audience, 'internal', `${path} não é marcado por esta entrega`)
  }
})
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `node --test test/docs/release-history.test.ts`
Expected: FAIL: `README.md deveria estar marcado`.

- [ ] **Step 3: Marcar**

Em `docs/.ownership.yml`:

No artefato `REL`, logo depois de `    skill: release-historian`:

```yaml
    # Lida por quem consome: CI-11 cobra que ela não cite ID de artefato (ADR-0017).
    audience: external
```

No comentário acima de `documents:`, depois da linha `# CI-4 cobra a revisão e CI-7 cobra o dono; CI-1, CI-2 e HK-1 não leem daqui.`:

```yaml
# `audience: external` marca o que é escrito para quem lê de fora; CI-11 cobra
# que esse texto não cite ID de artefato (ADR-0017).
```

Nas entradas `CHANGELOG.md`, `docs/deprecations.md` e `docs/migrations/` (as três com `skill: release-historian`) e na entrada `README.md` (a última de `documents:`), acrescente como última chave da entrada:

```yaml
    audience: external
```

- [ ] **Step 4: Rodar e ver passar**

Run: `node --test test/docs/release-history.test.ts && node src/cli/index.ts validate`
Expected: PASS; `nenhuma violação encontrada`. Se `CI-11` acusar alguma linha, a Task 6 deixou passar uma ocorrência: reescreva a prosa, **nunca** tire a marca.

- [ ] **Step 5: Provar que o check está ligado (e desfazer)**

Run (tool Bash): `printf '\nVeja RN-0030.\n' >> README.md; node src/cli/index.ts validate; echo "exit=$?"; git checkout -- README.md`
Expected: um achado `CI-11` em `README.md` na última linha, nomeando `RN-0030`, e `exit=` diferente de 0. Depois do `checkout`, `git diff README.md` vazio.

- [ ] **Step 6: Commit**

```bash
git add docs/.ownership.yml test/docs/release-history.test.ts
git commit -F - <<'EOF'
chore(RN-0030): marca README, CHANGELOG, depreciações, migrações e release notes como externos

É a última mudança da fronteira de leitor: marcar antes de reescrever a prosa
reprovaria o próprio validate. CI-11 passa a valer sobre este repositório.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

- [ ] **Step 7: Verificação final (spec §4)**

Run:

```bash
npm test
npm run typecheck
npm run lint:check
node src/cli/index.ts validate
node src/cli/index.ts validate --base master
node src/cli/index.ts drift
node src/cli/index.ts changelog --base master
```

Expected: todos com código de saída 0. `validate --base master` não acusa `CI-7` (cada caminho vigiado viajou com o doc dono ou com `Docs: none — <razão>`) nem `CI-9` (o commit que tocou `ADR-0017`, `rules.md` e `functional.md` cita IDs declarados neles). `changelog --base master` encontra as entradas em `## [Unreleased]`. Se algum falhar, pare e diagnostique (superpowers:systematic-debugging); não emende commit já feito sem necessidade.

---

## Cobertura da spec

| Mudança da spec | Task |
| --- | --- |
| `M-1` ADR-0017 | 1 |
| `M-2` RN-0030 | 1 |
| `M-3` RF-0015 | 1 |
| `M-4` termo (nasce `active`, desvio 1) | 1 |
| `M-5` parser | 2 |
| `M-6` CI-11 | 3 |
| `M-7` catálogo, `checks.gen.md` (3), `versioning-policy.md` (2) | 2, 3 |
| `M-8` testes do parser (2) e do check, casos 1–9 e mais um (3) | 2, 3 |
| `M-9` init | 4 |
| `M-10` skill e template de migração | 5 |
| `M-11` `CLAUDE.md` e `templates/agent-contract.md` | 5 |
| `M-12` prosa | 6 |
| `M-13` CHANGELOG, por commit (desvio 2) | 2, 3, 4, 5 |
| `M-14` marcação | 7 |
| §4 verificação final | 7 |
