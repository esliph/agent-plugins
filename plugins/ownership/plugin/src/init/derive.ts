import { join } from 'node:path'

import { ownersOf } from '../codeowners/match.ts'
import type { Codeowners, OwnersResult } from '../codeowners/types.ts'
import { isGeneratedByMarker, readHead } from '../generated/marker.ts'
import { caseCollisions, literalProblem } from '../paths/paths.ts'

export type InitMode =
  { readonly kind: 'skeleton' } | { readonly kind: 'owner'; readonly owner: string } | { readonly kind: 'codeowners'; readonly codeowners: Codeowners }

export interface InitEntry {
  readonly path: string
  readonly owner: string
  /** A comment written above the entry. */
  readonly note?: string
}

/** A path that would be an entry, but that an ownership file cannot declare as it is. */
export interface LeftOut {
  readonly path: string
  readonly owner: string
  readonly reason: string
}

export interface InitPlan {
  readonly mode: InitMode['kind']
  readonly entries: readonly InitEntry[]
  readonly leftOut: readonly LeftOut[]
  /** The root children, written as a commented model in skeleton mode; empty in the other modes. */
  readonly templates: readonly string[]
  /** How many repository files no entry covers. */
  readonly unowned: number
}

/** The first level of the repository files, directories with a trailing `/`, sorted. */
export function rootChildren(repoFiles: Iterable<string>): string[] {
  const children = new Set<string>()

  for (const file of repoFiles) {
    const slash = file.indexOf('/')

    children.add(slash === -1 ? file : file.slice(0, slash + 1))
  }

  return [...children].sort()
}

interface TreeNode {
  readonly path: string
  /** Null for a file. */
  readonly children: Map<string, TreeNode> | null
}

function buildTree(repoFiles: Iterable<string>): TreeNode {
  const root: TreeNode = { path: '', children: new Map() }

  for (const file of repoFiles) {
    const segments = file.split('/')
    let node = root

    segments.forEach((segment, i) => {
      const isFile = i === segments.length - 1
      let child = node.children?.get(segment)

      if (child === undefined) {
        child = { path: `${node.path}${segment}${isFile ? '' : '/'}`, children: isFile ? null : new Map() }
        node.children?.set(segment, child)
      }

      node = child
    })
  }

  return root
}

function sortedChildren(node: TreeNode): TreeNode[] {
  return [...(node.children?.values() ?? [])].sort((a, b) => (a.path < b.path ? -1 : 1))
}

const NO_OWNER = ''

/** The owner set of a CODEOWNERS answer as one comparable text; no line and a line without owners are both "no owner". */
function ownerKey(result: OwnersResult): string {
  return result.kind === 'matched' && hasHandle(result.owners) ? [...new Set(result.owners.map(owner => owner.toLowerCase()))].sort().join(' ') : NO_OWNER
}

/** An ownership file only accepts an owner that starts with `@`; CODEOWNERS also accepts an email address. */
function hasHandle(owners: readonly string[]): boolean {
  return owners.some(owner => owner.startsWith('@'))
}

/**
 * The smallest disjoint cover the CODEOWNERS allows. A node becomes an entry
 * when every repository file under it has the same owners and the node's own
 * path gets those owners too; otherwise its children are tried. The second
 * condition matters because a line such as `docs/**\/*.md @x` gives every file
 * of `docs/` to `@x` without matching `docs/` itself.
 */
function fromCodeowners(repoFiles: Iterable<string>, codeowners: Codeowners): InitEntry[] {
  const keys = new Map<TreeNode, string | null>()

  const keyOf = (node: TreeNode): string | null => {
    const known = keys.get(node)

    if (known !== undefined) {
      return known
    }

    let key: string | null

    if (node.children === null) {
      key = ownerKey(ownersOf(codeowners, node.path))
    } else {
      const below = new Set([...node.children.values()].map(keyOf))
      const [only] = below

      key = below.size === 1 && only !== undefined ? only : null
    }

    keys.set(node, key)

    return key
  }

  const entries: InitEntry[] = []

  const visit = (node: TreeNode): void => {
    const key = keyOf(node)
    const own = ownersOf(codeowners, node.path)
    const listed = own.kind === 'matched' ? own.owners : []
    const owner = listed.find(candidate => candidate.startsWith('@'))
    const others = listed.filter(candidate => candidate !== owner)

    if (key !== null && key !== NO_OWNER && own.kind === 'matched' && owner !== undefined && ownerKey(own) === key) {
      entries.push({ path: node.path, owner, ...(others.length === 0 ? {} : { note: `CODEOWNERS line ${own.line} also lists ${others.join(' ')}` }) })

      return
    }

    sortedChildren(node).forEach(visit)
  }

  sortedChildren(buildTree(repoFiles)).forEach(visit)

  return entries
}

function countUnowned(repoFiles: Iterable<string>, entries: readonly InitEntry[]): number {
  const declared = new Set(entries.map(entry => entry.path))
  let unowned = 0

  for (const file of repoFiles) {
    let covered = declared.has(file)

    for (let slash = file.indexOf('/'); !covered && slash !== -1; slash = file.indexOf('/', slash + 1)) {
      covered = declared.has(file.slice(0, slash + 1))
    }

    if (!covered) {
      unowned += 1
    }
  }

  return unowned
}

/**
 * What `ownership init` writes for these repository files. An entry never
 * gets an owner nobody named: it comes from the mode, or there is no entry.
 */
export function deriveInit(repoFiles: ReadonlySet<string>, mode: InitMode): InitPlan {
  if (mode.kind === 'skeleton') {
    return { mode: 'skeleton', entries: [], leftOut: [], templates: rootChildren(repoFiles), unowned: repoFiles.size }
  }

  const candidates =
    mode.kind === 'owner' ? rootChildren(repoFiles).map((path): InitEntry => ({ path, owner: mode.owner })) : fromCodeowners(repoFiles, mode.codeowners)
  const collisions = new Set(caseCollisions(candidates.map(entry => entry.path)).flat())
  const entries: InitEntry[] = []
  const leftOut: LeftOut[] = []

  for (const entry of candidates) {
    const reason = collisions.has(entry.path) ? 'differs from another path only in case' : literalProblem(entry.path)

    if (reason === null) {
      entries.push(entry)
    } else {
      leftOut.push({ path: entry.path, owner: entry.owner, reason })
    }
  }

  return { mode: mode.kind, entries, leftOut, templates: [], unowned: countUnowned(repoFiles, entries) }
}

/** The repository files whose first line says they are generated. */
export function markerFiles(root: string, repoFiles: Iterable<string>): string[] {
  const found: string[] = []

  for (const file of repoFiles) {
    const head = readHead(join(root, file))

    if (head !== null && isGeneratedByMarker(head)) {
      found.push(file)
    }
  }

  return found.sort()
}
