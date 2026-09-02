# Changelog

Este arquivo é voltado a quem **consome** o `living-docs`. Teste único: se a
entrada só faz sentido para quem escreveu o código, ela não pertence aqui.
Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

A entrada nasce no PR que causa a mudança, não na véspera da release.

## [Unreleased]

### Added

- `validate`, `drift` e `changelog` passam a relatar quanto o conjunto de checks
  levou e qual é o teto declarado (`RNF-0005`). A medida não altera o código de
  saída.
- `CI-9` (`living-docs validate --base <ref>`): reprova o diff que só altera a
  data de revisão de vários documentos, e o que altera um arquivo de artefato sem
  que nenhuma mensagem de commit cite um ID declarado nele.
- `CI-10` (`living-docs validate`): o `trigger` de um documento e a
  `description` da skill declarada como dona dele precisam falar do mesmo
  evento. Skill dona que não existe na raiz do toolkit produz aviso, não falha.
- `last-reviewed-bump-limit` em `docs/.ownership.yml`: quantos documentos com
  bump de data seco reprovam. Padrão 3, piso 2.
- `id-format` em `docs/.ownership.yml`: um projeto declara como seus IDs se
  escrevem (`separator`, `padding`). Ausente, a forma continua sendo
  `<PREFIXO>-<4 dígitos>`.
- `living-docs init --id-separator <s> --id-padding <n>`: declara a forma escrita
  dos IDs do projeto. `--dry-run` relata a forma que o repositório já usa, sem
  alterar arquivo nenhum.
- `living-docs init` passa a instalar o workflow de CI do estágio em
  `.github/workflows/living-docs.yml`, com o comando de invocação vindo de
  `--invoke` (padrão `npx living-docs`). O workflow instalado não menciona
  Docker, e um workflow que já exista é mantido.
- `.claude-plugin/marketplace.json`: o plugin `living-docs` passa a ter caminho
  de instalação.
- `living-docs init --marketplace <owner/repo>` registra o plugin em
  `.claude/settings.json` do repositório, por mesclagem — hooks e plugins que já
  estavam lá são preservados. Sem a opção, o registro não é escrito e o `init`
  diz o que faltou.
- `living-docs init --stage multi-team`: o estágio de múltiplos times passa a
  existir e instala a Fase 7 — o passo de `validate --base <ref>` no workflow,
  além de tudo que `production` instala.
- `HK-8`: editar um caminho reivindicado por uma decisão aberta passa a
  perguntar, nomeando a decisão, a lacuna e a skill dona. O campo é opcional — a
  coluna `Bloqueia` (canônico `blocks`) na lista de decisões abertas.
- `HK-6`: no início da sessão, o inventário chega ao contexto — artefatos e
  documentos declarados e ausentes, decisões abertas, dívidas com gatilho
  cumprido e documentos vencidos. É injeção de contexto, nunca bloqueio.
- `AG-1` `docs-divergence-auditor` e o comando `/docs-audit`: auditoria de
  divergência código→documentação num escopo dado, em contexto isolado, sem
  `Edit` nem `Write`.
- `documents:` no `docs/.ownership.yml`: declara documento com dono e sem família
  de IDs (`CONTRIBUTING.md`, a Definition of Done, o contrato do agente,
  `CHANGELOG.md`) com `path`, `owner`, `skill` opcional e `role` opcional
  (`agent-contract`, `definition-of-done`). A chave é opcional: configuração
  escrita nas versões anteriores continua válida.
- Subcomando `living-docs changelog --base <ref>`: falha quando o diff da
  branch toca um caminho declarado em `consumer-visible-paths` e a entrada de
  `## [Unreleased]` não viaja junto (`CI-6`).
- Rótulo de exceção `Changelog: none — <razão>` na mensagem de commit, para a
  mudança que de fato não é visível a quem consome. Sem razão, não conta.
- Hook `HK-7`: marcador de atalho novo (`TODO`, `FIXME`, supressão de tipo ou
  de lint, teste ignorado) sem `TDR-nnnn` por perto gera lembrete. Nunca
  bloqueio.
- `living-docs init --stage production` passa a instalar `CHANGELOG.md`,
  `docs/deprecations.md`, `docs/releases/` e `docs/migrations/`, e a declarar o
  artefato `REL` no `docs/.ownership.yml`.
- Prefixo de ID `REL` para release note, com os estados `draft` e `published`.
  Publicada, ela é congelada por `HK-1`.
- Skill `release-historian` e comando `/release [versão]`, donos do
  `CHANGELOG.md`, das release notes, das depreciações e dos guias de migração.
- Código de erro `BASE-UNRESOLVED`: `changelog` sem `--base`, com base que não
  resolve, ou em clone raso.
- `living-docs init` declara em `documents:` todo documento que instala, com
  dono, skill dona e — para o contrato do agente e a Definition of Done — o
  `role` que `CI-7` usa para achá-los. Repositório que sobe de estágio recebe só
  as entradas que faltam; sem âncora no arquivo, o comando diz o que falta em vez
  de reescrever.
- O template de TDR traz o gatilho de pagamento de máquina (`pay-when`) como
  exemplo comentado.
- `CI-4` (staleness), `CI-7` (ownership coverage) e `CI-8` (links) passam a rodar
  em `living-docs validate`. `CI-4` é o único que produz aviso: aviso é
  reportado e não muda o código de saída.
