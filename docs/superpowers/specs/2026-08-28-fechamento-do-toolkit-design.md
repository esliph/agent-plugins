# Fechamento do toolkit — especificação

As sete fases da spec `LIVING-DOCUMENTATION-TOOLKIT.md` estão implementadas: as
skills, os agents, os hooks, os checks e os comandos existem, com teste. Esta
spec não os substitui nem os repete. Ela aponta **o que a spec original pede e o
código não entrega**, **o que ela escreveu como regra e não alocou a peça
nenhuma**, e **o que só aparece quando o toolkit é instalado num repositório que
não é ele mesmo**.

Cada lacuna tem ID citável — `L-n` — e a origem nomeada na spec original. Peça
nova ganha ID na mesma numeração do toolkit (`CI-9`, `CI-10`, `HK-8`), porque
uma peça sem ID não é cobrável e este documento vira lista de desejos.

**Insumo obrigatório de quem for planejar**: `LIVING-DOCUMENTATION-TOOLKIT.md`
(a spec que manda), `LIVING-DOCUMENTATION.md` (a pesquisa), e
`docs/superpowers/plans/BACKLOG-fases-3-7.md` (o que cada fase apurou). Nada do
conteúdo deles é copiado para cá.

---

## 1. As dez lacunas

| ID | Lacuna | Origem na spec original | Evidência |
| --- | --- | --- | --- |
| `L-1` | O `init` não instala o enforcement | §5, `SK-0` — "Dona de: … a instalação de `HK-*` e `CI-*`"; passo 4 | `src/cli/init.ts` não menciona `workflow`, `.github` nem `.claude`; `templates/` não tem template de workflow; `RF-0003` cristalizou "instala apenas a **moldura**" |
| `L-2` | O plugin não tem caminho de instalação | §10, fases; `SK-0` passo 4 | Não existe `marketplace.json`; `.claude/` deste repositório só tem `scheduled_tasks.lock`; os sete hooks nunca rodaram numa sessão — só por payload em `test/hooks/` |
| `L-3` | O critério de aceite 4 não tem mecanismo, requisito nem teste | §12, critério 4; §5, `SK-3` regra 1 e `SK-4` regra 5 | Não há regra de negócio para ele em `docs/requirements/rules.md`; nenhum hook impede implementar com decisão aberta; `test/acceptance/spec-criteria.test.ts` cobre 1, 2, 3, 5, 6, 7 e 8 |
| `L-4` | Os critérios de aceite 9 e 10 não têm prova | §12, critérios 9 e 10 | O 9 está coberto pela metade em `test/docs/agent-contract.test.ts` (índice, não conteúdo); a metade do loop "erro → linha" não tem registro. O 10 não tem teste |
| `L-5` | Bump em massa de `last-reviewed` não é detectado | §2, regra 3; §13 | Todo outro anti-requisito da §13 tem peça; este não |
| `L-6` | `trigger` do artefato e `description` da skill dona não são comparados | §11 — "dizem a mesma coisa … se divergirem, o documento declara um gatilho que nada dispara" | `test/plugin/authoring.test.ts` valida a `description`; `CI-1` valida o `trigger`; nada cruza os dois |
| `L-7` | `--stage multi-team` não existe, e a skill manda escolhê-lo | §9, mapeamento por estágio; §5, `SK-0` passo 2 | `src/cli/init.ts` declara `solo`, `small-team` e `production`; `plugin/skills/living-docs-bootstrap/SKILL.md` passo 2 manda determinar entre quatro, incluindo "múltiplos times" |
| `L-8` | Duas regras escritas sem check: ID na mensagem de commit, e o orçamento de tempo | §11, idioma e commits; §9 — "rodam em minutos, no PR" | `src/git/diff.ts` já expõe `commitMessages`, usado só para rótulo de exceção; `RNF-0001` cobre o teto do hook, e nenhum requisito cobre o do check |
| `L-9` | O enforcement não é vigiado por `watches` | §3, mecanismo 1 | `.github/workflows/` não está em `watches` nem em `consumer-visible-paths` do `docs/.ownership.yml` |
| `L-10` | A forma escrita do ID é do toolkit, não do projeto | §8, sintaxe de citação; §5, `SK-0` passo 1; §12, critério 1 | `src/docs/schema.ts` e `src/ids/citations.ts` exigem hífen e três a quatro dígitos. O consumidor real escreve `RF001`, `RNF001`, `RN009` e `DA001` — 97 regras, já citadas assim nos testes dele |

