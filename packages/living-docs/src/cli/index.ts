#!/usr/bin/env node
import { runValidate } from './validate.ts'
import { runInit, STAGES } from './init.ts'
import type { Stage } from './init.ts'
import { formatFindings } from './report.ts'
import { CHECK_BUDGET_MS, formatElapsed } from '../checks/budget.ts'
import { OwnershipError } from '../config/ownership.ts'
import { DEFAULT_ID_FORMAT, PADDING_RANGE, SEPARATORS_ALLOWED } from '../docs/schema.ts'
import { GitError } from '../git/diff.ts'
import { repoRoot } from '../core/roots.ts'

const USAGE = `living-docs <comando>

  validate    Runs the living-documentation checks over the tree
  init        Creates the living-documentation scaffold (owning skill: living-docs-bootstrap)

init options:
  --owner <@handle>   Default owner of the artifacts created
  --stage <stage>     Minimum set to install: solo (default), small-team, production or multi-team
  --id-separator <s>  ID separator: "-" (default), "_", ".", ":" or "" (empty)
  --id-padding <n>    ID digits: 4 (default), between 2 and 6
  --invoke <command>  How the CLI is called in the installer's CI (default: npx living-docs)
  --invoke-ownership <command>  How the core CLI is called in CI (default: npx ownership)
  --marketplace <o/r>  Marketplace repository of the plugin; without it the hooks are not registered
  --dry-run           Shows what it would do, without writing

validate options:
  --base <ref>        Diff base — turns on the checks that read the branch diff

Owner, lifecycle, generated artifact, code→doc link and CHANGELOG entry
are verified by \`ownership validate [--base <ref>]\`.
`

/**
 * O relato da medida (`RNF-0005`). Sai a cada execução: um orçamento que só
 * aparece quando estoura é um orçamento que ninguém sabe que existe.
 *
 * Não muda o código de saída. Quem reprova por lentidão é o teste do orçamento,
 * contra o corpus deste repositório — um `validate` que saísse com 1 porque a
 * máquina estava carregada trocaria um enforcement por um teste instável.
 */
function reportElapsed(elapsedMs: number): void {
  // Regra de origem: RNF-0005.
  process.stdout.write(`living-docs: check set in ${formatElapsed(elapsedMs)} ` + `(declared ceiling: ${formatElapsed(CHECK_BUDGET_MS)}).\n`)
  if (elapsedMs > CHECK_BUDGET_MS) {
    process.stderr.write('living-docs: the set exceeded the declared ceiling. Measure what got slow before raising the number.\n')
  }
}

