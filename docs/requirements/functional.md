---
title: Requisitos funcionais
owner: '@esliph/engineering'
trigger: >
  Antes de implementar qualquer comportamento desta família, e a toda regra nova
  ou alterada.
last-reviewed: 2026-09-18
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

**Revogação proposta.** Com o living-docs sobre o núcleo (`ADR-0029`,
`ADR-0030`), a comparação passa a ser do `ownership validate`, e
`living-docs drift` deixa de existir. Este requisito descreve um comando que
sai, e a revogação (`active → revoked`) é ato humano.

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

**Revogação proposta.** Com o living-docs sobre o núcleo (`ADR-0029`,
`ADR-0030`), a cobrança é do `ownership validate --base`, que lê as regras de
`watches` marcadas `consumer-visible: true`, e `living-docs changelog` deixa de
existir; `consumer-visible-paths` também. Este requisito descreve um comando que
sai, e a revogação (`active → revoked`) é ato humano.

## RF-0009 — `init --stage production` instala a moldura de rastro histórico

- **status:** active
- **relates-to:** RF-0007
- **fora de escopo:** declarar regras de `watches` com `consumer-visible: true`,
  que nascem vazias com exemplo comentado pela mesma razão que `watches` e
  `generated[]` nascem vazios (`RF-0004`)

No estágio `production`, `living-docs init` cria, além de tudo que já criava,
`CHANGELOG.md`, `docs/deprecations.md`, `docs/releases/` e `docs/migrations/` a
partir dos templates, e declara o `REL` como entrada de `owned` com
`living-docs.id-prefix: REL` — com a mesma idempotência e a mesma política de
adoção dos demais artefatos.

A lista do que o estágio pede e não instala fica vazia: `production` cobre as
Fases 5 e 6 da spec §10, e as duas existem.

## RF-0010 — `validate` roda os checks de estado da árvore, e aviso não reprova

- **status:** active
- **relates-to:** ADR-0007, ADR-0008
- **fora de escopo:** a metade que depende do diff (`living-docs/open-decision-claim`), que entra por `--base` e é `RF-0011`

Uma execução de `validate` roda todos os checks que se contentam com o estado da
árvore — hoje `living-docs/frontmatter`, `living-docs/id-integrity`,
`living-docs/citation-coverage`, `living-docs/staleness`,
`living-docs/agent-contract-duplication`, `living-docs/done-verifiable` e
`living-docs/links` — e reporta os achados dos sete juntos. Achado `error` leva a código de saída 1; achado
`warning` é reportado e **não** muda o código de saída.

Quando existe algo que `validate` não verifica — artefato gerado, entrada de
CHANGELOG, o diff da branch —, ele imprime o ponteiro para o comando que
verifica. Check que não roda e não avisa que não rodou é cobertura fingida.

## RF-0011 — `validate --base <ref>` cobra o doc dono do caminho vigiado que mudou

- **status:** active
- **relates-to:** ADR-0010, RN-0021
- **fora de escopo:** a entrada de CHANGELOG, que é `ownership/consumer-change-logged` e tem comando próprio

Com `--base <ref>`, `living-docs validate` acrescenta a verificação que depende do
diff e que continua sendo dele: o caminho reivindicado por decisão aberta e
alterado entre a base e `HEAD` reprova. A cobrança do doc dono do caminho vigiado
que mudou passa a ser do `ownership validate --base`, e o living-docs deixa de
fazê-la. Sem `--base`, a verificação por diff não roda e o comando diz que não
rodou.

A base não se adivinha. Sem ela, o comando não escolhe uma por conta própria:
escolher errado produziria achado sobre mudança que não é desta branch.

## RF-0012 — `init` declara todo documento que instala

- **status:** active
- **relates-to:** ADR-0008, RN-0016
- **fora de escopo:** o vínculo `watches`, o gerador e as regras `consumer-visible: true`, que o `init` continua não inventando (`RF-0004`)

Todo documento que o `init` escreve e que não tem família de IDs é declarado em
`owned`, com dono, o bloco `living-docs:` sem `id-prefix` e — quando existe uma —
a skill dona. Um `init` que cria
documento sem declará-lo entrega, na primeira execução, um repositório que
reprova no próprio `ownership/owner-coverage`.

Isso vale em todos os estágios: dono não é função de maturidade. O que muda com
o estágio é **quais** documentos existem.

## RF-0013 — `init` instala o enforcement do estágio, mesclando com o que já existe

- **status:** draft
- **relates-to:** ADR-0012, ADR-0030
- **fora de escopo:** o modo de invocação do CLI dentro do workflow, que é parâmetro de quem instala (`DA-0003`); e `.claude/settings.json` e o workflow instalado, que não são documentação e por isso não entram em `documents:`

Além da moldura, `living-docs init` escreve as duas peças de enforcement: o
workflow de CI do estágio e o registro do plugin que liga os hooks na sessão. As
duas entram por **mesclagem**: um repositório com workflows próprios e hooks já
registrados mantém tudo o que tem, e o toolkit acrescenta o que falta e nada
mais. Rodar duas vezes não duplica entrada — a idempotência vale para o
enforcement igual vale para o documento.

O workflow instalado roda as duas CLIs, a do `ownership` e a do living-docs. O
`--invoke-ownership` diz como chamar a primeira, e o padrão é `npx ownership`.

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

## RF-0015 — `init` marca como externo o que é escrito para quem vem de fora

- **status:** draft
- **relates-to:** RF-0009, RF-0012, RN-0030
- **fora de escopo:** o `README.md` de quem instala, que o `init` não declara como documentação e não passa a declarar por causa disto

No estágio `production` em diante, uma instalação nova declara `CHANGELOG.md`,
`docs/deprecations.md`, `docs/migrations/` e o artefato `REL` com
`audience: external`. É o rastro histórico, e ele é escrito para quem consome.

Num repositório que já declara essas entradas sem a marca, o `init` não
reescreve a linha: relata, entre o que não instalou, cada entrada declarada sem
a marca, dizendo que marcá-la é o que liga a verificação para ela. É a mesma
política de quando ele acrescenta ao `.ownership.yml` e ao CODEOWNERS: o que já
está escrito é de quem escreveu.

## RF-0016 — `ownership validate [--base]` verifica dono, ciclo de vida, gatilho e gerado

- **status:** draft
- **relates-to:** ADR-0019, RN-0032, RN-0034, RN-0035, RN-0037
- **fora de escopo:** os checks de família de IDs, congelamento, staleness e citação, que continuam em `living-docs validate`

O comando `ownership validate` verifica dono, ciclo de vida, gatilho e
artefato gerado do repositório inteiro. Com `--base <ref>`, restringe a
verificação de vigiado (`watches`) aos caminhos que mudaram desde a ref
informada, sem restringir a cobertura de dono, que nunca poda.

## RF-0017 — `ownership explain <caminho>` responde qual arquivo e qual entrada cobrem um caminho

- **status:** draft
- **relates-to:** ADR-0019, ADR-0023, RN-0034
- **fora de escopo:** explicar cobertura de família de ID ou de congelamento — perguntas do living-docs, não do núcleo

Para um caminho dado, `ownership explain <caminho>` responde qual entrada de
`owned` o cobre e de qual arquivo de ownership ela vem. Quando nenhuma
entrada cobre o caminho, responde qual arquivo de ownership tem base que o
contém — a mesma pergunta que falta responder quando a cobertura de dono
reprova.
