# Living Documentation Toolkit — Núcleo (Fases 0–1) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir o núcleo do toolkit de documentação viva — o contrato de máquina (frontmatter + `.ownership.yml`), os checks `CI-1`/`CI-2`, o bootstrap `SK-0`, a skill `SK-3` com seus comandos, e os hooks `HK-1`/`HK-3` — como um pacote Node.js que é simultaneamente CLI e plugin do Claude Code, desenvolvido e executado inteiramente dentro de um container Docker.

**Architecture:** Um único pacote Node 24 em TypeScript **sem build step** — o Node 24 apaga os tipos nativamente, então `src/**/*.ts` executa direto, o que dá aos hooks um startup de ~150 ms. Uma engine de validação compartilhada (`src/config`, `src/frontmatter`, `src/docs`, `src/ids`) é consumida por dois front-ends: o CLI (`src/cli/`, usado no CI, onde não há agente) e os hooks (`src/hooks/`, usados pelo agente). Nenhuma regra é escrita duas vezes — é o corolário 4 da spec ("todo check de CI espelha uma regra escrita numa skill") aplicado ao próprio código. O host não executa Node: um container long-running (`living-docs-toolkit`) mantém o repositório montado em `/app`, e wrappers `bash` finos fazem `docker exec` para dentro dele.

**Tech Stack:** Node 24 (type-stripping nativo, `node:test`, `node:assert/strict`), TypeScript 5.9 em modo `erasableSyntaxOnly` apenas como type-checker, `yaml` (parse de frontmatter e config), `picomatch` (globs de `watches`/`cited-by`), Docker + Docker Compose (único runtime; nada de `node`/`npm`/`npx` no host).

**Spec:** `LIVING-DOCUMENTATION-TOOLKIT.md` (contexto conceitual em `LIVING-DOCUMENTATION.md`)

## Global Constraints

Estas valem para **toda** task; os requisitos de cada task as incluem implicitamente.

- **Nenhum comando `node`, `npm`, `npx` ou binário de toolchain roda no host.** Todo comando deste plano é `docker compose ...`. Se um passo parece exigir Node no host, ele está errado — o caminho é `docker compose exec toolkit <comando>`.
- **Sem build step.** Nada de `dist/`, nada de `tsc` emitindo. `tsc --noEmit` é type-checker apenas. TypeScript restrito a sintaxe apagável (`erasableSyntaxOnly`): **sem `enum`, sem `namespace`, sem decorators, sem `parameter properties`**. Use `const` objects + union types no lugar de `enum`.
- **Imports carregam a extensão `.ts`** (`import { x } from './y.ts'`) — exigência do loader do Node.
- **Requisitos não funcionais dos hooks** (spec §7): timeout ≤ 5 s, **falha aberta** (qualquer erro → sai 0 e deixa passar), **zero rede**, e toda mensagem de bloqueio nomeia *a regra de origem, o artefato dono e o caminho válido* para fazer o que se queria.
- **Hook nunca julga** (spec §1, corolário 1). Se um hook precisaria decidir algo semântico, ele vira `additionalContext`, nunca `deny`.
- **Idioma** (spec §11): identificadores, nomes de arquivo, chaves de YAML/JSON e IDs em inglês/neutro; prosa dos documentos e mensagens ao usuário em **pt-BR**, com acentuação correta.
- **Mensagem de commit que altera artefato cita o ID afetado.**
- **IDs nunca são reciclados** (spec §2). IDs retirados vão para `docs/ids-retired.txt`.
- **Um artefato, um dono** (spec §1, corolário 3).
- **Escopo travado nas Fases 0–1** (spec §10): `docs/.ownership.yml`, frontmatter padrão, `CI-1`, `CI-2`, CODEOWNERS, `SK-0`, `SK-3`, `HK-1`, `HK-3`, `CM-1`–`CM-3`, `CM-6`. **Fora deste plano:** `SK-1`, `SK-2`, `SK-4`–`SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-4`–`HK-7`, `CI-3`–`CI-8`, `CM-4`, `CM-5`, `CM-7`. Não implemente nada dessa segunda lista, nem "só o esqueleto".

---

## Estrutura de arquivos

Cada arquivo tem uma responsabilidade. A divisão segue a fronteira "regra semântica vs. mecânica": `src/docs/` e `src/checks/` sabem o que um artefato **é**; `src/cli/` e `src/hooks/` só traduzem entre isso e um front-end.

```
Dockerfile                          # imagem única de dev/test/CI (Task 1)
compose.yaml                        # serviço long-running `toolkit` (Task 1)
package.json  tsconfig.json         # Task 1
.dockerignore  .gitignore           # Task 1

bin/living-docs                     # wrapper bash: host → docker exec → CLI (Task 7)

src/core/types.ts                   # Finding, Severity, Check, CheckContext (Task 5)
src/frontmatter/parse.ts            # bloco YAML → { data, lines, endLine, body } (Task 2)
src/config/ownership.ts             # .ownership.yml → OwnershipConfig tipado (Task 3)
src/docs/schema.ts                  # máquina de estados, campos obrigatórios, cadência (Task 4)
src/docs/table.ts                   # itens de artefato em tabela (Open Decisions) (Task 4)
src/docs/collect.ts                 # config + FS → ArtifactDoc[] (Task 4)
src/checks/ci1-structure.ts         # CI-1 structure lint (Task 5)
src/checks/ci2-ids.ts               # CI-2 ID lint (Task 6)
src/checks/registry.ts              # lista ordenada de checks (Task 6)
src/ids/citations.ts                # regex de citação, IDs retirados (Task 6)
src/cli/index.ts                    # dispatch de subcomando (Task 7)
src/cli/validate.ts                 # roda checks, formata, define exit code (Task 7)
src/cli/init.ts                     # SK-0: bootstrap idempotente (Task 8)
src/cli/report.ts                   # formatação de Finding → texto (Task 7)
src/hooks/lib/io.ts                 # stdin/stdout do protocolo de hook, fail-open (Task 9)
src/hooks/lib/paths.ts              # caminho do host → caminho no repo (Task 9)
src/hooks/lib/edit.ts               # projeta tool_input sobre o arquivo; diffa campos (Task 9)
src/hooks/hk1-append-only.ts        # HK-1 (Task 10)
src/hooks/hk3-state-promotion.ts    # HK-3 (Task 11)

templates/ownership.yml             # semente do .ownership.yml (Task 8)
templates/adr.md  templates/tdr.md  # (Task 8)
templates/open-decisions.md         # (Task 8)
templates/CODEOWNERS                # (Task 8)

plugin/.claude-plugin/plugin.json   # manifesto do plugin (Task 12)
plugin/hooks/hooks.json             # registro de HK-1/HK-3 (Task 12)
plugin/hooks/run-hook.sh            # wrapper bash fail-open (Task 12)
plugin/skills/decision-recorder/SKILL.md   # SK-3 (Task 13)
plugin/commands/adr.md              # CM-1 (Task 13)
plugin/commands/open-decision.md    # CM-2 (Task 13)
plugin/commands/debt.md             # CM-3 (Task 13)
plugin/commands/docs-setup.md       # CM-6 (Task 13)

test/helpers/tmp.ts                 # repositório temporário para testes (Task 3)
test/**/**.test.ts                  # espelha src/
.github/workflows/living-docs.yml   # CI rodando na mesma imagem (Task 14)
docs/.ownership.yml  CODEOWNERS     # dogfooding: o toolkit obedece a si mesmo (Task 14)
```

---

### Task 1: Ambiente Docker e esqueleto do pacote

Nada roda sem isto, e o resto do plano assume que `docker compose exec toolkit npm test` funciona. O container é **long-running** (`sleep infinity`) de propósito: os hooks das Tasks 10–12 dependem de `docker exec`, que responde em ~160 ms, enquanto `docker compose run` pagaria o custo de criar um container a cada invocação.

**Files:**
- Create: `Dockerfile`
- Create: `compose.yaml`
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.dockerignore`
- Create: `.gitignore`
- Test: `test/smoke.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: o comando `docker compose exec toolkit npm test` (usado por toda task seguinte) e `docker compose exec toolkit npm run typecheck`. Container chamado `living-docs-toolkit`, repositório montado em `/app`, `node_modules` em volume nomeado.

- [ ] **Step 1: Criar o Dockerfile**

`node_modules` fica num volume nomeado (o host não tem Node e não deve ver essa pasta). O `mkdir`+`chown` antes do `USER node` é o que faz o volume nomeado nascer com o dono certo — sem isso, o `npm install` do Step 4 falha com `EACCES`.

```dockerfile
FROM node:24-alpine

RUN apk add --no-cache git bash

WORKDIR /app
RUN mkdir -p /app/node_modules && chown -R node:node /app

USER node
ENV LIVING_DOCS_ROOT=/app
CMD ["sleep", "infinity"]
```

- [ ] **Step 2: Criar o compose.yaml**

```yaml
services:
  toolkit:
    build: .
    container_name: living-docs-toolkit
    working_dir: /app
    user: node
    init: true
    volumes:
      - .:/app
      - node_modules:/app/node_modules
    environment:
      LIVING_DOCS_ROOT: /app
    command: ["sleep", "infinity"]

volumes:
  node_modules:
```

- [ ] **Step 3: Criar package.json, tsconfig.json e os ignores**

`"type": "module"` e as extensões `.ts` nos imports são obrigatórios para o loader do Node 24. `erasableSyntaxOnly` é o que garante em tempo de type-check que não escapou um `enum` (que o Node se recusaria a executar).

`package.json`:
```json
{
  "name": "living-docs-toolkit",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": { "node": ">=24" },
  "bin": { "living-docs": "./src/cli/index.ts" },
  "scripts": {
    "test": "node --test 'test/**/*.test.ts'",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "picomatch": "^4.0.2",
    "yaml": "^2.6.0"
  },
  "devDependencies": {
    "@types/node": "^24.0.0",
    "@types/picomatch": "^3.0.1",
    "typescript": "^5.9.0"
  }
}
```

`tsconfig.json`:
```json
{
  "compilerOptions": {
    "target": "ES2023",
    "lib": ["ES2023"],
    "module": "nodenext",
    "moduleResolution": "nodenext",
    "allowImportingTsExtensions": true,
    "noEmit": true,
    "erasableSyntaxOnly": true,
    "verbatimModuleSyntax": true,
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "types": ["node"]
  },
  "include": ["src/**/*.ts", "test/**/*.ts"]
}
```

`.dockerignore`:
```
node_modules
.git
```

`.gitignore`:
```
node_modules/
```

- [ ] **Step 4: Subir o container e instalar as dependências**

```bash
docker compose up -d --build
docker compose exec toolkit npm install
```

Esperado: container `living-docs-toolkit` em estado `running` (confirme com `docker compose ps`) e `package-lock.json` criado na raiz do repositório.

- [ ] **Step 5: Escrever o teste smoke**

Ele existe para provar que o pipeline `docker compose exec → node --test → arquivo .ts com tipos` fecha ponta a ponta. É o único teste do plano que não testa uma regra da spec.

`test/smoke.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';

test('o runtime executa TypeScript sem build step', () => {
  const value: { ok: boolean } = { ok: true };
  assert.equal(value.ok, true);
});

test('o repositório está montado em /app', () => {
  assert.equal(process.env.LIVING_DOCS_ROOT, '/app');
});
```

- [ ] **Step 6: Rodar os testes e o type-check**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```
Esperado: `pass 2`, `fail 0`; type-check sem saída (sucesso).

- [ ] **Step 7: Commit**

```bash
git add Dockerfile compose.yaml package.json package-lock.json tsconfig.json .dockerignore .gitignore test/smoke.test.ts
git commit -m "chore: ambiente Docker e esqueleto do pacote Node sem build step"
```

---

### Task 2: Parser de frontmatter

É a peça central da spec §2: sem ela, todo hook e todo check viraria um parser ad hoc. Precisa devolver **o número de linha de cada campo**, porque a spec §9 exige que a saída dos checks nomeie arquivo e linha.

**Files:**
- Create: `src/frontmatter/parse.ts`
- Test: `test/frontmatter/parse.test.ts`

**Interfaces:**
- Consumes: nada além de `yaml`.
- Produces:
  - `interface Frontmatter { data: Record<string, unknown>; lines: Record<string, number>; endLine: number; body: string; bodyStartLine: number; }`
  - `function parseFrontmatter(source: string): Frontmatter | null` — `null` quando não há bloco de frontmatter válido.
  - `class FrontmatterSyntaxError extends Error { readonly line: number }` — lançada quando o bloco existe mas o YAML é inválido.
  - `lines` mapeia **chave de topo → linha 1-indexed** no arquivo inteiro (não no bloco).

- [ ] **Step 1: Escrever o teste falhando**

`test/frontmatter/parse.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseFrontmatter, FrontmatterSyntaxError } from '../../src/frontmatter/parse.ts';

const DOC = [
  '---',
  'id: ADR-0042',
  'title: Fila de eventos',
  'status: accepted',
  'relates-to: [RN-014, DA-0007]',
  '---',
  '',
  '## Contexto',
  'texto',
  '',
].join('\n');

test('extrai os dados do bloco YAML', () => {
  const fm = parseFrontmatter(DOC);
  assert.ok(fm);
  assert.equal(fm.data.id, 'ADR-0042');
  assert.equal(fm.data.status, 'accepted');
  assert.deepEqual(fm.data['relates-to'], ['RN-014', 'DA-0007']);
});

test('mapeia cada chave de topo para sua linha 1-indexed no arquivo', () => {
  const fm = parseFrontmatter(DOC);
  assert.ok(fm);
  assert.equal(fm.lines.id, 2);
  assert.equal(fm.lines.status, 4);
  assert.equal(fm.lines['relates-to'], 5);
});

test('marca o fim do bloco e devolve o corpo separado', () => {
  const fm = parseFrontmatter(DOC);
  assert.ok(fm);
  assert.equal(fm.endLine, 6);
  assert.equal(fm.bodyStartLine, 7);
  assert.match(fm.body, /## Contexto/);
  assert.doesNotMatch(fm.body, /ADR-0042/);
});

test('devolve null quando o arquivo não abre com ---', () => {
  assert.equal(parseFrontmatter('# Só um título\n'), null);
});

test('devolve null quando o bloco nunca fecha', () => {
  assert.equal(parseFrontmatter('---\nid: ADR-1\nsem fechamento\n'), null);
});

test('aceita CRLF e BOM', () => {
  const fm = parseFrontmatter('﻿---\r\nid: ADR-1\r\n---\r\ncorpo\r\n');
  assert.ok(fm);
  assert.equal(fm.data.id, 'ADR-1');
  assert.equal(fm.lines.id, 2);
});

test('lança FrontmatterSyntaxError com a linha quando o YAML é inválido', () => {
  const bad = '---\nid: ADR-1\n  : inválido\n---\ncorpo\n';
  assert.throws(
    () => parseFrontmatter(bad),
    (err: unknown) => err instanceof FrontmatterSyntaxError && err.line >= 1,
  );
});

test('bloco vazio produz data vazio, não erro', () => {
  const fm = parseFrontmatter('---\n---\ncorpo\n');
  assert.ok(fm);
  assert.deepEqual(fm.data, {});
  assert.equal(fm.endLine, 2);
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
docker compose exec toolkit npm test
```
Esperado: FAIL — `Cannot find module '/app/src/frontmatter/parse.ts'`.

- [ ] **Step 3: Implementar**

`src/frontmatter/parse.ts`:
```typescript
import YAML from 'yaml';

export interface Frontmatter {
  /** Chaves de topo do bloco YAML, já parseadas. */
  data: Record<string, unknown>;
  /** Chave de topo → linha 1-indexed no arquivo inteiro. */
  lines: Record<string, number>;
  /** Linha 1-indexed do `---` que fecha o bloco. */
  endLine: number;
  /** Tudo depois do bloco, sem o separador. */
  body: string;
  /** Linha 1-indexed onde o corpo começa. */
  bodyStartLine: number;
}

export class FrontmatterSyntaxError extends Error {
  readonly line: number;

  constructor(message: string, line: number) {
    super(message);
    this.name = 'FrontmatterSyntaxError';
    this.line = line;
  }
}

const DELIMITER = /^---\s*$/;
const TOP_LEVEL_KEY = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:/;

export function parseFrontmatter(source: string): Frontmatter | null {
  const text = source.replace(/^﻿/, '').replace(/\r\n/g, '\n');
  const lines = text.split('\n');

  if (lines.length === 0 || !DELIMITER.test(lines[0] ?? '')) return null;

  let endIndex = -1;
  for (let i = 1; i < lines.length; i++) {
    if (DELIMITER.test(lines[i] ?? '')) {
      endIndex = i;
      break;
    }
  }
  if (endIndex === -1) return null;

  const block = lines.slice(1, endIndex).join('\n');

  let data: Record<string, unknown>;
  try {
    data = (YAML.parse(block) ?? {}) as Record<string, unknown>;
  } catch (err) {
    const at = err instanceof YAML.YAMLParseError ? err.linePos?.[0]?.line ?? 1 : 1;
    throw new FrontmatterSyntaxError(
      err instanceof Error ? err.message : 'YAML inválido',
      at + 1, // +1 porque o bloco começa na linha 2 do arquivo
    );
  }

  const keyLines: Record<string, number> = {};
  for (let i = 1; i < endIndex; i++) {
    const match = TOP_LEVEL_KEY.exec(lines[i] ?? '');
    if (match?.[1] !== undefined && keyLines[match[1]] === undefined) {
      keyLines[match[1]] = i + 1;
    }
  }

  return {
    data,
    lines: keyLines,
    endLine: endIndex + 1,
    body: lines.slice(endIndex + 1).join('\n'),
    bodyStartLine: endIndex + 2,
  };
}
```

- [ ] **Step 4: Rodar o teste para ver passar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```
Esperado: `pass 10`, `fail 0`; type-check limpo.

- [ ] **Step 5: Commit**

```bash
git add src/frontmatter/parse.ts test/frontmatter/parse.test.ts
git commit -m "feat: parser de frontmatter com rastreio de linha por campo"
```

---

### Task 3: Loader do `docs/.ownership.yml`

É "o ponto de extensão único" da spec §3: hooks e checks não conhecem caminho nenhum, leem daqui. O loader normaliza as chaves kebab-case do YAML para camelCase do TypeScript e **valida na entrada** — um `.ownership.yml` inválido deve produzir um erro que nomeia o campo, não um `undefined` que estoura três módulos adiante.

O campo `states:` é uma extensão deliberada sobre o exemplo da spec: ele permite que um projeto declare a máquina de estados de um prefixo que o toolkit ainda não conhece (as fases 2+ adicionam `RN`, `RF`, `RNF`) sem alterar código.

**Files:**
- Create: `src/config/ownership.ts`
- Create: `test/helpers/tmp.ts`
- Test: `test/config/ownership.test.ts`

**Interfaces:**
- Consumes: nada dos módulos anteriores.
- Produces:
  - `type Collection = 'per-file' | 'table'`
  - `interface ArtifactRule { idPrefix: string; path: string; owner: string; skill: string; appendOnly: boolean; mutableFields: string[]; citedBy: string[]; collection: Collection; states: string[] | null }`
  - `interface GeneratedRule { path: string; command: string }`
  - `interface WatchRule { code: string; doc: string; reason: string | null; consumerVisible: boolean }`
  - `interface OwnershipConfig { version: number; staleAfterMonths: number; artifacts: ArtifactRule[]; generated: GeneratedRule[]; watches: WatchRule[]; consumerVisiblePaths: string[] }`
  - `function parseOwnership(source: string): OwnershipConfig`
  - `function loadOwnership(root: string): OwnershipConfig`
  - `function findArtifactRule(config: OwnershipConfig, repoPath: string): ArtifactRule | null` — casa um caminho relativo ao repo com a regra dona; usado por `HK-1`/`HK-3`.
  - `class OwnershipError extends Error`
  - `const OWNERSHIP_PATH = 'docs/.ownership.yml'`
- Produces também: `withTempRepo(files, fn)` em `test/helpers/tmp.ts`, usado por todas as tasks seguintes que tocam o filesystem.

- [ ] **Step 1: Escrever o helper de repositório temporário**

Não é código de produção e por isso não tem teste próprio; as tasks seguintes o exercitam.

`test/helpers/tmp.ts`:
```typescript
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';

/** Cria um repositório descartável com os arquivos dados e o remove ao final. */
export function withTempRepo(files: Record<string, string>, fn: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'living-docs-'));
  try {
    for (const [relative, content] of Object.entries(files)) {
      const absolute = join(root, relative);
      mkdirSync(dirname(absolute), { recursive: true });
      writeFileSync(absolute, content, 'utf8');
    }
    fn(root);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
}
```

- [ ] **Step 2: Escrever o teste falhando**

`test/config/ownership.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  parseOwnership,
  loadOwnership,
  findArtifactRule,
  OwnershipError,
  OWNERSHIP_PATH,
} from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const VALID = `
version: 1
stale-after-months: 6

artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team-platform"
    skill: decision-recorder
    append-only: true
    mutable-fields: [status, superseded-by, last-reviewed]
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table

generated:
  - path: docs/contracts/openapi.gen.yaml
    command: npm run gen:openapi

watches:
  - code: "src/domain/**"
    doc: "docs/requirements/"
    reason: "comportamento novo exige regra com ID antes do código"
  - code: "src/**"
    doc: "CHANGELOG.md"
    consumer-visible: true

consumer-visible-paths: ["src/api/**"]
`;

test('normaliza kebab-case do YAML para camelCase tipado', () => {
  const config = parseOwnership(VALID);
  assert.equal(config.version, 1);
  assert.equal(config.staleAfterMonths, 6);
  assert.equal(config.artifacts.length, 2);

  const adr = config.artifacts[0];
  assert.ok(adr);
  assert.equal(adr.idPrefix, 'ADR');
  assert.equal(adr.path, 'docs/decisions/adr/');
  assert.equal(adr.owner, '@team-platform');
  assert.equal(adr.appendOnly, true);
  assert.deepEqual(adr.mutableFields, ['status', 'superseded-by', 'last-reviewed']);
  assert.equal(adr.collection, 'per-file');
  assert.equal(adr.states, null);
});

test('aplica os defaults de collection, append-only e cited-by', () => {
  const config = parseOwnership(VALID);
  const da = config.artifacts[1];
  assert.ok(da);
  assert.equal(da.collection, 'table');
  assert.equal(da.appendOnly, false);
  assert.deepEqual(da.mutableFields, []);
  assert.deepEqual(da.citedBy, []);
});

test('lê watches e consumer-visible-paths', () => {
  const config = parseOwnership(VALID);
  assert.equal(config.watches.length, 2);
  assert.equal(config.watches[0]?.reason, 'comportamento novo exige regra com ID antes do código');
  assert.equal(config.watches[0]?.consumerVisible, false);
  assert.equal(config.watches[1]?.consumerVisible, true);
  assert.deepEqual(config.consumerVisiblePaths, ['src/api/**']);
  assert.equal(config.generated[0]?.command, 'npm run gen:openapi');
});

test('rejeita version diferente de 1 nomeando o campo', () => {
  assert.throws(
    () => parseOwnership('version: 2\nartifacts: []\n'),
    (err: unknown) => err instanceof OwnershipError && /version/.test(err.message),
  );
});

test('rejeita artifacts vazio', () => {
  assert.throws(
    () => parseOwnership('version: 1\nartifacts: []\n'),
    (err: unknown) => err instanceof OwnershipError && /artifacts/.test(err.message),
  );
});

test('rejeita id-prefix fora do formato', () => {
  const bad = 'version: 1\nartifacts:\n  - id-prefix: adr\n    path: docs/a/\n    owner: "@x"\n    skill: s\n';
  assert.throws(
    () => parseOwnership(bad),
    (err: unknown) => err instanceof OwnershipError && /id-prefix/.test(err.message),
  );
});

test('rejeita id-prefix duplicado — um artefato, um dono', () => {
  const dup = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/a/
    owner: "@x"
    skill: s
  - id-prefix: ADR
    path: docs/b/
    owner: "@y"
    skill: s
`;
  assert.throws(
    () => parseOwnership(dup),
    (err: unknown) => err instanceof OwnershipError && /ADR/.test(err.message),
  );
});

test('rejeita owner que não começa com @', () => {
  const bad = 'version: 1\nartifacts:\n  - id-prefix: ADR\n    path: docs/a/\n    owner: platform\n    skill: s\n';
  assert.throws(
    () => parseOwnership(bad),
    (err: unknown) => err instanceof OwnershipError && /owner/.test(err.message),
  );
});

test('aceita states declarado pelo projeto', () => {
  const src = 'version: 1\nartifacts:\n  - id-prefix: RN\n    path: docs/requirements/\n    owner: "@product"\n    skill: requirements-keeper\n    states: [draft, active, revoked]\n';
  assert.deepEqual(parseOwnership(src).artifacts[0]?.states, ['draft', 'active', 'revoked']);
});

test('loadOwnership lê do disco e erra com caminho quando ausente', () => {
  withTempRepo({ [OWNERSHIP_PATH]: VALID }, (root) => {
    assert.equal(loadOwnership(root).artifacts.length, 2);
  });
  withTempRepo({ 'README.md': '' }, (root) => {
    assert.throws(
      () => loadOwnership(root),
      (err: unknown) => err instanceof OwnershipError && err.message.includes(OWNERSHIP_PATH),
    );
  });
});

test('findArtifactRule casa arquivo dentro de diretório e arquivo exato', () => {
  const config = parseOwnership(VALID);
  assert.equal(findArtifactRule(config, 'docs/decisions/adr/ADR-0001-x.md')?.idPrefix, 'ADR');
  assert.equal(findArtifactRule(config, 'docs/open-decisions.md')?.idPrefix, 'DA');
  assert.equal(findArtifactRule(config, 'src/index.ts'), null);
});
```

- [ ] **Step 3: Rodar o teste para ver falhar**

```bash
docker compose exec toolkit npm test
```
Esperado: FAIL — `Cannot find module '/app/src/config/ownership.ts'`.

- [ ] **Step 4: Implementar**

`src/config/ownership.ts`:
```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import YAML from 'yaml';

export const OWNERSHIP_PATH = 'docs/.ownership.yml';

export type Collection = 'per-file' | 'table';

export interface ArtifactRule {
  idPrefix: string;
  path: string;
  owner: string;
  skill: string;
  appendOnly: boolean;
  mutableFields: string[];
  citedBy: string[];
  collection: Collection;
  /** Máquina de estados declarada pelo projeto; null usa a embutida em src/docs/schema.ts. */
  states: string[] | null;
}

export interface GeneratedRule {
  path: string;
  command: string;
}

export interface WatchRule {
  code: string;
  doc: string;
  reason: string | null;
  consumerVisible: boolean;
}

export interface OwnershipConfig {
  version: number;
  staleAfterMonths: number;
  artifacts: ArtifactRule[];
  generated: GeneratedRule[];
  watches: WatchRule[];
  consumerVisiblePaths: string[];
}

export class OwnershipError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'OwnershipError';
  }
}

