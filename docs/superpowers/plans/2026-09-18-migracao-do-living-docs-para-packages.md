# Migração do living-docs para packages (fatia física): plano de implementação

> **Para quem executar:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** mover o `@esliph/living-docs` da raiz do repositório para
`packages/living-docs/`, com o pacote e o plugin no mesmo diretório, sem mudar o
que ele faz. Provar que o plugin funciona copiado sozinho para o cache do
marketplace.

**Arquitetura:** primeiro um `git mv` estrutural, depois os reparos. A raiz vira
um workspace npm privado (`esliph`) que só guarda o ferramental compartilhado. O
pacote declara as próprias dependências e tem lockfile próprio, gerado fora do
workspace. Toolkit e checkout deixam de coincidir: os testes que leem o
repositório real passam a achá-lo por `checkoutRoot()`, e `toolkitRoot()` fica
só com o que é do toolkit.

**Tech Stack:** Node ≥ 24 sem passo de build, `node --test`, npm workspaces,
bash (wrapper de hooks), GitHub Actions, Docker Compose (caminho opcional).

**Spec:** `docs/superpowers/specs/2026-09-18-migracao-do-living-docs-para-packages-design.md`.
O plano argumenta a partir dela, e quem executar lê as duas.

## Restrições globais

- **A invariante:** mesmos IDs de check (`CI-n`) e de hook (`HK-n`), mesmos nomes
  de hook, mesmos subcomandos, `.ownership.yml` em `version: 1`, mesmas
  variáveis `LIVING_DOCS_*`, mesma saída. **Um teste que muda de resultado, e não
  só de caminho, é defeito da migração.** Se isso acontecer, pare e investigue
  antes de ajustar o teste.
- **`git mv`, nunca copiar e apagar.** É o que preserva o histórico por arquivo.
- **Cada commit fica verde** em `npm test`, `npm run typecheck`,
  `node packages/living-docs/src/cli/index.ts validate` e
  `node packages/living-docs/src/cli/index.ts drift`, todos rodados da raiz do
  checkout.
- **`toolkitRoot()` e `src/core/roots.ts` não mudam de comportamento.** Só o
  comentário muda.
- **Texto entregue não cita o rastro interno.** `hooks/run-hook.sh`, skills,
  comandos, templates e mensagens em string de `src/` ficam sem ID de artefato
  (`ADR-`, `RN-`, …), sem `spec §n` e sem `docs/superpowers/`. Comentário de
  código pode citar. Quem cobra é `test/distribution/internal-trail.test.ts`.
- **Texto `audience: external` não cita ID de artefato.** Isso vale para
  `README.md` e `CHANGELOG.md`, e quem cobra é o `CI-11`.
- **`last-reviewed` não se bumpa** nos documentos editados, a menos que o
  `validate` exija.
- **Mensagem de commit** em português, `tipo(ID): assunto`, terminada com
  `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.
- **Os ADRs congelados e os planos/specs antigos não se editam**, mesmo citando
  `plugin/…` ou `src/cli/index.ts`. São registro histórico, e `HK-1` bloqueia os
  ADRs.
- **Type-check é `npm run typecheck`**, nunca `tsc` direto.
- **Hooks durante a execução:** o `HK-4` vai lembrar do documento dono a cada
  arquivo vigiado editado, e o `HK-5` vai perguntar no commit. É o esperado. No
  commit da Tarefa 1 a resposta é o rótulo `Docs: none — …`; nos outros, o
  documento dono viaja na própria tarefa ou na Tarefa 3.

## Linha de partida (medida em 2026-09-18, antes do primeiro `git mv`)

| Medida | Valor |
| --- | --- |
| `npm test` (living-docs, raiz) | **548** testes, 548 passam |
| `npm test --workspace packages/ownership` | **167** testes, todos passando depois de `npm ci`; sem ele, `dev-resolution` falha por symlink ausente em `node_modules` |
| `validate` | nenhuma violação, 1 artefato gerado, 7 caminhos visíveis ao consumidor, 14 vínculos código→doc |
| `drift` | nenhuma violação |
| `git hash-object docs/contracts/checks.gen.md` | `6d6030f810f62510db0c772145e24daaef3ab193` |
| `npm run lint:check` | **28 erros e 915 avisos**, todos já existentes: 7 em `packages/ownership/`, 21 em `src/` e `test/` |

A spec pede `lint:check` verde. O lint **já não está verde** antes da mudança, e
corrigir esses erros mudaria código, o que está fora desta fatia. O critério
deste plano é outro: **nenhum erro novo**, ou seja, os mesmos 28 erros nos mesmos
arquivos (agora sob `packages/living-docs/`). A divergência vai para a descrição
do PR (Tarefa 6).

## Mapa de arquivos

**Movidos por `git mv`:**

| De | Para |
| --- | --- |
| `src/` | `packages/living-docs/src/` |
| `test/` | `packages/living-docs/test/` |
| `templates/` | `packages/living-docs/templates/` |
| `plugin/.claude-plugin/` | `packages/living-docs/.claude-plugin/` |
| `plugin/hooks/` | `packages/living-docs/hooks/` |
| `plugin/commands/` | `packages/living-docs/commands/` |
| `plugin/skills/` | `packages/living-docs/skills/` |
| `plugin/agents/` | `packages/living-docs/agents/` |
| `tsconfig.json` | `packages/living-docs/tsconfig.json` |

**Criados:** `packages/living-docs/package.json`, `packages/living-docs/package-lock.json`,
`packages/living-docs/test/helpers/checkout.ts`,
`packages/living-docs/test/distribution/plugin-cache.test.ts`,
`packages/living-docs/test/distribution/lockfile.test.ts`, e o ADR draft do nome do
projeto.

**Modificados:** `package.json`, `package-lock.json`, `.prettierignore`,
`.claude-plugin/marketplace.json`, `docs/.ownership.yml`, `hooks/run-hook.sh`,
`src/core/roots.ts` (comentário), `src/checks/ci10-trigger-routing.ts`, 13 arquivos
de teste, `.github/workflows/living-docs.yml`, `.github/workflows/wrapper-docker.yml`,
`compose.yaml`, `Dockerfile`, `bin/living-docs`, `bin/dev` (só comentário),
`CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, `CHANGELOG.md`.

Nas Tarefas 1 a 5, todo caminho dentro do pacote aparece por extenso a partir da
raiz do checkout (`packages/living-docs/...`).

---

### Tarefa 1: Movimento e o mínimo para ficar verde

Commit grande e mecânico. A revisão lê "o que mudou de caminho". O
`marketplace.json` entra aqui, e não na Tarefa 3 como a spec §8 sugere, porque
`test/plugin/manifest.test.ts` afirma que a fonte do marketplace existe e tem
manifesto: sem mudá-lo junto, o commit não fica verde.

