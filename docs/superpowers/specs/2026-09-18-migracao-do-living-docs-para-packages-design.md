# Migração do living-docs para packages — design

Move o `@esliph/living-docs` da raiz do repositório para `packages/living-docs/`,
ao lado de `packages/ownership/`, sem mudar o que ele faz. É a primeira das duas
fatias da migração que `docs/superpowers/specs/2026-09-17-nucleo-de-ownership-design.md`
§12 reserva a uma spec própria; a segunda, que adota o núcleo, vem depois desta.

**Nada aqui é decisão aceita.** As decisões que esta spec obriga a registrar
estão na seção 10, para abrir como `draft` e promover por ato humano.

## 1. Escopo e fronteira

A spec do núcleo descreve a migração do living-docs como um trabalho só: mover,
renomear checks, ajustar o glossário, migrar o arquivo de ownership para a v2 e
passar a depender de `@esliph/ownership`. Aqui ela se divide em duas fatias, por
uma razão: são dois tipos de risco. Mover é mecânico e a prova é "nada mudou além
de caminho"; adotar o núcleo muda esquema, nomes públicos e a divisão dos hooks, e
a prova é outra. Misturar as duas faria uma revisão não conseguir dizer se um
teste mudou de resultado por causa do caminho ou por causa da lógica.

**Esta spec: a fatia física.** O living-docs passa a morar em `packages/living-docs/`,
com o plugin e o pacote sendo o mesmo diretório, lockfile próprio e uma prova de
que o plugin funciona copiado para o cache do marketplace sem o resto do
repositório.

**A invariante que governa tudo:** o living-docs continua sendo o que é. Mesmos
IDs de check (`CI-n`) e de hook (`HK-n`), mesmos nomes de hook, mesmos subcomandos,
esquema `version: 1` do `.ownership.yml`, mesmas variáveis `LIVING_DOCS_*`, mesma
saída. Um teste que muda de **resultado**, e não só de caminho, é defeito da
migração, não consequência dela.

**Fora desta spec** está na seção 12.

## 2. Layout final

```
esliph/
  .claude-plugin/marketplace.json     # living-docs: source ./packages/living-docs
  package.json + package-lock.json    # raiz privada: workspaces e ferramental compartilhado
  eslint.config.mjs, .prettierrc, .prettierignore
  CLAUDE.md, CONTRIBUTING.md, README.md, CHANGELOG.md, CODEOWNERS
  docs/  bin/  Dockerfile  compose.yaml  .github/
  packages/
    ownership/                        # inalterado
    living-docs/
      .claude-plugin/plugin.json
      hooks/{hooks.json, run-hook.sh}
      commands/  skills/  agents/     # o que era plugin/*
      src/  test/  templates/
      package.json + package-lock.json + tsconfig.json
```

O diretório do plugin passa a ser o do pacote. É o que faz `src/`, `templates/` e o
lockfile caírem **dentro** do que o cache copia — hoje `plugin/hooks/run-hook.sh`
sobe dois níveis até uma raiz que o cache não traz, e os hooks falham abertos em
silêncio numa instalação remota (`docs/superpowers/research/2026-09-16-nucleo-de-ownership-de-artefatos.md`,
achados 2 a 4; inferido da documentação, e a prova da seção 9 o transforma em fato).

Cada peça vai por `git mv`, para preservar o histórico por arquivo: `src/`, `test/`
e `templates/` inteiros, e `plugin/{commands,skills,agents,hooks,.claude-plugin}`
para a raiz do pacote. O `plugin/` deixa de existir.

## 3. Raízes e caminhos

`RNF-0003` continua valendo, e a migração o exercita de verdade: até aqui, toolkit e
repositório validado eram o mesmo diretório neste projeto, e três coisas dependiam
dessa coincidência sem que ninguém a tivesse escrito.

**`toolkitRoot()` não muda.** Sobe dois níveis a partir de `src/core/`, e isso
continua sendo a raiz do pacote. Só o comentário que lista `plugin/` entre o que
mora ali deixa de citá-lo. `templatesDir()` segue correto.

**`run-hook.sh` sobe um nível, não dois** — o mesmo que `packages/ownership/hooks/run-hook.sh`
já faz, e o comentário do cabeçalho explica por quê. `REPO_ROOT` continua vindo de
`CLAUDE_PROJECT_DIR`.

