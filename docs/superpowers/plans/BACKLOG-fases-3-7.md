# Backlog — Fases 3 a 7 do toolkit de documentação viva

Insumo para o plano seguinte. Escrito ao fechar o plano de `DA-0001` + Fase 2
(`docs/superpowers/plans/2026-08-24-living-docs-toolkit-fase-2.md`), a partir da
spec `LIVING-DOCUMENTATION-TOOLKIT.md` §10.

**Estado em 2026-08-24:** Fases 0–1 implementadas (`CI-1`, `CI-2`, `SK-0`, `SK-3`,
`HK-1`, `HK-3`, `CM-1`–`CM-3`, `CM-6`). Fase 2 e a separação de raízes estão
planejadas, não implementadas — enquanto o plano acima não for executado, tudo
abaixo depende dele.

Cada fase abaixo traz: o que entrega, de que depende, que peça de engine ainda
não existe, e o risco que só aparece quando alguém tenta implementar. A ordem é
a da spec §10 e importa: cada fase usa o enforcement que a anterior instalou.


### Fase 3 — amarrar doc ao PR (o mecanismo 1)

`SK-6` working-agreements-keeper (`CONTRIBUTING.md`, `docs/definition-of-done.md`,
`CLAUDE.md`), `HK-4` (`PostToolUse` → injeta o doc dono do caminho vigiado) e
`HK-5` (`PreToolUse` em `git commit` → pergunta quando o staged toca caminho
vigiado sem o doc dono).

**Depende de:** `watches` deixar de ser `[]` no `.ownership.yml` — hoje o campo é
lido e validado, e nenhuma regra o preenche. É o primeiro trabalho da fase.
**Peça de engine que falta:** um `src/config/watches.ts` que responda "que docs
este conjunto de caminhos exige", usado pelos dois hooks e, na Fase 7, por `CI-7`.
**Risco conhecido:** `HK-5` intercepta `Bash`, não `Edit|Write` — é o primeiro
hook com matcher diferente, e o `run-hook.sh` atual passa o payload cru sem
distinguir evento. Verifique o contrato de `PreToolUse` para `Bash` antes.
**Critério de aceite da spec §12 que a fase fecha:** o 5.

### Fase 4 — linguagem e intenção

`SK-2` glossary-keeper (`docs/glossary.md`, `CM-4` `/term`), `SK-1` charter-keeper
(`docs/charter/constitution.md`, `vision.md`) e `AG-2` decision-adversary.

**Depende de:** `collection: table` para o glossary (já existe) e de um estado
`banned`/`renamed` na máquina de estados — a spec §4 os define para termo.
**Peça de engine que falta:** nenhuma grande; é sobretudo autoria de skill.
`AG-2` é o primeiro agent, então é também a primeira vez que o plugin declara
`agents/` — verifique o formato antes de planejar.
**Observação:** a Constitution exige "todo princípio tem enforcement nomeado".
Isso é regra de skill, não check — resista a inventar `CI-9` para medi-la.

### Fase 5 — contratos gerados

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

### Dívidas e decisões abertas herdadas

- **`TDR-0001`** — `HK-1` não congela seção revogada dentro de arquivo de
  coleção. Gatilho de pagamento: o primeiro PR que revogar um requisito.
- **`ADR-0001` e `ADR-0002` seguem `draft`.** Nenhum ADR deste repositório foi
  aceito por uma pessoa até aqui. Enquanto estiverem em `draft`, `CI-3` regra 6
  não os cobra; ao aceitá-los, `relates-to` precisa já estar preenchido, porque
  `accepted` é congelado e `relates-to` não está na `mutable-fields`.
- **Distribuição do toolkit.** `ADR-0003` decide as duas raízes e **não** decide
  como o toolkit chega a um projeto consumidor (clone? imagem publicada? pacote?).
  Vale abrir uma `DA` no primeiro consumidor real.
- **`--stage production` e `--stage multi-team`** não existem porque as fases que
  eles instalariam não existem. Acrescente cada estágio junto com a fase, não
  antes: estágio que instala moldura vazia é a "wiki morta" nascendo de fábrica.
