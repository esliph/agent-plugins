/** Where a declaration was written: the file, the key path of the entry and its line. */
export interface Origin {
  file: string
  keyPath: string
  line?: number
}

/** The content of a plugin block: opaque to the core, it belongs to the plugin. */
export type PluginBlock = Readonly<Record<string, unknown>>

export type PluginBlocks = Readonly<Record<string, PluginBlock>>

export interface RawOwned {
  path: string
  owner: string
  skill?: string
  plugins: PluginBlocks
  origin: Origin
}

export interface RawGenerated {
  path: string
  command: string
  origin: Origin
}

export interface RawPath {
  path: string
  origin: Origin
}

/** One ownership file as written, paths still relative to its base. */
export interface RawFile {
  file: string
  basePath?: RawPath
  plugins: PluginBlocks
  owned: RawOwned[]
  generated: RawGenerated[]
  ignore: RawPath[]
  include: RawPath[]
}
