/**
 * O registro do plugin no repositório de quem instala (`RF-0013`).
 *
 * Mesclagem, nunca sobrescrita: um consumidor com hooks próprios e outros
 * plugins mantém tudo o que tem, e o toolkit acrescenta só o que falta. É a
 * mesma regra que o `init` já pratica com o CODEOWNERS — e é o passo 1 da `SK-0`
 * ("nunca criar um paralelo") visto do lado do enforcement.
 */
export const SETTINGS_PATH = '.claude/settings.json'
export const MARKETPLACE_NAME = 'living-docs'
export const PLUGIN_REF = 'living-docs@living-docs'
/** O plugin do núcleo: o living-docs depende dele, e os guardas de dono moram lá. */
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
 * O `.claude/settings.json` com o registro do plugin acrescentado.
 *
 * `added` lista o que entrou — vazio significa "já estava tudo lá", e é o que
 * torna a segunda execução silenciosa em vez de mentirosa.
 */
export function mergeSettings(current: string | null, marketplace: string): { text: string; added: string[] } {
  let root: Json = {}

  if (current !== null && current.trim() !== '') {
    let parsed: unknown

    try {
      parsed = JSON.parse(current)
    } catch (err) {
      throw new SettingsError(`${SETTINGS_PATH}: JSON inválido — ${err instanceof Error ? err.message : String(err)}`)
    }
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new SettingsError(`${SETTINGS_PATH}: o conteúdo não é um objeto JSON.`)
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