`L-10` só existe porque um consumidor real foi olhado. É a lacuna que bloqueia
todas as outras: sem ela resolvida, `L-1` e `L-2` entregam um enforcement que
reprova o consumidor 97 vezes na primeira execução.

---

## 2. Escopo

**Dentro** — `L-1`, `L-2`, `L-3`, `L-5`, `L-6`, `L-7`, `L-8`, `L-9` e `L-10`.
O critério de entrada é o corolário 4 da §1 da spec original: cada item Dentro
vira um requisito com ID e uma peça que o verifica. Item que não vira peça não
entra.

**Fora, e por quê:**

| Fora | Razão |
| --- | --- |
| `L-4` — critérios de aceite 9 e 10 | São verificação humana por natureza. "Um agente errou por falta de contexto" não é observável por máquina, e "nenhuma métrica de volume documental" é a ausência de uma coisa. A §11 da spec original já admite item de checklist verificável só por gente, dito explicitamente — é assim que os dois ficam: linha na Definition of Done, marcada humana, e não um check que finge medir |
| Quality Attribute Scenarios / NFR budget, e Domain model / invariantes (camada 3 da pesquisa) | A spec original não os colocou nem em "Dentro" nem em "Fora". São extensão de escopo, não buraco de implementação, e entram pelo mesmo ponto de extensão que C4 e runbooks: uma entrada em `docs/.ownership.yml` e uma skill dona |
| Test strategy e Onboarding path (camada 7 da pesquisa) | Mesma razão. O style guide, que estava na mesma tabela da pesquisa, foi absorvido pela `SK-6`; estes dois não, e continuam fora até alguém pedir |
| Camadas 4 e 6 inteiras, event catalog, RFC longo, feature spec | A §"Escopo" da spec original já as recusa por escrito. Esta spec não reabre |

---

## 3. Identidade e forma escrita de um ID (`L-10`)

### O problema

A §8 da spec original fixa uma sintaxe de citação e justifica: "uma única
forma, porque é ela que `CI-2` e `CI-3` reconhecem por `grep`". O requisito real
por trás disso é **uma forma por projeto** — é o `grep` que precisa de
determinismo, não o universo. O que a implementação fez foi codificar a forma
do toolkit em dois lugares e tratá-la como universal.

Isso colide de frente com duas coisas que a mesma spec exige: o passo 1 da
`SK-0` ("adotar o que existe … **nunca** criar um paralelo") e o critério de
aceite 1 ("nenhum artefato preexistente foi duplicado ou sobrescrito"). Um
repositório com 97 regras numeradas de outro jeito não tem como ser adotado sem
ser reescrito, e reescrever é o que o critério proíbe.

### A decisão

Separar **identidade** de **forma escrita**. Hoje `canonicalId` faz os dois
papéis; passa a fazer um só.

- **Chave canônica** — interna, invariável, nunca exibida. Continua sendo o que
  compara, o que detecta duplicata e o que fecha par bidirecional. Nenhum check
  muda de lógica.
- **Forma escrita** — declarada pelo projeto em `docs/.ownership.yml`, com o
  formato atual como padrão. É o que o parser reconhece ao ler, e o que o
  toolkit imprime ao sugerir um ID novo.

```yaml
id-format:
  separator: ""      # padrão: "-"
  padding: 3         # padrão: 4
```

Com isso `RN009` e `RN-0009` são o mesmo item, cada projeto escolhe a sua forma,
e nenhum arquivo do consumidor é tocado para que ele seja adotado.

### Por que é barato

Tudo já funila por `canonicalId`. A mudança toca `src/docs/schema.ts` (o padrão
de leitura e a forma canônica), `src/ids/citations.ts` (o padrão de citação, que
já se declara acoplado ao primeiro por comentário) e o único vazamento do
formato fora deles, em `src/checks/ci2-ids.ts`, onde a mensagem do buraco de
sequência monta o ID à mão. A regra que a spec fixa aqui, e que o plano precisa
respeitar: **nenhum check volta a montar um ID por concatenação** — quem escreve
ID é uma função só.

### O que `SK-0` ganha