- `living-docs validate --base <ref>` liga a metade de `CI-7` que lê o diff da
  branch: caminho vigiado alterado sem o doc dono reprova, e a saída escrita é
  `Docs: none — <razão>` numa mensagem de commit do intervalo.
- `bin/dev`: ponto de entrada opcional que roda qualquer comando de manutenção
  dentro do container do repositório, subindo-o e instalando as dependências
  quando preciso — `bin/dev npm test`, `bin/dev node src/cli/index.ts validate`,
  ou `bin/dev` sozinho para um shell. Exige o daemon do Docker; o caminho de
  registro continua sendo o Node do host (`RNF-0006`, `ADR-0016`).

### Changed

- O toolkit passa a rodar no Node do host: os ganchos do plugin invocam `node`
  direto, e o workflow de CI deste repositório instala Node e npm em vez de
  construir uma imagem. Quem clona precisa de Node 24 ou maior e de um `npm ci`
  antes do primeiro comando; em troca, os ganchos param de calar quando o
  container não está de pé. `compose.yaml`, `Dockerfile` e `./bin/living-docs`
  continuam no repositório, agora como o caminho de execução opcional descrito
  acima — registrado em `ADR-0015` e `ADR-0016`.
- O nome do pacote passa a ser `@esliph/living-docs` e o container Docker do
  repositório passa a se chamar `esliph-living-docs` (era `living-docs-toolkit`
  nos dois). Quem sobe o ambiente com `docker compose` ou invoca `./bin/living-docs`
  sem `LIVING_DOCS_CONTAINER` definido passa a falar com o container pelo nome
  novo; o comando `living-docs` em si não muda. Registrado em `ADR-0014`.
- `CI-7` ganha uma sexta classe de achado: com `--base <ref>`, o diff que toca
  caminho reivindicado por uma decisão aberta reprova. A saída continua sendo
  `Docs: none — <razão>`.
- `living-docs validate` passa a exigir que todo documento sob a raiz da
  documentação tenha entrada no `docs/.ownership.yml` e linha no CODEOWNERS
  (`CI-7`). Repositório instalado por uma versão anterior precisa rodar
  `living-docs init` de novo, ou declarar os documentos à mão, para continuar
  passando.
- `living-docs validate` passa a exigir que toda dívida `open` declare um
  gatilho de pagamento verificável — `pay-when` com `pattern` e `paths`
  (`CI-4`). Repositório instalado por uma versão anterior tem de declarar o
  `pay-when` das dívidas que já estão abertas, ou reclassificá-las, para
  continuar passando.
- `living-docs validate` passa a exigir que todo link entre documentos resolva —
  relativo ou wikilink — e que não haja anexo binário sob a raiz da
  documentação (`CI-8`).
  Repositório instalado por uma versão anterior precisa corrigir os links
  quebrados e tirar os binários de dentro de `docs/` para continuar passando.
- `living-docs validate` passa a apontar `living-docs changelog` quando o
  repositório declara `consumer-visible-paths` — ponteiro, não achado: o código
  de saída não muda.
- A lista de "não instalado" de `--stage production` fica vazia: o estágio
  passa a cobrir as Fases 5 e 6 da spec por completo.
- O workflow do repositório passa a rodar `CI-6` em pull request, e o
  `actions/checkout` passa a exigir `fetch-depth: 0` — um clone raso não
  contém a base do diff.
- `CODEOWNERS` escrito pelo `init` passa a cobrir `docs/ids-retired.txt`.
- `docs/contracts/checks.gen.md` passa a listar oito checks, ordenados por ID.
- `bin/living-docs` deixa de exigir que o container já esteja de pé e deixa de
  sair com código 2 quando ele não está: agora delega a `bin/dev`, que sobe o
  container antes de executar. O que se invoca não mudou; o que acontece com o
  ambiente parado, sim.

### Fixed

- `living-docs --help` passa a listar `multi-team` entre os estágios de
  `--stage`; o CLI já o aceitava.
- `living-docs init` passa a reconhecer `docs/decisoes-em-aberto.md` entre os
  caminhos que adota para a família `DA` quando já existem.
- `living-docs init` num repositório que já tem `AGENTS.md` passa a escrever a
  linha de CODEOWNERS do contrato adotado, e não a de um `CLAUDE.md` que não
  existe ali. Antes, o repositório recém-instalado reprovava no próprio `CI-7`
  na primeira execução: o contrato ficava sem quem o revise.
- `CI-7` deixa de acusar item de Definition of Done sem verificação quando o
  item é um **exemplo do formato** dentro de um bloco de código cercado. A
  documentação que ensina o próprio formato não reprova por ensiná-lo.
- As mensagens de `CI-7` sobre um vínculo de `watches` quebrado passam a citar
  `RN-0008`, a regra que de fato governa o vínculo código→doc.
- `living-docs validate` e o inventário de início de sessão (`HK-6`) passam a
  varrer a árvore do repositório uma vez por execução, e não uma vez por
  pergunta. Repositório grande com muitas dívidas `open` sentia isso no teto de
  5 segundos do hook.
- `living-docs init` num repositório que sobe de estágio passa a acrescentar ao
  `CODEOWNERS` que já existe as linhas do estágio novo. Antes ele o deixava
  congelado na forma do estágio anterior, e os documentos recém-instalados
  nasciam sem quem os revise — o que `CI-7` agora reprova. Linha que já está lá
  não é reescrita.