const ID_PREFIX = /^[A-Z]{2,4}$/;

function asRecord(value: unknown, where: string): Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where} precisa ser um mapa.`);
  }
  return value as Record<string, unknown>;
}

function asStringList(value: unknown, where: string): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where} precisa ser uma lista de strings.`);
  }
  return value as string[];
}

function requireString(source: Record<string, unknown>, key: string, where: string): string {
  const value = source[key];
  if (typeof value !== 'string' || value.trim() === '') {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where} precisa do campo \`${key}\` não vazio.`);
  }
  return value;
}

function parseArtifact(raw: unknown, index: number): ArtifactRule {
  const where = `artifacts[${index}]`;
  const item = asRecord(raw, where);

  const idPrefix = requireString(item, 'id-prefix', where);
  if (!ID_PREFIX.test(idPrefix)) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: ${where}.id-prefix "${idPrefix}" precisa ser 2 a 4 letras maiúsculas (ex.: ADR, DA, TDR).`,
    );
  }

  const owner = requireString(item, 'owner', where);
  if (!owner.startsWith('@')) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: ${where}.owner "${owner}" precisa começar com @ e espelhar o CODEOWNERS.`,
    );
  }

  const collectionRaw = item.collection ?? 'per-file';
  if (collectionRaw !== 'per-file' && collectionRaw !== 'table') {
    throw new OwnershipError(`${OWNERSHIP_PATH}: ${where}.collection precisa ser "per-file" ou "table".`);
  }

  const states = item.states === undefined ? null : asStringList(item.states, `${where}.states`);

  return {
    idPrefix,
    path: requireString(item, 'path', where),
    owner,
    skill: requireString(item, 'skill', where),
    appendOnly: item['append-only'] === true,
    mutableFields: asStringList(item['mutable-fields'], `${where}.mutable-fields`),
    citedBy: asStringList(item['cited-by'], `${where}.cited-by`),
    collection: collectionRaw,
    states,
  };
}

export function parseOwnership(source: string): OwnershipConfig {
  let raw: unknown;
  try {
    raw = YAML.parse(source);
  } catch (err) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: YAML inválido — ${err instanceof Error ? err.message : String(err)}`,
    );
  }

  const root = asRecord(raw, 'raiz');

  if (root.version !== 1) {
    throw new OwnershipError(`${OWNERSHIP_PATH}: campo \`version\` precisa ser 1 (recebido: ${String(root.version)}).`);
  }

  const artifactsRaw = root.artifacts;
  if (!Array.isArray(artifactsRaw) || artifactsRaw.length === 0) {
    throw new OwnershipError(
      `${OWNERSHIP_PATH}: \`artifacts\` precisa listar ao menos um artefato — sem dono declarado nada é enforceável.`,
    );
  }

  const artifacts = artifactsRaw.map(parseArtifact);

  const seen = new Set<string>();
  for (const artifact of artifacts) {
    if (seen.has(artifact.idPrefix)) {
      throw new OwnershipError(
        `${OWNERSHIP_PATH}: id-prefix "${artifact.idPrefix}" declarado duas vezes. Um artefato, um dono.`,
      );
    }
    seen.add(artifact.idPrefix);
  }

  const generatedRaw = Array.isArray(root.generated) ? root.generated : [];
  const generated: GeneratedRule[] = generatedRaw.map((item, index) => {
    const entry = asRecord(item, `generated[${index}]`);
    return {
      path: requireString(entry, 'path', `generated[${index}]`),
      command: requireString(entry, 'command', `generated[${index}]`),
    };
  });

  const watchesRaw = Array.isArray(root.watches) ? root.watches : [];
  const watches: WatchRule[] = watchesRaw.map((item, index) => {
    const entry = asRecord(item, `watches[${index}]`);
    const reason = entry.reason;
    return {
      code: requireString(entry, 'code', `watches[${index}]`),
      doc: requireString(entry, 'doc', `watches[${index}]`),
      reason: typeof reason === 'string' ? reason : null,
      consumerVisible: entry['consumer-visible'] === true,
    };
  });

  const staleAfterMonths = root['stale-after-months'];

  return {
    version: 1,
    staleAfterMonths: typeof staleAfterMonths === 'number' ? staleAfterMonths : 6,
    artifacts,
    generated,
    watches,
    consumerVisiblePaths: asStringList(root['consumer-visible-paths'], 'consumer-visible-paths'),
  };
}

export function loadOwnership(root: string): OwnershipConfig {
  const file = join(root, OWNERSHIP_PATH);
  let source: string;
  try {
    source = readFileSync(file, 'utf8');
  } catch {
    throw new OwnershipError(
      `${OWNERSHIP_PATH} não encontrado em ${root}. Rode \`living-docs init\` (skill dona: living-docs-bootstrap).`,
    );
  }
  return parseOwnership(source);
}

/** Regra dona de um caminho relativo à raiz do repositório, ou null. */
export function findArtifactRule(config: OwnershipConfig, repoPath: string): ArtifactRule | null {
  const normalized = repoPath.replace(/\\/g, '/').replace(/^\.\//, '');
  for (const artifact of config.artifacts) {
    const target = artifact.path.replace(/\\/g, '/');
    if (target.endsWith('/') ? normalized.startsWith(target) : normalized === target) {
      return artifact;
    }
  }
  return null;
}
```

- [ ] **Step 5: Rodar o teste para ver passar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```
Esperado: todos os testes passando; type-check limpo.

- [ ] **Step 6: Commit**

```bash
git add src/config/ownership.ts test/config/ownership.test.ts test/helpers/tmp.ts
git commit -m "feat: loader validado de docs/.ownership.yml"
```

---

### Task 4: Schema de artefato, tabelas de item e coletor

Três arquivos, uma responsabilidade: **o que um artefato de documentação viva é**. `schema.ts` guarda as constantes que a spec fixa (§2 e §4); `table.ts` resolve o caso do artefato "arquivo único com tabela" (§3 — Open Decisions), onde os IDs moram em linhas e não em frontmatter; `collect.ts` transforma config + filesystem na lista que os checks consomem. Ficam juntos porque mudam juntos: adicionar um artefato à spec toca os três.

**Files:**
- Create: `src/docs/schema.ts`
- Create: `src/docs/table.ts`
- Create: `src/docs/collect.ts`
- Test: `test/docs/schema.test.ts`
- Test: `test/docs/table.test.ts`
- Test: `test/docs/collect.test.ts`

**Interfaces:**
- Consumes: `parseFrontmatter`, `Frontmatter`, `FrontmatterSyntaxError` (Task 2); `OwnershipConfig`, `ArtifactRule` (Task 3).
- Produces:
  - `const REQUIRED_FIELDS: readonly string[]` — `['id','title','status','owner','trigger','last-reviewed']`
  - `const CONTAINER_REQUIRED_FIELDS: readonly string[]` — para `collection: 'table'`: `['title','owner','trigger','last-reviewed']`
  - `const MUTABLE_FIELDS_DEFAULT: readonly string[]` — `['status','superseded-by','last-reviewed']`
  - `const STATUS_MACHINE: Readonly<Record<string, readonly string[]>>`
  - `const FROZEN_STATUSES: ReadonlySet<string>`
  - `const HUMAN_PROMOTIONS: readonly { from: string; to: string }[]`
  - `function statesFor(rule: ArtifactRule): readonly string[] | null`
  - `function findCadence(trigger: string): string | null`
  - `function isIsoDate(value: unknown): boolean`
  - `function parseId(value: unknown): { prefix: string; number: number } | null`
  - `interface TableItem { id: string; status: string; line: number }`
  - `function parseItemTable(source: string, startLine: number): TableItem[]`
  - `interface ArtifactDoc { file: string; rule: ArtifactRule; source: string; frontmatter: Frontmatter | null; syntaxError: FrontmatterSyntaxError | null; items: TableItem[] }`
  - `function collectArtifacts(root: string, config: OwnershipConfig): ArtifactDoc[]`

- [ ] **Step 1: Escrever os testes falhando**

`test/docs/schema.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS_MACHINE,
  FROZEN_STATUSES,
  HUMAN_PROMOTIONS,
  REQUIRED_FIELDS,
  statesFor,
  findCadence,
  isIsoDate,
  parseId,
} from '../../src/docs/schema.ts';
import type { ArtifactRule } from '../../src/config/ownership.ts';

function rule(overrides: Partial<ArtifactRule> = {}): ArtifactRule {
  return {
    idPrefix: 'ADR',
    path: 'docs/decisions/adr/',
    owner: '@team',
    skill: 'decision-recorder',
    appendOnly: true,
    mutableFields: ['status', 'superseded-by', 'last-reviewed'],
    citedBy: [],
    collection: 'per-file',
    states: null,
    ...overrides,
  };
}

test('a máquina de estados da spec §4 está codificada', () => {
  assert.deepEqual(STATUS_MACHINE.ADR, ['draft', 'accepted', 'superseded']);
  assert.deepEqual(STATUS_MACHINE.DA, ['open', 'resolved', 'dropped']);
  assert.deepEqual(STATUS_MACHINE.TDR, ['open', 'paid', 'accepted-permanently']);
});

test('os estados congelados incluem os cinco do esqueleto da spec §7', () => {
  for (const status of ['accepted', 'superseded', 'deprecated', 'published', 'paid']) {
    assert.ok(FROZEN_STATUSES.has(status), `${status} deveria ser congelado`);
  }
  assert.equal(FROZEN_STATUSES.has('draft'), false);
  assert.equal(FROZEN_STATUSES.has('open'), false);
});

test('as promoções que exigem ato humano são exatamente draft→accepted e open→resolved', () => {
  assert.deepEqual(HUMAN_PROMOTIONS, [
    { from: 'draft', to: 'accepted' },
    { from: 'open', to: 'resolved' },
  ]);
});

test('REQUIRED_FIELDS reflete o frontmatter da spec §2', () => {
  assert.deepEqual(REQUIRED_FIELDS, ['id', 'title', 'status', 'owner', 'trigger', 'last-reviewed']);
});

test('statesFor prefere o states declarado no .ownership.yml', () => {
  assert.deepEqual(statesFor(rule()), ['draft', 'accepted', 'superseded']);
  assert.deepEqual(statesFor(rule({ states: ['a', 'b'] })), ['a', 'b']);
  assert.equal(statesFor(rule({ idPrefix: 'XX', states: null })), null);
});

test('findCadence reprova o vocabulário de cadência da spec §2', () => {
  const rejeitados = [
    'revisar trimestralmente',
    'Mensal',
    'anualmente',
    'periodicamente',
    'revisar a cada release',
    'quarterly review',
    'toda sprint',
    'a cada 3 meses',
    'every 2 weeks',
  ];
  for (const trigger of rejeitados) {
    assert.ok(findCadence(trigger) !== null, `deveria reprovar: ${trigger}`);
  }
});

test('findCadence aprova gatilhos que nomeiam um evento observável', () => {
  const aceitos = [
    'no mesmo PR que altera `src/domain/billing`',
    'quando um código de erro novo é adicionado',
    'quando um agente errar por falta de contexto',
    'Nunca. Imutável após aceito; uma decisão nova o supersede.',
  ];
  for (const trigger of aceitos) {
    assert.equal(findCadence(trigger), null, `não deveria reprovar: ${trigger}`);
  }
});

test('isIsoDate aceita string ISO e Date, rejeita o resto', () => {
  assert.equal(isIsoDate('2026-08-21'), true);
  assert.equal(isIsoDate(new Date('2026-08-21')), true);
  assert.equal(isIsoDate('21/08/2026'), false);
  assert.equal(isIsoDate('2026-13-01'), false);
  assert.equal(isIsoDate(undefined), false);
});

test('parseId separa prefixo e número', () => {
  assert.deepEqual(parseId('ADR-0042'), { prefix: 'ADR', number: 42 });
  assert.deepEqual(parseId('DA-007'), { prefix: 'DA', number: 7 });
  assert.equal(parseId('adr-1'), null);
  assert.equal(parseId(42), null);
});
```

`test/docs/table.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseItemTable } from '../../src/docs/table.ts';

const BODY = [
  '# Open Decisions',
  '',
  'Lacunas conhecidas que bloqueiam implementação.',
  '',
  '| ID | Lacuna | Status | Resolvida por |',
  '| --- | --- | --- | --- |',
  '| DA-0001 | Como cobrar reembolso parcial | open | — |',
  '| DA-0002 | Fuso do fechamento mensal | resolved | ADR-0007 |',
  '',
  'Outro parágrafo.',
].join('\n');

test('extrai id, status e linha de cada item', () => {
  const items = parseItemTable(BODY, 10);
  assert.equal(items.length, 2);
  assert.deepEqual(items[0], { id: 'DA-0001', status: 'open', line: 16 });
  assert.deepEqual(items[1], { id: 'DA-0002', status: 'resolved', line: 17 });
});

test('para de ler ao fim da tabela', () => {
  const items = parseItemTable(BODY, 1);
  assert.equal(items.length, 2);
});

test('devolve lista vazia quando não há tabela com colunas ID e Status', () => {
  assert.deepEqual(parseItemTable('| Termo | Definição |\n| --- | --- |\n| x | y |\n', 1), []);
  assert.deepEqual(parseItemTable('sem tabela nenhuma', 1), []);
});

test('ignora linhas cuja primeira célula não é um ID', () => {
  const source = '| ID | Status |\n| --- | --- |\n| DA-0001 | open |\n| total | 1 |\n';
  const items = parseItemTable(source, 1);
  assert.equal(items.length, 1);
  assert.equal(items[0]?.id, 'DA-0001');
});
```

`test/docs/collect.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { collectArtifacts } from '../../src/docs/collect.ts';
import { parseOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
`;

const ADR = [
  '---',
  'id: ADR-0001',
  'title: Primeira decisão',
  'status: accepted',
  'owner: "@team"',
  'trigger: Nunca. Imutável após aceito.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '## Contexto',
].join('\n');

const OPEN_DECISIONS = [
  '---',
  'title: Open Decisions',
  'owner: "@product"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '| ID | Lacuna | Status | Resolvida por |',
  '| --- | --- | --- | --- |',
  '| DA-0001 | Reembolso parcial | open | — |',
].join('\n');

test('coleta artefatos por diretório e por arquivo único', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      'docs/decisions/adr/ADR-0001-primeira.md': ADR,
      'docs/open-decisions.md': OPEN_DECISIONS,
      'README.md': '# fora do escopo',
    },
    (root) => {
      const docs = collectArtifacts(root, parseOwnership(CONFIG));
      const files = docs.map((doc) => doc.file).sort();
      assert.deepEqual(files, ['docs/decisions/adr/ADR-0001-primeira.md', 'docs/open-decisions.md']);

      const adr = docs.find((doc) => doc.rule.idPrefix === 'ADR');
      assert.equal(adr?.frontmatter?.data.id, 'ADR-0001');
      assert.deepEqual(adr?.items, []);

      const da = docs.find((doc) => doc.rule.idPrefix === 'DA');
      assert.equal(da?.items.length, 1);
      assert.equal(da?.items[0]?.id, 'DA-0001');
      assert.equal(da?.items[0]?.line, 10);
    },
  );
});

