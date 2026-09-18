---
title: Regras de negócio
owner: '@esliph/engineering'
trigger: >
  Antes de implementar qualquer comportamento desta família, e a toda regra nova
  ou alterada.
last-reviewed: 2026-09-18
---

# Regras de negócio

Cada requisito é uma seção com ID citável. O ID nunca é reciclado, e é ele que
torna o raio de impacto calculável por `grep`. Formato: `templates/requirements.md`.

## RN-0001 — Todo artefato tem exatamente um dono declarado

- **status:** active
- **relates-to:** ADR-0002
- **fora de escopo:** quem revisa o artefato; isto trata de propriedade, não de revisão

Um artefato de documentação viva pertence a um e apenas um dono, declarado em
`docs/.ownership.yml` e espelhado no CODEOWNERS. Dois donos para o mesmo caminho
é divergência garantida; zero donos torna o artefato órfão e não enforceável.

## RN-0002 — `trigger` nomeia um evento observável, nunca uma cadência

- **status:** active
- **fora de escopo:** a redação do gatilho; o que se exige é a natureza dele

O campo `trigger` declara **quando** o artefato deve ser atualizado, e a resposta
é sempre um evento que alguém pode observar acontecer. Data de calendário
("trimestral", "a cada sprint") descreve intenção de revisão, não necessidade de
mudança — e é o que transforma documento em ritual.

## RN-0003 — Um ID identifica um item, para sempre

- **status:** active
- **fora de escopo:** o formato do ID, que é contrato de máquina e não regra de negócio

Um ID nunca identifica dois itens, e nunca é reaproveitado depois que o item
deixa de existir. `ADR-001` e `ADR-0001` são o mesmo ID: repadding não cria um
item novo. Sem isso, uma citação antiga passa a apontar para outra coisa em
silêncio, que é pior do que apontar para nada.

## RN-0004 — Item congelado só muda nos campos da allowlist

- **status:** active
- **relates-to:** RN-0006
- **fora de escopo:** quem decide congelar; isso é a máquina de estados

Um item em estado terminal aceita mudança apenas nos campos que o `.ownership.yml`
declara mutáveis — tipicamente `status`, `superseded-by` e `last-reviewed`. É
essa allowlist que permite supersedir um ADR sem violar a imutabilidade dele.

## RN-0005 — Promoção de estado é ato humano

- **status:** active
- **fora de escopo:** a criação do item, que é ato de agente

Nenhum agente promove sozinho um item para um estado que significa aceitação
(`draft → accepted`, `open → resolved`, `draft → active`, `active → revoked`). O
máximo que uma skill escreve é `draft`/`open`. Aceitar é decidir, e decidir não
é do agente.

## RN-0006 — Estado terminal não permite edição do corpo

- **status:** active
- **relates-to:** TDR-0001
- **fora de escopo:** o congelamento por seção dentro de arquivo de coleção, que TDR-0001 registra como dívida

Um item que chegou ao estado terminal não se corrige: a história é o ativo. Um
ADR aceito que se revelou errado ganha `superseded`, e a decisão nova explica o
erro.

## RN-0007 — Toda citação resolve, ou o CI falha

- **status:** active
- **fora de escopo:** citação a prefixo não declarado no `.ownership.yml`, que é ignorada de propósito para permitir instalação por fases

Uma referência `<PREFIXO>-<número>` a um prefixo conhecido aponta para um item
existente e não retirado. Citação pendurada é pior que ausência de citação:
ela afirma uma rastreabilidade que não existe.

## RN-0008 — Caminho vigiado e doc dono viajam no mesmo commit

- **status:** active
- **relates-to:** RN-0001
- **fora de escopo:** qual caminho exige qual doc, que é configuração do projeto e mora em `watches`

Um caminho de código declarado em `watches` tem um documento dono, e a mudança
dos dois cabe no mesmo commit. Documentação que espera um segundo PR é
documentação que não acontece: quem a adiaria já está com o contexto na cabeça
agora, e não estará depois.

Quando a mudança realmente não afeta o doc, quem decide isso é uma pessoa, no
momento em que o enforcement pergunta — não o agente, e não o silêncio.

## RN-0009 — O enforcement do vínculo código→doc lembra e pergunta, nunca nega

- **status:** active
- **relates-to:** RN-0008
- **fora de escopo:** o congelamento de item imutável (`RN-0006`), que nega por outro motivo