O inventário passa a **relatar a forma detectada**, não adotá-la em silêncio.
`living-docs init --dry-run` num repositório cujos IDs não estão no formato
padrão diz qual forma encontrou e quantos itens leu naquela forma, e quem
instala confirma. Adoção silenciosa de formato é a mesma classe de erro que
adoção silenciosa de caminho, e a `SK-0` já recusa a segunda.

**Requisito novo** (a `requirements-keeper` aloca o ID): a forma escrita do ID é
declarada pelo projeto, e a identidade de um item não depende dela.

---

## 4. O `init` instala o enforcement (`L-1`, `L-2`, `L-7`)

### O problema

A `SK-0` declara como sua a "instalação de `HK-*` e `CI-*`", e o passo 4 manda
instalar na ordem das fases. O `init` não instala nada disso. `RF-0003`
cristalizou o desvio ao dizer que ele "instala apenas a moldura". O resultado é
um repositório consumidor com documento e nenhum check rodando — que é
exatamente a "promessa" que o corolário 4 da §1 recusa. E o plugin, que traz os
sete hooks, não tem caminho de instalação nenhum: não existe manifesto de
marketplace, e este repositório nunca registrou o próprio plugin.

### A decisão

O `init` passa a escrever, além da moldura, as duas peças de enforcement:

| Peça | O que é | Regra |
| --- | --- | --- |
| Workflow de CI | Um template parametrizado que roda `validate`, e `validate --base`, `drift` e `changelog` quando há base | **Não impõe Docker.** `RNF-0002` é regra deste toolkit, não do consumidor: o workflow instalado roda como o resto do CI do consumidor roda, e o template recebe o modo de invocação |
| Registro do plugin | A entrada que liga os sete hooks na sessão, mais o manifesto de marketplace na raiz do toolkit | Instalado por **mesclagem** |

A regra que governa as duas é a que o `init` já pratica com o `CODEOWNERS` e
com os artefatos de requisito: **mesclar, nunca sobrescrever**. Um consumidor
com hooks próprios registrados e com workflows por diretório mantém tudo o que
tem; o toolkit acrescenta o que falta e nada mais. Rodar duas vezes não duplica
entrada — a idempotência da `SK-0` vale para o enforcement igual vale para o
documento.

`--stage multi-team` passa a existir, e agora com conteúdo: é o estágio que
instala a Fase 7. O argumento que o recusava — "instalaria o mesmo conjunto de
arquivos que `production`" — cai junto com `L-1`, porque a partir daqui um
estágio instala enforcement, e enforcement é arquivo. A `SK-0` deixa de mandar
escolher um valor que o CLI rejeita.

**Requisitos novos**: o `init` instala o enforcement do estágio, mesclando com o
que já existe; e o conjunto de enforcement instalado é o das fases do estágio,
nem mais nem menos.

---

## 5. Comportamento sem regra deixa de ser só prosa (`L-3`)

### O problema

O critério de aceite 4 diz: comportamento sem regra escrita vira uma decisão
aberta, **e a implementação não acontece**. A primeira metade é ofício de skill
e está escrita. A segunda não tem peça: nenhum hook, nenhum check e nenhum
teste. É a promessa central do toolkit — a que a pesquisa chama de o artefato
que mais evita retrabalho — e é a única do §12 sustentada só por boa vontade.

### A decisão

A parte semântica ("isto é uma lacuna?") continua na `SK-3`, onde a §1 manda que
fique. O que se acrescenta é o pedaço determinístico, e ele existe porque uma
decisão aberta já sabe o que bloqueia — o consumidor real escreve isso à mão,
como campo de impacto, hoje.

Uma decisão aberta ganha um campo que nomeia **os caminhos que ela bloqueia**.
Daí saem duas peças:

| Peça | Evento | Decisão | O que faz |
| --- | --- | --- | --- |
| `HK-8` | `PreToolUse` / `Edit\|Write` | `ask` | Editar caminho reivindicado por decisão aberta pergunta, nomeando a decisão, o que ela bloqueia e a skill dona |
| — | `CI-7`, metade do diff | erro | Diff que toca caminho reivindicado por decisão aberta reprova, com a mesma saída escrita que as outras metades do `CI-7` já aceitam |

