# Núcleo de ownership de artefatos — plano de implementação

> **Para quem executar:** SUB-SKILL OBRIGATÓRIA: use superpowers:subagent-driven-development (recomendado) ou superpowers:executing-plans para executar este plano tarefa a tarefa. Os passos usam checkbox (`- [ ]`) para acompanhamento.

**Objetivo:** extrair o mecanismo de ownership de artefatos do `@esliph/living-docs`
e publicá-lo como `@esliph/ownership` — um novo pacote em `packages/ownership`,
plugin e biblioteca ao mesmo tempo — cobrindo contrato, esquema v2, composição,
identidade de item, gatilhos (código→doc e doc→doc), os hooks e checks que a
spec atribui ao núcleo, e a distribuição (build só na publicação, execução sem
build em desenvolvimento).

**Arquitetura:** pacote TypeScript autocontido (não importa nada de `src/` do
`@esliph/living-docs` — a migração que faz `living-docs` depender dele é spec
própria, posterior a esta). Roda sem build no checkout (Node 24 lê `.ts` direto,
por type-stripping) e ganha `dist/` só no `prepack`, quando publicado ou quando
outro plugin o instala via npm. O repositório-raiz vira workspace npm para que a
condição `development` do `exports` resolva o pacote pelo symlink em
desenvolvimento.

**Tech Stack:** Node ≥ 24, TypeScript sem passo de build, `node --test`, `yaml`,
`picomatch`. Nenhuma dependência nova além das que `@esliph/living-docs` já usa.

**Spec:** `docs/superpowers/specs/2026-09-17-nucleo-de-ownership-design.md` — o
plano argumenta a partir dela; quem executar lê as duas.

## Restrições globais

- **Node ≥ 24, sem passo de build no checkout.** `RNF-0002`. O pacote roda `.ts`
  direto; `dist/` só existe dentro do tarball, gerado no `prepack`.
- **`@esliph/ownership` não importa de `src/` do `@esliph/living-docs`.** É o que
  torna o pacote publicável e instalável por um segundo consumidor sem arrastar
  o primeiro. Utilitário compartilhado é portado (copiado e adaptado), não
  importado — a duplicação é o preço deliberado de dois pacotes independentes.
- **O núcleo não conhece formato de ID, prefixo, padding, nem congelamento.**
  Isso é `id-format`/`append-only`/`mutable-fields` e fica em `@esliph/living-docs`.
  A chave de um item é opaca: string não vazia, única no arquivo, sem forma
  exigida.
- **O núcleo não inventa semântica de estado.** `states` é vocabulário do
  projeto; o núcleo só compara contra a lista declarada, nunca contra uma
  máquina embutida por prefixo.
- **Todo caminho de uma entrada é relativo à base do arquivo que o declara.** A
  base é o diretório do arquivo mais o `basePath`, que só desce; a base da
  **raiz** é a raiz do repositório, more ela em `.ownership.yml` ou em
  `docs/.ownership.yml` — é o que impede `docs/.ownership.yml` de ler `src/**`
  como `docs/src/**`. `owned[].path`, `owned[].derives-from.source`,
  `watches[].code`, `generated[].path`, `ignore[]` e `include[]` nunca escapam
  da base; `watches[].doc` pode, porque é o único que nunca é caminho editado
  (spec §5).
- **Caminhos governados são disjuntos.** Nenhum `owned[].path` resolvido é igual
  a outro nem contém outro, venham do mesmo arquivo ou de arquivos diferentes.
  Não há cascata, não há merge entre níveis e não há caminho mais específico
  ganhando de menos específico: colisão é erro de carga.
- **A regra vem antes do código, e o commit cita a regra.** A Tarefa 1 registra
  as decisões e os requisitos que as tarefas seguintes implementam; todo commit
  segue `tipo(ID): assunto` (`CONTRIBUTING.md`), com o ID da regra que a tarefa
  implementa. Os IDs só existem depois da Tarefa 1 — as mensagens abaixo usam os
  marcadores da tabela da Tarefa 1, Passo 5 (ex.: `<RN-esquema>`), que quem
  executa troca pelo ID real.
- **Type-check é `npm run typecheck`**, nunca `tsc` direto: o `tsc` só está no
  PATH dentro de um script npm.
- **`version:` é obrigatório em todo arquivo, e `plugins:` é exclusivo da raiz.**
  Versão divergente entre dois arquivos é erro; um arquivo incluído que declarar `plugins:` é erro.
- **Toda chave de primeiro nível e de entrada é validada estritamente.** Só
  blocos cujo nome está em `plugins:` (ex.: `living-docs:`) são ignorados pelo
  núcleo — e só dentro de uma entrada `owned[]`, nunca na raiz do arquivo.
- **Falha aberta é política de hook, nunca de check.** Todo hook deste pacote
  segue o padrão já estabelecido em `@esliph/living-docs`: erro de leitura,
  configuração ausente ou parse inválido faz o hook devolver `allow`/silêncio,
  nunca travar a edição.
- **Identificador de check e hook é `ownership/nome-descritivo`**, não numerado.
- **Todo achado (`Finding`) tem `ruleId`, `file`, `line` (0 se não há linha),
  `severity`, `message` e `fix`** — a mesma forma que `@esliph/living-docs` já
  usa, para que o formatador de saída (`report.ts`, portado na Tarefa 20) sirva
  aos dois.

---

## Estrutura de arquivos

```
esliph/
  package.json                        # ganha "workspaces": ["packages/*"]
  docs/.ownership.yml                 # segue v1 — a migração é spec própria; não mexe
  .claude-plugin/marketplace.json     # NÃO muda — ver Tarefa 2, "Fora do marketplace"
  .github/workflows/living-docs.yml   # ganha os passos de teste do pacote novo
  CHANGELOG.md                        # NÃO muda — nada chega ao consumidor (Tarefa 22)
  docs/decisions/adr/                 # 8 ADRs novos (Tarefa 1)
  docs/open-decisions.md              # 1 DA nova: quais transições exigem gente (Tarefa 1)
  docs/requirements/                  # regras do núcleo e o RNF-0002 revisto (Tarefa 1)
  packages/
    ownership/                        # @esliph/ownership — plugin E biblioteca
      package.json
      package-lock.json               # instalável isolado, fora do workspace
      tsconfig.json
      tsconfig.build.json             # só para o prepack
      .claude-plugin/plugin.json
      hooks/{hooks.json,run-hook.sh}
      src/
        index.ts                      # API pública da biblioteca
        core/
          files.ts                    # varredura de árvore (portado de src/core/files.ts)
          frontmatter.ts              # parse de frontmatter (portado de src/frontmatter/parse.ts)
          exec.ts                     # GitRunner + CommandRunner (portado de src/git/*, src/exec/command.ts)
          exception-label.ts          # `<Label>: none — <razão>` (portado de src/checks/exception-label.ts)
          codeowners.ts               # parse de CODEOWNERS (portado de src/config/codeowners.ts)
        schema/
          types.ts                    # tipos do esquema v2
          item.ts                     # chave opaca: parseItemsTable / parseItemsSections
          parse.ts                    # parseOwnershipFile — estrito, com passthrough de plugin
        resolve/
          candidates.ts               # resolução do arquivo raiz (ordem de candidatos)
          hierarchy.ts                # base, include, disjunção, ciclo, poda
          explain.ts                  # qual regra cobre, e de qual arquivo
        lifecycle/
          transitions.ts              # pareia antes/depois pela chave (o hook espera a DA)
        triggers/
          watches.ts                  # watchesFor / pendingDocs (consumer-visible unificado)
          derives.ts                  # resolução de derives-from
        checks/
          types.ts                    # Check / CheckContext / Finding
          generated-drift.ts          # ownership/generated-drift
          declared-state.ts           # ownership/declared-state
          owner-coverage.ts           # ownership/owner-coverage
          watch-satisfied.ts          # ownership/watch-satisfied
          consumer-change-logged.ts   # ownership/consumer-change-logged
          derivation-resolves.ts      # ownership/derivation-resolves
          registry.ts
        hooks/
          lib/paths.ts                # toRepoPath (portado de src/hooks/lib/paths.ts)
          lib/io.ts                   # readPayload/emit/askOutput/... (portado, env vars próprias)
          generated-guard.ts          # ownership/generated-guard
          watch-reminder.ts           # ownership/watch-reminder
          commit-guard.ts             # ownership/commit-guard
          derivation-reminder.ts      # ownership/derivation-reminder
        cli/
          index.ts                   # `ownership validate|explain`
          validate.ts
          explain.ts
          report.ts                  # formatFindings (portado de src/cli/report.ts)
      test/                          # espelha src/
```

---

### Tarefa 1: Registrar decisões, a decisão aberta e os requisitos

Não é código. A spec §11 lista oito decisões que ela obriga a abrir como
`draft`, para promoção humana — `CLAUDE.md`: "Você não aceita decisão. Skill
escreve `draft`/`open`; promover é ato humano." Um ADR em `draft` não bloqueia
implementação (o próprio repositório já tem `ADR-0002`, `ADR-0012` e `ADR-0015`
em `draft` com código implementado sobre eles) — só uma *Open Decision* (`DA`)
bloqueia. As oito não são lacuna: a spec já decidiu o mérito. Uma coisa a spec
não decidiu — quais transições exigem gente — e essa vira `DA` (Passo 3).

**Arquivos:**
- Create: oito arquivos em `docs/decisions/adr/ADR-00NN-<slug>.md` (o número
  exato é atribuído pela skill `decision-recorder` no momento da execução —
  hoje o próximo livre é `ADR-0019`; confira `docs/ids-retired.txt` e o
  diretório antes de assumir isso).
- Modify: `docs/open-decisions.md` (uma linha nova).
- Modify: `docs/requirements/rules.md`, `functional.md`, `non-functional.md`.

- [ ] **Passo 1: Ler `docs/.ownership.yml` e `docs/decisions/adr/` para confirmar o próximo ID livre**

  ```bash
  ls docs/decisions/adr | sort | tail -5
  cat docs/ids-retired.txt
  ```

- [ ] **Passo 2: Abrir os oito ADRs draft, um comando por decisão**

  Rode `/adr <assunto>` oito vezes, um por linha da tabela da spec §11. Para
  cada um, cite a seção da spec correspondente no `## Contexto` (o próprio ADR
  pode citar a spec — quem não pode é o que o toolkit *entrega*, `RN-0031`; um
  ADR deste repositório não é entrega, é o repositório governando a si mesmo).

  1. `/adr fronteira do núcleo de ownership: dono, ciclo de vida e gatilho ficam no núcleo; família de IDs e congelamento ficam no living-docs (spec §1)` — no `## Consequências`, registrar que isso reabre `ADR-0002` (engine única, hoje `draft`) porque a engine se divide em duas.
  2. `/adr esquema v2 do arquivo de ownership: lista owned única, blocos por nome de plugin, plugins: como allowlist, format: separado de governança, fim de consumer-visible-paths como lista duplicada (spec §2)`
  3. `/adr identidade de item no núcleo: chave opaca por coleção (per-file/table/sections), state-field configurável, sem regex de ID (spec §3)`
  4. `/adr gatilho doc-para-doc: derives-from declarado por tipo no arquivo de ownership e por instância no frontmatter do documento (spec §4)`
  5. `/adr composição entre arquivos de ownership: base por arquivo com basePath só descendo, caminhos governados disjuntos, include explícito sem concessão de autoridade, confinamento pelo critério de gatilho (spec §5)`
  6. `/adr resolução do arquivo de ownership: ordem de candidatos, ambiguidade é erro nomeando os dois (spec §8)`
  7. `/adr distribuição do núcleo como pacote em packages/, build só no prepack, execução sem build no checkout via condição development do exports (spec §7)` — no `## Consequências`, registrar que isso supersede a metade de `ADR-0015` que dizia "sem passo de build" sem qualificação (agora "sem passo de build no checkout, com build no prepack"), reabre `ADR-0012` (hooks como peça única — viram dois plugins com hooks próprios) e obriga um ADR novo sobre o nome do projeto, porque `ADR-0014` (`@esliph/living-docs`) descrevia um repositório de um pacote só.
  8. `/adr identificador nomeado para check e hook: plugin/nome-descritivo substitui numeração CI-n/HK-n para o que for novo (spec §6)`

- [ ] **Passo 3: Abrir a decisão que a spec não tomou — quais transições exigem gente**

  A spec §1 diz que o núcleo "pergunta quando a transição exige gente", e o
  esquema v2 não tem onde declarar **quais** transições exigem. No
  `@esliph/living-docs` isso é uma lista fixa por prefixo de ID, que o núcleo
  não tem. Perguntar em toda transição seria inventar a regra — e, com os dois
  plugins instalados, faria perguntar em cada mudança de estado que uma skill
  escreve. `CLAUDE.md`: "se a regra não existe, abra uma `DA` e pare".

  ```
  /open-decision o núcleo de ownership não sabe quais transições de estado exigem ato humano: o esquema v2 declara `states` e não declara transições; opções — lista `human-transitions` por caminho, estados terminais marcados, ou perguntar em toda transição
  ```

  Na coluna de bloqueio, a DA reivindica `packages/ownership/src/hooks/promotion-guard.ts`.
  A Tarefa 17 constrói só o mecanismo (achar a transição) e **para** antes de
  ligar o hook.

- [ ] **Passo 4: Registrar os requisitos que o código vai implementar**

  A regra vem antes do código. Pela skill `requirements-keeper`, em `draft`:

  - uma regra por responsabilidade do núcleo que ainda não tem regra
    equivalente: esquema v2 estrito, identidade de item, composição entre
    arquivos (base e disjunção), resolução do arquivo raiz, gatilho doc→doc, cobertura de
    dono sobre o repositório inteiro com `ignore`;
  - um requisito funcional para `ownership validate [--base]` e outro para
    `ownership explain <caminho>`;
  - a revisão de `RNF-0002`: hoje ele diz "sem passo de build", e a Tarefa 21
    acrescenta build no `prepack`. A nova redação é "sem passo de build no
    checkout; o pacote publicado é compilado no `prepack`". Se a skill
    concluir que a mudança substitui a regra em vez de refiná-la, ela abre um
    requisito novo e marca o antigo — a forma é da skill, não deste plano.

  Regras que já existem e continuam valendo (dono único, promoção humana,
  gerado não se edita, vigiado viaja com o doc, CHANGELOG exigido) não ganham
  cópia: as tarefas as citam pelo ID atual.

- [ ] **Passo 5: Anotar os IDs atribuídos**

  ```bash
  git status --short docs/decisions/adr/ docs/open-decisions.md docs/requirements/
  ```

  Preencha esta tabela no início da execução da Tarefa 2 (comentário do PR ou
  nota de execução). As mensagens de commit e os comentários
  `// Regra de origem:` das tarefas seguintes usam os marcadores da esquerda:

  | Marcador            | O que é                                                    |
  | ------------------- | ---------------------------------------------------------- |
  | `<ADR-fronteira>`   | decisão 1                                                  |
  | `<ADR-esquema>`     | decisão 2                                                  |
  | `<ADR-identidade>`  | decisão 3                                                  |
  | `<ADR-derivacao>`   | decisão 4                                                  |
  | `<ADR-composicao>`  | decisão 5                                                  |
  | `<ADR-resolucao>`   | decisão 6                                                  |
  | `<ADR-distribuicao>`| decisão 7                                                  |
  | `<ADR-nomeado>`     | decisão 8                                                  |
  | `<DA-promocao>`     | a decisão aberta do Passo 3                                |
  | `<RN-esquema>`      | regra do esquema v2                                        |
  | `<RN-identidade>`   | regra de identidade de item                                |
  | `<RN-composicao>`   | regra de composição entre arquivos                                       |
  | `<RN-resolucao>`    | regra de resolução do arquivo raiz                         |
  | `<RN-derivacao>`    | regra do gatilho doc→doc                                   |
  | `<RN-cobertura>`    | regra de cobertura de dono com `ignore`                    |
  | `<RF-validate>`     | requisito de `ownership validate`                          |
  | `<RF-explain>`      | requisito de `ownership explain`                           |
  | `<RNF-build>`       | `RNF-0002` revisto (ou o que o substituir)                 |

  Checks e hooks portados citam também a regra que já existe: `RN-0001`
  (dono), `RN-0005` (promoção), `RN-0008`/`RN-0009` (vigiado), `RN-0012`
  (gerado), `RN-0013` (CHANGELOG), `RN-0016`/`RN-0021` (cobertura).

- [ ] **Passo 6: Validar**

  ```bash
  node src/cli/index.ts validate
  ```

  Espera-se 0 erros. Os ADRs novos citam `relates-to` e `supersedes` uns dos
  outros e das decisões que reabrem — `CI-2` e `CI-3` conferem que toda citação
  resolve.

- [ ] **Passo 7: Commit — um por artefato, citando o ID**

  `RN-0028`: commit que altera artefato cita o ID afetado. Um commit por ADR,
  um pela DA e um por requisito:

  ```bash
  git add docs/decisions/adr/ADR-00NN-<slug>.md
  git commit -m "docs(ADR-00NN): abre em draft <assunto da decisão>"
  # … repetir para cada ADR, para a DA e para cada requisito
  ```

---

### Tarefa 2: Scaffold do pacote `@esliph/ownership`

**Arquivos:**
- Create: `packages/ownership/package.json`
- Create: `packages/ownership/tsconfig.json`
- Create: `packages/ownership/.gitignore`
- Create: `packages/ownership/src/index.ts` (vazio por ora — placeholder real,
  não comentário: um `export {}` que a Tarefa 20 substitui pela API pública)
- Create: `packages/ownership/test/smoke.test.ts`
- Modify: `package.json:1-19` (raiz) — acrescenta `workspaces`
- Modify: `.github/workflows/living-docs.yml`

**Interfaces:**
- Produz: o layout de diretório que toda tarefa seguinte usa. Nenhuma tarefa
  depois desta cria `packages/ownership/` — só acrescenta arquivos dentro dele.

- [ ] **Passo 1: Criar `packages/ownership/package.json`**

  ```json
  {
    "name": "@esliph/ownership",
    "version": "0.1.0",
    "private": true,
    "type": "module",
    "engines": {
      "node": ">=24"
    },
    "exports": {
      ".": {
        "development": "./src/index.ts",
        "default": "./dist/index.js"
      }
    },
    "files": ["dist"],
    "bin": {
      "ownership": "./dist/cli/index.js"
    },
    "scripts": {
      "test": "node --test \"test/**/*.test.ts\"",
      "typecheck": "tsc --noEmit",
      "prepack": "tsc -p tsconfig.build.json"
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

  `private: true` por ora — publicar de verdade é decisão de quem aceitar o
  ADR de distribuição da Tarefa 1, não algo que este scaffold decide sozinho.
  `bin` aponta para `dist/`, que não existe no checkout: é isso que torna
  `npm pack` (Tarefa 21) uma prova de verdade, e não teatro. Em desenvolvimento
  o comando roda direto: `node packages/ownership/src/cli/index.ts …` — o mesmo
  padrão que `bin/living-docs` já usa para `src/cli/index.ts` na raiz.

- [ ] **Passo 2: Criar `packages/ownership/tsconfig.json`**

  Mesmas opções do `tsconfig.json` da raiz (mesma versão de TypeScript, mesmo
  alvo), com `include` restrito ao próprio pacote:

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

- [ ] **Passo 3: Criar `packages/ownership/tsconfig.build.json`**

  Só para o `prepack` (Tarefa 21 volta a este arquivo). Por ora, o mínimo que
  compila `src/` para `dist/` sem emitir os testes:

  ```json
  {
    "extends": "./tsconfig.json",
    "compilerOptions": {
      "noEmit": false,
      "outDir": "dist",
      "declaration": true,
      "rewriteRelativeImportExtensions": true
    },
    "include": ["src/**/*.ts"]
  }
  ```

  `rewriteRelativeImportExtensions` (TypeScript ≥ 5.7) reescreve, na emissão,
  os imports relativos que terminam em `.ts` para `.js` — é o que deixa o
  código-fonte escrever `from './x.ts'` (exigido por `verbatimModuleSyntax` +
  `allowImportingTsExtensions`, herdados de `tsconfig.json`) e o `dist/`
  emitido apontar para `.js` de verdade. Se a versão do TypeScript instalada
  (`package.json`, Tarefa 2) não tiver essa flag, o `prepack` (Tarefa 21) falha
  cedo e de forma clara — não silenciosamente com imports quebrados no
  tarball.

- [ ] **Passo 4: Criar `packages/ownership/.gitignore`**

  ```
  dist/
  node_modules/
  ```

- [ ] **Passo 5: Criar o placeholder de `src/index.ts` e o smoke test**

  `packages/ownership/src/index.ts`:

  ```typescript
  export {}
  ```

  `packages/ownership/test/smoke.test.ts`:

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'

  test('o pacote carrega sem erro de import', async () => {
    const mod = await import('../src/index.ts')

    assert.equal(typeof mod, 'object')
  })
  ```

- [ ] **Passo 6: Rodar o smoke test**

  ```bash
  cd packages/ownership && node --test "test/**/*.test.ts"
  ```

  Esperado: PASS (1 teste).

