---
title: Requisitos funcionais
owner: '@esliph/engineering'
trigger: >
  Antes de implementar qualquer comportamento desta família, e a toda regra nova
  ou alterada.
last-reviewed: 2026-08-27
---

# Requisitos funcionais

Cada requisito é uma seção com ID citável. Formato: `templates/requirements.md`.

## RF-0001 — `validate` falha o build quando há erro, e só então

- **status:** active
- **fora de escopo:** o formato da saída

`living-docs validate` sai com código 1 se qualquer check produziu achado de
severidade `error`, e 0 caso contrário. Aviso não falha o build — aviso ignorado
é o começo da wiki morta, e por isso quase nada é aviso.

## RF-0002 — `init` é idempotente e adota o que já existe

- **status:** active
- **fora de escopo:** migrar o conteúdo do artefato adotado para outro formato

Rodar `living-docs init` duas vezes não duplica arquivo, não reescreve conteúdo
existente e não renumera ID. Encontrando artefato equivalente sob outro caminho,
adota-o no `.ownership.yml` em vez de criar um paralelo.

## RF-0003 — `init` instala o conjunto do estágio, e diz o que não instalou

- **status:** active
- **fora de escopo:** escolher o estágio, que é julgamento humano

`living-docs init --stage <estágio>` instala apenas a moldura que o estágio pede,
e lista explicitamente o que ficou fora.

## RF-0004 — `init --stage small-team` instala os acordos de trabalho

- **status:** active
- **relates-to:** RF-0002
- **fora de escopo:** preencher `watches`, que exige conhecer o código do projeto e é ato humano

No estágio `small-team`, `living-docs init` cria `CONTRIBUTING.md`, a Definition
of Done e o contrato do agente. Encontrando `AGENTS.md`, adota-o como contrato em
vez de criar um `CLAUDE.md` paralelo; encontrando qualquer um deles já escrito,
mantém o conteúdo intacto.

O que o comando **não** faz é inventar `watches`: um vínculo código→doc que
ninguém reconhece é ruído que ensina a ignorar o lembrete.

## RF-0005 — `init --stage small-team` instala a moldura de linguagem e intenção

- **status:** active
- **relates-to:** RF-0004
- **fora de escopo:** o conteúdo real dos termos e princípios — a semente é o formato, não o vocabulário deste ou de outro projeto

No estágio `small-team`, `living-docs init` cria `docs/glossary.md`,
`docs/charter/constitution.md` e `docs/charter/vision.md` a partir dos
templates, com a mesma idempotência e a mesma política de adoção dos demais
artefatos: não recria o que existe, não reescreve conteúdo do usuário.

## RF-0006 — `living-docs drift` compara o artefato gerado com a saída do gerador

- **status:** active
- **relates-to:** ADR-0005
- **fora de escopo:** gerar o artefato — `drift` compara, nunca escreve

Para cada entrada de `generated[]` no `.ownership.yml`, `living-docs drift`
executa `command`, compara a saída padrão com o arquivo em `path` e sai com
código 1 se houver diferença, se o gerador falhar, ou se o arquivo declarado
não existir. Sem entrada nenhuma declarada, ele diz isso e sai com 0.

`living-docs validate` não roda essa comparação; quando há artefato gerado
declarado, ele aponta o subcomando que a faz.

## RF-0007 — `init --stage production` instala a moldura de contratos

- **status:** active
- **relates-to:** RF-0005
- **fora de escopo:** declarar o gerador — `generated[]` nasce vazio, com
  exemplo comentado, pela mesma razão que `watches` nasce vazio (`RF-0004`)

No estágio `production`, `living-docs init` cria, além de tudo que
`small-team` cria, `docs/contracts/errors.md` e
`docs/contracts/versioning-policy.md` a partir dos templates, com a mesma
idempotência e a mesma política de adoção dos demais artefatos.

A partir de `RF-0009`, `production` também instala a moldura de rastro
histórico da Fase 6 — a lista do que o estágio pede e não instala fica vazia.

## RF-0008 — `living-docs changelog --base <ref>` cobra a entrada de CHANGELOG

- **status:** active
- **relates-to:** ADR-0006
- **fora de escopo:** escrever a entrada — o comando cobra, nunca redige

`living-docs changelog --base <ref>` compara `<ref>...HEAD`, e falha com código
1 quando algum caminho alterado casa com `consumer-visible-paths` e o mesmo
diff não traz o doc marcado `consumer-visible: true` em `watches` com ao menos
um item sob `## [Unreleased]`, nem o rótulo de exceção com razão em alguma
mensagem de commit do intervalo.