`HK-8` **pergunta, não nega**. Negar exigiria que o hook julgasse se aquela
edição é a implementação da regra que falta ou outra coisa qualquer no mesmo
caminho — e hook que julga está no lugar errado (§1, corolário 1). O campo é
opcional: decisão aberta sem caminho declarado continua válida, e não bloqueia
nada. O que a spec recusa é o contrário — declarar o caminho e não ser lembrado.

**Requisito novo**: caminho reivindicado por decisão aberta é lembrado na edição
e cobrado no diff, e a saída é a razão escrita.

Mais o teste de aceite do critério 4, que hoje não existe. O plano da Fase 0
chegou a rotular o teste do `HK-3` como sendo dele; o teste está correto e o
rótulo estava errado — o critério 4 nunca foi coberto.

---

## 6. As regras escritas sem check (`L-5`, `L-6`, `L-8`)

Três regras que a spec original escreveu e não alocou a peça nenhuma. Pelo
corolário 4 da §1, ou ganham check, ou deviam sair da spec. Ganham check.

### `CI-9` — disciplina do commit

Roda no grupo que já recebe o diff por injeção (`validate --base`), pela mesma
razão que `CI-6` e a segunda metade do `CI-7`: precisa do diff, e `validate` sem
base não o tem. Duas metades:

1. **Bump em massa de `last-reviewed`** (§2 regra 3, §13). Falha quando vários
   documentos têm a data de revisão alterada no mesmo commit sem outra mudança
   no corpo. Um documento revisado de verdade muda em mais do que a data; vinte
   documentos que só mudaram a data são o mecanismo 4 sendo desligado enquanto
   se finge cumpri-lo. O limiar é escrito e configurável, como o do `ADR-0009`.
2. **Commit que altera artefato sem citar o ID afetado** (§11). É o que torna o
   `git log` navegável por regra. `src/git/diff.ts` já entrega as mensagens; hoje
   elas só servem para rótulo de exceção.

Não entra no `CI-2`: o ID lint roda sem diff e precisa continuar assim.

### `CI-10` — o gatilho e o roteamento dizem a mesma coisa

Roda em `validate`. O `trigger:` de um artefato e a `description:` da skill dona
declarada em `docs/.ownership.yml` precisam falar do mesmo evento. A §11 é
explícita sobre o custo de divergirem: "o documento declara um gatilho que nada
dispara" — o mecanismo 2 e o roteamento de skill deixam de se encontrar.

É o único check que atravessa as duas raízes do `ADR-0003`: o artefato mora no
repositório validado e a skill mora no toolkit. Quando a skill dona declarada
não existe na raiz do toolkit, o check **avisa e segue** — um repositório pode
declarar skill própria, e reprovar por isso seria o check exigindo que todo dono
fosse do plugin.

O limiar de semelhança segue o precedente do `ADR-0009`, e pela mesma razão:
comparação textual é o único lugar do toolkit com risco real de falso positivo,
e o limiar precisa estar escrito para poder ser discutido.

### O que muda de público

`CI-9` e `CI-10` entram no catálogo de checks, e o catálogo é contrato gerado e
visível a quem consome. A consequência é o próprio toolkit cobrando entrada de
CHANGELOG e deriva de contrato de si mesmo — que é o mecanismo funcionando, não
um obstáculo a contornar.

---

## 7. O enforcement se vigia, e cabe no tempo (`L-9`, `L-8`)

**O enforcement entra em `watches`.** O workflow de CI é o que faz toda regra
deste repositório valer, e mudá-lo hoje não dispara lembrete nem cobra entrada
de CHANGELOG. Passa a ter doc dono vigiado e a contar como visível a quem
consome — porque é literalmente o que o consumidor instala.

**O orçamento de tempo vira requisito.** A §9 exige que os checks rodem "em
minutos, no PR" e nada mede. `RNF-0001` cobre o teto de 5 segundos do hook e não
diz nada do check. Os três candidatos a estourar são conhecidos: `CI-5` executa
subprocesso, `CI-7` compara frase com frase, `CI-8` varre o corpus inteiro.

**Requisito novo**: o conjunto de checks tem teto de tempo declarado, medido, e
o teto é do conjunto — não de cada check —, porque é o conjunto que roda no PR.

---

## 8. A adoção do consumidor

O consumidor é o repositório que motivou a pesquisa. O que ele tem hoje, e que a
instalação precisa atravessar sem quebrar nada:

