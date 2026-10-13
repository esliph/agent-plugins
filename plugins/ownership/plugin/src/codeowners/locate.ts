import { readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

import { OwnershipError } from '../errors.ts'
import { parseCodeowners } from './parse.ts'
import type { Codeowners } from './types.ts'

/** Where GitHub looks for the CODEOWNERS. */
export const CODEOWNERS_LOCATIONS = ['.github/CODEOWNERS', 'CODEOWNERS', 'docs/CODEOWNERS'] as const

function isFile(path: string): boolean {
  try {
    return statSync(path).isFile()
  } catch {
    return false
  }
}

/** The CODEOWNERS of the repository, or null. GitHub would silently use the first of several; here that is an error. */
export function findCodeowners(root: string): string | null {
  const present = CODEOWNERS_LOCATIONS.filter(location => isFile(join(root, location)))

  if (present.length > 1) {
    throw new OwnershipError([
      {
        file: present[0] ?? CODEOWNERS_LOCATIONS[1],
        message: `more than one CODEOWNERS: ${present.join(', ')}; GitHub reads only the first and ignores the others`,
        fix: 'keep one CODEOWNERS and remove the others',
      },
    ])
  }

  return present[0] ?? null
}

export function loadCodeowners(root: string): Codeowners | null {
  const file = findCodeowners(root)

  return file === null ? null : parseCodeowners(readFileSync(join(root, file), 'utf8'), file)
}
