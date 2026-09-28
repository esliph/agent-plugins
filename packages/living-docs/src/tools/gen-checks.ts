#!/usr/bin/env node
/**
 * Gerador do contrato público dos checks (SK-5), dos dois plugins.
 *
 * Imprime o conteúdo esperado de `docs/contracts/checks.gen.md` na saída padrão
 * e **não escreve arquivo nenhum** — é o contrato de gerador que `ADR-0005`
 * fixa, e é o que permite a `ownership/generated-drift` comparar sem reescrever
 * o que está checando.
 *
 * A saída é determinística: nenhuma data, nenhum caminho de máquina, nenhuma
 * contagem. Um gerador que imprime "gerado em <hoje>" produz deriva a cada
 * execução e desliga a checagem de deriva no segundo dia.
 */
import { CORE_CHECK_CATALOG } from '@esliph/ownership'
import type { CatalogEntry } from '@esliph/ownership'
import { CHECK_CATALOG } from '../checks/catalog.ts'

const HEADER = `<!-- generated: do not edit -->
<!-- fonte: src/checks/catalog.ts (CHECK_CATALOG) e o catálogo do núcleo (CORE_CHECK_CATALOG) — regerar: rode este arquivo com node --conditions=development -->

# Contrato dos checks

Os identificadores abaixo são públicos e estáveis: aparecem na saída do CLI, são
citados pela Definition of Done de quem usa o toolkit, e não mudam de significado
(\`docs/contracts/versioning-policy.md\`). Cada regra roda num plugin só.
`

/** `|` numa célula quebraria a tabela — escapar é do gerador, não de quem escreve. */
function cell(value: string): string {
  return value.replaceAll('|', '\\|')
}

function section(plugin: string, catalog: readonly CatalogEntry[]): string {
  const rows = catalog.map(entry => `| ${cell(entry.id)} | ${cell(entry.name)} | ${cell(entry.failsWhen)} | \`${cell(entry.command)}\` |`)

  return [`## ${plugin}`, '', '| ID | Check | Falha quando | Comando |', '| --- | --- | --- | --- |', ...rows].join('\n')
}

process.stdout.write(`${HEADER}\n${section('living-docs', CHECK_CATALOG)}\n\n${section('ownership', CORE_CHECK_CATALOG)}\n`)
