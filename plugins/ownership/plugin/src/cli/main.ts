import { resolve } from 'node:path'

import { OwnershipError } from '../errors.ts'
import { explainCommand } from './explain.ts'
import { USAGE, UsageError } from './usage.ts'
import { validateCommand } from './validate.ts'

export interface Io {
  readonly cwd: string
  readonly env: NodeJS.ProcessEnv
  stdout(text: string): void
  stderr(text: string): void
}

function isParseArgsError(error: unknown): error is Error {
  const code = (error as NodeJS.ErrnoException | undefined)?.code

  return error instanceof Error && typeof code === 'string' && code.startsWith('ERR_PARSE_ARGS_')
}

/** Runs one command and returns the exit code: 0 clean, 1 an error finding, 2 anything that kept the command from running. */
export async function main(argv: readonly string[], io: Io): Promise<number> {
  const [command, ...args] = argv

  if (command === undefined) {
    io.stderr(USAGE)

    return 2
  }

  if (command === '-h' || command === '--help') {
    io.stdout(USAGE)

    return 0
  }

  const root = resolve(io.cwd, io.env.OWNERSHIP_REPO_ROOT ?? '.')

  try {
    switch (command) {
      case 'validate':
        return await validateCommand(args, root, io)
      case 'explain':
        return explainCommand(args, root, io)
      default:
        io.stderr(`ownership: unknown command "${command}"\n\n${USAGE}`)

        return 2
    }
  } catch (error) {
    if (error instanceof OwnershipError) {
      io.stderr(`${error.message}\n`)

      return 2
    }

    if (error instanceof UsageError || isParseArgsError(error)) {
      io.stderr(`ownership: ${error.message}\n`)

      return 2
    }

    throw error
  }
}
