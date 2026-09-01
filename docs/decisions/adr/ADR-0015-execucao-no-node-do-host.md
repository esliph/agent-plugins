---
id: ADR-0015
title: Execução no Node do host, TypeScript sem build step
status: draft
owner: '@esliph/engineering'
trigger: >
    Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-01
relates-to: [RNF-0002, RNF-0003]
supersedes: ADR-0001
superseded-by: null
---

# ADR-0015 — Execução no Node do host, TypeScript sem build step

## Contexto

`ADR-0001` decidiu o container partindo de uma premissa sobre a máquina de quem
desenvolve: que ela não tem Node e não deve passar a ter. A premissa deixou de
valer, e a perda que aquele ADR declarou e aceitou passou a ser cobrada todo dia:
com o container parado, o CLI sai com código 2 e os hooks falham abertos, então
**o enforcement local desaparece em silêncio** — exatamente no componente cuja
falha precisa ser visível.

Node 24 é o mesmo runtime que o container carregava. Trazê-lo para o host não
muda o que executa; muda apenas quem hospeda.

## Alternativas consideradas

- **Manter o container e detectar quando ele está parado.** Descartada: o hook
  tem teto de 5 s e falha aberta por contrato (`RNF-0001`); um aviso emitido de
  dentro de um caminho que precisa calar em caso de erro ou vira ruído em toda
  invocação, ou não aparece justamente quando importa.
- **Publicar o toolkit em npm e instalá-lo como dependência do próprio
  repositório.** Descartada nesta decisão: é `DA-0003`, e ela é sobre como o
  toolkit chega a um repositório **consumidor**. Resolver a execução local não
  exige resolvê-la, e misturar as duas emperra a que já está madura.
- **Compilar TypeScript para `dist/` agora que não há container.** Descartada
  pelo mesmo motivo de `ADR-0001`, que continua valendo: um `dist/`
  desatualizado faz o hook rodar código velho silenciosamente.

## Decisão

O toolkit executa no `node` do host, versão 24 ou maior, com as dependências
instaladas por `npm ci`. `plugin/hooks/run-hook.sh` invoca `node` direto,
derivando a raiz do toolkit do caminho do próprio script; o workflow instala
Node com `actions/setup-node` e roda `node src/cli/index.ts`.

**A metade não-Docker de `ADR-0001` sobrevive intacta e passa a ser carregada
por esta decisão:** o código continua sendo TypeScript executado diretamente
pelo type-stripping nativo, sem build step, com `tsc --noEmit` como
type-checker — e continuamos restritos à sintaxe TypeScript apagável: sem
`enum`, sem `namespace`, sem decorators.

`ADR-0003` não é tocado. As duas raízes continuam distintas e continuam vindo
das mesmas fontes: `import.meta.dirname` para a do toolkit, diretório de
trabalho para a do repositório validado.

## Consequências

### O que se ganha

O enforcement local para de depender do estado de um daemon: não há mais janela
em que os hooks calam porque alguém não subiu o container. Some a construção de
imagem do CI e some a camada de indireção entre editar e executar — o comando
que a documentação ensina é o comando que roda.

### O que se aceita perder

**O host passa a precisar de Node ≥ 24.** Uma máquina com Node mais velho, ou
sem Node, deixa de conseguir rodar o toolkit sem instalar nada — que era
precisamente o que `ADR-0001` comprava. Quem clonar numa máquina assim descobre
pelo erro do `node`, não por uma mensagem nossa.

Perde-se também a reprodutibilidade que a imagem dava: a versão exata do runtime
passa a ser responsabilidade de cada máquina, e uma diferença de patch entre o
host de alguém e o `ubuntu-latest` do CI vira uma classe de divergência que antes
não existia.

`compose.yaml`, `Dockerfile` e `bin/living-docs` ficam no repositório sem nenhum
documento, teste ou passo de CI que os invoque. É atalho consciente, registrado
em `TDR-0002`.
