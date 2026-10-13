import type { Issue } from '../errors.ts'
import { splitSuggestion } from './split.ts'
import { coveringIgnore, coveringOwned, descend, descendants, newNode, nodeAt } from './trie.ts'
import type { MutableTrieNode } from './trie.ts'
import type { GeneratedRule, IgnoreRule, OwnedRule, Rule } from './types.ts'

export interface DeclaredRules {
  owned: readonly OwnedRule[]
  generated: readonly GeneratedRule[]
  ignore: readonly IgnoreRule[]
}

const SUGGESTION_LIMIT = 20

function label(rule: Rule): string {
  return rule.kind === 'ignore' ? rule.origin.keyPath : `${rule.origin.keyPath}.path`
}

function location(rule: Rule): string {
  return rule.origin.line === undefined ? rule.origin.file : `${rule.origin.file}:${rule.origin.line}`
}

/** Where `other` was declared, said only when it is another file than the one of `rule`. */
function elsewhere(rule: Rule, other: Rule): string {
  return rule.origin.file === other.origin.file ? '' : ` (${location(other)})`
}

function issueAt(rule: Rule, message: string, fix: string): Issue {
  return { file: rule.origin.file, keyPath: label(rule), ...(rule.origin.line === undefined ? {} : { line: rule.origin.line }), message, fix }
}

function compareIssues(a: Issue, b: Issue): number {
  if (a.file !== b.file) {
    return a.file < b.file ? -1 : 1
  }

  if (a.line !== b.line) {
    return (a.line ?? 0) - (b.line ?? 0)
  }

  return a.message < b.message ? -1 : a.message > b.message ? 1 : 0
}

function replaceWith(outer: string, inner: string, children: readonly string[]): string {
  if (children.length === 0) {
    return `remove "${outer}": no other file is under it besides "${inner}"`
  }

  const shown = children.slice(0, SUGGESTION_LIMIT).join(', ')
  const more = children.length > SUGGESTION_LIMIT ? ` and ${children.length - SUGGESTION_LIMIT} more` : ''

  return `replace "${outer}" with: ${shown}${more} (keep ${inner})`
}

function caseIssues(rules: DeclaredRules): Issue[] {
  const issues: Issue[] = []
  const seen = new Map<string, Rule>()

  for (const rule of [...rules.owned, ...rules.generated, ...rules.ignore]) {
    const key = rule.path.toLowerCase()
    const first = seen.get(key)

    if (first === undefined) {
      seen.set(key, rule)
    } else if (first.path !== rule.path) {
      issues.push(
        issueAt(
          rule,
          `${label(rule)} "${rule.path}" and ${label(first)} "${first.path}"${elsewhere(rule, first)} differ only in case`,
          'use the same case in both: on GitHub they are two different paths',
        ),
      )
    }
  }

  return issues
}

/**
 * Inserts every declared path into the index and collects every broken
 * relation: owned paths disjoint, ignore paths disjoint, generated paths
 * distinct and each inside an owned path, no ignore equal to or containing an
 * owned or generated path, no two paths that differ only in case.
 */
