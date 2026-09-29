import { existsSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'
import { loadCodeowners, ownersOf } from '../core/codeowners.ts'
import { listFiles } from '../core/files.ts'
import { findOwnedRule } from '../resolve/hierarchy.ts'
import type { Check, CheckContext, Finding } from './types.ts'

const RULE = 'ownership/owner-coverage'

function error(file: string, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
}

export function ownershipOwnerCoverage(): Check {
  return {
    id: RULE,
    name: 'owner coverage',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []
      const { config, root } = context
      const codeowners = loadCodeowners(root)

      if (codeowners === null) {
        findings.push(
          error(config.rootFile, 'CODEOWNERS is missing: no governed path has an owner declared on the reviewer side.', 'Create `CODEOWNERS` at the root (or in `.github/`), mirroring the `owner` of each `owned[]` entry.'),
        )
      }

      // Do repositório para o ownership: todo arquivo tem regra, ou está em `ignore`.
      const ignored = config.ignore.length === 0 ? () => false : picomatch(config.ignore, { dot: true })

      for (const file of listFiles(root).sort()) {
        if (!ignored(file) && findOwnedRule(config, file) === null) {
          findings.push(error(file, `"${file}" is covered by no \`owned[]\` rule and is not in \`ignore\`.`, 'Declare an owner for the path in `owned[]`, or take it out of governance with `ignore`.'))
        }
      }

      // Do ownership para fora: a entrada existe e o CODEOWNERS a cobre.
      for (const rule of config.owned) {
        if (!existsSync(join(root, rule.path))) {
          findings.push(error(rule.path, `"${rule.path}" is declared in \`owned[]\` (${rule.origin}) and does not exist in the repository.`, 'Create the path, or fix the entry.'))
          continue
        }
        if (codeowners !== null && ownersOf(codeowners, rule.path) === null) {
          findings.push(error(rule.path, `"${rule.path}" has no line in \`${codeowners.file}\`.`, `Add \`${rule.path}    ${rule.owner}\` to \`${codeowners.file}\`.`))
        }
      }

      // O doc de um `watches` precisa existir e ter dono — senão o lembrete aponta para o nada.
      const docs = new Map(config.watches.map(watch => [watch.doc, watch.origin]))

      for (const [doc, origin] of docs) {
        if (!existsSync(join(root, doc))) {
          findings.push(error(doc, `"${doc}" is the \`watches\` doc (${origin}) and does not exist in the repository.`, 'Create the document, or fix `watches[].doc`.'))
        } else if (findOwnedRule(config, doc) === null) {
          findings.push(error(doc, `"${doc}" is the \`watches\` doc (${origin}) and has no rule in \`owned[]\`.`, 'Declare the document owner in `owned[]`.'))
        }
      }

      return findings
    },
  }
}