- [ ] **Passo 7: Instalar as dependências do pacote isolado, para gerar seu próprio lockfile**

  Antes de acrescentar o pacote ao workspace da raiz — para que o lockfile
  reflita uma instalação autocontida, que é o que o spec §7 exige ("cada um
  autocontido com `package.json` e lockfile próprios") e o que o mecanismo de
  distribuição do plugin precisa quando `packages/ownership` é copiado sozinho
  para o cache de um consumidor:

  ```bash
  cd packages/ownership && npm install --package-lock-only
  ```

  Confira que `packages/ownership/package-lock.json` foi criado.

  Depois do Passo 8 este comando deixa de servir: dentro de um workspace, o npm
  sobe até a raiz e escreve o lockfile de lá. Regerar o lockfile do pacote
  passa a ser copiar `package.json` para um diretório temporário, rodar
  `npm install --package-lock-only` ali e trazer o resultado de volta. O teste
  da Tarefa 21 (`lockfile.test.ts`) faz exatamente isso e reprova quando o
  lockfile versionado diverge — sem ele, o lockfile que o consumidor usa
  envelheceria em silêncio a cada dependência nova.

- [ ] **Passo 8: Acrescentar `workspaces` ao `package.json` da raiz**

  Em `package.json:1-19`, depois de `"engines"`:

  ```json
    "workspaces": ["packages/*"],
  ```

  Rode `npm install` na raiz e confira que `node_modules/@esliph/ownership`
  virou um symlink para `packages/ownership` (`ls -la node_modules/@esliph/`).
  Isto é o que faz a condição `development` do `exports` (Tarefa 21) resolver
  pelo código-fonte, não por um `dist` que ainda não existe.

- [ ] **Passo 9: Fora do marketplace — não registrar o plugin ainda**

  Nenhuma mudança em `.claude-plugin/marketplace.json`. Os hooks importam
  `yaml` e `picomatch`, e nada instala essas dependências na cópia do plugin
  que vai para o cache de quem instala: registrado agora, o plugin falharia no
  import e, por falha aberta, ficaria mudo sem ninguém perceber. Registrar
  espera a prova de instalação remota da spec §9, que este plano não fecha
  (seção final).

- [ ] **Passo 10: Acrescentar ao workflow de CI o teste do pacote novo**

  Em `.github/workflows/living-docs.yml`, depois do passo "Testes" existente
  (que continua rodando os testes de `@esliph/living-docs` na raiz):

  ```yaml
        - name: Testes — @esliph/ownership
          run: npm test --workspace packages/ownership

        - name: Type-check — @esliph/ownership
          run: npm run typecheck --workspace packages/ownership
  ```

  Este é o único passo de CI que este plano acrescenta para o pacote novo:
  `ownership validate` contra `docs/.ownership.yml` deste próprio repositório
  não roda ainda, porque esse arquivo continua em `version: 1` até a spec de
  migração — rodar o CLI novo contra um esquema que ele rejeita reprovaria o
  CI por desenho, não por bug.

- [ ] **Passo 11: Rodar a suíte inteira da raiz para confirmar que nada quebrou**

  ```bash
  npm test && npm run typecheck
  ```

- [ ] **Passo 12: Commit**

  ```bash
  git add package.json package-lock.json packages/ownership .github/workflows/living-docs.yml
  git commit -m "feat(<ADR-distribuicao>): scaffold do pacote @esliph/ownership"
  ```

---

### Tarefa 3: Utilitários portados

Cinco módulos pequenos, copiados e adaptados de `@esliph/living-docs` (o núcleo
não importa de lá — regra global). Nenhum conhece `.ownership.yml`; são a base
que as tarefas seguintes usam.

**Arquivos:**
- Create: `packages/ownership/src/core/files.ts`
- Create: `packages/ownership/src/core/frontmatter.ts`
- Create: `packages/ownership/src/core/exec.ts`
- Create: `packages/ownership/src/core/exception-label.ts`
- Create: `packages/ownership/src/core/codeowners.ts`
- Test: `packages/ownership/test/core/files.test.ts`
- Test: `packages/ownership/test/core/frontmatter.test.ts`
- Test: `packages/ownership/test/core/exec.test.ts`
- Test: `packages/ownership/test/core/exception-label.test.ts`
- Test: `packages/ownership/test/core/codeowners.test.ts`

**Interfaces:**
- Produz: `listFiles(root, globs?)`, `readTextFile(root, file)`,
  `forgetTree(root?)`; `parseFrontmatter(source)`; `type GitRunner`,
  `stagedPaths(root, run?)`, `changedPaths(root, base, run?)`,
  `commitMessages(root, base, run?)`, `type CommandRunner`, `runCommand`;
  `exceptionReasonFor(label, messages)`; `type Codeowners`, `loadCodeowners(root)`,
  `ownersOf(codeowners, repoPath)`.

- [ ] **Passo 1: Portar `core/files.ts`**

  Cópia de `src/core/files.ts` do `@esliph/living-docs`, sem nenhuma mudança de
  comportamento — o algoritmo de varredura e memoização não é específico de
  documentação viva. Ajustar só o comentário de topo para remover a citação a
  `CI-4`/`CI-7`/`CI-8` (que não existem aqui) e falar em genérico "quem
  precisar da árvore".

  ```typescript
  import { readFileSync, readdirSync, statSync } from 'node:fs'
  import { join } from 'node:path'
  import picomatch from 'picomatch'

  export const SKIP_DIRS: ReadonlySet<string> = new Set(['.git', 'node_modules', 'dist', 'coverage', '.next', '.cache'])
  export const MAX_BYTES = 512 * 1024

  function walk(root: string, relative: string, out: string[]): void {
    let entries: string[]

    try {
      entries = readdirSync(join(root, relative))
    } catch {
      return
    }

    for (const entry of entries) {
      if (SKIP_DIRS.has(entry)) {
        continue
      }
      const path = relative === '' ? entry : `${relative}/${entry}`
      let isDirectory: boolean

      try {
        isDirectory = statSync(join(root, path)).isDirectory()
      } catch {
        continue
      }
      if (isDirectory) {
        walk(root, path, out)
      } else {
        out.push(path)
      }
    }
  }

  const TREES = new Map<string, string[]>()

  export function forgetTree(root?: string): void {
    if (root === undefined) {
      TREES.clear()
    } else {
      TREES.delete(root)
    }
  }

  function treeOf(root: string): string[] {
    const known = TREES.get(root)

    if (known !== undefined) {
      return known
    }

    const files: string[] = []

    walk(root, '', files)
    TREES.set(root, files)

    return files
  }

  export function listFiles(root: string, globs?: readonly string[]): string[] {
    const files = treeOf(root)

    if (globs === undefined) {
      return [...files]
    }
    if (globs.length === 0) {
      return []
    }

    const matches = picomatch([...globs], { dot: true })

    return files.filter(file => matches(file))
  }

  export function isProbablyText(content: string): boolean {
    return content.indexOf(String.fromCharCode(0)) === -1
  }

  export function readTextFile(root: string, file: string): string | null {
    try {
      if (statSync(join(root, file)).size > MAX_BYTES) {
        return null
      }
      const content = readFileSync(join(root, file), 'utf8')

      return isProbablyText(content) ? content : null
    } catch {
      return null
    }
  }
  ```

- [ ] **Passo 2: Teste de `files.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { forgetTree, listFiles, readTextFile } from '../../src/core/files.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('listFiles sem globs devolve tudo, com globs filtra', () => {
    withTempRepo({ 'a.md': 'x', 'docs/b.md': 'y', 'node_modules/c.md': 'z' }, root => {
      forgetTree(root)
      assert.deepEqual(listFiles(root).sort(), ['a.md', 'docs/b.md'])
      assert.deepEqual(listFiles(root, ['docs/**']), ['docs/b.md'])
      assert.deepEqual(listFiles(root, []), [])
    })
  })

  test('readTextFile devolve null para arquivo ausente', () => {
    withTempRepo({}, root => {
      assert.equal(readTextFile(root, 'nope.md'), null)
    })
  })
  ```

  Cria `packages/ownership/test/helpers/tmp.ts`, cópia de `test/helpers/tmp.ts`
  (`withTempRepo`) sem alteração — mesma forma, `mkdtempSync`/`rmSync`.

- [ ] **Passo 3: Portar `core/frontmatter.ts`**

  Cópia de `src/frontmatter/parse.ts`, sem alteração de comportamento — parse
  de frontmatter YAML não é específico de documentação viva:

  ```typescript
  import YAML from 'yaml'

  export interface Frontmatter {
    data: Record<string, unknown>
    lines: Record<string, number>
    endLine: number
    body: string
    bodyStartLine: number
  }

  export class FrontmatterSyntaxError extends Error {
    readonly line: number

    constructor(message: string, line: number) {
      super(message)
      this.name = 'FrontmatterSyntaxError'
      this.line = line
    }
  }

  const DELIMITER = /^---\s*$/
  const TOP_LEVEL_KEY = /^([A-Za-z_][A-Za-z0-9_-]*)\s*:/

  export function parseFrontmatter(source: string): Frontmatter | null {
    const text = source.replace(/^﻿/, '').replace(/\r\n/g, '\n')
    const lines = text.split('\n')

    if (lines.length === 0 || !DELIMITER.test(lines[0] ?? '')) {
      return null
    }

    let endIndex = -1

    for (let i = 1; i < lines.length; i++) {
      if (DELIMITER.test(lines[i] ?? '')) {
        endIndex = i
        break
      }
    }
    if (endIndex === -1) {
      return null
    }

    const block = lines.slice(1, endIndex).join('\n')
    let data: Record<string, unknown>

    try {
      data = (YAML.parse(block) ?? {}) as Record<string, unknown>
    } catch (err) {
      const at = err instanceof YAML.YAMLParseError ? (err.linePos?.[0]?.line ?? 1) : 1

      throw new FrontmatterSyntaxError(err instanceof Error ? err.message : 'YAML inválido', at + 1)
    }

    const keyLines: Record<string, number> = {}

    for (let i = 1; i < endIndex; i++) {
      const match = TOP_LEVEL_KEY.exec(lines[i] ?? '')

      if (match?.[1] !== undefined && keyLines[match[1]] === undefined) {
        keyLines[match[1]] = i + 1
      }
    }

    return {
      data,
      lines: keyLines,
      endLine: endIndex + 1,
      body: lines.slice(endIndex + 1).join('\n'),
      bodyStartLine: endIndex + 2,
    }
  }
  ```

- [ ] **Passo 4: Teste de `frontmatter.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { parseFrontmatter } from '../../src/core/frontmatter.ts'

  test('parseFrontmatter lê chaves de topo e linhas', () => {
    const result = parseFrontmatter('---\nowner: "@x"\nstatus: draft\n---\ncorpo\n')

    assert.equal(result?.data.owner, '@x')
    assert.equal(result?.data.status, 'draft')
    assert.equal(result?.lines.status, 3)
    assert.equal(result?.body, 'corpo\n')
  })

  test('sem delimitador de abertura, devolve null', () => {
    assert.equal(parseFrontmatter('# título\n'), null)
  })
  ```

- [ ] **Passo 5: Portar `core/exec.ts`**

  Funde `src/git/staged.ts`, `src/git/diff.ts` (só o que os checks/hooks do
  núcleo usam: `stagedPaths`, `changedPaths`, `commitMessages` — `changedLines`
  fica em `@esliph/living-docs`, que é quem tem `CI-9`/bump em massa) e
  `src/exec/command.ts`, num módulo só:

  ```typescript
  import { execFileSync, execSync } from 'node:child_process'

  export type GitRunner = (args: readonly string[], cwd: string) => string

  const STAGED_TIMEOUT_MS = 3_000
  const DIFF_TIMEOUT_MS = 10_000

  const runGitStaged: GitRunner = (args, cwd) =>
    execFileSync('git', [...args], { cwd, encoding: 'utf8', timeout: STAGED_TIMEOUT_MS, stdio: ['ignore', 'pipe', 'ignore'] })

  const runGitDiff: GitRunner = (args, cwd) =>
    execFileSync('git', [...args], {
      cwd,
      encoding: 'utf8',
      timeout: DIFF_TIMEOUT_MS,
      maxBuffer: 16 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    })

  function reasonOf(err: unknown): string {
    const stderr = (err as { stderr?: unknown }).stderr
    const text = String(stderr ?? '').trim() || (err instanceof Error ? err.message : String(err))

    return text.split('\n')[0] ?? text
  }

  export class GitError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'GitError'
    }
  }

  const NUL = String.fromCharCode(0)

  /** Falha aberta: quem chama é hook, e lista vazia significa "não sei". */
  export function stagedPaths(root: string, run: GitRunner = runGitStaged): string[] {
    let output: string

    try {
      output = run(['-c', 'safe.directory=*', 'diff', '--cached', '--name-only', '-z'], root)
    } catch {
      return []
    }

    return output
      .split(NUL)
      .map(path => path.trim().replace(/\\/g, '/'))
      .filter(path => path !== '')
  }

  function git(args: readonly string[], root: string, run: GitRunner, what: string): string {
    try {
      return run(['-c', 'safe.directory=*', ...args], root)
    } catch (err) {
      throw new GitError(`${what} falhou: ${reasonOf(err)}`)
    }
  }

  /** Erro sobe: quem chama é check, e silêncio custa um contrato quebrado com CI verde. */
  export function changedPaths(root: string, base: string, run: GitRunner = runGitDiff): string[] {
    const output = git(['diff', '--name-only', '-z', `${base}...HEAD`], root, run, `git diff ${base}...HEAD`)

    return output
      .split(NUL)
      .map(path => path.trim().replace(/\\/g, '/'))
      .filter(path => path !== '')
  }

  export function commitMessages(root: string, base: string, run: GitRunner = runGitDiff): string[] {
    const output = git(['log', '--format=%B%x00', `${base}..HEAD`], root, run, `git log ${base}..HEAD`)

    return output
      .split(NUL)
      .map(message => message.trim())
      .filter(message => message !== '')
  }

  export type CommandRunner = (command: string, cwd: string) => string

  export const COMMAND_TIMEOUT_MS = 60_000

  export const runCommand: CommandRunner = (command, cwd) =>
    execSync(command, { cwd, encoding: 'utf8', timeout: COMMAND_TIMEOUT_MS, maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] })
  ```

- [ ] **Passo 6: Teste de `exec.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { changedPaths, commitMessages, stagedPaths, runCommand } from '../../src/core/exec.ts'

  test('stagedPaths falha aberta: runner que lança devolve lista vazia', () => {
    assert.deepEqual(
      stagedPaths('/repo', () => {
        throw new Error('sem git')
      }),
      [],
    )
  })

  test('changedPaths parseia saída NUL-separada', () => {
    assert.deepEqual(
      changedPaths('/repo', 'main', () => 'a.md\0b/c.md\0'),
      ['a.md', 'b/c.md'],
    )
  })

  test('commitMessages separa por NUL e apara espaço', () => {
    assert.deepEqual(
      commitMessages('/repo', 'main', () => ' msg um \0msg dois\n\ncorpo\0'),
      ['msg um', 'msg dois\n\ncorpo'],
    )
  })

  test('runCommand executa e devolve stdout', () => {
    assert.equal(runCommand('node -e "process.stdout.write(String(1+1))"', process.cwd()), '2')
  })
  ```

- [ ] **Passo 7: Portar `core/exception-label.ts`**

  Cópia exata de `src/checks/exception-label.ts` — já é genérico por
  `label`, sem nada específico de `@esliph/living-docs`:

  ```typescript
  export function exceptionReasonFor(label: string, messages: readonly string[]): string | null {
    const pattern = new RegExp(`^[ \\t]*${label}:[ \\t]*none[ \\t]*[—–:-][ \\t]*(\\S.*)$`, 'im')

    for (const message of messages) {
      const reason = pattern.exec(message)?.[1]?.trim()

      if (reason) {
        return reason
      }
    }

    return null
  }
  ```

- [ ] **Passo 8: Teste de `exception-label.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { exceptionReasonFor } from '../../src/core/exception-label.ts'

  test('reconhece o rótulo com razão e devolve a razão', () => {
    assert.equal(exceptionReasonFor('Docs', ['fix: x', 'Docs: none — não afeta doc nenhum']), 'não afeta doc nenhum')
  })

  test('rótulo sem razão não conta', () => {
    assert.equal(exceptionReasonFor('Docs', ['Docs: none —']), null)
  })

  test('sem o rótulo, devolve null', () => {
    assert.equal(exceptionReasonFor('Docs', ['fix: x']), null)
  })
  ```

- [ ] **Passo 9: Portar `core/codeowners.ts`**

  Cópia de `src/config/codeowners.ts`, sem alteração:

  ```typescript
  import { readFileSync } from 'node:fs'
  import { join } from 'node:path'
  import picomatch from 'picomatch'

  export const CODEOWNERS_PATHS: readonly string[] = ['CODEOWNERS', '.github/CODEOWNERS', 'docs/CODEOWNERS']

  export interface CodeownersEntry {
    pattern: string
    owners: string[]
    line: number
  }

  export interface Codeowners {
    file: string
    entries: CodeownersEntry[]
  }

  export function parseCodeowners(source: string): CodeownersEntry[] {
    const entries: CodeownersEntry[] = []
    const lines = source.replace(/\r\n/g, '\n').split('\n')

    for (let i = 0; i < lines.length; i++) {
      const line = (lines[i] ?? '').trim()

      if (line === '' || line.startsWith('#')) {
        continue
      }

      const [pattern, ...rest] = line.split(/\s+/)

      if (pattern === undefined) {
        continue
      }

      entries.push({ pattern, owners: rest.filter(owner => owner.startsWith('@')), line: i + 1 })
    }

    return entries
  }

  export function loadCodeowners(root: string): Codeowners | null {
    for (const candidate of CODEOWNERS_PATHS) {
      let source: string

      try {
        source = readFileSync(join(root, candidate), 'utf8')
      } catch {
        continue
      }

      return { file: candidate, entries: parseCodeowners(source) }
    }

    return null
  }

  function matcherFor(pattern: string): (repoPath: string) => boolean {
    const clean = pattern.replace(/\\/g, '/').replace(/^\//, '')

    if (clean === '*' || clean === '**') {
      return () => true
    }
    if (clean.endsWith('/')) {
      return repoPath => repoPath.startsWith(clean)
    }
    if (clean.includes('*')) {
      const isMatch = picomatch([clean, `${clean}/**`])

      return repoPath => isMatch(repoPath)
    }

    return repoPath => repoPath === clean || repoPath.startsWith(`${clean}/`)
  }

  export function ownersOf(codeowners: Codeowners, repoPath: string): string[] | null {
    const target = repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
    let owners: string[] | null = null

    for (const entry of codeowners.entries) {
      if (entry.owners.length === 0) {
        continue
      }
      if (matcherFor(entry.pattern)(target)) {
        owners = entry.owners
      }
    }

    return owners
  }
  ```

- [ ] **Passo 10: Teste de `codeowners.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownersOf, parseCodeowners } from '../../src/core/codeowners.ts'

  test('a última regra que casa ganha', () => {
    const entries = parseCodeowners('docs/ @a\ndocs/x.md @b\n')
    const codeowners = { file: 'CODEOWNERS', entries }

    assert.deepEqual(ownersOf(codeowners, 'docs/x.md'), ['@b'])
    assert.deepEqual(ownersOf(codeowners, 'docs/y.md'), ['@a'])
    assert.equal(ownersOf(codeowners, 'other.md'), null)
  })
  ```

- [ ] **Passo 11: Rodar a suíte do pacote**

  ```bash
  cd packages/ownership && node --test "test/**/*.test.ts" && npm run typecheck
  ```

  Esperado: todos os testes passam, `tsc` sem erro.

- [ ] **Passo 12: Commit**

  ```bash
  git add packages/ownership/src/core packages/ownership/test
  git commit -m "feat(<ADR-fronteira>): porta utilitários de leitura (files, frontmatter, exec, exception-label, codeowners)"
  ```

---

### Tarefa 4: Tipos e parser do esquema v2

Regra de origem: `<RN-esquema>`; spec §2 e o ADR "esquema v2" da Tarefa 1. Este é o núcleo do
pacote — todo o resto lê o resultado deste parser.

**Arquivos:**
- Create: `packages/ownership/src/schema/types.ts`
- Create: `packages/ownership/src/schema/parse.ts`
- Test: `packages/ownership/test/schema/parse.test.ts`

**Interfaces:**
- Consome: nada (é a base).
- Produz: `type Collection`, `type SectionKeyMode`, `interface FormatBlock`,
  `interface DerivesFrom`, `interface OwnedRuleRaw`, `interface GeneratedRuleRaw`,
  `interface WatchRuleRaw`, `interface ParsedFile`, `interface RootFile`,
  `class OwnershipError`, `parseOwnershipFile(source, file, opts): ParsedFile | RootFile`.

- [ ] **Passo 1: Escrever os testes que falham primeiro**

  `packages/ownership/test/schema/parse.test.ts`:

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { OwnershipError, parseOwnershipFile } from '../../src/schema/parse.ts'

  const ROOT = { isRoot: true, pluginNames: [] }
  const CHILD = (pluginNames: string[] = []) => ({ isRoot: false, pluginNames })

  test('raiz exige version: 2', () => {
    assert.throws(() => parseOwnershipFile('owned: []\n', '.ownership.yml', ROOT), /version.*2/)
  })

  test('raiz aceita version: 2 e plugins: vazio por padrão', () => {
    const parsed = parseOwnershipFile('version: 2\nowned: []\n', '.ownership.yml', ROOT) as { plugins: string[] }

    assert.deepEqual(parsed.plugins, [])
  })

  test('arquivo filho exige version e recusa plugins', () => {
    assert.throws(() => parseOwnershipFile('owned: []\n', 'packages/api/.ownership.yml', CHILD()), /version/)
    assert.throws(() => parseOwnershipFile('version: 2\nowned: []\nplugins: [x]\n', 'packages/api/.ownership.yml', CHILD()), /exclusivo do arquivo raiz/)
  })

  test('chave de topo desconhecida é erro', () => {
    assert.throws(() => parseOwnershipFile('version: 2\nowned: []\nfoo: 1\n', '.ownership.yml', ROOT), /"foo"/)
  })

  test('versão 1 é recusada em voz alta, dizendo que o esquema mudou', () => {
    assert.throws(() => parseOwnershipFile('version: 1\nartifacts: []\n', 'docs/.ownership.yml', ROOT), /esquema v1/)
  })

  test('owned, generated e watches que não são lista são erro, não lista vazia', () => {
    assert.throws(() => parseOwnershipFile('version: 2\nowned: {}\n', '.ownership.yml', ROOT), /owned.*lista/)
    assert.throws(() => parseOwnershipFile('version: 2\nowned: []\nwatches: x\n', '.ownership.yml', ROOT), /watches.*lista/)
  })

  test('owned exige owner começando com @', () => {
    const source = 'version: 2\nowned:\n  - path: docs/x/\n    owner: sem-arroba\n'

    assert.throws(() => parseOwnershipFile(source, '.ownership.yml', ROOT), /@/)
  })

  test('owner ausente é erro — não há de onde herdar', () => {
    assert.throws(() => parseOwnershipFile('version: 2\nowned:\n  - path: ./\n    skill: outro\n', 'packages/api/.ownership.yml', CHILD()), /owner/)
  })

  test('per-file aceita format só para state-field; key é erro', () => {
    const ok = 'version: 2\nowned:\n  - path: docs/adr/\n    owner: "@a"\n    format:\n      collection: per-file\n      state-field: Situação\n'
    const parsed = parseOwnershipFile(ok, '.ownership.yml', ROOT) as { owned: { format: { collection: string; stateField: string } }[] }

    assert.equal(parsed.owned[0]?.format.collection, 'per-file')
    assert.equal(parsed.owned[0]?.format.stateField, 'situação')

    const bad = 'version: 2\nowned:\n  - path: docs/adr/\n    owner: "@a"\n    format:\n      collection: per-file\n      key: ID\n'

    assert.throws(() => parseOwnershipFile(bad, '.ownership.yml', ROOT), /"key"/)
  })

  test('owned per-file não declara format', () => {
    const source = 'version: 2\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    skill: decision-recorder\n'
    const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { format: { collection: string } }[] }

    assert.equal(parsed.owned[0]?.format.collection, 'per-file')
  })

  test('owned com format: table exige key nomeando a coluna', () => {
    const source = 'version: 2\nowned:\n  - path: docs/open-decisions.md\n    owner: "@a"\n    format:\n      collection: table\n'

    assert.throws(() => parseOwnershipFile(source, '.ownership.yml', ROOT), /format: precisa do campo `key`/)
  })

  test('owned com format: sections aceita key: first-token (padrão) ou heading', () => {
    const source =
      'version: 2\nowned:\n  - path: docs/requirements/rules.md\n    owner: "@a"\n    format:\n      collection: sections\n'
    const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { format: { keyMode: string | null } }[] }

    assert.equal(parsed.owned[0]?.format.keyMode, 'first-token')
  })

  test('state-field é opcional, default "status", normalizado', () => {
    const source =
      'version: 2\nowned:\n  - path: docs/open-decisions.md\n    owner: "@a"\n    format:\n      collection: table\n      key: ID\n      state-field: Situação\n'
    const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { format: { stateField: string } }[] }

    assert.equal(parsed.owned[0]?.format.stateField, 'situação')
  })

  test('derives-from exige source e field', () => {
    const source =
      'version: 2\nowned:\n  - path: docs/superpowers/plans/\n    owner: "@a"\n    derives-from:\n      source: docs/superpowers/specs/\n      field: spec\n'
    const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { owned: { derivesFrom: { source: string; field: string } | null }[] }

    assert.deepEqual(parsed.owned[0]?.derivesFrom, { source: 'docs/superpowers/specs/', field: 'spec' })
  })

  test('bloco de plugin passa opaco quando o nome está em plugins:, e reprova quando não está', () => {
    const withBlock = 'version: 2\nplugins: [living-docs]\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    living-docs:\n      id-prefix: ADR\n'
    const parsed = parseOwnershipFile(withBlock, '.ownership.yml', ROOT) as { owned: { pluginBlocks: Record<string, unknown> }[] }

    assert.deepEqual(parsed.owned[0]?.pluginBlocks, { 'living-docs': { 'id-prefix': 'ADR' } })

    const withoutDeclared = 'version: 2\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    living-docs:\n      id-prefix: ADR\n'

    assert.throws(() => parseOwnershipFile(withoutDeclared, '.ownership.yml', ROOT), /"living-docs"/)
  })

  test('generated e watches são estritos em chave desconhecida', () => {
    assert.throws(
      () => parseOwnershipFile('version: 2\nowned: []\ngenerated:\n  - path: a.md\n    command: x\n    extra: 1\n', '.ownership.yml', ROOT),
      /"extra"/,
    )
    assert.throws(
      () => parseOwnershipFile('version: 2\nowned: []\nwatches:\n  - code: "src/**"\n    doc: a.md\n    extra: 1\n', '.ownership.yml', ROOT),
      /"extra"/,
    )
  })

  test('watches lê consumer-visible e reason opcionais', () => {
    const source = 'version: 2\nowned: []\nwatches:\n  - code: "src/**"\n    doc: CHANGELOG.md\n    consumer-visible: true\n    reason: "x"\n'
    const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { watches: { consumerVisible: boolean; reason: string | null }[] }

    assert.equal(parsed.watches[0]?.consumerVisible, true)
    assert.equal(parsed.watches[0]?.reason, 'x')
  })

  test('ignore e include são listas de string', () => {
    const source = 'version: 2\nowned: []\nignore: ["node_modules/**"]\ninclude: ["packages/api/"]\n'
    const parsed = parseOwnershipFile(source, '.ownership.yml', ROOT) as { ignore: string[]; include: string[] }

    assert.deepEqual(parsed.ignore, ['node_modules/**'])
    assert.deepEqual(parsed.include, ['packages/api/'])
  })

  test('dir do arquivo é derivado do próprio caminho', () => {
    const rootParsed = parseOwnershipFile('version: 2\nowned: []\n', '.ownership.yml', ROOT)
    const childParsed = parseOwnershipFile('version: 2\nowned: []\n', 'packages/api/.ownership.yml', CHILD())

    assert.equal(rootParsed.dir, '')
    assert.equal(childParsed.dir, 'packages/api')
  })

  test('basePath é normalizado, e só desce', () => {
    const parsed = parseOwnershipFile('version: 2\nbasePath: packages/api/\nowned: []\n', 'ownership.api.yml', ROOT) as { basePath: string | null }

    assert.equal(parsed.basePath, 'packages/api')
    assert.equal((parseOwnershipFile('version: 2\nowned: []\n', '.ownership.yml', ROOT) as { basePath: string | null }).basePath, null)

    for (const bad of ['../web', '/abs', 'packages/*', 'packages/../../web']) {
      assert.throws(() => parseOwnershipFile(`version: 2\nbasePath: ${bad}\nowned: []\n`, '.ownership.yml', ROOT), /basePath/)
    }
  })

  test('YAML inválido é OwnershipError', () => {
    assert.throws(() => parseOwnershipFile('version: [2\n', '.ownership.yml', ROOT), OwnershipError)
  })
  ```

- [ ] **Passo 2: Rodar e confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/schema/parse.test.ts
  ```

  Esperado: FAIL — `Cannot find module '../../src/schema/parse.ts'`.

- [ ] **Passo 3: Escrever `schema/types.ts`**

  ```typescript
  export type Collection = 'per-file' | 'table' | 'sections'
  export type SectionKeyMode = 'first-token' | 'heading'

  export interface FormatBlock {
    collection: Collection
    /** Nome da coluna, quando `collection` é `table`. Null nos outros dois casos. */
    key: string | null
    /** Só quando `collection` é `sections`. */
    keyMode: SectionKeyMode | null
    /** Normalizado (minúsculo, sem espaço nas pontas). Default `'status'`. */
    stateField: string
  }

  export interface DerivesFrom {
    source: string
    field: string
  }

  export interface OwnedRuleRaw {
    path: string
    /** Obrigatório: sem cascata, nenhuma entrada herda dono de outro arquivo (spec §5). */
    owner: string
    skill: string | null
    /** Vocabulário do projeto; `null` quando o caminho não declara ciclo de vida. */
    states: string[] | null
    format: FormatBlock
    /** Se o arquivo escreveu `format:` — o default do parser não é declaração. */
    formatDeclared: boolean
    derivesFrom: DerivesFrom | null
    /** Por nome de plugin declarado em `plugins:`. Conteúdo opaco ao núcleo. */
    pluginBlocks: Record<string, unknown>
  }

  export interface GeneratedRuleRaw {
    path: string
    command: string
  }

  export interface WatchRuleRaw {
    code: string
    doc: string
    reason: string | null
    consumerVisible: boolean
  }

  export interface ParsedFile {
    /** Caminho deste arquivo de ownership, relativo à raiz do repositório. */
    file: string
    /** Diretório deste arquivo, relativo à raiz. `''` para a raiz do repositório. */
    dir: string
    version: 2
    /** Desloca a base para dentro do diretório do arquivo; `null` quando a base é o próprio diretório. */
    basePath: string | null
    owned: OwnedRuleRaw[]
    generated: GeneratedRuleRaw[]
    watches: WatchRuleRaw[]
    ignore: string[]
    include: string[]
  }

  export interface RootFile extends ParsedFile {
    plugins: string[]
  }

  export class OwnershipError extends Error {
    constructor(message: string) {
      super(message)
      this.name = 'OwnershipError'
    }
  }
  ```

- [ ] **Passo 4: Escrever `schema/parse.ts`**

  ```typescript
  import { posix } from 'node:path'
  import YAML from 'yaml'
  import { OwnershipError } from './types.ts'
  import type { DerivesFrom, FormatBlock, GeneratedRuleRaw, OwnedRuleRaw, ParsedFile, RootFile, WatchRuleRaw } from './types.ts'

  export { OwnershipError } from './types.ts'
  export type { Collection, DerivesFrom, FormatBlock, GeneratedRuleRaw, OwnedRuleRaw, ParsedFile, RootFile, SectionKeyMode, WatchRuleRaw } from './types.ts'

  export interface ParseOptions {
    isRoot: boolean
    /** Nomes de plugin válidos como bloco dentro de `owned[]` — vêm de `plugins:` na raiz. */
    pluginNames: readonly string[]
  }

  function asRecord(value: unknown, where: string): Record<string, unknown> {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) {
      throw new OwnershipError(`${where}: precisa ser um mapa.`)
    }

    return value as Record<string, unknown>
  }

  function asStringList(value: unknown, where: string): string[] {
    if (value === undefined || value === null) {
      return []
    }
    if (!Array.isArray(value) || value.some(item => typeof item !== 'string')) {
      throw new OwnershipError(`${where}: precisa ser uma lista de strings.`)
    }

    return value as string[]
  }

  /** Ausente é lista vazia; presente e não-lista é erro — nunca vira `[]` em silêncio. */
  function asList(value: unknown, where: string): unknown[] {
    if (value === undefined || value === null) {
      return []
    }
    if (!Array.isArray(value)) {
      throw new OwnershipError(`${where}: precisa ser uma lista.`)
    }

    return value
  }

  function requireString(source: Record<string, unknown>, key: string, where: string): string {
    const value = source[key]

    if (typeof value !== 'string' || value.trim() === '') {
      throw new OwnershipError(`${where}: precisa do campo \`${key}\` não vazio.`)
    }

    return value
  }

  function normalizeKey(key: string): string {
    return key.trim().toLowerCase()
  }

  function dirOf(file: string): string {
    const dir = posix.dirname(file.replace(/\\/g, '/'))

    return dir === '.' ? '' : dir
  }

  function assertKnownKeys(item: Record<string, unknown>, allowed: ReadonlySet<string>, where: string, hint = ''): void {
    for (const key of Object.keys(item)) {
      if (!allowed.has(key)) {
        throw new OwnershipError(`${where}: chave "${key}" desconhecida.${hint}`)
      }
    }
  }

  function parseFormat(raw: unknown, where: string): FormatBlock {
    if (raw === undefined) {
      return { collection: 'per-file', key: null, keyMode: null, stateField: 'status' }
    }

    const item = asRecord(raw, `${where}.format`)
    const stateFieldRaw = item['state-field'] ?? 'status'

    if (typeof stateFieldRaw !== 'string' || stateFieldRaw.trim() === '') {
      throw new OwnershipError(`${where}.format.state-field: precisa ser uma string não vazia.`)
    }
    const stateField = normalizeKey(stateFieldRaw)

    // per-file não tem chave a localizar (a identidade é o arquivo), mas o
    // estado ainda mora num campo do frontmatter, e esse campo é configurável
    // (spec §3, `state-field`). O bloco existe só para isso: `key` é erro.
    if (item.collection === 'per-file') {
      assertKnownKeys(item, new Set(['collection', 'state-field']), `${where}.format`, ' Em per-file a identidade é o arquivo.')

      return { collection: 'per-file', key: null, keyMode: null, stateField }
    }
    if (item.collection === 'table') {
      assertKnownKeys(item, new Set(['collection', 'key', 'state-field']), `${where}.format`)
      const key = requireString(item, 'key', `${where}.format`)

      return { collection: 'table', key, keyMode: null, stateField }
    }
    if (item.collection === 'sections') {
      assertKnownKeys(item, new Set(['collection', 'key', 'state-field']), `${where}.format`)
      const keyMode = item.key ?? 'first-token'

      if (keyMode !== 'first-token' && keyMode !== 'heading') {
        throw new OwnershipError(`${where}.format.key: precisa ser "first-token" ou "heading" (recebido: ${String(keyMode)}).`)
      }

      return { collection: 'sections', key: null, keyMode, stateField }
    }

    throw new OwnershipError(`${where}.format.collection: precisa ser "per-file", "table" ou "sections".`)
  }

  function parseDerivesFrom(raw: unknown, where: string): DerivesFrom | null {
    if (raw === undefined) {
      return null
    }
    const item = asRecord(raw, `${where}.derives-from`)

    assertKnownKeys(item, new Set(['source', 'field']), `${where}.derives-from`)

    return {
      source: requireString(item, 'source', `${where}.derives-from`),
      field: requireString(item, 'field', `${where}.derives-from`),
    }
  }

  const OWNED_CORE_KEYS = new Set(['path', 'owner', 'skill', 'states', 'format', 'derives-from'])

  function parseOwned(raw: unknown, index: number, file: string, pluginNames: readonly string[]): OwnedRuleRaw {
    const where = `${file}: owned[${index}]`
    const item = asRecord(raw, where)

    for (const key of Object.keys(item)) {
      if (OWNED_CORE_KEYS.has(key) || pluginNames.includes(key)) {
        continue
      }
      throw new OwnershipError(`${where}: chave "${key}" desconhecida. Se é de um plugin, declare-o em \`plugins:\` na raiz.`)
    }

    const ownerRaw = item.owner

    if (typeof ownerRaw !== 'string' || !ownerRaw.startsWith('@')) {
      throw new OwnershipError(`${where}.owner "${String(ownerRaw)}" precisa ser uma string começando com @. Toda entrada declara o próprio dono.`)
    }

    const owner = ownerRaw

    const skill = item.skill

    if (skill !== undefined && (typeof skill !== 'string' || skill.trim() === '')) {
      throw new OwnershipError(`${where}.skill: precisa ser uma string não vazia, ou ficar ausente.`)
    }

    const pluginBlocks: Record<string, unknown> = {}

    for (const name of pluginNames) {
      if (item[name] !== undefined) {
        pluginBlocks[name] = item[name]
      }
    }

    return {
      path: requireString(item, 'path', where),
      owner,
      skill: skill === undefined ? null : skill,
      states: item.states === undefined ? null : asStringList(item.states, `${where}.states`),
      format: parseFormat(item.format, where),
      formatDeclared: item.format !== undefined,
      derivesFrom: parseDerivesFrom(item['derives-from'], where),
      pluginBlocks,
    }
  }

  function parseGenerated(raw: unknown, index: number, file: string): GeneratedRuleRaw {
    const where = `${file}: generated[${index}]`
    const item = asRecord(raw, where)

    assertKnownKeys(item, new Set(['path', 'command']), where)

    return { path: requireString(item, 'path', where), command: requireString(item, 'command', where) }
  }

  function parseWatch(raw: unknown, index: number, file: string): WatchRuleRaw {
    const where = `${file}: watches[${index}]`
    const item = asRecord(raw, where)

    assertKnownKeys(item, new Set(['code', 'doc', 'reason', 'consumer-visible']), where)
    const reason = item.reason

    return {
      code: requireString(item, 'code', where),
      doc: requireString(item, 'doc', where),
      reason: typeof reason === 'string' ? reason : null,
      consumerVisible: item['consumer-visible'] === true,
    }
  }

  const ROOT_KEYS = new Set(['version', 'plugins', 'basePath', 'owned', 'generated', 'watches', 'ignore', 'include'])
  const CHILD_KEYS = new Set(['version', 'basePath', 'owned', 'generated', 'watches', 'ignore', 'include'])

  /** Só desce: sem `..`, sem glob, sem caminho absoluto — é o que mantém a poda correta sem abrir o arquivo (spec §5). */
  function parseBasePath(value: unknown, file: string): string | null {
    if (value === undefined || value === null) {
      return null
    }
    if (typeof value !== 'string' || value.trim() === '') {
      throw new OwnershipError(`${file}: \`basePath\` precisa ser uma string não vazia.`)
    }

    const normalized = value.replace(/\\/g, '/').replace(/\/$/, '')

    if (normalized.startsWith('/') || normalized === '..' || normalized.startsWith('../') || normalized.includes('/../') || normalized.includes('*')) {
      throw new OwnershipError(`${file}: \`basePath\` "${value}" precisa apontar para dentro do diretório do arquivo — sem \`..\`, sem glob e sem caminho absoluto.`)
    }

    return normalized
  }

  export function parseOwnershipFile(source: string, file: string, opts: ParseOptions): ParsedFile | RootFile {
    let raw: unknown

    try {
      raw = YAML.parse(source)
    } catch (err) {
      throw new OwnershipError(`${file}: YAML inválido — ${err instanceof Error ? err.message : String(err)}`)
    }

    const root = asRecord(raw, file)

    let pluginNames = opts.pluginNames
    let plugins: string[] | undefined

    // A versão vem antes da checagem de chaves, e vale para todo arquivo, não só a
    // raiz: um arquivo v1 tem `artifacts`/`documents`, e "chave desconhecida"
    // esconderia o motivo real.
    if (root.version === 1) {
      throw new OwnershipError(
        `${file}: esquema v1 — o núcleo só lê a v2 (lista \`owned\`, blocos por plugin). ` +
          'Migre o arquivo antes de usar `ownership`; a migração ainda não tem comando próprio.',
      )
    }
    if (root.version !== 2) {
      throw new OwnershipError(`${file}: campo \`version\` precisa ser 2 (recebido: ${String(root.version)}).`)
    }

    assertKnownKeys(root, opts.isRoot ? ROOT_KEYS : CHILD_KEYS, file, opts.isRoot ? '' : ' `plugins` é exclusivo do arquivo raiz.')

    if (opts.isRoot) {
      plugins = asStringList(root.plugins, `${file}.plugins`)
      pluginNames = plugins
    }

    const ownedRaw = asList(root.owned, `${file}.owned`)
    const generatedRaw = asList(root.generated, `${file}.generated`)
    const watchesRaw = asList(root.watches, `${file}.watches`)

    const parsed: ParsedFile = {
      file,
      dir: dirOf(file),
      version: 2,
      basePath: parseBasePath(root.basePath, file),
      owned: ownedRaw.map((entry, i) => parseOwned(entry, i, file, pluginNames)),
      generated: generatedRaw.map((entry, i) => parseGenerated(entry, i, file)),
      watches: watchesRaw.map((entry, i) => parseWatch(entry, i, file)),
      ignore: asStringList(root.ignore, `${file}.ignore`),
      include: asStringList(root.include, `${file}.include`),
    }

    return opts.isRoot ? { ...parsed, plugins: plugins ?? [] } : parsed
  }
  ```

- [ ] **Passo 5: Rodar os testes**

  ```bash
  cd packages/ownership && node --test test/schema/parse.test.ts
  ```

  Esperado: PASS em todos.

- [ ] **Passo 6: Type-check**

  ```bash
  cd packages/ownership && npm run typecheck
  ```

- [ ] **Passo 7: Commit**

  ```bash
  git add packages/ownership/src/schema/types.ts packages/ownership/src/schema/parse.ts packages/ownership/test/schema/parse.test.ts
  git commit -m "feat(<RN-esquema>): parser estrito do esquema v2"
  ```

---

### Tarefa 5: Identidade de item opaca

Regra de origem: `<RN-identidade>`; spec §3. Generaliza `src/docs/table.ts` e `src/docs/sections.ts`
do `@esliph/living-docs`, removendo a dependência de `IdFormat`/regex de ID: a
chave passa a ser o que `format.key` (Tarefa 4) manda ler, sem forma exigida.

**Duas decisões de implementação que este plano toma:**

- **Chave duplicada não lança.** O parser devolve todos os itens e
  `findDuplicateKeys` aponta as repetições. Quem decide o que fazer é quem
  chama: o check `ownership/declared-state` (Tarefa 12) transforma em achado —
  a spec §3 diz que o núcleo garante chave única, e garantia de check é achado,
  não exceção que derruba o `validate` inteiro; o hook ignora, por falha aberta.
- **Em `sections`, item é heading de nível 2 (`##`).** O parser de hoje aceita
  `##` a `####` porque filtra pelo regex de ID. Sem esse filtro, todo
  subtítulo (`### Exemplo` dentro de uma regra) viraria item — e item
  duplicado. Os três arquivos de requisitos deste repositório só usam `##` para
  item. Nível configurável fica para quando um consumidor pedir.