O que liga código a documento informa (`additionalContext`) ou pergunta
(`ask`). Nunca bloqueia. Um atalho legítimo existe e precisa ser possível: o
enforcement que impede um commit honesto é desligado no primeiro dia, e um
enforcement desligado não protege nada.

Isto não afrouxa `RN-0006`: item congelado continua sendo `deny`. A diferença é
o que se protege — lá, uma história que não se reescreve; aqui, um hábito que se
ensina.

## RN-0010 — O contrato do agente é índice e política, não conteúdo

- **status:** active
- **fora de escopo:** a detecção automática de duplicação textual, que é `CI-7` e chega na Fase 7

O documento que orienta agentes (`CLAUDE.md`, `AGENTS.md`) aponta onde a verdade
mora e declara o que nunca fazer. Toda afirmação factual vive no artefato dono e
é linkada de lá.

Conteúdo copiado para dentro dele apodrece igual a qualquer duplicata — com o
agravante de ser lido em toda sessão, o que faz a versão velha ganhar da nova
por repetição.

## RN-0011 — Termo do glossary tem um significado só, identificado pelo nome

- **status:** active
- **relates-to:** ADR-0004
- **fora de escopo:** a declaração de `docs/glossary.md` em `artifacts:` no `.ownership.yml` — fica em aberto por `DA-0002` (`ADR-0004` não a resolve)

Um termo do glossary é identificado pelo nome — não por um ID numerado do
tipo `<PREFIXO>-<número>` — e cobre exatamente um significado. Duas coisas
com o mesmo nome não são a mesma entrada: criam-se dois termos, e um deles é
`banned`, apontando o substituto. Divergência entre o nome no código e o
termo é bug a corrigir no código, não um segundo termo no glossary.

## RN-0012 — Artefato gerado não se edita: muda-se a fonte

- **status:** active
- **relates-to:** ADR-0005
- **fora de escopo:** qual é a fonte de cada artefato gerado, que é
  configuração do projeto e mora em `generated[].command`

Um artefato declarado em `generated[]`, ou que carrega o marcador
`generated: do not edit`, só muda por execução do gerador. Uma edição à mão
sobrevive até a próxima execução e mente até lá — com o agravante de parecer
verdade assinada por uma ferramenta.

O que se escreve à mão é a política em volta do contrato — versionamento,
depreciação, catálogo de erros —, nunca o contrato.

## RN-0013 — Mudança visível ao consumidor viaja com a entrada de CHANGELOG

- **status:** active
- **relates-to:** ADR-0006
- **fora de escopo:** o formato da entrada, que é Keep a Changelog e mora no
  template, não nesta regra

Uma mudança que toca caminho declarado em `consumer-visible-paths` leva, no
mesmo diff, a entrada em `## [Unreleased]` do doc marcado
`consumer-visible: true` — ou uma razão escrita, no formato
`Changelog: none — <razão>`, em alguma mensagem de commit do intervalo. Rótulo
sem razão não é exceção: é a caixinha marcada.

A entrada é voltada a quem consome o software. Teste único: se ela só faz
sentido para quem escreveu o código, ela não pertence ao CHANGELOG — e um
CHANGELOG derivado do `git log` é o documento que narra o código, que a spec
§13 recusa.

## RN-0014 — Atalho consciente vira dívida registrada, e o lembrete nunca bloqueia

- **status:** active
- **relates-to:** RN-0013
- **fora de escopo:** arquivos Markdown, onde `TODO` e `FIXME` são prosa sobre
  o marcador e não o marcador

Marcador de atalho novo — `TODO`, `FIXME`, `HACK`, `XXX`, supressão de tipo ou
de lint, teste ignorado — sem um `TDR-nnnn` a até duas linhas de distância
gera lembrete, com o caminho para registrar a dívida. Nunca bloqueio: um atalho
legítimo existe, e um hook que o proíbe ensina a escondê-lo com outro nome.

O que se cobra é o registro do atalho com gatilho de pagamento observável, não
a ausência do atalho.

## RN-0015 — Depreciação sem as quatro coisas não é depreciação

- **status:** active
- **relates-to:** RN-0013
- **fora de escopo:** o prazo entre anúncio e remoção, que é política de
  versionamento do projeto e mora em `docs/contracts/versioning-policy.md`

Uma entrada de depreciação registra quatro coisas: a data do anúncio, a versão
ou data de remoção, o substituto, e o link para o guia de migração. Faltando
qualquer uma, não é depreciação — é quebra de compatibilidade anunciada, e
passa por ADR.

Anunciar remoção sem lugar para o guia de migração é a depreciação que ninguém
consegue seguir.

