# living-docs-toolkit

Documentação viva com dono, gatilho e enforcement — Fases 0–3 da spec
`LIVING-DOCUMENTATION-TOOLKIT.md`: ADR, Open Decisions, Debt Register e
requisitos com ID estável; os checks `CI-1`/`CI-2`/`CI-3`; os hooks
`HK-1`/`HK-3`/`HK-4`/`HK-5`; os acordos de trabalho (`SK-6`).

**Nada roda no host além de Docker.**

## Uso

```bash
docker compose up -d                    # dogfooding: valida este próprio repositório
./bin/living-docs init --stage solo     # cria a moldura (SK-0)
./bin/living-docs validate              # roda CI-1, CI-2 e CI-3
```

Para validar **outro** projeto — a fonte do toolkit e o repositório validado são
raízes distintas (`ADR-0003`):

```bash
LIVING_DOCS_TARGET=/caminho/do/projeto docker compose up -d
./bin/living-docs init --stage small-team --owner @time
./bin/living-docs validate
```

Estágios de maturidade (`--stage`): `solo` instala decisões, lacunas e dívida;
`small-team` acrescenta a moldura de requisitos (`RF`, `RNF`, `RN`). O comando
imprime o que o estágio pede e esta versão **não** instala, em vez de fingir o
conjunto completo.

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

## O que está fora

`SK-1`, `SK-2`, `SK-5`, `SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-6`, `HK-7`,
`CI-4`–`CI-8`, `CM-4`, `CM-5`, `CM-7` — Fases 4 a 7 da spec. O que falta e em
que ordem: `docs/superpowers/plans/BACKLOG-fases-3-7.md`.

Do critério de aceite 5 da spec §12, a Fase 3 entrega a metade do hook: o commit
que leva caminho vigiado sem o doc dono é perguntado. A outra metade — "e o CI
sinaliza pelo `watches`" — é `CI-7`, Fase 7.

Dívida conhecida: `TDR-0001` — `HK-1` congela por arquivo, não por seção, então
um requisito `revoked` dentro de `docs/requirements/` não tem o corpo protegido
pelo hook. `CI-3` fecha a outra metade.
