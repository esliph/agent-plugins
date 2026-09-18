import { readFileSync, readdirSync } from 'node:fs'
import { join } from 'node:path'
import type { Check, CheckContext, Finding } from '../core/types.ts'
import { normalizeProse } from '../docs/markdown.ts'
import { parseFrontmatter } from '../frontmatter/parse.ts'
import { toolkitRoot } from '../core/roots.ts'

const RULE = 'CI-10'

/** Palavra curta não é raiz: "toda", "com" e "que" casariam com tudo (`ADR-0009`). */
export const ROOT_FLOOR = 5

/**
 * O truncamento é o que faz "alterada" encontrar "alterar" sem que o toolkit
 * aprenda português (`ADR-0013`).
 */
export const ROOT_LENGTH = 6

/**
 * Quantas raízes o `trigger` e a `description` precisam compartilhar
 * (`ADR-0013`). Escrito aqui, e não escondido numa comparação, porque é número
 * calibrado: a correção de um falso positivo é um ADR novo, nunca uma exceção
 * local.
 */
export const SHARED_ROOTS_FLOOR = 2

export function rootsOf(text: string): Set<string> {
  return new Set(
    normalizeProse(text)
      .split(' ')
      .filter(word => word.length >= ROOT_FLOOR)
      .map(word => word.slice(0, ROOT_LENGTH)),
  )
}

/** As raízes que os dois textos têm em comum, na ordem do primeiro. */
export function sharedRoots(trigger: string, description: string): string[] {
  const other = rootsOf(description)

  return [...rootsOf(trigger)].filter(root => other.has(root))
}

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
 * `CI-10` — trigger routing. O `trigger:` de um documento e a `description:` da
 * skill declarada como dona dele descrevem o mesmo evento (`RN-0029`). Se
 * divergirem, o documento declara um gatilho que nada dispara: o mecanismo de
 * gatilho e o roteamento de skill deixam de se encontrar (spec §11).
 *
 * Não conta documento, linha nem cobertura: conta **divergência entre duas
 * coisas que deveriam concordar** (spec §13).
 *
 * As descrições entram por injeção, como o executor em `CI-5` e o diff em
 * `CI-7`: o padrão lê a raiz do toolkit, e o teste passa um mapa.
 */
export function ci10TriggerRouting(descriptions: ReadonlyMap<string, string> = loadSkillDescriptions()): Check {
  return {
    id: RULE,
    name: 'trigger routing',
    run(context: CheckContext): Finding[] {
      const findings: Finding[] = []

      for (const routed of routedDocs(context)) {
        const description = descriptions.get(routed.skill)

        // Aviso, não falha: um projeto pode declarar skill própria, e reprovar
        // por isso seria exigir que todo dono fosse do plugin (`RN-0029`).
        if (description === undefined) {
          findings.push({
            ruleId: RULE,
            file: routed.file,
            line: routed.line,
            severity: 'warning',
            message:
              `\`${routed.file}\` declara \`${routed.skill}\` como skill dona, e a raiz do toolkit não tem uma ` +
              'skill com esse nome — o gatilho deste documento não pôde ser cruzado com o roteamento.',
            fix:
              `Se \`${routed.skill}\` é skill deste projeto, não há nada a fazer. Se era para ser do toolkit, ` +
              // Regra de origem: RN-0029.
              'confira o nome em `skills/`, na raiz do toolkit.',
          })
          continue
        }

        const shared = sharedRoots(routed.trigger, description)

        if (shared.length >= SHARED_ROOTS_FLOOR) {
          continue
        }

        findings.push({
          ruleId: RULE,
          file: routed.file,
          line: routed.line,
          severity: 'error',
          message:
            `O \`trigger\` de \`${routed.file}\` ("${routed.trigger.trim().replace(/\s+/g, ' ').slice(0, 120)}") e a ` +
            `\`description\` de \`${routed.skill}\` falam de eventos diferentes: ` +
            `${shared.length} raiz(es) em comum, mínimo ${SHARED_ROOTS_FLOOR}.`,
          fix:
            'Reescreva um dos dois para nomear o mesmo evento — quem mantém o documento e quem roteia a skill ' +
            'precisam estar falando da mesma coisa, senão o documento declara um gatilho que nada dispara ' +
            // Regra de origem: RN-0029, ADR-0013.
            `(skill dona: ${routed.skill}).`,
        })
      }

      return findings
    },
  }
}
