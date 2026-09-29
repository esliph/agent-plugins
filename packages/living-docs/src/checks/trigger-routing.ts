import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { parseFrontmatter } from '../frontmatter/parse.ts'
import { toolkitRoot } from '../core/roots.ts'

const RULE = 'living-docs/trigger-routing'

/**
 * The `description` of each skill in the **toolkit** root (`ADR-0003`).
 *
 * It is the only check that crosses both roots: the artifact lives in the validated
 * repository and the skill lives in the toolkit. A missing directory returns an empty map, and
 * an empty map becomes a warning — never a failure.
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
      continue // SKILL.md with broken frontmatter is an `authoring` finding, not this check's
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
 * The (document, owning skill) pairs this check compares.
 *
 * A `per-file` artifact is left out on purpose: each of its files is an **item**,
 * and the `trigger` of an ADR — "Never. Immutable once accepted" — belongs to the item, not to the
 * artifact (`ADR-0013`). Collection containers and the entries of
 * `documents:` that declare a skill are included.
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