Sem `consumer-visible-paths` declarado, ele diz isso e sai com 0. Sem `--base`,
sai com 2 — a base do diff não se adivinha. `living-docs validate` não faz essa
comparação; quando há `consumer-visible-paths` declarado, ele aponta o
subcomando que a faz.

## RF-0009 — `init --stage production` instala a moldura de rastro histórico

- **status:** active
- **relates-to:** RF-0007
- **fora de escopo:** declarar `consumer-visible-paths`, que nasce vazio com
  exemplo comentado pela mesma razão que `watches` e `generated[]` nascem
  vazios (`RF-0004`)

No estágio `production`, `living-docs init` cria, além de tudo que já criava,
`CHANGELOG.md`, `docs/deprecations.md`, `docs/releases/` e `docs/migrations/` a
partir dos templates, e declara o artefato `REL` em `artifacts:` — com a mesma
idempotência e a mesma política de adoção dos demais artefatos.

A lista do que o estágio pede e não instala fica vazia: `production` cobre as
Fases 5 e 6 da spec §10, e as duas existem.

## RF-0010 — `validate` roda os checks de estado da árvore, e aviso não reprova

- **status:** active
- **relates-to:** ADR-0007, ADR-0008
- **fora de escopo:** a metade de `CI-7` que depende do diff, que entra por `--base` e é `RF-0011`

Uma execução de `validate` roda todos os checks que se contentam com o estado da
árvore — hoje `CI-1`, `CI-2`, `CI-3`, `CI-4`, `CI-7` e `CI-8` — e reporta os
achados dos seis juntos. Achado `error` leva a código de saída 1; achado
`warning` é reportado e **não** muda o código de saída.

Quando existe algo que `validate` não verifica — artefato gerado, entrada de
CHANGELOG, o diff da branch —, ele imprime o ponteiro para o comando que
verifica. Check que não roda e não avisa que não rodou é cobertura fingida.

## RF-0011 — `validate --base <ref>` cobra o doc dono do caminho vigiado que mudou

- **status:** active
- **relates-to:** ADR-0010, RN-0021
- **fora de escopo:** a entrada de CHANGELOG, que é `CI-6` e tem comando próprio

Com `--base <ref>`, `validate` acrescenta a `CI-7` a verificação que depende do
diff: caminho vigiado alterado entre a base e `HEAD` sem o doc dono no mesmo
diff reprova, salvo razão escrita no histórico. Sem `--base`, essa verificação
não roda e o comando diz que não rodou.

A base não se adivinha. Sem ela, o comando não escolhe uma por conta própria:
escolher errado produziria achado sobre mudança que não é desta branch.

## RF-0012 — `init` declara todo documento que instala

- **status:** active
- **relates-to:** ADR-0008, RN-0016
- **fora de escopo:** o vínculo `watches`, o gerador e `consumer-visible-paths`, que o `init` continua não inventando (`RF-0004`)

Todo documento que o `init` escreve e que não tem família de IDs é declarado em
`documents:`, com dono e — quando existe uma — a skill dona. Um `init` que cria
documento sem declará-lo entrega, na primeira execução, um repositório que
reprova no próprio `CI-7`.

Isso vale em todos os estágios: dono não é função de maturidade. O que muda com
o estágio é **quais** documentos existem.

## RF-0013 — `init` instala o enforcement do estágio, mesclando com o que já existe

- **status:** draft
- **relates-to:** ADR-0012
- **fora de escopo:** o modo de invocação do CLI dentro do workflow, que é parâmetro de quem instala (`DA-0003`); e `.claude/settings.json` e o workflow instalado, que não são documentação e por isso não entram em `documents:`

Além da moldura, `living-docs init` escreve as duas peças de enforcement: o
workflow de CI do estágio e o registro do plugin que liga os hooks na sessão. As
duas entram por **mesclagem**: um repositório com workflows próprios e hooks já
registrados mantém tudo o que tem, e o toolkit acrescenta o que falta e nada
mais. Rodar duas vezes não duplica entrada — a idempotência vale para o
enforcement igual vale para o documento.

Um repositório com documento e nenhum check rodando é a promessa que este toolkit
recusa: o enforcement é o que faz a regra valer.

## RF-0014 — O inventário relata a forma escrita dos IDs, e não a adota em silêncio

- **status:** draft
- **relates-to:** ADR-0011, RN-0024
- **fora de escopo:** converter IDs de uma forma para outra, que é reescrever preexistente

`living-docs init --dry-run` num repositório cujos IDs não estão na forma padrão
relata qual forma encontrou e quantos itens leu naquela forma. Declarar a forma é
ato de quem instala, não do inventário: adoção silenciosa de formato é a mesma
classe de erro que adoção silenciosa de caminho, e a `SK-0` já recusa a segunda.
