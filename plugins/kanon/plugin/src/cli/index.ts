#!/usr/bin/env node
import { resolve } from 'node:path'
import { KanonError } from '../core/types.ts'
import { addCapability } from './capability.ts'
import { allocateId } from './id.ts'
import { runInit } from './init.ts'
import { runLint } from './lint.ts'
import { formatFindings } from './report.ts'

const USAGE = `kanon <command>

  init [--glossary <path>] [--constitution <path>]
      Creates the configuration, the constitution and the glossary. Overwrites nothing.
  lint [<spec>...]
      Checks the current specs and the capability registries; given specs, only those.
  id next <CAP>
      Allocates the next requirement ID of a capability and prints it.
  capability add <CAP> <name> [--split-from <CAP>]
      Registers a capability; with --split-from, records it as a split of another.

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
