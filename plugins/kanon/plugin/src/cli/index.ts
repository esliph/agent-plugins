#!/usr/bin/env node
import { resolve } from 'node:path'
import { DATE } from '../changes/change.ts'
import { KanonError } from '../core/types.ts'
import { addCapability } from './capability.ts'
import { dropChange, openChange, syncChange, type Ending } from './change.ts'
import { allocateId } from './id.ts'
import { runInit } from './init.ts'
import { runLint } from './lint.ts'
import { formatFindings } from './report.ts'
import { formatStatus, runStatus } from './status.ts'

const USAGE = `kanon <command>

  init [--glossary <path>] [--constitution <path>]
      Creates the configuration, the constitution and the glossary. Overwrites nothing.
  lint [<path>...]
      Checks the current specs, the capability registries and the open changes;
      given paths, only those specs and deltas.
  id next <CAP>
      Allocates the next requirement ID of a capability and prints it.
  capability add <CAP> <name> [--split-from <CAP>]
      Registers a capability; with --split-from, records it as a split of another.
  change open <slug>
      Opens a change under today's date and prints its ID.
  change sync <id>
      Applies the deltas of a change to the current specs and archives it.
  change drop <id>
      Abandons a change: the IDs it allocated become tombstones, and it is archived.
  status
      Lists the open changes, what each does to each capability and its findings.

Exit codes: 0 done, 1 an error was found or the request was refused, 2 could not run.
`

/** Removes `--name <value>` from the arguments and returns the value; null when absent. */
function takeOption(args: string[], name: string): string | null {
  const index = args.indexOf(name)

  if (index === -1) {
    return null
  }

  const value = args[index + 1]

  if (value === undefined || value.startsWith('--')) {
    throw new KanonError(`\`${name}\` needs a value.`)
  }
  args.splice(index, 2)

  return value
}

function repoRoot(): string {
  return resolve(process.env.KANON_REPO_ROOT ?? process.cwd())
}

/** The local date, as YYYY-MM-DD. `KANON_TODAY` fixes it, for a run that must not depend on the clock. */
function today(): string {
  const fixed = process.env.KANON_TODAY

  if (fixed !== undefined) {
    if (!DATE.test(fixed)) {
      throw new KanonError(`KANON_TODAY must be a date as YYYY-MM-DD, and it is "${fixed}".`)
    }

    return fixed
  }

  const now = new Date()
  const two = (value: number): string => String(value).padStart(2, '0')

  return `${now.getFullYear()}-${two(now.getMonth() + 1)}-${two(now.getDate())}`
}

/** Prints how a change ended, or why it did not. */
function report(ending: Ending): number {
  if (ending.findings.length > 0) {
    process.stdout.write(`${formatFindings(ending.findings)}\n`)
  }
  if (ending.refusal !== null) {
    process.stderr.write(`kanon: ${ending.refusal}\n`)

    return 1
  }
  for (const note of ending.notes) {
    process.stdout.write(`${note}\n`)
  }
  for (const path of ending.written) {
    process.stdout.write(`written  ${path}\n`)
  }
  if (ending.moved !== null) {
    process.stdout.write(`moved  ${ending.moved.from} -> ${ending.moved.to}\n`)
  }

  return 0
}

function run(root: string, command: string, args: string[]): number {
  if (command === 'lint') {
    const result = runLint(root, args)

    process.stdout.write(`${formatFindings(result.findings)}\n`)

    return result.exitCode
  }

  if (command === 'init') {
    const glossary = takeOption(args, '--glossary') ?? undefined
    const constitution = takeOption(args, '--constitution') ?? undefined

    for (const { path, outcome } of runInit(root, { glossary, constitution })) {
      process.stdout.write(`${outcome}  ${path}\n`)
    }

    return 0
  }

  if (command === 'id' && args[0] === 'next' && args[1] !== undefined) {
    const allocation = allocateId(root, args[1])

    if (allocation.warning !== null) {
      process.stderr.write(`kanon: ${allocation.warning}\n`)
    }
    if (allocation.id === null) {
      process.stderr.write(`kanon: ${allocation.refusal}\n`)

      return 1
    }
    process.stdout.write(`${allocation.id}\n`)

    return 0
  }

  if (command === 'capability' && args[0] === 'add') {
    const splitFrom = takeOption(args, '--split-from')
    const [, prefix, name] = args

    if (prefix !== undefined && name !== undefined) {
      const registration = addCapability(root, prefix, name, splitFrom)

      if (registration.refusal !== null) {
        process.stderr.write(`kanon: ${registration.refusal}\n`)

        return 1
      }
      for (const path of registration.written) {
        process.stdout.write(`written  ${path}\n`)
      }

      return 0
    }
  }

  if (command === 'change' && args[1] !== undefined) {
    if (args[0] === 'open') {
      const opening = openChange(root, args[1], today())

      if (opening.id === null) {
        process.stderr.write(`kanon: ${opening.refusal}\n`)

        return 1
      }
      process.stdout.write(`${opening.id}\n`)

      return 0
    }
    if (args[0] === 'sync') {
      return report(syncChange(root, args[1]))
    }
    if (args[0] === 'drop') {
      return report(dropChange(root, args[1]))
    }
  }

  if (command === 'status') {
    process.stdout.write(`${formatStatus(runStatus(root))}\n`)

    return 0
  }

  process.stderr.write(`kanon: unknown or incomplete command.\n\n${USAGE}`)

  return 2
}

function main(argv: readonly string[]): number {
  const [command, ...args] = argv

  if (command === undefined || command === '--help' || command === '-h') {
    process.stdout.write(USAGE)

    return command === undefined ? 2 : 0
  }

  try {
    return run(repoRoot(), command, args)
  } catch (error) {
    if (error instanceof KanonError) {
      process.stderr.write(`kanon: ${error.message}\n`)

      return 2
    }
    throw error
  }
}

process.exitCode = main(process.argv.slice(2))
