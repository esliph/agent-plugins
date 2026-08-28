# living-docs-toolkit

Documentação viva com dono, gatilho e enforcement — Fases 0–7 da spec
`LIVING-DOCUMENTATION-TOOLKIT.md`: ADR, Open Decisions, Debt Register e
requisitos com ID estável; os oito checks `CI-1` a `CI-8`; os sete hooks `HK-1`
a `HK-7`; os acordos de trabalho (`SK-6`); o vocabulário do domínio e os
princípios invioláveis (`SK-2`, `SK-1`); o contrato público, com a metade gerada
que ninguém edita à mão (`SK-5`); o rastro histórico voltado a quem consome
(`SK-7`); e a manutenção contínua — inventário no início da sessão, staleness,
cobertura de propriedade, links, e o auditor de divergência em contexto isolado.

**Nada roda no host além de Docker.**

## Uso

```bash
docker compose up -d                    # dogfooding: valida este próprio repositório
./bin/living-docs init --stage solo     # cria a moldura (SK-0)
./bin/living-docs validate              # roda CI-1, CI-2, CI-3, CI-4, CI-7 e CI-8
./bin/living-docs validate --base origin/master   # + a metade de CI-7 que lê o diff da branch
./bin/living-docs drift                 # roda CI-5: o contrato gerado ainda bate com o gerador?
./bin/living-docs changelog --base origin/master   # roda CI-6: a mudança visível ao consumidor levou entrada?
```

Para regerar `docs/contracts/checks.gen.md` deste repositório (nunca `Write`/`Edit`
— `HK-2` bloqueia; o comando é o mesmo que `generated[].command` declara em
`docs/.ownership.yml`, aqui rodado dentro do container):

```bash
docker compose exec -w /workspace toolkit sh -c 'node /opt/living-docs/src/tools/gen-checks.ts > docs/contracts/checks.gen.md'
```

Para validar **outro** projeto — a fonte do toolkit e o repositório validado são
raízes distintas (`ADR-0003`):

```bash
LIVING_DOCS_TARGET=/caminho/do/projeto docker compose up -d
./bin/living-docs init --stage small-team --owner @time
./bin/living-docs validate
```

Estágios de maturidade (`--stage`): `solo` instala decisões, lacunas e dívida;
`small-team` acrescenta a moldura de requisitos (`RF`, `RNF`, `RN`), os acordos
de trabalho, o glossary e o charter; `production` acrescenta a moldura de
contratos (catálogo de erros e política de versionamento) **e** o rastro
histórico (CHANGELOG, release notes, depreciações e guias de migração). Em todos
eles, o `init` declara em `documents:` o que criou — documento sem dono reprova
em `CI-7`.

**Não existe `--stage multi-team`**, e a razão é que a Fase 7 não instala
artefato nenhum: ela instala enforcement, e enforcement não é arquivo que o
`init` escreve — são os checks que já vêm com o toolkit e os hooks que já vêm
com o plugin. Um estágio com o mesmo conjunto de arquivos que `production` seria
um rótulo sem nada atrás.

Desenvolvimento:

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

## Plugin do Claude Code

`plugin/` traz as skills `decision-recorder` (`/adr`, `/open-decision`, `/debt`),
`living-docs-bootstrap` (`/docs-setup`), `requirements-keeper` e
`working-agreements-keeper` (as duas sem comando: são selecionadas pela
`description`), e os hooks `HK-1` (bloqueia editar item congelado), `HK-3`
(promoção de estado exige ato humano), `HK-4` (lembra o doc dono depois de
editar caminho vigiado) e `HK-5` (pergunta antes do commit que leva código sem
o doc). `HK-4` e `HK-5` nunca negam: lembram e perguntam. Os hooks falham
abertos: com o container parado, eles não bloqueiam nada — o enforcement que
sobrevive a isso é o CI.

As skills `glossary-keeper` (`/term`) e `charter-keeper` completam o estágio
`small-team`, e `plugin/agents/decision-adversary.md` (`AG-2`) é o primeiro
agent do plugin — contexto isolado, sem `Edit`/`Write`, que tenta refutar um
ADR, uma emenda de Constitution ou um TDR antes da aceitação humana.

`contract-keeper` (`SK-5`) é dona do contrato público, e `HK-2` nega editar
artefato gerado à mão apontando a fonte e o comando do gerador.

`release-historian` (`/release`) é dona do rastro histórico —
`CHANGELOG.md`, `docs/releases/`, `docs/deprecations.md` e
`docs/migrations/` — e `HK-7` lembra quando um atalho novo (`TODO`, `FIXME`,
supressão de tipo ou de lint, teste ignorado) fica sem `TDR-nnnn` por perto.
`HK-7`, como `HK-4` e `HK-5`, nunca nega: só lembra.

`HK-6` injeta o inventário no início da sessão — o que está declarado e ausente,
as decisões abertas, as dívidas com gatilho cumprido e os documentos vencidos —,
e nunca bloqueia. `plugin/agents/docs-divergence-auditor.md` (`AG-1`, comando
`/docs-audit`) é o segundo agent: recebe um escopo, responde o que aquele diff
deveria ter atualizado e não atualizou, e aponta o artefato dono de cada achado.
Como `AG-2`, ele não tem `Edit` nem `Write`.

## O que está fora

Nada das Fases 0–7 da spec. As camadas que a spec §"Escopo" deixa
deliberadamente fora — C4/ERD/threat model, runbooks/SLO/postmortems, event
catalog, RFC longo, feature specs — continuam fora, e o caminho para elas é o
mesmo ponto de extensão: uma entrada em `docs/.ownership.yml` e uma skill dona.

Os dez critérios de aceite da spec §12 estão cobertos. O critério 5 fecha nas
duas metades desde a Fase 7: `HK-5` pergunta antes do commit, e
`living-docs validate --base <ref>` reprova no PR, com `Docs: none — <razão>`
como única saída escrita.

Dívida conhecida: `TDR-0001` — `HK-1` congela por arquivo, não por seção, então
um requisito `revoked` dentro de `docs/requirements/` não tem o corpo protegido
pelo hook. `CI-3` fecha a outra metade, e o gatilho de pagamento agora é
verificável: o `pay-when` do TDR procura `status: revoked` em
`docs/requirements/**`, e `CI-4` reprova no dia em que isso acontecer.
