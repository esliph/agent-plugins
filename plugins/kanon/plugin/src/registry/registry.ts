import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { parseFrontmatter, renderFrontmatter } from '../core/frontmatter.ts'
import { CAPABILITIES_DIR } from '../core/paths.ts'
import { KanonError } from '../core/types.ts'
import { LIMIT, PREFIX, parseId } from '../ids/id.ts'

// One registry file per capability, so that changes in different capabilities
// never contend for the same file (RN-0043).
export interface Capability {
  prefix: string
  name: string
  counter: number
  tombstones: string[]
  splitFrom: string | null
  splitInto: string[]
  /** Path of the registry file, relative to the project root. */
  file: string
  lines: Record<string, number>
  body: string
}

export function registryPath(prefix: string): string {
  return `${CAPABILITIES_DIR}/${prefix}.md`
}

function strings(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(item => typeof item === 'string')
}

function parseCapability(file: string, expectedPrefix: string, source: string): Capability {
  const invalid = (what: string): never => {
    throw new KanonError(`${file}: ${what}`)
  }

  let frontmatter: ReturnType<typeof parseFrontmatter>

  try {
    frontmatter = parseFrontmatter(source)
  } catch (error) {
    return invalid(`the front matter does not parse — ${error instanceof Error ? error.message : String(error)}`)
  }
  if (frontmatter === null) {
    return invalid('has no front matter.')
  }

  const { data, lines, body } = frontmatter
  const tombstones = data.tombstones ?? []
  const splitFrom = data['split-from'] ?? null
  const splitInto = data['split-into'] ?? []

  if (data.prefix !== expectedPrefix) {
    return invalid(`\`prefix\` must be ${expectedPrefix}, the name of the file.`)
  }
  if (typeof data.name !== 'string' || data.name.trim() === '') {
    return invalid('`name` must be the name of the capability.')
  }
  if (typeof data.counter !== 'number' || !Number.isInteger(data.counter) || data.counter < 0 || data.counter > LIMIT) {
    return invalid(`\`counter\` must be a whole number from 0 to ${LIMIT}.`)
  }
  if (!strings(tombstones) || tombstones.some(id => parseId(id) === null)) {
    return invalid('`tombstones` must be a list of requirement IDs.')
  }
  if (splitFrom !== null && typeof splitFrom !== 'string') {
    return invalid('`split-from` must be a capability prefix.')
  }
  if (!strings(splitInto)) {
    return invalid('`split-into` must be a list of capability prefixes.')
  }

  return { prefix: expectedPrefix, name: data.name, counter: data.counter, tombstones, splitFrom, splitInto, file, lines, body }
}

/** Every registered capability, by prefix. Empty when the project has none yet. */
export function loadRegistry(root: string): Map<string, Capability> {
  const registry = new Map<string, Capability>()
  const dir = join(root, CAPABILITIES_DIR)

  if (!existsSync(dir)) {
    return registry
  }

  for (const entry of readdirSync(dir).sort()) {
    if (!entry.endsWith('.md')) {
      continue
    }

    const prefix = entry.slice(0, -'.md'.length)
    const file = registryPath(prefix)

    if (!PREFIX.test(prefix)) {
      throw new KanonError(`${file}: the name of a registry file is a prefix of two to five uppercase letters.`)
    }
    registry.set(prefix, parseCapability(file, prefix, readFileSync(join(root, file), 'utf8')))
  }

  return registry
}

export function writeCapability(root: string, capability: Capability): void {
  const target = join(root, capability.file)
  const data = {
    prefix: capability.prefix,
    name: capability.name,
    counter: capability.counter,
    tombstones: capability.tombstones,
    'split-from': capability.splitFrom,
    'split-into': capability.splitInto,
  }

  mkdirSync(dirname(target), { recursive: true })
  writeFileSync(target, renderFrontmatter(data, capability.body), 'utf8')
}
