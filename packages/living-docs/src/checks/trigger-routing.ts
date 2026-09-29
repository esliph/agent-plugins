import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { parseFrontmatter } from '../frontmatter/parse.ts'
import { toolkitRoot } from '../core/roots.ts'

const RULE = 'living-docs/trigger-routing'

/**
 * A `description` de cada skill da raiz do **toolkit** (`ADR-0003`).
 *
 * É o único check que atravessa as duas raízes: o artefato mora no repositório
 * validado e a skill mora no toolkit. Diretório ausente devolve mapa vazio, e
 * mapa vazio vira aviso — nunca falha.
 */
export function loadSkillDescriptions(root: string = toolkitRoot()): Map<string, string> {
  const dir = join(root, 'skills')
  const found = new Map<string, string>()

  let names: string[]

  try {
    names = readdirSync(dir)
  } catch {
    return found
  }

  for (const name of names) {
    let source: string

    try {
      source = readFileSync(join(dir, name, 'SKILL.md'), 'utf8')
    } catch {
      continue
    }

    let description: unknown

    try {
      description = parseFrontmatter(source)?.data.description
    } catch {
      continue // SKILL.md com frontmatter quebrado é achado de `authoring`, não daqui
    }
    if (typeof description === 'string') {
      found.set(name, description)
    }
  }

  return found
}

export interface RoutedDoc {
  file: string
  line: number
  skill: string
  trigger: string
}

function triggerOf(frontmatter: { data: Record<string, unknown>; lines: Record<string, number> } | null): {
  trigger: string
  line: number
} | null {
  const value = frontmatter?.data.trigger

  if (typeof value !== 'string' || value.trim() === '') {
    return null
  }

  return { trigger: value, line: frontmatter?.lines.trigger ?? 1 }
}

/**
 * Os pares (documento, skill dona) que este check compara.
 *
 * Artefato `per-file` fica de fora de propósito: cada arquivo dele é um **item**,
 * e o `trigger` de um ADR — "Nunca. Imutável após aceito" — é do item, não do
 * artefato (`ADR-0013`). Entram os containers de coleção e as entradas de
 * `documents:` que declaram skill.
 */
export function routedDocs(context: CheckContext): RoutedDoc[] {
  const routed: RoutedDoc[] = []

  for (const doc of context.docs) {
    if (doc.rule.collection === 'per-file') {
      continue
    }
    const found = triggerOf(doc.frontmatter)

    if (found === null) {
      continue
    }
    routed.push({ file: doc.file, line: found.line, skill: doc.rule.skill, trigger: found.trigger })
  }

  for (const document of context.documents) {
    if (document.rule.skill === null) {
      continue
    }
    const found = triggerOf(document.frontmatter)

    if (found === null) {
      continue
    }
    routed.push({ file: document.file, line: found.line, skill: document.rule.skill, trigger: found.trigger })
  }

  return routed
}

/**
 * `living-docs/trigger-routing` — trigger routing. A document with a `trigger`
 * names an owning skill; when the toolkit root has no skill by that name, the
 * trigger cannot be routed and the check warns. It never compares the wording
 * of the `trigger` with the skill `description`: that would tie the result to
 * the language both are written in (ADR-0034, RN-0038).
 *
 * Descriptions are injected, like the runner in `ownership/generated-drift`:
 * the default reads the toolkit root, and the test passes a map.
 */
export function livingDocsTriggerRouting(descriptions: ReadonlyMap<string, string> = loadSkillDescriptions()): Check {
  return {
    id: RULE,
    name: 'trigger routing',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []

      for (const routed of routedDocs(context)) {
        if (descriptions.has(routed.skill)) {
          continue
        }

        // A warning, not a failure: a project may declare its own skill, and
        // failing on that would demand that every owner come from the plugin.
        findings.push({
          ruleId: RULE,
          file: routed.file,
          line: routed.line,
          severity: 'warning',
          message:
            `\`${routed.file}\` declares \`${routed.skill}\` as its owning skill, and the toolkit root has no ` +
            'skill by that name — this document\'s trigger could not be matched against the routing.',
          fix:
            `If \`${routed.skill}\` is a skill of this project, there is nothing to do. If it was meant to come from the toolkit, ` +
            'check the name in `skills/`, at the toolkit root.',
        })
      }

      return findings
    },
  }
}