| O que existe lá | O que isso exige |
| --- | --- |
| 97 regras e 15 requisitos funcionais em arquivo único, com IDs sem hífen, já citados assim nos testes | `L-10` resolvido. Sem isso, nada mais desta seção acontece |
| Duas decisões abertas em seções, com contexto, alternativas, recomendação e situação em prosa | O coletor de coleção por seções já existe; o mapa de campos do `docs/.ownership.yml` cobre a diferença de nome. A situação em prosa precisa virar estado da máquina — é ato humano, não conversão automática |
| `docs/adr/` vazio | Já está na lista de adoção do `init`. Nasce adotado, não recriado |
| Hooks próprios já registrados na sessão | A mesclagem da §4. Nenhum hook do consumidor é perdido |
| CI por diretório, com filtro de caminho e sem Docker | O workflow parametrizado da §4 |
| `docs/architecture/` e `docs/domains/` — camada 4 | Ver abaixo |
| Sem `CODEOWNERS` | O `init` já escreve |

### A camada 4 e o ponto de extensão

Documentação de arquitetura está fora do escopo da spec original, e cai no
corpus de `CI-7` e `CI-8` no primeiro dia — porque o corpus é tudo que vive sob
a raiz da documentação, e não uma lista de tipos conhecidos.

O tratamento que esta spec fixa: entram declaradas com **dono e sem skill**, que
é a categoria que este repositório já usa para os planos, para a spec e para o
README. Ganham dono, link verificado e cobrança de revisão; não ganham keeper,
máquina de estados nem família de IDs.

É o ponto de extensão sendo exercitado de verdade pela primeira vez, e o teste é
binário: **se adotar a camada 4 exigir tocar em algum check, o ponto de extensão
não era o que a spec dizia que era**. Esse resultado é entregável do plano, seja
qual for.

---

## 9. As peças novas, reunidas

| Peça | Tipo | O que resolve |
| --- | --- | --- |
| `id-format` no mapa de propriedade | Configuração | `L-10` |
| Forma escrita separada da chave canônica | Engine | `L-10` |
| Relato da forma detectada no inventário | `SK-0` | `L-10` |
| Template de workflow parametrizado | Template | `L-1` |
| Registro do plugin e manifesto de marketplace | Template + raiz do toolkit | `L-2` |
| Mesclagem do enforcement no `init` | CLI | `L-1`, `L-2` |
| `--stage multi-team` | CLI + `SK-0` | `L-7` |
| Campo de caminhos bloqueados na decisão aberta | Contrato de máquina | `L-3` |
| `HK-8` | Hook (`ask`) | `L-3` |
| Achado de caminho bloqueado no `CI-7` | Check | `L-3` |
| `CI-9` | Check (grupo do diff) | `L-5`, `L-8` |
| `CI-10` | Check (`validate`) | `L-6` |
| `.github/workflows/` em `watches` | Mapa de propriedade | `L-9` |
| Teto de tempo do conjunto de checks | Requisito não funcional | `L-8` |

Nenhum ID de requisito é pré-alocado aqui. Requisito sem número não é citável, e
citar número que não existe reprova no `CI-2` — quem numera é a
`requirements-keeper`, no plano, antes do código.

---

## 10. Critérios de aceite

1. **Dado** um repositório cujos IDs não usam a forma padrão, **quando** o
   inventário roda, **então** ele relata a forma detectada e quantos itens leu
   nela, e **nenhum** arquivo do repositório é alterado para que ele seja
   adotado.
2. **Dado** um projeto com a forma escrita declarada, **quando** os checks
   rodam, **então** identidade, duplicata, par bidirecional e citação funcionam
   como antes — e nenhum check monta um ID por concatenação.
3. **Dado** um repositório sem enforcement, **quando** o `init` roda, **então**
   existe workflow de CI e registro de plugin; **e quando** ele roda de novo,
   **então** nada é duplicado.
4. **Dado** um repositório com hooks e workflows próprios, **quando** o `init`
   roda, **então** todos continuam lá, e o do toolkit foi acrescentado.
5. **Dado** o estágio de múltiplos times, **quando** o `init` roda, **então** o
   enforcement da Fase 7 é instalado — e a skill não manda mais escolher um
   valor que o CLI rejeita.
