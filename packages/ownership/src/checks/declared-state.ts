import { listFiles, readTextFile } from '../core/files.ts'
import { parseFrontmatter } from '../core/frontmatter.ts'
import { findDuplicateKeys, parseItemsSections, parseItemsTable } from '../schema/item.ts'
import type { DocItem } from '../schema/item.ts'
import type { ResolvedOwnedRule } from '../resolve/hierarchy.ts'
import type { Check, CheckContext, Finding } from './types.ts'

const RULE = 'ownership/declared-state'

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix }
}

function filesUnder(root: string, rulePath: string): string[] {
  return rulePath.endsWith('/') ? listFiles(root, [`${rulePath}**/*.md`]) : listFiles(root, [rulePath])
}

interface Observed {
  states: { state: string; line: number }[]
  duplicates: DocItem[]
  /** `owner` do frontmatter que não começa com `@`, só em per-file. */
  badOwner: { value: string; line: number } | null
}

const NOTHING: Observed = { states: [], duplicates: [], badOwner: null }

function observe(root: string, rule: ResolvedOwnedRule, file: string): Observed {
  const content = readTextFile(root, file)

  if (content === null) {
    return NOTHING
  }

  if (rule.format.collection === 'per-file') {
    let frontmatter

    try {
      frontmatter = parseFrontmatter(content)
    } catch {
      return NOTHING
    }
    const value = frontmatter?.data[rule.format.stateField]
    const owner = frontmatter?.data.owner
    const badOwner = typeof owner === 'string' && owner !== '' && !owner.startsWith('@') ? { value: owner, line: frontmatter?.lines.owner ?? 0 } : null

    return {
      states: typeof value === 'string' && value !== '' ? [{ state: value, line: frontmatter?.lines[rule.format.stateField] ?? 0 }] : [],
      duplicates: [],
      badOwner,
    }
  }

  const items =
    rule.format.collection === 'table'
      ? parseItemsTable(content, 1, { key: rule.format.key!, stateField: rule.format.stateField })
      : parseItemsSections(content, 1, { keyMode: rule.format.keyMode!, stateField: rule.format.stateField })

  return {
    states: items.filter(item => item.state !== '').map(item => ({ state: item.state, line: item.line })),
    duplicates: findDuplicateKeys(items),
    badOwner: null,
  }
}

export function ownershipDeclaredState(): Check {
  return {
    id: RULE,
    name: 'declared state',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []

      for (const rule of context.config.owned) {
        for (const file of filesUnder(context.root, rule.path)) {
          const observed = observe(context.root, rule, file)

          for (const duplicate of observed.duplicates) {
            findings.push(
              error(
                file,
                duplicate.line,
                `A chave "${duplicate.key}" aparece mais de uma vez neste arquivo — a chave identifica o item dentro do arquivo.`,
                'Dê a este item uma chave própria, ou funda as duas entradas.',
              ),
            )
          }
          if (observed.badOwner !== null) {
            findings.push(
              error(
                file,
                observed.badOwner.line,
                `\`owner\` "${observed.badOwner.value}" precisa começar com @ e espelhar o CODEOWNERS.`,
                'Use o handle de pessoa ou time, ex.: "@time-plataforma".',
              ),
            )
          }
          if (rule.states === null) {
            continue
          }
          for (const { state, line } of observed.states) {
            if (!rule.states.includes(state)) {
              findings.push(
                error(
                  file,
                  line,
                  `"${state}" não está entre os estados declarados para \`${rule.path}\`: ${rule.states.join(', ')}.`,
                  `Use um dos estados declarados, ou acrescente "${state}" a \`states\` em \`owned[]\` (${rule.origin}), se ele for legítimo.`,
                ),
              )
            }
          }
        }
      }

      return findings
    },
  }
}