test('ignora artefatos gerados e arquivos não-markdown', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      'docs/decisions/adr/ADR-0001-x.md': ADR,
      'docs/decisions/adr/index.gen.md': '# gerado',
      'docs/decisions/adr/nota.txt': 'nada',
      'docs/open-decisions.md': OPEN_DECISIONS,
    },
    (root) => {
      const files = collectArtifacts(root, parseOwnership(CONFIG)).map((doc) => doc.file);
      assert.equal(files.includes('docs/decisions/adr/index.gen.md'), false);
      assert.equal(files.includes('docs/decisions/adr/nota.txt'), false);
    },
  );
});

test('caminho declarado mas ausente no disco não quebra a coleta', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG }, (root) => {
    assert.deepEqual(collectArtifacts(root, parseOwnership(CONFIG)), []);
  });
});

test('frontmatter inválido vira syntaxError, não exceção', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      'docs/decisions/adr/ADR-0002-quebrado.md': '---\nid: ADR-0002\n  : ruim\n---\ncorpo\n',
    },
    (root) => {
      const docs = collectArtifacts(root, parseOwnership(CONFIG));
      assert.equal(docs.length, 1);
      assert.equal(docs[0]?.frontmatter, null);
      assert.ok(docs[0]?.syntaxError);
    },
  );
});
```

- [ ] **Step 2: Rodar os testes para ver falhar**

```bash
docker compose exec toolkit npm test
```
Esperado: FAIL — módulos `src/docs/*.ts` inexistentes.

- [ ] **Step 3: Implementar `src/docs/schema.ts`**

```typescript
import type { ArtifactRule } from '../config/ownership.ts';

/** Campos obrigatórios de um artefato individual (spec §2). */
export const REQUIRED_FIELDS: readonly string[] = [
  'id',
  'title',
  'status',
  'owner',
  'trigger',
  'last-reviewed',
];

/** Campos obrigatórios do arquivo-container de uma coleção em tabela. */
export const CONTAINER_REQUIRED_FIELDS: readonly string[] = [
  'title',
  'owner',
  'trigger',
  'last-reviewed',
];

/** Allowlist padrão de mutação de item congelado (spec §2 e §7). */
export const MUTABLE_FIELDS_DEFAULT: readonly string[] = ['status', 'superseded-by', 'last-reviewed'];

/** Máquina de estados por prefixo (spec §4). Prefixos das fases 2+ vêm de `states` no .ownership.yml. */
export const STATUS_MACHINE: Readonly<Record<string, readonly string[]>> = Object.freeze({
  ADR: ['draft', 'accepted', 'superseded'],
  DA: ['open', 'resolved', 'dropped'],
  TDR: ['open', 'paid', 'accepted-permanently'],
});

/** "Nenhum estado terminal permite edição do corpo" (spec §4). */
export const FROZEN_STATUSES: ReadonlySet<string> = new Set([
  'accepted',
  'superseded',
  'deprecated',
  'published',
  'paid',
]);

/** "Nenhum agente promove estado sozinho" (spec §4); é o gatilho de HK-3. */
export const HUMAN_PROMOTIONS: readonly { from: string; to: string }[] = Object.freeze([
  { from: 'draft', to: 'accepted' },
  { from: 'open', to: 'resolved' },
]);

export function statesFor(rule: ArtifactRule): readonly string[] | null {
  if (rule.states !== null) return rule.states;
  return STATUS_MACHINE[rule.idPrefix] ?? null;
}

/**
 * Vocabulário de cadência proibido em `trigger` (spec §2 e anti-requisito §13).
 * Um gatilho válido nomeia um evento observável, não uma data de calendário.
 */
const CADENCE_PATTERNS: readonly RegExp[] = [
  /\b(?:tri|bi|se)?mestral(?:mente)?\b/i,
  /\bmensal(?:mente)?\b/i,
  /\bsemanal(?:mente)?\b/i,
  /\bdiariamente\b/i,
  /\banual(?:mente)?\b/i,
  /\bperi[oó]dic[ao](?:mente)?\b/i,
  /\bcad[êe]ncia\b/i,
  /\ba cada\b/i,
  /\bquarterly\b/i,
  /\bmonthly\b/i,
  /\bweekly\b/i,
  /\bdaily\b/i,
  /\bannually\b/i,
  /\bperiodically\b/i,
  /\bevery\s+\w+/i,
  /\bsprint\b/i,
  /\btod[oa]\s+(?:m[êe]s|ano|semana|sprint)\b/i,
];

/** Devolve o trecho que caracteriza cadência, ou null. */
export function findCadence(trigger: string): string | null {
  for (const pattern of CADENCE_PATTERNS) {
    const match = pattern.exec(trigger);
    if (match) return match[0];
  }
  return null;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export function isIsoDate(value: unknown): boolean {
  if (value instanceof Date) return !Number.isNaN(value.getTime());
  if (typeof value !== 'string' || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

const ID = /^([A-Z]{2,4})-(\d{3,4})$/;

export function parseId(value: unknown): { prefix: string; number: number } | null {
  if (typeof value !== 'string') return null;
  const match = ID.exec(value);
  if (!match?.[1] || !match[2]) return null;
  return { prefix: match[1], number: Number.parseInt(match[2], 10) };
}
```

- [ ] **Step 4: Implementar `src/docs/table.ts`**

```typescript
const ID_CELL = /^[A-Z]{2,4}-\d{3,4}$/;

export interface TableItem {
  id: string;
  status: string;
  /** Linha 1-indexed no arquivo inteiro. */
  line: number;
}

function cells(row: string): string[] {
  const trimmed = row.trim();
  if (!trimmed.startsWith('|')) return [];
  return trimmed
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((cell) => cell.trim());
}

function isSeparator(row: string): boolean {
  const parts = cells(row);
  return parts.length > 0 && parts.every((cell) => /^:?-{3,}:?$/.test(cell));
}

/**
 * Itens de um artefato mantido como tabela (spec §3 — Open Decisions).
 * `startLine` é a linha 1-indexed onde `source` começa no arquivo.
 */
export function parseItemTable(source: string, startLine: number): TableItem[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');

  for (let i = 0; i < lines.length; i++) {
    const header = cells(lines[i] ?? '');
    const idColumn = header.findIndex((cell) => cell.toLowerCase() === 'id');
    const statusColumn = header.findIndex((cell) => cell.toLowerCase() === 'status');
    if (idColumn === -1 || statusColumn === -1) continue;
    if (!isSeparator(lines[i + 1] ?? '')) continue;

    const items: TableItem[] = [];
    for (let j = i + 2; j < lines.length; j++) {
      const row = cells(lines[j] ?? '');
      if (row.length === 0) break;
      const id = row[idColumn] ?? '';
      if (!ID_CELL.test(id)) continue;
      items.push({ id, status: row[statusColumn] ?? '', line: startLine + j });
    }
    return items;
  }

  return [];
}
```

- [ ] **Step 5: Implementar `src/docs/collect.ts`**

```typescript
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type { ArtifactRule, OwnershipConfig } from '../config/ownership.ts';
import { parseFrontmatter, FrontmatterSyntaxError } from '../frontmatter/parse.ts';
import type { Frontmatter } from '../frontmatter/parse.ts';
import { parseItemTable } from './table.ts';
import type { TableItem } from './table.ts';

export interface ArtifactDoc {
  /** Caminho relativo à raiz do repositório, sempre com `/`. */
  file: string;
  rule: ArtifactRule;
  source: string;
  frontmatter: Frontmatter | null;
  syntaxError: FrontmatterSyntaxError | null;
  /** Itens da tabela quando `rule.collection === 'table'`; vazio caso contrário. */
  items: TableItem[];
}

function listMarkdown(root: string, relativeDir: string): string[] {
  const absolute = join(root, relativeDir);
  let entries: string[];
  try {
    entries = readdirSync(absolute);
  } catch {
    return [];
  }

  const found: string[] = [];
  for (const entry of entries) {
    const relative = `${relativeDir.replace(/\/$/, '')}/${entry}`;
    if (statSync(join(root, relative)).isDirectory()) {
      found.push(...listMarkdown(root, `${relative}/`));
    } else if (entry.endsWith('.md') && !entry.includes('.gen.')) {
      found.push(relative);
    }
  }
  return found;
}

function readDoc(root: string, file: string, rule: ArtifactRule): ArtifactDoc | null {
  let source: string;
  try {
    source = readFileSync(join(root, file), 'utf8');
  } catch {
    return null;
  }

  let frontmatter: Frontmatter | null = null;
  let syntaxError: FrontmatterSyntaxError | null = null;
  try {
    frontmatter = parseFrontmatter(source);
  } catch (err) {
    if (!(err instanceof FrontmatterSyntaxError)) throw err;
    syntaxError = err;
  }

  const items =
    rule.collection === 'table' && frontmatter
      ? parseItemTable(frontmatter.body, frontmatter.bodyStartLine)
      : rule.collection === 'table'
        ? parseItemTable(source, 1)
        : [];

  return { file, rule, source, frontmatter, syntaxError, items };
}

export function collectArtifacts(root: string, config: OwnershipConfig): ArtifactDoc[] {
  const docs: ArtifactDoc[] = [];

  for (const rule of config.artifacts) {
    const target = rule.path.replace(/\\/g, '/');
    const files = target.endsWith('/') ? listMarkdown(root, target) : [target];
    for (const file of files) {
      const doc = readDoc(root, file, rule);
      if (doc) docs.push(doc);
    }
  }

  return docs;
}
```

- [ ] **Step 6: Rodar os testes para ver passar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```
Esperado: todos passando; type-check limpo.

- [ ] **Step 7: Commit**

```bash
git add src/docs test/docs
git commit -m "feat: schema de artefato, parser de tabela de itens e coletor"
```

---

### Task 5: `CI-1` — structure lint

O primeiro check da Fase 0: "sem contrato de máquina, nada mais é enforceável" (spec §10). Falha quando o frontmatter está ausente/inválido, `status` sai da máquina de estados, `owner` está vazio, ou `trigger` está ausente **ou descreve cadência**.

Toda finding nomeia arquivo, linha e a correção — exigência da spec §9 ("a saída nomeia o arquivo, a linha e a correção").

**Files:**
- Create: `src/core/types.ts`
- Create: `src/checks/ci1-structure.ts`
- Test: `test/checks/ci1-structure.test.ts`

**Interfaces:**
- Consumes: `ArtifactDoc`, `collectArtifacts` (Task 4); `schema.ts` inteiro (Task 4); `OwnershipConfig` (Task 3).
- Produces:
  - `type Severity = 'error' | 'warning'`
  - `interface Finding { ruleId: string; file: string; line: number; severity: Severity; message: string; fix: string }`
  - `interface CheckContext { root: string; config: OwnershipConfig; docs: ArtifactDoc[] }`
  - `interface Check { id: string; name: string; run(context: CheckContext): Finding[] }`
  - `const ci1Structure: Check` (`id: 'CI-1'`)

- [ ] **Step 1: Escrever o teste falhando**

`test/checks/ci1-structure.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ci1Structure } from '../../src/checks/ci1-structure.ts';
import { collectArtifacts } from '../../src/docs/collect.ts';
import { parseOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';
import type { Finding } from '../../src/core/types.ts';

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
`;

function adr(fields: Record<string, string>, body = '\n## Contexto\n'): string {
  const lines = Object.entries(fields).map(([key, value]) => `${key}: ${value}`);
  return ['---', ...lines, '---', body].join('\n');
}

const GOOD_ADR = adr({
  id: 'ADR-0001',
  title: 'Fila de eventos',
  status: 'accepted',
  owner: '"@team"',
  trigger: 'Nunca. Imutável após aceito; uma decisão nova o supersede.',
  'last-reviewed': '2026-08-21',
});

const GOOD_DA = [
  '---',
  'title: Open Decisions',
  'owner: "@product"',
  'trigger: Toda vez que alguém trombou numa lacuna.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '| ID | Lacuna | Status |',
  '| --- | --- | --- |',
  '| DA-0001 | Reembolso parcial | open |',
].join('\n');

function run(files: Record<string, string>): Finding[] {
  let findings: Finding[] = [];
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, (root) => {
    const config = parseOwnership(CONFIG);
    findings = ci1Structure.run({ root, config, docs: collectArtifacts(root, config) });
  });
  return findings;
}

test('artefatos bem formados não produzem finding', () => {
  assert.deepEqual(
    run({ 'docs/decisions/adr/ADR-0001-fila.md': GOOD_ADR, 'docs/open-decisions.md': GOOD_DA }),
    [],
  );
});

test('frontmatter ausente falha na linha 1', () => {
  const findings = run({ 'docs/decisions/adr/ADR-0001-x.md': '# Sem frontmatter\n' });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.ruleId, 'CI-1');
  assert.equal(findings[0]?.line, 1);
  assert.equal(findings[0]?.severity, 'error');
  assert.match(findings[0]?.message ?? '', /frontmatter/i);
});

test('YAML inválido no bloco falha sem derrubar o check', () => {
  const findings = run({ 'docs/decisions/adr/ADR-0001-x.md': '---\nid: ADR-0001\n  : ruim\n---\n' });
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /YAML|inválid/i);
});

test('cada campo obrigatório ausente vira uma finding', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({ id: 'ADR-0001', status: 'draft' }),
  });
  const faltando = findings.filter((f) => /obrigatório/i.test(f.message)).map((f) => f.message);
  for (const field of ['title', 'owner', 'trigger', 'last-reviewed']) {
    assert.ok(faltando.some((m) => m.includes(field)), `deveria acusar ${field}`);
  }
});

test('status fora da máquina de estados falha na linha do campo', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'aprovado',
      owner: '"@team"',
      trigger: 'Nunca.',
      'last-reviewed': '2026-08-21',
    }),
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.line, 4);
  assert.match(findings[0]?.message ?? '', /status/);
  assert.match(findings[0]?.fix ?? '', /draft.*accepted.*superseded/);
});

test('trigger com cadência falha nomeando o campo e o termo — critério de aceite 3', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: 'revisar trimestralmente',
      'last-reviewed': '2026-08-21',
    }),
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /trigger/);
  assert.match(findings[0]?.message ?? '', /trimestral/i);
  assert.equal(findings[0]?.line, 6);
});

test('owner sem @ e last-reviewed fora do ISO falham', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'ADR-0001',
      title: 'x',
      status: 'draft',
      owner: 'team',
      trigger: 'Nunca.',
      'last-reviewed': '21/08/2026',
    }),
  });
  assert.equal(findings.length, 2);
  assert.ok(findings.some((f) => /owner/.test(f.message)));
  assert.ok(findings.some((f) => /last-reviewed/.test(f.message)));
});

test('id que não bate com o prefixo do artefato falha', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-x.md': adr({
      id: 'TDR-0001',
      title: 'x',
      status: 'draft',
      owner: '"@team"',
      trigger: 'Nunca.',
      'last-reviewed': '2026-08-21',
    }),
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /ADR/);
});

test('coleção em tabela: container não exige id, mas cada item exige status válido', () => {
  const bad = GOOD_DA.replace('| DA-0001 | Reembolso parcial | open |', '| DA-0001 | Reembolso parcial | pendente |');
  const findings = run({ 'docs/open-decisions.md': bad });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.line, 10);
  assert.match(findings[0]?.message ?? '', /DA-0001/);
  assert.match(findings[0]?.fix ?? '', /open.*resolved.*dropped/);
});

test('prefixo sem máquina de estados declarada falha pedindo `states`', () => {
  const config = `
version: 1
artifacts:
  - id-prefix: XX
    path: docs/x/
    owner: "@team"
    skill: s
`;
  let findings: Finding[] = [];
  withTempRepo(
    {
      [OWNERSHIP_PATH]: config,
      'docs/x/XX-0001-a.md': adr({
        id: 'XX-0001',
        title: 'x',
        status: 'draft',
        owner: '"@team"',
        trigger: 'Nunca.',
        'last-reviewed': '2026-08-21',
      }),
    },
    (root) => {
      const parsed = parseOwnership(config);
      findings = ci1Structure.run({ root, config: parsed, docs: collectArtifacts(root, parsed) });
    },
  );
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.fix ?? '', /states/);
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
docker compose exec toolkit npm test
```
Esperado: FAIL — `Cannot find module '/app/src/checks/ci1-structure.ts'`.

- [ ] **Step 3: Implementar `src/core/types.ts`**

```typescript
import type { OwnershipConfig } from '../config/ownership.ts';
import type { ArtifactDoc } from '../docs/collect.ts';

export type Severity = 'error' | 'warning';

export interface Finding {
  /** ID do check que produziu a finding, ex.: 'CI-1'. */
  ruleId: string;
  /** Caminho relativo à raiz do repositório. */
  file: string;
  /** Linha 1-indexed; 0 quando a finding não tem linha. */
  line: number;
  severity: Severity;
  /** O que está errado. */
  message: string;
  /** O caminho válido para corrigir. */
  fix: string;
}

export interface CheckContext {
  root: string;
  config: OwnershipConfig;
  docs: ArtifactDoc[];
}

export interface Check {
  id: string;
  name: string;
  run(context: CheckContext): Finding[];
}
```

- [ ] **Step 4: Implementar `src/checks/ci1-structure.ts`**

```typescript
import type { Check, CheckContext, Finding } from '../core/types.ts';
import type { ArtifactDoc } from '../docs/collect.ts';
import {
  REQUIRED_FIELDS,
  CONTAINER_REQUIRED_FIELDS,
  findCadence,
  isIsoDate,
  parseId,
  statesFor,
} from '../docs/schema.ts';

const RULE = 'CI-1';

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix };
}

function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

function checkDoc(doc: ArtifactDoc): Finding[] {
  const findings: Finding[] = [];

  if (doc.syntaxError) {
    return [
      error(
        doc.file,
        doc.syntaxError.line,
        `Frontmatter com YAML inválido: ${doc.syntaxError.message}`,
        'Corrija o bloco YAML entre os `---` no topo do arquivo.',
      ),
    ];
  }

  const frontmatter = doc.frontmatter;
  if (!frontmatter) {
    return [
      error(
        doc.file,
        1,
        'Frontmatter ausente — todo artefato de documentação viva abre com o bloco YAML padrão.',
        'Adicione `id`, `title`, `status`, `owner`, `trigger` e `last-reviewed` entre `---` no topo (spec §2).',
      ),
    ];
  }

  const { data, lines } = frontmatter;
  const lineOf = (field: string): number => lines[field] ?? 1;
  const isContainer = doc.rule.collection === 'table';
  const required = isContainer ? CONTAINER_REQUIRED_FIELDS : REQUIRED_FIELDS;

  for (const field of required) {
    if (!isFilled(data[field])) {
      findings.push(
        error(
          doc.file,
          frontmatter.endLine,
          `Campo obrigatório \`${field}\` ausente ou vazio.`,
          `Preencha \`${field}\` no frontmatter (skill dona: ${doc.rule.skill}).`,
        ),
      );
    }
  }

  if (!isContainer && isFilled(data.id)) {
    const parsed = parseId(data.id);
    if (!parsed) {
      findings.push(
        error(
          doc.file,
          lineOf('id'),
          `\`id\` "${String(data.id)}" fora do formato <PREFIXO>-<número>.`,
          `Use ${doc.rule.idPrefix}-0001 (spec §8).`,
        ),
      );
    } else if (parsed.prefix !== doc.rule.idPrefix) {
      findings.push(
        error(
          doc.file,
          lineOf('id'),
          `\`id\` usa o prefixo ${parsed.prefix}, mas ${doc.rule.path} é território de ${doc.rule.idPrefix}.`,
          `Renomeie para ${doc.rule.idPrefix}-... ou mova o arquivo para o artefato dono.`,
        ),
      );
    }
  }

  const states = statesFor(doc.rule);
  if (!isContainer && isFilled(data.status)) {
    if (!states) {
      findings.push(
        error(
          doc.file,
          lineOf('status'),
          `Prefixo ${doc.rule.idPrefix} não tem máquina de estados declarada.`,
          `Declare \`states:\` para esse artefato em docs/.ownership.yml.`,
        ),
      );
    } else if (!states.includes(String(data.status))) {
      findings.push(
        error(
          doc.file,
          lineOf('status'),
          `\`status\` "${String(data.status)}" fora da máquina de estados de ${doc.rule.idPrefix}.`,
          `Estados válidos: ${states.join(' → ')} (spec §4).`,
        ),
      );
    }
  }

  if (isFilled(data.owner) && !String(data.owner).startsWith('@')) {
    findings.push(
      error(
        doc.file,
        lineOf('owner'),
        `\`owner\` "${String(data.owner)}" precisa começar com @ e espelhar o CODEOWNERS.`,
        'Use o handle de pessoa ou time, ex.: "@team-platform".',
      ),
    );
  }

  if (isFilled(data.trigger)) {
    const cadence = findCadence(String(data.trigger));
    if (cadence) {
      findings.push(
        error(
          doc.file,
          lineOf('trigger'),
          `\`trigger\` descreve cadência ("${cadence}") em vez de um evento observável.`,
          'Nomeie o evento: "no mesmo PR que altera src/domain/billing", "quando um código de erro novo é adicionado" (spec §2, mecanismo 2).',
        ),
      );
    }
  }

  if (isFilled(data['last-reviewed']) && !isIsoDate(data['last-reviewed'])) {
    findings.push(
      error(
        doc.file,
        lineOf('last-reviewed'),
        `\`last-reviewed\` "${String(data['last-reviewed'])}" não é uma data ISO.`,
        'Use YYYY-MM-DD, e só toque neste campo se você realmente reviu o documento (spec §2).',
      ),
    );
  }

  if (isContainer && states) {
    for (const item of doc.items) {
      if (!states.includes(item.status)) {
        findings.push(
          error(
            doc.file,
            item.line,
            `Item ${item.id} com status "${item.status}" fora da máquina de estados de ${doc.rule.idPrefix}.`,
            `Estados válidos: ${states.join(' → ')} (spec §4).`,
          ),
        );
      }
    }
  }

  return findings;
}