**O único código que muda de verdade** é o `CI-10`: `loadSkillDescriptions` monta
`join(root, 'plugin', 'skills')` e passa a montar `join(root, 'skills')`, e a
mensagem que manda conferir `plugin/skills/` acompanha. São as duas únicas
ocorrências de `plugin/` em código de `src/`.

**Os testes que assumem a coincidência.** Quinze arquivos de teste chamam
`toolkitRoot()`, e vários deles o usam para ler o repositório real — `docs/`,
`CLAUDE.md`, `CHANGELOG.md`, o `.ownership.yml`, e o `runValidate` do `CI-10` contra
o checkout. Depois da mudança essa raiz é o pacote, e nada disso está lá. Os testes
passam a derivar a raiz do checkout separadamente, por um helper de teste
(`checkoutRoot()`, dois níveis acima de `toolkitRoot()`), e ficam com `toolkitRoot()`
só para o que é do toolkit (`src/`, `templates/`, `skills/`, `hooks/`). Não uso
`repoRoot()` para isso: ele lê `process.cwd()`, e `npm test --workspace` roda com o
diretório de trabalho no pacote.

## 4. A raiz do repositório

**`package.json` da raiz** deixa de ser `@esliph/living-docs`: vira `esliph`,
privado, `type: module`, `engines.node >=24`, com `workspaces: ["packages/*"]` e só o
ferramental compartilhado (eslint, prettier e seus plugins, `typescript` — que o
`typescript-eslint` exige como par). `picomatch`, `yaml`, `bin` e os `@types/*` descem
para o pacote.

**`package.json` do pacote** é `@esliph/living-docs`, `private: true`, com `bin`,
`dependencies` (`picomatch`, `yaml`) e `devDependencies` (`typescript`, `@types/node`,
`@types/picomatch`), no mesmo desenho do `packages/ownership`. Ele declara o que usa
por conta própria: o hoist dos workspaces faria uma dependência esquecida ali passar
despercebida no checkout e quebrar só no cache.

**Lockfiles.** O do pacote é gerado fora do workspace, como o do `ownership` — é o
que o Node exige para instalar dependência dentro do plugin copiado. O da raiz é
regenerado com os dois workspaces.

**Comandos.** `npm test` e `npm run typecheck` da raiz fazem fan-out para os dois
pacotes (`--workspaces --if-present`), de modo que os comandos que `CLAUDE.md`,
`CONTRIBUTING.md` e a Definition of Done dizem hoje continuam os mesmos. O CLI passa
a ser `node packages/living-docs/src/cli/index.ts …`, sempre a partir da raiz, que é
o repositório validado. O `tsconfig.json` da raiz sai; o do pacote é o mesmo do
`ownership`. `lint` e `format` continuam na raiz e cobrem os dois pacotes.

## 5. O `docs/.ownership.yml`, ainda v1

O arquivo fica onde está e segue em `version: 1`. Só os caminhos são reescritos, um
para um, para apontar para o pacote:

- `watches[].code`: `src/checks/**` vira `packages/living-docs/src/checks/**`, e o
  mesmo para `src/hooks/**`, `src/cli/**`, `src/core/**`, `src/checks/catalog.ts`,
  `src/config/ownership.ts`, `plugin/skills/**` (→ `packages/living-docs/skills/**`)
  e `templates/**` (→ `packages/living-docs/templates/**`). Os de `.github/workflows/**`
  e `bin/**` não mudam: moram na raiz.
- `generated[].command`: `node packages/living-docs/src/tools/gen-checks.ts`. O
  `path` do gerado, `docs/contracts/checks.gen.md`, não muda.
- `cited-by` das famílias `RF`, `RNF` e `RN`: `packages/living-docs/test/**` e
  `packages/living-docs/src/**`, **e não** `packages/*/test/**`. O curinga passaria a
  contar os testes do `ownership` e mudaria o resultado do `CI-3`; estender a
  cobertura é assunto da spec seguinte.
- O que hoje é `plugin/**` visível ao consumidor deixa de poder ser um curinga só:
  o pacote inteiro agora inclui `src/` e `test/`, que não são superfície pública.
  Vira a lista explícita `packages/living-docs/{.claude-plugin,hooks,commands,skills,agents}/**`
  — e `packages/living-docs/templates/**`, que continua visível pelo que o `init`
  escreve em quem instala.
  `consumer-visible-paths` recebe a mesma lista, e o teste que impede as duas cópias
  de divergirem continua valendo.

