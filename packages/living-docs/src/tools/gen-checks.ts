#!/usr/bin/env node
/**
 * Generator of the checks' public contract (SK-5), for both plugins.
 *
 * Prints the expected content of `docs/contracts/checks.gen.md` to standard output
 * and **writes no file** — it is the generator contract that `ADR-0005`
 * fixes, and it is what lets `ownership/generated-drift` compare without rewriting
 * what it is checking.
 *
 * The output is deterministic: no date, no machine path, no
 * count. A generator that prints "generated on <today>" produces drift on every
 * run and turns off the drift check on the second day.
 */
import { CORE_CHECK_CATALOG } from '@esliph/ownership'
import type { CatalogEntry } from '@esliph/ownership'
import { CHECK_CATALOG } from '../checks/catalog.ts'

const HEADER = `<!-- generated: do not edit -->
<!-- source: src/checks/catalog.ts (CHECK_CATALOG) and the core catalog (CORE_CHECK_CATALOG) — regenerate: run this file with node --conditions=development -->

# Checks contract

The identifiers below are public and stable: they appear in the CLI output, are
cited by the Definition of Done of whoever uses the toolkit, and do not change
meaning (\`docs/contracts/versioning-policy.md\`). Each rule runs in a single plugin.
`

/** A `|` in a cell would break the table — escaping is the generator's job, not the writer's. */
function cell(value: string): string {
  return value.replaceAll('|', '\\|')
}

function section(plugin: string, catalog: readonly CatalogEntry[]): string {
  const rows = catalog.map(entry => `| ${cell(entry.id)} | ${cell(entry.name)} | ${cell(entry.failsWhen)} | \`${cell(entry.command)}\` |`)

  return [`## ${plugin}`, '', '| ID | Check | Fails when | Command |', '| --- | --- | --- | --- |', ...rows].join('\n')
}

process.stdout.write(`${HEADER}\n${section('living-docs', CHECK_CATALOG)}\n\n${section('ownership', CORE_CHECK_CATALOG)}\n`)