export const ci1Structure: Check = {
  id: RULE,
  name: 'structure lint',
  run(context: CheckContext): Finding[] {
    return context.docs.flatMap(checkDoc);
  },
};
```

- [ ] **Step 5: Rodar o teste para ver passar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```
Esperado: todos passando; type-check limpo.

- [ ] **Step 6: Commit**

```bash
git add src/core/types.ts src/checks/ci1-structure.ts test/checks/ci1-structure.test.ts
git commit -m "feat: CI-1 structure lint com rejeição de trigger por cadência"
```

---

### Task 6: `CI-2` — ID lint, citações e registry de checks

Materializa o mecanismo 3 (rastreabilidade por ID) na parte que é puramente sintática: ID duplicado, ID fora de sequência, ID reciclado de `docs/ids-retired.txt`, e citação que não resolve.

Decisão de escopo importante: `CI-2` **só valida citações de prefixos declarados em `.ownership.yml`**. Uma citação a `RN-014` num repositório que ainda não instalou a Fase 2 é ignorada, não é erro — é o que permite instalar o toolkit por fases sem falso positivo.

**Files:**
- Create: `src/ids/citations.ts`
- Create: `src/checks/ci2-ids.ts`
- Create: `src/checks/registry.ts`
- Test: `test/ids/citations.test.ts`
- Test: `test/checks/ci2-ids.test.ts`

**Interfaces:**
- Consumes: `Check`, `CheckContext`, `Finding` (Task 5); `ArtifactDoc` (Task 4); `parseId` (Task 4).
- Produces:
  - `const RETIRED_IDS_PATH = 'docs/ids-retired.txt'`
  - `interface Citation { id: string; line: number }`
  - `function findCitations(source: string): Citation[]`
  - `function loadRetiredIds(root: string): Set<string>`
  - `const ci2Ids: Check` (`id: 'CI-2'`)
  - `const CHECKS: readonly Check[]` em `registry.ts` — a lista ordenada que o CLI roda.

- [ ] **Step 1: Escrever os testes falhando**

`test/ids/citations.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findCitations, loadRetiredIds, RETIRED_IDS_PATH } from '../../src/ids/citations.ts';
import { withTempRepo } from '../helpers/tmp.ts';

test('encontra citações com linha 1-indexed', () => {
  const source = ['# Título', '', 'Supersede ADR-0031 e fecha DA-0007.', 'Cita TDR-003 também.'].join('\n');
  assert.deepEqual(findCitations(source), [
    { id: 'ADR-0031', line: 3 },
    { id: 'DA-0007', line: 3 },
    { id: 'TDR-003', line: 4 },
  ]);
});

test('ignora o que não é sintaxe de citação', () => {
  assert.deepEqual(findCitations('UTF-8 e ISO-8601 e adr-0001 e ADR-12'), []);
});

test('loadRetiredIds lê o registro ignorando comentários e vazios', () => {
  withTempRepo({ [RETIRED_IDS_PATH]: '# retirados\nADR-0002\n\nDA-0005\n' }, (root) => {
    const retired = loadRetiredIds(root);
    assert.equal(retired.has('ADR-0002'), true);
    assert.equal(retired.has('DA-0005'), true);
    assert.equal(retired.size, 2);
  });
});

test('ausência do registro devolve conjunto vazio', () => {
  withTempRepo({ 'README.md': '' }, (root) => {
    assert.equal(loadRetiredIds(root).size, 0);
  });
});
```

`test/checks/ci2-ids.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ci2Ids } from '../../src/checks/ci2-ids.ts';
import { CHECKS } from '../../src/checks/registry.ts';
import { collectArtifacts } from '../../src/docs/collect.ts';
import { parseOwnership, OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { RETIRED_IDS_PATH } from '../../src/ids/citations.ts';
import { withTempRepo } from '../helpers/tmp.ts';
import type { Finding } from '../../src/core/types.ts';

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
`;

function adr(id: string, body = ''): string {
  return [
    '---',
    `id: ${id}`,
    'title: Decisão',
    'status: draft',
    'owner: "@team"',
    'trigger: Nunca.',
    'last-reviewed: 2026-08-21',
    '---',
    '',
    body,
  ].join('\n');
}

function openDecisions(rows: string[]): string {
  return [
    '---',
    'title: Open Decisions',
    'owner: "@product"',
    'trigger: Toda vez que alguém trombou numa lacuna.',
    'last-reviewed: 2026-08-21',
    '---',
    '',
    '| ID | Lacuna | Status | Resolvida por |',
    '| --- | --- | --- | --- |',
    ...rows,
  ].join('\n');
}

function run(files: Record<string, string>): Finding[] {
  let findings: Finding[] = [];
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, (root) => {
    const config = parseOwnership(CONFIG);
    findings = ci2Ids.run({ root, config, docs: collectArtifacts(root, config) });
  });
  return findings;
}

test('sequência íntegra e citações que resolvem não produzem finding', () => {
  assert.deepEqual(
    run({
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Fecha DA-0001.'),
      'docs/decisions/adr/ADR-0002-b.md': adr('ADR-0002'),
      'docs/open-decisions.md': openDecisions(['| DA-0001 | Lacuna | resolved | ADR-0001 |']),
    }),
    [],
  );
});

test('ID duplicado falha nomeando os dois arquivos', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-0001-b.md': adr('ADR-0001'),
    'docs/open-decisions.md': openDecisions([]),
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0]?.ruleId, 'CI-2');
  assert.match(findings[0]?.message ?? '', /ADR-0001/);
  assert.match(findings[0]?.message ?? '', /ADR-0001-a\.md/);
});

test('ID presente em ids-retired.txt reaparecendo falha', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/open-decisions.md': openDecisions([]),
    [RETIRED_IDS_PATH]: 'ADR-0001\n',
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /reciclado|retirado/i);
});

test('buraco na sequência falha apontando o registro de retirados', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
    'docs/decisions/adr/ADR-0003-c.md': adr('ADR-0003'),
    'docs/open-decisions.md': openDecisions([]),
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /ADR-0002/);
  assert.equal(findings[0]?.file, RETIRED_IDS_PATH);
});

test('buraco explicado por ids-retired.txt não falha', () => {
  assert.deepEqual(
    run({
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001'),
      'docs/decisions/adr/ADR-0003-c.md': adr('ADR-0003'),
      'docs/open-decisions.md': openDecisions([]),
      [RETIRED_IDS_PATH]: 'ADR-0002\n',
    }),
    [],
  );
});

test('citação que não resolve falha na linha da citação', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Supersede ADR-0099.'),
    'docs/open-decisions.md': openDecisions([]),
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /ADR-0099/);
  assert.equal(findings[0]?.file, 'docs/decisions/adr/ADR-0001-a.md');
});

test('citação para um ID retirado falha', () => {
  const findings = run({
    'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Ver DA-0001.'),
    'docs/open-decisions.md': openDecisions([]),
    [RETIRED_IDS_PATH]: 'DA-0001\n',
  });
  assert.equal(findings.length, 1);
  assert.match(findings[0]?.message ?? '', /DA-0001/);
  assert.match(findings[0]?.message ?? '', /retirado/i);
});

test('citação de prefixo não declarado é ignorada — instalação por fases', () => {
  assert.deepEqual(
    run({
      'docs/decisions/adr/ADR-0001-a.md': adr('ADR-0001', 'Implementa RN-014 e RF-002.'),
      'docs/open-decisions.md': openDecisions([]),
    }),
    [],
  );
});

test('o registry expõe CI-1 e CI-2 nessa ordem', () => {
  assert.deepEqual(
    CHECKS.map((check) => check.id),
    ['CI-1', 'CI-2'],
  );
});
```

- [ ] **Step 2: Rodar os testes para ver falhar**

```bash
docker compose exec toolkit npm test
```
Esperado: FAIL — módulos `src/ids/citations.ts` e `src/checks/ci2-ids.ts` inexistentes.

- [ ] **Step 3: Implementar `src/ids/citations.ts`**

```typescript
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

export const RETIRED_IDS_PATH = 'docs/ids-retired.txt';

/** Sintaxe única de citação (spec §8): <PREFIXO>-<número>. */
const CITATION = /\b([A-Z]{2,4})-(\d{3,4})\b/g;

export interface Citation {
  id: string;
  /** Linha 1-indexed dentro de `source`. */
  line: number;
}

export function findCitations(source: string): Citation[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const citations: Citation[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? '';
    for (const match of line.matchAll(CITATION)) {
      citations.push({ id: match[0], line: i + 1 });
    }
  }

  return citations;
}

/** IDs retirados — nunca podem reaparecer (spec §2). */
export function loadRetiredIds(root: string): Set<string> {
  let source: string;
  try {
    source = readFileSync(join(root, RETIRED_IDS_PATH), 'utf8');
  } catch {
    return new Set();
  }

  const retired = new Set<string>();
  for (const raw of source.split('\n')) {
    const line = raw.trim();
    if (line === '' || line.startsWith('#')) continue;
    retired.add(line);
  }
  return retired;
}
```

- [ ] **Step 4: Implementar `src/checks/ci2-ids.ts`**

```typescript
import type { Check, CheckContext, Finding } from '../core/types.ts';
import { parseId } from '../docs/schema.ts';
import { findCitations, loadRetiredIds, RETIRED_IDS_PATH } from '../ids/citations.ts';

const RULE = 'CI-2';

interface Declaration {
  id: string;
  file: string;
  line: number;
}

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix };
}

function collectDeclarations(context: CheckContext): Declaration[] {
  const declarations: Declaration[] = [];

  for (const doc of context.docs) {
    if (doc.rule.collection === 'table') {
      for (const item of doc.items) {
        declarations.push({ id: item.id, file: doc.file, line: item.line });
      }
      continue;
    }
    const id = doc.frontmatter?.data.id;
    if (typeof id === 'string' && parseId(id)) {
      declarations.push({ id, file: doc.file, line: doc.frontmatter?.lines.id ?? 1 });
    }
  }

  return declarations;
}

export const ci2Ids: Check = {
  id: RULE,
  name: 'ID lint',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = [];
    const retired = loadRetiredIds(context.root);
    const declarations = collectDeclarations(context);

    const byId = new Map<string, Declaration>();
    for (const declaration of declarations) {
      const previous = byId.get(declaration.id);
      if (previous) {
        findings.push(
          error(
            declaration.file,
            declaration.line,
            `ID ${declaration.id} duplicado — já declarado em ${previous.file}:${previous.line}.`,
            'Um ID identifica um único item. Escolha o próximo número livre da sequência.',
          ),
        );
        continue;
      }
      byId.set(declaration.id, declaration);

      if (retired.has(declaration.id)) {
        findings.push(
          error(
            declaration.file,
            declaration.line,
            `ID ${declaration.id} está em ${RETIRED_IDS_PATH} e não pode ser reciclado.`,
            'Use o próximo número livre; IDs retirados nunca voltam (spec §2).',
          ),
        );
      }
    }

    // Sequência contígua por prefixo, contando os retirados.
    const known = new Set(context.config.artifacts.map((artifact) => artifact.idPrefix));
    const numbersByPrefix = new Map<string, Set<number>>();
    for (const id of [...byId.keys(), ...retired]) {
      const parsed = parseId(id);
      if (!parsed || !known.has(parsed.prefix)) continue;
      const numbers = numbersByPrefix.get(parsed.prefix) ?? new Set<number>();
      numbers.add(parsed.number);
      numbersByPrefix.set(parsed.prefix, numbers);
    }

    for (const [prefix, numbers] of numbersByPrefix) {
      const highest = Math.max(...numbers);
      for (let n = 1; n <= highest; n++) {
        if (numbers.has(n)) continue;
        const missing = `${prefix}-${String(n).padStart(4, '0')}`;
        findings.push(
          error(
            RETIRED_IDS_PATH,
            0,
            `Sequência de ${prefix} tem buraco: ${missing} não existe nem está retirado.`,
            `Se o item foi removido, registre \`${missing}\` em ${RETIRED_IDS_PATH}; senão, renumere sem pular.`,
          ),
        );
      }
    }

    // Citações precisam resolver para um ID existente e não retirado.
    for (const doc of context.docs) {
      const declaredHere = new Set(
        declarations.filter((declaration) => declaration.file === doc.file).map((d) => d.id),
      );
      for (const citation of findCitations(doc.source)) {
        const parsed = parseId(citation.id);
        if (!parsed || !known.has(parsed.prefix)) continue;
        if (declaredHere.has(citation.id)) continue;
        if (byId.has(citation.id) && !retired.has(citation.id)) continue;

        findings.push(
          error(
            doc.file,
            citation.line,
            retired.has(citation.id)
              ? `Citação a ${citation.id}, que está retirado.`
              : `Citação a ${citation.id}, que não resolve para nenhum artefato existente.`,
            `Cite um ID existente ou crie o artefato (skill dona: ${doc.rule.skill}).`,
          ),
        );
      }
    }

    return findings;
  },
};
```

- [ ] **Step 5: Implementar `src/checks/registry.ts`**

```typescript
import type { Check } from '../core/types.ts';
import { ci1Structure } from './ci1-structure.ts';
import { ci2Ids } from './ci2-ids.ts';

/** Checks das Fases 0–1, na ordem em que o CLI os roda. */
export const CHECKS: readonly Check[] = [ci1Structure, ci2Ids];
```

- [ ] **Step 6: Rodar os testes para ver passar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```
Esperado: todos passando; type-check limpo.

- [ ] **Step 7: Commit**

```bash
git add src/ids src/checks/ci2-ids.ts src/checks/registry.ts test/ids test/checks/ci2-ids.test.ts
git commit -m "feat: CI-2 ID lint com sequência, retirados e citações"
```

---

### Task 7: CLI `living-docs validate` e o wrapper do host

É o enforcement que "sobrevive a alguém editando pelo navegador" (spec §1): roda no CI, sem agente presente. O wrapper `bin/living-docs` existe porque o host não tem Node — ele apenas repassa argumentos e stdin para dentro do container já em execução.

**Files:**
- Create: `src/cli/report.ts`
- Create: `src/cli/validate.ts`
- Create: `src/cli/index.ts`
- Create: `bin/living-docs`
- Test: `test/cli/report.test.ts`
- Test: `test/cli/validate.test.ts`

**Interfaces:**
- Consumes: `CHECKS` (Task 6); `loadOwnership`, `OwnershipError` (Task 3); `collectArtifacts` (Task 4); `Finding` (Task 5).
- Produces:
  - `function formatFindings(findings: readonly Finding[]): string`
  - `interface ValidateResult { findings: Finding[]; errors: number; warnings: number; exitCode: number }`
  - `function runValidate(root: string): ValidateResult` — `exitCode` 0 sem erros, 1 com ao menos um `severity: 'error'`.
  - Executável `src/cli/index.ts` com os subcomandos `validate` (esta task) e `init` (Task 8); exit 2 para uso inválido ou `.ownership.yml` ausente.

- [ ] **Step 1: Escrever os testes falhando**

`test/cli/report.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { formatFindings } from '../../src/cli/report.ts';
import type { Finding } from '../../src/core/types.ts';

const FINDING: Finding = {
  ruleId: 'CI-1',
  file: 'docs/decisions/adr/ADR-0001-x.md',
  line: 6,
  severity: 'error',
  message: '`trigger` descreve cadência ("trimestral").',
  fix: 'Nomeie o evento observável.',
};

test('nomeia arquivo, linha, regra e correção', () => {
  const output = formatFindings([FINDING]);
  assert.match(output, /docs\/decisions\/adr\/ADR-0001-x\.md:6/);
  assert.match(output, /CI-1/);
  assert.match(output, /error/);
  assert.match(output, /trimestral/);
  assert.match(output, /Nomeie o evento observável\./);
});

test('omite a linha quando ela é 0', () => {
  const output = formatFindings([{ ...FINDING, line: 0 }]);
  assert.match(output, /ADR-0001-x\.md\s/);
  assert.doesNotMatch(output, /ADR-0001-x\.md:0/);
});

test('resume a contagem por severidade', () => {
  const output = formatFindings([FINDING, { ...FINDING, severity: 'warning' }]);
  assert.match(output, /1 erro/);
  assert.match(output, /1 aviso/);
});

test('sem findings, informa que está tudo certo', () => {
  assert.match(formatFindings([]), /nenhuma/i);
});
```

`test/cli/validate.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { runValidate } from '../../src/cli/validate.ts';
import { OWNERSHIP_PATH, OwnershipError } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
`;

const GOOD = [
  '---',
  'id: ADR-0001',
  'title: Fila de eventos',
  'status: draft',
  'owner: "@team"',
  'trigger: Nunca. Imutável após aceito.',
  'last-reviewed: 2026-08-21',
  '---',
  '',
  '## Contexto',
].join('\n');

test('repositório conforme sai com 0', () => {
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, 'docs/decisions/adr/ADR-0001-a.md': GOOD }, (root) => {
    const result = runValidate(root);
    assert.deepEqual(result.findings, []);
    assert.equal(result.exitCode, 0);
  });
});

test('erro de qualquer check leva a exit 1', () => {
  withTempRepo(
    { [OWNERSHIP_PATH]: CONFIG, 'docs/decisions/adr/ADR-0001-a.md': GOOD.replace('status: draft', 'status: aprovado') },
    (root) => {
      const result = runValidate(root);
      assert.equal(result.errors, 1);
      assert.equal(result.exitCode, 1);
      assert.equal(result.findings[0]?.ruleId, 'CI-1');
    },
  );
});

test('roda todos os checks do registry, não só o primeiro', () => {
  withTempRepo(
    {
      [OWNERSHIP_PATH]: CONFIG,
      'docs/decisions/adr/ADR-0001-a.md': GOOD,
      'docs/decisions/adr/ADR-0003-c.md': GOOD.replace('ADR-0001', 'ADR-0003'),
    },
    (root) => {
      const result = runValidate(root);
      assert.ok(result.findings.some((finding) => finding.ruleId === 'CI-2'));
    },
  );
});

test('.ownership.yml ausente propaga OwnershipError', () => {
  withTempRepo({ 'README.md': '' }, (root) => {
    assert.throws(() => runValidate(root), OwnershipError);
  });
});
```

- [ ] **Step 2: Rodar os testes para ver falhar**

```bash
docker compose exec toolkit npm test
```
Esperado: FAIL — `Cannot find module '/app/src/cli/report.ts'`.

- [ ] **Step 3: Implementar `src/cli/report.ts`**

```typescript
import type { Finding } from '../core/types.ts';