**Arquivos:**
- Create: `packages/ownership/src/schema/item.ts`
- Test: `packages/ownership/test/schema/item.test.ts`

**Interfaces:**
- Consome: `FormatBlock` (Tarefa 4).
- Produz: `interface DocItem { key: string; state: string; line: number; fields: Record<string, string> }`,
  `normalizeFieldKey(key: string): string`, `isEmptyValue(value: string): boolean`,
  `parseItemsTable(source: string, startLine: number, format: Pick<FormatBlock, 'key' | 'stateField'>): DocItem[]`,
  `parseItemsSections(source: string, startLine: number, format: Pick<FormatBlock, 'keyMode' | 'stateField'>): DocItem[]`,
  `findDuplicateKeys(items: readonly DocItem[]): DocItem[]`.

- [ ] **Passo 1: Escrever os testes que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { findDuplicateKeys, parseItemsSections, parseItemsTable } from '../../src/schema/item.ts'

  test('parseItemsTable lê pela coluna nomeada em format.key, chave opaca', () => {
    const source = ['| ID | Lacuna | Status |', '| --- | ------ | ------ |', '| DA-01 | x | open |', '| T-9 | y | resolved |'].join('\n')
    const items = parseItemsTable(source, 1, { key: 'ID', stateField: 'status' })

    assert.deepEqual(
      items.map(item => item.key),
      ['DA-01', 'T-9'],
    )
    assert.equal(items[0]?.state, 'open')
    assert.equal(items[0]?.fields.lacuna, 'x')
  })

  test('parseItemsTable: célula vazia ou marcador de vazio não vira item', () => {
    const source = ['| ID | Status |', '| --- | ------ |', '| - | open |', '| DA-01 | open |'].join('\n')
    const items = parseItemsTable(source, 1, { key: 'ID', stateField: 'status' })

    assert.deepEqual(
      items.map(item => item.key),
      ['DA-01'],
    )
  })

  test('parseItemsTable sem a coluna declarada devolve lista vazia', () => {
    const source = ['| Nome | Status |', '| ---- | ------ |', '| x | open |'].join('\n')

    assert.deepEqual(parseItemsTable(source, 1, { key: 'ID', stateField: 'status' }), [])
  })

  test('parseItemsTable devolve a chave duplicada, e findDuplicateKeys aponta a repetição', () => {
    const source = ['| ID | Status |', '| --- | ------ |', '| DA-01 | open |', '| DA-01 | resolved |'].join('\n')
    const items = parseItemsTable(source, 1, { key: 'ID', stateField: 'status' })

    assert.equal(items.length, 2)
    assert.deepEqual(
      findDuplicateKeys(items).map(item => item.line),
      [4],
    )
  })

  test('parseItemsSections, keyMode first-token: primeiro token é a chave, resto é título', () => {
    const source = '## RN-0001 — Título da regra\n\n- **status:** active\n- **relates-to:** ADR-0002\n\nCorpo.\n'
    const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })

    assert.equal(items[0]?.key, 'RN-0001')
    assert.equal(items[0]?.fields.title, 'Título da regra')
    assert.equal(items[0]?.state, 'active')
    assert.equal(items[0]?.fields['relates-to'], 'ADR-0002')
  })

  test('parseItemsSections, keyMode heading: a linha inteira do heading é a chave', () => {
    const source = '## Contexto\n\nTexto.\n\n## Decisão\n\nOutro texto.\n'
    const items = parseItemsSections(source, 1, { keyMode: 'heading', stateField: 'status' })

    assert.deepEqual(
      items.map(item => item.key),
      ['Contexto', 'Decisão'],
    )
  })

  test('parseItemsSections pula bloco de código cercado', () => {
    const source = '```\n## RN-9999 — exemplo de formato\n```\n\n## RN-0001 — real\n\n- **status:** active\n'
    const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })

    assert.deepEqual(
      items.map(item => item.key),
      ['RN-0001'],
    )
  })

  test('parseItemsSections: chave duplicada aparece em findDuplicateKeys', () => {
    const source = '## X — um\n\n- **status:** active\n\n## X — dois\n\n- **status:** active\n'

    assert.equal(findDuplicateKeys(parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })).length, 1)
  })

  test('parseItemsSections: só heading de nível 2 é item; subtítulo é corpo', () => {
    const source = '## RN-0001 — a\n\n### Exemplo\n\n## RN-0002 — b\n\n### Exemplo\n'
    const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'status' })

    assert.deepEqual(
      items.map(item => item.key),
      ['RN-0001', 'RN-0002'],
    )
  })

  test('state-field customizado é lido no lugar de status', () => {
    const source = '## X — um\n\n- **situação:** aberta\n'
    const items = parseItemsSections(source, 1, { keyMode: 'first-token', stateField: 'situação' })

    assert.equal(items[0]?.state, 'aberta')
  })
  ```

- [ ] **Passo 2: Rodar e confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/schema/item.test.ts
  ```

- [ ] **Passo 3: Escrever `schema/item.ts`**

  ```typescript
  import type { FormatBlock } from './types.ts'

  export interface DocItem {
    key: string
    state: string
    /** Linha 1-indexed no arquivo inteiro. */
    line: number
    fields: Record<string, string>
  }

  export function normalizeFieldKey(key: string): string {
    return key.trim().replace(/:$/, '').trim().toLowerCase()
  }

  const EMPTY = new Set(['', '-', '—', '–', 'n/a', 'na', 'null', 'nenhum', 'nenhuma'])

  export function isEmptyValue(value: string): boolean {
    return EMPTY.has(value.trim().toLowerCase())
  }

  /** Cada ocorrência depois da primeira de uma chave já vista. Não lança: quem chama decide (spec §3). */
  export function findDuplicateKeys(items: readonly DocItem[]): DocItem[] {
    const seen = new Set<string>()
    const duplicates: DocItem[] = []

    for (const item of items) {
      if (seen.has(item.key)) {
        duplicates.push(item)
      }
      seen.add(item.key)
    }

    return duplicates
  }

  function cells(row: string): string[] {
    const trimmed = row.trim()

    if (!trimmed.startsWith('|')) {
      return []
    }

    return trimmed
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map(cell => cell.trim())
  }

  function isSeparator(row: string): boolean {
    const parts = cells(row)

    return parts.length > 0 && parts.every(cell => /^:?-{3,}:?$/.test(cell))
  }

  export function parseItemsTable(source: string, startLine: number, format: Pick<FormatBlock, 'key' | 'stateField'>): DocItem[] {
    const keyName = normalizeFieldKey(format.key ?? '')
    const lines = source.replace(/\r\n/g, '\n').split('\n')

    for (let i = 0; i < lines.length; i++) {
      const header = cells(lines[i] ?? '')
      const keyColumn = header.findIndex(cell => normalizeFieldKey(cell) === keyName)

      if (keyColumn === -1) {
        continue
      }
      if (!isSeparator(lines[i + 1] ?? '')) {
        continue
      }

      const stateColumn = header.findIndex(cell => normalizeFieldKey(cell) === format.stateField)
      const items: DocItem[] = []

      for (let j = i + 2; j < lines.length; j++) {
        const row = cells(lines[j] ?? '')

        if (row.length === 0) {
          break
        }
        const key = (row[keyColumn] ?? '').trim()

        if (key === '' || isEmptyValue(key)) {
          continue
        }

        const fields: Record<string, string> = {}

        for (let c = 0; c < header.length; c++) {
          const fieldKey = normalizeFieldKey(header[c] ?? '')

          if (fieldKey !== '') {
            fields[fieldKey] = (row[c] ?? '').trim()
          }
        }

        items.push({ key, state: stateColumn === -1 ? '' : (row[stateColumn] ?? '').trim(), line: startLine + j, fields })
      }

      return items
    }

    return []
  }

  /** Só `##`: subtítulo é corpo do item, não item (ver a decisão no topo da tarefa). */
  const SECTION_HEADING = /^##\s+(.*)$/
  /** Primeiro token é a chave; o resto, sem o travessão opcional, é o título. */
  const FIRST_TOKEN = /^(\S+)(?:\s+(?:[—–-]\s*)?(.*))?$/
  const FIELD = /^[-*]\s+\*\*([^*]+?)\*\*\s*:?\s*(.*)$/
  const FENCE = /^(?:```|~~~)/

  export function parseItemsSections(source: string, startLine: number, format: Pick<FormatBlock, 'keyMode' | 'stateField'>): DocItem[] {
    const lines = source.replace(/\r\n/g, '\n').split('\n')
    const items: DocItem[] = []
    let inFence = false

    for (let i = 0; i < lines.length; i++) {
      const trimmed = (lines[i] ?? '').trim()

      if (FENCE.test(trimmed)) {
        inFence = !inFence
        continue
      }
      if (inFence) {
        continue
      }

      const heading = SECTION_HEADING.exec(trimmed)

      if (!heading?.[1]) {
        continue
      }

      const headingText = heading[1].trim()
      let key: string
      let title: string | undefined

      if (format.keyMode === 'heading') {
        key = headingText
      } else {
        const match = FIRST_TOKEN.exec(headingText)

        key = match?.[1] ?? headingText
        title = match?.[2]?.trim()
      }
      if (key === '') {
        continue
      }

      const fields: Record<string, string> = {}

      if (title) {
        fields.title = title
      }

      for (let j = i + 1; j < lines.length; j++) {
        const line = (lines[j] ?? '').trim()

        if (line === '') {
          continue
        }
        if (SECTION_HEADING.test(line) || line.startsWith('#') || FENCE.test(line)) {
          break
        }
        const field = FIELD.exec(line)

        if (!field?.[1]) {
          break
        }
        fields[normalizeFieldKey(field[1])] = (field[2] ?? '').trim()
      }

      items.push({ key, state: fields[format.stateField] ?? '', line: startLine + i, fields })
    }

    return items
  }
  ```

- [ ] **Passo 4: Rodar os testes**

  ```bash
  cd packages/ownership && node --test test/schema/item.test.ts && npm run typecheck
  ```

- [ ] **Passo 5: Commit**

  ```bash
  git add packages/ownership/src/schema/item.ts packages/ownership/test/schema/item.test.ts
  git commit -m "feat(<RN-identidade>): identidade de item opaca — chave por format.key, sem regex de ID"
  ```

---

### Tarefa 6: Resolução do arquivo raiz

Regra de origem: `<RN-resolucao>`; spec §8 e o ADR "resolução do arquivo" da Tarefa 1.

**Arquivos:**
- Create: `packages/ownership/src/resolve/candidates.ts`
- Test: `packages/ownership/test/resolve/candidates.test.ts`

**Interfaces:**
- Consome: `OwnershipError` (Tarefa 4).
- Produz: `interface LocateOptions { explicitPath?: string | null; env?: Record<string, string | undefined> }`,
  `locateRootFile(root: string, opts?: LocateOptions): string | null`.

- [ ] **Passo 1: Escrever os testes que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { locateRootFile } from '../../src/resolve/candidates.ts'
  import { OwnershipError } from '../../src/schema/types.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('sem candidato nenhum, devolve null (silêncio)', () => {
    withTempRepo({}, root => {
      assert.equal(locateRootFile(root), null)
    })
  })

  test('acha ./.ownership.yml', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
      assert.equal(locateRootFile(root), '.ownership.yml')
    })
  })

  test('acha ./docs/.ownership.yml quando o primeiro não existe', () => {
    withTempRepo({ 'docs/.ownership.yml': 'version: 2\nowned: []\n' }, root => {
      assert.equal(locateRootFile(root), 'docs/.ownership.yml')
    })
  })

  test('os dois candidatos presentes é erro que nomeia os dois', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'docs/.ownership.yml': 'version: 2\nowned: []\n' }, root => {
      assert.throws(() => locateRootFile(root), (err: unknown) => {
        assert.ok(err instanceof OwnershipError)
        assert.match(err.message, /\.ownership\.yml/)
        assert.match(err.message, /docs\/\.ownership\.yml/)

        return true
      })
    })
  })

  test('--ownership explícito ganha de tudo, mesmo sem existir nos candidatos padrão', () => {
    withTempRepo({ 'custom/o.yml': 'version: 2\nowned: []\n' }, root => {
      assert.equal(locateRootFile(root, { explicitPath: 'custom/o.yml' }), 'custom/o.yml')
    })
  })

  test('--ownership explícito que não existe é erro', () => {
    withTempRepo({}, root => {
      assert.throws(() => locateRootFile(root, { explicitPath: 'nope.yml' }), OwnershipError)
    })
  })

  test('variável de ambiente OWNERSHIP_CONFIG tem a mesma prioridade que o explícito', () => {
    withTempRepo({ 'custom/o.yml': 'version: 2\nowned: []\n' }, root => {
      assert.equal(locateRootFile(root, { env: { OWNERSHIP_CONFIG: 'custom/o.yml' } }), 'custom/o.yml')
    })
  })
  ```

- [ ] **Passo 2: Rodar e confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/resolve/candidates.test.ts
  ```

- [ ] **Passo 3: Escrever `resolve/candidates.ts`**

  ```typescript
  import { existsSync } from 'node:fs'
  import { join } from 'node:path'
  import { OwnershipError } from '../schema/types.ts'

  export interface LocateOptions {
    /** Vem de `--ownership <caminho>` no CLI. */
    explicitPath?: string | null
    env?: Record<string, string | undefined>
  }

  /** Ordem de candidatos quando nada é explícito (spec §8). */
  const CANDIDATES: readonly string[] = ['.ownership.yml', 'docs/.ownership.yml']

  /**
   * O arquivo de ownership raiz, ou `null` — repositório sem o toolkit, e isso
   * não é erro. Dois candidatos presentes é erro que nomeia os dois e nunca
   * escolhe: um arquivo recém-migrado convivendo com um esquecido validaria
   * pelo esquecido em silêncio.
   */
  export function locateRootFile(root: string, opts: LocateOptions = {}): string | null {
    const explicit = opts.explicitPath ?? opts.env?.OWNERSHIP_CONFIG ?? null

    if (explicit !== null) {
      if (!existsSync(join(root, explicit))) {
        throw new OwnershipError(`${explicit}: não encontrado — indicado explicitamente e não existe no repositório.`)
      }

      return explicit
    }

    const found = CANDIDATES.filter(candidate => existsSync(join(root, candidate)))

    if (found.length > 1) {
      throw new OwnershipError(
        `Mais de um arquivo de ownership encontrado: ${found.join(', ')}. ` +
          'A ambiguidade não se resolve sozinha — apague um dos dois, ou aponte o certo com `--ownership <caminho>`.',
      )
    }

    return found[0] ?? null
  }
  ```

- [ ] **Passo 4: Rodar os testes e o type-check**

  ```bash
  cd packages/ownership && node --test test/resolve/candidates.test.ts && npm run typecheck
  ```

- [ ] **Passo 5: Commit**

  ```bash
  git add packages/ownership/src/resolve/candidates.ts packages/ownership/test/resolve/candidates.test.ts
  git commit -m "feat(<RN-resolucao>): resolução do arquivo raiz por ordem de candidatos"
  ```

---

### Tarefa 7: Composição — base, include, disjunção, ciclo, poda

Regra de origem: spec §5, `<ADR-composicao>` e `<RN-composicao>`. Resolve a
árvore de arquivos de ownership num `ResolvedConfig` só, que todas as tarefas de
gatilho/check/hook consomem daqui em diante.

**O que a spec fixa e esta tarefa implementa:**

- **Base de cada arquivo.** É o diretório do arquivo mais o `basePath`, que só
  desce. A base da raiz é a raiz do repositório, more o arquivo raiz onde morar.
- **Confinamento pelo critério de gatilho.** `owned[].path`,
  `derives-from.source`, `generated[].path`, `watches[].code`, `ignore[]` e
  `include[]` resolvem dentro da base; `watches[].doc` pode apontar para qualquer
  lugar do repositório, porque nada dispara por editá-lo.
- **Disjunção.** Nenhum `owned[].path` resolvido é igual a outro nem prefixo de
  diretório de outro, venham do mesmo arquivo ou de arquivos diferentes. Colisão
  é erro que nomeia os dois arquivos e o caminho. `generated[].path` só é cobrado
  contra outro `generated[].path`; `watches` sobrepõe à vontade.
- **`version` em todo arquivo, `plugins` só na raiz.** Versão divergente entre
  dois arquivos é erro que nomeia os dois.
- **Acúmulo.** `owned`, `watches`, `generated` e `ignore` concatenam. Não há
  merge dentro de uma entrada, e por isso `owner` é obrigatório em todas elas.
- **Poda.** `resolveOwnership(root, { onlyFor })` só lê um arquivo incluído cujo
  diretório é ancestral de algum caminho em `onlyFor` — comparação de string, sem
  abrir o arquivo. Hooks passam `onlyFor`; `validate` e `explain` não podam.

**Decisões de implementação que este plano toma** (não estão na spec letra por
letra; ficam aqui para quem revisar poder discordar):

- **A poda compara o diretório do arquivo, não a base.** Como o `basePath` só
  desce, a base é sempre descendente do diretório, então um diretório que não
  alcança nenhum caminho de `onlyFor` garante que a base também não alcança. É o
  que permite podar sem abrir o arquivo para ler o `basePath` dele.
- **Colisão é detectada por varredura par a par.** São dezenas de entradas, não
  milhares; um índice ordenado economizaria comparação e custaria a mensagem de
  erro, que precisa nomear os dois lados.
- **`origin` é o arquivo, não o arquivo e a linha.** O caminho já identifica a
  entrada sem ambiguidade — é a chave da disjunção —, e rastrear linha obrigaria
  o parser a trocar `YAML.parse` por `parseDocument` e a carregar posição em toda
  entrada, custo que a mensagem não paga.
- **Nome de arquivo achado por include de diretório:** `.ownership.yml`,
  `ownership.yml`, ou `ownership.<assunto>.yml` (com ou sem ponto inicial, e
  `.yaml`).
- **Um arquivo incluído duas vezes é erro**, com mensagem própria — distinta de
  ciclo, que é um arquivo incluído por um descendente de si mesmo.

**Arquivos:**
- Create: `packages/ownership/src/resolve/hierarchy.ts`
- Test: `packages/ownership/test/resolve/hierarchy.test.ts`

**Interfaces:**
- Consome: `parseOwnershipFile`, `RootFile`, `ParsedFile`, `OwnedRuleRaw`,
  `GeneratedRuleRaw`, `WatchRuleRaw`, `OwnershipError` (Tarefa 4);
  `locateRootFile` (Tarefa 6).
- Produz:
  ```typescript
  interface ResolvedOwnedRule {
    path: string
    owner: string
    skill: string | null
    states: string[] | null
    format: FormatBlock
    derivesFrom: DerivesFrom | null
    pluginBlocks: Record<string, unknown>
    /** Arquivo de ownership que declarou esta entrada. */
    origin: string
  }
  interface ResolvedGeneratedRule { path: string; command: string; origin: string }
  interface ResolvedWatchRule { code: string; doc: string; reason: string | null; consumerVisible: boolean; origin: string }
  /** Cada arquivo lido e a base dele — é o que deixa o `explain` dizer quem deveria governar um caminho sem dono. */
  interface ResolvedFile { file: string; base: string }
  interface ResolvedConfig {
    version: 2
    plugins: string[]
    owned: ResolvedOwnedRule[]
    generated: ResolvedGeneratedRule[]
    watches: ResolvedWatchRule[]
    ignore: string[]
    files: ResolvedFile[]
    rootDir: string
    rootFile: string
  }
  interface ResolveOptions { explicitPath?: string | null; env?: Record<string, string | undefined>; onlyFor?: readonly string[] }
  function resolveOwnership(repoRoot: string, opts?: ResolveOptions): ResolvedConfig | null
  function findOwnedRule(config: ResolvedConfig, repoPath: string): ResolvedOwnedRule | null
  function findGeneratedRule(config: ResolvedConfig, repoPath: string): ResolvedGeneratedRule | null
  ```
  Tarefas 8–20 consomem exatamente esses nomes e tipos.

