# @esliph/claude-plugins

Toolkit de **documentação viva** e plugin do Claude Code. Mantém a documentação
de um repositório — decisões (ADR), decisões em aberto, dívida técnica,
requisitos, glossário, princípios, contratos e histórico de versões — com **dono
declarado**, **gatilho** (quando cada documento precisa mudar) e **verificação
automática**, para que ela não apodreça por falta de responsável ou de momento
certo para atualizar.

## Como funciona

Um arquivo por repositório, `docs/.ownership.yml`, diz de quem é cada documento e
o que dispara sua atualização. Em cima disso, duas camadas de verificação:

- **Ganchos de git locais** (pelo plugin do Claude Code): lembram, perguntam ou
  bloqueiam no momento da edição e do commit.
- **Checagens de CI**: rodam no pipeline em segundos e continuam valendo mesmo
  para edições feitas direto pelo navegador, sem ninguém por perto.

Todo o trabalho acontece dentro de um container. O host não executa Node —
`./bin/living-docs` é só uma ponte para o container.

## Pré-requisitos

- Docker e Docker Compose.
- Claude Code, para usar a parte de plugin (skills, comandos e ganchos).

## Instalação e primeiro uso

```bash
docker compose up -d                     # sobe o container
./bin/living-docs init --stage solo      # cria a estrutura inicial de pastas e arquivos
./bin/living-docs validate               # verifica a documentação do repositório
```

Sem a variável `LIVING_DOCS_TARGET`, o container valida **este próprio
checkout** — o toolkit usa a si mesmo como teste.

Comandos disponíveis:

| Comando | O que faz |
| --- | --- |
| `./bin/living-docs init --stage <estágio>` | Cria a estrutura inicial do estágio e declara em `docs/.ownership.yml` o que criou. |
| `./bin/living-docs validate` | Verifica frontmatter, IDs únicos, rastreabilidade entre documentos, documentos vencidos e cobertura de dono. |
| `./bin/living-docs validate --base <ref>` | Além do acima, compara com o diff da branch: código que mudou sem o documento dono, e mudança visível a quem consome sem entrada no `CHANGELOG.md`. |
| `./bin/living-docs drift` | Confere se cada documento gerado ainda bate com o comando que o gera. |
| `./bin/living-docs changelog --base <ref>` | Confere se toda mudança visível a quem consome levou entrada no `CHANGELOG.md`, ou uma razão escrita no commit. |

Opções de `init`: `--owner <@time>` define o dono declarado nos documentos
criados; `--dry-run` mostra o que seria criado sem escrever; `--id-separator` e
`--id-padding` ajustam a forma escrita dos IDs ao que o repositório já usa;
`--invoke` define o comando que roda o CLI no seu pipeline.

## Estágios de maturidade

O `init` instala só o conjunto que cada estágio pede, e cada estágio inclui os
anteriores:

| Estágio | Acrescenta |
| --- | --- |
| `solo` | Decisões (ADR), decisões em aberto e dívida técnica. |
| `small-team` | Requisitos (funcionais, não funcionais e regras de negócio), acordos de trabalho (`CONTRIBUTING.md`, definição de pronto), glossário e princípios. |
| `production` | Contratos (catálogo de erros e política de versionamento) e histórico de versões (`CHANGELOG.md`, notas de release, depreciações e guias de migração). |
| `multi-team` | A verificação de CI que compara com o diff da branch — documento e código que precisam mudar juntos, e mudança visível a quem consome sem registro no histórico. |

Todo documento criado é declarado em `docs/.ownership.yml`: documento sem dono é
reprovado na verificação.

## Validar outro projeto

A fonte do toolkit e o repositório validado são pastas separadas dentro do
container:

```bash
LIVING_DOCS_TARGET=/caminho/do/projeto docker compose up -d
./bin/living-docs init --stage small-team --owner @time
./bin/living-docs validate
```

## O plugin do Claude Code

`plugin/` traz skills, comandos e ganchos.

**Skills e comandos:**

| Comando | Skill | Papel |
| --- | --- | --- |
| `/adr`, `/open-decision`, `/debt` | `decision-recorder` | Registra decisões, decisões em aberto e dívida técnica. |
| `/docs-setup` | `living-docs-bootstrap` | Prepara o `docs/.ownership.yml` e a estrutura. |
| `/term` | `glossary-keeper` | Mantém o vocabulário do domínio. |
| `/release` | `release-historian` | Mantém `CHANGELOG.md`, notas de release, depreciações e migrações. |
| `/docs-audit` | `docs-divergence-auditor` | Aponta o que um diff deveria ter atualizado e não atualizou. |
| — | `requirements-keeper`, `working-agreements-keeper`, `charter-keeper`, `contract-keeper` | Selecionadas pela descrição, sem comando próprio. |

**Ganchos:** bloqueiam a edição de um documento já aceito; exigem aprovação de
uma pessoa para promover o estado de uma decisão; depois de você editar um trecho
de código vigiado, lembram do documento dono; antes de um commit que leva código
sem o documento dono, perguntam; lembram quando um atalho novo (`TODO`, `FIXME`,
supressão de tipo ou de lint, teste ignorado) fica sem registro de dívida por
perto; e, no início da sessão, injetam um inventário do que está declarado e
ausente, das decisões em aberto, das dívidas com gatilho cumprido e dos
documentos vencidos. Os ganchos que lembram e perguntam nunca bloqueiam; com o
container parado, nenhum gancho bloqueia nada — a camada que sobrevive a isso é
o CI.

**Agentes** (contexto isolado, sem permissão de editar): um tenta refutar um
ADR, uma emenda de princípios ou um registro de dívida antes da aprovação
humana; o outro recebe um escopo e responde o que aquele diff deixou de
atualizar, apontando o documento dono de cada achado.

## O que está fora

Camadas deliberadamente não cobertas: C4/ERD/threat model, runbooks/SLO/
postmortems, catálogo de eventos, RFC longo e feature specs por feature. O
caminho para adicioná-las é o mesmo ponto de extensão: uma entrada em
`docs/.ownership.yml` e uma skill dona.

## Desenvolvimento

```bash
docker compose exec toolkit npm test
docker compose exec toolkit npm run typecheck
```

Para contribuir, veja `CONTRIBUTING.md`.