function plural(count: number, singular: string, pluralForm: string): string {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

export function formatFindings(findings: readonly Finding[]): string {
  if (findings.length === 0) {
    return 'living-docs: nenhuma violação encontrada.';
  }

  const lines: string[] = [];
  for (const finding of findings) {
    const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file;
    lines.push(`${location}  ${finding.ruleId}  ${finding.severity}  ${finding.message}`);
    lines.push(`  → ${finding.fix}`);
  }

  const errors = findings.filter((finding) => finding.severity === 'error').length;
  const warnings = findings.length - errors;
  lines.push('');
  lines.push(`living-docs: ${plural(errors, 'erro', 'erros')}, ${plural(warnings, 'aviso', 'avisos')}.`);

  return lines.join('\n');
}
```

- [ ] **Step 4: Implementar `src/cli/validate.ts`**

```typescript
import { loadOwnership } from '../config/ownership.ts';
import { collectArtifacts } from '../docs/collect.ts';
import { CHECKS } from '../checks/registry.ts';
import type { Finding } from '../core/types.ts';

export interface ValidateResult {
  findings: Finding[];
  errors: number;
  warnings: number;
  exitCode: number;
}

export function runValidate(root: string): ValidateResult {
  const config = loadOwnership(root);
  const docs = collectArtifacts(root, config);
  const context = { root, config, docs };

  const findings = CHECKS.flatMap((check) => check.run(context));
  const errors = findings.filter((finding) => finding.severity === 'error').length;

  return {
    findings,
    errors,
    warnings: findings.length - errors,
    exitCode: errors > 0 ? 1 : 0,
  };
}
```

- [ ] **Step 5: Implementar `src/cli/index.ts`**

O subcomando `init` é implementado na Task 8; até lá ele já está roteado e responde com erro de "não implementado", o que mantém este arquivo estável entre as duas tasks.

```typescript
#!/usr/bin/env node
import { runValidate } from './validate.ts';
import { formatFindings } from './report.ts';
import { OwnershipError } from '../config/ownership.ts';

const USAGE = `living-docs <comando>

  validate    Roda os checks de documentação viva (CI-1, CI-2)
  init        Cria a moldura de documentação viva (skill dona: living-docs-bootstrap)

Opções de init:
  --owner <@handle>   Dono padrão dos artefatos criados
  --dry-run           Mostra o que faria, sem escrever
`;

function main(argv: readonly string[]): number {
  const root = process.env.LIVING_DOCS_ROOT ?? process.cwd();
  const command = argv[0];

  if (command === undefined || command === '--help' || command === '-h') {
    process.stdout.write(USAGE);
    return command === undefined ? 2 : 0;
  }

  try {
    if (command === 'validate') {
      const result = runValidate(root);
      process.stdout.write(`${formatFindings(result.findings)}\n`);
      return result.exitCode;
    }

    if (command === 'init') {
      process.stderr.write('living-docs: `init` ainda não implementado.\n');
      return 2;
    }
  } catch (err) {
    if (err instanceof OwnershipError) {
      process.stderr.write(`living-docs: ${err.message}\n`);
      return 2;
    }
    throw err;
  }

  process.stderr.write(`living-docs: comando desconhecido "${command}".\n\n${USAGE}`);
  return 2;
}

process.exitCode = main(process.argv.slice(2));
```

- [ ] **Step 6: Escrever o wrapper `bin/living-docs`**

Sai com 2 (e não 0) quando o container está fora do ar: o CLI é enforcement, e enforcement que falha silenciosamente é pior que enforcement nenhum. Os **hooks** é que falham abertos (Task 12) — a assimetria é deliberada.

```bash
#!/usr/bin/env bash
# Ponte host → container. O host não executa Node: todo trabalho acontece
# dentro de `living-docs-toolkit`, com o repositório montado em /app.
set -euo pipefail

CONTAINER="${LIVING_DOCS_CONTAINER:-living-docs-toolkit}"

if ! docker inspect -f '{{.State.Running}}' "$CONTAINER" 2>/dev/null | grep -q true; then
  echo "living-docs: o container '$CONTAINER' não está rodando. Suba com: docker compose up -d" >&2
  exit 2
fi

exec docker exec -i -e LIVING_DOCS_ROOT=/app "$CONTAINER" node /app/src/cli/index.ts "$@"
```

Torne executável:
```bash
chmod +x bin/living-docs
```

- [ ] **Step 7: Rodar os testes e exercitar o CLI de ponta a ponta**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs --help
./bin/living-docs validate; echo "exit=$?"
```
Esperado: testes passando; `--help` imprimindo o uso; `validate` saindo com `exit=2` e a mensagem de `docs/.ownership.yml` não encontrado (o repositório ainda não foi inicializado — é a Task 8).

- [ ] **Step 8: Commit**

```bash
git add src/cli bin/living-docs test/cli
git commit -m "feat: CLI living-docs validate e ponte bash para o container"
```

---

### Task 8: `SK-0` — templates e `living-docs init`

O bootstrap da spec §5. A regra que define esta task é a primeira do procedimento de `SK-0`: **inventariar antes de criar** — se já existe `docs/adr/` ou `adr/`, o toolkit adota esse caminho no `.ownership.yml` em vez de criar um paralelo. "Duplicata é o anti-padrão mais caro da lista."

Idempotência é requisito da spec: rodar duas vezes não duplica arquivo, não reescreve conteúdo existente, não renumera ID.

**Files:**
- Create: `templates/ownership.yml`
- Create: `templates/open-decisions.md`
- Create: `templates/ids-retired.txt`
- Create: `templates/adr.md`
- Create: `templates/tdr.md`
- Create: `templates/CODEOWNERS`
- Create: `src/cli/init.ts`
- Modify: `src/cli/index.ts` (rota do subcomando `init`)
- Test: `test/cli/init.test.ts`

**Interfaces:**
- Consumes: `OWNERSHIP_PATH` (Task 3); `RETIRED_IDS_PATH` (Task 6).
- Produces:
  - `interface InitOptions { owner: string; dryRun: boolean }`
  - `interface InitResult { created: string[]; skipped: string[]; adopted: { idPrefix: string; path: string }[] }`
  - `function runInit(root: string, options: InitOptions): InitResult`
  - `const DEFAULT_PATHS: Readonly<Record<'ADR' | 'DA' | 'TDR', string>>`

- [ ] **Step 1: Escrever os templates**

`templates/ownership.yml` (os `{{...}}` são substituídos por `runInit`):
```yaml
# O único arquivo específico deste projeto. Hooks e checks não conhecem
# caminho nenhum — leem daqui. Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §3.
version: 1
stale-after-months: 6

artifacts:
  - id-prefix: ADR
    path: {{ADR_PATH}}
    owner: "{{OWNER}}"
    skill: decision-recorder
    append-only: true
    mutable-fields: [status, superseded-by, last-reviewed]

  - id-prefix: DA
    path: {{DA_PATH}}
    owner: "{{OWNER}}"
    skill: decision-recorder
    collection: table

  - id-prefix: TDR
    path: {{TDR_PATH}}
    owner: "{{OWNER}}"
    skill: decision-recorder
    append-only: true
    mutable-fields: [status, last-reviewed]

generated: []

# Fases 3+ preenchem `watches` (código → doc dono). Vazio nas Fases 0–1.
watches: []

consumer-visible-paths: []
```

`templates/open-decisions.md`:
```markdown
---
title: Open Decisions
owner: "{{OWNER}}"
trigger: >
  Toda vez que alguém trombou numa lacuna — comportamento sem regra escrita.
last-reviewed: {{TODAY}}
---

# Open Decisions

O que ainda **não** foi decidido. Enquanto um item está aqui, ele não tem regra
e **não deve ser implementado** — a saída é o ID, não o código.

| ID | Lacuna | Status | Resolvida por | Aberta em |
| --- | --- | --- | --- | --- |
```

`templates/ids-retired.txt`:
```
# IDs retirados. Nunca são reciclados (LIVING-DOCUMENTATION-TOOLKIT.md §2).
# Um ID por linha.
```

`templates/adr.md`:
```markdown
---
id: {{ID}}
title: {{TITLE}}
status: draft
owner: "{{OWNER}}"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: {{TODAY}}
relates-to: []
supersedes: null
superseded-by: null
---

# {{ID}} — {{TITLE}}

## Contexto

<!-- Que força criou a necessidade da decisão. Sem narrar o código. -->

## Alternativas consideradas

<!-- Ao menos duas, com o motivo real do descarte de cada uma. -->

## Decisão

<!-- O que se decidiu, em uma frase afirmativa. -->

## Consequências

### O que se ganha

### O que se aceita perder

<!-- Obrigatório. ADR sem consequência negativa declarada é propaganda. -->
```

`templates/tdr.md`:
```markdown
---
id: {{ID}}
title: {{TITLE}}
status: open
owner: "{{OWNER}}"
trigger: >
  Quando o gatilho de pagamento abaixo se cumprir.
last-reviewed: {{TODAY}}
relates-to: []
---

# {{ID}} — {{TITLE}}

## O atalho

<!-- O que foi feito, deliberadamente, abaixo do padrão. -->

## Por que foi aceito

## Gatilho de pagamento

<!-- Precisa ser observável: "quando o volume passar de X", "no primeiro PR
     que tocar este módulo". "Quando der tempo" não é gatilho. -->

## Custo de continuar devendo
```

`templates/CODEOWNERS`:
```
# Espelha o campo `owner` de docs/.ownership.yml. Um artefato, um dono.
{{ADR_PATH}}    {{OWNER}}
{{DA_PATH}}    {{OWNER}}
{{TDR_PATH}}    {{OWNER}}
docs/.ownership.yml    {{OWNER}}
```

- [ ] **Step 2: Escrever o teste falhando**

`test/cli/init.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { runInit } from '../../src/cli/init.ts';
import { runValidate } from '../../src/cli/validate.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { RETIRED_IDS_PATH } from '../../src/ids/citations.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const OPTIONS = { owner: '@team-platform', dryRun: false };

test('cria a moldura das fases 0–1 num repositório vazio — critério de aceite 1', () => {
  withTempRepo({ 'README.md': '# projeto\n' }, (root) => {
    const result = runInit(root, OPTIONS);

    for (const path of [OWNERSHIP_PATH, RETIRED_IDS_PATH, 'docs/open-decisions.md', 'CODEOWNERS']) {
      assert.ok(existsSync(join(root, path)), `${path} deveria existir`);
      assert.ok(result.created.includes(path));
    }
    assert.ok(existsSync(join(root, 'docs/decisions/adr')));
    assert.ok(existsSync(join(root, 'docs/decisions/debt')));

    const config = readFileSync(join(root, OWNERSHIP_PATH), 'utf8');
    assert.match(config, /@team-platform/);
    assert.doesNotMatch(config, /\{\{/);
  });
});

test('o repositório recém-inicializado passa no próprio validate', () => {
  withTempRepo({ 'README.md': '' }, (root) => {
    runInit(root, OPTIONS);
    const result = runValidate(root);
    assert.deepEqual(result.findings, []);
    assert.equal(result.exitCode, 0);
  });
});

test('é idempotente: a segunda execução não recria nem reescreve nada', () => {
  withTempRepo({ 'README.md': '' }, (root) => {
    runInit(root, OPTIONS);
    writeFileSync(join(root, 'docs/open-decisions.md'), 'CONTEÚDO DO USUÁRIO\n', 'utf8');

    const second = runInit(root, OPTIONS);
    assert.deepEqual(second.created, []);
    assert.deepEqual(second.adopted, [], 'a segunda execução lê os caminhos do .ownership.yml, não readota');
    assert.ok(second.skipped.includes('docs/open-decisions.md'));
    assert.equal(readFileSync(join(root, 'docs/open-decisions.md'), 'utf8'), 'CONTEÚDO DO USUÁRIO\n');
  });
});

test('adota diretório de ADR preexistente em vez de criar um paralelo', () => {
  withTempRepo({ 'docs/adr/0001-antigo.md': '# antigo\n' }, (root) => {
    const result = runInit(root, OPTIONS);

    assert.ok(result.adopted.some((entry) => entry.idPrefix === 'ADR' && entry.path === 'docs/adr/'));
    assert.equal(existsSync(join(root, 'docs/decisions/adr')), false);
    assert.match(readFileSync(join(root, OWNERSHIP_PATH), 'utf8'), /path: docs\/adr\//);
  });
});

test('adota arquivo de open decisions preexistente sob outro nome', () => {
  withTempRepo({ 'docs/decisoes-abertas.md': '# abertas\n', 'README.md': '' }, (root) => {
    const result = runInit(root, OPTIONS);
    assert.ok(result.adopted.some((entry) => entry.path === 'docs/decisoes-abertas.md'));
  });
});

test('dry-run não escreve nada mas relata o que faria', () => {
  withTempRepo({ 'README.md': '' }, (root) => {
    const result = runInit(root, { owner: '@team', dryRun: true });
    assert.ok(result.created.includes(OWNERSHIP_PATH));
    assert.equal(existsSync(join(root, OWNERSHIP_PATH)), false);
  });
});
```

- [ ] **Step 3: Rodar o teste para ver falhar**

```bash
docker compose exec toolkit npm test
```
Esperado: FAIL — `Cannot find module '/app/src/cli/init.ts'`.

- [ ] **Step 4: Implementar `src/cli/init.ts`**

```typescript
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { OWNERSHIP_PATH, loadOwnership } from '../config/ownership.ts';
import type { OwnershipConfig } from '../config/ownership.ts';
import { RETIRED_IDS_PATH } from '../ids/citations.ts';

const TEMPLATES_DIR = join(import.meta.dirname, '..', '..', 'templates');

export const DEFAULT_PATHS: Readonly<Record<'ADR' | 'DA' | 'TDR', string>> = Object.freeze({
  ADR: 'docs/decisions/adr/',
  DA: 'docs/open-decisions.md',
  TDR: 'docs/decisions/debt/',
});

/**
 * Caminhos onde um artefato equivalente pode já existir sob outro nome.
 * Adotar o que existe; nunca criar um paralelo (spec §5, SK-0 passo 1).
 */
const ADOPTION_CANDIDATES: Readonly<Record<'ADR' | 'DA' | 'TDR', readonly string[]>> = Object.freeze({
  ADR: ['docs/adr/', 'adr/', 'doc/adr/', 'docs/architecture/decisions/'],
  DA: ['docs/decisoes-abertas.md', 'docs/open-questions.md', 'docs/decision-backlog.md'],
  TDR: ['docs/debt/', 'docs/tech-debt/', 'docs/divida/'],
});

export interface InitOptions {
  owner: string;
  dryRun: boolean;
}

export interface InitResult {
  created: string[];
  skipped: string[];
  adopted: { idPrefix: string; path: string }[];
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

function template(name: string, values: Record<string, string>): string {
  let source = readFileSync(join(TEMPLATES_DIR, name), 'utf8');
  for (const [key, value] of Object.entries(values)) {
    source = source.replaceAll(`{{${key}}}`, value);
  }
  return source;
}

/**
 * Idempotência (spec §5): se já existe `.ownership.yml`, os caminhos vêm dele —
 * uma segunda execução não pode reinterpretar a estrutura que a primeira criou.
 */
function resolvePath(
  root: string,
  kind: 'ADR' | 'DA' | 'TDR',
  existing: OwnershipConfig | null,
  result: InitResult,
): string {
  const declared = existing?.artifacts.find((artifact) => artifact.idPrefix === kind);
  if (declared) return declared.path;

  for (const candidate of ADOPTION_CANDIDATES[kind]) {
    if (existsSync(join(root, candidate))) {
      result.adopted.push({ idPrefix: kind, path: candidate });
      return candidate;
    }
  }
  return DEFAULT_PATHS[kind];
}

function writeIfAbsent(
  root: string,
  relative: string,
  content: string,
  options: InitOptions,
  result: InitResult,
): void {
  if (existsSync(join(root, relative))) {
    result.skipped.push(relative);
    return;
  }
  result.created.push(relative);
  if (options.dryRun) return;

  const absolute = join(root, relative);
  mkdirSync(dirname(absolute), { recursive: true });
  writeFileSync(absolute, content, 'utf8');
}

function ensureDirectory(root: string, relative: string, options: InitOptions, result: InitResult): void {
  if (existsSync(join(root, relative))) {
    result.skipped.push(relative);
    return;
  }
  result.created.push(relative);
  if (options.dryRun) return;

  mkdirSync(join(root, relative), { recursive: true });
  writeFileSync(join(root, relative, '.gitkeep'), '', 'utf8');
}

export function runInit(root: string, options: InitOptions): InitResult {
  const result: InitResult = { created: [], skipped: [], adopted: [] };

  let existing: OwnershipConfig | null = null;
  try {
    existing = loadOwnership(root);
  } catch {
    existing = null; // primeira execução, ou configuração ilegível
  }

  const adrPath = resolvePath(root, 'ADR', existing, result);
  const daPath = resolvePath(root, 'DA', existing, result);
  const tdrPath = resolvePath(root, 'TDR', existing, result);

  const values = {
    OWNER: options.owner,
    TODAY: today(),
    ADR_PATH: adrPath,
    DA_PATH: daPath,
    TDR_PATH: tdrPath,
  };

  writeIfAbsent(root, OWNERSHIP_PATH, template('ownership.yml', values), options, result);
  writeIfAbsent(root, RETIRED_IDS_PATH, template('ids-retired.txt', values), options, result);
  writeIfAbsent(root, daPath, template('open-decisions.md', values), options, result);
  writeIfAbsent(root, 'CODEOWNERS', template('CODEOWNERS', values), options, result);
  ensureDirectory(root, adrPath, options, result);
  ensureDirectory(root, tdrPath, options, result);

  return result;
}
```

- [ ] **Step 5: Ligar o subcomando `init` no CLI**

Em `src/cli/index.ts`, adicione o import e substitua o bloco `if (command === 'init')` por:

```typescript
    if (command === 'init') {
      const ownerIndex = argv.indexOf('--owner');
      const owner = ownerIndex === -1 ? '@owners' : (argv[ownerIndex + 1] ?? '@owners');
      const result = runInit(root, { owner, dryRun: argv.includes('--dry-run') });

      for (const entry of result.adopted) {
        process.stdout.write(`adotado   ${entry.path}  (${entry.idPrefix} — já existia; nenhum paralelo criado)\n`);
      }
      for (const path of result.created) process.stdout.write(`criado    ${path}\n`);
      for (const path of result.skipped) process.stdout.write(`mantido   ${path}\n`);
      if (result.created.length === 0) process.stdout.write('living-docs: nada a criar; a moldura já existe.\n');
      return 0;
    }
```

E o import no topo:
```typescript
import { runInit } from './init.ts';
```

- [ ] **Step 6: Rodar os testes e exercitar `init` de ponta a ponta**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs init --dry-run --owner "@dan"
```
Esperado: testes passando; `--dry-run` listando os arquivos que criaria, sem escrever nenhum.

- [ ] **Step 7: Commit**

```bash
git add templates src/cli/init.ts src/cli/index.ts test/cli/init.test.ts
git commit -m "feat: SK-0 living-docs init idempotente com adoção de artefatos existentes"
```

---

### Task 9: Biblioteca dos hooks — protocolo, caminhos e projeção de edição

Três utilitários que `HK-1` e `HK-3` compartilham. O mais sutil é `applyToolInput`: em vez de tentar adivinhar a intenção de um `Edit` a partir de `old_string`/`new_string`, ele **projeta a edição sobre o conteúdo atual em memória** e compara os dois documentos. Isso mantém os hooks estritamente mecânicos — eles comparam frontmatter, não interpretam intenção (spec §1, corolário 1).

`toRepoPath` existe porque o agente roda no host e envia caminhos do host (`/mnt/c/.../repo/docs/...`), enquanto o hook roda no container e enxerga `/app/docs/...`.

**Files:**
- Create: `src/hooks/lib/paths.ts`
- Create: `src/hooks/lib/io.ts`
- Create: `src/hooks/lib/edit.ts`
- Test: `test/hooks/lib/paths.test.ts`
- Test: `test/hooks/lib/edit.test.ts`

**Interfaces:**
- Consumes: `parseFrontmatter` (Task 2).
- Produces:
  - `function toRepoPath(filePath: string, roots: readonly string[]): string | null`
  - `interface HookEnv { root: string; hostRoots: readonly string[] }`
  - `function hookEnv(): HookEnv` — lê `LIVING_DOCS_ROOT` e `LIVING_DOCS_HOST_ROOT`
  - `interface HookPayload { tool_name?: string; tool_input?: Record<string, unknown> }`
  - `function readPayload(): Promise<HookPayload | null>`
  - `function denyOutput(reason: string): string`
  - `function askOutput(reason: string): string`
  - `function emit(output: string | null): void`
  - `function applyToolInput(current: string, toolInput: Record<string, unknown>): string | null`
  - `interface DocumentDiff { changedFields: string[]; bodyChanged: boolean }`
  - `function diffDocument(before: string, after: string): DocumentDiff`

- [ ] **Step 1: Escrever os testes falhando**

`test/hooks/lib/paths.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { toRepoPath } from '../../../src/hooks/lib/paths.ts';

const ROOTS = ['/app', '/mnt/c/Users/dev/repo'];

test('converte caminho do host em caminho do repositório', () => {
  assert.equal(toRepoPath('/mnt/c/Users/dev/repo/docs/a.md', ROOTS), 'docs/a.md');
});

test('converte caminho do container', () => {
  assert.equal(toRepoPath('/app/docs/a.md', ROOTS), 'docs/a.md');
});

test('normaliza separadores do Windows e ./', () => {
  assert.equal(toRepoPath('C:\\Users\\dev\\repo\\docs\\a.md', ['C:/Users/dev/repo']), 'docs/a.md');
  assert.equal(toRepoPath('./docs/a.md', ROOTS), 'docs/a.md');
});

test('caminho relativo passa direto', () => {
  assert.equal(toRepoPath('docs/a.md', ROOTS), 'docs/a.md');
});

test('caminho absoluto fora de qualquer raiz devolve null', () => {
  assert.equal(toRepoPath('/etc/passwd', ROOTS), null);
});

test('a própria raiz não é um arquivo dentro dela', () => {
  assert.equal(toRepoPath('/app', ROOTS), null);
});
```

`test/hooks/lib/edit.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyToolInput, diffDocument } from '../../../src/hooks/lib/edit.ts';

