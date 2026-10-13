import { segmentsOf } from '../paths/paths.ts'
import type { GeneratedRule, IgnoreRule, OwnedRule, TrieNode } from './types.ts'

export interface MutableTrieNode {
  children: Record<string, MutableTrieNode>
  owned?: OwnedRule
  generated?: GeneratedRule
  ignore?: IgnoreRule
}

export function newNode(): MutableTrieNode {
  return { children: Object.create(null) as Record<string, MutableTrieNode> }
}

/** The node of `path`, created when missing, and the nodes above it, root first. */
export function descend(root: MutableTrieNode, path: string): { node: MutableTrieNode; ancestors: MutableTrieNode[] } {
  const ancestors: MutableTrieNode[] = []
  let node = root

  for (const segment of segmentsOf(path)) {
    ancestors.push(node)

    let child = node.children[segment]

    if (child === undefined) {
      child = newNode()
      node.children[segment] = child
    }

    node = child
  }

  return { node, ancestors }
}

/** Every node strictly below `node`. */
export function descendants(node: TrieNode): TrieNode[] {
  const found: TrieNode[] = []
  const stack = Object.values(node.children)

  for (let next = stack.pop(); next !== undefined; next = stack.pop()) {
    found.push(next)
    stack.push(...Object.values(next.children))
  }

  return found
}

export function nodeAt(index: TrieNode, path: string): TrieNode | null {
  let node: TrieNode | undefined = index

  for (const segment of segmentsOf(path)) {
    node = node.children[segment]

    if (node === undefined) {
      return null
    }
  }

  return node
}

/**
 * The rule that covers `path`: a directory rule met on the way down, or the
 * rule of the path itself. A file rule covers only that file. The walk is one
 * step per segment, whatever the number of declared entries.
 */
function covering<R extends OwnedRule | IgnoreRule>(index: TrieNode, path: string, pick: (node: TrieNode) => R | undefined): R | null {
  const segments = segmentsOf(path)
  const isDirectory = path.endsWith('/')
  let node: TrieNode = index

  for (let i = 0; i < segments.length; i++) {
    const child: TrieNode | undefined = node.children[segments[i] ?? '']

    if (child === undefined) {
      return null
    }

    node = child

    const rule = pick(node)

    if (rule !== undefined) {
      const last = i === segments.length - 1
      const matches = rule.path.endsWith('/') ? !last || isDirectory : last && !isDirectory

      if (matches) {
        return rule
      }
    }
  }

  return null
}

export function coveringOwned(index: TrieNode, path: string): OwnedRule | null {
  return covering(index, path, node => node.owned)
}

export function coveringIgnore(index: TrieNode, path: string): IgnoreRule | null {
  return covering(index, path, node => node.ignore)
}
