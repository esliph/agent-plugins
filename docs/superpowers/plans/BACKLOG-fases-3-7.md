# Backlog — Fases 3 a 7 do toolkit de documentação viva

Insumo para o plano seguinte. Escrito ao fechar o plano de `DA-0001` + Fase 2
(`docs/superpowers/plans/2026-08-24-living-docs-toolkit-fase-2.md`), a partir da
spec `LIVING-DOCUMENTATION-TOOLKIT.md` §10.

**Estado em 2026-08-24:** Fases 0–2 implementadas (`CI-1`, `CI-2`, `CI-3`, `SK-0`
com `--stage`, `SK-3`, `SK-4`, `HK-1`, `HK-3`, `CM-1`–`CM-3`, `CM-6`), e a
separação de raízes fechada por `ADR-0003` (`DA-0001` resolvida). Tudo abaixo
parte daí.

**Estado em 2026-08-25:** a Fase 3 está **implementada** —
`docs/superpowers/plans/2026-08-25-living-docs-toolkit-fase-3.md`, as 9 tasks
executadas e `RN-0008`–`RN-0010`/`RF-0004` promovidos por ato humano. A Fase 4
está **planejada, não implementada** —
`docs/superpowers/plans/2026-08-25-living-docs-toolkit-fase-4.md`. As fases
seguintes herdam as decisões de projeto das duas (a API de `watches`, o lugar
de `src/git/`, a `DA-0002` que a Fase 3 descobriu, e a identidade por nome do
termo do glossary que a Fase 4 registrou em `ADR-0004`). Está registrado em
cada seção abaixo.

**Estado em 2026-08-25:** a Fase 4 está **implementada** —
`docs/superpowers/plans/2026-08-25-living-docs-toolkit-fase-4.md`, as 8 tasks
executadas e `ADR-0004`/`RF-0005`/`RN-0011` promovidos por ato humano. O
estágio `small-team` cobre as Fases 2, 3 e 4 por completo nesta versão.

Cada fase abaixo traz: o que entrega, de que depende, que peça de engine ainda
não existe, e o risco que só aparece quando alguém tenta implementar. A ordem é
a da spec §10 e importa: cada fase usa o enforcement que a anterior instalou.


### Fase 3 — amarrar doc ao PR (o mecanismo 1) — **IMPLEMENTADA**

`SK-6` working-agreements-keeper (`CONTRIBUTING.md`, `docs/definition-of-done.md`,
`CLAUDE.md`), `HK-4` (`PostToolUse` → injeta o doc dono do caminho vigiado) e
`HK-5` (`PreToolUse` em `git commit` → pergunta quando o staged toca caminho
vigiado sem o doc dono).

**Plano:** `docs/superpowers/plans/2026-08-25-living-docs-toolkit-fase-3.md`
(9 tasks, todas executadas). `RN-0008`, `RN-0009`, `RN-0010` e `RF-0004`
estão `active`, promovidos por ato humano.

**Depende de:** `watches` deixar de ser `[]` no `.ownership.yml` — hoje o campo é
lido e validado, e nenhuma regra o preenche. É o primeiro trabalho da fase.
**Peça de engine que falta:** um `src/config/watches.ts` que responda "que docs
este conjunto de caminhos exige", usado pelos dois hooks e, na Fase 7, por `CI-7`.
**Risco conhecido:** `HK-5` intercepta `Bash`, não `Edit|Write` — é o primeiro
hook com matcher diferente, e o `run-hook.sh` atual passa o payload cru sem
distinguir evento. Verifique o contrato de `PreToolUse` para `Bash` antes.
**Critério de aceite da spec §12 que a fase fecha:** o 5.

**O que o planejamento apurou** (vale para quem for executar, e para as fases
seguintes que herdam):

- `run-hook.sh` **não precisa mudar**. Ele recebe o nome do hook como argumento e
  invoca um arquivo por hook; quem distingue o evento é o arquivo, não o wrapper.
  O risco anotado acima se dissolveu — não "melhore" o wrapper de graça: é onde
  a falha aberta mora.
