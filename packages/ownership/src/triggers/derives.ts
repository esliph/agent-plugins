import { listFiles, readTextFile } from '../core/files.ts'
import { parseFrontmatter } from '../core/frontmatter.ts'
import type { ResolvedOwnedRule } from '../resolve/hierarchy.ts'

export interface DerivationInstance {
  file: string
  field: string | null
  line: number
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

function filesUnder(root: string, rulePath: string): string[] {
  if (rulePath.endsWith('/')) {
    return listFiles(root, [`${rulePath}**/*.md`])
  }

  return listFiles(root, [rulePath])
}

export function instancesOf(root: string, rule: ResolvedOwnedRule): DerivationInstance[] {
  if (rule.derivesFrom === null) {
    return []
  }

  const instances: DerivationInstance[] = []

  for (const file of filesUnder(root, rule.path)) {
    const content = readTextFile(root, file)

    if (content === null) {
      continue
    }

    let frontmatter

    try {
      frontmatter = parseFrontmatter(content)
    } catch {
      frontmatter = null
    }

    const value = frontmatter?.data[rule.derivesFrom.field]

    instances.push({
      file,
      field: typeof value === 'string' ? normalize(value) : null,
      line: frontmatter?.lines[rule.derivesFrom.field] ?? 0,
    })
  }

  return instances
}

export interface DerivationProblem {
  file: string
  line: number
  reason: 'campo-ausente' | 'fora-da-fonte' | 'alvo-inexistente'
  field: string | null
}

export function problemsFor(root: string, rule: ResolvedOwnedRule): DerivationProblem[] {
  if (rule.derivesFrom === null) {
    return []
  }

  const problems: DerivationProblem[] = []

  for (const instance of instancesOf(root, rule)) {
    if (instance.field === null) {
      problems.push({ file: instance.file, line: instance.line, reason: 'campo-ausente', field: null })
      continue
    }
    if (!instance.field.startsWith(rule.derivesFrom.source)) {
      problems.push({ file: instance.file, line: instance.line, reason: 'fora-da-fonte', field: instance.field })
      continue
    }
    if (readTextFile(root, instance.field) === null) {
      problems.push({ file: instance.file, line: instance.line, reason: 'alvo-inexistente', field: instance.field })
    }
  }

  return problems
}

/** Só os arquivos governados por `rule` cujo campo aponta exatamente para `editedTarget` — precisão, não ruído (spec §4). */
export function derivedFilesOf(root: string, rule: ResolvedOwnedRule, editedTarget: string): string[] {
  if (rule.derivesFrom === null) {
    return []
  }

  const target = normalize(editedTarget)

  return instancesOf(root, rule)
    .filter(instance => instance.field === target)
    .map(instance => instance.file)
}
