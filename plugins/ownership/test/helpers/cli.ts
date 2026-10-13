import { spawnSync } from 'node:child_process'
import { join } from 'node:path'

import { PLUGIN_ROOT } from './roots.ts'

export const CLI = join(PLUGIN_ROOT, 'src', 'cli', 'index.ts')

export interface CliResult {
  status: number | null
  stdout: string
  stderr: string
}

/** Runs the CLI from its TypeScript source, as the plugin does, with no ownership variable inherited. */
export function runCli(args: readonly string[], options: { cwd: string; env?: NodeJS.ProcessEnv; input?: string }): CliResult {
  const env: NodeJS.ProcessEnv = { ...process.env }

  delete env.OWNERSHIP_REPO_ROOT
  delete env.OWNERSHIP_CONFIG
  Object.assign(env, options.env)

  const result = spawnSync(process.execPath, [CLI, ...args], { cwd: options.cwd, env, input: options.input, encoding: 'utf8' })

  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}
