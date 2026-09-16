---
id: ADR-0018
title: 'O que o toolkit entrega não cita o próprio rastro interno'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-16
relates-to: [RN-0031, ADR-0017]
supersedes: null
superseded-by: null
---

# ADR-0018 — O que o toolkit entrega não cita o próprio rastro interno

## Contexto

O toolkit escreve texto que passa a viver no repositório e na sessão de quem o
instala: os arquivos que o `init` semeia, os comentários do `.ownership.yml` e
do workflow, o texto das skills do plugin e as mensagens de check e de hook.
Esse texto cita ADR, RN e seções da spec do toolkit — rastro que só resolve
dentro do repositório do toolkit. Para quem instala, a citação não existe ou,
pior, resolve para um item dele com outro significado: o `ADR-0008` de quem
instala é a oitava decisão dele. E o `validate` passa sem dizer nada, porque
`CI-2` não lê comentário de YAML nem saída de check.

As sementes, além disso, trazem instrução de preenchimento — a faixa que diz
que o arquivo foi criado pelo `init`, o comentário que nomeia a skill dona — que
fica no documento depois de preenchido e passa a ser lida por quem nunca vai
escrever nele.

`ADR-0017` traçou a fronteira de leitor para os documentos de um repositório.
Esta decisão traça a irmã dela: o que atravessa do toolkit para quem instala.

## Alternativas consideradas

- **Manter.** Descartada: é o problema.
- **Qualificar a citação** ("`RN-0019` do toolkit"). Descartada: continua sem
  resolver para quem lê.
- **Linkar o repositório do toolkit.** Descartada: não há endereço estável
  enquanto `DA-0003` estiver aberta, e o link joga quem lê num documento interno
  de decisão — o motivo pelo qual `ADR-0017` descarta "ID com link".
- **Centralizar as mensagens num catálogo** e verificar só o catálogo.
  Descartada: refatora dezessete arquivos e afasta a mensagem do código que a
  produz.
- **Um check `CI-n` genérico**, ligado por chave no `.ownership.yml`. Descartada:
  cresce o contrato público para um problema que só o toolkit tem — só quem
  distribui texto a outros repositórios o tem, e hoje só o toolkit distribui.
- **Verificação só humana.** Descartada: é texto que agente e skill escrevem
  sozinhos, e a citação uniforme é o hábito que eles aprenderam; o ID volta sem
  que ninguém veja.

## Decisão

O texto que o toolkit entrega a quem instala não cita artefato nem seção da spec
do toolkit. Os identificadores da interface pública, os nomes de skill e os
comandos continuam citáveis: existem no ambiente de quem instala.

O formato de um documento mora no template; a regra de escrevê-lo mora na
skill. Orientação que só serve a quem escreve não fica em documento-coleção nem
em documento externo — nele, quem escreve não é quem lê.

O rastro continua existindo do lado de dentro: no comentário de código ao lado
da string que perdeu a citação, e na mensagem de commit. A verificação é um
teste do toolkit, que lê os prefixos internos do `.ownership.yml` do próprio
toolkit, e não um check que quem instala receba.

**Este ADR não emenda a spec do toolkit.** A citação uniforme segue valendo
dentro do repositório do toolkit — artefato, teste, código, commit. O que muda é
o que atravessa para quem instala; emendar a spec para dizer "uniforme, exceto…"
trocaria uma regra simples por uma regra com exceção no lugar em que ela é mais
lida.

## Consequências

### O que se ganha

Quem instala recebe semente, skill e mensagem que se sustentam sozinhas, e o
documento preenchido não carrega instrução para ninguém. A regra que o toolkit
impõe aos documentos externos de quem instala não nasce descumprida pelo próprio
toolkit, e uma família nova declarada no toolkit passa a ser vigiada no mesmo
commit.

### O que se aceita perder

**Quem instala e trabalha sem agente recebe a semente sem instrução de
preenchimento.** A instrução mora na skill.

**Repositório já instalado mantém o texto antigo.** O `init` não reescreve e não
passa a avisar.

**O teste pode reprovar uma string de `src/` que não é saída** — um regex, um
dado. Hoje nenhuma casa.

**Quem mantém o toolkit lê o porquê de uma mensagem no comentário ao lado**, não
na mensagem.

**A spec do toolkit continua afirmando a uniformidade.** Quem lê só a spec não
vê o recorte sem passar por este ADR.
