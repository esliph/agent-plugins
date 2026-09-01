# Execução no Node do host — especificação

O toolkit executa hoje dentro de um container: `bin/living-docs` e
`plugin/hooks/run-hook.sh` são pontes `docker exec`, o CI roda seis passos por
`docker compose run`, e `RNF-0002` proíbe `node`, `npm` e `npx` fora do
container. Esta spec descreve a migração para o Node e o npm do **host**, e o
estado final em que nenhum documento vivo menciona Docker.

Ela não repete o que os artefatos donos dizem. A regra vigente está em
`docs/requirements/`, a decisão em `docs/decisions/adr/`, o modo de trabalho em
`CONTRIBUTING.md` e o critério de pronto em `docs/definition-of-done.md`.

**Insumo obrigatório de quem for planejar:**
`docs/superpowers/research/2026-08-24-living-documentation-toolkit.md` (§7, o
teto de 5 s do hook; §9, o orçamento do CI), `ADR-0001` (a decisão que esta
migração supersede) e `ADR-0003` (as duas raízes, que **continuam valendo**).

---

## 1. O que decidiu quem pediu

Três escolhas foram tomadas antes desta spec e não são reabertas aqui:

| # | Escolha | Consequência aceita |
| --- | --- | --- |
| `E-1` | `compose.yaml`, `Dockerfile` e `bin/living-docs` ficam **intactos** | `bin/living-docs` continua exigindo Docker enquanto nenhum documento, teste ou passo de CI o invoca — vira wrapper órfão (`M-11`) |
| `E-2` | O apagamento de Docker cobre só os **documentos vivos** | ADRs antigos, `docs/superpowers/plans/`, `research/` e o `CHANGELOG` mantêm suas menções: eles narram o passado, e a trilha é o que o toolkit existe para proteger |
| `E-3` | `RNF-0002` é **reescrito no lugar**, mantendo o ID | Um commit antigo que cita `RNF-0002` passa a apontar para uma regra de sentido oposto. É perda real, escolhida em troca de zero menção a Docker no documento de requisitos |

`E-3` é a única das três que contraria o hábito do próprio repositório — o
vocabulário de `RNF` tem `revoked`, e `CI-3` regra 3 existe justamente para
regra revogada apontar quem a substituiu. Fica registrado aqui porque a
alternativa (revogar `RNF-0002` e criar `RNF-0006`) foi considerada e
descartada, e quem ler o diff daqui a um ano merece saber que houve escolha.

---

## 2. As onze mudanças

| ID | Mudança | Arquivo |
| --- | --- | --- |
| `M-1` | O wrapper de hooks chama `node` direto, derivando a raiz do toolkit do próprio caminho | `plugin/hooks/run-hook.sh` |
| `M-2` | O CI troca `docker compose` por `actions/setup-node` e `npm ci` | `.github/workflows/living-docs.yml` |
| `M-3` | `ADR-0015` nasce e supersede `ADR-0001` | `docs/decisions/adr/` |
| `M-4` | `RNF-0002` passa a enunciar a execução no host | `docs/requirements/non-functional.md` |
| `M-5` | O princípio 6 é emendado; a Constitution vai a `version: 2` | `docs/charter/constitution.md` |
| `M-6` | O comando do gerador deixa de ser caminho absoluto de container | `docs/.ownership.yml` |
| `M-7` | A prosa passa a host-first | `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`, `docs/definition-of-done.md`, `.gitattributes` |
| `M-8` | Os testes que afirmam o container passam a afirmar o host | `test/core/roots.test.ts`, `test/plugin/manifest.test.ts` |
| `M-9` | As fixtures e mensagens que citam Docker são trocadas | `test/checks/ci7-ownership-coverage.test.ts`, `test/cli/init-enforcement.test.ts` |
| `M-10` | A entrada de `## [Unreleased]` registra a mudança visível | `CHANGELOG.md` |
| `M-11` | O wrapper órfão vira dívida com gatilho observável | `docs/decisions/debt/` |

### `M-1` — o wrapper de hooks

O contrato do wrapper não muda: teto de 5 s, saída vazia e `exit 0` em qualquer
erro (`RNF-0001`, spec §7). O que muda é quem executa. A raiz do toolkit sai do
caminho do próprio script — `plugin/hooks/run-hook.sh` está dois níveis abaixo
dela —, e a raiz do repositório validado vem de `CLAUDE_PROJECT_DIR`. As duas
continuam distintas, que é o que `ADR-0003` exige.

`timeout 5`, `exit 0` e a ausência de `set -e` são verificados por
`test/plugin/manifest.test.ts` e não podem se perder na reescrita: são eles que
impedem um hook quebrado de travar o trabalho.