**Files:**
- Move: tudo da tabela "Movidos por `git mv`"
- Create: `packages/living-docs/package.json`, `packages/living-docs/package-lock.json`, `packages/living-docs/test/helpers/checkout.ts`
- Modify: `package.json`, `package-lock.json`, `.prettierignore`, `.claude-plugin/marketplace.json`, `docs/.ownership.yml`
- Modify: `packages/living-docs/hooks/run-hook.sh`, `packages/living-docs/src/core/roots.ts:3-5`, `packages/living-docs/src/checks/ci10-trigger-routing.ts:51,180`
- Modify (testes): `budget`, `ci10-trigger-routing`, `spec-criteria`, `contracts/drift`, `docs/maintenance`, `docs/agent-contract`, `docs/contracts`, `docs/language-and-intent`, `docs/release-history`, `distribution/internal-trail`, `plugin/authoring`, `plugin/manifest`, `plugin/wrapper-docker`

**Interfaces:**
- Produz: `checkoutRoot(): string` em `packages/living-docs/test/helpers/checkout.ts`, que devolve `resolve(join(toolkitRoot(), '..', '..'))`. As Tarefas 2 e 4 importam daqui.
- Produz: o layout do pacote. Raiz do plugin = raiz do pacote = `toolkitRoot()`.

- [ ] **Passo 1: Confirmar a linha de partida**

Rode da raiz do checkout:

```bash
npm ci
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm test --workspace packages/ownership 2>&1 | grep -E "^ℹ (tests|pass|fail)"
node src/cli/index.ts validate
node src/cli/index.ts drift
git hash-object docs/contracts/checks.gen.md
npm run lint:check 2>&1 | tail -2
```

Esperado: os valores da tabela "Linha de partida". Se algum divergir, pare e
reporte antes de mover qualquer coisa.

- [ ] **Passo 2: Mover com `git mv`**

```bash
mkdir -p packages/living-docs
git mv src packages/living-docs/src
git mv test packages/living-docs/test
git mv templates packages/living-docs/templates
git mv plugin/.claude-plugin packages/living-docs/.claude-plugin
git mv plugin/hooks packages/living-docs/hooks
git mv plugin/commands packages/living-docs/commands
git mv plugin/skills packages/living-docs/skills
git mv plugin/agents packages/living-docs/agents
git mv tsconfig.json packages/living-docs/tsconfig.json
git ls-files plugin            # esperado: nenhuma linha
rmdir plugin 2>/dev/null || true
git ls-files -s packages/living-docs/hooks/run-hook.sh   # esperado: começa com 100755
```

O checkout mora no OneDrive. Se um `git mv` falhar com "Permission denied",
pause a sincronização do OneDrive e repita o mesmo comando. Não copie à mão.

O `tsconfig.json` movido já é idêntico ao de `packages/ownership/tsconfig.json`.
Confira com `diff packages/living-docs/tsconfig.json packages/ownership/tsconfig.json`
(esperado: nenhuma diferença).

- [ ] **Passo 3: Ver o vermelho**

```bash
cd packages/living-docs && node --test "test/**/*.test.ts" 2>&1 | grep -E "^ℹ (tests|pass|fail)"; cd ../..
```

Esperado: falhas em `manifest`, `authoring`, `internal-trail`, `ci10-trigger-routing`,
`budget`, `wrapper-docker`, `release-history`, `agent-contract`, `contracts`,
`language-and-intent`, `maintenance`, `drift` e `spec-criteria`, todas por caminho
(`ENOENT`, `plugin/…`, ou `docs/` procurado dentro do pacote). Nenhuma falha deve
ser de lógica. As dependências resolvem porque o `node_modules` da raiz ainda
existe.

- [ ] **Passo 4: `package.json` da raiz**

Substitua o conteúdo de `package.json` por:

```json
{
  "name": "esliph",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "workspaces": ["packages/*"],
  "scripts": {
    "test": "npm test --workspaces --if-present",
    "typecheck": "npm run typecheck --workspaces --if-present",
    "lint": "eslint . --fix",
    "lint:check": "eslint .",
    "format": "prettier --write .",
    "format:check": "prettier --check ."
  },
  "devDependencies": {
    "@eslint/js": "^10.0.1",
    "eslint": "^10.9.1",
    "eslint-config-prettier": "^10.1.8",
    "eslint-plugin-prettier": "^5.5.6",
    "globals": "^17.12.0",
    "prettier": "^3.9.6",
    "typescript": "^5.9.0",
    "typescript-eslint": "^8.69.0"
  }
}
```

`typescript` fica na raiz porque o `typescript-eslint` o exige como par, e também
no pacote porque o pacote declara o que usa.

- [ ] **Passo 5: `package.json` do pacote**

Crie `packages/living-docs/package.json`:

```json
{
  "name": "@esliph/living-docs",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "engines": {
    "node": ">=24"
  },
  "bin": {
    "living-docs": "./src/cli/index.ts"
  },
  "scripts": {
    "test": "node --test \"test/**/*.test.ts\"",
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

`test/distribution/internal-trail.test.ts` importa `typescript` e
`test/plugin/wrapper-docker.test.ts` importa `picomatch`. Os dois estão
declarados acima. O hoist do workspace esconderia uma dependência esquecida no
checkout, e ela só quebraria no cache.

- [ ] **Passo 6: Lockfiles**

O lockfile do pacote é gerado **fora** do workspace, como o do `ownership`:

```bash
tmp="$(mktemp -d)"
cp packages/living-docs/package.json "$tmp/"
(cd "$tmp" && npm install --package-lock-only --ignore-scripts)
cp "$tmp/package-lock.json" packages/living-docs/package-lock.json
rm -rf "$tmp"
```

Depois, o da raiz, com os dois workspaces:

```bash
npm install
npm ci
```

Esperado: `npm ci` sem erro. `grep -n '"packages/living-docs"' package-lock.json`
acha a entrada do workspace, e `head -4 package-lock.json` mostra `"name": "esliph"`.

- [ ] **Passo 7: `hooks/run-hook.sh` sobe um nível**

Em `packages/living-docs/hooks/run-hook.sh`, troque o bloco de comentário das
duas raízes e a linha `TOOLKIT_ROOT`:

```bash
# Duas raízes, e elas não se confundem: o código do **toolkit** sai
# do caminho deste script, um nível acima dele — hooks/ e src/ moram lado a
# lado na raiz do plugin, que é o diretório que o cache do marketplace copia
# inteiro. O `.ownership.yml` lido é o do **repositório validado**, que vem de
# CLAUDE_PROJECT_DIR.

HOOK="${1:-}"
TOOLKIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
```

O resto do arquivo não muda. Esse texto é entregue a quem instala, então não
pode citar ID de artefato nem `spec §n`. Confira que o modo continua
`100755` (`git ls-files -s packages/living-docs/hooks/run-hook.sh`) e que o
arquivo não ganhou `\r`.

- [ ] **Passo 8: `roots.ts` (comentário) e `CI-10` (código)**

Em `packages/living-docs/src/core/roots.ts`, só a primeira linha do JSDoc de
`toolkitRoot`:

```ts
/**
 * Raiz do **toolkit**: onde moram `src/`, `templates/` e o plugin (`skills/`,
 * `hooks/`, `commands/`, `agents/`, `.claude-plugin/`).
```

Em `packages/living-docs/src/checks/ci10-trigger-routing.ts`, linha 51:

```ts
  const dir = join(root, 'skills')
```

e, na mensagem de `fix` (linha 180):

```ts
              'confira o nome em `skills/`, na raiz do toolkit.',
```

- [ ] **Passo 9: Helper `checkoutRoot()`**

Crie `packages/living-docs/test/helpers/checkout.ts`:

```ts
import { join, resolve } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

/**
 * Raiz do checkout deste repositório: onde moram `docs/`, `CLAUDE.md`,
 * `CHANGELOG.md`, `bin/`, `.claude-plugin/marketplace.json` e o
 * `docs/.ownership.yml` que os testes de dogfooding leem.
 *
 * Não é `toolkitRoot()`: desde que o toolkit mora em `packages/living-docs/`,
 * toolkit e repositório validado deixaram de coincidir neste projeto (RNF-0003).
 * E não é `repoRoot()`: ele lê o diretório de trabalho, e `npm test --workspaces`
 * roda com o cwd no pacote. O pacote fica dois níveis abaixo do checkout.
 */