`docs/superpowers/` e os demais `documents:` não mudam. `CODEOWNERS` não precisa
mudar: espelha `owner` de caminhos de `docs/` e da raiz, e nenhum deles se move.

## 6. CI, Docker e o wrapper

**`living-docs.yml`.** Os passos separados de teste e typecheck do `ownership` somem,
porque o `npm test` e o `npm run typecheck` da raiz já os cobrem. `validate`, `drift`
e `changelog` só trocam o caminho do CLI.

**Caminho conteinerizado** (`RNF-0006`, opcional):

- `compose.yaml`: `LIVING_DOCS_TOOLKIT_ROOT` aponta para
  `/opt/living-docs/packages/living-docs`. O volume continua montando a raiz em
  `/opt/living-docs`.
- `bin/living-docs` chama o CLI pelo caminho novo.
- `bin/dev` não muda. O `npm ci` continua na raiz, e o hoist dos workspaces mantém o
  `node_modules/yaml` que o bootstrap dele procura.
- `wrapper-docker.yml`: o filtro `paths` ganha os `package.json` e lockfiles dos
  pacotes. O movimento toca `bin/` e `compose.yaml`, então o workflow roda neste PR
  e exercita o caminho conteinerizado de verdade.

## 7. Documentos vivos, marketplace e CHANGELOG

`CLAUDE.md`, `CONTRIBUTING.md` e `README.md` trocam os caminhos que citam. Os ADRs e
as specs que citam `plugin/hooks/run-hook.sh` ou `src/cli/index.ts` ficam como
estão: são registro do que era verdade quando foram escritos, e o `CI-8` só julga os
links markdown, não o texto entre crases. O ADR novo da seção 10 documenta a
mudança.

`marketplace.json` troca `source: ./plugin` por `./packages/living-docs`, sem mexer
na versão. O `ownership` **continua fora do marketplace** até a prova de instalação
remota.

O `CHANGELOG.md` ganha a entrada. O `init` não grava caminho de CLI — `--invoke` é
parâmetro de quem instala —, então nenhum arquivo já semeado quebra, mas quem clona o
toolkit e o invoca pelo caminho antigo passa a precisar do novo. É contrato público
(`docs/contracts/versioning-policy.md`).

## 8. Execução

Um `git mv` estrutural primeiro, os reparos depois, cada commit verde em
`npm test`, `typecheck`, `validate` e `drift`. Nada de copiar para o pacote novo e
apagar o antigo no fim: perderia o histórico e deixaria dois living-docs vivos.

1. **Movimento e o mínimo para ficar verde.** `git mv`, os `package.json` e o
   `tsconfig.json`, o `run-hook.sh`, o `CI-10`, o helper `checkoutRoot()` e os testes
   que dependem dele, e os caminhos do `docs/.ownership.yml` — os testes validam o
   repositório real, então o arquivo precisa acompanhar. É grande, e é mecânico: a
   revisão lê "o que mudou de caminho".
2. **Raiz, CI, Docker e wrapper**, seção 6.
3. **Documentos vivos, marketplace e CHANGELOG**, seção 7.
4. **A prova de cache e o teste de lockfile**, seção 9.
5. **O ADR do nome do projeto**, `draft`.

**O rótulo de exceção.** O commit 1 leva `Docs: none — <razão>` (`ADR-0010`). Sem ele
o `CI-7` enxergaria os arquivos movidos como caminho vigiado alterado sem o doc dono,
e mover arquivo não muda o que o código faz. O custo é conhecido: o rótulo libera a
metade do diff do `CI-7` para o PR inteiro, não só para aquele commit. Aceito porque
os demais commits desta migração não introduzem regra nova, e porque a alternativa —
editar `rules.md` sem nada a dizer, só para satisfazer o check — é o atalho que o
rótulo existe para tornar explícito.

## 9. Prova

**O critério de pronto é que nada mudou além de caminho:**

- `npm test` passa, com o mesmo número de testes do living-docs que passam antes da
  mudança. A contagem de partida se grava no plano, antes do primeiro `git mv`.