## RN-0016 — Documento sem dono declarado não passa

- **status:** active
- **relates-to:** ADR-0008, RN-0001
- **fora de escopo:** quem é o dono, que é do projeto e mora no `.ownership.yml` e no CODEOWNERS

Todo arquivo sob a raiz da documentação, e todo caminho declarado que mora fora
dela, tem entrada no `.ownership.yml` — em `artifacts:`, em `documents:` ou em
`generated:` — **e** linha no CODEOWNERS. Os dois lugares, não um: o
`.ownership.yml` diz qual skill responde, o CODEOWNERS diz quem revisa, e
documento com dono em um lugar só é documento cujo dono desaparece na primeira
dúvida.

Artefato e documento não são a mesma coisa. Artefato tem família de IDs, ciclo
de vida e congelamento; documento tem dono, e talvez uma skill. Os dois têm
dono, e é isso que esta regra cobra.

## RN-0017 — Item de Definition of Done sem verificação nomeada não é item

- **status:** active
- **relates-to:** RN-0016
- **fora de escopo:** se a verificação nomeada é boa o suficiente, que é julgamento humano

Cada caixa da Definition of Done nomeia o que a verifica: um ID de check, um ID
de hook, ou a palavra que marca verificação humana. Item sem verificação é
intenção, e intenção não é definição de pronto.

É a Definition of Done que dá autoridade ao enforcement: item que ninguém
verifica é item que nenhum check tem como cobrar.

## RN-0018 — Documento vencido avisa; dívida com gatilho cumprido reprova

- **status:** active
- **relates-to:** ADR-0007, RN-0002
- **fora de escopo:** o valor de `stale-after-months`, que é configuração do projeto

`last-reviewed` além do limite do projeto gera **aviso** e não reprova o build:
a correção é ler o documento, e build vermelho empurra para o bump em massa que
desliga o mecanismo fingindo cumpri-lo.

Dívida `open` cujo gatilho de pagamento já aconteceu **reprova**, e continua
reprovando até que a dívida seja paga ou reclassificada. As duas coisas são ato
humano.

Item em estado congelado não vence. Não há o que revisar num item cujo corpo não
se edita, e avisar sobre ele ensinaria justamente o bump que a regra recusa.

## RN-0019 — Dívida `open` declara o gatilho de pagamento de forma verificável

- **status:** active
- **relates-to:** ADR-0007, RN-0018
- **fora de escopo:** a redação em prosa do gatilho, que continua no corpo, é para gente ler, e é ela que explica o porquê

Uma dívida `open` declara `pay-when` com um padrão e os caminhos onde ele é
procurado. Gatilho que só existe em prosa não é verificável, e gatilho não
verificável é `TODO` órfão com número — a coisa que a dívida registrada existia
para não ser.

O padrão nomeia uma condição no repositório, não uma data. Dívida não vence no
calendário: vence quando a condição que a tornava aceitável deixa de valer.

## RN-0020 — O contrato do agente não repete texto de artefato dono, e o limiar é escrito

- **status:** active
- **relates-to:** RN-0010, ADR-0009
- **fora de escopo:** duplicata por paráfrase, que nenhum check detecta e cuja recusa é humana

Uma frase de doze palavras ou mais do contrato do agente que reapareça, palavra
por palavra, num artefato com skill dona é duplicata e reprova. A correção é
apagar a frase e deixar o ponteiro para o artefato dono.

Abaixo do limiar é vocabulário compartilhado, não conteúdo copiado. O contrato
do agente fala das mesmas coisas que os artefatos donos falam — é a função dele
— e um check que reprovasse vocabulário compartilhado seria desligado no
primeiro dia, deixando a regra sem enforcement nenhum.

## RN-0021 — Caminho vigiado sem doc dono reprova no CI, e a saída é a razão escrita

- **status:** active
- **relates-to:** RN-0008, RN-0009, ADR-0010
- **fora de escopo:** o momento do commit, onde o enforcement pergunta em vez de reprovar (`RN-0009`)

No CI, o diff que toca caminho vigiado sem o doc dono reprova. A única saída é
uma razão escrita em alguma mensagem de commit do intervalo, no formato
`Docs: none — <razão>`. Rótulo sem razão não é exceção: é a caixinha marcada.

Isto não afrouxa nem contradiz `RN-0009`: lá quem enforce é um hook, no momento
em que existe uma pessoa para responder à pergunta; aqui não existe pessoa
nenhuma, e o custo do silêncio é uma documentação desatualizada passando com a
autoridade de um CI verde.

