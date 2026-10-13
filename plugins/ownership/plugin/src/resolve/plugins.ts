import { OwnershipError } from '../errors.ts'
import { PLUGIN_NAME } from '../schema/parse.ts'
import type { PluginBlock } from '../schema/types.ts'
import type { ResolvedOwnership } from './types.ts'

export interface PluginEntry {
  readonly path: string
  readonly owner: string
  readonly skill?: string
  /** The ownership file that declares the entry. */
  readonly source: string
  readonly entry: PluginBlock
  /** The global block of the plugin, when the root configures one. Never merged with `entry`. */
  readonly global?: PluginBlock
}

/**
 * The owned entries that link the plugin `name`. The core has no registry of
 * plugin names, so a valid name with no entry gives an empty list — it cannot
 * tell a plugin with no paths from a misspelled name.
 */
export function entriesForPlugin(config: ResolvedOwnership, name: string): PluginEntry[] {
  if (!PLUGIN_NAME.test(name)) {
    throw new OwnershipError([
      { file: config.rootFile, message: `plugin name "${name}" must match ^[a-z][a-z0-9-]*$`, fix: 'pass the name of the plugin as written under plugins' },
    ])
  }

  const global = Object.hasOwn(config.plugins, name) ? config.plugins[name] : undefined

  return config.owned
    .filter(rule => Object.hasOwn(rule.plugins, name))
    .map(rule => ({
      path: rule.path,
      owner: rule.owner,
      ...(rule.skill === undefined ? {} : { skill: rule.skill }),
      source: rule.origin.file,
      entry: rule.plugins[name] ?? {},
      ...(global === undefined ? {} : { global }),
    }))
}