- [ ] **Passo 1: Escrever os testes que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { findOwnedRule, resolveOwnership } from '../../src/resolve/hierarchy.ts'
  import { OwnershipError } from '../../src/schema/types.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const BASE = 'version: 2\nowned:\n  - path: docs/decisions/adr/\n    owner: "@a"\n    skill: decision-recorder\n'
  const CHILD = 'version: 2\nowned:\n  - path: docs/\n    owner: "@b"\n'

  test('sem arquivo de ownership, resolveOwnership devolve null', () => {
    withTempRepo({}, root => {
      assert.equal(resolveOwnership(root), null)
    })
  })

  test('arquivo único: a entrada resolvida aponta o próprio arquivo como origem', () => {
    withTempRepo({ '.ownership.yml': BASE }, root => {
      const config = resolveOwnership(root)

      assert.equal(config?.owned[0]?.path, 'docs/decisions/adr/')
      assert.equal(config?.owned[0]?.origin, '.ownership.yml')
    })
  })

  test('a base da raiz é a raiz do repositório mesmo quando ela mora em docs/', () => {
    withTempRepo({ 'docs/.ownership.yml': 'version: 2\nowned:\n  - path: CLAUDE.md\n    owner: "@a"\n' }, root => {
      assert.equal(resolveOwnership(root)?.owned[0]?.path, 'CLAUDE.md')
    })
  })

  test('include de diretório acha o único arquivo de ownership dentro dele', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned:\n  - path: docs/\n    owner: "@b"\n',
      },
      root => {
        const rule = findOwnedRule(resolveOwnership(root)!, 'packages/api/docs/x.md')

        assert.equal(rule?.owner, '@b')
        assert.equal(rule?.origin, 'packages/api/.ownership.yml')
      },
    )
  })

  test('include de arquivo explícito funciona quando há mais de um no diretório', () => {
    withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': CHILD }, root => {
      assert.equal(resolveOwnership(root)?.owned.length, 2)
    })
  })

  test('include de diretório com mais de um arquivo de ownership é ambíguo', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned: []\n',
        'packages/api/ownership.extra.yml': 'version: 2\nowned: []\n',
      },
      root => {
        assert.throws(() => resolveOwnership(root), /ambíguo/)
      },
    )
  })

  test('include apontando para arquivo que não existe é OwnershipError', () => {
    withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n` }, root => {
      assert.throws(() => resolveOwnership(root), OwnershipError)
    })
  })

  test('include aninhado é lido', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned: []\ninclude: [sub/]\n',
        'packages/api/sub/.ownership.yml': 'version: 2\nowned:\n  - path: docs/\n    owner: "@c"\n',
      },
      root => {
        assert.equal(findOwnedRule(resolveOwnership(root)!, 'packages/api/sub/docs/x.md')?.owner, '@c')
      },
    )
  })

  test('ciclo de include é erro', () => {
    withTempRepo(
      { '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 2\nowned: []\ninclude: [.ownership.yml]\n' },
      root => {
        assert.throws(() => resolveOwnership(root), /Ciclo de include/)
      },
    )
  })

  test('o mesmo arquivo incluído por dois é erro, e não se confunde com ciclo', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [ownership.a.yml, ownership.b.yml]\n`,
        'ownership.a.yml': 'version: 2\nowned: []\ninclude: [ownership.shared.yml]\n',
        'ownership.b.yml': 'version: 2\nowned: []\ninclude: [ownership.shared.yml]\n',
        'ownership.shared.yml': 'version: 2\nowned: []\n',
      },
      root => {
        assert.throws(() => resolveOwnership(root), /incluído uma vez só/)
      },
    )
  })

  test('caminho declarado fora da base do arquivo que o declara é erro', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned:\n  - path: ../web/docs/\n    owner: "@b"\n',
      },
      root => {
        assert.throws(() => resolveOwnership(root), /fora da base/)
      },
    )
  })

  test('include que sai da base também é erro', () => {
    withTempRepo(
      { '.ownership.yml': `${BASE}include: [packages/api/]\n`, 'packages/api/.ownership.yml': 'version: 2\nowned: []\ninclude: [../web/]\n' },
      root => {
        assert.throws(() => resolveOwnership(root), /fora da base/)
      },
    )
  })

  test('derives-from.source fora da base é erro — senão a poda mata o lembrete', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml':
          'version: 2\nowned:\n  - path: plans/\n    owner: "@b"\n    derives-from:\n      source: ../../docs/specs/\n      field: spec\n',
      },
      root => {
        assert.throws(() => resolveOwnership(root), /fora da base/)
      },
    )
  })

  test('watches[].doc pode sair da base; watches[].code não', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned: []\nwatches:\n  - code: src/**\n    doc: ../../CHANGELOG.md\n',
      },
      root => {
        const watch = resolveOwnership(root)!.watches[0]

        assert.equal(watch?.code, 'packages/api/src/**')
        assert.equal(watch?.doc, 'CHANGELOG.md')
      },
    )
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned: []\nwatches:\n  - code: ../../src/**\n    doc: CHANGELOG.md\n',
      },
      root => {
        assert.throws(() => resolveOwnership(root), /fora da base/)
      },
    )
  })

  test('basePath desloca a base para dentro', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [ownership.api.yml]\n`,
        'ownership.api.yml': 'version: 2\nbasePath: packages/api\nowned:\n  - path: docs/\n    owner: "@b"\n',
      },
      root => {
        assert.equal(findOwnedRule(resolveOwnership(root)!, 'packages/api/docs/x.md')?.owner, '@b')
      },
    )
  })

  test('basePath que sobe é erro', () => {
    withTempRepo(
      { '.ownership.yml': `${BASE}include: [packages/api/]\n`, 'packages/api/.ownership.yml': 'version: 2\nbasePath: ../web\nowned: []\n' },
      root => {
        assert.throws(() => resolveOwnership(root), OwnershipError)
      },
    )
  })

  test('caminho igual declarado duas vezes no mesmo arquivo é colisão', () => {
    withTempRepo({ '.ownership.yml': `${BASE}  - path: docs/decisions/adr/\n    owner: "@b"\n` }, root => {
      assert.throws(() => resolveOwnership(root), /colide/)
    })
  })

  test('caminho contido em outro é colisão, mesmo entre arquivos diferentes', () => {
    withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': CHILD }, root => {
      assert.throws(() => resolveOwnership(root), /colide/)
    })
  })

  test('caminhos irmãos não colidem', () => {
    withTempRepo(
      { '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 2\nowned:\n  - path: docs/specs/\n    owner: "@b"\n' },
      root => {
        assert.equal(resolveOwnership(root)?.owned.length, 2)
      },
    )
  })

  test('caminho gerado dentro de caminho governado não é colisão; dois geradores para o mesmo arquivo são', () => {
    withTempRepo({ '.ownership.yml': `${BASE}generated:\n  - path: docs/decisions/adr/index.gen.md\n    command: gen\n` }, root => {
      assert.equal(resolveOwnership(root)?.generated.length, 1)
    })
    withTempRepo({ '.ownership.yml': `${BASE}generated:\n  - path: x.gen.md\n    command: a\n  - path: x.gen.md\n    command: b\n` }, root => {
      assert.throws(() => resolveOwnership(root), /colide/)
    })
  })

  test('dois watches para o mesmo code convivem', () => {
    withTempRepo({ '.ownership.yml': `${BASE}watches:\n  - code: src/**\n    doc: a.md\n  - code: src/**\n    doc: b.md\n` }, root => {
      assert.equal(resolveOwnership(root)?.watches.length, 2)
    })
  })

  test('arquivo incluído sem version é erro, e com version divergente também', () => {
    withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'owned: []\n' }, root => {
      assert.throws(() => resolveOwnership(root), OwnershipError)
    })
    withTempRepo({ '.ownership.yml': `${BASE}include: [ownership.docs.yml]\n`, 'ownership.docs.yml': 'version: 3\nowned: []\n' }, root => {
      assert.throws(() => resolveOwnership(root), /versão/)
    })
  })

  test('entrada sem owner é erro — não há de onde herdar', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned:\n  - path: docs/\n' }, root => {
      assert.throws(() => resolveOwnership(root), OwnershipError)
    })
  })

  test('watches, generated e ignore acumulam entre arquivos', () => {
    withTempRepo(
      {
        '.ownership.yml': `${BASE}include: [packages/api/]\nwatches:\n  - code: src/**\n    doc: docs/decisions/adr/\nignore: ["node_modules/**"]\n`,
        'packages/api/.ownership.yml': 'version: 2\nowned: []\nwatches:\n  - code: src/**\n    doc: ../../docs/decisions/adr/\nignore: ["dist/**"]\n',
      },
      root => {
        const config = resolveOwnership(root)!

        assert.equal(config.watches.length, 2)
        assert.deepEqual(config.ignore, ['node_modules/**', 'packages/api/dist/**'])
      },
    )
  })

  test('poda: arquivo cujo diretório não alcança nenhum caminho não é lido', () => {
    withTempRepo(
      { '.ownership.yml': `${BASE}include: [packages/api/]\n`, 'packages/api/.ownership.yml': 'isto não é YAML válido: [\n' },
      root => {
        assert.doesNotThrow(() => resolveOwnership(root, { onlyFor: ['packages/web/x.ts'] }))
        assert.throws(() => resolveOwnership(root, { onlyFor: ['packages/api/x.ts'] }), OwnershipError)
      },
    )
  })

  test('findOwnedRule acha a única regra que cobre, e null quando nenhuma cobre', () => {
    withTempRepo({ '.ownership.yml': BASE }, root => {
      const config = resolveOwnership(root)!

      assert.equal(findOwnedRule(config, 'docs/decisions/adr/ADR-0001-x.md')?.owner, '@a')
      assert.equal(findOwnedRule(config, 'src/index.ts'), null)
    })
  })
  ```

- [ ] **Passo 2: Rodar e confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/resolve/hierarchy.test.ts
  ```

- [ ] **Passo 3: Escrever `resolve/hierarchy.ts`**

  ```typescript
  import { readFileSync, readdirSync, statSync } from 'node:fs'
  import { join, posix } from 'node:path'
  import { locateRootFile } from './candidates.ts'
  import { parseOwnershipFile } from '../schema/parse.ts'
  import { OwnershipError } from '../schema/types.ts'
  import type { DerivesFrom, FormatBlock, GeneratedRuleRaw, ParsedFile, RootFile, WatchRuleRaw } from '../schema/types.ts'

  export interface ResolvedOwnedRule {
    path: string
    owner: string
    skill: string | null
    states: string[] | null
    format: FormatBlock
    derivesFrom: DerivesFrom | null
    pluginBlocks: Record<string, unknown>
    /** Arquivo de ownership que declarou esta entrada. */
    origin: string
  }

  export interface ResolvedGeneratedRule extends GeneratedRuleRaw {
    origin: string
  }

  export interface ResolvedWatchRule extends WatchRuleRaw {
    origin: string
  }

  /** Cada arquivo lido e a base dele — é o que deixa o `explain` dizer quem deveria governar um caminho sem dono. */
  export interface ResolvedFile {
    file: string
    base: string
  }

  export interface ResolvedConfig {
    version: 2
    plugins: string[]
    owned: ResolvedOwnedRule[]
    generated: ResolvedGeneratedRule[]
    watches: ResolvedWatchRule[]
    ignore: string[]
    files: ResolvedFile[]
    rootDir: string
    rootFile: string
  }

  export interface ResolveOptions {
    explicitPath?: string | null
    env?: Record<string, string | undefined>
    /** Poda: só lê arquivos incluídos cujo diretório é ancestral de algum destes caminhos. */
    onlyFor?: readonly string[]
  }

  function joinRel(base: string, entry: string): string {
    const combined = base === '' ? entry : `${base}/${entry}`
    const normalized = posix.normalize(combined.replace(/\\/g, '/'))

    return entry.endsWith('/') && !normalized.endsWith('/') ? `${normalized}/` : normalized
  }

  function withinBase(base: string, resolvedPath: string): boolean {
    if (resolvedPath === '..' || resolvedPath.startsWith('../')) {
      return false
    }

    return base === '' || resolvedPath === base || resolvedPath === `${base}/` || resolvedPath.startsWith(`${base}/`)
  }

  /** Diretório do arquivo mais o `basePath` — que o parser já garantiu não subir nem ter glob. */
  function baseOf(file: ParsedFile): string {
    const base = file.basePath === null ? file.dir : joinRel(file.dir, file.basePath)

    return base.replace(/\/$/, '')
  }

  /**
   * `watches[].doc` fica de fora: é o único campo que nunca é caminho editado, e é o
   * que deixa um pacote apontar para o CHANGELOG da raiz (spec §5).
   */
  function assertConfinement(file: ParsedFile, base: string): void {
    const declared: string[] = [
      ...file.owned.flatMap(rule => (rule.derivesFrom === null ? [rule.path] : [rule.path, rule.derivesFrom.source])),
      ...file.generated.map(rule => rule.path),
      ...file.watches.map(rule => rule.code),
      ...file.ignore,
      ...file.include,
    ]

    for (const entry of declared) {
      const resolved = joinRel(base, entry)

      if (!withinBase(base, resolved)) {
        throw new OwnershipError(
          `${file.file}: "${entry}" resolve para "${resolved}", fora da base do arquivo ("${base || '.'}"). ` +
            'Caminho que pode ser editado nunca escapa da base de quem o declara.',
        )
      }
    }
  }

  const OWNERSHIP_FILE_NAME = /^\.?ownership(?:\.[^/.]+)?\.ya?ml$/

  function listOwnershipFilesIn(repoRoot: string, dir: string): string[] {
    let entries: string[]

    try {
      entries = readdirSync(join(repoRoot, dir))
    } catch {
      return []
    }

    return entries.filter(entry => OWNERSHIP_FILE_NAME.test(entry) && statSync(join(repoRoot, dir, entry)).isFile()).map(entry => joinRel(dir, entry))
  }

  function dirOf(file: string): string {
    const dir = posix.dirname(file)

    return dir === '.' ? '' : dir
  }

  function isAncestorOfAny(dir: string, paths: readonly string[] | undefined): boolean {
    if (paths === undefined || dir === '') {
      return true
    }

    return paths.some(path => path.replace(/\\/g, '/').startsWith(`${dir}/`))
  }

  function readOwnershipFile(repoRoot: string, file: string, referencedBy: string): string {
    try {
      return readFileSync(join(repoRoot, file), 'utf8')
    } catch {
      throw new OwnershipError(`${referencedBy}: include aponta para "${file}", que não existe ou não pode ser lido.`)
    }
  }

  function collectTree(repoRoot: string, root: RootFile, onlyFor: readonly string[] | undefined): ParsedFile[] {
    const files: ParsedFile[] = [root]
    const seen = new Set<string>([root.file])

    function walk(file: ParsedFile, base: string, ancestors: readonly string[]): void {
      for (const entry of file.include) {
        const target = joinRel(base, entry)
        // Poda pelo diretório: como `basePath` só desce, a base do incluído é
        // descendente dele, e um diretório que não alcança também não alcança por ela.
        const targetDir = entry.endsWith('/') ? target.replace(/\/$/, '') : dirOf(target)

        if (!isAncestorOfAny(targetDir, onlyFor)) {
          continue
        }

        let includedFile: string

        if (entry.endsWith('/')) {
          const candidates = listOwnershipFilesIn(repoRoot, target)

          if (candidates.length === 0) {
            throw new OwnershipError(`${file.file}: include "${entry}" não tem nenhum arquivo de ownership dentro.`)
          }
          if (candidates.length > 1) {
            throw new OwnershipError(`${file.file}: include "${entry}" é ambíguo — ${candidates.join(', ')}. Nomeie o arquivo explicitamente.`)
          }
          includedFile = candidates[0]!
        } else {
          includedFile = target
        }

        if (ancestors.includes(includedFile)) {
          throw new OwnershipError(`Ciclo de include: ${[...ancestors, includedFile].join(' → ')}.`)
        }
        if (seen.has(includedFile)) {
          throw new OwnershipError(`${file.file}: "${includedFile}" já foi incluído por outro arquivo. Um arquivo de ownership é incluído uma vez só.`)
        }
        seen.add(includedFile)

        const parsed = parseOwnershipFile(readOwnershipFile(repoRoot, includedFile, file.file), includedFile, { isRoot: false, pluginNames: root.plugins }) as ParsedFile

        if (parsed.version !== root.version) {
          throw new OwnershipError(`${includedFile}: versão ${parsed.version} diverge de ${root.file} (versão ${root.version}). Um repositório, um esquema.`)
        }

        const childBase = baseOf(parsed)

        assertConfinement(parsed, childBase)
        files.push(parsed)
        walk(parsed, childBase, [...ancestors, includedFile])
      }
    }

    walk(root, baseOf(root), [root.file])

    return files
  }

  /** Contenção de diretório: `docs/` contém `docs/adr/x.md`; dois arquivos só colidem se forem o mesmo. */
  function collides(a: string, b: string): boolean {
    if (a === b) {
      return true
    }

    return (a.endsWith('/') && b.startsWith(a)) || (b.endsWith('/') && a.startsWith(b))
  }

  interface Declared {
    path: string
    file: string
  }

  function assertDisjoint(declared: readonly Declared[], what: string): void {
    for (let i = 0; i < declared.length; i += 1) {
      for (let j = i + 1; j < declared.length; j += 1) {
        const a = declared[i]!
        const b = declared[j]!

        if (collides(a.path, b.path)) {
          throw new OwnershipError(
            `${what}: "${a.path}" (${a.file}) colide com "${b.path}" (${b.file}). ` + 'Um caminho é governado por uma declaração só — nenhuma contém outra.',
          )
        }
      }
    }
  }

  function collectOwned(files: readonly ParsedFile[]): ResolvedOwnedRule[] {
    const resolved: ResolvedOwnedRule[] = []

    for (const file of files) {
      const base = baseOf(file)

      for (const rule of file.owned) {
        resolved.push({
          path: joinRel(base, rule.path),
          owner: rule.owner,
          skill: rule.skill,
          states: rule.states,
          format: rule.format,
          derivesFrom: rule.derivesFrom === null ? null : { ...rule.derivesFrom, source: joinRel(base, rule.derivesFrom.source) },
          pluginBlocks: rule.pluginBlocks,
          origin: file.file,
        })
      }
    }

    assertDisjoint(
      resolved.map(rule => ({ path: rule.path, file: rule.origin })),
      'owned',
    )

    return resolved
  }

  export function resolveOwnership(repoRoot: string, opts: ResolveOptions = {}): ResolvedConfig | null {
    const rootFile = locateRootFile(repoRoot, opts)

    if (rootFile === null) {
      return null
    }

    const parsedRoot = parseOwnershipFile(readFileSync(join(repoRoot, rootFile), 'utf8'), rootFile, { isRoot: true, pluginNames: [] }) as RootFile
    // A base da raiz é a raiz do repositório, more o arquivo onde morar (spec §5).
    const root: RootFile = { ...parsedRoot, dir: '' }
    const rootBase = baseOf(root)

    assertConfinement(root, rootBase)
    const files = collectTree(repoRoot, root, opts.onlyFor)

    const generated: ResolvedGeneratedRule[] = files.flatMap(file =>
      file.generated.map(rule => ({ ...rule, path: joinRel(baseOf(file), rule.path), origin: file.file })),
    )
    const watches: ResolvedWatchRule[] = files.flatMap(file =>
      file.watches.map(rule => ({ ...rule, code: joinRel(baseOf(file), rule.code), doc: joinRel(baseOf(file), rule.doc), origin: file.file })),
    )
    const ignore = files.flatMap(file => file.ignore.map(entry => joinRel(baseOf(file), entry)))

    assertDisjoint(
      generated.map(rule => ({ path: rule.path, file: rule.origin })),
      'generated',
    )

    return {
      version: 2,
      plugins: root.plugins,
      owned: collectOwned(files),
      generated,
      watches,
      ignore,
      files: files.map(file => ({ file: file.file, base: baseOf(file) })),
      rootDir: repoRoot,
      rootFile,
    }
  }

  function normalize(repoPath: string): string {
    return repoPath.replace(/\\/g, '/').replace(/^\.\//, '')
  }

  function covers(declared: string, repoPath: string): boolean {
    const target = declared.replace(/\\/g, '/')

    return target.endsWith('/') ? repoPath.startsWith(target) : repoPath === target
  }

  /** A regra de `owned[]` que governa este caminho — a disjunção garante que é uma só. */
  export function findOwnedRule(config: ResolvedConfig, repoPath: string): ResolvedOwnedRule | null {
    const target = normalize(repoPath)

    return config.owned.find(rule => covers(rule.path, target)) ?? null
  }

  export function findGeneratedRule(config: ResolvedConfig, repoPath: string): ResolvedGeneratedRule | null {
    const target = normalize(repoPath)

    return config.generated.find(rule => normalize(rule.path) === target) ?? null
  }
  ```

- [ ] **Passo 4: Rodar os testes**

  ```bash
  cd packages/ownership && node --test test/resolve/hierarchy.test.ts
  ```

- [ ] **Passo 5: Type-check e suíte inteira do pacote**

  ```bash
  cd packages/ownership && npm run typecheck && node --test "test/**/*.test.ts"
  ```

- [ ] **Passo 6: Commit**

  ```bash
  git add packages/ownership/src/resolve/hierarchy.ts packages/ownership/test/resolve/hierarchy.test.ts
  git commit -m "feat(<RN-composicao>): composição — base, include, disjunção, ciclo, poda"
  ```

---

### Tarefa 8: `ownership explain <caminho>`

Regra de origem: `<RF-explain>` e spec §5 ("governança inauditável é pior que
governança ausente"). A Tarefa 7 já entrega `origin` por entrada e `files` com a
base de cada arquivo lido — esta tarefa só formata. Com disjunção, a pergunta
difícil deixa de ser "qual regra ganhou" e passa a ser "por que este caminho não
tem dono": a resposta é o arquivo cuja base o contém, que é onde a entrada que
falta deveria ser escrita.

**Arquivos:**
- Create: `packages/ownership/src/resolve/explain.ts`
- Test: `packages/ownership/test/resolve/explain.test.ts`

**Interfaces:**
- Consome: `ResolvedConfig`, `ResolvedOwnedRule`, `findOwnedRule` (Tarefa 7).
- Produz: `explainPath(config: ResolvedConfig, repoPath: string): string`.

- [ ] **Passo 1: Escrever os testes que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { explainPath } from '../../src/resolve/explain.ts'
  import { resolveOwnership } from '../../src/resolve/hierarchy.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('sem regra cobrindo o caminho, diz isso e aponta onde a entrada caberia', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
      const text = explainPath(resolveOwnership(root)!, 'x.md')

      assert.match(text, /nenhuma regra/)
      assert.match(text, /caberia em \.ownership\.yml/)
    })
  })

  test('o arquivo apontado é o de base mais profunda que contém o caminho', () => {
    withTempRepo(
      {
        '.ownership.yml': 'version: 2\ninclude: [packages/api/]\nowned: []\n',
        'packages/api/.ownership.yml': 'version: 2\nowned: []\n',
      },
      root => {
        assert.match(explainPath(resolveOwnership(root)!, 'packages/api/x.md'), /caberia em packages\/api\/\.ownership\.yml/)
      },
    )
  })

  test('mostra a regra que cobre e o arquivo que a declarou', () => {
    withTempRepo(
      {
        '.ownership.yml': 'version: 2\ninclude: [packages/api/]\nowned: []\n',
        'packages/api/.ownership.yml': 'version: 2\nowned:\n  - path: ./\n    owner: "@a"\n    skill: outro\n',
      },
      root => {
        const text = explainPath(resolveOwnership(root)!, 'packages/api/x.md')

        assert.match(text, /declarado em: packages\/api\/\.ownership\.yml/)
        assert.match(text, /owner: @a/)
        assert.match(text, /skill: outro/)
        assert.match(text, /states: —/)
      },
    )
  })
  ```

- [ ] **Passo 2: Rodar e confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/resolve/explain.test.ts
  ```

- [ ] **Passo 3: Escrever `resolve/explain.ts`**

  ```typescript
  import { findOwnedRule } from './hierarchy.ts'
  import type { ResolvedConfig } from './hierarchy.ts'

  /** O arquivo de base mais profunda que contém o caminho — onde a entrada que falta deveria ser escrita. */
  function fileResponsibleFor(config: ResolvedConfig, repoPath: string): string | null {
    let best: { file: string; base: string } | null = null

    for (const candidate of config.files) {
      const covers = candidate.base === '' || repoPath.startsWith(`${candidate.base}/`)

      if (covers && (best === null || candidate.base.length > best.base.length)) {
        best = candidate
      }
    }

    return best === null ? null : best.file
  }

  export function explainPath(config: ResolvedConfig, repoPath: string): string {
    const rule = findOwnedRule(config, repoPath)

    if (rule === null) {
      const responsible = fileResponsibleFor(config, repoPath)

      return responsible === null
        ? `${repoPath}: nenhuma regra de ownership cobre este caminho, e nenhum arquivo de ownership tem base que o contenha.`
        : `${repoPath}: nenhuma regra de ownership cobre este caminho. A entrada caberia em ${responsible}.`
    }

    const lines = [
      `${repoPath}`,
      `  declarado em: ${rule.origin}`,
      `  regra: ${rule.path}`,
      `  owner: ${rule.owner}`,
      `  skill: ${rule.skill ?? '—'}`,
      `  states: ${rule.states ? rule.states.join(', ') : '—'}`,
      `  format: ${rule.format.collection}${rule.format.key ? ` (key: ${rule.format.key})` : ''}${rule.format.keyMode ? ` (key: ${rule.format.keyMode})` : ''}`,
      `  derives-from: ${rule.derivesFrom ? `${rule.derivesFrom.source} → ${rule.derivesFrom.field}` : '—'}`,
    ]

    for (const name of Object.keys(rule.pluginBlocks)) {
      lines.push(`  plugin ${name}: declarado`)
    }

    return lines.join('\n')
  }
  ```

- [ ] **Passo 4: Rodar os testes e o type-check**

  ```bash
  cd packages/ownership && node --test test/resolve/explain.test.ts && npm run typecheck
  ```

- [ ] **Passo 5: Commit**

  ```bash
  git add packages/ownership/src/resolve/explain.ts packages/ownership/test/resolve/explain.test.ts
  git commit -m "feat(<RF-explain>): ownership explain — proveniência por propriedade"
  ```

---

### Tarefa 9: Gatilho código→doc unificado (`watches`)

Regra de origem: `RN-0008`; spec §2 ("`consumer-visible-paths` deixa de existir") e §7
(mecanismo 1). Porta `src/config/watches.ts` do `@esliph/living-docs`, trocando
`OwnershipConfig`/`findArtifactRule` (v1) por `ResolvedConfig`/`findOwnedRule`
(Tarefa 7) — sem lista separada de caminhos visíveis ao consumidor: o conjunto
**é** as regras de `watches` marcadas `consumer-visible: true`.

**Arquivos:**
- Create: `packages/ownership/src/triggers/watches.ts`
- Test: `packages/ownership/test/triggers/watches.test.ts`

**Interfaces:**
- Consome: `ResolvedConfig`, `findOwnedRule` (Tarefa 7).
- Produz: `interface WatchMatch { doc: string; reason: string | null; consumerVisible: boolean; matched: string[]; skill: string | null; owner: string | null }`,
  `coversDoc(doc: string, paths: readonly string[]): boolean`,
  `watchesFor(config: ResolvedConfig, paths: readonly string[]): WatchMatch[]`,
  `pendingDocs(config: ResolvedConfig, paths: readonly string[]): WatchMatch[]`.

- [ ] **Passo 1: Escrever um construtor de `ResolvedConfig` de teste**

  As tarefas 9 a 15 precisam de um `ResolvedConfig` mínimo sem passar pelo
  parser YAML inteiro. Criar `packages/ownership/test/helpers/config.ts`:

  ```typescript
  import type { ResolvedConfig, ResolvedOwnedRule, ResolvedGeneratedRule, ResolvedWatchRule } from '../../src/resolve/hierarchy.ts'

  function owned(partial: Partial<ResolvedOwnedRule> & { path: string; owner: string }): ResolvedOwnedRule {
    return {
      skill: null,
      states: null,
      format: { collection: 'per-file', key: null, keyMode: null, stateField: 'status' },
      derivesFrom: null,
      pluginBlocks: {},
      origin: '.ownership.yml',
      ...partial,
    }
  }

  function watch(partial: Partial<ResolvedWatchRule> & { code: string; doc: string }): ResolvedWatchRule {
    return { reason: null, consumerVisible: false, origin: '.ownership.yml', ...partial }
  }

  function generated(partial: Partial<ResolvedGeneratedRule> & { path: string; command: string }): ResolvedGeneratedRule {
    return { origin: '.ownership.yml', ...partial }
  }

  export function buildConfig(partial: {
    owned?: Parameters<typeof owned>[0][]
    watches?: Parameters<typeof watch>[0][]
    generated?: Parameters<typeof generated>[0][]
    ignore?: string[]
  }): ResolvedConfig {
    return {
      version: 2,
      plugins: [],
      owned: (partial.owned ?? []).map(owned),
      watches: (partial.watches ?? []).map(watch),
      generated: (partial.generated ?? []).map(generated),
      ignore: partial.ignore ?? [],
      files: [{ file: '.ownership.yml', base: '' }],
      rootDir: '/repo',
      rootFile: '.ownership.yml',
    }
  }
  ```

- [ ] **Passo 2: Escrever os testes que falham**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { coversDoc, pendingDocs, watchesFor } from '../../src/triggers/watches.ts'
  import { buildConfig } from '../helpers/config.ts'

  test('watchesFor agrupa por doc e acumula os caminhos que bateram', () => {
    const config = buildConfig({
      owned: [{ path: 'docs/requirements/rules.md', owner: '@a', skill: 'requirements-keeper' }],
      watches: [
        { code: 'src/checks/**', doc: 'docs/requirements/rules.md', reason: 'x' },
        { code: 'src/hooks/**', doc: 'docs/requirements/rules.md', reason: null },
      ],
    })

    const matches = watchesFor(config, ['src/checks/a.ts', 'src/hooks/b.ts', 'src/outro.ts'])

    assert.equal(matches.length, 1)
    assert.equal(matches[0]?.doc, 'docs/requirements/rules.md')
    assert.deepEqual(matches[0]?.matched, ['src/checks/a.ts', 'src/hooks/b.ts'])
    assert.equal(matches[0]?.reason, 'x')
    assert.equal(matches[0]?.skill, 'requirements-keeper')
    assert.equal(matches[0]?.owner, '@a')
  })

  test('consumerVisible é true se QUALQUER regra que aponta pro doc trouxer a marca', () => {
    const config = buildConfig({
      watches: [
        { code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true },
        { code: 'plugin/**', doc: 'CHANGELOG.md', consumerVisible: false },
      ],
    })

    assert.equal(watchesFor(config, ['src/cli/a.ts', 'plugin/b.md'])[0]?.consumerVisible, true)
  })

  test('doc sem owned declarado ainda é doc dono — skill e owner ficam null', () => {
    const config = buildConfig({ watches: [{ code: 'src/**', doc: 'README.md' }] })
    const matches = watchesFor(config, ['src/a.ts'])

    assert.equal(matches[0]?.skill, null)
    assert.equal(matches[0]?.owner, null)
  })

  test('coversDoc: diretório por prefixo, arquivo por igualdade', () => {
    assert.equal(coversDoc('docs/', ['docs/x.md']), true)
    assert.equal(coversDoc('docs/x.md', ['docs/x.md']), true)
    assert.equal(coversDoc('docs/x.md', ['docs/y.md']), false)
  })

  test('pendingDocs tira o que já foi tocado no mesmo conjunto de caminhos', () => {
    const config = buildConfig({ watches: [{ code: 'src/**', doc: 'docs/x.md', reason: 'r' }] })

    assert.equal(pendingDocs(config, ['src/a.ts']).length, 1)
    assert.equal(pendingDocs(config, ['src/a.ts', 'docs/x.md']).length, 0)
  })
  ```

- [ ] **Passo 3: Confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/triggers/watches.test.ts
  ```

- [ ] **Passo 4: Escrever `triggers/watches.ts`**

  ```typescript
  import picomatch from 'picomatch'
  import { findOwnedRule } from '../resolve/hierarchy.ts'
  import type { ResolvedConfig } from '../resolve/hierarchy.ts'

  export interface WatchMatch {
    doc: string
    reason: string | null
    consumerVisible: boolean
    matched: string[]
    skill: string | null
    owner: string | null
  }

  function normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\.\//, '')
  }

  export function coversDoc(doc: string, paths: readonly string[]): boolean {
    const target = normalize(doc)

    return paths.some(path => {
      const candidate = normalize(path)

      return target.endsWith('/') ? candidate.startsWith(target) : candidate === target
    })
  }

  export function watchesFor(config: ResolvedConfig, paths: readonly string[]): WatchMatch[] {
    const normalized = paths.map(normalize)
    const byDoc = new Map<string, WatchMatch>()

    for (const watch of config.watches) {
      const matches = picomatch(watch.code)
      const hits = normalized.filter(path => matches(path))

      if (hits.length === 0) {
        continue
      }

      const doc = normalize(watch.doc)
      const existing = byDoc.get(doc)

      if (existing) {
        existing.reason = existing.reason ?? watch.reason
        existing.consumerVisible = existing.consumerVisible || watch.consumerVisible
        for (const hit of hits) {
          if (!existing.matched.includes(hit)) {
            existing.matched.push(hit)
          }
        }
        continue
      }

      const rule = findOwnedRule(config, doc)

      byDoc.set(doc, {
        doc,
        reason: watch.reason,
        consumerVisible: watch.consumerVisible,
        matched: [...hits],
        skill: rule?.skill ?? null,
        owner: rule?.owner ?? null,
      })
    }

    return [...byDoc.values()]
  }

  export function pendingDocs(config: ResolvedConfig, paths: readonly string[]): WatchMatch[] {
    return watchesFor(config, paths).filter(match => !coversDoc(match.doc, paths))
  }
  ```

- [ ] **Passo 5: Rodar os testes e o type-check**

  ```bash
  cd packages/ownership && node --test test/triggers/watches.test.ts && npm run typecheck
  ```

- [ ] **Passo 6: Commit**

  ```bash
  git add packages/ownership/src/triggers/watches.ts packages/ownership/test/triggers/watches.test.ts packages/ownership/test/helpers/config.ts
  git commit -m "feat(RN-0008): gatilho código→doc unificado, sem lista duplicada de consumer-visible"
  ```

---

### Tarefa 10: Gatilho doc→doc (`derives-from`) — resolução

Regra de origem: `<RN-derivacao>`; spec §4. Tipo no `.ownership.yml` (Tarefa 4: `derivesFrom` em
`OwnedRuleRaw`), instância no frontmatter do documento. Esta tarefa lê as
instâncias reais no disco e decide se cada uma resolve — é a base tanto do
check `ownership/derivation-resolves` (Tarefa 15) quanto do hook
`ownership/derivation-reminder` (Tarefa 19).

**Arquivos:**
- Create: `packages/ownership/src/triggers/derives.ts`
- Test: `packages/ownership/test/triggers/derives.test.ts`

**Interfaces:**
- Consome: `listFiles`, `readTextFile` (Tarefa 3), `parseFrontmatter`
  (Tarefa 3), `ResolvedOwnedRule` (Tarefa 7).
- Produz:
  ```typescript
  interface DerivationInstance { file: string; field: string | null; line: number }
  interface DerivationProblem { file: string; line: number; reason: 'campo-ausente' | 'fora-da-fonte' | 'alvo-inexistente'; field: string | null }
  function instancesOf(root: string, rule: ResolvedOwnedRule): DerivationInstance[]
  function problemsFor(root: string, rule: ResolvedOwnedRule): DerivationProblem[]
  function derivedFilesOf(root: string, rule: ResolvedOwnedRule, editedTarget: string): string[]
  ```

- [ ] **Passo 1: Escrever os testes que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { derivedFilesOf, instancesOf, problemsFor } from '../../src/triggers/derives.ts'
  import { forgetTree } from '../../src/core/files.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const RULE = {
    path: 'docs/plans/',
    owner: '@a',
    skill: null,
    states: null,
    format: { collection: 'per-file' as const, key: null, keyMode: null, stateField: 'status' },
    derivesFrom: { source: 'docs/specs/', field: 'spec' },
    pluginBlocks: {},
    origin: 'x',
  }

  test('instancesOf lê o campo declarado do frontmatter de cada arquivo sob o path', () => {
    withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n', 'docs/specs/s1.md': '# s1\n' }, root => {
      forgetTree(root)
      const [instance] = instancesOf(root, RULE)

      assert.equal(instance?.file, 'docs/plans/a.md')
      assert.equal(instance?.field, 'docs/specs/s1.md')
    })
  })

  test('problemsFor: campo ausente é achado', () => {
    withTempRepo({ 'docs/plans/a.md': '---\ntitle: sem spec\n---\n' }, root => {
      forgetTree(root)
      assert.deepEqual(problemsFor(root, RULE).map(p => p.reason), ['campo-ausente'])
    })
  })

  test('problemsFor: campo fora de source é achado', () => {
    withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/outra-coisa/x.md\n---\n' }, root => {
      forgetTree(root)
      assert.deepEqual(problemsFor(root, RULE).map(p => p.reason), ['fora-da-fonte'])
    })
  })

  test('problemsFor: alvo que não existe é achado', () => {
    withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/nao-existe.md\n---\n' }, root => {
      forgetTree(root)
      assert.deepEqual(problemsFor(root, RULE).map(p => p.reason), ['alvo-inexistente'])
    })
  })

  test('problemsFor: campo correto não é achado', () => {
    withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n', 'docs/specs/s1.md': '# s1\n' }, root => {
      forgetTree(root)
      assert.deepEqual(problemsFor(root, RULE), [])
    })
  })

  test('derivedFilesOf acha só os arquivos que apontam para o alvo exato editado', () => {
    withTempRepo(
      {
        'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n',
        'docs/plans/b.md': '---\nspec: docs/specs/s2.md\n---\n',
        'docs/specs/s1.md': '# s1\n',
        'docs/specs/s2.md': '# s2\n',
      },
      root => {
        forgetTree(root)
        assert.deepEqual(derivedFilesOf(root, RULE, 'docs/specs/s1.md'), ['docs/plans/a.md'])
      },
    )
  })
  ```

