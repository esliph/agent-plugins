import { realpathSync } from 'node:fs'
import { basename, dirname, join } from 'node:path'

import { isGeneratedByMarker, readHead } from '../generated/marker.ts'
import { deepestOwnershipFile, findGeneratedRule } from '../resolve/lookup.ts'
import { resolveOwnership } from '../resolve/resolve.ts'
import { toRepoPath } from './paths.ts'

export interface HookEnv {
  /** The repository judged: the project directory of the session. */
  readonly root: string
  /** Another root the payload paths may start with, for a session that sees the repository under a different path. */
  readonly hostRoot?: string
}

export type Decision = { readonly action: 'allow' } | { readonly action: 'deny'; readonly reason: string }

const ALLOW: Decision = { action: 'allow' }

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

/**
 * Where `absolute` really is, links followed. A file about to be created has
 * no real path, nor may its directory: the nearest ancestor that exists is
 * resolved and the rest of the path is put back.
 */
function realPathOf(absolute: string): string | null {
  const rest: string[] = []
  let current = absolute

  for (;;) {
    try {
      return join(realpathSync.native(current), ...rest)
    } catch {
      const parent = dirname(current)

      if (parent === current) {
        return null
      }

      rest.unshift(basename(current))
      current = parent
    }
  }
}

function judge(payload: unknown, env: HookEnv): Decision {
  const input = isRecord(payload) && isRecord(payload.tool_input) ? payload.tool_input : null
  const given = input === null ? undefined : (input.file_path ?? input.notebook_path)

  if (input === null || typeof given !== 'string' || given === '') {
    return ALLOW
  }

  const roots = env.hostRoot === undefined || env.hostRoot === '' ? [env.root] : [env.root, env.hostRoot]
  const path = toRepoPath(given, roots)

  if (path === null || path === '') {
    return ALLOW
  }

  // A link to a generated file must not be a way around the guard, so the path
  // behind the link is judged too. A real path outside the roots is not.
  const real = realPathOf(join(env.root, path))
  const realRoot = realPathOf(env.root)
  const realPath = real === null ? null : toRepoPath(real, realRoot === null ? roots : [realRoot, ...roots])
  const paths = realPath === null || realPath === '' || realPath === path ? [path] : [path, realPath]
  const config = resolveOwnership(env.root, { prune: paths })

  if (config === null) {
    return ALLOW
  }

  for (const candidate of paths) {
    const rule = findGeneratedRule(config, candidate)

    if (rule !== null) {
      const origin = rule.origin.line === undefined ? rule.origin.file : `${rule.origin.file}:${rule.origin.line}`

      return {
        action: 'deny',
        reason: `${path} is a generated file, declared in ${origin}: do not edit it by hand. Change what it is generated from and run: ${rule.command} > ${rule.path}`,
      }
    }
  }

  const ownershipFile = deepestOwnershipFile(config, path) ?? config.rootFile
  const head = real === null || realPath === null ? null : readHead(real)

  if (head !== null && isGeneratedByMarker(head)) {
    return {
      action: 'deny',
      reason: `${path} carries the "generated: do not edit" marker on its first line: do not edit it by hand. Declare it in generated[] of ${ownershipFile} with the command that produces it.`,
    }
  }

  if (isRecord(payload) && payload.tool_name === 'Write' && typeof input.content === 'string' && isGeneratedByMarker(input.content)) {
    return {
      action: 'deny',
      reason: `The content for ${path} carries the "generated: do not edit" marker: a generated file is not written by hand. Declare ${path} in generated[] of ${ownershipFile} and produce it with: <command> > ${path}`,
    }
  }

  return ALLOW
}

/**
 * Whether a file tool may touch the path of its payload. Anything that keeps
 * the question from being answered — no ownership file, a load error, a
 * payload it cannot read — allows: the guard never blocks work by a defect of
 * its own.
 */
export function decideGeneratedGuard(payload: unknown, env: HookEnv): Decision {
  try {
    return judge(payload, env)
  } catch {
    return ALLOW
  }
}