6. **Dado** uma decisão aberta que declara os caminhos que bloqueia, **quando**
   um agente edita um deles, **então** é perguntado com a decisão nomeada; **e
   quando** o diff os leva, **então** o CI reprova, e a única saída é a razão
   escrita.
7. **Dado** um commit que só altera a data de revisão de vários documentos,
   **quando** o CI roda, **então** falha nomeando o anti-requisito.
8. **Dado** um commit que altera artefato sem citar o ID afetado, **quando** o
   CI roda, **então** falha nomeando o artefato.
9. **Dado** um artefato cujo gatilho não fala do mesmo evento que a
   `description` da skill dona, **quando** o CI roda, **então** falha nomeando
   os dois; **e dado** que a skill dona não existe na raiz do toolkit,
   **então** avisa e segue.
10. **Dado** o conjunto completo de checks, **quando** ele roda no PR, **então**
    cabe no teto declarado, e o teto é medido — não estimado.
11. **Dado** uma alteração no workflow de CI, **quando** se vai commitar,
    **então** o doc dono é cobrado e a entrada de CHANGELOG é exigida.
12. **Dado** o consumidor real, **quando** o toolkit é instalado nele,
    **então** as 97 regras, as decisões abertas e o diretório de ADRs vazio são
    **adotados** — nenhum arquivo preexistente reescrito —, a documentação de
    arquitetura entra com dono e sem skill **sem que nenhum check mude**, e
    `validate` roda no CI dele.

---

## 11. Anti-requisitos

O fechamento falha se produzir qualquer um destes:

- **Renumerar o consumidor para caber no toolkit.** É sobrescrever preexistente,
  e o critério 1 da spec original o proíbe. Se a forma escrita não puder ser
  declarada, a lacuna volta para a mesa — não se resolve com um diff de 97
  regras.
- **Hook que julga.** `HK-8` pergunta. Um hook que decidisse se uma edição é "a
  implementação da regra que falta" está no lugar errado.
- **Check que mede volume.** Nem `CI-9` nem `CI-10` contam documentos, linhas ou
  cobertura. Contam divergência entre coisas que deveriam concordar.
- **Estágio que instala moldura vazia.** `multi-team` só existe porque passa a
  ter enforcement atrás. Um rótulo sem conteúdo é a wiki morta nascendo de
  fábrica.
- **Enforcement que sobrescreve o do consumidor.** Instalar apagando o que já
  existe é a duplicata do passo 1 da `SK-0` vista do outro lado.
- **Impor Docker a quem instala.** É regra deste toolkit, e não de quem o usa.
- **Pré-alocar ID de requisito nesta spec.** Quem numera é a skill dona.
- **Inventar `CI-11` para medir o que só um humano verifica.** O critério de
  aceite 9 e o 10 ficam como linha marcada humana na Definition of Done. Um
  check que fingisse medi-los seria pior que a ausência dele.

---

## 12. Dependências, para quem for planejar

A ordem não é gosto — cada item usa o que o anterior instalou:

1. **`L-10` primeiro, e sozinho.** É Fase 0 da spec original: identidade de ID é
   a parte que menos deveria mudar, e por isso muda antes de tudo, com o
   repositório inteiro como rede. Nada mais desta spec pode ser provado contra o
   consumidor real enquanto ela não fechar.
2. **`L-1`, `L-2` e `L-7` juntos.** São a mesma entrega vista de três ângulos: o
   `init` passa a instalar enforcement, o plugin passa a ter como ser instalado,
   e o estágio que faltava passa a ter conteúdo.
3. **`L-3`.** Depende do contrato de máquina da decisão aberta ganhar o campo
   novo, e o campo precisa estar declarado antes de `HK-8` e do achado no
   `CI-7` existirem.
4. **`L-5`, `L-6` e `L-8` em qualquer ordem entre si.** `CI-9` entra no grupo
   que já recebe o diff; `CI-10` entra em `validate`; o teto de tempo é medido
   depois que os dois existem, senão a medida nasce velha.
5. **`L-9` junto com o primeiro item que mexer no workflow**, que é o 2.
6. **A adoção do consumidor por último**, porque é a prova — não o experimento.
   Ela é o único item cujo resultado pode invalidar uma decisão desta spec, e é
   por isso que vem depois de tudo estar em pé, e não antes.
