---
id: ADR-0017
title: 'Fronteira de leitor: ID de artefato é rastro interno'
status: draft
owner: '@esliph/engineering'
trigger: >
  Nunca. Imutável após aceito; uma decisão nova o supersede.
last-reviewed: 2026-09-15
relates-to: [RN-0030, RF-0015, RN-0013, RN-0007]
supersedes: null
superseded-by: null
---

# ADR-0017 — Fronteira de leitor: ID de artefato é rastro interno

## Contexto

A spec do toolkit manda citar item por ID de forma uniforme — em código, teste,
documento e mensagem de commit — e manda o guia de migração apontar o ADR que
decidiu a quebra. Nenhum dos dois trechos distingue quem lê.

Dentro do repositório, é isso que torna a rastreabilidade navegável: `RN-0007`
exige que toda citação resolva, e quem mantém o código segue o ID até o
artefato. Fora dele, o mesmo ID é ruído. Quem lê o README para decidir se
instala, o CHANGELOG para decidir se atualiza, ou um guia de migração para
atravessar uma quebra não tem como saber o que `RNF-0006` significa — e, para
quem instala o pacote ou o plugin, `docs/` pode nem estar à mão. O resultado são
documentos escritos para quem vem de fora carregando referências que só resolvem
do lado de dentro.

`RN-0013` já traçou uma fronteira parecida para o CHANGELOG: a entrada é voltada
a quem consome, e o que só faz sentido para quem escreveu o código não pertence
a ela. Um ID de artefato é exatamente isso.

## Alternativas consideradas

- **Manter a citação uniforme.** Descartada: é o problema. O texto de fora
  continua dependendo de um documento interno para fazer sentido.
- **Permitir o ID desde que venha com link para o artefato.** Descartada: o link
  resolve, mas leva o visitante a um documento interno de decisão, escrito para
  quem mantém o repositório, e o texto de fora passa a depender do de dentro para
  fazer sentido. Pela mesma razão, um ID no caminho de um link conta como
  citação, mesmo quando não aparece no texto renderizado.
- **Verificação só humana, no checklist da skill.** Descartada: o texto em
  questão é justamente o que skill e agente escrevem sozinhos, e a citação
  uniforme é o hábito que eles aprenderam. O ID volta sem que ninguém veja.
- **Uma lista de topo `external-docs:`**, no molde de `consumer-visible-paths`.
  Descartada: é uma segunda lista de caminhos para divergir de `documents:`, e o
  repositório já precisou de um teste só para impedir duas listas assim de
  derivar.
- **Reaproveitar `role`.** Descartada: o vocabulário de `role` é fechado e vale
  "um papel, um documento" (`ADR-0008`); ele não marca CHANGELOG, guias de
  migração e README ao mesmo tempo.

## Decisão

Documento ou artefato declarado `audience: external` não cita ID de artefato. O
vínculo entre ele e o artefato continua existindo, e mora do lado de dentro: no
próprio artefato, enquanto ele ainda é editável, ou na mensagem de commit que
escreveu o texto de fora. Os identificadores da interface pública — `CI-n`,
`HK-n`, `SK-n`, `CM-n`, `EXIT-n` — continuam citáveis: são os que a saída do
CLI já mostra a quem vem de fora, e os que a política de versionamento promete
não redefinir.

A marca é uma chave por entrada, em `documents:` e em `artifacts:`; sem ela, o
documento é interno. Interno é o prefixo declarado em `artifacts:`, e só ele: a
verificação não carrega lista de prefixos, então um projeto que declara uma
família nova ganha a fronteira no mesmo commit, e um projeto que ainda não
declarou uma família não é cobrado por um ID solto dela — a mesma fronteira que
`RN-0007` já usa. `CI-11` reprova com severidade de erro e sem rótulo de
exceção: o conserto é sempre reescrever, em texto corrido, o que o item decide
ou exige.

**Este ADR não emenda a spec do toolkit, e o motivo é de substância.** A citação
uniforme continua valendo em tudo que é interno — artefato, teste, código,
mensagem de commit —, que é quase tudo. A fronteira é um recorte do lado de
fora, não uma reversão da regra; emendar a spec para dizer "uniforme, exceto…"
trocaria uma regra simples por uma regra com exceção no lugar em que ela é mais
lida.

## Consequências

### O que se ganha

Quem lê de fora recebe texto que se sustenta sozinho. A fronteira sai da
configuração que já existe — `artifacts:` diz o que é interno, e a interface
pública fica de fora sem nenhuma exceção escrita — e é verificada no CI, não
lembrada num checklist.

### O que se aceita perder

**Quem lê de fora e quer o porquê perde o atalho.** O caminho vai de dentro para
fora, não o contrário.

**O vínculo entre guia de migração e ADR passa a morar na mensagem de commit.**
Um ADR aceito é congelado por `HK-1` e não pode ganhar a citação a um guia
escrito depois dele; o commit que cria o guia cita o ADR. A verificação desse
vínculo era humana e continua humana — não se perde enforcement, mas o vínculo
fica menos à vista.

**Repositório já instalado não é verificado** até marcar os próprios documentos
à mão: o `init` avisa, e não reescreve a linha.

**A spec do toolkit continua afirmando a uniformidade.** Quem lê só a spec não
vê a fronteira sem passar por este ADR.

**O README e o CHANGELOG deste repositório são reescritos** em texto corrido
onde citavam ID.
