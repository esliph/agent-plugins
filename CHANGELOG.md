# Changelog

Este arquivo é voltado a quem **consome** o `living-docs`. Teste único: se a
entrada só faz sentido para quem escreveu o código, ela não pertence aqui.
Formato: [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

A entrada nasce no PR que causa a mudança, não na véspera da release.

## [Unreleased]

### Added

- Plugin `ownership` no marketplace: dono, ciclo de vida, artefato gerado e
  vínculo código→doc, com os próprios hooks.
- `living-docs init --invoke-ownership <comando>`: como o CLI do núcleo é
  chamado no workflow instalado (padrão `npx ownership`, que só funciona
  depois da publicação do núcleo no npm).
- O arquivo de ownership raiz aceita, no topo, um bloco de configuração por
  plugin listado em `plugins:`; num arquivo incluído, é erro.
- O `owner` do frontmatter sem `@` passa a ser achado de `ownership validate`.
- `validate`, `drift` e `changelog` passam a relatar quanto o conjunto de checks
  levou e qual é o teto declarado. A medida não altera o código de saída.
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
  registro continua sendo o Node do host, e os ganchos nunca entram no container.

- `audience` em `documents:` e em `artifacts:` do `docs/.ownership.yml`:
  declara quem lê o documento. Aceita `internal` e `external`; ausente, vale
  `internal`, e nenhum `.ownership.yml` já escrito muda de significado.
- `CI-11` (`living-docs validate`): documento ou artefato declarado
  `audience: external` não pode citar ID de artefato — em prosa, entre crases ou
  no caminho de um link. O frontmatter e os blocos de código cercados ficam de
  fora, e os identificadores da interface pública (`CI-n`, `HK-n`, `SK-n`,
  `CM-n`, `EXIT-n`) continuam citáveis. Não há rótulo de exceção: o conserto é
  reescrever em texto corrido.
- `living-docs init --stage production` passa a declarar `CHANGELOG.md`,
  `docs/deprecations.md`, `docs/migrations/` e as release notes com
  `audience: external`. Num repositório que já declara essas entradas sem a
  marca, o `init` não reescreve a linha: avisa, entre o que não instalou, que
  marcá-la é o que liga `CI-11` para ela.

### Changed

- Renomeação dos identificadores de checks e hooks: o número dá lugar ao nome, e
  o prefixo diz de quem é a regra. O mapa completo:

  | Antigo                       | Novo                                     |
  | ---------------------------- | ---------------------------------------- |
  | `CI-1`                       | `living-docs/frontmatter`                |
  | `CI-2`                       | `living-docs/id-integrity`               |
  | `CI-3`                       | `living-docs/citation-coverage`          |
  | `CI-4`                       | `living-docs/staleness`                  |
  | `CI-5`                       | `ownership/generated-drift`              |
  | `CI-6`                       | `ownership/consumer-change-logged`       |
  | `CI-7` (contrato do agente)  | `living-docs/agent-contract-duplication` |
  | `CI-7` (Definition of Done)  | `living-docs/done-verifiable`            |
  | `CI-7` (decisão aberta)      | `living-docs/open-decision-claim`        |
  | `CI-8`                       | `living-docs/links`                      |
  | `CI-9`                       | `living-docs/commit-discipline`          |
  | `CI-10`                      | `living-docs/trigger-routing`            |
  | `CI-11`                      | `living-docs/external-audience`          |
  | `HK-1`                       | `living-docs/append-only`                |
  | `HK-2`                       | `ownership/generated-guard`              |
  | `HK-3`                       | `living-docs/state-promotion`            |
  | `HK-4`                       | `ownership/watch-reminder`               |
  | `HK-5`                       | `ownership/commit-guard`                 |
  | `HK-6`                       | `living-docs/session-inventory`          |
  | `HK-7`                       | `living-docs/shortcut-debt`              |
  | `HK-8`                       | `living-docs/open-decision-guard`        |

  Quem cita um destes identificadores na própria Definition of Done precisa
  trocá-lo pelo nome novo — o número não é mais reconhecido como verificação.
- Os checks e hooks do `living-docs` passam a ser identificados por nome
  (`living-docs/frontmatter`, …) em vez de número; o mapa completo está na
  entrada de renomeação desta versão. O antigo `CI-7` vira três checks:
  `living-docs/agent-contract-duplication`, `living-docs/done-verifiable` e
  `living-docs/open-decision-claim`.
- O plugin `living-docs` passa a depender do plugin `ownership`, e deixa de
  registrar os hooks de artefato gerado, de lembrete de caminho vigiado e de
  guarda de commit — eles moram no `ownership`.
- O workflow instalado roda `ownership validate` e `living-docs validate`, e,
  em PR, os dois com `--base`.
- `living-docs init --marketplace` habilita os dois plugins.
- A invocação da CLI no checkout passa a ser
  `node --conditions=development packages/living-docs/src/cli/index.ts`, porque o
  toolkit agora depende do núcleo de ownership pelo código-fonte.
- Instalado pelo marketplace, o plugin `living-docs` não instala as dependências
  até o núcleo ser publicado no npm; os hooks falham abertos e não respondem.
- O erro de esquema v1 do `ownership` diz que o arquivo precisa ser reescrito na
  v2.
- Bloco de plugin que não é mapa passa a ser erro de carga.
- O toolkit passa a morar em `packages/living-docs/`, e esse diretório é ao mesmo
  tempo o pacote e o plugin do Claude Code. Quem invoca o CLI de um clone passa a
  chamá-lo por `node packages/living-docs/src/cli/index.ts`, sempre da raiz do
  checkout. O plugin passa a trazer, no próprio diretório, o código e as
  dependências que os ganchos executam. Arquivos já semeados por `init` não
  mudam, porque o comando do workflow instalado vem de `--invoke`.
- O toolkit passa a rodar no Node do host: os ganchos do plugin invocam `node`
  direto, e o workflow de CI deste repositório instala Node e npm em vez de
  construir uma imagem. Quem clona precisa de Node 24 ou maior e de um `npm ci`
  antes do primeiro comando; em troca, os ganchos param de calar quando o
  container não está de pé. `compose.yaml`, `Dockerfile` e `./bin/living-docs`
  continuam no repositório, agora como o caminho de execução opcional descrito
  acima.
- O nome do pacote passa a ser `@esliph/living-docs` e o container Docker do
  repositório passa a se chamar `esliph-living-docs` (era `living-docs-toolkit`
  nos dois). Quem sobe o ambiente com `docker compose` ou invoca `./bin/living-docs`
  sem `LIVING_DOCS_CONTAINER` definido passa a falar com o container pelo nome
  novo; o comando `living-docs` em si não muda.
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

- A skill `release-historian` e o template de guia de migração deixam de pedir
  que o guia aponte a decisão pelo ID: o guia diz, em texto corrido, por que a
  quebra foi decidida, e o commit que o cria cita a decisão. O contrato do agente
  semeado pelo `init` ganha a mesma política.

- As sementes que `living-docs init` escreve e os comentários do
  `docs/.ownership.yml` e do workflow instalados deixam de citar decisões
  internas do toolkit e de trazer instrução de preenchimento; o que ajudava a
  ler o documento virou prosa, e a orientação de quem escreve passou para as
  skills. As mensagens dos checks, dos hooks e do CLI e o texto das skills
  deixam de citar regras internas do toolkit. Repositório já instalado mantém o
  texto antigo.
- O arquivo de ownership passa a morar na raiz (`.ownership.yml`) e a ser lido
  no esquema v2: uma lista `owned`, com o bloco `living-docs:` em cada entrada
  da documentação viva e no topo para a configuração global. O esquema v1 não
  é lido, e não há comando de migração — reescreva o arquivo seguindo o
  `templates/ownership.yml`.
- `living-docs init` semeia a v2 na raiz, e não escreve um arquivo novo quando
  já existe um.
- `living-docs validate` deixa de verificar o dono de cada documento, o
  CODEOWNERS, o vínculo de `watches`, o `owner` do frontmatter e o `status`
  fora dos estados declarados — tudo isso é de `ownership validate`.

### Removed

- `living-docs drift` e `living-docs changelog`: a deriva de artefato gerado e
  a entrada de CHANGELOG passam a ser verificadas por `ownership validate`
  (`--base <ref>` para o diff).
- `consumer-visible-paths`: a marca `consumer-visible: true` nas regras de
  `watches` é a lista.

### Fixed

- Os templates que `living-docs init` semeia voltam a trazer os placeholders
  `{{ID}}`, `{{TITLE}}` e `{{TODAY}}` na forma que o `init` substitui. Um
  formatador de código os havia reescrito como `{ { ID } }` — o YAML os lê como
  mapa, e o repositório recém-instalado nascia com `last-reviewed` inválido,
  reprovando no próprio `CI-1` na primeira execução. `templates/` e o contrato
  gerado passam a ficar fora do formatador.
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
- As mensagens de `CI-7` sobre um vínculo de `watches` quebrado passam a apontar
  a regra que de fato governa o vínculo código→doc: caminho vigiado e documento
  dono viajam no mesmo commit.
- `living-docs validate` e o inventário de início de sessão (`HK-6`) passam a
  varrer a árvore do repositório uma vez por execução, e não uma vez por
  pergunta. Repositório grande com muitas dívidas `open` sentia isso no teto de
  5 segundos do hook.
- `living-docs init` num repositório que sobe de estágio passa a acrescentar ao
  `CODEOWNERS` que já existe as linhas do estágio novo. Antes ele o deixava
  congelado na forma do estágio anterior, e os documentos recém-instalados
  nasciam sem quem os revise — o que `CI-7` agora reprova. Linha que já está lá
  não é reescrita.
