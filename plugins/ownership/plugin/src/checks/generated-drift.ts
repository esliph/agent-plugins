import { spawn } from 'node:child_process'
import { readFileSync, statSync } from 'node:fs'
import type { Stats } from 'node:fs'
import { join } from 'node:path'

import { isGeneratedByMarker, readHead } from '../generated/marker.ts'
import { deepestOwnershipFile, findGeneratedRule, findIgnoreRule } from '../resolve/lookup.ts'
import type { GeneratedRule } from '../resolve/types.ts'
import { runPool } from './pool.ts'
import type { Check, CheckContext, Finding } from './types.ts'
import { finding } from './types.ts'

const ID = 'ownership/generated-drift'

/**
 * How long one generator may run. A generator that hangs (a network call, a lock)
 * would otherwise keep `validate`, and the CI job with it, waiting forever with no
 * finding. The limit is generous so that a slow but healthy generator still passes.
 */
export const GENERATOR_TIMEOUT_MS = 10 * 60 * 1000

interface CommandResult {
  code: number | null
  stdout: Buffer
  stderr: Buffer
  error?: Error
  timedOut?: boolean
}

/**
 * Stops the shell and everything it started. Killing only the shell would leave
 * the generator running and holding the pipes open.
 */
function killTree(pid: number): Promise<void> {
  if (process.platform === 'win32') {
    return new Promise(resolve => {
      const taskkill = spawn('taskkill', ['/pid', String(pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true })

      taskkill.on('error', () => resolve())
      taskkill.on('close', () => resolve())
    })
  }

  try {
    process.kill(-pid, 'SIGKILL')
  } catch {
    // The group is already gone.
  }

  return Promise.resolve()
}

/** Runs a generator through the shell at the repository root. The output is streamed, so its size has no limit. */
function runCommand(command: string, cwd: string, timeoutMs: number): Promise<CommandResult> {
  return new Promise(resolve => {
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    // Its own process group on POSIX, so that a timeout can stop the whole tree.
    const child = spawn(command, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'], detached: process.platform !== 'win32', windowsHide: true })
    let settled = false
    const settle = (result: CommandResult): void => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve(result)
      }
    }
    const timer = setTimeout(() => {
      if (settled || child.pid === undefined) {
        return
      }

      settled = true
      void killTree(child.pid).then(() => {
        child.stdout.destroy()
        child.stderr.destroy()
        resolve({ code: null, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr), timedOut: true })
      })
    }, timeoutMs)

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', error => settle({ code: null, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr), error }))
    child.on('close', code => settle({ code, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) }))
  })
}

/** Why a file system call failed, by its error code when it has one. */
function reasonOf(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code

  return typeof code === 'string' ? code : error instanceof Error ? error.message : String(error)
}

function seconds(ms: number): string {
  return `${Number((ms / 1000).toFixed(1))} s`
}

function firstLine(output: Buffer): string {
  return (
    output
      .toString('utf8')
      .split(/\r?\n/)
      .map(line => line.trim())
      .find(line => line !== '') ?? ''
  )
}

/** The 1-based line of the first byte where the two contents differ, or null when they are equal. */
export function firstDifferentLine(expected: Buffer, actual: Buffer): number | null {
  const shorter = Math.min(expected.length, actual.length)
  let at = 0

  while (at < shorter && expected[at] === actual[at]) {
    at += 1
  }

  if (at === shorter && expected.length === actual.length) {
    return null
  }

  let line = 1

  for (let i = 0; i < at; i++) {
    if (expected[i] === 0x0a) {
      line += 1
    }
  }

  return line
}

/**
 * The object id Git would give `content` if it were added at `path`: the
 * `.gitattributes` and `core.autocrlf` conversions of that path apply, so a
 * checkout whose line ends Git converts compares equal, and a line end Git keeps
 * does not. Rejects with the first line of Git's error.
 */
function storedHash(root: string, path: string, content: Buffer): Promise<string> {
  return new Promise((resolve, reject) => {
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const child = spawn('git', ['hash-object', `--path=${path}`, '--stdin'], { cwd: root, stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true })

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', reject)
    child.on('close', code => {
      if (code === 0) {
        resolve(Buffer.concat(stdout).toString('utf8').trim())
      } else {
        reject(new Error(firstLine(Buffer.concat(stderr)) || `git hash-object exited with code ${code}`))
      }
    })
    // A filter that exits without reading its input closes the pipe; the exit code tells.
    child.stdin.on('error', () => undefined)
    child.stdin.end(content)
  })
}

/** Only to point at a line: the decision itself comes from the stored hashes. */
function withoutCr(content: Buffer): Buffer {
  return content.includes(0x0d) ? Buffer.from(content.toString('latin1').replaceAll('\r\n', '\n'), 'latin1') : content
}