- `src/git/staged.ts` executa `git -c safe.directory=* diff --cached --name-only -z`.
  O `-z` não é gosto: sem ele o git envolve em aspas e escapa caminho com acento,
  e caminho escapado não casa com glob nenhum. O `safe.directory` também não:
  o hook roda no container com uid diferente do dono do checkout montado, e sem
  ele o git recusa o repositório e o hook silencia justo quando deveria falar.
- **O critério 5 fecha pela metade.** "`HK-5` pergunta e lista os pendentes" é a
  Fase 3; "**e** o CI sinaliza pelo `watches`" é `CI-7`, Fase 7. O README passa a
  dizer isso; nenhum teste finge a outra metade.

### Fase 4 — linguagem e intenção — **IMPLEMENTADA**

`SK-2` glossary-keeper (`docs/glossary.md`, `CM-4` `/term`), `SK-1` charter-keeper
(`docs/charter/constitution.md`, `vision.md`) e `AG-2` decision-adversary.

**Plano:** `docs/superpowers/plans/2026-08-25-living-docs-toolkit-fase-4.md`
(8 tasks, todas executadas). `ADR-0004` está `accepted`; `RF-0005` e `RN-0011`
estão `active`, promovidos por ato humano.

**Observação:** a Constitution exige "todo princípio tem enforcement nomeado".
Isso é regra de skill, não check — o plano resiste a inventar `CI-9` para
medi-la; a verificação fica com a skill e com um teste de dogfooding.

**O que o planejamento apurou** (respostas às duas perguntas que este backlog
deixara em aberto — vale para quem for executar, e para as fases seguintes
que herdam):