const DOC = [
  '---',
  'id: ADR-0001',
  'status: accepted',
  'superseded-by: null',
  '---',
  '',
  '## Contexto',
  'texto original',
].join('\n');

test('Write devolve o conteúdo inteiro', () => {
  assert.equal(applyToolInput(DOC, { content: 'novo' }), 'novo');
});

test('Edit projeta a substituição sobre o conteúdo atual', () => {
  const result = applyToolInput(DOC, { old_string: 'texto original', new_string: 'texto novo' });
  assert.match(result ?? '', /texto novo/);
  assert.doesNotMatch(result ?? '', /texto original/);
});

test('Edit com replace_all substitui todas as ocorrências', () => {
  const result = applyToolInput('a a a', { old_string: 'a', new_string: 'b', replace_all: true });
  assert.equal(result, 'b b b');
});

test('Edit cujo old_string não existe devolve null — não dá para prever', () => {
  assert.equal(applyToolInput(DOC, { old_string: 'inexistente', new_string: 'x' }), null);
});

test('tool_input sem content nem old_string devolve null', () => {
  assert.equal(applyToolInput(DOC, {}), null);
});

test('diffDocument isola campos alterados do corpo alterado', () => {
  const after = DOC.replace('status: accepted', 'status: superseded').replace(
    'superseded-by: null',
    'superseded-by: ADR-0002',
  );
  assert.deepEqual(diffDocument(DOC, after), {
    changedFields: ['status', 'superseded-by'],
    bodyChanged: false,
  });
});

test('diffDocument detecta alteração de corpo', () => {
  const after = DOC.replace('texto original', 'texto adulterado');
  const diff = diffDocument(DOC, after);
  assert.deepEqual(diff.changedFields, []);
  assert.equal(diff.bodyChanged, true);
});

test('campo adicionado ou removido conta como campo alterado', () => {
  const added = DOC.replace('status: accepted', 'status: accepted\nlast-reviewed: 2026-08-24');
  assert.deepEqual(diffDocument(DOC, added).changedFields, ['last-reviewed']);
  const removed = DOC.replace('superseded-by: null\n', '');
  assert.deepEqual(diffDocument(DOC, removed).changedFields, ['superseded-by']);
});

test('diferença só de espaço em branco no fim do corpo não conta', () => {
  assert.equal(diffDocument(DOC, `${DOC}\n\n`).bodyChanged, false);
});

test('perder o frontmatter conta como corpo alterado', () => {
  assert.equal(diffDocument(DOC, '# sem frontmatter').bodyChanged, true);
});
```

- [ ] **Step 2: Rodar os testes para ver falhar**

```bash
docker compose exec toolkit npm test
```
Esperado: FAIL — módulos `src/hooks/lib/*.ts` inexistentes.

- [ ] **Step 3: Implementar `src/hooks/lib/paths.ts`**

```typescript
function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '');
}

/**
 * Caminho relativo à raiz do repositório, ou null se o arquivo está fora dele.
 * `roots` traz a raiz do container e a raiz do host, nessa ordem de preferência.
 */
export function toRepoPath(filePath: string, roots: readonly string[]): string | null {
  const normalized = normalize(filePath);

  const isAbsolute = normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized);
  if (!isAbsolute) {
    return normalized.replace(/^\.\//, '');
  }

  for (const root of roots) {
    const prefix = `${normalize(root)}/`;
    if (normalized.toLowerCase().startsWith(prefix.toLowerCase())) {
      return normalized.slice(prefix.length);
    }
  }

  return null;
}
```

- [ ] **Step 4: Implementar `src/hooks/lib/io.ts`**

```typescript
export interface HookEnv {
  /** Raiz do repositório dentro do container. */
  root: string;
  /** Raízes reconhecidas em `file_path`: a do container e a do host. */
  hostRoots: readonly string[];
}

export interface HookPayload {
  tool_name?: string;
  tool_input?: Record<string, unknown>;
}

export function hookEnv(): HookEnv {
  const root = process.env.LIVING_DOCS_ROOT ?? '/app';
  const host = process.env.LIVING_DOCS_HOST_ROOT;
  return { root, hostRoots: host ? [root, host] : [root] };
}

export async function readPayload(): Promise<HookPayload | null> {
  const chunks: Buffer[] = [];
  for await (const chunk of process.stdin) chunks.push(chunk as Buffer);

  try {
    const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'));
    if (parsed === null || typeof parsed !== 'object') return null;
    return parsed as HookPayload;
  } catch {
    return null;
  }
}

function output(decision: 'deny' | 'ask', reason: string): string {
  return JSON.stringify({
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: decision,
      permissionDecisionReason: reason,
    },
  });
}

export function denyOutput(reason: string): string {
  return output('deny', reason);
}

export function askOutput(reason: string): string {
  return output('ask', reason);
}

/** Emite a decisão; `null` significa "deixe passar em silêncio". */
export function emit(value: string | null): void {
  if (value !== null) process.stdout.write(`${value}\n`);
}
```

- [ ] **Step 5: Implementar `src/hooks/lib/edit.ts`**

```typescript
import { parseFrontmatter } from '../../frontmatter/parse.ts';

/** Conteúdo que o arquivo teria depois deste `tool_input`, ou null se não dá para prever. */
export function applyToolInput(current: string, toolInput: Record<string, unknown>): string | null {
  const content = toolInput.content;
  if (typeof content === 'string') return content;

  const oldString = toolInput.old_string;
  const newString = toolInput.new_string;
  if (typeof oldString !== 'string' || typeof newString !== 'string') return null;
  if (!current.includes(oldString)) return null;

  return toolInput.replace_all === true
    ? current.replaceAll(oldString, newString)
    : current.replace(oldString, newString);
}

export interface DocumentDiff {
  /** Chaves de frontmatter adicionadas, removidas ou com valor diferente, em ordem alfabética. */
  changedFields: string[];
  bodyChanged: boolean;
}

function safeParse(source: string): { data: Record<string, unknown>; body: string } {
  try {
    const frontmatter = parseFrontmatter(source);
    if (!frontmatter) return { data: {}, body: source };
    return { data: frontmatter.data, body: frontmatter.body };
  } catch {
    return { data: {}, body: source };
  }
}

export function diffDocument(before: string, after: string): DocumentDiff {
  const from = safeParse(before);
  const to = safeParse(after);

  const keys = new Set([...Object.keys(from.data), ...Object.keys(to.data)]);
  const changedFields: string[] = [];
  for (const key of keys) {
    if (JSON.stringify(from.data[key]) !== JSON.stringify(to.data[key])) changedFields.push(key);
  }

  return {
    changedFields: changedFields.sort(),
    bodyChanged: from.body.trimEnd() !== to.body.trimEnd(),
  };
}
```

- [ ] **Step 6: Rodar os testes para ver passar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```
Esperado: todos passando; type-check limpo.

- [ ] **Step 7: Commit**

```bash
git add src/hooks/lib test/hooks/lib
git commit -m "feat: biblioteca de hooks — protocolo, mapa de caminhos e projeção de edição"
```

---

### Task 10: `HK-1` — bloqueio de edição de item append-only congelado

O hook mais importante do toolkit, e o critério de aceite 2 da spec: um ADR `accepted` não se corrige — ganha `superseded`. A allowlist de `mutable-fields` é o que permite supersedir **sem** violar a imutabilidade.

Toda saída é `deny` com uma mensagem que nomeia a regra de origem, o artefato dono e o caminho válido. Falha aberta em qualquer imprevisto: config ilegível, arquivo inexistente, edição não projetável — tudo devolve `allow`.

**Files:**
- Create: `src/hooks/hk1-append-only.ts`
- Test: `test/hooks/hk1-append-only.test.ts`

**Interfaces:**
- Consumes: `HookEnv`, `HookPayload`, `readPayload`, `denyOutput`, `emit`, `hookEnv` (Task 9); `applyToolInput`, `diffDocument` (Task 9); `toRepoPath` (Task 9); `loadOwnership`, `findArtifactRule` (Task 3); `FROZEN_STATUSES`, `MUTABLE_FIELDS_DEFAULT` (Task 4); `parseFrontmatter` (Task 2).
- Produces:
  - `type HookDecision = { action: 'allow' } | { action: 'deny'; reason: string }`
  - `function decideHk1(payload: HookPayload, env: HookEnv): HookDecision`

- [ ] **Step 1: Escrever o teste falhando**

`test/hooks/hk1-append-only.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideHk1 } from '../../src/hooks/hk1-append-only.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';
import type { HookEnv } from '../../src/hooks/lib/io.ts';
import type { HookDecision } from '../../src/hooks/hk1-append-only.ts';

/** Narrowing tipado: sem isto, `decision.reason` não existe para o TypeScript. */
function assertDeny(decision: HookDecision): asserts decision is { action: 'deny'; reason: string } {
  assert.equal(decision.action, 'deny');
}

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
    mutable-fields: [status, superseded-by, last-reviewed]
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
`;

function adr(status: string): string {
  return [
    '---',
    'id: ADR-0001',
    'title: Fila de eventos',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Nunca.',
    'last-reviewed: 2026-08-21',
    'superseded-by: null',
    '---',
    '',
    '## Contexto',
    'texto original',
  ].join('\n');
}

const FILE = 'docs/decisions/adr/ADR-0001-fila.md';

function decide(files: Record<string, string>, toolInput: Record<string, unknown>): HookDecision {
  let decision: HookDecision = { action: 'allow' };
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, (root) => {
    const env: HookEnv = { root, hostRoots: [root] };
    decision = decideHk1({ tool_name: 'Edit', tool_input: toolInput }, env);
  });
  return decision;
}

test('nega alterar o corpo de um ADR accepted — critério de aceite 2', () => {
  const decision = decide({ [FILE]: adr('accepted') }, {
    file_path: FILE,
    old_string: 'texto original',
    new_string: 'texto corrigido',
  });
  assertDeny(decision);
  assert.match(decision.reason, /superseded|supersed/i);
  assert.match(decision.reason, /decision-recorder/);
  assert.match(decision.reason, /ADR-0001-fila\.md/);
});

test('permite alterar só status + superseded-by — é assim que se supersede', () => {
  const after = adr('superseded').replace('superseded-by: null', 'superseded-by: ADR-0002');
  const decision = decide({ [FILE]: adr('accepted') }, { file_path: FILE, content: after });
  assert.equal(decision.action, 'allow');
});

test('nega mudar um campo fora da allowlist mesmo sem tocar no corpo', () => {
  const after = adr('accepted').replace('title: Fila de eventos', 'title: Outro título');
  const decision = decide({ [FILE]: adr('accepted') }, { file_path: FILE, content: after });
  assertDeny(decision);
  assert.match(decision.reason, /title/);
});

test('permite editar ADR em draft — draft não é estado congelado', () => {
  const decision = decide({ [FILE]: adr('draft') }, {
    file_path: FILE,
    old_string: 'texto original',
    new_string: 'texto novo',
  });
  assert.equal(decision.action, 'allow');
});

test('permite criar item novo — arquivo inexistente sempre passa', () => {
  const decision = decide({}, {
    file_path: 'docs/decisions/adr/ADR-0002-nova.md',
    content: adr('draft'),
  });
  assert.equal(decision.action, 'allow');
});

test('ignora caminho fora de qualquer artefato append-only', () => {
  assert.equal(decide({ 'src/index.ts': 'x' }, { file_path: 'src/index.ts', content: 'y' }).action, 'allow');
  assert.equal(
    decide({ 'docs/open-decisions.md': 'x' }, { file_path: 'docs/open-decisions.md', content: 'y' }).action,
    'allow',
  );
});

test('falha aberta: .ownership.yml ausente permite', () => {
  let decision: HookDecision = { action: 'deny', reason: 'não deveria' };
  withTempRepo({ [FILE]: adr('accepted') }, (root) => {
    decision = decideHk1(
      { tool_name: 'Edit', tool_input: { file_path: FILE, old_string: 'texto original', new_string: 'x' } },
      { root, hostRoots: [root] },
    );
  });
  assert.equal(decision.action, 'allow');
});

test('falha aberta: edição não projetável permite', () => {
  const decision = decide({ [FILE]: adr('accepted') }, {
    file_path: FILE,
    old_string: 'trecho que não existe',
    new_string: 'x',
  });
  assert.equal(decision.action, 'allow');
});

test('payload sem file_path permite', () => {
  assert.equal(decide({ [FILE]: adr('accepted') }, { content: 'x' }).action, 'allow');
});

test('aceita file_path absoluto do host', () => {
  let decision: HookDecision = { action: 'allow' };
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, [FILE]: adr('accepted') }, (root) => {
    decision = decideHk1(
      {
        tool_name: 'Edit',
        tool_input: { file_path: `${root}/${FILE}`, old_string: 'texto original', new_string: 'x' },
      },
      { root, hostRoots: [root] },
    );
  });
  assert.equal(decision.action, 'deny');
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
docker compose exec toolkit npm test
```
Esperado: FAIL — `Cannot find module '/app/src/hooks/hk1-append-only.ts'`.

- [ ] **Step 3: Implementar**

`src/hooks/hk1-append-only.ts`:
```typescript
#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): nega alteração de item append-only congelado.
 *
 * Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §4 — "nenhum estado terminal
 * permite edição do corpo". A allowlist de campos vem de docs/.ownership.yml.
 */
import { readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { findArtifactRule, loadOwnership } from '../config/ownership.ts';
import { parseFrontmatter } from '../frontmatter/parse.ts';
import { FROZEN_STATUSES, MUTABLE_FIELDS_DEFAULT } from '../docs/schema.ts';
import { applyToolInput, diffDocument } from './lib/edit.ts';
import { toRepoPath } from './lib/paths.ts';
import { denyOutput, emit, hookEnv, readPayload } from './lib/io.ts';
import type { HookEnv, HookPayload } from './lib/io.ts';

export type HookDecision = { action: 'allow' } | { action: 'deny'; reason: string };

const ALLOW: HookDecision = { action: 'allow' };

export function decideHk1(payload: HookPayload, env: HookEnv): HookDecision {
  const toolInput = payload.tool_input;
  if (!toolInput) return ALLOW;

  const filePath = toolInput.file_path;
  if (typeof filePath !== 'string') return ALLOW;

  const repoPath = toRepoPath(filePath, env.hostRoots);
  if (repoPath === null) return ALLOW;

  let rule;
  try {
    rule = findArtifactRule(loadOwnership(env.root), repoPath);
  } catch {
    return ALLOW; // falha aberta: sem configuração legível, não trave o trabalho
  }
  if (!rule || !rule.appendOnly) return ALLOW;

  let current: string;
  try {
    current = readFileSync(join(env.root, repoPath), 'utf8');
  } catch {
    return ALLOW; // criar item novo é sempre permitido
  }

  let status: unknown;
  try {
    status = parseFrontmatter(current)?.data.status;
  } catch {
    return ALLOW;
  }
  if (typeof status !== 'string' || !FROZEN_STATUSES.has(status)) return ALLOW;

  const next = applyToolInput(current, toolInput);
  if (next === null) return ALLOW; // não dá para prever o resultado

  const mutable = rule.mutableFields.length > 0 ? rule.mutableFields : MUTABLE_FIELDS_DEFAULT;
  const diff = diffDocument(current, next);
  const forbidden = diff.changedFields.filter((field) => !mutable.includes(field));

  if (!diff.bodyChanged && forbidden.length === 0) return ALLOW;

  const what = diff.bodyChanged
    ? 'o corpo do documento'
    : `o campo ${forbidden.map((field) => `\`${field}\``).join(', ')}`;

  return {
    action: 'deny',
    reason:
      `HK-1 bloqueou: \`${basename(repoPath)}\` está em estado congelado (\`${status}\`) e você tentou alterar ${what}. ` +
      'Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §4 — nenhum estado terminal permite edição do corpo; ' +
      'um item aceito que se revelou errado não é corrigido, a história das decisões é o ativo. ' +
      `Caminho válido: crie um item novo com \`supersedes: ${String(parseFrontmatter(current)?.data.id ?? '')}\` e ` +
      `marque este como \`status: superseded\` + \`superseded-by:\` (campos liberados aqui: ${mutable.join(', ')}). ` +
      `Artefato dono: ${rule.path} (${rule.owner}); skill dona: ${rule.skill}.`,
  };
}

async function main(): Promise<void> {
  const payload = await readPayload();
  if (!payload) return; // falha aberta
  const decision = decideHk1(payload, hookEnv());
  emit(decision.action === 'deny' ? denyOutput(decision.reason) : null);
}

if (process.argv[1]?.endsWith('hk1-append-only.ts')) {
  main().catch(() => process.exit(0)); // falha aberta, sempre
}
```

- [ ] **Step 4: Rodar o teste para ver passar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```
Esperado: todos passando; type-check limpo.

- [ ] **Step 5: Verificar o comportamento real do executável via stdin**

```bash
docker compose exec -T toolkit sh -c 'echo "{\"tool_name\":\"Edit\",\"tool_input\":{\"file_path\":\"/app/inexistente.md\",\"content\":\"x\"}}" | node /app/src/hooks/hk1-append-only.ts; echo "exit=$?"'
```
Esperado: nenhuma saída (allow) e `exit=0`.

- [ ] **Step 6: Commit**

```bash
git add src/hooks/hk1-append-only.ts test/hooks/hk1-append-only.test.ts
git commit -m "feat: HK-1 bloqueia edição de item append-only congelado"
```

---

### Task 11: `HK-3` — promoção de estado exige ato humano

"Nenhum agente promove estado sozinho" (spec §4). O hook devolve `ask`, não `deny`: promover é legítimo, só não é ato de agente. Cobre os dois casos da spec — `draft → accepted` no frontmatter de um item por arquivo, e `open → resolved` numa linha de tabela.

**Files:**
- Create: `src/hooks/hk3-state-promotion.ts`
- Test: `test/hooks/hk3-state-promotion.test.ts`

**Interfaces:**
- Consumes: mesmos módulos de `HK-1`; adicionalmente `HUMAN_PROMOTIONS` e `parseItemTable` (Task 4).
- Produces:
  - `type Hk3Decision = { action: 'allow' } | { action: 'ask'; reason: string }`
  - `function decideHk3(payload: HookPayload, env: HookEnv): Hk3Decision`

- [ ] **Step 1: Escrever o teste falhando**

`test/hooks/hk3-state-promotion.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideHk3 } from '../../src/hooks/hk3-state-promotion.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';
import type { Hk3Decision } from '../../src/hooks/hk3-state-promotion.ts';

function assertAsk(decision: Hk3Decision): asserts decision is { action: 'ask'; reason: string } {
  assert.equal(decision.action, 'ask');
}

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
    append-only: true
  - id-prefix: DA
    path: docs/open-decisions.md
    owner: "@product"
    skill: decision-recorder
    collection: table
`;

const ADR_FILE = 'docs/decisions/adr/ADR-0001-fila.md';

function adr(status: string): string {
  return [
    '---',
    'id: ADR-0001',
    'title: Fila de eventos',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Nunca.',
    'last-reviewed: 2026-08-21',
    '---',
    '',
    '## Contexto',
  ].join('\n');
}

function openDecisions(status: string, resolvedBy: string): string {
  return [
    '---',
    'title: Open Decisions',
    'owner: "@product"',
    'trigger: Toda vez que alguém trombou numa lacuna.',
    'last-reviewed: 2026-08-21',
    '---',
    '',
    '| ID | Lacuna | Status | Resolvida por |',
    '| --- | --- | --- | --- |',
    `| DA-0001 | Reembolso parcial | ${status} | ${resolvedBy} |`,
  ].join('\n');
}

function decide(files: Record<string, string>, toolInput: Record<string, unknown>): Hk3Decision {
  let decision: Hk3Decision = { action: 'allow' };
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, (root) => {
    decision = decideHk3({ tool_name: 'Edit', tool_input: toolInput }, { root, hostRoots: [root] });
  });
  return decision;
}