/** The findings of one declared generated file. */
export async function checkGenerated(ctx: CheckContext, rule: GeneratedRule, timeoutMs = GENERATOR_TIMEOUT_MS): Promise<Finding[]> {
  const fix = `${rule.command} > ${rule.path}`
  const where = { file: rule.origin.file, line: rule.origin.line, checkId: ID, severity: 'error' as const }
  const absolute = join(ctx.root, rule.path)

  let stat: Stats | undefined

  try {
    stat = statSync(absolute, { throwIfNoEntry: false })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOTDIR') {
      return [finding({ ...where, message: `${rule.origin.keyPath}.path "${rule.path}" cannot be read: ${reasonOf(error)}`, fix })]
    }
  }

  if (stat === undefined) {
    return [finding({ ...where, message: `${rule.origin.keyPath}.path "${rule.path}" does not exist`, fix })]
  }

  // A generated path is always a file: a directory there means the declared file is missing.
  if (stat.isDirectory()) {
    return [finding({ ...where, message: `${rule.origin.keyPath}.path "${rule.path}" is a directory, not a file`, fix })]
  }

  let content: Buffer

  // A file that cannot be read is a finding like a missing one, never a crash that
  // would leave CI unable to tell it from a run with findings.
  try {
    content = readFileSync(absolute)
  } catch (error) {
    return [finding({ ...where, message: `${rule.origin.keyPath}.path "${rule.path}" cannot be read: ${reasonOf(error)}`, fix })]
  }

  const result = await runCommand(rule.command, ctx.root, timeoutMs)

  if (result.timedOut === true) {
    return [finding({ ...where, message: `${rule.origin.keyPath}.command "${rule.command}" did not finish within ${seconds(timeoutMs)} and was stopped`, fix })]
  }

  if (result.error !== undefined || result.code !== 0) {
    const detail = firstLine(result.stderr) || firstLine(result.stdout) || result.error?.message || 'no output'
    const exit = result.code === null ? '' : ` with exit code ${result.code}`

    return [finding({ ...where, message: `${rule.origin.keyPath}.command "${rule.command}" failed${exit}: ${detail}`, fix })]
  }

  // The same bytes at the same path are stored the same way: no need to ask Git.
  if (content.equals(result.stdout)) {
    return []
  }

  // Both git calls are waited for, even when one fails, so that none is still running when the check ends.
  const [file, output] = await Promise.allSettled([storedHash(ctx.root, rule.path, content), storedHash(ctx.root, rule.path, result.stdout)])

  if (file.status === 'rejected' || output.status === 'rejected') {
    const reason: unknown = file.status === 'rejected' ? file.reason : output.status === 'rejected' ? output.reason : undefined

    return [finding({ ...where, message: `${rule.origin.keyPath}.path "${rule.path}" could not be hashed by git: ${reasonOf(reason)}`, fix })]
  }

  if (file.value === output.value) {
    return []
  }

  // When the only difference is in line ends that Git keeps, the first byte that differs is the line.
  const line = firstDifferentLine(withoutCr(content), withoutCr(result.stdout)) ?? firstDifferentLine(content, result.stdout) ?? 1

  return [finding({ file: rule.path, line, checkId: ID, severity: 'error', message: `differs from the output of "${rule.command}" from this line on`, fix })]
}

/** Files outside generated[] and ignore that still say they are generated. Links and submodules are not read. */
function markerFindings(ctx: CheckContext): Finding[] {
  const findings: Finding[] = []

  for (const file of ctx.repoFiles) {
    if (findGeneratedRule(ctx.config, file) !== null || findIgnoreRule(ctx.config, file) !== null) {
      continue
    }

    const head = readHead(join(ctx.root, file))

    if (head !== null && isGeneratedByMarker(head)) {
      findings.push(
        finding({
          file,
          line: 1,
          checkId: ID,
          severity: 'error',
          message: 'carries the "generated: do not edit" marker but is not declared in generated[]',
          fix: `declare it in generated[] of ${deepestOwnershipFile(ctx.config, file) ?? ctx.config.rootFile} with the command that produces it`,
        }),
      )
    }
  }

  return findings
}

export const generatedDrift: Check = {
  id: ID,
  name: 'Generated drift',
  failsWhen:
    'a generated file differs from the output of its command; the command fails; the declared file is missing; a file carries the generated marker outside generated[]',
  async run(ctx) {
    const declared = await runPool(ctx.config.generated, ctx.jobs, rule => checkGenerated(ctx, rule))

    return [...declared.flat(), ...markerFindings(ctx)]
  },
}