## RN-0022 — O início de sessão entrega o inventário, e nunca bloqueia

- **status:** active
- **relates-to:** RN-0009
- **fora de escopo:** o que fazer com o inventário, que é julgamento de quem o recebe

No início de uma sessão, o que está presente e ausente, as decisões abertas, as
dívidas com gatilho cumprido e os documentos vencidos chegam ao contexto sem
ninguém precisar procurar. É injeção de contexto, nunca decisão de permissão.

E é curto por obrigação: inventário que ninguém lê é a wiki morta chegando pelo
outro lado, com o agravante de custar contexto em toda sessão.

## RN-0023 — Link quebrado e anexo binário sob a raiz da documentação reprovam

- **status:** active
- **relates-to:** RN-0016
- **fora de escopo:** âncora dentro do arquivo (`#seção`), que o enforcement não resolve — e diz que não resolve

Link relativo que não resolve para arquivo ou diretório existente, `[[wikilink]]`
sem destino, e arquivo em formato binário sob a raiz da documentação reprovam.
Link quebrado é pior que ausência de link: afirma uma ligação que não existe.
Anexo binário não se lê em diff nem se revisa em PR.

Código não é link: o que está dentro de bloco cercado ou de marcação inline é
exemplo, e cobrar exemplo ensina a não escrever exemplo.

## RN-0024 — A forma escrita de um ID é do projeto; a identidade não depende dela

- **status:** draft
- **relates-to:** ADR-0011, RN-0003
- **fora de escopo:** qual forma um projeto deve escolher, que é decisão dele

Um projeto declara como seus IDs se escrevem — separador e número de dígitos — e
é essa forma que o toolkit reconhece ao ler e imprime ao sugerir um ID novo. A
identidade do item não depende da forma: `RN009` e `RN-0009` são o mesmo item,
pela mesma razão que `ADR-001` e `ADR-0001` sempre foram.

Quem escreve um ID é uma função só. Nenhum check monta ID por concatenação —
formato montado à mão em dois lugares é a garantia de que um deles vai divergir.

## RN-0025 — O enforcement instalado é o das fases do estágio

- **status:** draft
- **relates-to:** ADR-0012, RF-0013
- **fora de escopo:** quais fases cada estágio pede, que é a spec §10

O conjunto de checks que o workflow instalado roda é o das fases do estágio, nem
mais nem menos. Estágio que instala moldura vazia é a wiki morta nascendo de
fábrica; estágio que instala check de fase que o projeto não tem é enforcement
que reprova por algo que ninguém pediu.

Os hooks são peça única, e o que os estagia é a configuração que eles leem: hook
sem a configuração dele fica em silêncio.

## RN-0026 — Caminho reivindicado por decisão aberta é lembrado na edição e cobrado no diff

- **status:** draft
- **relates-to:** ADR-0010, RN-0009
- **fora de escopo:** julgar se uma edição é a implementação da regra que falta — hook que julga está no lugar errado

Uma decisão aberta pode nomear os caminhos que ela bloqueia. Quando nomeia,
editar um deles **pergunta**, nomeando a decisão, o que ela bloqueia e a skill
dona; e o diff que os leva **reprova**, com a razão escrita como única saída.

O campo é opcional: decisão aberta sem caminho declarado continua válida e não
bloqueia nada. O que não se aceita é o contrário — declarar o caminho e não ser
lembrado.

## RN-0027 — Bump em massa de `last-reviewed` reprova

- **status:** draft
- **relates-to:** ADR-0013
- **fora de escopo:** atualizar a data de um documento que mudou de verdade, que é o mecanismo funcionando

Um diff em que vários documentos alteram a data de revisão e nada mais no corpo
reprova, nomeando o anti-requisito. Um documento revisado de verdade muda em mais
do que a data; vinte documentos que só mudaram a data são o mecanismo de revisão
sendo desligado enquanto se finge cumpri-lo.

O limiar é escrito e configurável, e não existe rótulo de exceção: o rótulo seria
a caixinha marcada que o anti-requisito descreve.

## RN-0028 — Commit que altera artefato cita o ID afetado

- **status:** draft
- **fora de escopo:** o formato da mensagem de commit, que é acordo de trabalho e não regra do toolkit

Quando o diff altera um arquivo de artefato, alguma mensagem de commit do mesmo
diff cita ao menos um dos IDs declarados naquele arquivo. É o que torna o
`git log` navegável por regra: sem a citação, o histórico responde "o que mudou"
e nunca "por causa de qual regra".

