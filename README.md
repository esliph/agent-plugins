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

`plugin/` traz as skills `decision-recorder` (`/adr`, `/open-decision`, `/debt`)
e `living-docs-bootstrap` (`/docs-setup`), e os hooks `HK-1` (bloqueia editar
item congelado) e `HK-3` (promoção de estado exige ato humano). Os hooks falham
abertos: com o container parado, eles não bloqueiam nada — o enforcement que
sobrevive a isso é o CI.

## Limitações desta fase

Os hooks do plugin assumem que **a fonte do toolkit e o repositório validado são
o mesmo checkout**: `plugin/hooks/run-hook.sh` fixa `LIVING_DOCS_ROOT=/app` tanto
para achar `docs/.ownership.yml` quanto para executar `/app/src/hooks/*.ts`.
Isso serve exatamente ao caso das Fases 0–1 — este repositório validando a si
mesmo (dogfooding). Um projeto consumidor separado precisaria da raiz do toolkit
e da raiz do repositório validado apartadas, o que é trabalho de Fase 2+ e está
registrado como `DA-0001` em `docs/open-decisions.md`.

## O que está fora

`SK-1`, `SK-2`, `SK-4`–`SK-7`, `AG-1`, `AG-2`, `HK-2`, `HK-4`–`HK-7`,
`CI-3`–`CI-8`, `CM-4`, `CM-5`, `CM-7` — Fases 2 a 7 da spec.