- [ ] **Passo 2: Confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/triggers/derives.test.ts
  ```

- [ ] **Passo 3: Escrever `triggers/derives.ts`**

  ```typescript
  import { listFiles, readTextFile } from '../core/files.ts'
  import { parseFrontmatter } from '../core/frontmatter.ts'
  import type { ResolvedOwnedRule } from '../resolve/hierarchy.ts'

  export interface DerivationInstance {
    file: string
    field: string | null
    line: number
  }

  function normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\.\//, '')
  }

  function filesUnder(root: string, rulePath: string): string[] {
    if (rulePath.endsWith('/')) {
      return listFiles(root, [`${rulePath}**/*.md`])
    }

    return listFiles(root, [rulePath])
  }

  export function instancesOf(root: string, rule: ResolvedOwnedRule): DerivationInstance[] {
    if (rule.derivesFrom === null) {
      return []
    }

    const instances: DerivationInstance[] = []

    for (const file of filesUnder(root, rule.path)) {
      const content = readTextFile(root, file)

      if (content === null) {
        continue
      }

      let frontmatter

      try {
        frontmatter = parseFrontmatter(content)
      } catch {
        frontmatter = null
      }

      const value = frontmatter?.data[rule.derivesFrom.field]

      instances.push({
        file,
        field: typeof value === 'string' ? normalize(value) : null,
        line: frontmatter?.lines[rule.derivesFrom.field] ?? 0,
      })
    }

    return instances
  }

  export interface DerivationProblem {
    file: string
    line: number
    reason: 'campo-ausente' | 'fora-da-fonte' | 'alvo-inexistente'
    field: string | null
  }

  export function problemsFor(root: string, rule: ResolvedOwnedRule): DerivationProblem[] {
    if (rule.derivesFrom === null) {
      return []
    }

    const problems: DerivationProblem[] = []

    for (const instance of instancesOf(root, rule)) {
      if (instance.field === null) {
        problems.push({ file: instance.file, line: instance.line, reason: 'campo-ausente', field: null })
        continue
      }
      if (!instance.field.startsWith(rule.derivesFrom.source)) {
        problems.push({ file: instance.file, line: instance.line, reason: 'fora-da-fonte', field: instance.field })
        continue
      }
      if (readTextFile(root, instance.field) === null) {
        problems.push({ file: instance.file, line: instance.line, reason: 'alvo-inexistente', field: instance.field })
      }
    }

    return problems
  }

  /** Só os arquivos governados por `rule` cujo campo aponta exatamente para `editedTarget` — precisão, não ruído (spec §4). */
  export function derivedFilesOf(root: string, rule: ResolvedOwnedRule, editedTarget: string): string[] {
    if (rule.derivesFrom === null) {
      return []
    }

    const target = normalize(editedTarget)

    return instancesOf(root, rule)
      .filter(instance => instance.field === target)
      .map(instance => instance.file)
  }
  ```

- [ ] **Passo 4: Rodar os testes e o type-check**

  ```bash
  cd packages/ownership && node --test test/triggers/derives.test.ts && npm run typecheck
  ```

- [ ] **Passo 5: Commit**

  ```bash
  git add packages/ownership/src/triggers/derives.ts packages/ownership/test/triggers/derives.test.ts
  git commit -m "feat(<RN-derivacao>): resolução do gatilho doc→doc (derives-from)"
  ```

---

### Tarefa 11: Tipos de check e `ownership/generated-drift`

Regra de origem: `RN-0012`; spec §6 (tabela de checks — "drift de gerado... núcleo,
inteiros"). Porta `src/core/types.ts` (`Check`/`CheckContext`/`Finding`) e
`src/checks/ci5-contract-drift.ts` do `@esliph/living-docs`, trocando
`OwnershipConfig` por `ResolvedConfig` e `context.config.generated` (v1) por
`ResolvedGeneratedRule[]` (Tarefa 7).

**Arquivos:**
- Create: `packages/ownership/src/checks/types.ts`
- Create: `packages/ownership/src/checks/generated-drift.ts`
- Test: `packages/ownership/test/checks/generated-drift.test.ts`

**Interfaces:**
- Consome: `ResolvedConfig` (Tarefa 7), `CommandRunner` (Tarefa 3).
- Produz: `type Severity`, `interface Finding`, `interface CheckContext { root: string; config: ResolvedConfig; today: string }`,
  `interface Check { id: string; name: string; run(context: CheckContext): Finding[] }`,
  `ownershipGeneratedDrift(exec: CommandRunner): Check`.

- [ ] **Passo 1: Escrever `checks/types.ts`**

  (Não tem teste próprio — só tipos, iguais aos que `@esliph/living-docs` já
  usa, com `config: ResolvedConfig` no lugar de `OwnershipConfig`.)

  ```typescript
  import type { ResolvedConfig } from '../resolve/hierarchy.ts'

  export type Severity = 'error' | 'warning'

  export interface Finding {
    ruleId: string
    file: string
    line: number
    severity: Severity
    message: string
    fix: string
  }

  export interface CheckContext {
    root: string
    config: ResolvedConfig
    today: string
  }

  export interface Check {
    id: string
    name: string
    run(context: CheckContext): Finding[]
  }
  ```

- [ ] **Passo 2: Escrever os testes de `generated-drift` que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownershipGeneratedDrift } from '../../src/checks/generated-drift.ts'
  import { buildConfig } from '../helpers/config.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('sem generated declarado, nenhum achado', () => {
    withTempRepo({}, root => {
      const findings = ownershipGeneratedDrift(() => '').run({ root, config: buildConfig({}), today: '2026-09-17' })

      assert.deepEqual(findings, [])
    })
  })

  test('artefato ausente é achado', () => {
    withTempRepo({}, root => {
      const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })
      const findings = ownershipGeneratedDrift(() => 'x').run({ root, config, today: '2026-09-17' })

      assert.equal(findings.length, 1)
      assert.match(findings[0]!.message, /ausente/)
    })
  })

  test('divergência entre o gerador e o arquivo é achado, com a linha certa', () => {
    withTempRepo({ 'out.md': 'a\nb\nc\n' }, root => {
      const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })
      const findings = ownershipGeneratedDrift(() => 'a\nX\nc\n').run({ root, config, today: '2026-09-17' })

      assert.equal(findings[0]?.line, 2)
    })
  })

  test('gerador que falha é achado, sem travar o check', () => {
    withTempRepo({ 'out.md': 'x' }, root => {
      const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })
      const findings = ownershipGeneratedDrift(() => {
        throw new Error('boom')
      }).run({ root, config, today: '2026-09-17' })

      assert.match(findings[0]!.message, /falhou/)
    })
  })

  test('igual, sem achado', () => {
    withTempRepo({ 'out.md': 'a\nb\n' }, root => {
      const config = buildConfig({ generated: [{ path: 'out.md', command: 'gen' }] })

      assert.deepEqual(ownershipGeneratedDrift(() => 'a\nb\n').run({ root, config, today: '2026-09-17' }), [])
    })
  })
  ```

- [ ] **Passo 3: Confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/checks/generated-drift.test.ts
  ```

- [ ] **Passo 4: Escrever `checks/generated-drift.ts`**

  ```typescript
  import { readFileSync } from 'node:fs'
  import { join } from 'node:path'
  import type { CommandRunner } from '../core/exec.ts'
  import type { Check, CheckContext, Finding } from './types.ts'

  const RULE = 'ownership/generated-drift'

  function normalize(source: string): string {
    return source.replace(/\r\n/g, '\n').replace(/\n+$/, '\n')
  }

  export function firstDifferentLine(actual: string, expected: string): number {
    const a = normalize(actual).split('\n')
    const b = normalize(expected).split('\n')
    const limit = Math.max(a.length, b.length)

    for (let i = 0; i < limit; i++) {
      if (a[i] !== b[i]) {
        return i + 1
      }
    }

    return 0
  }

  function error(file: string, line: number, message: string, fix: string): Finding {
    return { ruleId: RULE, file, line, severity: 'error', message, fix }
  }

  function reasonOf(err: unknown): string {
    const stderr = (err as { stderr?: unknown }).stderr
    const text = String(stderr ?? '').trim() || (err instanceof Error ? err.message : String(err))

    return text.split('\n')[0] ?? text
  }

  export function ownershipGeneratedDrift(exec: CommandRunner): Check {
    return {
      id: RULE,
      name: 'generated drift',
      run(context: CheckContext): Finding[] {
        const findings: Finding[] = []

        for (const rule of context.config.generated) {
          let expected: string

          try {
            expected = exec(rule.command, context.root)
          } catch (err) {
            findings.push(
              error(rule.path, 0, `O gerador falhou: \`${rule.command}\` — ${reasonOf(err)}`, `Conserte o comando declarado em \`generated[].command\` (${rule.origin}).`),
            )
            continue
          }

          let actual: string

          try {
            actual = readFileSync(join(context.root, rule.path), 'utf8')
          } catch {
            findings.push(error(rule.path, 0, 'Artefato gerado declarado e ausente do repositório.', `Gere-o e versione o resultado: \`${rule.command} > ${rule.path}\`.`))
            continue
          }

          const line = firstDifferentLine(actual, expected)

          if (line !== 0) {
            findings.push(error(rule.path, line, 'O artefato gerado diverge da saída do gerador.', `Regenere: \`${rule.command} > ${rule.path}\`. Não edite o arquivo à mão.`))
          }
        }

        return findings
      },
    }
  }
  ```

- [ ] **Passo 5: Rodar os testes e o type-check**

  ```bash
  cd packages/ownership && node --test test/checks/generated-drift.test.ts && npm run typecheck
  ```

- [ ] **Passo 6: Commit**

  ```bash
  git add packages/ownership/src/checks/types.ts packages/ownership/src/checks/generated-drift.ts packages/ownership/test/checks/generated-drift.test.ts
  git commit -m "feat(RN-0012): check ownership/generated-drift"
  ```

---

### Tarefa 12: Check `ownership/declared-state`

Regra de origem: spec §1 ("Ciclo de vida... O núcleo acha os itens... Não sabe
o que os estados significam") e §6 (tabela — "owner válido, status dentro de
`states`" → `ownership/declared-state`).

**Decisão de implementação:** a validade do `owner` (`@handle`) já é exigida
pelo parser da Tarefa 4, que lança `OwnershipError` — um `.ownership.yml` com
`owner` mal formado nunca chega a virar `ResolvedConfig`, então nunca chega
neste check. Este check cobre só a segunda metade: o estado de cada item, sob
cada caminho que declara `states`, precisa estar na lista declarada. Caminho
sem `states` não é validado — o núcleo não inventa vocabulário.

Cobre também a garantia de identidade da spec §3: em `table` e `sections`,
chave repetida dentro do arquivo é achado (a Tarefa 5 aponta, este check
reporta), com ou sem `states` declarado. Regras citadas: `<RN-identidade>` e
`RN-0001`.

**Arquivos:**
- Create: `packages/ownership/src/checks/declared-state.ts`
- Test: `packages/ownership/test/checks/declared-state.test.ts`

**Interfaces:**
- Consome: `listFiles`, `readTextFile` (Tarefa 3), `parseFrontmatter` (Tarefa 3),
  `parseItemsTable`, `parseItemsSections` (Tarefa 5), `Check`/`CheckContext`/`Finding` (Tarefa 11).
- Produz: `ownershipDeclaredState(): Check`.

- [ ] **Passo 1: Escrever os testes que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownershipDeclaredState } from '../../src/checks/declared-state.ts'
  import { forgetTree } from '../../src/core/files.ts'
  import { buildConfig } from '../helpers/config.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('per-file: status fora dos states declarados é achado', () => {
    withTempRepo({ 'docs/decisions/adr/x.md': '---\nstatus: inventado\n---\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a', states: ['draft', 'accepted', 'superseded'] }] })
      const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-17' })

      assert.equal(findings.length, 1)
      assert.match(findings[0]!.message, /inventado/)
    })
  })

  test('per-file: status dentro dos states declarados não é achado', () => {
    withTempRepo({ 'docs/decisions/adr/x.md': '---\nstatus: draft\n---\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a', states: ['draft', 'accepted'] }] })

      assert.deepEqual(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }), [])
    })
  })

  test('sem states declarado, nenhuma validação — o núcleo não inventa vocabulário', () => {
    withTempRepo({ 'docs/decisions/adr/x.md': '---\nstatus: qualquer-coisa\n---\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a' }] })

      assert.deepEqual(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }), [])
    })
  })

  test('table: item com status fora dos states é achado, com a linha certa', () => {
    const content = '| ID | Status |\n| --- | ------ |\n| DA-01 | inventado |\n'

    withTempRepo({ 'docs/open-decisions.md': content }, root => {
      forgetTree(root)
      const config = buildConfig({
        owned: [{ path: 'docs/open-decisions.md', owner: '@a', states: ['open', 'resolved'], format: { collection: 'table', key: 'ID', keyMode: null, stateField: 'status' } }],
      })
      const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-17' })

      assert.equal(findings[0]?.line, 3)
    })
  })

  test('sections: item com status fora dos states é achado', () => {
    const content = '## RN-0001 — x\n\n- **status:** inventado\n'

    withTempRepo({ 'docs/requirements/rules.md': content }, root => {
      forgetTree(root)
      const config = buildConfig({
        owned: [
          { path: 'docs/requirements/rules.md', owner: '@a', states: ['draft', 'active'], format: { collection: 'sections', key: null, keyMode: 'first-token', stateField: 'status' } },
        ],
      })

      assert.equal(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }).length, 1)
    })
  })

  test('chave duplicada é achado, mesmo sem states declarado', () => {
    const content = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n| DA-01 | open |\n'

    withTempRepo({ 'docs/open-decisions.md': content }, root => {
      forgetTree(root)
      const config = buildConfig({
        owned: [{ path: 'docs/open-decisions.md', owner: '@a', format: { collection: 'table', key: 'ID', keyMode: null, stateField: 'status' } }],
      })
      const findings = ownershipDeclaredState().run({ root, config, today: '2026-09-17' })

      assert.equal(findings.length, 1)
      assert.equal(findings[0]?.line, 4)
      assert.match(findings[0]!.message, /DA-01/)
    })
  })

  test('state-field customizado é lido no lugar de status', () => {
    withTempRepo({ 'docs/decisions/adr/x.md': '---\nsituação: inventado\n---\n' }, root => {
      forgetTree(root)
      const config = buildConfig({
        owned: [{ path: 'docs/decisions/adr/', owner: '@a', states: ['draft'], format: { collection: 'per-file', key: null, keyMode: null, stateField: 'situação' } }],
      })

      assert.equal(ownershipDeclaredState().run({ root, config, today: '2026-09-17' }).length, 1)
    })
  })
  ```

- [ ] **Passo 2: Confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/checks/declared-state.test.ts
  ```

- [ ] **Passo 3: Escrever `checks/declared-state.ts`**

  ```typescript
  import { listFiles, readTextFile } from '../core/files.ts'
  import { parseFrontmatter } from '../core/frontmatter.ts'
  import { findDuplicateKeys, parseItemsSections, parseItemsTable } from '../schema/item.ts'
  import type { DocItem } from '../schema/item.ts'
  import type { ResolvedOwnedRule } from '../resolve/hierarchy.ts'
  import type { Check, CheckContext, Finding } from './types.ts'

  const RULE = 'ownership/declared-state'

  function error(file: string, line: number, message: string, fix: string): Finding {
    return { ruleId: RULE, file, line, severity: 'error', message, fix }
  }

  function filesUnder(root: string, rulePath: string): string[] {
    return rulePath.endsWith('/') ? listFiles(root, [`${rulePath}**/*.md`]) : listFiles(root, [rulePath])
  }

  interface Observed {
    states: { state: string; line: number }[]
    duplicates: DocItem[]
  }

  const NOTHING: Observed = { states: [], duplicates: [] }

  function observe(root: string, rule: ResolvedOwnedRule, file: string): Observed {
    const content = readTextFile(root, file)

    if (content === null) {
      return NOTHING
    }

    if (rule.format.collection === 'per-file') {
      let frontmatter

      try {
        frontmatter = parseFrontmatter(content)
      } catch {
        return NOTHING
      }
      const value = frontmatter?.data[rule.format.stateField]

      return typeof value === 'string' && value !== '' ? { states: [{ state: value, line: frontmatter?.lines[rule.format.stateField] ?? 0 }], duplicates: [] } : NOTHING
    }

    const items =
      rule.format.collection === 'table'
        ? parseItemsTable(content, 1, { key: rule.format.key!, stateField: rule.format.stateField })
        : parseItemsSections(content, 1, { keyMode: rule.format.keyMode!, stateField: rule.format.stateField })

    return {
      states: items.filter(item => item.state !== '').map(item => ({ state: item.state, line: item.line })),
      duplicates: findDuplicateKeys(items),
    }
  }

  export function ownershipDeclaredState(): Check {
    return {
      id: RULE,
      name: 'declared state',
      run(context: CheckContext): Finding[] {
        const findings: Finding[] = []

        for (const rule of context.config.owned) {
          for (const file of filesUnder(context.root, rule.path)) {
            const observed = observe(context.root, rule, file)

            for (const duplicate of observed.duplicates) {
              findings.push(
                error(
                  file,
                  duplicate.line,
                  `A chave "${duplicate.key}" aparece mais de uma vez neste arquivo — a chave identifica o item dentro do arquivo.`,
                  'Dê a este item uma chave própria, ou funda as duas entradas.',
                ),
              )
            }
            if (rule.states === null) {
              continue
            }
            for (const { state, line } of observed.states) {
              if (!rule.states.includes(state)) {
                findings.push(
                  error(
                    file,
                    line,
                    `"${state}" não está entre os estados declarados para \`${rule.path}\`: ${rule.states.join(', ')}.`,
                    `Use um dos estados declarados, ou acrescente "${state}" a \`states\` em \`owned[]\` (${rule.origin}), se ele for legítimo.`,
                  ),
                )
              }
            }
          }
        }

        return findings
      },
    }
  }
  ```

- [ ] **Passo 4: Rodar os testes e o type-check**

  ```bash
  cd packages/ownership && node --test test/checks/declared-state.test.ts && npm run typecheck
  ```

- [ ] **Passo 5: Commit**

  ```bash
  git add packages/ownership/src/checks/declared-state.ts packages/ownership/test/checks/declared-state.test.ts
  git commit -m "feat(<RN-identidade>): check ownership/declared-state"
  ```

---

### Tarefa 13: Check `ownership/owner-coverage`

Regra de origem: spec §1 ("cobertura de dono contra o CODEOWNERS"), §2
("`ignore:` tira caminhos da governança"), §5 ("o arquivo de ownership incluído
é ele próprio um caminho governado") e §6 — a cobertura de propriedade
parte-se, e vão para o núcleo: entrada no ownership, linha no CODEOWNERS e
`watches` com `doc` existente e com dono. Regras citadas: `<RN-cobertura>`,
`RN-0001`, `RN-0016`, `RN-0021`.

O check olha nas duas direções:

- **Do repositório para o ownership.** Todo arquivo que a varredura enxerga
  (`listFiles` já pula `.git`, `node_modules`, `dist`…) precisa de uma regra em
  `owned[]` que o cubra, a menos que case com `ignore[]`. É por isso que
  `ignore` existe: sem ele, a cobertura cobraria dono de `vendor/` e de
  diretório gerado. Os próprios arquivos de ownership entram aqui sem caso
  especial — são arquivos como os outros.
- **Do ownership para fora.** Cada entrada de `owned[]` existe no disco e tem
  linha no CODEOWNERS; cada `watches[].doc` existe e tem regra em `owned[]`.

Ao contrário do `CI-7` do `@esliph/living-docs`, não há "raiz da
documentação": o núcleo governa o repositório inteiro, e `ignore` é o único
jeito de tirar algo da governança.

**Arquivos:**
- Create: `packages/ownership/src/checks/owner-coverage.ts`
- Test: `packages/ownership/test/checks/owner-coverage.test.ts`

**Interfaces:**
- Consome: `listFiles` (Tarefa 3), `loadCodeowners`, `ownersOf` (Tarefa 3),
  `findOwnedRule` (Tarefa 7), `Check`/`CheckContext`/`Finding` (Tarefa 11).
- Produz: `ownershipOwnerCoverage(): Check`.

- [ ] **Passo 1: Escrever os testes que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownershipOwnerCoverage } from '../../src/checks/owner-coverage.ts'
  import { forgetTree } from '../../src/core/files.ts'
  import { buildConfig } from '../helpers/config.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const today = '2026-09-17'

  test('CODEOWNERS ausente é achado', () => {
    withTempRepo({ 'docs/x.md': 'x' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/x.md', owner: '@a' }] })

      assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => /CODEOWNERS ausente/.test(f.message)))
    })
  })

  test('caminho declarado que não existe no repositório é achado', () => {
    withTempRepo({ CODEOWNERS: 'docs/x.md @a\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/x.md', owner: '@a' }], ignore: ['CODEOWNERS'] })

      assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => /não existe/.test(f.message)))
    })
  })

  test('caminho existente sem linha no CODEOWNERS é achado', () => {
    withTempRepo({ 'docs/x.md': 'x', CODEOWNERS: 'docs/y.md @a\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/x.md', owner: '@a' }], ignore: ['CODEOWNERS'] })

      assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => /não tem linha/.test(f.message)))
    })
  })

  test('arquivo sem regra em owned[] é achado; o que casa com ignore não é', () => {
    withTempRepo({ 'src/a.ts': 'x', 'vendor/lib.js': 'x', CODEOWNERS: '* @a\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ ignore: ['vendor/**', 'CODEOWNERS'] })
      const findings = ownershipOwnerCoverage().run({ root, config, today })

      assert.deepEqual(
        findings.map(f => f.file),
        ['src/a.ts'],
      )
    })
  })

  test('o próprio arquivo de ownership precisa de dono como qualquer outro', () => {
    withTempRepo({ '.ownership.yml': 'x', CODEOWNERS: '* @a\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ ignore: ['CODEOWNERS'] })

      assert.ok(ownershipOwnerCoverage().run({ root, config, today }).some(f => f.file === '.ownership.yml'))
    })
  })

  test('watches com doc inexistente ou sem regra em owned[] é achado', () => {
    withTempRepo({ 'src/a.ts': 'x', 'README.md': 'x', CODEOWNERS: '* @a\n' }, root => {
      forgetTree(root)
      const config = buildConfig({
        owned: [{ path: 'src/', owner: '@a' }],
        watches: [
          { code: 'src/**', doc: 'docs/nao-existe.md' },
          { code: 'src/**', doc: 'README.md' },
        ],
        ignore: ['CODEOWNERS', 'README.md'],
      })
      const messages = ownershipOwnerCoverage()
        .run({ root, config, today })
        .map(f => f.message)

      assert.ok(messages.some(m => /docs\/nao-existe\.md.*não existe/.test(m)))
      assert.ok(messages.some(m => /README\.md.*sem regra/.test(m)))
    })
  })

  test('tudo coberto: nenhum achado', () => {
    withTempRepo({ 'docs/decisions/adr/x.md': 'x', CODEOWNERS: 'docs/decisions/adr/ @a\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/decisions/adr/', owner: '@a' }], ignore: ['CODEOWNERS'] })

      assert.deepEqual(ownershipOwnerCoverage().run({ root, config, today }), [])
    })
  })
  ```

