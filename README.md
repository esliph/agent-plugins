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