test('pergunta ao promover ADR de draft para accepted', () => {
  const decision = decide({ [ADR_FILE]: adr('draft') }, {
    file_path: ADR_FILE,
    old_string: 'status: draft',
    new_string: 'status: accepted',
  });
  assertAsk(decision);
  assert.match(decision.reason, /ADR-0001/);
  assert.match(decision.reason, /humano/i);
  assert.match(decision.reason, /decision-recorder/);
});

test('pergunta ao resolver uma DA na tabela', () => {
  const decision = decide({ 'docs/open-decisions.md': openDecisions('open', '—') }, {
    file_path: 'docs/open-decisions.md',
    content: openDecisions('resolved', 'ADR-0002'),
  });
  assertAsk(decision);
  assert.match(decision.reason, /DA-0001/);
});

test('permite escrever draft — é o máximo que uma skill escreve', () => {
  const decision = decide({}, { file_path: ADR_FILE, content: adr('draft') });
  assert.equal(decision.action, 'allow');
});

test('permite alterações que não são promoção humana', () => {
  const decision = decide({ [ADR_FILE]: adr('accepted') }, {
    file_path: ADR_FILE,
    old_string: 'status: accepted',
    new_string: 'status: superseded',
  });
  assert.equal(decision.action, 'allow');
});

test('permite adicionar linha nova em open na tabela', () => {
  const before = openDecisions('open', '—');
  const after = `${before}\n| DA-0002 | Outra lacuna | open | — |`;
  assert.equal(decide({ 'docs/open-decisions.md': before }, { file_path: 'docs/open-decisions.md', content: after }).action, 'allow');
});

