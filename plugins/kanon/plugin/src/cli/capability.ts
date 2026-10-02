import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { loadConfig } from '../config/config.ts'
import { SPECS_DIR, SPEC_FILE } from '../core/paths.ts'
import { PREFIX } from '../ids/id.ts'
import { loadRegistry, registryPath, writeCapability } from '../registry/registry.ts'
import { readTemplate } from './templates.ts'

export interface Registration {
  /** The files written, relative to the project root; empty when refused. */
  written: string[]
  refusal: string | null
}

// The name becomes a directory under `specs/`.
const NAME = /^[a-z0-9][a-z0-9-]*$/

function refuse(refusal: string): Registration {
  return { written: [], refusal }
}

// A capability is registered once, under a prefix unique in the project
// (RN-0043). A split gives the new capability a prefix of its own and leaves
// the requirements of the origin where they are.
export function addCapability(root: string, prefix: string, name: string, splitFrom: string | null): Registration {
  loadConfig(root)

  const registry = loadRegistry(root)
  const spec = `${SPECS_DIR}/${name}/${SPEC_FILE}`

  if (!PREFIX.test(prefix)) {
    return refuse(`"${prefix}" is not a prefix: two to five uppercase letters.`)
  }
  if (!NAME.test(name)) {
    return refuse(`"${name}" is not a capability name: lowercase letters, digits and hyphens.`)
  }
  if (registry.has(prefix)) {
    return refuse(`the prefix ${prefix} is already registered, in ${registryPath(prefix)}.`)
  }

  const sameName = [...registry.values()].find(capability => capability.name === name)

  if (sameName !== undefined || existsSync(join(root, spec))) {
    return refuse(`the name ${name} is already in use${sameName === undefined ? '' : `, by ${sameName.prefix}`}.`)
  }

  const origin = splitFrom === null ? null : (registry.get(splitFrom) ?? null)

  if (splitFrom !== null && origin === null) {
    return refuse(`the prefix ${splitFrom} is not registered, so nothing can be split from it.`)
  }

  const file = registryPath(prefix)
  const written = [file, spec]

  writeCapability(root, {
    prefix,
    name,
    counter: 0,
    tombstones: [],
    splitFrom,
    splitInto: [],
    file,
    lines: {},
    body: `\n# ${prefix} — ${name}\n`,
  })
  mkdirSync(dirname(join(root, spec)), { recursive: true })
  writeFileSync(join(root, spec), readTemplate('spec.md').replaceAll('{{NAME}}', name), 'utf8')

  if (origin !== null) {
    writeCapability(root, { ...origin, splitInto: [...origin.splitInto, prefix] })
    written.push(origin.file)
  }

  return { written, refusal: null }
}
