import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/** `templates/` sits beside `src/` in the plugin directory. */
const TEMPLATES = join(import.meta.dirname, '..', '..', 'templates')

export function readTemplate(name: string): string {
  return readFileSync(join(TEMPLATES, name), 'utf8')
}
