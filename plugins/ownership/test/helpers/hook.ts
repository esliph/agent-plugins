import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join, sep } from 'node:path'

import { PLUGIN_ROOT } from './roots.ts'

/**
 * The bash that runs the hooks, by its full path so that a test can empty the
 * PATH. On Windows, the `bash` on PATH may be the WSL one; the host runs hooks
 * with the Git for Windows one.
 */
export function bashExecutable(): string | null {
  if (process.platform !== 'win32') {
    return existsSync('/bin/bash') ? '/bin/bash' : 'bash'
  }

  const candidate = join(process.env.ProgramFiles ?? 'C:\\Program Files', 'Git', 'bin', 'bash.exe')

  return existsSync(candidate) ? candidate : null
}

export interface HookRun {
  status: number | null
  stdout: string
  stderr: string
}

export interface HookOptions {
  /** The session's project directory. */
  project: string
  /** Raw text for stdin instead of the payload as JSON. */
  input?: string
  env?: NodeJS.ProcessEnv
  /** The plugin directory to run the wrapper from (default: the one of this project). */
  pluginRoot?: string
}

/** Runs the hooks wrapper as the host does: through bash, with the payload on stdin. */
export function runHook(bash: string, hook: string, payload: unknown, options: HookOptions): HookRun {
  const env: NodeJS.ProcessEnv = { ...process.env, CLAUDE_PROJECT_DIR: options.project }

  delete env.OWNERSHIP_HOST_ROOT
  delete env.OWNERSHIP_CONFIG
  delete env.NODE_OPTIONS
  Object.assign(env, options.env)

  const script = join(options.pluginRoot ?? PLUGIN_ROOT, 'hooks', 'run-hook.sh')
    .split(sep)
    .join('/')
  const result = spawnSync(bash, [script, hook], { cwd: options.project, env, input: options.input ?? JSON.stringify(payload), encoding: 'utf8' })

  return { status: result.status, stdout: result.stdout, stderr: result.stderr }
}