test('falha aberta: sem configuração, permite', () => {
  let decision: Hk3Decision = { action: 'ask', reason: 'não deveria' };
  withTempRepo({ [ADR_FILE]: adr('draft') }, (root) => {
    decision = decideHk3(
      { tool_name: 'Edit', tool_input: { file_path: ADR_FILE, old_string: 'status: draft', new_string: 'status: accepted' } },
      { root, hostRoots: [root] },
    );
  });
  assert.equal(decision.action, 'allow');
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
docker compose exec toolkit npm test
```
Esperado: FAIL — `Cannot find module '/app/src/hooks/hk3-state-promotion.ts'`.

- [ ] **Step 3: Implementar**

`src/hooks/hk3-state-promotion.ts`:
```typescript
#!/usr/bin/env node
/**
 * PreToolUse (Edit|Write): intercepta promoção de estado que exige ato humano.
 *
 * Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §4 — "nenhum agente promove
 * estado sozinho". Devolve `ask`, nunca `deny`: promover é legítimo, só não é
 * ato de agente.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { findArtifactRule, loadOwnership } from '../config/ownership.ts';
import type { ArtifactRule } from '../config/ownership.ts';
import { parseFrontmatter } from '../frontmatter/parse.ts';
import { HUMAN_PROMOTIONS } from '../docs/schema.ts';
import { parseItemTable } from '../docs/table.ts';
import { applyToolInput } from './lib/edit.ts';
import { toRepoPath } from './lib/paths.ts';
import { askOutput, emit, hookEnv, readPayload } from './lib/io.ts';
import type { HookEnv, HookPayload } from './lib/io.ts';

export type Hk3Decision = { action: 'allow' } | { action: 'ask'; reason: string };

const ALLOW: Hk3Decision = { action: 'allow' };

interface Promotion {
  id: string;
  from: string;
  to: string;
}

function isHumanPromotion(from: string, to: string): boolean {
  return HUMAN_PROMOTIONS.some((promotion) => promotion.from === from && promotion.to === to);
}

function statusOf(source: string): { id: string; status: string } | null {
  try {
    const frontmatter = parseFrontmatter(source);
    const id = frontmatter?.data.id;
    const status = frontmatter?.data.status;
    if (typeof id !== 'string' || typeof status !== 'string') return null;
    return { id, status };
  } catch {
    return null;
  }
}

function findPromotion(before: string, after: string, rule: ArtifactRule): Promotion | null {
  if (rule.collection === 'table') {
    const previous = new Map(parseItemTable(before, 1).map((item) => [item.id, item.status]));
    for (const item of parseItemTable(after, 1)) {
      const from = previous.get(item.id);
      if (from !== undefined && isHumanPromotion(from, item.status)) {
        return { id: item.id, from, to: item.status };
      }
    }
    return null;
  }

  const from = statusOf(before);
  const to = statusOf(after);
  if (!from || !to) return null;
  return isHumanPromotion(from.status, to.status)
    ? { id: to.id, from: from.status, to: to.status }
    : null;
}

export function decideHk3(payload: HookPayload, env: HookEnv): Hk3Decision {
  const toolInput = payload.tool_input;
  if (!toolInput) return ALLOW;

  const filePath = toolInput.file_path;
  if (typeof filePath !== 'string') return ALLOW;

  const repoPath = toRepoPath(filePath, env.hostRoots);
  if (repoPath === null) return ALLOW;

  let rule;
  try {
    rule = findArtifactRule(loadOwnership(env.root), repoPath);
  } catch {
    return ALLOW; // falha aberta
  }
  if (!rule) return ALLOW;

  let current: string;
  try {
    current = readFileSync(join(env.root, repoPath), 'utf8');
  } catch {
    return ALLOW; // arquivo novo nasce em draft/open; nada a promover
  }

  const next = applyToolInput(current, toolInput);
  if (next === null) return ALLOW;

  const promotion = findPromotion(current, next, rule);
  if (!promotion) return ALLOW;

  return {
    action: 'ask',
    reason:
      `HK-3: esta edição promove ${promotion.id} de \`${promotion.from}\` para \`${promotion.to}\`. ` +
      'Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §4 — nenhum agente promove estado sozinho; ' +
      'o máximo que uma skill escreve é `draft`/`open`, e a aceitação é ato humano. ' +
      `Confirme se a decisão foi realmente tomada por uma pessoa. Artefato dono: ${rule.path} (${rule.owner}); ` +
      `skill dona: ${rule.skill}.`,
  };
}

async function main(): Promise<void> {
  const payload = await readPayload();
  if (!payload) return;
  const decision = decideHk3(payload, hookEnv());
  emit(decision.action === 'ask' ? askOutput(decision.reason) : null);
}

if (process.argv[1]?.endsWith('hk3-state-promotion.ts')) {
  main().catch(() => process.exit(0));
}
```

- [ ] **Step 4: Rodar o teste para ver passar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```
Esperado: todos passando; type-check limpo.

- [ ] **Step 5: Commit**

```bash
git add src/hooks/hk3-state-promotion.ts test/hooks/hk3-state-promotion.test.ts
git commit -m "feat: HK-3 intercepta promoção de estado que exige ato humano"
```

---

### Task 12: Plugin do Claude Code — manifesto, registro de hooks e ponte fail-open

Empacota `HK-1` e `HK-3` como plugin. O `run-hook.sh` é o ponto onde o requisito "falha aberta" da spec §7 vira código: **qualquer** falha — container fora do ar, timeout, erro de execução — resulta em saída vazia e exit 0, deixando a ferramenta passar. Um hook quebrado não pode travar o trabalho.

`timeout 5` no wrapper honra o teto de 5 s da spec, com folga enorme: `docker exec` neste container responde em ~160 ms.

**Files:**
- Create: `plugin/.claude-plugin/plugin.json`
- Create: `plugin/hooks/hooks.json`
- Create: `plugin/hooks/run-hook.sh`
- Test: `test/plugin/manifest.test.ts`

**Interfaces:**
- Consumes: os executáveis `src/hooks/hk1-append-only.ts` e `src/hooks/hk3-state-promotion.ts` (Tasks 10–11).
- Produces: um diretório de plugin instalável; `run-hook.sh <nome-do-hook>` como única porta de entrada do host para os hooks.

- [ ] **Step 1: Escrever o teste falhando**

`test/plugin/manifest.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.env.LIVING_DOCS_ROOT ?? '/app';

function readJson(relative: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(ROOT, relative), 'utf8')) as Record<string, unknown>;
}

test('o manifesto do plugin declara nome, versão e descrição', () => {
  const manifest = readJson('plugin/.claude-plugin/plugin.json');
  assert.equal(manifest.name, 'living-docs');
  assert.equal(typeof manifest.version, 'string');
  assert.equal(typeof manifest.description, 'string');
});

test('hooks.json registra HK-1 e HK-3 em PreToolUse com matcher Edit|Write', () => {
  const config = readJson('plugin/hooks/hooks.json');
  const hooks = config.hooks as Record<string, unknown[]>;
  const preToolUse = hooks.PreToolUse as { matcher: string; hooks: { command: string }[] }[];

  assert.equal(preToolUse.length, 1);
  assert.equal(preToolUse[0]?.matcher, 'Edit|Write');

  const commands = (preToolUse[0]?.hooks ?? []).map((hook) => hook.command);
  assert.equal(commands.length, 2);
  assert.ok(commands.some((command) => command.includes('hk1-append-only')));
  assert.ok(commands.some((command) => command.includes('hk3-state-promotion')));
  for (const command of commands) {
    assert.ok(command.includes('${CLAUDE_PLUGIN_ROOT}'), 'o comando precisa ser relocável');
  }
});

test('o wrapper existe, é executável e falha aberta', () => {
  const wrapper = join(ROOT, 'plugin/hooks/run-hook.sh');
  assert.ok(existsSync(wrapper));
  assert.ok((statSync(wrapper).mode & 0o111) !== 0, 'run-hook.sh precisa ser executável');

  const source = readFileSync(wrapper, 'utf8');
  assert.match(source, /timeout 5/, 'precisa respeitar o teto de 5s da spec §7');
  assert.match(source, /exit 0/, 'precisa falhar aberta');
  assert.doesNotMatch(source, /set -e\b/, 'set -e mataria a falha aberta');
});

test('todo hook referenciado existe no repositório', () => {
  const config = readJson('plugin/hooks/hooks.json');
  const hooks = config.hooks as Record<string, { hooks: { command: string }[] }[]>;
  for (const group of hooks.PreToolUse ?? []) {
    for (const hook of group.hooks) {
      const name = hook.command.trim().split(/\s+/).pop()?.replace(/"/g, '') ?? '';
      assert.ok(existsSync(join(ROOT, 'src/hooks', `${name}.ts`)), `src/hooks/${name}.ts deveria existir`);
    }
  }
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
docker compose exec toolkit npm test
```
Esperado: FAIL — `ENOENT` em `plugin/.claude-plugin/plugin.json`.

- [ ] **Step 3: Escrever o manifesto**

`plugin/.claude-plugin/plugin.json`:
```json
{
  "name": "living-docs",
  "version": "0.1.0",
  "description": "Documentação viva: ADR, Open Decisions e Debt Register com dono, gatilho e enforcement. Fases 0–1.",
  "keywords": ["adr", "documentation", "decisions", "living-docs"]
}
```

- [ ] **Step 4: Escrever o registro de hooks**

`plugin/hooks/hooks.json`:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Edit|Write",
        "hooks": [
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk1-append-only",
            "shell": "bash",
            "async": false
          },
          {
            "type": "command",
            "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" hk3-state-promotion",
            "shell": "bash",
            "async": false
          }
        ]
      }
    ]
  }
}
```

- [ ] **Step 5: Escrever o wrapper fail-open**

Note a ausência de `set -e`: aqui ele seria um bug, não uma boa prática — abortaria antes do `exit 0` e o Claude Code interpretaria a saída como falha do hook.

`plugin/hooks/run-hook.sh`:
```bash
#!/usr/bin/env bash
# Ponte host → container para os hooks de documentação viva.
#
# Falha aberta por contrato (LIVING-DOCUMENTATION-TOOLKIT.md §7): container fora
# do ar, timeout ou erro de execução resultam em saída vazia e exit 0. Um hook
# quebrado não pode travar o trabalho.

HOOK="${1:-}"
CONTAINER="${LIVING_DOCS_CONTAINER:-living-docs-toolkit}"
HOST_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

[ -n "$HOOK" ] || exit 0

INPUT="$(cat)"

OUTPUT="$(printf '%s' "$INPUT" | timeout 5 docker exec -i \
  -e LIVING_DOCS_ROOT=/app \
  -e LIVING_DOCS_HOST_ROOT="$HOST_ROOT" \
  "$CONTAINER" node "/app/src/hooks/${HOOK}.ts" 2>/dev/null)"

if [ $? -eq 0 ] && [ -n "$OUTPUT" ]; then
  printf '%s\n' "$OUTPUT"
fi

exit 0
```

Torne executável:
```bash
chmod +x plugin/hooks/run-hook.sh
```

- [ ] **Step 6: Rodar os testes e exercitar o wrapper de verdade**

```bash
docker compose exec toolkit npm test
```

Depois, no host, prove os dois caminhos — o de bloqueio e o de falha aberta:

```bash
# 1. Cria um ADR congelado para o teste
mkdir -p docs/decisions/adr
cat > docs/decisions/adr/ADR-9999-teste.md <<'EOF'
---
id: ADR-9999
title: Teste temporário
status: accepted
owner: "@team"
trigger: Nunca.
last-reviewed: 2026-08-24
---

corpo original
EOF

# 2. HK-1 deve bloquear (exige docs/.ownership.yml presente — se a Task 8 ainda
#    não foi rodada neste repositório, rode `./bin/living-docs init` antes)
export CLAUDE_PROJECT_DIR="$PWD"
echo '{"tool_name":"Edit","tool_input":{"file_path":"'"$PWD"'/docs/decisions/adr/ADR-9999-teste.md","old_string":"corpo original","new_string":"corpo alterado"}}' \
  | ./plugin/hooks/run-hook.sh hk1-append-only

# 3. Falha aberta: container inexistente devolve vazio e exit 0
echo '{}' | LIVING_DOCS_CONTAINER=nao-existe ./plugin/hooks/run-hook.sh hk1-append-only; echo "exit=$?"

# 4. Limpa
rm docs/decisions/adr/ADR-9999-teste.md
```
Esperado: passo 2 imprime o JSON com `"permissionDecision":"deny"`; passo 3 imprime nada e `exit=0`.

- [ ] **Step 7: Commit**

```bash
git add plugin test/plugin/manifest.test.ts
git commit -m "feat: plugin do Claude Code com HK-1 e HK-3 via ponte fail-open"
```

---

### Task 13: `SK-3` `decision-recorder` e os comandos `CM-1`–`CM-3`, `CM-6`

A skill mais importante do toolkit (spec §5): ADR e Open Decisions capturam a única informação que **não** é reconstruível a partir do código. Segue as convenções de autoria da spec §11 — seções na ordem fixa, `description` escrita em linguagem de sintoma (é ela que faz o roteamento acontecer), e checklist final onde cada item corresponde a uma invariante verificada por `CI-*` ou explicitamente marcada como verificação humana.

Os comandos são atalhos finos: **não contêm lógica própria** (spec §1), apenas invocam a skill.

**Files:**
- Create: `plugin/skills/decision-recorder/SKILL.md`
- Create: `plugin/commands/adr.md`
- Create: `plugin/commands/open-decision.md`
- Create: `plugin/commands/debt.md`
- Create: `plugin/commands/docs-setup.md`
- Test: `test/plugin/authoring.test.ts`

**Interfaces:**
- Consumes: `templates/adr.md`, `templates/tdr.md` (Task 8); o CLI `living-docs init` (Task 8).
- Produces: a skill `decision-recorder` e quatro comandos; nenhuma API de código.

- [ ] **Step 1: Escrever o teste falhando**

O teste é o enforcement das convenções de autoria — sem ele, "§11" é promessa.

`test/plugin/authoring.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { parseFrontmatter } from '../../src/frontmatter/parse.ts';

const ROOT = process.env.LIVING_DOCS_ROOT ?? '/app';
const SKILL = readFileSync(join(ROOT, 'plugin/skills/decision-recorder/SKILL.md'), 'utf8');

test('a skill tem frontmatter com name e description', () => {
  const frontmatter = parseFrontmatter(SKILL);
  assert.ok(frontmatter);
  assert.equal(frontmatter.data.name, 'decision-recorder');
  assert.equal(typeof frontmatter.data.description, 'string');
});

test('a description é escrita em linguagem de sintoma, não de categoria', () => {
  const description = String(parseFrontmatter(SKILL)?.data.description ?? '');
  assert.ok(description.length > 120, 'description curta demais para ser encontrada quando importa');
  assert.match(description, /Use quando/i);
  for (const sintoma of ['por que', 'lacuna', 'dívida']) {
    assert.ok(description.toLowerCase().includes(sintoma), `a description deveria conter o sintoma "${sintoma}"`);
  }
});

test('as seções da spec §11 estão presentes e na ordem', () => {
  const secoes = [
    '## Overview',
    '## Do que você é dono',
    '## Quando usar / quando não',
    '## Procedimento',
    '## Fronteiras',
    '## Checklist',
  ];
  let cursor = -1;
  for (const secao of secoes) {
    const at = SKILL.indexOf(secao);
    assert.ok(at !== -1, `seção ausente: ${secao}`);
    assert.ok(at > cursor, `seção fora de ordem: ${secao}`);
    cursor = at;
  }
});

test('o checklist tem caixas marcáveis e cada uma nomeia sua verificação', () => {
  const checklist = SKILL.slice(SKILL.indexOf('## Checklist'));
  const itens = checklist.split('\n').filter((line) => line.trim().startsWith('- [ ]'));
  assert.ok(itens.length >= 6, `checklist com apenas ${itens.length} itens`);
  for (const item of itens) {
    assert.match(item, /CI-\d|HK-\d|humano/i, `item sem verificação nomeada: ${item}`);
  }
});

test('a skill não duplica o conteúdo dos artefatos que governa', () => {
  assert.doesNotMatch(SKILL, /^## Contexto$/m, 'a skill não deve conter o template do ADR');
  assert.match(SKILL, /templates\/adr\.md/, 'ela deve apontar para o template, não copiá-lo');
});

test('os quatro comandos existem, têm description e não contêm lógica própria', () => {
  const esperados = ['adr.md', 'open-decision.md', 'debt.md', 'docs-setup.md'];
  const encontrados = readdirSync(join(ROOT, 'plugin/commands')).sort();
  assert.deepEqual(encontrados, esperados.sort());

  for (const nome of esperados) {
    const source = readFileSync(join(ROOT, 'plugin/commands', nome), 'utf8');
    const frontmatter = parseFrontmatter(source);
    assert.ok(frontmatter, `${nome} sem frontmatter`);
    assert.equal(typeof frontmatter.data.description, 'string');
    assert.ok(source.split('\n').length < 25, `${nome} é longo demais para um atalho fino`);
    assert.match(source, /decision-recorder|living-docs-bootstrap/, `${nome} deve apontar a skill que aciona`);
  }
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
docker compose exec toolkit npm test
```
Esperado: FAIL — `ENOENT` em `plugin/skills/decision-recorder/SKILL.md`.

- [ ] **Step 3: Escrever a skill**

`plugin/skills/decision-recorder/SKILL.md`:
```markdown
---
name: decision-recorder
description: >
  Use quando alguém perguntar "por que isso foi feito assim?", quando você for
  tomar uma decisão custosa de reverter (escolher biblioteca, formato de dado,
  fronteira de módulo, protocolo), quando trombar numa lacuna — comportamento
  sem regra escrita, "não sei o que fazer nesse caso", "isso está documentado?",
  "qual é a regra de X?" — ou quando aceitar de propósito um atalho, gambiarra,
  TODO ou dívida técnica que alguém vai pagar depois. Também para supersedir uma
  decisão antiga que se revelou errada.
---

# decision-recorder — dono de ADR, Open Decisions e Debt Register

## Overview

Três artefatos, uma máquina de estados única:

```
lacuna encontrada ──> DA-nnn (open)
                        │
                        └─ decidido ──> ADR-nnn (draft ──ato humano──> accepted)
                                          │
                                          └─ aceita perda deliberada ──> TDR-nnn
```

Esta skill decide **onde um pedaço de conhecimento mora** e **qual ID ele
recebe**. Ela não decide o mérito: levanta as alternativas e o trade-off,
escreve `draft`/`open`, e para.

Os caminhos, donos e prefixos vêm de `docs/.ownership.yml` — leia-o primeiro,
nunca assuma caminho.

## Do que você é dono

| Artefato | O que é | Forma |
| --- | --- | --- |
| ADR | Por que isto e não aquilo, e o que se aceita perder | Um arquivo por decisão, numerado, append-only |
| Open Decisions (DA) | O que ainda **não** foi decidido | Arquivo único, tabela, mutável |
| TDR | Dívida assumida de propósito, com gatilho de pagamento | Um arquivo por dívida |

Templates: `templates/adr.md` e `templates/tdr.md`. Não reescreva o formato aqui.

## Quando usar / quando não

**Use** para: decisão custosa de reverter; lacuna que bloqueia implementação;
atalho deliberado.

**Não use** para: decisão trivial e barata de reverter (o custo de um ADR é
real — ele entra na leitura de todo mundo para sempre); registrar o que o código
já diz; narrar uma implementação. Um ADR por escolha de nome de variável é
exatamente o "vinte documentos de quatrocentas linhas" que mata a documentação.

**Nunca** use para tomar a decisão. Isso não é seu.

## Procedimento

1. **Leia `docs/.ownership.yml`** e descubra o caminho, o dono e o prefixo de
   cada artefato. Se o arquivo não existir, pare e rode `/docs-setup`.
2. **Classifique** o que está na sua frente:
   - já se sabe o que fazer e é caro reverter → **ADR**;
   - não se sabe → **DA** e **pare a implementação**;
   - sabe-se, escolheu-se o pior de propósito → **TDR**.
3. **Procure antes de criar.** Um `grep` pelo tema nos artefatos existentes. Se
   já existe ADR sobre isso, o caminho é supersedir, não escrever um segundo.
4. **Tome o próximo ID livre** do prefixo, conferindo também `docs/ids-retired.txt`.
   Nunca recicle. Nunca pule.
5. **Escreva a partir do template.** No ADR, exija de si mesmo as **alternativas
   consideradas** com o motivo real do descarte, e a seção **o que se aceita
   perder** — ADR sem consequência negativa declarada é propaganda.
6. **No TDR, exija um gatilho de pagamento observável.** "Quando o volume passar
   de 10k eventos/dia" ou "no primeiro PR que tocar este módulo" passam. "Quando
   der tempo" não é gatilho: recuse e peça a condição.
7. **Feche os dois lados da referência.** DA resolvida aponta o ADR que a fechou;
   o ADR aponta de volta em `relates-to`. Superseder preenche `supersedes` no
   novo e `superseded-by` no antigo.
8. **Pare em `draft`/`open`.** Diga qual decisão falta e a quem ela cabe. Se
   você tentar promover, `HK-3` vai perguntar — e a resposta não é sua.
9. **Rode `living-docs validate`** antes de encerrar.
10. **Cite o ID na mensagem de commit.**

## Fronteiras

| É seu | Não é seu |
| --- | --- |
| Registrar por que isto e não aquilo, e o que se perde | Tomar a decisão |
| Transformar lacuna em item bloqueante com ID | Implementar a regra que falta |
| Registrar a dívida com gatilho de pagamento | Pagar a dívida |
| Propor supersedir um ADR errado | Editar um ADR aceito |
| Apontar o formato do template | Duplicar o conteúdo do artefato aqui |

## Checklist

- [ ] O artefato certo para a natureza do item (ADR / DA / TDR) — verificação humana
- [ ] Frontmatter completo, com `trigger` nomeando um evento e não uma cadência — `CI-1`
- [ ] ID sequencial, não reciclado, conferido contra `docs/ids-retired.txt` — `CI-2`
- [ ] Toda citação a outro ID resolve — `CI-2`
- [ ] `status` é `draft` ou `open`; promoção deixada para uma pessoa — `HK-3`
- [ ] Nenhum ADR aceito foi editado; o caminho usado foi supersedir — `HK-1`
- [ ] ADR declara alternativas consideradas e o que se aceita perder — verificação humana
- [ ] TDR tem gatilho de pagamento observável, não uma data vaga — verificação humana
- [ ] A implementação **não** avançou enquanto havia DA aberta sobre ela — verificação humana
```

- [ ] **Step 4: Escrever os comandos**

`plugin/commands/adr.md`:
```markdown
---
description: Registra uma decisão arquitetural (ADR) em draft, ou supersede uma existente
argument-hint: "[assunto da decisão]"
---

Use a skill `decision-recorder` para registrar um ADR sobre: $ARGUMENTS

Se já existir um ADR sobre esse assunto, o caminho é supersedir — nunca editar o aceito.
Pare em `status: draft`; a aceitação é ato humano.
```

`plugin/commands/open-decision.md`:
```markdown
---
description: Registra uma lacuna (Open Decision) e para a implementação até ela ser decidida
argument-hint: "[a lacuna encontrada]"
---

Use a skill `decision-recorder` para registrar uma Open Decision sobre: $ARGUMENTS

A saída é o ID, não o código. Enquanto o item estiver aberto, ele não tem regra
e **não deve ser implementado** — não invente a regra em silêncio.
```

`plugin/commands/debt.md`:
```markdown
---
description: Registra uma dívida técnica assumida de propósito, com gatilho de pagamento
argument-hint: "[o atalho assumido]"
---

Use a skill `decision-recorder` para registrar um TDR sobre: $ARGUMENTS

Exija um gatilho de pagamento observável. "Quando der tempo" não é gatilho.
```

`plugin/commands/docs-setup.md`:
```markdown
---
description: Cria ou atualiza a moldura de documentação viva do repositório
argument-hint: "[dono padrão, ex.: @team-platform]"
---

Use a skill `living-docs-bootstrap` (CLI: `living-docs init`) para montar a
moldura de documentação viva deste repositório, com dono padrão: $ARGUMENTS

Inventarie antes de criar: adote o que já existe sob outro nome; nunca crie um paralelo.
```

- [ ] **Step 5: Rodar os testes para ver passar**

```bash
docker compose exec toolkit npm test && docker compose exec toolkit npm run typecheck
```
Esperado: todos passando; type-check limpo.

- [ ] **Step 6: Commit**

```bash
git add plugin/skills plugin/commands test/plugin/authoring.test.ts
git commit -m "feat: SK-3 decision-recorder e comandos CM-1..CM-3, CM-6"
```

---

### Task 14: Dogfooding — o toolkit obedece a própria regra que impõe

"O toolkit obedece a própria regra que impõe" (spec §5). Esta task fecha o ciclo: inicializa a documentação viva **deste** repositório, registra em ADR as decisões de arquitetura que o plano tomou, liga o CI, e verifica os critérios de aceite da spec §12 de ponta a ponta.

**Files:**
- Create: `docs/.ownership.yml` (via `living-docs init`)
- Create: `docs/open-decisions.md`, `docs/ids-retired.txt`, `CODEOWNERS` (via `init`)
- Create: `docs/decisions/adr/ADR-0001-runtime-em-container-sem-build.md`
- Create: `docs/decisions/adr/ADR-0002-engine-unica-para-cli-e-hooks.md`
- Create: `.github/workflows/living-docs.yml`
- Create: `README.md`
- Test: `test/acceptance/spec-criteria.test.ts`

**Interfaces:**
- Consumes: tudo das Tasks 1–13.
- Produces: um repositório auto-validado; nenhuma API nova.

- [ ] **Step 1: Escrever o teste de critérios de aceite falhando**

Cobre os critérios 1, 2, 3, 4 e 6 da spec §12 que caem dentro das Fases 0–1. Os critérios 5, 7, 8, 9 dependem de `HK-5`, `CI-4`, `HK-6` e `SK-6` — todos fora deste plano.

`test/acceptance/spec-criteria.test.ts`:
```typescript
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { runInit } from '../../src/cli/init.ts';
import { runValidate } from '../../src/cli/validate.ts';
import { decideHk1 } from '../../src/hooks/hk1-append-only.ts';
import { decideHk3 } from '../../src/hooks/hk3-state-promotion.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';

const ROOT = process.env.LIVING_DOCS_ROOT ?? '/app';
const OPTIONS = { owner: '@team', dryRun: false };

function seedAdr(root: string, status: string): string {
  const file = 'docs/decisions/adr/ADR-0001-teste.md';
  const content = [
    '---',
    'id: ADR-0001',
    'title: Decisão de teste',
    `status: ${status}`,
    'owner: "@team"',
    'trigger: Nunca. Imutável após aceito.',
    'last-reviewed: 2026-08-24',
    '---',
    '',
    'corpo original',
  ].join('\n');
  mkdirSync(join(root, 'docs/decisions/adr'), { recursive: true });
  writeFileSync(join(root, file), content, 'utf8');
  return file;
}

test('critério 1: SK-0 num repositório sem documentação viva não duplica nada', () => {
  withTempRepo({ 'docs/adr/0001-preexistente.md': '# antigo\n' }, (root) => {
    const result = runInit(root, OPTIONS);
    assert.ok(result.adopted.some((entry) => entry.path === 'docs/adr/'));
    assert.equal(existsSync(join(root, 'docs/decisions/adr')), false);
    assert.equal(readFileSync(join(root, 'docs/adr/0001-preexistente.md'), 'utf8'), '# antigo\n');
  });
});

test('critério 2: HK-1 nega alterar o corpo de um ADR accepted e permite supersedir', () => {
  withTempRepo({}, (root) => {
    runInit(root, OPTIONS);
    const file = seedAdr(root, 'accepted');
    const env = { root, hostRoots: [root] };

    const negado = decideHk1(
      { tool_name: 'Edit', tool_input: { file_path: file, old_string: 'corpo original', new_string: 'corpo novo' } },
      env,
    );
    assert.equal(negado.action, 'deny');

    const atual = readFileSync(join(root, file), 'utf8');
    const supersedido = atual
      .replace('status: accepted', 'status: superseded')
      .replace('last-reviewed: 2026-08-24', 'last-reviewed: 2026-08-24\nsuperseded-by: ADR-0002');
    const permitido = decideHk1({ tool_name: 'Write', tool_input: { file_path: file, content: supersedido } }, env);
    assert.equal(permitido.action, 'allow');
  });
});

test('critério 3: trigger com cadência falha no CI nomeando o campo', () => {
  withTempRepo({}, (root) => {
    runInit(root, OPTIONS);
    const file = seedAdr(root, 'draft');
    writeFileSync(
      join(root, file),
      readFileSync(join(root, file), 'utf8').replace(
        'trigger: Nunca. Imutável após aceito.',
        'trigger: revisar trimestralmente',
      ),
      'utf8',
    );

    const result = runValidate(root);
    assert.equal(result.exitCode, 1);
    const finding = result.findings.find((f) => f.ruleId === 'CI-1' && /trigger/.test(f.message));
    assert.ok(finding, 'CI-1 deveria acusar o campo trigger');
    assert.match(finding.message, /trimestral/i);
  });
});

test('critério 4: promover uma decisão exige ato humano — HK-3 pergunta', () => {
  withTempRepo({}, (root) => {
    runInit(root, OPTIONS);
    const file = seedAdr(root, 'draft');
    const decision = decideHk3(
      { tool_name: 'Edit', tool_input: { file_path: file, old_string: 'status: draft', new_string: 'status: accepted' } },
      { root, hostRoots: [root] },
    );
    assert.equal(decision.action, 'ask');
  });
});

test('este repositório passa nos próprios checks', () => {
  assert.ok(existsSync(join(ROOT, OWNERSHIP_PATH)), 'rode `living-docs init` antes');
  const result = runValidate(ROOT);
  assert.deepEqual(result.findings, [], JSON.stringify(result.findings, null, 2));
  assert.equal(result.exitCode, 0);
});
```

- [ ] **Step 2: Rodar o teste para ver falhar**

```bash
docker compose exec toolkit npm test
```
Esperado: FAIL — `docs/.ownership.yml` ainda não existe neste repositório.

- [ ] **Step 3: Inicializar a documentação viva deste repositório**

```bash
./bin/living-docs init --owner "@dan"
./bin/living-docs validate
```
Esperado: `init` criando `docs/.ownership.yml`, `docs/ids-retired.txt`, `docs/open-decisions.md`, `CODEOWNERS`, `docs/decisions/adr/` e `docs/decisions/debt/`; `validate` sem violações.

- [ ] **Step 4: Registrar as duas decisões de arquitetura em ADR**

O plano tomou duas decisões caras de reverter. Elas precisam existir como ADR — se o toolkit não registra as próprias, ele é propaganda.

`docs/decisions/adr/ADR-0001-runtime-em-container-sem-build.md`:
```markdown
---
id: ADR-0001
title: Runtime em container Docker, TypeScript sem build step
status: draft
owner: "@dan"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-24
relates-to: []
supersedes: null
superseded-by: null
---

# ADR-0001 — Runtime em container Docker, TypeScript sem build step

## Contexto

O host de desenvolvimento não tem Node instalado e não deve passar a ter: a
premissa do projeto é que nada além de Docker seja exigido de quem clona o
repositório. Ao mesmo tempo, os hooks rodam a cada `Edit`/`Write` do agente e
têm teto de 5 s (LIVING-DOCUMENTATION-TOOLKIT.md §7), o que descarta qualquer
solução que crie um container por invocação.

## Alternativas consideradas

- **`docker compose run --rm` por invocação** — descartada: paga a criação de um
  container a cada hook, e o custo cresce com o tamanho da imagem.
- **TypeScript compilado para `dist/`** — descartada: exige build antes de
  qualquer execução, e um `dist/` desatualizado faz o hook rodar código velho
  silenciosamente. O erro seria invisível justamente no componente que não pode
  falhar de forma invisível.
- **JavaScript puro com JSDoc** — descartada: as interfaces entre os módulos
  (`Finding`, `ArtifactRule`, `HookDecision`) são o contrato que mantém CLI e
  hooks sincronizados; verificá-lo por comentário é mais frágil.

## Decisão

Um container long-running (`living-docs-toolkit`) com o repositório montado em
`/app`; wrappers bash finos (`bin/living-docs`, `plugin/hooks/run-hook.sh`)
fazem `docker exec` para dentro dele. O código é TypeScript executado
diretamente pelo type-stripping nativo do Node 24, com `tsc --noEmit` como
type-checker. Medido: `docker exec` responde em ~160 ms.

## Consequências

### O que se ganha

Zero toolchain no host; nenhum passo de build entre editar e executar; nenhuma
possibilidade de artefato compilado divergir da fonte.

### O que se aceita perder

O container precisa estar de pé — quando não está, o CLI sai com código 2 e os
hooks falham abertos, o que significa que **o enforcement do agente desaparece
silenciosamente enquanto o container estiver parado**. É uma perda real, mitigada
apenas pelo CI, que roda o mesmo código sem depender do estado da máquina de
ninguém. Além disso, ficamos restritos à sintaxe TypeScript apagável: sem `enum`,
sem `namespace`, sem decorators.
```

`docs/decisions/adr/ADR-0002-engine-unica-para-cli-e-hooks.md`:
```markdown
---
id: ADR-0002
title: Uma engine de validação para CLI e hooks
status: draft
owner: "@dan"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-24
relates-to: [ADR-0001]
supersedes: null
superseded-by: null
---

# ADR-0002 — Uma engine de validação para CLI e hooks

## Contexto

O toolkit precisa valer em dois contextos com exigências opostas: no CI, sem
agente presente, onde o enforcement precisa falhar fechado; e durante a edição
pelo agente, onde ele precisa falhar aberto e responder em milissegundos. A
tentação natural é escrever duas implementações.

## Alternativas consideradas

- **Duas implementações independentes** — descartada: viola o corolário 4 da
  spec ("todo check de CI espelha uma regra escrita numa skill") pela raiz. Duas
  implementações da mesma regra divergem, e a divergência aparece exatamente
  quando alguém confia numa delas.
- **Hooks chamando o CLI como subprocesso** — descartada: acrescenta um processo
  por hook e obriga a serializar decisão em texto para reinterpretá-la.

## Decisão

`src/config`, `src/frontmatter`, `src/docs` e `src/ids` formam uma engine única.
`src/cli/` e `src/hooks/` são front-ends finos sobre ela: nenhuma regra é escrita
duas vezes. A assimetria entre os contextos fica isolada em duas linhas — o CLI
sai com 1 em erro, o wrapper de hook sempre sai com 0.

## Consequências

### O que se ganha

Uma regra, um lugar. Um check novo é um arquivo em `src/checks/` mais uma linha
no registry, e ele passa a valer nos dois contextos.

### O que se aceita perder

Os hooks carregam mais código do que precisariam (`loadOwnership` parseia o
`.ownership.yml` inteiro para responder sobre um arquivo), e mudanças na engine
afetam simultaneamente CI e hooks — não há como evoluir um sem revalidar o outro.
```

- [ ] **Step 5: Ligar o CI**

Roda na **mesma imagem** que o desenvolvimento — é o que garante que "passou aqui" signifique "passa lá".

`.github/workflows/living-docs.yml`:
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

      - name: Construir a imagem
        run: docker compose build

      - name: Instalar dependências
        run: docker compose run --rm toolkit npm ci

      - name: Testes
        run: docker compose run --rm toolkit npm test

      - name: Type-check
        run: docker compose run --rm toolkit npm run typecheck

      - name: CI-1 e CI-2 — documentação viva
        run: docker compose run --rm toolkit node /app/src/cli/index.ts validate
```

- [ ] **Step 6: Escrever o README**

`README.md`:
```markdown
# living-docs-toolkit

Documentação viva com dono, gatilho e enforcement — Fases 0–1 da spec
`LIVING-DOCUMENTATION-TOOLKIT.md`: ADR, Open Decisions e Debt Register, os
checks `CI-1`/`CI-2`, e os hooks `HK-1`/`HK-3`.

**Nada roda no host além de Docker.**

## Uso

```bash
docker compose up -d          # sobe o container de trabalho
./bin/living-docs init        # cria a moldura (SK-0)
./bin/living-docs validate    # roda CI-1 e CI-2
```

Desenvolvimento:

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

## Plugin do Claude Code

`plugin/` traz a skill `decision-recorder` (`/adr`, `/open-decision`, `/debt`,
`/docs-setup`) e os hooks `HK-1` (bloqueia editar item congelado) e `HK-3`
(promoção de estado exige ato humano). Os hooks falham abertos: com o container
parado, eles não bloqueiam nada — o enforcement que sobrevive a isso é o CI.

## O que está fora

`SK-1`, `SK-2`, `SK-4`–`SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-4`–`HK-7`,
`CI-3`–`CI-8`, `CM-4`, `CM-5`, `CM-7` — Fases 2 a 7 da spec.
```

- [ ] **Step 7: Rodar tudo e conferir os critérios**

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
./bin/living-docs validate; echo "exit=$?"
```
Esperado: todos os testes passando, incluindo os cinco critérios de aceite; `validate` com `exit=0`.

- [ ] **Step 8: Commit**

```bash
git add docs CODEOWNERS .github README.md test/acceptance
git commit -m "feat: dogfooding do toolkit no próprio repositório (ADR-0001, ADR-0002)"
```

---

## Cobertura da spec e o que ficou fora

| Peça da spec | Onde | Situação |
| --- | --- | --- |
| §2 Frontmatter padronizado | Tasks 2, 4, 5 | Implementado |
| §3 Layout, granularidade, `.ownership.yml` | Tasks 3, 4, 8 | Implementado |
| §4 Ciclo de vida (ADR/DA/TDR) | Task 4 (`STATUS_MACHINE`), 10, 11 | Implementado |
| §5 `SK-0` living-docs-bootstrap | Task 8 (`init`) + Task 13 (`/docs-setup`) | Implementado |
| §5 `SK-3` decision-recorder | Task 13 | Implementado |
| §7 `HK-1`, `HK-3` | Tasks 10, 11, 12 | Implementado |
| §8 Rastreabilidade por ID (citações) | Task 6 | Parcial — `CI-2` (citação resolve); pares bidirecionais são `CI-3`, Fase 2 |
| §9 `CI-1`, `CI-2` | Tasks 5, 6 | Implementado |
| §10 `CM-1`, `CM-2`, `CM-3`, `CM-6` | Task 13 | Implementado |
| §11 Convenções de autoria | Task 13 (com teste de enforcement) | Implementado |
| §12 Critérios de aceite 1, 2, 3 | Task 14 | Verificados por teste |

**Deliberadamente fora deste plano** (Fases 2–7 da spec §10, a serem cobertas por
planos próprios): `SK-1` charter-keeper, `SK-2` glossary-keeper, `SK-4`
requirements-keeper, `SK-5` contract-keeper, `SK-6` working-agreements-keeper,
`SK-7` release-historian, `AG-1` docs-divergence-auditor, `AG-2`
decision-adversary, `HK-2` (artefato gerado), `HK-4`–`HK-7`, `CI-3`
(traceability), `CI-4` (staleness), `CI-5` (contract drift), `CI-6` (changelog),
`CI-7` (ownership coverage), `CI-8` (links), `CM-4` `/term`, `CM-5`
`/docs-audit`, `CM-7` `/release`.

Critérios de aceite §12 que **não** são verificáveis nas Fases 0–1, por
dependerem de peças fora do escopo ou de julgamento que teste unitário não
alcança: 4 (resultado de procedimento de agente — `SK-3` abre `DA-nnn` e para; a
skill declara a invariante, o teste unitário não a afirma), 5 (`HK-5`), 6
(`HK-2`/`CI-5`), 7 (`CI-4`), 8 (`HK-6`), 9 (`SK-6`), 10 (julgamento humano
contínuo).