### `M-2` — o CI

Os quatro passos de CLI passam a invocar `node src/cli/index.ts` com o
diretório de trabalho na raiz do checkout. `fetch-depth: 0` fica: `CI-6` compara
`<base>...HEAD` e um clone raso não tem a base (`ADR-0006`). A condição
`if: github.event_name == 'pull_request'` dos passos que leem o diff fica pelo
motivo registrado em `ADR-0010`.

### `M-3` — a decisão

`ADR-0015`, `status: draft` — promover é ato humano, e `HK-3` intercepta.
Declara `supersedes: ADR-0001` e `relates-to: [RNF-0002, RNF-0003]`.
`ADR-0001` recebe `status: superseded` e `superseded-by: ADR-0015`: os dois são
campos mutáveis declarados em `docs/.ownership.yml`, então `HK-1` permite e o
corpo fica intacto. `CI-3` fecha o par dos dois lados.

O ADR precisa dizer o que se **ganha** — o enforcement local deixa de sumir
quando o container está parado, que era a perda declarada em `ADR-0001` — e o
que se **perde**: o host passa a precisar de Node ≥ 24, e uma máquina com Node
mais velho deixa de conseguir rodar o toolkit sem instalar nada.

A metade não-Docker de `ADR-0001` **sobrevive**: TypeScript sem build step,
executado pelo type-stripping nativo, com `tsc --noEmit` como type-checker. O
ADR novo precisa dizer isso explicitamente, senão a supersessão parece revogar
também o que não foi revogado.

### `M-4` — a regra

`RNF-0002` mantém o ID e troca de enunciado. O novo texto declara Node ≥ 24 e
npm como o único toolchain exigido, e nomeia `git` como fora de escopo — o
`fora de escopo` do texto atual já isentava `git`, e isso não mudou.

`CI-3` regra 7 exige que requisito `active` seja citado por ao menos um teste em
`test/**`. A citação existe hoje em `test/plugin/manifest.test.ts` e precisa
continuar existindo depois de `M-8`.

### `M-5` — o princípio

Princípio 6 da Constitution afirma o que deixou de ser verdade. A emenda é ato
deliberado (o `trigger` do documento diz isso), então: texto novo, `version: 2`,
e uma linha no log de emendas datada de 2026-09-01. `test/docs/language-and-intent.test.ts`
exige que todo princípio contenha "verificado por" — o princípio reescrito
precisa nomear o que o verifica, não só afirmar.

### `M-6` — o comando do gerador

`generated[].command` aponta hoje para `/opt/living-docs/src/tools/gen-checks.ts`.
`runCommand` executa com `cwd` na raiz do repositório validado, então um caminho
relativo resolve. A saída do gerador não contém o comando, então `CI-5` não
acusa deriva — mas `node src/cli/index.ts drift` precisa ser rodado para provar
isso, não presumido.

### `M-7` — a prosa

`CLAUDE.md` tem duas restrições verificadas: no máximo 60 linhas
(`test/docs/agent-contract.test.ts`) — hoje são 52 — e nenhuma cópia literal do
título de um requisito. O bullet de política precisa dizer a regra sem repetir o
enunciado de `RNF-0002`; `CI-7` também reprova frase duplicada entre o contrato
do agente e o artefato dono, com o limiar de `ADR-0009`.

`docs/definition-of-done.md`: o penúltimo item diz que os cinco comandos "passam
no container". `test/docs/agent-contract.test.ts` exige que todo item da lista
nomeie a verificação (`CI-\d`, `HK-\d` ou humana) — a reescrita preserva isso.

`docs/.ownership.yml`: o `reason` do watch de `bin/living-docs` descreve o
wrapper como "a ponte host→container". Passa a descrevê-lo sem afirmar o
mecanismo.

### `M-8` e `M-9` — os testes

Três testes afirmam o container e precisam mudar de afirmação, não sumir:

- `test/core/roots.test.ts`, "o container declara as duas raízes": lê
  `LIVING_DOCS_TOOLKIT_ROOT` e `LIVING_DOCS_REPO_ROOT` do ambiente, que só
  existiam porque o `compose.yaml` as injetava. Passa a afirmar o que continua
  verdade e é o coração de `ADR-0003`: `toolkitRoot()` deriva de
  `import.meta.dirname`, `repoRoot()` cai no diretório de trabalho, e mover uma
  não move a outra.
- `test/core/roots.test.ts`, "nenhum caminho absoluto de container em `src/` ou
  `test/`": **fica**. Ainda é a guarda de `ADR-0003` contra caminho embutido.