function main(argv: readonly string[]): number {
  const root = repoRoot()
  const command = argv[0]

  if (command === undefined || command === '--help' || command === '-h') {
    process.stdout.write(USAGE)

    return command === undefined ? 2 : 0
  }

  try {
    if (command === 'validate') {
      const baseIndex = argv.indexOf('--base')
      const base = baseIndex === -1 ? null : (argv[baseIndex + 1] ?? '')

      if (base === '') {
        // Regra de origem: ADR-0010.
        process.stderr.write('living-docs: `--base` needs a ref — the diff base is not guessed.\n')

        return 2
      }

      const result = runValidate(root, base)

      process.stdout.write(`${formatFindings(result.findings)}\n`)
      // Ponteiro, não achado: artefato gerado e vínculo código→doc são do
      // núcleo agora, e ficar calado sobre isso seria fingir cobertura.
      if (result.generated > 0 || result.watched > 0) {
        process.stdout.write(
          `living-docs: ${result.generated} generated artifact(s) and ${result.watched} declared code→doc link(s) — ` +
            'verified by `ownership validate` (with `--base <ref>` for the diff).\n',
        )
      }
      reportElapsed(result.elapsedMs)

      return result.exitCode
    }

    if (command === 'init') {
      const ownerIndex = argv.indexOf('--owner')
      const owner = ownerIndex === -1 ? '@owners' : (argv[ownerIndex + 1] ?? '@owners')

      const stageIndex = argv.indexOf('--stage')
      const stage = stageIndex === -1 ? 'solo' : (argv[stageIndex + 1] ?? '')

      if (stageIndex !== -1 && !STAGES.includes(stage as Stage)) {
        process.stderr.write(`living-docs: unknown stage "${stage}". Valid: ${STAGES.join(', ')}.\n`)

        return 2
      }

      const separatorIndex = argv.indexOf('--id-separator')
      const separator = separatorIndex === -1 ? DEFAULT_ID_FORMAT.separator : (argv[separatorIndex + 1] ?? '')
      const paddingIndex = argv.indexOf('--id-padding')
      const padding = paddingIndex === -1 ? DEFAULT_ID_FORMAT.padding : Number.parseInt(argv[paddingIndex + 1] ?? '', 10)

      if (!SEPARATORS_ALLOWED.includes(separator) || !Number.isInteger(padding) || padding < PADDING_RANGE.min || padding > PADDING_RANGE.max) {
        // Regra de origem: ADR-0011.
        process.stderr.write(
          `living-docs: invalid ID form. --id-separator accepts ${SEPARATORS_ALLOWED.map(s => `"${s}"`).join(', ')} ` +
            `and --id-padding an integer between ${PADDING_RANGE.min} and ${PADDING_RANGE.max}.\n`,
        )

        return 2
      }

      const invokeIndex = argv.indexOf('--invoke')
      const invoke = invokeIndex === -1 ? 'npx living-docs' : (argv[invokeIndex + 1] ?? '')

      if (invoke.trim() === '') {
        // Regra de origem: DA-0003.
        process.stderr.write('living-docs: `--invoke` needs the command that runs the CLI in your CI — it is not guessed.\n')

        return 2
      }

      const invokeOwnershipIndex = argv.indexOf('--invoke-ownership')
      const invokeOwnership = invokeOwnershipIndex === -1 ? 'npx ownership' : (argv[invokeOwnershipIndex + 1] ?? '')

      if (invokeOwnership.trim() === '') {
        process.stderr.write('living-docs: `--invoke-ownership` needs the command that runs the core CLI in your CI — it is not guessed.\n')

        return 2
      }

      const marketplaceIndex = argv.indexOf('--marketplace')
      const marketplace = marketplaceIndex === -1 ? null : (argv[marketplaceIndex + 1] ?? '')

      if (marketplace !== null && !/^[\w.-]+\/[\w.-]+$/.test(marketplace)) {
        process.stderr.write('living-docs: `--marketplace` takes `<owner>/<repo>` — e.g. team/living-docs.\n')

        return 2
      }

      const result = runInit(root, {
        owner,
        dryRun: argv.includes('--dry-run'),
        stage: stage as Stage,
        idFormat: { separator, padding },
        invoke,
        invokeOwnership,
        marketplace,
      })

      for (const entry of result.adopted) {
        process.stdout.write(`adopted   ${entry.path}  (${entry.idPrefix} — already existed; no parallel one created)\n`)
      }
      if (result.detected !== null) {
        const { format, count, sample } = result.detected

        process.stdout.write(
          `format    ${sample}  (${count} occurrence(s) in this form) — the repository writes IDs another way.\n` +
            `          To adopt it: --id-separator "${format.separator}" --id-padding ${format.padding}. ` +
            // Rule of origin: RF-0014.
            'No file was changed.\n',
        )
      }
      for (const path of result.created) {
        process.stdout.write(`created   ${path}\n`)
      }
      for (const path of result.skipped) {
        process.stdout.write(`kept      ${path}\n`)
      }
      if (result.created.length === 0) {
        process.stdout.write('living-docs: nothing to create; the scaffold already exists.\n')
      }
      // Honestidade sobre o estágio: dizer o que ficou de fora vale mais do que
      // fingir que o conjunto inteiro foi instalado (spec §10).
      for (const item of result.notInstalled) {
        process.stdout.write(`not installed  ${item}\n`)
      }

      return 0
    }
  } catch (err) {
    if (err instanceof OwnershipError) {
      process.stderr.write(`living-docs: ${err.message}\n`)

      return 2
    }
    if (err instanceof GitError) {
      process.stderr.write(`living-docs: ${err.message}\n` + '             the clone must contain the base (in CI: `actions/checkout` with `fetch-depth: 0`).\n')

      return 2
    }
    throw err
  }

  process.stderr.write(`living-docs: unknown command "${command}".\n\n${USAGE}`)

  return 2
}

process.exitCode = main(process.argv.slice(2))