- [ ] **Passo 2: Confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/checks/owner-coverage.test.ts
  ```

- [ ] **Passo 3: Escrever `checks/owner-coverage.ts`**

  ```typescript
  import { existsSync } from 'node:fs'
  import { join } from 'node:path'
  import picomatch from 'picomatch'
  import { loadCodeowners, ownersOf } from '../core/codeowners.ts'
  import { listFiles } from '../core/files.ts'
  import { findOwnedRule } from '../resolve/hierarchy.ts'
  import type { Check, CheckContext, Finding } from './types.ts'

  const RULE = 'ownership/owner-coverage'

  function error(file: string, message: string, fix: string): Finding {
    return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
  }

  export function ownershipOwnerCoverage(): Check {
    return {
      id: RULE,
      name: 'owner coverage',
      run(context: CheckContext): Finding[] {
        const findings: Finding[] = []
        const { config, root } = context
        const codeowners = loadCodeowners(root)

        if (codeowners === null) {
          findings.push(
            error(config.rootFile, 'CODEOWNERS ausente: nenhum caminho governado tem dono declarado do lado de quem revisa.', 'Crie `CODEOWNERS` na raiz (ou em `.github/`), espelhando o `owner` de cada entrada de `owned[]`.'),
          )
        }

        // Do repositório para o ownership: todo arquivo tem regra, ou está em `ignore`.
        const ignored = config.ignore.length === 0 ? () => false : picomatch(config.ignore, { dot: true })

        for (const file of listFiles(root).sort()) {
          if (!ignored(file) && findOwnedRule(config, file) === null) {
            findings.push(error(file, `"${file}" não é coberto por nenhuma regra de \`owned[]\` nem por \`ignore\`.`, 'Declare um dono para o caminho em `owned[]`, ou tire-o da governança em `ignore`.'))
          }
        }

        // Do ownership para fora: a entrada existe e o CODEOWNERS a cobre.
        for (const rule of config.owned) {
          if (!existsSync(join(root, rule.path))) {
            findings.push(error(rule.path, `"${rule.path}" está declarado em \`owned[]\` (${rule.origin}) e não existe no repositório.`, 'Crie o caminho, ou corrija a entrada.'))
            continue
          }
          if (codeowners !== null && ownersOf(codeowners, rule.path) === null) {
            findings.push(error(rule.path, `"${rule.path}" não tem linha em \`${codeowners.file}\`.`, `Acrescente \`${rule.path}    ${rule.owner}\` em \`${codeowners.file}\`.`))
          }
        }

        // O doc de um `watches` precisa existir e ter dono — senão o lembrete aponta para o nada.
        const docs = new Map(config.watches.map(watch => [watch.doc, watch.origin]))

        for (const [doc, origin] of docs) {
          if (!existsSync(join(root, doc))) {
            findings.push(error(doc, `"${doc}" é o doc de \`watches\` (${origin}) e não existe no repositório.`, 'Crie o documento, ou corrija `watches[].doc`.'))
          } else if (findOwnedRule(config, doc) === null) {
            findings.push(error(doc, `"${doc}" é o doc de \`watches\` (${origin}) e está sem regra em \`owned[]\`.`, 'Declare o dono do documento em `owned[]`.'))
          }
        }

        return findings
      },
    }
  }
  ```

- [ ] **Passo 4: Rodar os testes e o type-check**

  ```bash
  cd packages/ownership && node --test test/checks/owner-coverage.test.ts && npm run typecheck
  ```

- [ ] **Passo 5: Commit**

  ```bash
  git add packages/ownership/src/checks/owner-coverage.ts packages/ownership/test/checks/owner-coverage.test.ts
  git commit -m "feat(<RN-cobertura>): check ownership/owner-coverage"
  ```

---

### Tarefa 14: Checks `ownership/watch-satisfied` e `ownership/consumer-change-logged`

Regra de origem: `RN-0021` e `RN-0013`; spec §6 ("vigiado alterado sem o doc dono... vão para o
núcleo", "mudança visível a quem consome... núcleo, inteiros") e §2 (fim de
`consumer-visible-paths` como lista separada — os alvos e os globos vêm
diretamente de `watches[].consumer-visible`). Os dois recebem o diff por
injeção, como `CI-6`/`CI-7` já faziam em `@esliph/living-docs` — o diff não é
parte do `CheckContext` compartilhado.

**Arquivos:**
- Create: `packages/ownership/src/checks/watch-satisfied.ts`
- Create: `packages/ownership/src/checks/consumer-change-logged.ts`
- Test: `packages/ownership/test/checks/watch-satisfied.test.ts`
- Test: `packages/ownership/test/checks/consumer-change-logged.test.ts`

**Interfaces:**
- Consome: `pendingDocs` (Tarefa 9), `exceptionReasonFor` (Tarefa 3),
  `Check`/`CheckContext`/`Finding` (Tarefa 11).
- Produz: `interface DiffFacts { base: string; changed: readonly string[]; messages: readonly string[] }`,
  `ownershipWatchSatisfied(diff: DiffFacts): Check`,
  `ownershipConsumerChangeLogged(diff: DiffFacts): Check`.

- [ ] **Passo 1: Escrever os testes de `watch-satisfied` que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownershipWatchSatisfied } from '../../src/checks/watch-satisfied.ts'
  import { buildConfig } from '../helpers/config.ts'

  const config = buildConfig({ watches: [{ code: 'src/checks/**', doc: 'docs/requirements/rules.md', reason: 'x' }] })

  test('diff toca o código vigiado sem o doc dono: achado', () => {
    const diff = { base: 'main', changed: ['src/checks/a.ts'], messages: [] }
    const findings = ownershipWatchSatisfied(diff).run({ root: '/repo', config, today: '2026-09-17' })

    assert.equal(findings.length, 1)
    assert.match(findings[0]!.message, /rules\.md/)
  })

  test('diff traz os dois: sem achado', () => {
    const diff = { base: 'main', changed: ['src/checks/a.ts', 'docs/requirements/rules.md'], messages: [] }

    assert.deepEqual(ownershipWatchSatisfied(diff).run({ root: '/repo', config, today: '2026-09-17' }), [])
  })

  test('Docs: none — razão na mensagem de commit libera', () => {
    const diff = { base: 'main', changed: ['src/checks/a.ts'], messages: ['fix: x', 'Docs: none — não afeta nada'] }

    assert.deepEqual(ownershipWatchSatisfied(diff).run({ root: '/repo', config, today: '2026-09-17' }), [])
  })
  ```

- [ ] **Passo 2: Escrever `checks/watch-satisfied.ts`**

  ```typescript
  import { exceptionReasonFor } from '../core/exception-label.ts'
  import { pendingDocs } from '../triggers/watches.ts'
  import type { Check, CheckContext, Finding } from './types.ts'

  export interface DiffFacts {
    base: string
    changed: readonly string[]
    messages: readonly string[]
  }

  const RULE = 'ownership/watch-satisfied'

  function error(file: string, message: string, fix: string): Finding {
    return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
  }

  export function ownershipWatchSatisfied(diff: DiffFacts): Check {
    return {
      id: RULE,
      name: 'watch satisfied',
      run(context: CheckContext): Finding[] {
        if (exceptionReasonFor('Docs', diff.messages) !== null) {
          return []
        }

        return pendingDocs(context.config, diff.changed).map(pending => {
          const trigger = pending.matched.slice(0, 5).join(', ') + (pending.matched.length > 5 ? `, … (+${pending.matched.length - 5})` : '')

          return error(
            pending.doc,
            `O diff \`${diff.base}...HEAD\` toca caminho vigiado (${trigger}) e \`${pending.doc}\` não está entre os caminhos alterados.`,
            `Atualize \`${pending.doc}\`${pending.skill === null ? '' : ` (skill dona: ${pending.skill})`} no mesmo PR — ou escreva \`Docs: none — <razão>\` numa mensagem de commit.`,
          )
        })
      },
    }
  }
  ```

- [ ] **Passo 3: Rodar os testes de `watch-satisfied`**

  ```bash
  cd packages/ownership && node --test test/checks/watch-satisfied.test.ts
  ```

- [ ] **Passo 4: Escrever os testes de `consumer-change-logged` que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownershipConsumerChangeLogged } from '../../src/checks/consumer-change-logged.ts'
  import { buildConfig } from '../helpers/config.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('sem watches consumer-visible, nenhum achado mesmo com diff grande', () => {
    const config = buildConfig({})

    assert.deepEqual(
      ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts'], messages: [] }).run({ root: '/repo', config, today: '2026-09-17' }),
      [],
    )
  })

  test('diff toca caminho consumer-visible e o changelog não veio junto: achado', () => {
    withTempRepo({}, root => {
      const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
      const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts'], messages: [] }).run({ root, config, today: '2026-09-17' })

      assert.equal(findings.length, 1)
    })
  })

  test('changelog veio junto mas sem item em Unreleased: achado', () => {
    withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n' }, root => {
      const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
      const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({
        root,
        config,
        today: '2026-09-17',
      })

      assert.equal(findings.length, 1)
    })
  })

  test('changelog veio junto com item em Unreleased: sem achado', () => {
    withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n\n- x\n' }, root => {
      const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })

      assert.deepEqual(
        ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({ root, config, today: '2026-09-17' }),
        [],
      )
    })
  })

  test('cada doc visível só é cobrado pelos caminhos da própria regra', () => {
    withTempRepo({ 'CHANGELOG.md': '## [Unreleased]\n\n### Added\n\n- x\n' }, root => {
      const config = buildConfig({
        watches: [
          { code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true },
          { code: 'plugin/**', doc: 'docs/plugin-changes.md', consumerVisible: true },
        ],
      })
      const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts', 'CHANGELOG.md'], messages: [] }).run({
        root,
        config,
        today: '2026-09-17',
      })

      assert.deepEqual(findings, [])
    })
  })

  test('Changelog: none — razão libera', () => {
    withTempRepo({}, root => {
      const config = buildConfig({ watches: [{ code: 'src/cli/**', doc: 'CHANGELOG.md', consumerVisible: true }] })
      const findings = ownershipConsumerChangeLogged({ base: 'main', changed: ['src/cli/a.ts'], messages: ['Changelog: none — interno'] }).run({
        root,
        config,
        today: '2026-09-17',
      })

      assert.deepEqual(findings, [])
    })
  })
  ```

- [ ] **Passo 5: Escrever `checks/consumer-change-logged.ts`**

  ```typescript
  import { readFileSync } from 'node:fs'
  import { join } from 'node:path'
  import picomatch from 'picomatch'
  import { exceptionReasonFor } from '../core/exception-label.ts'
  import type { Check, CheckContext, Finding } from './types.ts'
  import type { DiffFacts } from './watch-satisfied.ts'

  const RULE = 'ownership/consumer-change-logged'

  function normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/^\.\//, '')
  }

  function error(file: string, message: string, fix: string): Finding {
    return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
  }

  function unreleasedEntries(source: string): string[] {
    const lines = source.replace(/\r\n/g, '\n').split('\n')
    const start = lines.findIndex(line => /^##\s+\[?unreleased\]?/i.test(line.trim()))

    if (start === -1) {
      return []
    }

    const entries: string[] = []

    for (let i = start + 1; i < lines.length; i++) {
      const line = lines[i] ?? ''

      if (/^##\s/.test(line)) {
        break
      }
      if (/^\s*[-*]\s+\S/.test(line)) {
        entries.push(line.trim())
      }
    }

    return entries
  }

  export function ownershipConsumerChangeLogged(diff: DiffFacts): Check {
    return {
      id: RULE,
      name: 'consumer change logged',
      run(context: CheckContext): Finding[] {
        const visible = context.config.watches.filter(watch => watch.consumerVisible)

        if (visible.length === 0) {
          return []
        }

        const changed = diff.changed.map(normalize)
        // Cada doc só é cobrado pelos caminhos das regras que apontam para ele:
        // tocar `src/cli/**` não pode exigir o doc de outra regra visível.
        const hitsByDoc = new Map<string, string[]>()

        for (const watch of visible) {
          const matches = picomatch(watch.code)
          const doc = normalize(watch.doc)
          const hits = changed.filter(path => matches(path))

          if (hits.length > 0) {
            hitsByDoc.set(doc, [...new Set([...(hitsByDoc.get(doc) ?? []), ...hits])])
          }
        }

        if (hitsByDoc.size === 0) {
          return []
        }
        if (exceptionReasonFor('Changelog', diff.messages) !== null) {
          return []
        }

        const findings: Finding[] = []

        for (const [target, hits] of hitsByDoc) {
          const trigger = hits.slice(0, 5).join(', ') + (hits.length > 5 ? `, … (+${hits.length - 5})` : '')

          if (!changed.includes(target)) {
            findings.push(
              error(
                target,
                `O diff \`${diff.base}...HEAD\` toca caminho visível ao consumidor (${trigger}) e \`${target}\` não está entre os caminhos alterados.`,
                `Acrescente a entrada em \`## [Unreleased]\` de \`${target}\` — ou escreva \`Changelog: none — <razão>\` na mensagem de commit.`,
              ),
            )
            continue
          }

          let source: string

          try {
            source = readFileSync(join(context.root, target), 'utf8')
          } catch {
            findings.push(error(target, `\`${target}\` está declarado como doc de mudança visível e está ausente do repositório.`, `Crie \`${target}\` no formato Keep a Changelog.`))
            continue
          }

          if (unreleasedEntries(source).length === 0) {
            findings.push(
              error(
                target,
                `O diff toca caminho visível ao consumidor (${trigger}) e \`## [Unreleased]\` de \`${target}\` não tem nenhum item.`,
                'Escreva a entrada sob a subseção certa (Added, Changed, Deprecated, Removed, Fixed, Security).',
              ),
            )
          }
        }

        return findings
      },
    }
  }
  ```

- [ ] **Passo 6: Rodar todos os testes da tarefa e o type-check**

  ```bash
  cd packages/ownership && node --test test/checks/watch-satisfied.test.ts test/checks/consumer-change-logged.test.ts && npm run typecheck
  ```

- [ ] **Passo 7: Commit**

  ```bash
  git add packages/ownership/src/checks/watch-satisfied.ts packages/ownership/src/checks/consumer-change-logged.ts packages/ownership/test/checks/watch-satisfied.test.ts packages/ownership/test/checks/consumer-change-logged.test.ts
  git commit -m "feat(RN-0021): checks ownership/watch-satisfied e ownership/consumer-change-logged"
  ```

---

### Tarefa 15: Check `ownership/derivation-resolves` e o registro de checks

Regra de origem: `<RN-derivacao>`; spec §4 e §6 ("derivação declarada resolve" →
`ownership/derivation-resolves`).

**Arquivos:**
- Create: `packages/ownership/src/checks/derivation-resolves.ts`
- Create: `packages/ownership/src/checks/registry.ts`
- Test: `packages/ownership/test/checks/derivation-resolves.test.ts`
- Test: `packages/ownership/test/checks/registry.test.ts`

**Interfaces:**
- Consome: `problemsFor` (Tarefa 10), todos os `ownership*` checks das Tarefas
  11–14, `CommandRunner`/`runCommand` (Tarefa 3).
- Produz: `ownershipDerivationResolves(): Check`,
  `coreChecks(exec?: CommandRunner): readonly Check[]`,
  `diffChecks(diff: DiffFacts): readonly Check[]`.

- [ ] **Passo 1: Escrever os testes de `derivation-resolves` que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { ownershipDerivationResolves } from '../../src/checks/derivation-resolves.ts'
  import { forgetTree } from '../../src/core/files.ts'
  import { buildConfig } from '../helpers/config.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('campo ausente, fora da fonte e alvo inexistente viram achados distintos', () => {
    withTempRepo(
      {
        'docs/plans/a.md': '---\ntitle: sem spec\n---\n',
        'docs/plans/b.md': '---\nspec: docs/outro/x.md\n---\n',
        'docs/plans/c.md': '---\nspec: docs/specs/nao-existe.md\n---\n',
      },
      root => {
        forgetTree(root)
        const config = buildConfig({
          owned: [{ path: 'docs/plans/', owner: '@a', derivesFrom: { source: 'docs/specs/', field: 'spec' } }],
        })
        const findings = ownershipDerivationResolves().run({ root, config, today: '2026-09-17' })

        assert.equal(findings.length, 3)
      },
    )
  })

  test('derivação que resolve não gera achado', () => {
    withTempRepo({ 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n', 'docs/specs/s1.md': '# s1\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/plans/', owner: '@a', derivesFrom: { source: 'docs/specs/', field: 'spec' } }] })

      assert.deepEqual(ownershipDerivationResolves().run({ root, config, today: '2026-09-17' }), [])
    })
  })

  test('caminho sem derives-from não é examinado', () => {
    withTempRepo({ 'docs/plans/a.md': '---\ntitle: x\n---\n' }, root => {
      forgetTree(root)
      const config = buildConfig({ owned: [{ path: 'docs/plans/', owner: '@a' }] })

      assert.deepEqual(ownershipDerivationResolves().run({ root, config, today: '2026-09-17' }), [])
    })
  })
  ```

- [ ] **Passo 2: Escrever `checks/derivation-resolves.ts`**

  ```typescript
  import { problemsFor } from '../triggers/derives.ts'
  import type { DerivationProblem } from '../triggers/derives.ts'
  import type { ResolvedOwnedRule } from '../resolve/hierarchy.ts'
  import type { Check, CheckContext, Finding } from './types.ts'

  const RULE = 'ownership/derivation-resolves'

  function messageFor(rule: ResolvedOwnedRule, problem: DerivationProblem): string {
    const source = rule.derivesFrom!.source
    const field = rule.derivesFrom!.field

    if (problem.reason === 'campo-ausente') {
      return `${problem.file} deriva de \`${source}\` (declarado em \`owned[]\`, ${rule.origin}) e não declara o campo \`${field}\` no frontmatter.`
    }
    if (problem.reason === 'fora-da-fonte') {
      return `${problem.file}: o campo \`${field}\` aponta para "${problem.field}", fora de \`${source}\`.`
    }

    return `${problem.file}: o campo \`${field}\` aponta para "${problem.field}", que não existe no repositório.`
  }

  export function ownershipDerivationResolves(): Check {
    return {
      id: RULE,
      name: 'derivation resolves',
      run(context: CheckContext): Finding[] {
        const findings: Finding[] = []

        for (const rule of context.config.owned) {
          if (rule.derivesFrom === null) {
            continue
          }
          for (const problem of problemsFor(context.root, rule)) {
            findings.push({
              ruleId: RULE,
              file: problem.file,
              line: problem.line,
              severity: 'error',
              message: messageFor(rule, problem),
              fix: `Declare \`${rule.derivesFrom.field}: <caminho sob ${rule.derivesFrom.source}>\` no frontmatter de ${problem.file}, apontando para um arquivo que existe.`,
            })
          }
        }

        return findings
      },
    }
  }
  ```

- [ ] **Passo 3: Rodar os testes de `derivation-resolves`**

  ```bash
  cd packages/ownership && node --test test/checks/derivation-resolves.test.ts
  ```

- [ ] **Passo 4: Escrever o teste de `registry.ts` que falha primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { coreChecks, diffChecks } from '../../src/checks/registry.ts'

  test('coreChecks devolve os quatro checks que não dependem de diff', () => {
    const ids = coreChecks(() => '').map(check => check.id)

    assert.deepEqual(ids.sort(), ['ownership/declared-state', 'ownership/derivation-resolves', 'ownership/generated-drift', 'ownership/owner-coverage'].sort())
  })

  test('diffChecks devolve os dois que dependem de diff', () => {
    const ids = diffChecks({ base: 'main', changed: [], messages: [] }).map(check => check.id)

    assert.deepEqual(ids.sort(), ['ownership/consumer-change-logged', 'ownership/watch-satisfied'].sort())
  })
  ```

- [ ] **Passo 5: Escrever `checks/registry.ts`**

  ```typescript
  import type { CommandRunner } from '../core/exec.ts'
  import { runCommand } from '../core/exec.ts'
  import type { Check } from './types.ts'
  import { ownershipGeneratedDrift } from './generated-drift.ts'
  import { ownershipDeclaredState } from './declared-state.ts'
  import { ownershipOwnerCoverage } from './owner-coverage.ts'
  import { ownershipDerivationResolves } from './derivation-resolves.ts'
  import { ownershipWatchSatisfied } from './watch-satisfied.ts'
  import type { DiffFacts } from './watch-satisfied.ts'
  import { ownershipConsumerChangeLogged } from './consumer-change-logged.ts'

  export type { DiffFacts }

  /** Checks que não precisam do diff da branch — rodam sempre que `ownership validate` roda. */
  export function coreChecks(exec: CommandRunner = runCommand): readonly Check[] {
    return [ownershipDeclaredState(), ownershipGeneratedDrift(exec), ownershipOwnerCoverage(), ownershipDerivationResolves()]
  }

  /** Checks que precisam do diff — só rodam com `ownership validate --base <ref>`. */
  export function diffChecks(diff: DiffFacts): readonly Check[] {
    return [ownershipWatchSatisfied(diff), ownershipConsumerChangeLogged(diff)]
  }
  ```

- [ ] **Passo 6: Rodar toda a suíte do pacote e o type-check**

  ```bash
  cd packages/ownership && node --test "test/**/*.test.ts" && npm run typecheck
  ```

- [ ] **Passo 7: Commit**

  ```bash
  git add packages/ownership/src/checks/derivation-resolves.ts packages/ownership/src/checks/registry.ts packages/ownership/test/checks/derivation-resolves.test.ts packages/ownership/test/checks/registry.test.ts
  git commit -m "feat(<RN-derivacao>): check ownership/derivation-resolves e registro dos checks"
  ```

---

### Tarefa 16: Infraestrutura de hook e `ownership/generated-guard`

Regra de origem: `RN-0012`; spec §6 ("artefato gerado (hook)" → `ownership/generated-guard`).
Porta `src/hooks/lib/{paths,io,edit}.ts` e `src/hooks/hk2-generated-artifact.ts`
do `@esliph/living-docs`. Duas variáveis de ambiente novas e próprias deste
plugin — `OWNERSHIP_REPO_ROOT`/`OWNERSHIP_HOST_ROOT` —, distintas de
`LIVING_DOCS_REPO_ROOT`/`LIVING_DOCS_HOST_ROOT`: os dois plugins podem estar
instalados ao mesmo tempo, e cada um lê o repositório que julga pela variável
que é sua.

**Arquivos:**
- Create: `packages/ownership/src/hooks/lib/paths.ts`
- Create: `packages/ownership/src/hooks/lib/io.ts`
- Create: `packages/ownership/src/hooks/generated-guard.ts`
- Test: `packages/ownership/test/hooks/lib/paths.test.ts`
- Test: `packages/ownership/test/hooks/lib/io.test.ts`
- Test: `packages/ownership/test/hooks/generated-guard.test.ts`

**Interfaces:**
- Consome: `resolveOwnership`, `findGeneratedRule` (Tarefa 7).
- Produz: `toRepoPath(filePath, roots): string | null`,
  `interface HookEnv { root: string; hostRoots: readonly string[] }`,
  `interface HookPayload { tool_name?: string; tool_input?: Record<string, unknown> }`,
  `hookEnv(): HookEnv`, `readPayload(): Promise<HookPayload | null>`,
  `denyOutput`, `askOutput`, `contextOutput`, `emit`,
  `decideGeneratedGuard(payload, env): { action: 'allow' } | { action: 'deny'; reason: string }`.

- [ ] **Passo 1: Portar `hooks/lib/paths.ts`**

  Cópia exata de `src/hooks/lib/paths.ts` — já é genérico:

  ```typescript
  function normalize(path: string): string {
    return path.replace(/\\/g, '/').replace(/\/+$/, '')
  }

  export function toRepoPath(filePath: string, roots: readonly string[]): string | null {
    const normalized = normalize(filePath)
    const isAbsolute = normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)

    if (!isAbsolute) {
      return normalized.replace(/^\.\//, '')
    }

    for (const root of roots) {
      const prefix = `${normalize(root)}/`

      if (normalized.toLowerCase().startsWith(prefix.toLowerCase())) {
        return normalized.slice(prefix.length)
      }
    }

    return null
  }
  ```

- [ ] **Passo 2: Teste de `paths.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { toRepoPath } from '../../../src/hooks/lib/paths.ts'

  test('caminho relativo passa direto', () => {
    assert.equal(toRepoPath('./src/a.ts', ['/repo']), 'src/a.ts')
  })

  test('caminho absoluto sob uma das raízes vira relativo', () => {
    assert.equal(toRepoPath('/repo/src/a.ts', ['/repo']), 'src/a.ts')
  })

  test('caminho absoluto fora de toda raiz devolve null', () => {
    assert.equal(toRepoPath('/outro/src/a.ts', ['/repo']), null)
  })
  ```

- [ ] **Passo 3: Portar `hooks/lib/io.ts`, com as variáveis de ambiente próprias**

  ```typescript
  import { resolve } from 'node:path'

  export interface HookEnv {
    root: string
    hostRoots: readonly string[]
  }

  export interface HookPayload {
    tool_name?: string
    tool_input?: Record<string, unknown>
  }

  export function hookEnv(): HookEnv {
    const root = resolve(process.env.OWNERSHIP_REPO_ROOT ?? process.cwd())
    const host = process.env.OWNERSHIP_HOST_ROOT

    return { root, hostRoots: host ? [root, host] : [root] }
  }

  export async function readPayload(): Promise<HookPayload | null> {
    const chunks: Buffer[] = []

    for await (const chunk of process.stdin) {
      chunks.push(chunk as Buffer)
    }

    try {
      const parsed: unknown = JSON.parse(Buffer.concat(chunks).toString('utf8'))

      if (parsed === null || typeof parsed !== 'object') {
        return null
      }

      return parsed
    } catch {
      return null
    }
  }

  function output(decision: 'deny' | 'ask', reason: string): string {
    return JSON.stringify({ hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: reason } })
  }

  export function denyOutput(reason: string): string {
    return output('deny', reason)
  }

  export function askOutput(reason: string): string {
    return output('ask', reason)
  }

  export function contextOutput(event: 'PostToolUse' | 'SessionStart', context: string): string {
    return JSON.stringify({ hookSpecificOutput: { hookEventName: event, additionalContext: context } })
  }

  export function emit(value: string | null): void {
    if (value !== null) {
      process.stdout.write(`${value}\n`)
    }
  }
  ```

- [ ] **Passo 4: Teste de `io.ts`**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { askOutput, contextOutput, denyOutput } from '../../../src/hooks/lib/io.ts'

  test('denyOutput e askOutput trazem hookEventName PreToolUse e a razão', () => {
    assert.match(denyOutput('x'), /"permissionDecision":"deny"/)
    assert.match(askOutput('y'), /"permissionDecision":"ask"/)
  })

  test('contextOutput não decide permissão', () => {
    const parsed = JSON.parse(contextOutput('PostToolUse', 'z')) as { hookSpecificOutput: Record<string, unknown> }

    assert.equal(parsed.hookSpecificOutput.additionalContext, 'z')
    assert.equal('permissionDecision' in parsed.hookSpecificOutput, false)
  })
  ```