## RN-0029 — O gatilho do artefato e a `description` da skill dona falam do mesmo evento

- **status:** draft
- **relates-to:** ADR-0013, RN-0010
- **fora de escopo:** o `trigger` de um item dentro de uma coleção, que é do item e não do artefato

O campo `trigger` de um documento e a `description` da skill declarada como dona
dele descrevem o mesmo evento. Se divergirem, o documento declara um gatilho que
nada dispara: o mecanismo de gatilho e o roteamento de skill deixam de se
encontrar, e o documento passa a depender de alguém lembrar dele.

Quando a skill dona declarada não existe na raiz do toolkit, o resultado é aviso
e não falha — um projeto pode declarar skill própria, e reprovar por isso seria
exigir que todo dono fosse do plugin.

## RN-0030 — Documento para quem vem de fora não cita ID de artefato

- **status:** draft
- **relates-to:** ADR-0017, RN-0013
- **fora de escopo:** os identificadores da interface pública, que a política de versionamento declara; o frontmatter, que é contrato de máquina e é de `CI-1`; e o bloco de código cercado, que é exemplo

O corpo de um documento ou artefato declarado `audience: external` não contém
citação a um prefixo declarado em `artifacts:` — nem em prosa, nem entre
crases, nem no caminho de um link. Quem lê de fora não tem como resolver o ID, e
um link até o artefato o leva a um documento escrito para quem mantém o
repositório.

O vínculo que o ID carregaria não se perde: ele existe e mora do lado de dentro,
no próprio artefato ou na mensagem de commit. Conta toda citação a prefixo
declarado — a que resolve, a retirada e a que não resolve —, porque a regra é
sobre o que o leitor vê, e não sobre o item existir.

## RN-0031 — O que o toolkit entrega a quem instala não cita o rastro interno do toolkit

- **status:** draft
- **relates-to:** ADR-0018, RN-0030
- **fora de escopo:** comentário de código e mensagem de commit; os documentos do próprio repositório do toolkit; os IDs do projeto de quem instala que uma mensagem mostra; os identificadores da interface pública, os nomes de skill e os comandos

Os arquivos que o `init` semeia, os templates, o texto do plugin e a saída do
CLI e dos hooks não citam prefixo declarado em `artifacts:` do toolkit, seção da
spec do toolkit nem caminho de documento interno dele. Quem instala não resolve
a citação — ou a resolve para um item seu, com outro significado.

## RN-0032 — O arquivo de ownership v2 é estrito: uma lista `owned`, bloco por plugin, leitura separada de política

- **status:** draft
- **relates-to:** ADR-0020
- **fora de escopo:** o comando de migração de v1 para v2, e o conteúdo dos blocos que cada plugin declara sob o próprio nome

Um arquivo de ownership válido declara `version` em toda instância e, na
raiz, a lista `plugins:` com o nome de todo bloco de primeiro nível que não é
do núcleo. Bloco de primeiro nível cujo nome não está em `plugins:` é erro.
Dentro de uma entrada de `owned`, as chaves que dizem como o parser encontra
o item dentro do arquivo (`collection`, `key`, `state-field`) só são lidas
de dentro de um bloco `format:` — nunca no mesmo nível das chaves de
política.

## RN-0033 — A identidade de um item é uma chave opaca ao núcleo

- **status:** draft
- **relates-to:** ADR-0021
- **fora de escopo:** forma de ID, prefixo, sequência e aposentadoria — que continuam sendo política do plugin dono, não do núcleo

O núcleo garante apenas que a chave de um item não é vazia e é única dentro
do arquivo que a declara, e usa essa chave para parear o item antes e depois
de uma mudança. Ele nunca valida a forma da chave. `state-field`, quando
declarado, nomeia onde o estado do item mora; quando ausente, o padrão é
`status`, sem distinção de maiúscula.

## RN-0034 — Os caminhos governados por todos os arquivos de ownership de um repositório são disjuntos

- **status:** draft
- **relates-to:** ADR-0023
- **fora de escopo:** o que `include:` concede de autoridade — nada, por decisão; e a poda de arquivos fora da base num hook, que é otimização e não regra de cobertura

Resolvidos contra as próprias bases, os `owned[].path` de todos os arquivos
de ownership de um repositório formam um conjunto disjunto: nenhum é igual a
outro, e nenhum é prefixo de diretório de outro. Colisão é erro que nomeia
os dois arquivos e o caminho, ocorra ela dentro de um arquivo, entre
arquivos irmãos ou entre um arquivo e outro que o inclui.
