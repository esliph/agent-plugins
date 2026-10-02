import { isAbsolute, relative, resolve, sep } from 'node:path'
import { KanonError } from './types.ts'

export const CONFIG_PATH = '.kanon/config.yml'
export const CAPABILITIES_DIR = '.kanon/capabilities'
export const SPECS_DIR = 'specs'
export const SPEC_FILE = 'spec.md'

export function posix(path: string): string {
  return path.split(sep).join('/')
}

/** A path given by a person, as a path relative to the project root. */
export function insideRoot(root: string, given: string): string {
  const inside = relative(root, resolve(root, given))

  if (inside === '' || inside.startsWith('..') || isAbsolute(inside)) {
    throw new KanonError(`${given} is not a path inside the project.`)
  }

  return posix(inside)
}
