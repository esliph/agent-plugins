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
          error(config.rootFile, 'CODEOWNERS ausente: nenhum caminho governado tem dono declarado do lado de quem revisa.', 'Crie `CODEOWNERS` na raiz (ou em `.github/`), espelhando o `owner` de cada entrada de `owned[]`.'),
        )
      }

      // Do repositório para o ownership: todo arquivo tem regra, ou está em `ignore`.
      const ignored = config.ignore.length === 0 ? () => false : picomatch(config.ignore, { dot: true })

      for (const file of listFiles(root).sort()) {
        if (!ignored(file) && findOwnedRule(config, file) === null) {
          findings.push(error(file, `"${file}" não é coberto por nenhuma regra de \`owned[]\` nem por \`ignore\`.`, 'Declare um dono para o caminho em `owned[]`, ou tire-o da governança em `ignore`.'))
        }
      }

      // Do ownership para fora: a entrada existe e o CODEOWNERS a cobre.
      for (const rule of config.owned) {
        if (!existsSync(join(root, rule.path))) {
          findings.push(error(rule.path, `"${rule.path}" está declarado em \`owned[]\` (${rule.origin}) e não existe no repositório.`, 'Crie o caminho, ou corrija a entrada.'))
          continue
        }
        if (codeowners !== null && ownersOf(codeowners, rule.path) === null) {
          findings.push(error(rule.path, `"${rule.path}" não tem linha em \`${codeowners.file}\`.`, `Acrescente \`${rule.path}    ${rule.owner}\` em \`${codeowners.file}\`.`))
        }
      }

      // O doc de um `watches` precisa existir e ter dono — senão o lembrete aponta para o nada.
      const docs = new Map(config.watches.map(watch => [watch.doc, watch.origin]))

      for (const [doc, origin] of docs) {
        if (!existsSync(join(root, doc))) {
          findings.push(error(doc, `"${doc}" é o doc de \`watches\` (${origin}) e não existe no repositório.`, 'Crie o documento, ou corrija `watches[].doc`.'))
        } else if (findOwnedRule(config, doc) === null) {
          findings.push(error(doc, `"${doc}" é o doc de \`watches\` (${origin}) e está sem regra em \`owned[]\`.`, 'Declare o dono do documento em `owned[]`.'))
        }
      }

      return findings
    },
  }
}
