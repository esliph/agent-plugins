import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import picomatch from 'picomatch'
import { exceptionReasonFor } from '../core/exception-label.ts'
import type { Check, CheckContext, Finding } from './types.ts'
import type { DiffFacts } from './watch-satisfied.ts'

const RULE = 'ownership/consumer-change-logged'

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

function error(file: string, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line: 0, severity: 'error', message, fix }
}

function unreleasedEntries(source: string): string[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const start = lines.findIndex(line => /^##\s+\[?unreleased\]?/i.test(line.trim()))

  if (start === -1) {
    return []
  }

  const entries: string[] = []

  for (let i = start + 1; i < lines.length; i++) {
    const line = lines[i] ?? ''

    if (/^##\s/.test(line)) {
      break
    }
    if (/^\s*[-*]\s+\S/.test(line)) {
      entries.push(line.trim())
    }
  }

  return entries
}

export function ownershipConsumerChangeLogged(diff: DiffFacts): Check {
  return {
    id: RULE,
    name: 'consumer change logged',
    run(context: CheckContext): Finding[] {
      const visible = context.config.watches.filter(watch => watch.consumerVisible)

      if (visible.length === 0) {
        return []
      }

      const changed = diff.changed.map(normalize)
      // Each doc is only charged for the paths of the rules that point to it:
      // touching `src/cli/**` must not demand the doc of another visible rule.
      const hitsByDoc = new Map<string, string[]>()

      for (const watch of visible) {
        const matches = picomatch(watch.code)
        const doc = normalize(watch.doc)
        const hits = changed.filter(path => matches(path))

        if (hits.length > 0) {
          hitsByDoc.set(doc, [...new Set([...(hitsByDoc.get(doc) ?? []), ...hits])])
        }
      }

      if (hitsByDoc.size === 0) {
        return []
      }
      if (exceptionReasonFor('Changelog', diff.messages) !== null) {
        return []
      }

      const findings: Finding[] = []

      for (const [target, hits] of hitsByDoc) {
        const trigger = hits.slice(0, 5).join(', ') + (hits.length > 5 ? `, … (+${hits.length - 5})` : '')

        if (!changed.includes(target)) {
          findings.push(
            error(
              target,
              `The diff \`${diff.base}...HEAD\` touches a consumer-visible path (${trigger}) and \`${target}\` is not among the changed paths.`,
              `Add the entry under \`## [Unreleased]\` in \`${target}\` — or write \`Changelog: none — <reason>\` in the commit message.`,
            ),
          )
          continue
        }

        let source: string

        try {
          source = readFileSync(join(context.root, target), 'utf8')
        } catch {
          findings.push(error(target, `\`${target}\` is declared as the doc for visible changes and is missing from the repository.`, `Create \`${target}\` in the Keep a Changelog format.`))
          continue
        }

        if (unreleasedEntries(source).length === 0) {
          findings.push(
            error(
              target,
              `The diff touches a consumer-visible path (${trigger}) and \`## [Unreleased]\` in \`${target}\` has no item.`,
              'Write the entry under the right subsection (Added, Changed, Deprecated, Removed, Fixed, Security).',
            ),
          )
        }
      }

      return findings
    },
  }
}