export function checkoutRoot(): string {
  return resolve(join(toolkitRoot(), '..', '..'))
}
```

Derivar de `toolkitRoot()` é o que mantém o caminho conteinerizado coerente: lá,
`LIVING_DOCS_TOOLKIT_ROOT` aponta para o pacote dentro do checkout montado.

- [ ] **Passo 10: Testes que leem o checkout inteiro por `checkoutRoot()`**

Em cada arquivo abaixo, todos sob `packages/living-docs/test/`, troque o import
da raiz e a constante. Nada mais muda no arquivo.

`docs/contracts.test.ts`, `docs/language-and-intent.test.ts`, `docs/release-history.test.ts`:

```ts
// remova: import { toolkitRoot } from '../../src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
```

`acceptance/spec-criteria.test.ts`, `contracts/drift.test.ts`, `docs/maintenance.test.ts`:

```ts
// remova: import { repoRoot } from '../../src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
```

`plugin/wrapper-docker.test.ts` lê `bin/` e `docs/.ownership.yml`, os dois do checkout:

```ts
// remova: import { toolkitRoot } from '../../src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
```

- [ ] **Passo 11: Testes que misturam as duas raízes**

`packages/living-docs/test/checks/budget.test.ts`: o conjunto de checks roda
contra o checkout, e o diff simulado precisa continuar tocando um caminho visível
ao consumidor.

```ts
// troque o import de toolkitRoot por:
import { checkoutRoot } from '../helpers/checkout.ts'
```

```ts
  // nos dois testes:
  const root = checkoutRoot()
```

```ts
  return `packages/living-docs/src/cli/index.ts${NUL}CHANGELOG.md${NUL}`
```

`packages/living-docs/test/checks/ci10-trigger-routing.test.ts`: as skills vêm do
toolkit (linha 182, **não muda**), e o `validate` roda contra o checkout (linha 190).

```ts
import { checkoutRoot } from '../helpers/checkout.ts'
```

```ts
  const findings = runValidate(checkoutRoot()).findings.filter(f => f.ruleId === 'CI-10')
```

`packages/living-docs/test/docs/agent-contract.test.ts`: `CLAUDE.md` e `docs/` vêm
do checkout, e o template vem do toolkit.

```ts
import { toolkitRoot } from '../../src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = checkoutRoot()
```

```ts
  // linha 54:
  const template = readFileSync(join(toolkitRoot(), 'templates/agent-contract.md'), 'utf8')
```

`packages/living-docs/test/distribution/internal-trail.test.ts`: o conjunto de
prefixos internos vem do `.ownership.yml` do checkout, e o texto varrido é do toolkit.

```ts
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = toolkitRoot()
const CONFIG = loadOwnership(checkoutRoot())
```

No teste `RN-0031: o texto do plugin não cita o rastro interno do toolkit`, a
varredura passa a cobrir os cinco diretórios públicos da raiz do plugin:

```ts
/** O que o cache do marketplace entrega de texto do plugin — `src/` e `test/` têm varredura própria ou nenhuma. */
const PLUGIN_DIRS = ['.claude-plugin', 'hooks', 'commands', 'skills', 'agents'] as const

test('RN-0031: o texto do plugin não cita o rastro interno do toolkit', () => {
  const files = PLUGIN_DIRS.flatMap(dir => filesUnder(join(ROOT, dir)))
  const found = files.flatMap(absolute => trailIn(toolkitPath(absolute), readFileSync(absolute, 'utf8')))

  assert.ok(files.length > 10, `varredura vazia demais: ${files.length} arquivo(s)`)
  assert.equal(found.length, 0, `rastro interno do toolkit no plugin:\n${report(found)}`)
})
```

- [ ] **Passo 12: Testes do plugin (`authoring` e `manifest`)**

`packages/living-docs/test/plugin/authoring.test.ts`: `ROOT` continua
`toolkitRoot()`. Troque as quatro ocorrências de `'plugin/skills'` por `'skills'`
e de `'plugin/commands'` por `'commands'` (linhas 14, 20, 105 e 110). A linha 227
(`templates/migration.md`) não muda.

`packages/living-docs/test/plugin/manifest.test.ts`: `ROOT` continua
`toolkitRoot()`. Some-se a raiz do checkout:

```ts
import { join, resolve } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'
import { checkoutRoot } from '../helpers/checkout.ts'

const ROOT = toolkitRoot()
const CHECKOUT = checkoutRoot()
```

Troque os caminhos relativos ao toolkit:

| Antes | Depois |
| --- | --- |
| `'plugin/.claude-plugin/plugin.json'` | `'.claude-plugin/plugin.json'` |
| `'plugin/hooks/hooks.json'` | `'hooks/hooks.json'` |
| `'plugin/hooks/run-hook.sh'` | `'hooks/run-hook.sh'` |
| `'plugin/commands'` e `` `plugin/commands/${name}` `` | `'commands'` e `` `commands/${name}` `` |
| `'plugin/skills'` e `` `plugin/skills/${name}/SKILL.md` `` | `'skills'` e `` `skills/${name}/SKILL.md` `` |
| `'plugin/agents'`, `'plugin/agents/docs-divergence-auditor.md'` | `'agents'`, `'agents/docs-divergence-auditor.md'` |
| `'plugin/skills/decision-recorder/SKILL.md'` | `'skills/decision-recorder/SKILL.md'` |
| nome do teste `toda skill referenciada existe em plugin/skills/` | `toda skill referenciada existe em skills/` |
| mensagens `` `plugin/agents: …` `` | `` `agents: …` `` |

O `git ls-files -s -- hooks/run-hook.sh` com `cwd: ROOT` continua valendo, porque
o caminho é relativo ao cwd.

`SKILL_REFERENCES` lê um arquivo do checkout (`docs/.ownership.yml`). Dê a cada
entrada a sua raiz:

```ts
const SKILL_REFERENCES: readonly { root: string; file: string; pattern: RegExp }[] = [
  ...readdirSync(join(ROOT, 'commands')).map(name => ({
    root: ROOT,
    file: `commands/${name}`,
    pattern: /skill\s+`([a-z][a-z0-9-]*)`/g,
  })),
  { root: ROOT, file: 'src/cli/index.ts', pattern: /skill dona:\s*([a-z][a-z0-9-]*)/g },
  { root: ROOT, file: 'src/config/ownership.ts', pattern: /skill dona:\s*([a-z][a-z0-9-]*)/g },
  { root: ROOT, file: 'templates/ownership.yml', pattern: /^\s*skill:\s*([a-z][a-z0-9-]*)\s*$/gm },
  { root: CHECKOUT, file: 'docs/.ownership.yml', pattern: /^\s*skill:\s*([a-z][a-z0-9-]*)\s*$/gm },
]

