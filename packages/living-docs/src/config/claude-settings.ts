/**
 * The plugin registration in the installing consumer's repository (`RF-0013`).
 *
 * Merge, never overwrite: a consumer with hooks of their own and other
 * plugins keeps everything they have, and the toolkit adds only what is missing. It is the
 * same rule `init` already practices with CODEOWNERS — and it is step 1 of `SK-0`
 * ("never create a parallel") seen from the enforcement side.
 */
export const SETTINGS_PATH = '.claude/settings.json'
export const MARKETPLACE_NAME = 'living-docs'
export const PLUGIN_REF = 'living-docs@living-docs'
/** The core plugin: living-docs depends on it, and the owner guards live there. */
export const CORE_PLUGIN_REF = `ownership@${MARKETPLACE_NAME}`

export class SettingsError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SettingsError'
  }
}

type Json = Record<string, unknown>

function objectAt(root: Json, key: string): Json {
  const value = root[key]

  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    return value as Json
  }
  const created: Json = {}

  root[key] = created

  return created
}

/**
 * The `.claude/settings.json` with the plugin registration added.
 *
 * `added` lists what went in — empty means "everything was already there", and that is what
 * makes the second run silent instead of lying.
 */
export function mergeSettings(current: string | null, marketplace: string): { text: string; added: string[] } {
  let root: Json = {}

  if (current !== null && current.trim() !== '') {
    let parsed: unknown

    try {
      parsed = JSON.parse(current)
    } catch (err) {
      throw new SettingsError(`${SETTINGS_PATH}: invalid JSON — ${err instanceof Error ? err.message : String(err)}`)
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new SettingsError(`${SETTINGS_PATH}: the content is not a JSON object.`)
    }
    root = parsed as Json
  }

  const added: string[] = []

  const marketplaces = objectAt(root, 'extraKnownMarketplaces')

  if (marketplaces[MARKETPLACE_NAME] === undefined) {
    marketplaces[MARKETPLACE_NAME] = { source: { source: 'github', repo: marketplace } }
    added.push(`extraKnownMarketplaces["${MARKETPLACE_NAME}"]`)
  }

  const plugins = objectAt(root, 'enabledPlugins')

  if (plugins[PLUGIN_REF] === undefined) {
    plugins[PLUGIN_REF] = true
    added.push(`enabledPlugins["${PLUGIN_REF}"]`)
  }

  if (plugins[CORE_PLUGIN_REF] === undefined) {
    plugins[CORE_PLUGIN_REF] = true
    added.push(`enabledPlugins["${CORE_PLUGIN_REF}"]`)
  }

  return { text: `${JSON.stringify(root, null, 2)}\n`, added }
}