- [ ] **Passo 5: Não portar `hooks/lib/edit.ts` ainda**

  `applyToolInput` só serve para o `promotion-guard` simular a edição antes de
  ela acontecer, e esse hook espera a decisão aberta (Tarefa 17). Portado agora,
  seria código sem chamador. Vem junto com a tarefa que ligar o hook.

- [ ] **Passo 6: Escrever os testes de `generated-guard` que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { decideGeneratedGuard } from '../../src/hooks/generated-guard.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const env = (root: string) => ({ root, hostRoots: [root] })

  test('caminho declarado em generated[] é negado, mesmo se o arquivo ainda não existe', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\ngenerated:\n  - path: out.md\n    command: gen\n' }, root => {
      const decision = decideGeneratedGuard({ tool_input: { file_path: 'out.md' } }, env(root))

      assert.equal(decision.action, 'deny')
    })
  })

  test('arquivo com o marcador na primeira linha é negado', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'x.md': 'generated: do not edit\ncorpo\n' }, root => {
      const decision = decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root))

      assert.equal(decision.action, 'deny')
    })
  })

  test('arquivo comum é permitido', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'x.md': 'corpo comum\n' }, root => {
      assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root)).action, 'allow')
    })
  })

  test('sem .ownership.yml, falha aberta', () => {
    withTempRepo({}, root => {
      assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root)).action, 'allow')
    })
  })
  ```

- [ ] **Passo 7: Confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/hooks/generated-guard.test.ts
  ```

- [ ] **Passo 8: Escrever `hooks/generated-guard.ts`**

  ```typescript
  #!/usr/bin/env node
  import { readFileSync } from 'node:fs'
  import { join } from 'node:path'
  import { findGeneratedRule, resolveOwnership } from '../resolve/hierarchy.ts'
  import { toRepoPath } from './lib/paths.ts'
  import { denyOutput, emit, hookEnv, readPayload } from './lib/io.ts'
  import type { HookEnv, HookPayload } from './lib/io.ts'

  export type GeneratedGuardDecision = { action: 'allow' } | { action: 'deny'; reason: string }

  const ALLOW: GeneratedGuardDecision = { action: 'allow' }
  const MARKER = /generated:\s*do not edit/i
  const MARKER_WINDOW = 512

  export function decideGeneratedGuard(payload: HookPayload, env: HookEnv): GeneratedGuardDecision {
    const filePath = payload.tool_input?.file_path

    if (typeof filePath !== 'string') {
      return ALLOW
    }

    const repoPath = toRepoPath(filePath, env.hostRoots)

    if (repoPath === null) {
      return ALLOW
    }

    let config

    try {
      config = resolveOwnership(env.root, { onlyFor: [repoPath] })
    } catch {
      return ALLOW
    }
    if (config === null) {
      return ALLOW
    }

    const rule = findGeneratedRule(config, repoPath)

    if (rule) {
      return {
        action: 'deny',
        reason:
          `ownership/generated-guard bloqueou: \`${repoPath}\` é artefato gerado, declarado em \`generated[]\` (${rule.origin}). ` +
          `Mude a fonte anotada e rode \`${rule.command} > ${rule.path}\`. ` +
          '`ownership validate` (ownership/generated-drift) verifica a deriva.',
      }
    }

    let firstLine: string

    try {
      const window = readFileSync(join(env.root, repoPath), 'utf8').slice(0, MARKER_WINDOW)

      firstLine = window.split('\n')[0] ?? ''
    } catch {
      return ALLOW
    }
    if (!MARKER.test(firstLine)) {
      return ALLOW
    }

    return {
      action: 'deny',
      reason:
        `ownership/generated-guard bloqueou: \`${repoPath}\` abre com o marcador \`generated: do not edit\`. ` +
        'Mude a fonte e rode o gerador. Este arquivo não está em `generated[]` — declare-o lá, com o comando do gerador, ' +
        'para que `ownership/generated-drift` também o cubra.',
    }
  }

  async function main(): Promise<void> {
    const payload = await readPayload()

    if (!payload) {
      return
    }
    const decision = decideGeneratedGuard(payload, hookEnv())

    emit(decision.action === 'deny' ? denyOutput(decision.reason) : null)
  }

  if (process.argv[1]?.endsWith('generated-guard.ts')) {
    main().catch(() => process.exit(0))
  }
  ```

- [ ] **Passo 9: Rodar os testes e o type-check**

  ```bash
  cd packages/ownership && node --test "test/hooks/**/*.test.ts" && npm run typecheck
  ```

- [ ] **Passo 10: Commit**

  ```bash
  git add packages/ownership/src/hooks packages/ownership/test/hooks
  git commit -m "feat(RN-0012): infraestrutura de hook e ownership/generated-guard"
  ```

---

### Tarefa 17: Mecanismo de transição de estado — o `promotion-guard` espera a DA

Regra de origem: `RN-0005` e spec §1 ("o núcleo acha os itens, pareia antes e
depois pela chave e pergunta quando a transição exige gente").

**Esta tarefa para no meio, de propósito.** A spec fixa o mecanismo — achar
os itens, parear antes e depois pela chave, detectar a transição — e não fixa
**quais** transições exigem gente: o esquema v2 declara `states` e não
declara transições. Essa lacuna é a `<DA-promocao>` aberta na Tarefa 1.
Perguntar em toda transição seria inventar a regra, e com os dois plugins
instalados faria perguntar em cada mudança de estado que uma skill escreve.

Por isso esta tarefa entrega só `findTransitions`, puro e testado, que qualquer
resposta da DA vai usar. O hook `ownership/promotion-guard` — o arquivo
`src/hooks/promotion-guard.ts`, a entrada em `hooks.json` e a linha no
CHANGELOG — **não** é escrito neste plano. Quando uma pessoa resolver a DA, a
resolução diz o que o hook pergunta, e a ligação vira tarefa própria.

**Arquivos:**
- Create: `packages/ownership/src/lifecycle/transitions.ts`
- Test: `packages/ownership/test/lifecycle/transitions.test.ts`

**Interfaces:**
- Consome: `ResolvedOwnedRule` (Tarefa 7), `parseItemsTable`,
  `parseItemsSections` (Tarefa 5), `parseFrontmatter` (Tarefa 3).
- Produz: `interface Transition { key: string; from: string; to: string }`,
  `findTransitions(before: string, after: string, rule: ResolvedOwnedRule, repoPath: string): Transition[]`.

- [ ] **Passo 1: Escrever os testes que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { findTransitions } from '../../src/lifecycle/transitions.ts'
  import type { ResolvedOwnedRule } from '../../src/resolve/hierarchy.ts'

  function rule(format: ResolvedOwnedRule['format']): ResolvedOwnedRule {
    return {
      path: 'docs/x/',
      owner: '@a',
      skill: null,
      states: ['draft', 'accepted', 'open', 'resolved'],
      format,
      derivesFrom: null,
      pluginBlocks: {},
      origin: 'o',
    }
  }

  const PER_FILE = rule({ collection: 'per-file', key: null, keyMode: null, stateField: 'status' })
  const TABLE = rule({ collection: 'table', key: 'ID', keyMode: null, stateField: 'status' })

  test('per-file: mudança de status no frontmatter é transição, com a chave sendo o arquivo', () => {
    assert.deepEqual(findTransitions('---\nstatus: draft\n---\ncorpo\n', '---\nstatus: accepted\n---\ncorpo\n', PER_FILE, 'docs/x/a.md'), [
      { key: 'docs/x/a.md', from: 'draft', to: 'accepted' },
    ])
  })

  test('per-file: editar o corpo sem mudar o status não é transição', () => {
    assert.deepEqual(findTransitions('---\nstatus: draft\n---\ncorpo\n', '---\nstatus: draft\n---\noutro\n', PER_FILE, 'docs/x/a.md'), [])
  })

  test('per-file: state-field customizado é o campo lido', () => {
    const custom = rule({ collection: 'per-file', key: null, keyMode: null, stateField: 'situação' })

    assert.equal(findTransitions('---\nsituação: draft\n---\n', '---\nsituação: accepted\n---\n', custom, 'a.md').length, 1)
  })

  test('table: pareia pela chave e devolve cada item que mudou', () => {
    const before = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n| DA-02 | open |\n'
    const after = '| ID | Status |\n| --- | ------ |\n| DA-02 | resolved |\n| DA-01 | resolved |\n'

    assert.deepEqual(
      findTransitions(before, after, TABLE, 'docs/open.md').map(t => t.key),
      ['DA-02', 'DA-01'],
    )
  })

  test('item novo não é transição — não há antes com que parear', () => {
    const before = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n'
    const after = '| ID | Status |\n| --- | ------ |\n| DA-01 | open |\n| DA-02 | resolved |\n'

    assert.deepEqual(findTransitions(before, after, TABLE, 'docs/open.md'), [])
  })
  ```

- [ ] **Passo 2: Confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/lifecycle/transitions.test.ts
  ```

- [ ] **Passo 3: Escrever `lifecycle/transitions.ts`**

  ```typescript
  import { parseFrontmatter } from '../core/frontmatter.ts'
  import { parseItemsSections, parseItemsTable } from '../schema/item.ts'
  import type { ResolvedOwnedRule } from '../resolve/hierarchy.ts'

  export interface Transition {
    key: string
    from: string
    to: string
  }

  function frontmatterState(source: string, field: string): string | null {
    let frontmatter

    try {
      frontmatter = parseFrontmatter(source)
    } catch {
      return null
    }
    const value = frontmatter?.data[field]

    return typeof value === 'string' && value !== '' ? value : null
  }

  /**
   * Toda mudança de estado de um item que existe antes e depois, pareado pela
   * chave. Não decide se a mudança exige gente: isso não é deste módulo.
   */
  export function findTransitions(before: string, after: string, rule: ResolvedOwnedRule, repoPath: string): Transition[] {
    const { format } = rule

    if (format.collection === 'per-file') {
      const from = frontmatterState(before, format.stateField)
      const to = frontmatterState(after, format.stateField)

      return from !== null && to !== null && from !== to ? [{ key: repoPath, from, to }] : []
    }

    const parse = (source: string) =>
      format.collection === 'table'
        ? parseItemsTable(source, 1, { key: format.key!, stateField: format.stateField })
        : parseItemsSections(source, 1, { keyMode: format.keyMode!, stateField: format.stateField })

    const previous = new Map(parse(before).map(item => [item.key, item.state]))
    const transitions: Transition[] = []

    for (const item of parse(after)) {
      const from = previous.get(item.key)

      if (from !== undefined && from !== '' && item.state !== '' && from !== item.state) {
        transitions.push({ key: item.key, from, to: item.state })
      }
    }

    return transitions
  }
  ```

- [ ] **Passo 4: Rodar os testes e o type-check**

  ```bash
  cd packages/ownership && node --test test/lifecycle/transitions.test.ts && npm run typecheck
  ```

- [ ] **Passo 5: Commit**

  ```bash
  git add packages/ownership/src/lifecycle packages/ownership/test/lifecycle
  git commit -m "feat(RN-0005): mecanismo de transição de estado para o promotion-guard, sem ligar o hook"
  ```

- [ ] **Passo 6: PARE aqui no que toca ao hook**

  Não crie `src/hooks/promotion-guard.ts`. Confira o estado da `<DA-promocao>`
  em `docs/open-decisions.md`: se continua `open`, siga para a Tarefa 18. Se uma
  pessoa já a resolveu, a resolução define a regra, e ligar o hook é uma tarefa
  nova — escrita a partir da resolução, não deste plano.

---

### Tarefa 18: Hooks `ownership/watch-reminder` e `ownership/commit-guard`

Regra de origem: `RN-0008` e `RN-0009`; spec §6 ("lembrete de vigiado" e "guarda de commit" →
núcleo). Porta `hk4-watch-reminder.ts` e `hk5-commit-guard.ts`, usando o
`watchesFor`/`pendingDocs` unificado da Tarefa 9.

**Arquivos:**
- Create: `packages/ownership/src/hooks/watch-reminder.ts`
- Create: `packages/ownership/src/hooks/commit-guard.ts`
- Test: `packages/ownership/test/hooks/watch-reminder.test.ts`
- Test: `packages/ownership/test/hooks/commit-guard.test.ts`

**Interfaces:**
- Consome: `resolveOwnership` (Tarefa 7), `coversDoc`, `watchesFor`,
  `pendingDocs`, `WatchMatch` (Tarefa 9), `stagedPaths`, `GitRunner`
  (Tarefa 3), `contextOutput`, `askOutput`, `emit`, `hookEnv`, `readPayload`
  (Tarefa 16).
- Produz: `decideWatchReminder(payload, env): { action: 'silent' } | { action: 'remind'; context: string }`,
  `isGitCommit(command: string): boolean`,
  `decideCommitGuard(payload, env, run?): { action: 'allow' } | { action: 'ask'; reason: string }`.

- [ ] **Passo 1: Escrever os testes de `watch-reminder` que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { decideWatchReminder } from '../../src/hooks/watch-reminder.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const env = (root: string) => ({ root, hostRoots: [root] })
  const CONFIG = 'version: 2\nowned: []\nwatches:\n  - code: "src/checks/**"\n    doc: docs/requirements/rules.md\n    reason: x\n'

  test('editar caminho vigiado lembra do doc dono', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      const decision = decideWatchReminder({ tool_input: { file_path: 'src/checks/a.ts' } }, env(root))

      assert.equal(decision.action, 'remind')
    })
  })

  test('editar o próprio doc dono não lembra dele mesmo', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      const decision = decideWatchReminder({ tool_input: { file_path: 'docs/requirements/rules.md' } }, env(root))

      assert.equal(decision.action, 'silent')
    })
  })

  test('caminho não vigiado, silêncio', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      assert.equal(decideWatchReminder({ tool_input: { file_path: 'src/outro.ts' } }, env(root)).action, 'silent')
    })
  })

  test('sem arquivo de ownership, o hook se cala (falha aberta)', () => {
    withTempRepo({}, root => {
      assert.equal(decideWatchReminder({ tool_input: { file_path: 'src/checks/a.ts' } }, env(root)).action, 'silent')
    })
  })
  ```

- [ ] **Passo 2: Escrever `hooks/watch-reminder.ts`**

  ```typescript
  #!/usr/bin/env node
  import { resolveOwnership } from '../resolve/hierarchy.ts'
  import { coversDoc, watchesFor } from '../triggers/watches.ts'
  import type { WatchMatch } from '../triggers/watches.ts'
  import { toRepoPath } from './lib/paths.ts'
  import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts'
  import type { HookEnv, HookPayload } from './lib/io.ts'

  export type WatchReminderDecision = { action: 'silent' } | { action: 'remind'; context: string }

  const SILENT: WatchReminderDecision = { action: 'silent' }

  function describe(match: WatchMatch): string {
    const parts = [`- \`${match.doc}\``]

    if (match.owner !== null) {
      parts.push(`(dono: ${match.owner})`)
    }
    if (match.reason !== null) {
      parts.push(`— ${match.reason}`)
    }
    parts.push(match.skill !== null ? `Skill dona: ${match.skill}.` : 'Sem skill declarada — o dono está no CODEOWNERS.')

    return parts.join(' ')
  }

  export function decideWatchReminder(payload: HookPayload, env: HookEnv): WatchReminderDecision {
    const filePath = payload.tool_input?.file_path

    if (typeof filePath !== 'string') {
      return SILENT
    }

    const repoPath = toRepoPath(filePath, env.hostRoots)

    if (repoPath === null) {
      return SILENT
    }

    let config

    try {
      config = resolveOwnership(env.root, { onlyFor: [repoPath] })
    } catch {
      return SILENT
    }
    if (config === null) {
      return SILENT
    }

    const pending = watchesFor(config, [repoPath]).filter(match => !coversDoc(match.doc, [repoPath]))

    if (pending.length === 0) {
      return SILENT
    }

    return {
      action: 'remind',
      context:
        `ownership/watch-reminder: \`${repoPath}\` é caminho vigiado em \`watches\`. ` +
        'A atualização do doc dono cabe no mesmo PR; se não couber, ela não acontece.\n' +
        `Doc dono a atualizar:\n${pending.map(describe).join('\n')}\n` +
        'Isto é lembrete, não é bloqueio: se a mudança realmente não afeta o doc, siga em frente.',
    }
  }

  async function main(): Promise<void> {
    const payload = await readPayload()

    if (!payload) {
      return
    }
    const decision = decideWatchReminder(payload, hookEnv())

    emit(decision.action === 'remind' ? contextOutput('PostToolUse', decision.context) : null)
  }

  if (process.argv[1]?.endsWith('watch-reminder.ts')) {
    main().catch(() => process.exit(0))
  }
  ```

- [ ] **Passo 3: Rodar os testes de `watch-reminder`**

  ```bash
  cd packages/ownership && node --test test/hooks/watch-reminder.test.ts
  ```

- [ ] **Passo 4: Escrever os testes de `commit-guard` que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { decideCommitGuard, isGitCommit } from '../../src/hooks/commit-guard.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const env = (root: string) => ({ root, hostRoots: [root] })
  const CONFIG = 'version: 2\nowned: []\nwatches:\n  - code: "src/checks/**"\n    doc: docs/requirements/rules.md\n    reason: x\n'

  test('isGitCommit reconhece "git commit" no início e depois de separador', () => {
    assert.equal(isGitCommit('git commit -m "x"'), true)
    assert.equal(isGitCommit('npm test && git commit -m "x"'), true)
    assert.equal(isGitCommit('git status'), false)
  })

  test('não é Bash, allow', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      assert.equal(decideCommitGuard({ tool_name: 'Edit', tool_input: { command: 'git commit -m x' } }, env(root)).action, 'allow')
    })
  })

  test('staged toca vigiado sem o doc: pergunta', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => 'src/checks/a.ts\0')

      assert.equal(decision.action, 'ask')
    })
  })

  test('staged traz os dois: allow', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      const decision = decideCommitGuard(
        { tool_name: 'Bash', tool_input: { command: 'git commit -m x' } },
        env(root),
        () => 'src/checks/a.ts\0docs/requirements/rules.md\0',
      )

      assert.equal(decision.action, 'allow')
    })
  })

  test('git runner falha (sem git): falha aberta, allow', () => {
    withTempRepo({ '.ownership.yml': CONFIG }, root => {
      const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => {
        throw new Error('sem git')
      })

      assert.equal(decision.action, 'allow')
    })
  })

  test('sem arquivo de ownership, o hook se cala (falha aberta)', () => {
    withTempRepo({}, root => {
      const decision = decideCommitGuard({ tool_name: 'Bash', tool_input: { command: 'git commit -m x' } }, env(root), () => 'src/checks/a.ts\0')

      assert.equal(decision.action, 'allow')
    })
  })
  ```

- [ ] **Passo 5: Escrever `hooks/commit-guard.ts`**

  ```typescript
  #!/usr/bin/env node
  import { resolveOwnership } from '../resolve/hierarchy.ts'
  import { pendingDocs } from '../triggers/watches.ts'
  import type { WatchMatch } from '../triggers/watches.ts'
  import { stagedPaths } from '../core/exec.ts'
  import type { GitRunner } from '../core/exec.ts'
  import { askOutput, emit, hookEnv, readPayload } from './lib/io.ts'
  import type { HookEnv, HookPayload } from './lib/io.ts'

  export type CommitGuardDecision = { action: 'allow' } | { action: 'ask'; reason: string }

  const ALLOW: CommitGuardDecision = { action: 'allow' }
  const GIT_COMMIT = /(?:^|[;&|]\s*)git\b[^;&|]*\bcommit\b/

  export function isGitCommit(command: string): boolean {
    return GIT_COMMIT.test(command.trim())
  }

  function describe(match: WatchMatch): string {
    const parts = [`- \`${match.doc}\``]

    if (match.owner !== null) {
      parts.push(`(dono: ${match.owner})`)
    }
    parts.push(`— exigido por: ${match.matched.join(', ')}`)
    if (match.reason !== null) {
      parts.push(`Motivo: ${match.reason}`)
    }
    if (match.skill !== null) {
      parts.push(`Skill dona: ${match.skill}.`)
    }

    return parts.join(' ')
  }

  export function decideCommitGuard(payload: HookPayload, env: HookEnv, run?: GitRunner): CommitGuardDecision {
    if (payload.tool_name !== undefined && payload.tool_name !== 'Bash') {
      return ALLOW
    }

    const command = payload.tool_input?.command

    if (typeof command !== 'string' || !isGitCommit(command)) {
      return ALLOW
    }

    // Os caminhos staged vêm antes da configuração: são eles que decidem o que
    // a poda deixa de ler.
    const staged = stagedPaths(env.root, run)

    if (staged.length === 0) {
      return ALLOW
    }

    let config

    try {
      config = resolveOwnership(env.root, { onlyFor: staged })
    } catch {
      return ALLOW
    }
    if (config === null) {
      return ALLOW
    }

    const pending = pendingDocs(config, staged)

    if (pending.length === 0) {
      return ALLOW
    }

    return {
      action: 'ask',
      reason:
        'ownership/commit-guard: este commit leva código de caminho vigiado sem o doc dono. ' +
        'Se a atualização não cabe neste PR, ela não acontece.\n' +
        `Pendente:\n${pending.map(describe).join('\n')}\n` +
        'Atualize o doc agora e refaça o `git add` — ou, se a mudança realmente não afeta o doc, diga que é uma decisão humana e siga.',
    }
  }

  async function main(): Promise<void> {
    const payload = await readPayload()

    if (!payload) {
      return
    }
    const decision = decideCommitGuard(payload, hookEnv())

    emit(decision.action === 'ask' ? askOutput(decision.reason) : null)
  }

  if (process.argv[1]?.endsWith('commit-guard.ts')) {
    main().catch(() => process.exit(0))
  }
  ```

- [ ] **Passo 6: Rodar os testes e o type-check**

  ```bash
  cd packages/ownership && node --test test/hooks/watch-reminder.test.ts test/hooks/commit-guard.test.ts && npm run typecheck
  ```

- [ ] **Passo 7: Commit**

  ```bash
  git add packages/ownership/src/hooks/watch-reminder.ts packages/ownership/src/hooks/commit-guard.ts packages/ownership/test/hooks/watch-reminder.test.ts packages/ownership/test/hooks/commit-guard.test.ts
  git commit -m "feat(RN-0009): hooks ownership/watch-reminder e ownership/commit-guard"
  ```

---

### Tarefa 19: Hook `ownership/derivation-reminder`

Regra de origem: `<RN-derivacao>`; spec §4 e §6 ("novo — lembrete de derivação" → núcleo). É o
único hook novo, sem equivalente em `@esliph/living-docs`: editar a fonte de
uma derivação lembra só dos documentos que **de fato** apontam para o arquivo
editado — não todo o diretório (`derivedFilesOf`, Tarefa 10, já faz a
precisão).

**Arquivos:**
- Create: `packages/ownership/src/hooks/derivation-reminder.ts`
- Test: `packages/ownership/test/hooks/derivation-reminder.test.ts`

**Interfaces:**
- Consome: `resolveOwnership` (Tarefa 7), `derivedFilesOf` (Tarefa 10),
  `toRepoPath`, `contextOutput`, `emit`, `hookEnv`, `readPayload` (Tarefa 16).
- Produz: `decideDerivationReminder(payload, env): { action: 'silent' } | { action: 'remind'; context: string }`.

- [ ] **Passo 1: Escrever os testes que falham primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { decideDerivationReminder } from '../../src/hooks/derivation-reminder.ts'
  import { forgetTree } from '../../src/core/files.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  const env = (root: string) => ({ root, hostRoots: [root] })
  const CONFIG = 'version: 2\nowned:\n  - path: docs/plans/\n    owner: "@a"\n    derives-from:\n      source: docs/specs/\n      field: spec\n'

  test('editar a fonte lembra só o documento que aponta exatamente para ela', () => {
    withTempRepo(
      {
        '.ownership.yml': CONFIG,
        'docs/specs/s1.md': '# s1\n',
        'docs/specs/s2.md': '# s2\n',
        'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n',
        'docs/plans/b.md': '---\nspec: docs/specs/s2.md\n---\n',
      },
      root => {
        forgetTree(root)
        const decision = decideDerivationReminder({ tool_input: { file_path: 'docs/specs/s1.md' } }, env(root))

        assert.equal(decision.action, 'remind')
        if (decision.action === 'remind') {
          assert.match(decision.context, /docs\/plans\/a\.md/)
          assert.doesNotMatch(decision.context, /docs\/plans\/b\.md/)
        }
      },
    )
  })

  test('editar um documento que não é fonte de derivação nenhuma: silêncio', () => {
    withTempRepo({ '.ownership.yml': CONFIG, 'docs/plans/a.md': '---\nspec: docs/specs/s1.md\n---\n' }, root => {
      forgetTree(root)
      assert.equal(decideDerivationReminder({ tool_input: { file_path: 'docs/plans/a.md' } }, env(root)).action, 'silent')
    })
  })

  test('sem nenhum documento apontando para a fonte editada: silêncio', () => {
    withTempRepo({ '.ownership.yml': CONFIG, 'docs/specs/s1.md': '# s1\n' }, root => {
      forgetTree(root)
      assert.equal(decideDerivationReminder({ tool_input: { file_path: 'docs/specs/s1.md' } }, env(root)).action, 'silent')
    })
  })

  test('sem arquivo de ownership, o hook se cala (falha aberta)', () => {
    withTempRepo({ 'docs/specs/s1.md': '# s1\n' }, root => {
      forgetTree(root)
      assert.equal(decideDerivationReminder({ tool_input: { file_path: 'docs/specs/s1.md' } }, env(root)).action, 'silent')
    })
  })
  ```

