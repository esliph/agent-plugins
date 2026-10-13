export const USAGE = `Usage: ownership <command> [options]

Commands:
  validate [--check <id>]... [--format text|json|github] [--jobs <n>] [--ownership <path>]
      Run the checks over the whole repository.
  explain <path> [--ownership <path>]
      Show every rule that reaches a path and where it was declared.
  init [--owner <@x> | --from-codeowners] [--stdout] [--ownership <path>]
      Create the root ownership file.

The commands run on the current directory; OWNERSHIP_REPO_ROOT points at another repository.
`

/** A wrong command line: the CLI prints the message and exits 2. */
export class UsageError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'UsageError'
  }
}