function referencedSkills(): Map<string, string[]> {
  const found = new Map<string, string[]>()

  for (const { root, file, pattern } of SKILL_REFERENCES) {
    const source = readFileSync(join(root, file), 'utf8')
    // … o resto do laço não muda
```

O teste de CR mistura as duas raízes:

```ts
test('RNF-0002: nenhum script executável carrega CR — o wrapper roda em bash', () => {
  const scripts = [
    { label: 'bin/dev', path: join(CHECKOUT, 'bin/dev') },
    { label: 'bin/living-docs', path: join(CHECKOUT, 'bin/living-docs') },
    { label: 'hooks/run-hook.sh', path: join(ROOT, 'hooks/run-hook.sh') },
  ]

  for (const { label, path } of scripts) {
    const source = readFileSync(path, 'utf8')

    assert.equal(source.includes('\r'), false, `${label} com CRLF: o shebang quebra com "bad interpreter"`)
  }
})
```

O teste do marketplace lê do checkout e afirma que a fonte **é** o diretório do pacote:

```ts
test('o manifesto de marketplace aponta para o plugin deste repositório', () => {
  const marketplace = JSON.parse(readFileSync(join(CHECKOUT, '.claude-plugin/marketplace.json'), 'utf8')) as Record<string, unknown>
  const plugins = marketplace.plugins as { name: string; source: string; version: string }[]

  // O marketplace identifica quem distribui; o plugin, o que se instala. Os dois
  // com o mesmo nome davam `living-docs@living-docs` no comando de instalação.
  assert.equal(marketplace.name, 'esliph')
  assert.equal(plugins.length, 1)
  assert.equal(plugins[0]?.name, 'living-docs')
  assert.equal(plugins[0]?.source, './packages/living-docs')
  // O diretório do plugin é o do pacote: é o que põe src/, templates/ e o
  // lockfile dentro do que o cache copia.
  assert.equal(resolve(CHECKOUT, plugins[0]?.source ?? ''), ROOT)
  assert.ok(existsSync(join(ROOT, '.claude-plugin/plugin.json')), 'a fonte precisa ter manifesto')

  const plugin = readJson('.claude-plugin/plugin.json')

  assert.equal(plugins[0]?.version, plugin.version, 'duas versões é a garantia de que uma está errada')
})
```

`test/hooks/hk4-watch-reminder.test.ts` **não muda**: o `plugin/skills/**` dali é
fixture de repositório temporário, não caminho deste checkout.

- [ ] **Passo 13: `marketplace.json` e `.prettierignore`**

Em `.claude-plugin/marketplace.json`, só a fonte muda:

```json
      "source": "./packages/living-docs"
```

Em `.prettierignore`, a linha `templates/` vira `packages/living-docs/templates/`.

- [ ] **Passo 14: `docs/.ownership.yml`, caminhos um para um**

Continua em `version: 1`. Só mudam caminhos, e os comentários que os citam.

`cited-by`:

```yaml
  - id-prefix: RF
    …
    cited-by: ['packages/living-docs/test/**']

  - id-prefix: RNF
    …
    cited-by: ['packages/living-docs/test/**']

  - id-prefix: RN
    …
    cited-by: ['packages/living-docs/test/**', 'packages/living-docs/src/**']
```

Não use `packages/*/test/**`: o curinga passaria a contar os testes do `ownership`
e mudaria o resultado do `CI-3`.

`generated`:

```yaml
  - path: docs/contracts/checks.gen.md
    command: node packages/living-docs/src/tools/gen-checks.ts
```

`watches`: os `code` passam a ser, na mesma ordem e com os mesmos `doc`,
`reason` e `consumer-visible` de hoje:

| `code` antes | `code` depois |
| --- | --- |
| `src/checks/**` | `packages/living-docs/src/checks/**` |
| `src/checks/catalog.ts` (as duas regras) | `packages/living-docs/src/checks/catalog.ts` |
| `src/hooks/**` | `packages/living-docs/src/hooks/**` |
| `src/cli/**` (as duas regras) | `packages/living-docs/src/cli/**` |
| `src/core/**` | `packages/living-docs/src/core/**` |
| `plugin/skills/**` | `packages/living-docs/skills/**` |
| `src/config/ownership.ts` | `packages/living-docs/src/config/ownership.ts` |
| `plugin/**` | `packages/living-docs/{.claude-plugin,hooks,commands,skills,agents}/**` |
| `templates/**` | `packages/living-docs/templates/**` |
| `.github/workflows/**`, `bin/**` | não mudam |

`plugin/**` vira um glob com chaves, e não cinco entradas. Assim o número de
vínculos continua 14 e o de caminhos visíveis continua 7. O pacote inteiro não
pode ser o curinga, porque `src/` e `test/` não são superfície pública. O
picomatch expande a chave e casa `.claude-plugin/` mesmo sem `dot: true`
(verificado em 2026-09-18). O `plugin/**` antigo não casava
`plugin/.claude-plugin/plugin.json`, então o manifesto passa a contar como
visível ao consumidor. É a lista que a spec §5 fixa.

No comentário acima das regras `consumer-visible`, troque
`test/docs/release-history.test.ts` por `packages/living-docs/test/docs/release-history.test.ts`.

`consumer-visible-paths`:

```yaml
consumer-visible-paths:
  - 'packages/living-docs/src/cli/**'
  - 'packages/living-docs/src/checks/catalog.ts'
  - 'packages/living-docs/src/config/ownership.ts'
  - 'packages/living-docs/{.claude-plugin,hooks,commands,skills,agents}/**'
  - 'packages/living-docs/templates/**'
  - 'bin/**'
  - '.github/workflows/**'
```

`documents:`, `artifacts[].path` e `docs/superpowers/` não mudam. `CODEOWNERS`
também não muda.

- [ ] **Passo 15: Cobrir o glob novo num teste existente**

Em `packages/living-docs/test/docs/release-history.test.ts`, some ao teste
`RN-0013: este repositório declara o que é visível ao consumidor` (sem criar
teste novo, para a contagem não mudar):

```ts
import picomatch from 'picomatch'
```

```ts
test('RN-0013: este repositório declara o que é visível ao consumidor', () => {
  assert.ok(config.consumerVisiblePaths.length > 0, 'consumer-visible-paths vazio: CI-6 estaria instalado e inerte')

  // O pacote é o plugin, mas só a superfície do plugin é pública: a lista é
  // explícita, e um curinga no pacote inteiro puxaria src/ e test/.
  const visivel = picomatch(config.consumerVisiblePaths)

  for (const path of [
    'packages/living-docs/.claude-plugin/plugin.json',
    'packages/living-docs/hooks/run-hook.sh',
    'packages/living-docs/commands/adr.md',
    'packages/living-docs/skills/decision-recorder/SKILL.md',
    'packages/living-docs/agents/decision-adversary.md',
    'packages/living-docs/templates/adr.md',
    'packages/living-docs/src/cli/index.ts',
  ]) {
    assert.ok(visivel(path), `${path} deveria ser visível ao consumidor`)
  }
  for (const path of ['packages/living-docs/src/core/roots.ts', 'packages/living-docs/test/smoke.test.ts', 'packages/living-docs/package.json']) {
    assert.equal(visivel(path), false, `${path} não é superfície pública`)
  }
})
```

- [ ] **Passo 16: Ver o verde, com a mesma contagem**

```bash
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node packages/living-docs/src/cli/index.ts validate
node packages/living-docs/src/cli/index.ts drift
git hash-object docs/contracts/checks.gen.md
npm run lint:check 2>&1 | tail -2
```

Esperado:
- dois blocos de `npm test`: living-docs com **548 testes, 548 passam**; ownership
  com **167, 167 passam**;
- `typecheck` sem erro nos dois pacotes;
- `validate` com as quatro linhas da linha de partida, idênticas (nenhuma
  violação, 1 gerado, 7 caminhos, 14 vínculos);
- `drift` sem violação e hash `6d6030f810f62510db0c772145e24daaef3ab193`;
- lint com **28 erros**, os mesmos arquivos de antes, agora sob `packages/living-docs/`.

Se a contagem cair, algum arquivo de teste deixou de casar o glob: confira com
`git status` que nada ficou fora de `packages/living-docs/test/`. Se um teste
mudou de **resultado**, isso é defeito da migração: pare e investigue.

- [ ] **Passo 17: Commit**

```bash
git add -A
git status --short | grep -v '^R ' | head -40   # revise: só os modificados/criados listados acima
git commit -F - <<'EOF'
refactor(ADR-0025): move o living-docs para packages/living-docs

git mv de src/, test/, templates/ e do conteúdo de plugin/ para a raiz do
pacote: o diretório do plugin passa a ser o do pacote. A raiz vira o workspace
privado `esliph`, e o pacote declara as próprias dependências com lockfile
próprio. run-hook.sh sobe um nível, CI-10 lê skills/ da raiz do toolkit, os
testes de dogfooding acham o checkout por checkoutRoot() (RNF-0003) e
docs/.ownership.yml reescreve os caminhos um para um.

Docs: none — mover arquivo não muda o que o código faz; os caminhos vigiados mudaram de lugar, não de regra.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

O `HK-5` vai perguntar sobre caminho vigiado sem o documento dono. A resposta
deste commit é o rótulo acima (spec §8, `ADR-0010`).

---

### Tarefa 2: Raiz, CI, Docker e wrapper

**Files:**
- Modify: `packages/living-docs/test/plugin/wrapper-docker.test.ts` (asserção do CLI)
- Modify: `bin/living-docs`, `bin/dev` (só comentários), `compose.yaml`, `Dockerfile`
- Modify: `.github/workflows/living-docs.yml`, `.github/workflows/wrapper-docker.yml`

**Interfaces:**
- Consome: `checkoutRoot()` (Tarefa 1), já usado em `wrapper-docker.test.ts`.
- Produz: o CLI invocado de fora como `node packages/living-docs/src/cli/index.ts`. As Tarefas 3 e 6 usam esse caminho.

- [ ] **Passo 1: Teste falhando**

Em `packages/living-docs/test/plugin/wrapper-docker.test.ts`, no teste
`RNF-0006: bin/living-docs delega a bin/dev, sem lógica de container própria`:

```ts
  assert.match(wrapper, /node\s+packages\/living-docs\/src\/cli\/index\.ts/, 'e é ele, não bin/dev, que conhece o CLI')
```

Não mude a asserção sobre `bin/dev` (`doesNotMatch(/src\/cli\/index\.ts/)`), que
continua valendo.

- [ ] **Passo 2: Ver falhar**

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "✖|^ℹ (tests|fail)"
```

Esperado: 1 falha, `RNF-0006: bin/living-docs delega a bin/dev…`.

- [ ] **Passo 3: `bin/living-docs`**

```bash
#!/usr/bin/env bash
# Roda o CLI do toolkit pelo caminho conteinerizado opcional (RNF-0006).
# Delegação, não implementação: toda a conversa com o daemon mora em bin/dev, e
# um segundo lugar que a tivesse seria um segundo lugar para divergir (ADR-0016).
#
# No host, o comando equivalente é `node packages/living-docs/src/cli/index.ts …`,
# rodado da raiz do checkout, e é ele que o CI reproduz em todo PR (RNF-0002).
exec "$(dirname "${BASH_SOURCE[0]}")/dev" node packages/living-docs/src/cli/index.ts "$@"
```

Edite com a ferramenta de edição, sem recriar o arquivo, para o modo `100755` se
manter. Confira com `git ls-files -s bin/living-docs`.

- [ ] **Passo 4: `bin/dev`, só os comentários que ficaram falsos**

Linha 10: `plugin/hooks/run-hook.sh invoca node direto.` vira
`packages/living-docs/hooks/run-hook.sh invoca node direto.`

Linhas 14-16, o comentário acima de `ROOT=`:

```bash
# Um nível acima de bin/ — a mesma derivação que
# packages/living-docs/hooks/run-hook.sh faz para achar a raiz do plugin
# (ADR-0003: a raiz sai do caminho do próprio arquivo, nunca do diretório de
# trabalho de quem chamou).
```

Nenhuma linha de código de `bin/dev` muda. O `npm ci` continua na raiz, e o hoist
do workspace mantém o `node_modules/yaml` que o bootstrap procura.

- [ ] **Passo 5: `compose.yaml` e `Dockerfile`**

`compose.yaml`, em `environment`:

```yaml
      LIVING_DOCS_TOOLKIT_ROOT: /opt/living-docs/packages/living-docs
```

O volume continua montando o checkout em `/opt/living-docs`.

`Dockerfile`: o `ENV` diz o mesmo, para que um `docker run` sem o compose não
aponte o toolkit para a raiz do checkout (a spec §6 só cita o compose, mas deixar
os dois divergentes seria a armadilha):

```dockerfile
ENV LIVING_DOCS_TOOLKIT_ROOT=/opt/living-docs/packages/living-docs \
    LIVING_DOCS_REPO_ROOT=/workspace
```

- [ ] **Passo 6: `.github/workflows/living-docs.yml`**

Remova os passos `Testes — @esliph/ownership` e `Type-check — @esliph/ownership`,
porque `npm test` e `npm run typecheck` da raiz já fazem o fan-out. Troque
`node src/cli/index.ts` por `node packages/living-docs/src/cli/index.ts` nos quatro
passos (`validate`, `validate --base`, `drift`, `changelog`). O resto não muda.

- [ ] **Passo 7: `.github/workflows/wrapper-docker.yml`**

No âncora `&wrapper-paths`, depois de `'package-lock.json'`:

```yaml
      - 'packages/*/package.json'
      - 'packages/*/package-lock.json'
```

No último passo:

```yaml
        run: bin/dev node packages/living-docs/src/cli/index.ts validate
```

- [ ] **Passo 8: Ver o verde**

```bash
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node packages/living-docs/src/cli/index.ts validate
node packages/living-docs/src/cli/index.ts drift
```

Esperado: 548/548 e 167/167, e `validate` e `drift` iguais à linha de partida.
Se o Docker estiver disponível, rode também `bin/dev npm test` e
`bin/living-docs validate`. O CI do PR roda os dois de qualquer forma, e a
Tarefa 6 exige o resultado verde.

- [ ] **Passo 9: Commit**

```bash
git add bin/living-docs bin/dev compose.yaml Dockerfile .github/workflows/living-docs.yml .github/workflows/wrapper-docker.yml packages/living-docs/test/plugin/wrapper-docker.test.ts
git commit -F - <<'EOF'
ci(RNF-0006): CI, compose e wrapper apontam para packages/living-docs

O workflow principal perde os passos separados do ownership (o npm test e o
typecheck da raiz fazem o fan-out) e chama o CLI pelo caminho novo. O compose e
a imagem apontam LIVING_DOCS_TOOLKIT_ROOT para o pacote, e bin/living-docs
invoca o CLI de lá. O wrapper-docker passa a rodar quando os manifestos dos
pacotes mudam.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

A entrada de `CHANGELOG.md` que `bin/**` e `.github/workflows/**` exigem viaja na
Tarefa 3, no mesmo PR. O `CI-6` julga o PR, não o commit. A linha da Definition
of Done sobre o workflow não muda, porque os comandos que ele roda são os mesmos.

---

### Tarefa 3: Documentos vivos e CHANGELOG

**Files:**
- Modify: `CLAUDE.md:19`, `CONTRIBUTING.md:24-25,40`, `README.md:20,32-33,43-47,76-77,82,136`, `CHANGELOG.md` (seção `[Unreleased]` → `### Changed`)

**Interfaces:**
- Consome: o caminho do CLI da Tarefa 2.

- [ ] **Passo 1: `CLAUDE.md`**

Na linha da política de execução, troque `` `node src/cli/index.ts …` `` por
`` `node packages/living-docs/src/cli/index.ts …` ``. `npm ci`, `npm test` e
`npm run typecheck` continuam iguais, e agora rodam os dois pacotes.

- [ ] **Passo 2: `CONTRIBUTING.md`**

Nos dois blocos de comando, `node src/cli/index.ts` vira
`node packages/living-docs/src/cli/index.ts` (linhas 24, 25 e 40). Não escreva
nada novo que case o `pay-when` do `TDR-0002` além do que já existe; ele está
`paid`, mas não há por que mexer ali.

- [ ] **Passo 3: `README.md`** (`audience: external`: sem ID de artefato)

- Linha 20: `` `node src/cli/index.ts` `` → `` `node packages/living-docs/src/cli/index.ts` ``.
- Linhas 32-33, 43-47, 76-77 e 136: o mesmo, em cada ocorrência.
- Linha 82: `` `plugin/` traz skills, comandos e ganchos. `` vira:

```markdown
`packages/living-docs/` é, ao mesmo tempo, o pacote do CLI e o plugin: traz
skills, comandos e ganchos, e o código que os ganchos executam.
```

Depois, realinhe a tabela de comandos:

```bash
npx prettier --write README.md
git diff --stat README.md
```

- [ ] **Passo 4: `CHANGELOG.md`** (`audience: external`: sem ID de artefato)

Em `## [Unreleased]`, no topo da seção `### Changed` que já existe:

```markdown
- O toolkit passa a morar em `packages/living-docs/`, e esse diretório é ao mesmo
  tempo o pacote e o plugin do Claude Code. Quem invoca o CLI de um clone passa a
  chamá-lo por `node packages/living-docs/src/cli/index.ts`, sempre da raiz do
  checkout. O plugin passa a trazer, no próprio diretório, o código e as
  dependências que os ganchos executam. Arquivos já semeados por `init` não
  mudam, porque o comando do workflow instalado vem de `--invoke`.
```

- [ ] **Passo 5: O que fica de fora, de propósito**

Estes arquivos também citam caminhos que deixam de existir. **Não os edite nesta
tarefa.** Eles vão como pendência na descrição do PR (Tarefa 6):

- `docs/charter/constitution.md:22` cita `test/plugin/manifest.test.ts`. Mudar
  texto da Constitution é emenda: passa pela `charter-keeper`, com log de emendas,
  e a aceitação é humana.
- `docs/requirements/{functional,non-functional,rules}.md` citam
  `templates/requirements.md` como formato. A spec §7 não os lista, e editar
  artefato exige commit que cite um ID declarado em cada arquivo (`CI-9`).
- ADRs e specs/planos antigos são registro histórico (spec §7) e não se editam.

- [ ] **Passo 6: Ver o verde**

```bash
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
node packages/living-docs/src/cli/index.ts validate
node packages/living-docs/src/cli/index.ts drift
node packages/living-docs/src/cli/index.ts changelog --base master
npx prettier --check CLAUDE.md CONTRIBUTING.md README.md CHANGELOG.md
```

Esperado: 548/548 e 167/167; `validate` sem violação (o `CI-11` confirma que
`README.md` e `CHANGELOG.md` não citam ID); `drift` sem violação; `changelog`
sem violação, porque a entrada cobre os caminhos visíveis das Tarefas 1 e 2;
prettier sem diferença.

- [ ] **Passo 7: Commit**

```bash
git add CLAUDE.md CONTRIBUTING.md README.md CHANGELOG.md
git commit -F - <<'EOF'
docs(RNF-0002): caminho do CLI e do plugin nos documentos vivos, e entrada de CHANGELOG

CLAUDE.md, CONTRIBUTING.md e README.md passam a invocar o CLI por
packages/living-docs/src/cli/index.ts, e o README descreve o pacote como plugin.
O CHANGELOG registra a mudança de caminho, que é contrato público de quem clona
o toolkit.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Tarefa 4: Prova de cache e lockfile em dia

Hook falha aberta e em silêncio, e isso faz uma prova ingênua passar no vazio.
Por isso o teste de cache roda o **mesmo** hook duas vezes: sem dependências, a
saída tem de sair vazia (é o controle); depois do `npm ci`, a saída tem de vir
preenchida. Se as duas saírem vazias, o teste reprova.

**Files:**
- Create: `packages/living-docs/test/distribution/plugin-cache.test.ts`
- Create: `packages/living-docs/test/distribution/lockfile.test.ts`

**Interfaces:**
- Consome: `toolkitRoot()` de `packages/living-docs/src/core/roots.ts`, o layout da Tarefa 1 e o `hooks/run-hook.sh` que sobe um nível.

- [ ] **Passo 1: Teste de lockfile**

Crie `packages/living-docs/test/distribution/lockfile.test.ts`, espelho do teste
do `ownership`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

const PACKAGE_ROOT = toolkitRoot()

function packagesOf(lockfile: string): unknown {
  return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
}

test('RNF-0002: o package-lock.json do pacote está em dia com o package.json', { timeout: 120_000 }, () => {
  const isolated = mkdtempSync(join(tmpdir(), 'living-docs-lock-'))

  try {
    copyFileSync(join(PACKAGE_ROOT, 'package.json'), join(isolated, 'package.json'))
    const result = spawnSync('npm', ['install', '--package-lock-only', '--ignore-scripts'], { cwd: isolated, encoding: 'utf8', shell: true })

    assert.equal(result.status, 0, result.stderr)
    assert.deepEqual(
      packagesOf(join(isolated, 'package-lock.json')),
      packagesOf(join(PACKAGE_ROOT, 'package-lock.json')),
      'Lockfile desatualizado. Regere fora do workspace: copie package.json para um diretório temporário, rode `npm install --package-lock-only` e traga o package-lock.json de volta.',
    )
  } finally {
    rmSync(isolated, { recursive: true, force: true })
  }
})
```

- [ ] **Passo 2: Provar que o teste de lockfile discrimina**

Em `packages/living-docs/package.json`, troque temporariamente `"yaml": "^2.6.0"`
por `"yaml": "^2.5.0"` e rode:

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "✖|^ℹ (tests|fail)"
```

Esperado: FAIL em `o package-lock.json do pacote está em dia`. Desfaça com
`git checkout packages/living-docs/package.json` e rode de novo: esperado PASS.

- [ ] **Passo 3: Teste de cache**

Crie `packages/living-docs/test/distribution/plugin-cache.test.ts`:

```ts
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { execFileSync, spawnSync } from 'node:child_process'
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join, sep } from 'node:path'
import { toolkitRoot } from '../../src/core/roots.ts'

/**
 * Simulação do cache do marketplace: o Claude Code copia só o diretório do
 * plugin, instala dependências a partir do lockfile que está nele e roda os
 * hooks de lá. Nada do resto do checkout chega (achados 2 a 4 da pesquisa do
 * núcleo de ownership).
 */
const PACKAGE_ROOT = toolkitRoot()

/** Repositório validado mínimo: uma regra de `watches` que o HK-4 lembra. */
const OWNERSHIP = [
  'version: 1',
  'artifacts:',
  '  - id-prefix: RN',
  '    path: docs/requirements/rules.md',
  "    owner: '@time'",
  '    skill: requirements-keeper',
  '    collection: sections',
  'watches:',
  "  - code: 'src/domain/**'",
  '    doc: docs/requirements/rules.md',
  "    reason: 'comportamento novo exige regra antes do código'",
  '',
].join('\n')

const PAYLOAD = JSON.stringify({ tool_name: 'Edit', tool_input: { file_path: 'src/domain/reembolso.ts' } })

/**
 * No Windows, o `bash` do PATH pode ser o do WSL, que não enxerga `C:\…`. O
 * Claude Code roda hooks no bash do Git for Windows, e é esse que se usa aqui.
 */
function bashExecutable(): string | null {
  if (process.platform !== 'win32') {
    return 'bash'
  }
  const candidate = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe')

  return existsSync(candidate) ? candidate : null
}

/** Copia só o que o git versiona no pacote, como o cache faz com o plugin. */
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
  const env = { ...process.env, CLAUDE_PROJECT_DIR: project }

  // Nada do ambiente do checkout pode ajudar o hook a se achar.
  delete env.LIVING_DOCS_TOOLKIT_ROOT
  delete env.LIVING_DOCS_REPO_ROOT

  // Caminho absoluto com `/`: `dirname` do bash não entende `\`. O cwd é o
  // projeto, como no Claude Code, e não o cache: um wrapper que se achasse pelo
  // cwd reprovaria aqui.
  const script = join(cache, 'hooks', 'run-hook.sh').split(sep).join('/')
  const run = spawnSync(bash, [script, 'hk4-watch-reminder'], { cwd: project, env, input: PAYLOAD, encoding: 'utf8' })

  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}

