import { join } from 'node:path'

/** The kanon project: toolchain, tests and documentation (ADR-0036). */
export const PROJECT_ROOT = join(import.meta.dirname, '..', '..')

/** The distributed directory: what the marketplace cache copies. */
export const PLUGIN_ROOT = join(PROJECT_ROOT, 'plugin')

export const CLI = join(PLUGIN_ROOT, 'src', 'cli', 'index.ts')
