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

  validate    Roda os checks da documentação viva sobre a árvore
  init        Cria a moldura de documentação viva (skill dona: living-docs-bootstrap)

Opções de init:
  --owner <@handle>   Dono padrão dos artefatos criados
  --stage <estágio>   Conjunto mínimo a instalar: solo (padrão), small-team, production ou multi-team
  --id-separator <s>  Separador do ID: "-" (padrão), "_", ".", ":" ou "" (vazio)
  --id-padding <n>    Dígitos do ID: 4 (padrão), entre 2 e 6
  --invoke <comando>  Como o CLI é chamado no CI de quem instala (padrão: npx living-docs)
  --marketplace <o/r>  Repositório do marketplace do plugin; sem ele os hooks não são registrados
  --dry-run           Mostra o que faria, sem escrever

Opções de validate:
  --base <ref>        Base do diff — liga os checks que leem o diff da branch

Dono, ciclo de vida, artefato gerado, vínculo código→doc e entrada de CHANGELOG
são verificados por \`ownership validate [--base <ref>]\`.
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
  process.stdout.write(`living-docs: conjunto de checks em ${formatElapsed(elapsedMs)} ` + `(teto declarado: ${formatElapsed(CHECK_BUDGET_MS)}).\n`)
  if (elapsedMs > CHECK_BUDGET_MS) {
    process.stderr.write('living-docs: o conjunto passou do teto declarado. Meça o que ficou lento antes de subir o número.\n')
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
        process.stderr.write('living-docs: `--base` precisa de uma ref — a base do diff não se adivinha.\n')

        return 2
      }

      const result = runValidate(root, base)

      process.stdout.write(`${formatFindings(result.findings)}\n`)
      // Ponteiro, não achado: artefato gerado e vínculo código→doc são do
      // núcleo agora, e ficar calado sobre isso seria fingir cobertura.
      if (result.generated > 0 || result.watched > 0) {
        process.stdout.write(
          `living-docs: ${result.generated} artefato(s) gerado(s) e ${result.watched} vínculo(s) código→doc declarado(s) — ` +
            'verificados por `ownership validate` (com `--base <ref>` para o diff).\n',
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
        process.stderr.write(`living-docs: estágio "${stage}" desconhecido. Válidos: ${STAGES.join(', ')}.\n`)

        return 2
      }

      const separatorIndex = argv.indexOf('--id-separator')
      const separator = separatorIndex === -1 ? DEFAULT_ID_FORMAT.separator : (argv[separatorIndex + 1] ?? '')
      const paddingIndex = argv.indexOf('--id-padding')
      const padding = paddingIndex === -1 ? DEFAULT_ID_FORMAT.padding : Number.parseInt(argv[paddingIndex + 1] ?? '', 10)

      if (!SEPARATORS_ALLOWED.includes(separator) || !Number.isInteger(padding) || padding < PADDING_RANGE.min || padding > PADDING_RANGE.max) {
        // Regra de origem: ADR-0011.
        process.stderr.write(
          `living-docs: forma de ID inválida. --id-separator aceita ${SEPARATORS_ALLOWED.map(s => `"${s}"`).join(', ')} ` +
            `e --id-padding um inteiro entre ${PADDING_RANGE.min} e ${PADDING_RANGE.max}.\n`,
        )

        return 2
      }

      const invokeIndex = argv.indexOf('--invoke')
      const invoke = invokeIndex === -1 ? 'npx living-docs' : (argv[invokeIndex + 1] ?? '')

      if (invoke.trim() === '') {
        // Regra de origem: DA-0003.
        process.stderr.write('living-docs: `--invoke` precisa do comando que roda o CLI no seu CI — ele não se adivinha.\n')

        return 2
      }

      const marketplaceIndex = argv.indexOf('--marketplace')
      const marketplace = marketplaceIndex === -1 ? null : (argv[marketplaceIndex + 1] ?? '')

      if (marketplace !== null && !/^[\w.-]+\/[\w.-]+$/.test(marketplace)) {
        process.stderr.write('living-docs: `--marketplace` recebe `<owner>/<repo>` — ex.: time/living-docs.\n')

        return 2
      }

      const result = runInit(root, {
        owner,
        dryRun: argv.includes('--dry-run'),
        stage: stage as Stage,
        idFormat: { separator, padding },
        invoke,
        marketplace,
      })

      for (const entry of result.adopted) {
        process.stdout.write(`adotado   ${entry.path}  (${entry.idPrefix} — já existia; nenhum paralelo criado)\n`)
      }
      if (result.detected !== null) {
        const { format, count, sample } = result.detected

        process.stdout.write(
          `formato   ${sample}  (${count} ocorrência(s) nesta forma) — o repositório escreve IDs de outro jeito.\n` +
            `          Para adotá-la: --id-separator "${format.separator}" --id-padding ${format.padding}. ` +
            // Regra de origem: RF-0014.
            'Nenhum arquivo foi alterado.\n',
        )
      }
      for (const path of result.created) {
        process.stdout.write(`criado    ${path}\n`)
      }
      for (const path of result.skipped) {
        process.stdout.write(`mantido   ${path}\n`)
      }
      if (result.created.length === 0) {
        process.stdout.write('living-docs: nada a criar; a moldura já existe.\n')
      }
      // Honestidade sobre o estágio: dizer o que ficou de fora vale mais do que
      // fingir que o conjunto inteiro foi instalado (spec §10).
      for (const item of result.notInstalled) {
        process.stdout.write(`não instalado  ${item}\n`)
      }

      return 0
    }
  } catch (err) {
    if (err instanceof OwnershipError) {
      process.stderr.write(`living-docs: ${err.message}\n`)

      return 2
    }
    if (err instanceof GitError) {
      process.stderr.write(`living-docs: ${err.message}\n` + '             o clone precisa conter a base (em CI: `actions/checkout` com `fetch-depth: 0`).\n')

      return 2
    }
    throw err
  }

  process.stderr.write(`living-docs: comando desconhecido "${command}".\n\n${USAGE}`)

  return 2
}

process.exitCode = main(process.argv.slice(2))
