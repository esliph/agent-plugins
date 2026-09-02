#!/usr/bin/env node
/**
 * Gerador do contrato público dos checks (SK-5).
 *
 * Imprime o conteúdo esperado de `docs/contracts/checks.gen.md` na saída padrão
 * e **não escreve arquivo nenhum** — é o contrato de gerador que `ADR-0005`
 * fixa, e é o que permite a `CI-5` comparar sem reescrever o que está checando.
 *
 * A saída é determinística: nenhuma data, nenhum caminho de máquina, nenhuma
 * contagem. Um gerador que imprime "gerado em <hoje>" produz deriva a cada
 * execução e desliga `CI-5` no segundo dia.
 */
import { CHECK_CATALOG } from '../checks/catalog.ts'

const HEADER = `<!-- generated: do not edit -->
<!-- fonte: src/checks/catalog.ts (CHECK_CATALOG) — regerar: rode este arquivo com node -->

# Contrato dos checks

Os IDs abaixo são públicos e estáveis: aparecem na saída do CLI, são citados
pela Definition of Done de quem usa o toolkit, e não mudam de significado
(\`docs/contracts/versioning-policy.md\`).

| ID | Check | Falha quando | Comando |
| --- | --- | --- | --- |
`

/** `|` numa célula quebraria a tabela — escapar é do gerador, não de quem escreve. */
function cell(value: string): string {
  return value.replaceAll('|', '\\|')
}

const rows = CHECK_CATALOG.map(entry => `| ${cell(entry.id)} | ${cell(entry.name)} | ${cell(entry.failsWhen)} | \`${cell(entry.command)}\` |`).join('\n')

process.stdout.write(`${HEADER}${rows}\n`)