- `test/plugin/manifest.test.ts`, o teste do wrapper: passa a exigir `node` e a
  proibir `docker`, mantendo as três asserções de falha aberta.
- `test/plugin/manifest.test.ts`, o teste de CRLF: **fica**. `run-hook.sh` roda
  em bash e um CR no shebang continua quebrando o interpretador; só o comentário
  que atribui o motivo a `ADR-0001` muda.

`test/checks/ci7-ownership-coverage.test.ts` usa a frase "Nada roda no host além
de Docker." como fixture de frase curta que **não** é duplicata (`ADR-0009`). A
frase é arbitrária: troca-se por outra curta, e a asserção não muda de sentido.

`test/cli/init-enforcement.test.ts` afirma que o workflow instalado não menciona
Docker. A asserção continua correta e ganha valor: agora nem o workflow deste
repositório menciona. Só a mensagem de erro, que atribui a regra a `RNF-0002`,
precisa ser reescrita.

### `M-10` — o CHANGELOG

`.github/workflows/**` e `plugin/**` estão em `consumer-visible-paths`, e `CI-6`
reprova o diff que os toca sem entrada em `## [Unreleased]`. Entra em
`### Changed`, escrita para quem **consome** o toolkit — o teste do arquivo é o
declarado no seu próprio cabeçalho.

### `M-11` — a dívida

`E-1` deixa `bin/living-docs` como ponte `docker exec` sem nenhum documento,
teste ou passo de CI que o invoque. Isso é atalho consciente, e a política do
repositório diz que atalho consciente vira `TDR` com gatilho de pagamento
**observável** — `CI-4` reprova `pay-when` que ninguém consegue verificar.

Gatilho proposto: quando alguém invocar `bin/living-docs` e ele falhar por
ausência do container. O `TDR` nasce `open`.

---

## 3. O que esta migração **não** faz

- **Não toca `src/`.** `toolkitRoot()` e `repoRoot()` já são independentes de
  container. `ADR-0003` sai intacto, sem supersessão.
- **Não apaga `Dockerfile`, `compose.yaml`, `.dockerignore` nem `bin/living-docs`.**
  `.dockerignore` não estava na lista de `E-1`, mas serve ao `Dockerfile` que
  ficou: apagá-lo quebraria o build que sobrou.
- **Não reescreve registro histórico.** `docs/superpowers/plans/`, `research/`,
  os ADRs anteriores e as entradas antigas do `CHANGELOG` ficam como estão
  (`E-2`).
- **Não revoga a metade não-Docker de `ADR-0001`** — TypeScript sem build step
  continua sendo a decisão vigente, agora carregada por `ADR-0015`.
- **Não publica pacote nem imagem.** Como o toolkit chega ao CI de um consumidor
  continua sendo `DA-0003`, aberta.

---

## 4. O passo zero: as dependências não existem no host

`compose.yaml` monta `node_modules` como **volume nomeado**, e é por isso que
`node_modules/` no checkout está vazio. Medido em 2026-09-01: `node
src/cli/index.ts validate` no host sai com
`ERR_MODULE_NOT_FOUND: Cannot find package 'yaml'`.

`npm ci` no host é, portanto, pré-requisito de **toda** verificação desta spec —
não um detalhe de ambiente. Quem planejar precisa colocá-lo antes do primeiro
passo que executa qualquer coisa, e quem executar não pode concluir que uma
mudança falhou antes de tê-lo rodado.

`.gitignore` já ignora `node_modules/`; nada a mudar lá.

---

## 5. Como se prova que acabou

Os cinco comandos rodam no host — depois do `npm ci` da §4 —, e é a execução
deles, não a leitura do diff, que fecha a migração:

```
npm test
npm run typecheck
node src/cli/index.ts validate --base origin/master
node src/cli/index.ts drift
node src/cli/index.ts changelog --base origin/master
```

Além deles, duas provas que nenhum check faz sozinho:

1. **Nenhum documento vivo menciona Docker.** Varredura por `docker` e
   `container` em `CLAUDE.md`, `CONTRIBUTING.md`, `README.md`,
   `docs/definition-of-done.md`, `docs/.ownership.yml`,
   `docs/requirements/`, `docs/charter/` e `.gitattributes`. As ocorrências de
   "container" em `src/` que nomeiam o *arquivo-container de uma coleção* são
   outra palavra e ficam.
2. **Um hook realmente roda.** `M-1` reescreve o caminho que nenhum teste
   executa de ponta a ponta — `test/hooks/` exercita as decisões por payload,
   não o wrapper. A prova é uma sessão em que `HK-4` ou `HK-6` responde de
   verdade, com Docker parado.