export function buildIndex(rules: DeclaredRules, repoFiles?: ReadonlySet<string>): { index: MutableTrieNode; issues: Issue[] } {
  const index = newNode()
  const issues = caseIssues(rules)
  const containments: [OwnedRule, OwnedRule][] = []

  for (const rule of rules.owned) {
    const { node, ancestors } = descend(index, rule.path)

    for (const ancestor of ancestors) {
      if (ancestor.owned?.path.endsWith('/')) {
        containments.push([ancestor.owned, rule])
      }
    }

    if (node.owned !== undefined) {
      issues.push(
        issueAt(
          rule,
          `${label(rule)} "${rule.path}" repeats ${label(node.owned)}${elsewhere(rule, node.owned)}; owned paths must be disjoint.`,
          'remove one of the two entries',
        ),
      )
      continue
    }

    if (rule.path.endsWith('/')) {
      for (const below of descendants(node)) {
        if (below.owned !== undefined) {
          containments.push([rule, below.owned])
        }
      }
    }

    node.owned = rule
  }

  for (const rule of rules.ignore) {
    const { node, ancestors } = descend(index, rule.path)

    for (const ancestor of ancestors) {
      if (ancestor.ignore?.path.endsWith('/')) {
        const outer = ancestor.ignore

        issues.push(
          issueAt(
            outer,
            `${label(outer)} "${outer.path}" contains ${label(rule)} "${rule.path}"${elsewhere(outer, rule)}; ignore paths must be disjoint.`,
            `remove ${label(rule)}: "${outer.path}" already leaves it out`,
          ),
        )
      }
    }

    if (node.ignore !== undefined) {
      issues.push(
        issueAt(
          rule,
          `${label(rule)} "${rule.path}" repeats ${label(node.ignore)}${elsewhere(rule, node.ignore)}; ignore paths must be disjoint.`,
          'remove one of the two entries',
        ),
      )
      continue
    }

    if (rule.path.endsWith('/')) {
      for (const below of descendants(node)) {
        if (below.ignore !== undefined) {
          issues.push(
            issueAt(
              rule,
              `${label(rule)} "${rule.path}" contains ${label(below.ignore)} "${below.ignore.path}"${elsewhere(rule, below.ignore)}; ignore paths must be disjoint.`,
              `remove ${label(below.ignore)}: "${rule.path}" already leaves it out`,
            ),
          )
        }
      }
    }

    node.ignore = rule
  }

  for (const rule of rules.generated) {
    const { node } = descend(index, rule.path)

    if (node.generated !== undefined) {
      issues.push(
        issueAt(
          rule,
          `${label(rule)} "${rule.path}" repeats ${label(node.generated)}${elsewhere(rule, node.generated)}; a file is generated by one command.`,
          'remove one of the two entries',
        ),
      )
      continue
    }

    node.generated = rule
  }

  for (const rule of rules.generated) {
    if (coveringOwned(index, rule.path) === null) {
      issues.push(
        issueAt(
          rule,
          `${label(rule)} "${rule.path}" is not inside any owned path; a generated file needs an owner.`,
          `declare "${rule.path}" in owned[], or move it inside an existing owned entry`,
        ),
      )
    }
  }

  for (const rule of rules.ignore) {
    const node = nodeAt(index, rule.path)

    if (node === null) {
      continue
    }

    for (const clash of [node.owned, node.generated]) {
      if (clash !== undefined) {
        issues.push(
          issueAt(
            rule,
            `${label(rule)} "${rule.path}" equals ${label(clash)}${elsewhere(rule, clash)}; a path cannot be declared and ignored.`,
            'remove one of the two declarations',
          ),
        )
      }
    }

    if (rule.path.endsWith('/')) {
      for (const below of descendants(node)) {
        for (const clash of [below.owned, below.generated]) {
          if (clash !== undefined) {
            issues.push(
              issueAt(
                rule,
                `${label(rule)} "${rule.path}" contains ${label(clash)} "${clash.path}"${elsewhere(rule, clash)}; a path cannot be declared and ignored.`,
                'remove one of the two declarations',
              ),
            )
          }
        }
      }
    }
  }

  for (const [outer, inner] of containments) {
    const children = repoFiles === undefined ? null : splitSuggestion(outer.path, inner.path, repoFiles, path => coveringIgnore(index, path) !== null)

    issues.push(
      issueAt(
        outer,
        `${label(outer)} "${outer.path}" contains ${label(inner)} "${inner.path}"${elsewhere(outer, inner)}; owned paths must be disjoint.`,
        children === null ? `split "${outer.path}" into entries that leave out "${inner.path}"` : replaceWith(outer.path, inner.path, children),
      ),
    )
  }

  return { index, issues: issues.sort(compareIssues) }
}