- [ ] **Passo 2: Confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/hooks/derivation-reminder.test.ts
  ```

- [ ] **Passo 3: Escrever `hooks/derivation-reminder.ts`**

  ```typescript
  #!/usr/bin/env node
  import { resolveOwnership } from '../resolve/hierarchy.ts'
  import { derivedFilesOf } from '../triggers/derives.ts'
  import { toRepoPath } from './lib/paths.ts'
  import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts'
  import type { HookEnv, HookPayload } from './lib/io.ts'

  export type DerivationReminderDecision = { action: 'silent' } | { action: 'remind'; context: string }

  const SILENT: DerivationReminderDecision = { action: 'silent' }

  export function decideDerivationReminder(payload: HookPayload, env: HookEnv): DerivationReminderDecision {
    const filePath = payload.tool_input?.file_path

    if (typeof filePath !== 'string') {
      return SILENT
    }

    const repoPath = toRepoPath(filePath, env.hostRoots)

    if (repoPath === null) {
      return SILENT
    }

    let config

    try {
      config = resolveOwnership(env.root, { onlyFor: [repoPath] })
    } catch {
      return SILENT
    }
    if (config === null) {
      return SILENT
    }

    const reminders: string[] = []

    for (const rule of config.owned) {
      if (rule.derivesFrom === null || !repoPath.startsWith(rule.derivesFrom.source)) {
        continue
      }

      for (const derived of derivedFilesOf(env.root, rule, repoPath)) {
        reminders.push(`- \`${derived}\` (declara \`${rule.derivesFrom.field}: ${repoPath}\`, sob \`${rule.path}\`${rule.skill === null ? '' : `, skill dona: ${rule.skill}`})`)
      }
    }

    if (reminders.length === 0) {
      return SILENT
    }

    return {
      action: 'remind',
      context:
        `ownership/derivation-reminder: \`${repoPath}\` é fonte de derivação — os documentos abaixo declaram derivar dela:\n` +
        `${reminders.join('\n')}\n` +
        'Confira se eles ainda descrevem o que a fonte diz agora. Isto é lembrete, não é bloqueio.',
    }
  }

  async function main(): Promise<void> {
    const payload = await readPayload()

    if (!payload) {
      return
    }
    const decision = decideDerivationReminder(payload, hookEnv())

    emit(decision.action === 'remind' ? contextOutput('PostToolUse', decision.context) : null)
  }

  if (process.argv[1]?.endsWith('derivation-reminder.ts')) {
    main().catch(() => process.exit(0))
  }
  ```

- [ ] **Passo 4: Rodar os testes e o type-check**

  ```bash
  cd packages/ownership && node --test test/hooks/derivation-reminder.test.ts && npm run typecheck
  ```

- [ ] **Passo 5: Commit**

  ```bash
  git add packages/ownership/src/hooks/derivation-reminder.ts packages/ownership/test/hooks/derivation-reminder.test.ts
  git commit -m "feat(<RN-derivacao>): hook ownership/derivation-reminder"
  ```

---

### Tarefa 20: CLI, API pública e wiring do plugin

Regra de origem: `<RF-validate>`; spec §7 ("`ownership validate` cobre dono, ciclo de vida,
gatilho e gerado"). Fecha o pacote: `ownership validate [--base <ref>]`,
`ownership explain <caminho>`, a API pública em `src/index.ts`, e os arquivos
que fazem dele um plugin instalável (`plugin.json`, `hooks.json`,
`run-hook.sh`).

**Arquivos:**
- Create: `packages/ownership/src/cli/report.ts`
- Create: `packages/ownership/src/cli/validate.ts`
- Create: `packages/ownership/src/cli/explain.ts`
- Create: `packages/ownership/src/cli/index.ts`
- Modify: `packages/ownership/src/index.ts` (API pública — substitui o `export {}` da Tarefa 2)
- Create: `packages/ownership/.claude-plugin/plugin.json`
- Create: `packages/ownership/hooks/hooks.json`
- Create: `packages/ownership/hooks/run-hook.sh`
- Test: `packages/ownership/test/cli/validate.test.ts`
- Test: `packages/ownership/test/cli/explain.test.ts`
- Test: `packages/ownership/test/cli/report.test.ts`

**Interfaces:**
- Consome: `resolveOwnership` (Tarefa 7), `explainPath` (Tarefa 8),
  `coreChecks`/`diffChecks` (Tarefa 15), `changedPaths`/`commitMessages`
  (Tarefa 3), `forgetTree` (Tarefa 3), `OwnershipError` (Tarefa 4).
- Produz: `formatFindings(findings): string`,
  `interface ValidateResult { findings: Finding[]; errors: number; warnings: number; exitCode: number; installed: boolean }`,
  `runValidate(root, base?, run?): ValidateResult`, `runExplain(root, target): string`.

- [ ] **Passo 1: Escrever o teste de `report.ts` que falha primeiro**

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { formatFindings } from '../../src/cli/report.ts'

  test('sem achados, mensagem única', () => {
    assert.equal(formatFindings([]), 'ownership: nenhuma violação encontrada.')
  })

  test('com achados, lista local, regra, severidade, mensagem e correção, com o total no fim', () => {
    const text = formatFindings([{ ruleId: 'ownership/x', file: 'a.md', line: 3, severity: 'error', message: 'm', fix: 'f' }])

    assert.match(text, /a\.md:3/)
    assert.match(text, /ownership\/x/)
    assert.match(text, /1 erro/)
  })
  ```

- [ ] **Passo 2: Escrever `cli/report.ts`**

  ```typescript
  import type { Finding } from '../checks/types.ts'

  function plural(count: number, singular: string, pluralForm: string): string {
    return `${count} ${count === 1 ? singular : pluralForm}`
  }

  export function formatFindings(findings: readonly Finding[]): string {
    if (findings.length === 0) {
      return 'ownership: nenhuma violação encontrada.'
    }

    const lines: string[] = []

    for (const finding of findings) {
      const location = finding.line > 0 ? `${finding.file}:${finding.line}` : finding.file

      lines.push(`${location}  ${finding.ruleId}  ${finding.severity}  ${finding.message}`)
      lines.push(`  → ${finding.fix}`)
    }

    const errors = findings.filter(finding => finding.severity === 'error').length
    const warnings = findings.length - errors

    lines.push('')
    lines.push(`ownership: ${plural(errors, 'erro', 'erros')}, ${plural(warnings, 'aviso', 'avisos')}.`)

    return lines.join('\n')
  }
  ```

- [ ] **Passo 3: Escrever os testes de `validate.ts` e `explain.ts` que falham primeiro**

  ```typescript
  // test/cli/validate.test.ts
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { runValidate } from '../../src/cli/validate.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('sem arquivo de ownership, installed: false e exitCode 0', () => {
    withTempRepo({}, root => {
      const result = runValidate(root)

      assert.equal(result.installed, false)
      assert.equal(result.exitCode, 0)
    })
  })

  test('com achado de erro, exitCode 1', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned:\n  - path: docs/x.md\n    owner: "@a"\n' }, root => {
      const result = runValidate(root)

      assert.equal(result.exitCode, 1) // ownership/owner-coverage: CODEOWNERS ausente e caminho inexistente
      assert.ok(result.errors > 0)
    })
  })

  test('sem --base, os checks de diff não rodam', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\nwatches:\n  - code: "src/**"\n    doc: docs/x.md\n' }, root => {
      const result = runValidate(root)

      assert.ok(!result.findings.some(f => f.ruleId === 'ownership/watch-satisfied'))
    })
  })
  ```

  ```typescript
  // test/cli/explain.test.ts
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { runExplain } from '../../src/cli/explain.ts'
  import { withTempRepo } from '../helpers/tmp.ts'

  test('sem arquivo de ownership, diz isso', () => {
    withTempRepo({}, root => {
      assert.match(runExplain(root, 'x.md'), /nenhum arquivo de ownership/)
    })
  })

  test('com arquivo, delega para explainPath', () => {
    withTempRepo({ '.ownership.yml': 'version: 2\nowned:\n  - path: docs/x.md\n    owner: "@a"\n' }, root => {
      assert.match(runExplain(root, 'docs/x.md'), /@a/)
    })
  })
  ```

- [ ] **Passo 4: Confirmar que falham**

  ```bash
  cd packages/ownership && node --test test/cli/report.test.ts test/cli/validate.test.ts test/cli/explain.test.ts
  ```

- [ ] **Passo 5: Escrever `cli/validate.ts`**

  ```typescript
  import { changedPaths, commitMessages } from '../core/exec.ts'
  import type { GitRunner } from '../core/exec.ts'
  import { forgetTree } from '../core/files.ts'
  import { resolveOwnership } from '../resolve/hierarchy.ts'
  import { coreChecks, diffChecks } from '../checks/registry.ts'
  import type { Finding } from '../checks/types.ts'

  export interface ValidateResult {
    findings: Finding[]
    errors: number
    warnings: number
    exitCode: number
    /** `false` quando não há arquivo de ownership — repositório sem o toolkit. */
    installed: boolean
  }

  function todayIso(): string {
    return new Date().toISOString().slice(0, 10)
  }

  export function runValidate(root: string, base: string | null = null, run?: GitRunner): ValidateResult {
    forgetTree(root)
    const config = resolveOwnership(root)

    if (config === null) {
      return { findings: [], errors: 0, warnings: 0, exitCode: 0, installed: false }
    }

    const context = { root, config, today: todayIso() }
    const checks = [...coreChecks()]

    if (base !== null) {
      checks.push(...diffChecks({ base, changed: changedPaths(root, base, run), messages: commitMessages(root, base, run) }))
    }

    const findings = checks.flatMap(check => check.run(context))
    const errors = findings.filter(finding => finding.severity === 'error').length

    return { findings, errors, warnings: findings.length - errors, exitCode: errors > 0 ? 1 : 0, installed: true }
  }
  ```

- [ ] **Passo 6: Escrever `cli/explain.ts`**

  ```typescript
  import { resolveOwnership } from '../resolve/hierarchy.ts'
  import { explainPath } from '../resolve/explain.ts'

  export function runExplain(root: string, target: string): string {
    const config = resolveOwnership(root)

    if (config === null) {
      return 'ownership: nenhum arquivo de ownership encontrado neste repositório.'
    }

    return explainPath(config, target)
  }
  ```

- [ ] **Passo 7: Rodar os testes**

  ```bash
  cd packages/ownership && node --test test/cli/report.test.ts test/cli/validate.test.ts test/cli/explain.test.ts
  ```

- [ ] **Passo 8: Escrever `cli/index.ts`**

  ```typescript
  #!/usr/bin/env node
  import { resolve } from 'node:path'
  import { runValidate } from './validate.ts'
  import { runExplain } from './explain.ts'
  import { formatFindings } from './report.ts'
  import { OwnershipError } from '../schema/types.ts'

  const USAGE = `ownership <comando>

    validate [--base <ref>]   Roda os checks de dono, ciclo de vida, gatilho e gerado
    explain <caminho>         Mostra a regra resolvida e de onde veio cada propriedade

  Opções de validate:
    --base <ref>   Base do diff — liga os checks que dependem do diff da branch
  `

  function repoRoot(): string {
    return resolve(process.env.OWNERSHIP_REPO_ROOT ?? process.cwd())
  }

  function main(argv: readonly string[]): number {
    const root = repoRoot()
    const command = argv[0]

    if (command === undefined || command === '--help' || command === '-h') {
      process.stdout.write(USAGE)

      return command === undefined ? 2 : 0
    }

    try {
      if (command === 'validate') {
        const baseIndex = argv.indexOf('--base')
        const base = baseIndex === -1 ? null : (argv[baseIndex + 1] ?? '')

        if (baseIndex !== -1 && base === '') {
          process.stderr.write('ownership: `--base` precisa de uma ref.\n')

          return 2
        }

        const result = runValidate(root, base)

        if (!result.installed) {
          process.stdout.write('ownership: nenhum arquivo de ownership encontrado — nada a validar.\n')

          return 0
        }
        process.stdout.write(`${formatFindings(result.findings)}\n`)

        return result.exitCode
      }

      if (command === 'explain') {
        const target = argv[1]

        if (target === undefined) {
          process.stderr.write('ownership: `explain` precisa de um caminho.\n')

          return 2
        }
        process.stdout.write(`${runExplain(root, target)}\n`)

        return 0
      }
    } catch (err) {
      if (err instanceof OwnershipError) {
        process.stderr.write(`ownership: ${err.message}\n`)

        return 2
      }
      throw err
    }

    process.stderr.write(`ownership: comando desconhecido "${command}".\n\n${USAGE}`)

    return 2
  }

  process.exitCode = main(process.argv.slice(2))
  ```

- [ ] **Passo 9: Testar o CLI manualmente**

  ```bash
  cd packages/ownership && node src/cli/index.ts --help
  echo 'version: 2
  owned:
    - path: README.md
      owner: "@a"' > /tmp/o.yml
  mkdir -p /tmp/ownership-manual && cp /tmp/o.yml /tmp/ownership-manual/.ownership.yml && touch /tmp/ownership-manual/README.md
  OWNERSHIP_REPO_ROOT=/tmp/ownership-manual node src/cli/index.ts validate
  OWNERSHIP_REPO_ROOT=/tmp/ownership-manual node src/cli/index.ts explain README.md
  rm -rf /tmp/ownership-manual /tmp/o.yml
  ```

  Espera-se: `validate` reporta 2 erros — a falta de CODEOWNERS e o próprio
  `.ownership.yml` sem regra em `owned[]` (ele é arquivo governado como
  qualquer outro); `explain` mostra `owner: @a`.

- [ ] **Passo 10: Escrever a API pública em `src/index.ts`**

  ```typescript
  export { resolveOwnership, findOwnedRule, findGeneratedRule } from './resolve/hierarchy.ts'
  export type { ResolvedConfig, ResolvedOwnedRule, ResolvedGeneratedRule, ResolvedWatchRule, ResolveOptions } from './resolve/hierarchy.ts'
  export { explainPath } from './resolve/explain.ts'
  export { findTransitions } from './lifecycle/transitions.ts'
  export type { Transition } from './lifecycle/transitions.ts'
  export { coreChecks, diffChecks } from './checks/registry.ts'
  export type { DiffFacts } from './checks/registry.ts'
  export type { Check, CheckContext, Finding, Severity } from './checks/types.ts'
  export { OwnershipError } from './schema/types.ts'
  export type { Collection, DerivesFrom, FormatBlock, SectionKeyMode } from './schema/types.ts'
  ```

- [ ] **Passo 11: Criar `.claude-plugin/plugin.json`**

  ```json
  {
    "name": "ownership",
    "version": "0.1.0",
    "description": "Núcleo de ownership de artefatos: dono, ciclo de vida e gatilho código→doc e doc→doc."
  }
  ```

- [ ] **Passo 12: Criar `hooks/hooks.json`**

  ```json
  {
    "hooks": {
      "PreToolUse": [
        {
          "matcher": "Edit|Write",
          "hooks": [
            { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" generated-guard", "shell": "bash", "async": false }
          ]
        },
        {
          "matcher": "Bash",
          "hooks": [{ "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" commit-guard", "shell": "bash", "async": false }]
        }
      ],
      "PostToolUse": [
        {
          "matcher": "Edit|Write",
          "hooks": [
            { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" watch-reminder", "shell": "bash", "async": false },
            { "type": "command", "command": "\"${CLAUDE_PLUGIN_ROOT}/hooks/run-hook.sh\" derivation-reminder", "shell": "bash", "async": false }
          ]
        }
      ]
    }
  }
  ```

- [ ] **Passo 13: Criar `hooks/run-hook.sh`**

  ```bash
  #!/usr/bin/env bash
  # Wrapper dos hooks do núcleo de ownership: executa no node do host.
  # Falha aberta por contrato — node ausente, timeout ou erro de execução
  # resultam em saída vazia e exit 0.
  #
  # TOOLKIT_ROOT é a raiz DESTE plugin (um nível acima de hooks/, porque
  # hooks/ e src/ moram lado a lado em packages/ownership/). REPO_ROOT é o
  # repositório que este plugin julga, vindo de CLAUDE_PROJECT_DIR.

  HOOK="${1:-}"
  TOOLKIT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  REPO_ROOT="${CLAUDE_PROJECT_DIR:-$PWD}"

  [ -n "$HOOK" ] || exit 0

  INPUT="$(cat)"

  OUTPUT="$(printf '%s' "$INPUT" | OWNERSHIP_REPO_ROOT="$REPO_ROOT" \
    timeout 5 node "${TOOLKIT_ROOT}/src/hooks/${HOOK}.ts" 2>/dev/null)"

  if [ $? -eq 0 ] && [ -n "$OUTPUT" ]; then
    printf '%s\n' "$OUTPUT"
  fi

  exit 0
  ```

  Dar permissão de execução:

  ```bash
  chmod +x packages/ownership/hooks/run-hook.sh
  ```

- [ ] **Passo 14: Rodar a suíte inteira do pacote e o type-check**

  ```bash
  cd packages/ownership && node --test "test/**/*.test.ts" && npm run typecheck
  ```

- [ ] **Passo 15: Commit**

  ```bash
  git add packages/ownership/src/cli packages/ownership/src/index.ts packages/ownership/.claude-plugin packages/ownership/hooks packages/ownership/test/cli
  git commit -m "feat(<RF-validate>): CLI (validate, explain), API pública e wiring do plugin"
  ```

---

### Tarefa 21: Distribuição — build no prepack e prova de empacotamento

Regra de origem: `<RNF-build>`; spec §7 ("build só na publicação") e §9 ("empacotamento —
`npm pack`, instalar o tarball num diretório temporário, importar e afirmar
que funciona. Fecha a lacuna da condição `development`."). Esta é a prova que
fecha a lacuna que a spec nomeia: sem ela, `exports.development` e `files:
["dist"]` são afirmação, não fato observado.

**Arquivos:**
- Modify: `packages/ownership/.gitignore` (acrescenta `*.tgz`)
- Test: `packages/ownership/test/distribution/packaging.test.ts`
- Test: `packages/ownership/test/distribution/dev-resolution.test.ts`
- Test: `packages/ownership/test/distribution/lockfile.test.ts`
- Test: `packages/ownership/test/distribution/no-internal-trace.test.ts`

**Interfaces:**
- Consome: tudo que o pacote já expõe (Tarefas 2–20) — esta tarefa não
  acrescenta código de produção, só prova que o empacotado funciona.

- [ ] **Passo 1: Acrescentar `*.tgz` ao `.gitignore` do pacote**

  `packages/ownership/.gitignore`:

  ```
  dist/
  node_modules/
  *.tgz
  ```

- [ ] **Passo 2: Escrever o teste de empacotamento**

  `packages/ownership/test/distribution/packaging.test.ts`:

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { spawnSync } from 'node:child_process'
  import { mkdtempSync, rmSync } from 'node:fs'
  import { tmpdir } from 'node:os'
  import { join } from 'node:path'

  const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')

  test('npm pack produz um tarball instalável cujo dist roda de verdade', { timeout: 120_000 }, () => {
    const packResult = spawnSync('npm', ['pack', '--json'], { cwd: PACKAGE_ROOT, encoding: 'utf8', shell: true })

    assert.equal(packResult.status, 0, packResult.stderr)
    const [{ filename }] = JSON.parse(packResult.stdout) as { filename: string }[]
    const tarball = join(PACKAGE_ROOT, filename)
    const installDir = mkdtempSync(join(tmpdir(), 'ownership-pack-'))

    try {
      const install = spawnSync('npm', ['install', tarball, '--no-save'], { cwd: installDir, encoding: 'utf8', shell: true })

      assert.equal(install.status, 0, install.stderr)

      const run = spawnSync('node', ['node_modules/@esliph/ownership/dist/cli/index.js', '--help'], { cwd: installDir, encoding: 'utf8' })

      assert.equal(run.status, 0, run.stderr)
      assert.match(run.stdout, /ownership <comando>/)
    } finally {
      rmSync(installDir, { recursive: true, force: true })
      rmSync(tarball, { force: true })
    }
  })
  ```

- [ ] **Passo 3: Rodar o teste de empacotamento**

  ```bash
  cd packages/ownership && node --test test/distribution/packaging.test.ts
  ```

  Se falhar em "Cannot find module dist/cli/index.js", confira o `prepack` do
  `package.json` (Tarefa 2) e o `tsconfig.build.json` — `npm pack` roda o
  `prepack` sozinho, antes de empacotar.

  Se falhar porque o `bin` do `package.json` não bate com o caminho gerado,
  ajuste o `tsconfig.build.json` para preservar a estrutura de diretórios
  (`outDir: "dist"` já faz isso, mas confira que `dist/cli/index.js` existe de
  verdade depois do `prepack`: `cd packages/ownership && npm run prepack --if-present && ls dist/cli/`).

- [ ] **Passo 4: Escrever o teste de resolução em desenvolvimento**

  `packages/ownership/test/distribution/dev-resolution.test.ts`:

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { spawnSync } from 'node:child_process'
  import { join } from 'node:path'

  const REPO_ROOT = join(import.meta.dirname, '..', '..', '..', '..')

  test('com a condição development, @esliph/ownership resolve pelo código-fonte, sem dist', { timeout: 30_000 }, () => {
    const script = 'import("@esliph/ownership").then(m => { if (typeof m.resolveOwnership !== "function") throw new Error("não resolveu pelo source"); console.log("ok") })'
    const result = spawnSync('node', ['--input-type=module', '-e', script], {
      cwd: REPO_ROOT,
      encoding: 'utf8',
      env: { ...process.env, NODE_OPTIONS: '--conditions=development' },
    })

    assert.equal(result.status, 0, result.stderr)
    assert.match(result.stdout, /ok/)
  })
  ```

  Este teste depende do `workspaces` da raiz (Tarefa 2, Passo 8) já ter criado
  o symlink `node_modules/@esliph/ownership → packages/ownership`. Se o
  symlink não existir, rode `npm install` na raiz do repositório antes.

- [ ] **Passo 5: Rodar o teste de resolução em desenvolvimento**

  ```bash
  cd packages/ownership && node --test test/distribution/dev-resolution.test.ts
  ```

- [ ] **Passo 6: Escrever o teste do lockfile próprio**

  `packages/ownership/test/distribution/lockfile.test.ts`. Dentro do
  workspace, `npm install` no pacote escreve o lockfile da raiz, e o do pacote
  envelheceria sem aviso. O teste regera o lockfile fora do workspace e compara:

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { spawnSync } from 'node:child_process'
  import { copyFileSync, mkdtempSync, readFileSync, rmSync } from 'node:fs'
  import { tmpdir } from 'node:os'
  import { join } from 'node:path'

  const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')

  function packagesOf(lockfile: string): unknown {
    return (JSON.parse(readFileSync(lockfile, 'utf8')) as { packages: unknown }).packages
  }

  test('o package-lock.json do pacote está em dia com o package.json', { timeout: 120_000 }, () => {
    const isolated = mkdtempSync(join(tmpdir(), 'ownership-lock-'))

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

- [ ] **Passo 7: Escrever o teste de rastro interno**

  `packages/ownership/test/distribution/no-internal-trace.test.ts`. O
  `CLAUDE.md` diz que o que o toolkit entrega não aponta para dentro dele, e o
  teste de distribuição da raiz só varre o `src/` do `living-docs`. Este cobre o
  pacote novo: fora de comentário, nenhum ID de artefato deste repositório nem
  seção de spec:

  ```typescript
  import { test } from 'node:test'
  import assert from 'node:assert/strict'
  import { readFileSync, readdirSync } from 'node:fs'
  import { join, relative } from 'node:path'

  const PACKAGE_ROOT = join(import.meta.dirname, '..', '..')
  const TRACE = /\b(?:ADR|RNF|RN|RF|DA|TDR|REL)-\d{4}\b|\bspec §/
  const COMMENT = /^\s*(?:\/\/|\/\*|\*|#)/

  function shipped(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
      const path = join(dir, entry.name)

      return entry.isDirectory() ? shipped(path) : /\.(?:ts|sh|json)$/.test(entry.name) ? [path] : []
    })
  }

  test('código, hooks e manifesto do plugin não citam o rastro interno fora de comentário', () => {
    const found: string[] = []

    for (const file of [...shipped(join(PACKAGE_ROOT, 'src')), ...shipped(join(PACKAGE_ROOT, 'hooks'))]) {
      readFileSync(file, 'utf8')
        .split('\n')
        .forEach((line, index) => {
          if (!COMMENT.test(line) && TRACE.test(line)) {
            found.push(`${relative(PACKAGE_ROOT, file)}:${index + 1}: ${line.trim()}`)
          }
        })
    }

    assert.deepEqual(found, [])
  })
  ```

- [ ] **Passo 8: Rodar a suíte inteira do pacote e o type-check**

  ```bash
  cd packages/ownership && node --test "test/**/*.test.ts" && npm run typecheck
  ```

- [ ] **Passo 9: Confirmar que nenhum `dist/` ou `.tgz` foi commitado por engano**

  ```bash
  git status --short packages/ownership
  ```

  Esperado: só os quatro arquivos de teste e o `.gitignore` — `dist/` e `*.tgz`
  não aparecem.

- [ ] **Passo 10: Commit**

  ```bash
  git add packages/ownership/.gitignore packages/ownership/test/distribution
  git commit -m "test(<RNF-build>): prova de empacotamento, lockfile e resolução em desenvolvimento"
  ```

---

### Tarefa 22: Revisão final — e por que não há entrada de CHANGELOG

Regra de origem: `RN-0013` — mudança visível a quem consome viaja com a
entrada de `CHANGELOG.md`, **ou com a razão escrita no commit**.

Nada deste plano chega a quem consome: `@esliph/ownership` é `private`, não
vai ao npm, e o plugin fica fora do marketplace até a prova de instalação
remota (Tarefa 2, Passo 9). Uma entrada agora anunciaria um plugin que ninguém
consegue instalar — e `CHANGELOG.md` é `audience: external`. A entrada nasce na
tarefa que registrar o plugin no marketplace; aqui, a razão vai escrita no
commit que fecha o plano.

**Arquivos:**
- Nenhum arquivo novo; só verificação e o commit de fechamento, se houver algo
  a commitar.

**Interfaces:**
- Consome: nada — última tarefa do plano.

- [ ] **Passo 1: Confirmar que nada visível ao consumidor mudou**

  ```bash
  git diff --name-only master...HEAD -- .claude-plugin/ plugin/ src/cli/ templates/
  ```

  Esperado: saída vazia. Se aparecer algo, o plano saiu do escopo — pare e
  descubra por quê antes de seguir.

- [ ] **Passo 2: Rodar a suíte de `@esliph/living-docs` na raiz**

  ```bash
  npm test && npm run typecheck && node src/cli/index.ts validate
  ```

  Esperado: tudo passa — `docs/.ownership.yml` continua em `version: 1` e
  `@esliph/living-docs` não foi tocado por este plano.

- [ ] **Passo 3: Rodar a suíte inteira de `@esliph/ownership`**

  ```bash
  cd packages/ownership && node --test "test/**/*.test.ts" && npm run typecheck
  ```

- [ ] **Passo 4: Conferir o `git status` da árvore inteira**

  ```bash
  git status --short
  ```

  Nada além do que as 22 tarefas tocaram deveria aparecer — sem `dist/`, sem
  `.tgz`, sem lockfile de um `npm install` esquecido em diretório errado.

- [ ] **Passo 5: Registrar a razão da ausência de entrada**

  Se sobrou algo a commitar, o commit leva o rótulo. Se não sobrou, acrescente
  o rótulo ao corpo da descrição do PR — o check de CHANGELOG lê as mensagens
  de commit, então prefira um commit vazio a deixar a razão só no PR:

  ```bash
  git commit --allow-empty -m "chore(<ADR-distribuicao>): fecha o plano do núcleo de ownership" -m "Changelog: none — o pacote é privado e o plugin fica fora do marketplace até a prova de instalação remota; nada chega a quem consome."
  ```

---

## Depois deste plano

Por ordem:

1. **Ligar o `promotion-guard`**, quando uma pessoa resolver a
   `<DA-promocao>`. A resolução diz quais transições perguntam; a tarefa porta
   `applyToolInput`, escreve o hook sobre `findTransitions` (Tarefa 17) e o
   acrescenta a `hooks.json`.
2. **Migração do `@esliph/living-docs`** — spec própria (spec §12): renomeia
   os checks (`CI-n` → `living-docs/nome-descritivo`), ajusta o glossário
   (`Artefato`/`Documento` discriminados por `living-docs.id-prefix`, não pela
   lista), move `docs/.ownership.yml` para o esquema v2 e faz
   `@esliph/living-docs` depender de `@esliph/ownership` como biblioteca. É
   aqui que o núcleo ganha o consumidor real que a spec exige antes do segundo.
3. **Registrar o plugin no marketplace**, com a entrada de CHANGELOG, depois da
   prova de instalação remota.
4. **Plugin SDD** — spec própria, depois da migração.

## O que a spec pede e este plano não fecha, por decisão

Dizer isso aqui vale mais do que deixar a lacuna implícita.

- **Comando de migração v1→v2 (spec §10) e a prova contra as 23 entradas reais
  (spec §9).** A spec os coloca nesta spec, e a §12 põe "mover o arquivo" na
  spec de migração. Este plano lê a §12 como dona do assunto: a migração só tem
  consumidor quando o `living-docs` passar a usar o núcleo, e um comando sem
  consumidor envelhece sem ninguém exercitar. O que fica aqui é a outra metade
  da §10 — o núcleo recusa v1 em voz alta (Tarefa 4). A mensagem ainda não pode
  nomear o comando, porque ele não existe; quando existir, a mensagem muda com
  ele. **Se quem revisar ler a spec do outro jeito, esta é a decisão a
  reverter.**
- **`ownership/promotion-guard`.** Só o mecanismo é entregue; o hook espera a
  `<DA-promocao>` (Tarefa 17).
- **Instalação remota de verdade** ("instalar o marketplace de um repositório
  remoto e observar os hooks rodarem do cache"). Exige resolver como as
  dependências do plugin chegam ao cache — e é por isso que o plugin fica fora
  do marketplace até lá (Tarefa 2, Passo 9).
- **Regra única** ("as duas CLIs não reportam a mesma coisa duas vezes").
  Pressupõe as duas CLIs lendo o mesmo arquivo, o que só acontece depois da
  migração: hoje `docs/.ownership.yml` está em `version: 1`, e
  `ownership validate` recusa lê-lo.
