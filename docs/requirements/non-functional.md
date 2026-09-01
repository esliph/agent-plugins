---
title: Requisitos não funcionais
owner: '@esliph/engineering'
trigger: >
    Antes de implementar qualquer comportamento desta família, e a toda regra nova
    ou alterada.
last-reviewed: 2026-08-27
---

# Requisitos não funcionais

Cada requisito é uma seção com ID citável. Formato: `templates/requirements.md`.

## RNF-0001 — Hook falha aberta, em até 5 segundos, sem rede

- **status:** active
- **fora de escopo:** o CI, que falha fechado de propósito

Qualquer erro na execução de um hook — configuração ilegível, dependência
ausente, timeout — resulta em deixar passar. O enforcement que sobrevive a hook
quebrado é o CI; hook quebrado que trava o trabalho é removido pelo usuário no
primeiro dia, e aí não há enforcement nenhum.

## RNF-0002 — O toolkit roda no Node do host, sem passo de build

- **status:** active
- **relates-to:** ADR-0015
- **fora de escopo:** o `git`, e como o toolkit chega ao repositório de quem o consome (`DA-0003`)

Node 24 ou maior, e o npm que vem com ele, são o único toolchain exigido de quem
clona este repositório. `npm ci` instala as dependências; `node` executa a fonte
TypeScript direto, sem artefato compilado no meio.

## RNF-0003 — A raiz do toolkit e a do repositório validado são independentes

- **status:** active
- **relates-to:** ADR-0003
- **fora de escopo:** o mecanismo de distribuição do toolkit, que ADR-0003 deliberadamente não decide

Descobrir onde o toolkit está e descobrir qual repositório validar são duas
perguntas distintas, com respostas que podem coincidir e não podem se confundir.

## RNF-0004 — O resultado de um check não depende do relógio nem da máquina

- **status:** active
- **relates-to:** ADR-0007
- **fora de escopo:** o valor de `stale-after-months`, que é configuração do projeto

Dados a mesma árvore, a mesma configuração e a mesma data, dois checks
produzem o mesmo resultado. A data entra por valor, de quem chama; nenhum check
e nenhum hook lê o relógio por dentro.

Sem isso, o único teste possível para o que depende de tempo é o que passa hoje
e reprova em seis meses — e teste que reprova sozinho é teste que se apaga.

## RNF-0005 — O conjunto de checks cabe num teto de tempo declarado e medido

- **status:** draft
- **fora de escopo:** o tempo de cada check isolado, e o tempo de construção da imagem

A spec exige que os checks rodem "em minutos, no PR". O teto é do **conjunto**,
não de cada check — é o conjunto que roda no PR —, está declarado no código e é
**medido** a cada execução, nunca estimado. Um orçamento que ninguém mede é uma
intenção, e a primeira execução lenta o descobre em produção.

