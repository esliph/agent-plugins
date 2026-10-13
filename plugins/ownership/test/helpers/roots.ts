import { join } from 'node:path'

/** The ownership project: toolchain, tests and documentation. */
export const PROJECT_ROOT = join(import.meta.dirname, '..', '..')

/** The distributed directory: what the marketplace cache copies and `npm pack` packs. */
export const PLUGIN_ROOT = join(PROJECT_ROOT, 'plugin')