test('RNF-0002: o wrapper de hooks chega a quem instala como executável', () => {
  const entry = execFileSync('git', ['ls-files', '-s', '--', 'hooks/run-hook.sh'], { cwd: PACKAGE_ROOT, encoding: 'utf8' })

  assert.equal(entry.split(/\s+/)[0], '100755')
})

test('RNF-0002: copiado sozinho para o cache, o plugin instala e o hook responde de lá', { timeout: 180_000 }, t => {
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

    // Controle: sem dependências o hook quebra e, por contrato, se cala. Se
    // isto não sair vazio, a asserção de baixo não prova nada.
    const semDependencias = runHook(bash, cache, project)

    assert.equal(semDependencias.status, 0, 'falha aberta: exit 0 mesmo quebrado')
    assert.equal(semDependencias.stdout.trim(), '', 'sem node_modules o hook deveria se calar')

    const install = spawnSync('npm', ['ci'], { cwd: cache, encoding: 'utf8', shell: true })

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

`test/distribution/internal-trail.test.ts` só varre strings de `src/`, então o
comentário que cita a pesquisa não reprova nada.

- [ ] **Passo 4: Rodar e ver passar**

```bash
npm test --workspace packages/living-docs 2>&1 | grep -E "✖|# SKIP|^ℹ (tests|pass|fail|skipped)"
```

Esperado: **551** testes, 551 passam (548 + 3 novos), e **0 skipped** numa máquina
com Git for Windows. Um `skipped` aqui significa que a prova não rodou: descubra
por quê antes de seguir.

- [ ] **Passo 5: Provar que o teste de cache discrimina**

Em `packages/living-docs/hooks/run-hook.sh`, troque temporariamente `/..` por
`/../..` na linha do `TOOLKIT_ROOT` (o erro antigo) e rode:

```bash
cd packages/living-docs && node --test test/distribution/plugin-cache.test.ts; cd ../..
```

Esperado: FAIL em `copiado sozinho para o cache…`, com a mensagem
`saída vazia é o que um hook quebrado também produz`. Desfaça com
`git checkout packages/living-docs/hooks/run-hook.sh`, rode de novo e veja PASS.

- [ ] **Passo 6: Suíte completa**

```bash
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail)"
npm run typecheck
node packages/living-docs/src/cli/index.ts validate
node packages/living-docs/src/cli/index.ts drift
```

Esperado: living-docs 551/551, ownership 167/167, e `typecheck`, `validate` e
`drift` verdes.

- [ ] **Passo 7: Commit**

```bash
git add packages/living-docs/test/distribution/plugin-cache.test.ts packages/living-docs/test/distribution/lockfile.test.ts
git commit -F - <<'EOF'
test(RNF-0002): prova de cache do plugin e lockfile do pacote em dia

Copia só os arquivos versionados do pacote para um diretório temporário, roda
o hook sem dependências (controle: saída vazia), instala com npm ci pelo
lockfile do pacote e exige saída não vazia do mesmo hook, com o cwd no projeto
e não no cache. Afirma também o modo 100755 do wrapper no índice e que o
lockfile do pacote está em dia com o package.json.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Tarefa 5: ADR do nome do projeto (`draft`)

**Files:**
- Create: `docs/decisions/adr/ADR-00NN-nome-do-projeto-raiz-esliph.md`, pelo `/adr`

- [ ] **Passo 1: Abrir pelo `/adr`**

Invoque o comando `/adr` (skill `decision-recorder`). É ele quem confere o
próximo ID livre (hoje o maior é `ADR-0026`; confira também `docs/ids-retired.txt`)
e escreve o arquivo a partir de `packages/living-docs/templates/adr.md`. Passe
este conteúdo:

- **title:** `Nome do projeto — raiz esliph, pacote @esliph/living-docs`
- **status:** `draft`. A promoção é humana, e o `HK-3` pergunta.
- **relates-to:** `[ADR-0014, ADR-0025, RNF-0002]`
- **supersedes:** `ADR-0014`. O `ADR-0014` **não se edita**: `superseded-by` e
  `status` dele mudam só quando alguém aceitar este ADR.
- **Contexto:** o `ADR-0014` fez `@esliph/living-docs` ser o nome do projeto e do
  pacote ao mesmo tempo, quando o repositório tinha um pacote só. O `ADR-0025`
  colocou `packages/ownership` ao lado, e a fatia física da migração move o
  living-docs para `packages/living-docs`. A raiz deixa de ser um pacote e passa
  a ser o workspace que reúne os dois. Nome de pacote npm é único por
  `package.json`, e a raiz e o pacote não podem se chamar igual.
- **Alternativas consideradas:**
  - A raiz continua `@esliph/living-docs`, e o pacote ganha outro nome.
    Descartada: o nome do pacote é o que quem consome instala e cita, e renomeá-lo
    quebraria contrato público só para acomodar uma raiz que não se publica.
  - A raiz sem `name`. Descartada: o npm aceita, mas o lockfile e as mensagens
    de erro de workspace passam a mostrar um projeto anônimo, e o marketplace já
    se chama `esliph`.
  - A raiz `@esliph/monorepo` ou `@esliph/root`. Descartada: escopo sugere
    publicação, e a raiz é `private: true`, nunca publicada.
- **Decisão:** a raiz do repositório passa a ser `esliph`, privada, sem escopo, o
  mesmo nome do marketplace. `@esliph/living-docs` continua sendo o nome do
  pacote do toolkit, agora em `packages/living-docs/`. O container
  `esliph-living-docs` e o comando `living-docs` não mudam.
- **Consequências, o que se ganha:** um nome para o que se distribui
  (`esliph`, o marketplace e o workspace) e um para cada coisa que se instala
  (`@esliph/living-docs`, `@esliph/ownership`), sem sobreposição.
- **Consequências, o que se aceita perder:** o `ADR-0014` e os planos anteriores
  descrevem a raiz como `@esliph/living-docs`. Ficam como registro, e quem os lê
  precisa saber que essa identidade passou para `packages/living-docs/`.

- [ ] **Passo 2: Validar**

```bash
node packages/living-docs/src/cli/index.ts validate
```

Esperado: nenhuma violação. O ADR novo é artefato com dono, frontmatter válido e
ID único. Pode aparecer violação de coerência entre o `supersedes` deste draft e
o `superseded-by: null` do `ADR-0014`. Nesse caso, **não edite o `ADR-0014`**:
volte `supersedes` para `null`, escreva no Contexto que a decisão supersede o
`ADR-0014` quando for aceita e reporte a situação. Ligar os dois é parte da
promoção, que é humana.

- [ ] **Passo 3: Commit**

Troque `ADR-00NN` pelo ID que o `/adr` atribuiu:

```bash
git add docs/decisions/adr/
git commit -F - <<'EOF'
docs(ADR-00NN): nome do projeto — raiz esliph, pacote @esliph/living-docs (draft)

Registra, para promoção humana, a decisão que supersede ADR-0014: a raiz vira
o workspace privado `esliph`, e @esliph/living-docs segue como o nome do pacote
em packages/living-docs/.

Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>
EOF
```

---

### Tarefa 6: Verificação final e prova de instalação remota

Não gera commit. Gera a evidência do PR.

- [ ] **Passo 1: Critério de pronto (spec §9)**

Da raiz do checkout, a partir de um `npm ci` limpo:

```bash
npm ci
npm test 2>&1 | grep -E "^ℹ (tests|pass|fail|skipped)"
npm run typecheck
node packages/living-docs/src/cli/index.ts validate
node packages/living-docs/src/cli/index.ts validate --base master
node packages/living-docs/src/cli/index.ts drift
node packages/living-docs/src/cli/index.ts changelog --base master
git hash-object docs/contracts/checks.gen.md
npm run lint:check 2>&1 | tail -2
npx prettier --check .
git ls-files plugin src test templates   # esperado: nenhuma linha
```

Esperado:
- living-docs com 551 testes (os 548 de partida mais os 3 novos), 0 falha e 0
  skipped; ownership com 167/167;
- `validate` com nenhuma violação, 1 gerado, 7 caminhos visíveis e 14 vínculos;
- `validate --base master` sem erro: o `Docs: none` da Tarefa 1 cobre a metade
  do `CI-7` que lê o diff;
- `drift` verde e o hash `6d6030f810f62510db0c772145e24daaef3ab193`;
- `changelog --base master` verde;
- lint com os mesmos 28 erros de partida;
- `prettier --check` sem arquivo novo fora do formato.

Use a skill `superpowers:verification-before-completion` antes de declarar
pronto.

- [ ] **Passo 2: Instalação remota real (manual, não é gate)**

Exige push, então pergunte antes de fazer o push. Depois:

1. Registre `claude --version`.
2. Numa sessão do Claude Code **fora** deste checkout, adicione o marketplace
   pelo GitHub (`esliph/living-docs`, na branch `ref/marketplace-monorepo`) com
   `/plugin marketplace add`, na sintaxe de ref que a versão registrada aceita
   (confira em `/plugin` ou na documentação de plugins), e instale
   `living-docs@esliph`.
3. Liste o cache em `~/.claude/plugins/cache/esliph/living-docs/0.1.0/` e registre
   que `src/`, `hooks/run-hook.sh`, `package-lock.json` e `node_modules/` estão
   lá.
4. Num projeto de rascunho com o `docs/.ownership.yml` do teste de cache
   (Tarefa 4), peça ao Claude Code para editar `src/domain/reembolso.ts` e
   registre o lembrete do `HK-4` que aparece depois da edição.
5. Cole na descrição do PR o comando, a versão e a saída do hook.

Se o hook não aparecer, isso não bloqueia o merge (spec §9), mas é achado:
registre no PR o que o cache continha.

- [ ] **Passo 3: Descrição do PR**

Além da evidência do Passo 2, a descrição leva:

- a linha de partida e a linha final (contagens, `validate`, hash do gerado);
- que o `Docs: none` do primeiro commit libera a metade do diff do `CI-7` para o
  PR inteiro (spec §8 e §11);
- que o `lint:check` já tinha 28 erros antes da mudança e continua com os mesmos
  28, então o critério "lint verde" da spec §9 não se cumpre por causa de dívida
  anterior;
- as pendências da Tarefa 3, Passo 5: `constitution.md:22` (emenda via
  `charter-keeper`) e o `Formato: templates/requirements.md` dos três documentos
  de requisitos;
- o `wrapper-docker.yml` verde no PR, que roda porque `bin/` e `compose.yaml`
  mudaram;
- que o `.claude-plugin/` passou a contar como visível ao consumidor (Tarefa 1,
  Passo 14).