1. **Os estados de termo não entram em `STATUS_MACHINE`.** A spec §8 mostra o
   glossary sendo **citado pelo nome** ("Glossary <──nomeia── RN, contrato,
   código"), nunca do lado que resolve uma citação `<PREFIXO>-<número>` — e o
   formato de entrada (§5) não tem coluna de ID. Um termo é identificado pelo
   nome, não por um `TRM-nnnn` inventado; `active`/`renamed`/`banned` vira uma
   coluna de tabela lida pela skill, sem `STATUS_MACHINE` nem `CI-1` a
   validando. Decisão registrada em `ADR-0004`.
2. **O formato de `agents/` no plugin, confirmado contra plugins reais do
   marketplace** (`pr-review-toolkit`, `feature-dev`): `plugin/agents/<name>.md`,
   frontmatter `name`, `description` (o gatilho), `tools:` (allowlist —
   `AG-2` fica sem `Edit`/`Write`, spec §6), `model:`. Descoberto por
   diretório, igual a skills e comandos — **sem** entrada em `plugin.json`.

**Herança da Fase 3, resolvida por `ADR-0004`:** glossary e Constitution/Vision
são artefatos com dono e **sem família de IDs numerada**, igual a
`CONTRIBUTING.md` — mesma categoria de `DA-0002`. A Fase 4 **não** resolve
`DA-0002` nem inventa prefixo: mantém os três fora de `artifacts:` no
`.ownership.yml`, com o mesmo tratamento que `CONTRIBUTING.md` já recebe desde
a Fase 3. `DA-0002` segue aberta, exatamente onde a Fase 3 a deixou — pré-
condição de `CI-7`, Fase 7.

### Fase 5 — contratos gerados — **PRÓXIMO PLANO**

`SK-5` contract-keeper, `HK-2` (bloqueia editar artefato gerado) e `CI-5`
(regenerar produz diff ≠ 0).

**Depende de:** `generated[]` no `.ownership.yml` deixar de ser `[]`, e de existir
um gerador de verdade. **Este repositório não tem contrato gerado nenhum** — o
dogfooding da fase precisa inventar um alvo real (por exemplo, gerar a tabela de
checks do README a partir de `src/checks/registry.ts`) ou a fase fica sem prova.
**Peça de engine que falta:** `CI-5` precisa **executar** o comando do gerador
dentro do container e comparar a saída — é o primeiro check que roda subprocesso,
e o primeiro que pode ser lento. Vale decidir por ADR se ele roda em `validate`
ou num subcomando separado.
**Critério de aceite da spec §12 que a fase fecha:** o 6.

### Fase 6 — rastro histórico

`SK-7` release-historian (`CHANGELOG.md`, `docs/releases/`, `docs/deprecations.md`,
`docs/migrations/`), `CI-6` (changelog required) e `HK-7` (atalho novo sem TDR).

**Depende de:** `consumer-visible-paths` preenchido, e de `CI-6` conseguir ler o
**diff** — é o primeiro check que não se contenta com o estado da árvore.
Decidir por ADR de onde vem o diff (`git diff` contra a base do PR) e como isso
se comporta fora de CI.
**Peça de engine que falta:** `src/git/diff.ts`, e o rótulo de exceção que a spec
§5 (`SK-7`, regra 2) menciona sem definir o formato — isso é uma `DA` a abrir.
**Observação:** `HK-7` é `additionalContext`, nunca `deny` — um atalho legítimo
não pode ser bloqueado (spec §7).

**Herança da Fase 3:** executada a Fase 3, `src/git/` existirá com `staged.ts` —
`diff.ts` nasce ao lado, com o mesmo contrato: runner injetável (`GitRunner`), timeout curto,
falha aberta devolvendo vazio. Copie o padrão em vez de inventar outro; o teto
de 5 s do hook é dividido entre ler o `.ownership.yml` e falar com o git.
`consumer-visible: true` em `watches` e `consumer-visible-paths` continuam sem
consumidor nenhum até `CI-6` — a Fase 3 deliberadamente não os tocou.

### Fase 7 — manutenção contínua

`AG-1` docs-divergence-auditor (`CM-5` `/docs-audit`), `HK-6` (inventário no
`SessionStart`), `CI-4` (staleness — o **único** check autorizado a só avisar),
`CI-7` (ownership coverage) e `CI-8` (links).

**Depende de:** tudo acima; é a fase que fecha os critérios de aceite 7 e 8 da
spec §12.
**Peça de engine que falta:** `CI-4` precisa de "hoje" — e o toolkit hoje não tem
nenhuma fonte de data injetável, o que torna o check impossível de testar de
forma determinística. Planeje um `CheckContext.today` **antes** de escrever
`CI-4`. `CI-8` precisa de um resolvedor de link relativo e da regra "anexo
binário sob `docs/` reprova" (spec §13).
**Observação:** `CI-7` inclui "contrato do agente repetindo texto de um artefato
dono" — detecção de duplicação textual, que é o único check da spec com risco
real de falso positivo. Vale um ADR sobre o limiar antes de implementar.

**Herança da Fase 3** (é a fase que mais herda):

- `CI-7` **não** reimplementa o casamento código→doc: ele chama
  `watchesFor`/`pendingDocs` de `src/config/watches.ts`, a mesma função que
  `HK-4` e `HK-5` usam. Se `CI-7` precisar de uma pergunta que o módulo não
  responde, a resposta nova entra lá — não num `if` dentro de `src/checks/`.
- `CI-7` fecha a **segunda metade do critério de aceite 5** ("e o CI sinaliza
  pelo `watches`"). A primeira já estará entregue pela Fase 3; o README diz
  explicitamente que só uma delas existe, e é aqui que essa frase muda.
- **`DA-0002` é pré-condição de `CI-7`, não consequência.** "Artefato sem entrada
  no `.ownership.yml`" não é verificável enquanto `CONTRIBUTING.md`, a DoD e o
  contrato do agente não puderem ser declarados lá — hoje não podem, porque toda
  entrada de `artifacts:` exige `id-prefix`. Resolva a `DA` com ADR antes de
  escrever o check, ou o check nasce medindo o que consegue em vez do que deve.
- `docs/definition-of-done.md` já existirá com **uma verificação nomeada por
  item** (`CI-n`, `HK-n` ou "humana"). É essa coluna que vira `CI-7`, e é por
  isso que a DoD recusa item sem verificação: item sem verificação é item que
  `CI-7` não tem como cobrar.
- `HK-6` (`SessionStart`) reusa `contextOutput('SessionStart', …)` de
  `src/hooks/lib/io.ts`, criada para `HK-4`. Não existe variante com
  `permissionDecision` ali de propósito.

### Dívidas e decisões abertas herdadas

- **`TDR-0001`** — `HK-1` não congela seção revogada dentro de arquivo de
  coleção. Gatilho de pagamento: o primeiro PR que revogar um requisito.
- **`DA-0002`** — como declarar no `.ownership.yml` um artefato **sem família de
  IDs** (`CONTRIBUTING.md`, Definition of Done, contrato do agente, e depois
  glossary e Constitution), para que `CI-7` exija dono sem inventar prefixo.
  Aberta pela Task 9 do plano da Fase 3 e já está em `docs/open-decisions.md`,
  `open`. Bloqueia `CI-7` (Fase 7); a Fase 4 a herdou sem resolvê-la
  (`ADR-0004`). Sintoma barato de reconhecer: o parser de `artifacts:` exige
  `id-prefix` de 2 a 4 maiúsculas em toda entrada, e esses documentos não têm
  nenhum.
- **`ADR-0001` e `ADR-0002` seguem `draft`** — só `ADR-0003` e `ADR-0004` foram
  aceitos por uma pessoa até aqui. O `relates-to` dos dois **já está
  preenchido**, o que torna a aceitação um ato barato: `accepted` congela o
  arquivo e `relates-to` não está na `mutable-fields`, então um ADR aceito com
  `relates-to: []` só se conserta supersedindo. Preencher antes de aceitar é
  pré-condição, não consequência.
- **Distribuição do toolkit.** `ADR-0003` decide as duas raízes e **não** decide
  como o toolkit chega a um projeto consumidor (clone? imagem publicada? pacote?).
  Vale abrir uma `DA` no primeiro consumidor real.
- **`--stage production` e `--stage multi-team`** não existem porque as fases que
  eles instalariam não existem. Acrescente cada estágio junto com a fase, não
  antes: estágio que instala moldura vazia é a "wiki morta" nascendo de fábrica.
  Depois da Fase 4, `small-team` cobre as Fases 2, 3 **e** 4 por completo, e
  `notInstalled` sai vazio para os dois estágios — quem executar a Fase 5 mexe
  nessa lista de novo. Regra que se aplica a todo estágio: **o `init` não
  inventa `watches`.** O template traz o campo vazio com exemplo comentado,
  porque vínculo código→doc que ninguém reconhece ensina a ignorar o lembrete
  no primeiro dia.

### Ordem sugerida daqui

1. ~~Executar o plano da Fase 3~~ — feito: 9 tasks executadas, `RN-0008`–
   `RN-0010` e `RF-0004` promovidos, `DA-0002` aberta.
2. ~~Executar o plano da Fase 4~~ — feito: 8 tasks executadas, `ADR-0004`
   aceito, `RF-0005`/`RN-0011` promovidos.
3. **Próximo passo: planejar a Fase 5** — contratos gerados. Este repositório
   não tem contrato gerado nenhum ainda (ver "Depende de" na seção da Fase 5):
   o dogfooding precisa inventar um alvo real antes de escrever o plano, ou a
   fase fica sem prova.
4. Fases 6 e 7 na ordem da spec §10 — cada uma com plano próprio, porque cada
   uma entrega software que funciona sozinho.

Aceitar `ADR-0001` e `ADR-0002` (hoje `draft`) não depende de fase nenhuma e
continua sendo um ato barato — com a pré-condição já anotada acima.
