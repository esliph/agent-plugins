---
id: ADR-0008
title: Como um documento sem família de IDs ganha dono declarado
status: draft
owner: "@dan"
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-08-27
relates-to: [DA-0002, RN-0001]
supersedes: null
superseded-by: null
---

# ADR-0008 — Como um documento sem família de IDs ganha dono declarado

## Contexto

`DA-0002` está aberta desde a Fase 3 e diz: como declarar no `.ownership.yml` um
artefato **sem família de IDs**, para que `CI-7` exija dono sem inventar
prefixo. A lista cresceu a cada fase — `CONTRIBUTING.md`, a Definition of Done,
o contrato do agente, `docs/glossary.md`, `docs/charter/`,
`docs/contracts/errors.md`, `docs/contracts/versioning-policy.md`,
`CHANGELOG.md`, `docs/deprecations.md` — e as Fases 4, 5 e 6 a herdaram sem
resolvê-la, porque nenhuma delas precisava.

`CI-7` precisa. "Artefato sem entrada no CODEOWNERS ou no `.ownership.yml`"
(spec §9) não é verificável enquanto esses documentos não puderem ser declarados
lá. O sintoma é barato de reconhecer: `parseArtifact` exige `id-prefix` de 2 a 4
maiúsculas em toda entrada de `artifacts:`, e nenhum desses documentos tem um.

Há uma segunda coisa que `CI-7` precisa e que ninguém tinha notado: ele precisa
saber **qual** documento é o contrato do agente (para cobrar que não repita
texto de artefato dono, spec §5, `SK-6`, regra 1) e **qual** é a Definition of
Done (porque ela é a fonte de `CI-7`, regra 3 da mesma seção). O toolkit não
conhece `CLAUDE.md` nem `docs/definition-of-done.md` e não pode passar a
conhecer (spec §3).

## Alternativas consideradas

1. **`id-prefix` opcional em `artifacts:`.** Descartada. Todo consumidor de
   `ArtifactRule` — `CI-1` (máquina de estados por prefixo), `CI-2` (numeração e
   sequência), `HK-1` (congelamento), `HK-3` (promoção) — passaria a tratar
   prefixo nulo, e cada um ganharia um `if` para dizer "isto não é da minha
   alçada". O custo cairia justamente na Fase 0, que é a parte mais delicada e a
   que menos deveria mudar.
2. **Inventar prefixos: `CTB`, `DOD`, `GLO`, `CHG`.** Descartada. ID que
   ninguém cita é numeração decorativa, e `CI-2` passaria a cobrar sequência de
   uma família de um item só. Pior: convidaria a citar `CTB-0001` em vez de
   `CONTRIBUTING.md`, trocando um caminho que qualquer pessoa entende por um
   código que exige consulta.
3. **Só o CODEOWNERS.** Descartada. O mapa do toolkit deixaria de conhecer o
   documento: `CI-7` não teria como dizer qual skill é dona, `CI-4` não teria
   como cobrar revisão, e o `role` que `CI-7` precisa não teria lugar nenhum.
4. **Uma chave nova, `documents:`.** Escolhida.

## Decisão

**`documents:` declara documento com dono e sem família de IDs.**

```yaml
documents:
  - path: CONTRIBUTING.md
    owner: "@dan"
    skill: working-agreements-keeper
  - path: CLAUDE.md
    owner: "@dan"
    skill: working-agreements-keeper
    role: agent-contract
  - path: docs/superpowers/
    owner: "@dan"
```

- `path` e `owner` são obrigatórios; `owner` começa com `@` e espelha o
  CODEOWNERS, igual a `artifacts:`.
- `skill` é **opcional**. A ausência é informação, não erro: um documento pode
  ter dono e não ter skill dona — é o caso de um plano, de uma spec, de um
  README.
- `role` é opcional e tem vocabulário fechado: `agent-contract` e
  `definition-of-done`. É o que permite a `CI-7` achar esses dois documentos sem
  conhecer caminho nenhum. Um papel só pode ser declarado uma vez.
- `path` terminado em `/` é diretório e cobre o que está dentro dele; sem `/` é
  arquivo e cobre por igualdade. Mesma semântica de `artifacts:`.
- **`CI-1`, `CI-2`, `HK-1` e `HK-3` não leem `documents:`.** `CI-4` e `CI-7`
  leem. `artifacts:` continua exigindo `id-prefix`.

## Consequências

### O que se ganha

`DA-0002` fecha. `CI-7` passa a poder cobrar dono de todo documento sem
inventar prefixo. A distinção entre **artefato** (tem família de IDs, ciclo de
vida e congelamento) e **documento** (tem dono, e talvez skill) fica explícita
no arquivo que é o ponto de extensão do toolkit, em vez de morar na cabeça de
quem leu as fases anteriores.

### O que se aceita perder

Um documento declarado em `documents:` **não** tem o frontmatter validado por
`CI-1`: um `trigger` com cadência dentro de `CONTRIBUTING.md` passa. Estender
`CI-1` a `documents:` é uma decisão separada, e não é de graça — `CHANGELOG.md`
não tem frontmatter por decisão da Fase 6, e um `CI-1` ingênuo passaria a
reprová-lo. Esta fase deixa isso de fora e escreve que deixou.

`role` é vocabulário fechado: um projeto que precise de um papel novo espera uma
versão do toolkit. É deliberado — papel aberto seria configuração que o toolkit
não sabe usar.

Duas chaves passam a poder declarar o mesmo caminho (`artifacts:` e
`documents:`). O parser recusa duplicata dentro de `documents:`, mas não cruza as
duas listas; `CI-7` trata qualquer uma como "declarado", então o efeito de um
engano aqui é silêncio, não erro.
