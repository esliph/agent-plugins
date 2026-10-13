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

interface CommandResult {
  code: number | null
  stdout: Buffer
  stderr: Buffer
  error?: Error
}

/** Runs a generator through the shell at the repository root. The output is streamed, so its size has no limit. */
function runCommand(command: string, cwd: string): Promise<CommandResult> {
  return new Promise(resolve => {
    const stdout: Buffer[] = []
    const stderr: Buffer[] = []
    const child = spawn(command, { cwd, shell: true, stdio: ['ignore', 'pipe', 'pipe'] })

    child.stdout.on('data', (chunk: Buffer) => stdout.push(chunk))
    child.stderr.on('data', (chunk: Buffer) => stderr.push(chunk))
    child.on('error', error => resolve({ code: null, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr), error }))
    child.on('close', code => resolve({ code, stdout: Buffer.concat(stdout), stderr: Buffer.concat(stderr) }))
  })
}

/** Why a file system call failed, by its error code when it has one. */
function reasonOf(error: unknown): string {
  const code = (error as NodeJS.ErrnoException | undefined)?.code

  return typeof code === 'string' ? code : error instanceof Error ? error.message : String(error)
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
 * The content as Git stores it. A checkout with `core.autocrlf` has CRLF line ends
 * that the committed file does not, and the same repository must give the same
 * answer on every machine, so the line-end style is not part of the comparison.
 */
function withLf(content: Buffer): Buffer {
  return content.includes(0x0d) ? Buffer.from(content.toString('latin1').replaceAll('\r\n', '\n'), 'latin1') : content
}

async function checkGenerated(ctx: CheckContext, rule: GeneratedRule): Promise<Finding[]> {
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

  const result = await runCommand(rule.command, ctx.root)

  if (result.error !== undefined || result.code !== 0) {
    const detail = firstLine(result.stderr) || firstLine(result.stdout) || result.error?.message || 'no output'
    const exit = result.code === null ? '' : ` with exit code ${result.code}`

    return [finding({ ...where, message: `${rule.origin.keyPath}.command "${rule.command}" failed${exit}: ${detail}`, fix })]
  }

  const line = firstDifferentLine(withLf(content), withLf(result.stdout))

  return line === null
    ? []
    : [finding({ file: rule.path, line, checkId: ID, severity: 'error', message: `differs from the output of "${rule.command}" from this line on`, fix })]
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
