import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CONFIG_PATH } from '../core/paths.ts'
import { KanonError } from '../core/types.ts'
import { parseYaml } from '../core/yaml.ts'

export interface Config {
  glossary: string
  constitution: string
  forbiddenWords: string[]
  thresholds: {
    /** Active requirements from which a capability gets the design warning. */
    activeRequirements: number
    /** Counter value from which a capability gets the capacity warning. */
    counter: number
  }
}

export const DEFAULTS: Config = {
  glossary: 'specs/glossary.md',
  constitution: 'specs/constitution.md',
  forbiddenWords: [],
  thresholds: { activeRequirements: 150, counter: 900 },
}

function invalid(what: string): never {
  throw new KanonError(`${CONFIG_PATH}: ${what}`)
}

function path(value: unknown, key: string, fallback: string): string {
  if (value === undefined) {
    return fallback
  }
  if (typeof value !== 'string' || value.trim() === '') {
    invalid(`\`${key}\` must be a path.`)
  }

  return value
}

function threshold(value: unknown, key: string, fallback: number): number {
  if (value === undefined) {
    return fallback
  }
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) {
    invalid(`\`thresholds.${key}\` must be a positive whole number.`)
  }

  return value
}

export function configExists(root: string): boolean {
  return existsSync(join(root, CONFIG_PATH))
}

export function loadConfig(root: string): Config {
  if (!configExists(root)) {
    throw new KanonError(`no configuration at ${CONFIG_PATH} — run \`kanon init\` first.`)
  }

  let raw: Record<string, unknown>

  try {
    raw = parseYaml(readFileSync(join(root, CONFIG_PATH), 'utf8'))
  } catch (error) {
    invalid(`does not parse — ${error instanceof Error ? error.message : String(error)}`)
  }

  const words = raw['forbidden-words'] ?? []
  const thresholds = raw.thresholds ?? {}

  if (!Array.isArray(words) || words.some(word => typeof word !== 'string' || word.trim() === '')) {
    invalid('`forbidden-words` must be a list of words or phrases.')
  }
  if (typeof thresholds !== 'object' || thresholds === null || Array.isArray(thresholds)) {
    invalid('`thresholds` must be a map.')
  }

  const limits = thresholds as Record<string, unknown>

  return {
    glossary: path(raw.glossary, 'glossary', DEFAULTS.glossary),
    constitution: path(raw.constitution, 'constitution', DEFAULTS.constitution),
    forbiddenWords: words as string[],
    thresholds: {
      activeRequirements: threshold(limits['active-requirements'], 'active-requirements', DEFAULTS.thresholds.activeRequirements),
      counter: threshold(limits.counter, 'counter', DEFAULTS.thresholds.counter),
    },
  }
}