- `validate` reporta o mesmo que reporta hoje: nenhuma violação, um artefato gerado,
  sete caminhos visíveis ao consumidor, quatorze vínculos código→doc.
- `drift` verde, com `docs/contracts/checks.gen.md` idêntico byte a byte.
- `typecheck` e `lint:check` verdes nos dois pacotes.
- O `wrapper-docker.yml` verde no PR.

**Provas novas.** Hook falha aberta e em silêncio, e é o que faz uma prova ingênua
passar no vazio: "não deu erro" é exatamente o que um hook quebrado também produz.

1. **Simulação de cache (obrigatória, roda no CI).** O teste copia só os arquivos
   versionados de `packages/living-docs/` para um diretório temporário — sem o resto
   do repositório, como o cache faz —, roda `npm ci` só com o lockfile do pacote e
   executa `hooks/run-hook.sh` de lá, com um repositório de fixture em
   `CLAUDE_PROJECT_DIR`. **Afirma saída não vazia** de um hook que produz saída (o
   lembrete de vigiado, por exemplo); saída vazia é falha, nunca sucesso. Afirma
   também que o wrapper entra como executável no índice do git (`100755`), que é o
   modo que chega a quem instala.
2. **Lockfile em dia**, espelho do teste que o `ownership` já tem.
3. **Instalação remota real**: instalar o marketplace de um repositório remoto e
   observar um hook rodar do cache. É passo manual, com a evidência — comando, versão
   e saída do hook — registrada no PR. Não é gate: exige push e não roda em CI. É o
   que transforma o achado inferido em fato, e o living-docs é o primeiro plugin que
   consegue passá-lo sozinho, porque ainda não depende de outro.

O que não se prova aqui, de propósito: composição de dois plugins, o `ownership`
instalado do cache, e as duas CLIs lendo o mesmo arquivo. Nada disso existe antes da
spec seguinte.

## 10. Decisões a registrar

Como `draft`, para promoção humana. O layout já está coberto por `ADR-0025`, e o
`RNF-0002` não muda: fala do Node do host e do checkout, e isso continua valendo.

| Decisão a abrir | Sobre                                                                  | Efeito                                                                                                                                                        |
| --------------- | ---------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| nome do projeto | a raiz vira `esliph`, privada; o pacote continua `@esliph/living-docs` | supersede a decisão aceita sobre o nome, sem editá-la. É a decisão nova que `ADR-0025` já antecipa quando diz que o repositório passa a ter mais de um pacote |

## 11. Consequências aceitas

- **O primeiro commit é grande.** Mover `src/`, `test/` e `templates/` e reparar o
  que os testes exigem não cabe em pedaços verdes menores; a revisão é por caminho,
  não por lógica, e o `git mv` preserva o que se quer ler.
- **O rótulo `Docs: none` desliga uma metade do `CI-7` para o PR inteiro**, como a
  seção 8 explica.
- **O `ownership` fica sem `watches` e sem cobertura de citação no `.ownership.yml`
  v1.** Já é assim hoje; a v2 da spec seguinte é quem o resolve, com uma lista só
  governando os dois pacotes.
- **Os ADRs congelados ficam com caminhos que não existem mais.** É registro
  histórico, e reescrevê-los falsearia o que estava decidido quando foram escritos.

## 12. Fora desta spec

Tudo isso é a spec seguinte, sobre um living-docs que já mora em `packages/`:

- **Adotar o núcleo**: esquema v2, o comando de migração v1→v2, o `owned` único, os
  blocos por plugin e a remoção da lista duplicada de caminhos visíveis.
- **Renomear os checks e hooks** de `CI-n`/`HK-n` para `living-docs/nome-descritivo`,
  e dividi-los com o núcleo: quais regras rodam em qual plugin, uma vez só.
- **A dependência** `@esliph/living-docs` → `@esliph/ownership`, no `package.json` e
  em `dependencies` do `plugin.json`, e a prova de instalação com as duas peças.
- **Estender a cobertura de citação** aos testes do `ownership`.
- **Ajustar o glossário** (`Artefato` e `Documento` discriminados por
  `living-docs.id-prefix`, não pela lista).
- **Ligar o `promotion-guard`**, que espera a resolução de `DA-0004`, e **registrar o
  `ownership` no marketplace**, depois da prova remota.
- **O plugin SDD.**
