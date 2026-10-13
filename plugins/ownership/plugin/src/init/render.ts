import type { InitPlan } from './derive.ts'

export const SCHEMA_URL = 'https://raw.githubusercontent.com/esliph/agent-plugins/master/plugins/ownership/plugin/ownership.schema.json'

const PLAIN = /^[A-Za-z_][A-Za-z0-9_./-]*$|^\.[A-Za-z_][A-Za-z0-9_./-]*$/
const RESERVED = /^(?:true|false|null)$/i

/** A YAML scalar that reads back as this exact text: plain when that is safe, in double quotes otherwise. */
function scalar(text: string): string {
  return PLAIN.test(text) && !RESERVED.test(text) ? text : JSON.stringify(text)
}

function entryLines(path: string, owner: string): string[] {
  return [`  - path: ${scalar(path)}`, `    owner: ${JSON.stringify(owner)}`]
}

function commented(lines: readonly string[]): string[] {
  return lines.map(line => `# ${line}`)
}

/**
 * The text of the root ownership file. It is written by hand, line by line,
 * and not by a YAML serializer, so the same plan gives the same bytes on every
 * machine and in every version of the dependencies.
 */
export function renderOwnershipFile(plan: InitPlan, markers: readonly string[]): string {
  const lines = [`# yaml-language-server: $schema=${SCHEMA_URL}`, 'version: 1', '']

  if (plan.mode === 'skeleton') {
    lines.push(
      '# No entry was written: only you can name the owner of each path. Uncomment',
      '# the entries, give each one its owner, and split a directory into its',
      '# children when its parts have different owners.',
      ...commented(['owned:', ...plan.templates.flatMap(path => entryLines(path, '@owner'))]),
    )
  } else if (plan.entries.length === 0) {
    lines.push('# No entry could be derived. Declare each path with its owner under "owned:".')
  } else {
    lines.push('owned:')

    for (const entry of plan.entries) {
      if (entry.note !== undefined) {
        lines.push(`  # ${entry.note}`)
      }

      lines.push(...entryLines(entry.path, entry.owner))
    }
  }

  if (plan.leftOut.length > 0) {
    lines.push('', '# Left out, and so without an owner: an ownership file cannot declare these', '# paths as they are.')

    for (const item of plan.leftOut) {
      lines.push(`#   ${item.reason}:`, ...commented(entryLines(item.path, item.owner)))
    }
  }

  if (markers.length > 0) {
    lines.push(
      '',
      '# These files carry the "generated: do not edit" marker. Uncomment the block',
      '# and give each one the command that prints its content.',
      ...commented(['generated:', ...markers.flatMap(path => [`  - path: ${scalar(path)}`, '    command: <command that prints this file>'])]),
    )
  }

  return `${lines.join('\n')}\n`
}
