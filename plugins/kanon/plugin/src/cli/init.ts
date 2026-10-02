import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { DEFAULTS, configExists, loadConfig } from '../config/config.ts'
import { CONFIG_PATH, insideRoot } from '../core/paths.ts'
import { readTemplate } from './templates.ts'

export interface InitOptions {
  glossary?: string
  constitution?: string
}

export interface InitOutcome {
  path: string
  /** `pointed`: the configuration names a file the project already keeps, and none was created. */
  outcome: 'created' | 'kept' | 'pointed'
}

function seed(root: string, path: string, content: string): InitOutcome['outcome'] {
  if (existsSync(join(root, path))) {
    return 'kept'
  }
  mkdirSync(dirname(join(root, path)), { recursive: true })
  writeFileSync(join(root, path), content, 'utf8')

  return 'created'
}

// The foundation, and nothing overwritten (RF-0021). A project that already
// has a glossary or a constitution points to it and never gets a second one
// (RN-0051).
export function runInit(root: string, options: InitOptions = {}): InitOutcome[] {
  const hadConfig = configExists(root)
  const pointed = {
    glossary: !hadConfig && options.glossary !== undefined,
    constitution: !hadConfig && options.constitution !== undefined,
  }
  // An existing configuration is kept, and so are the paths it names.
  const paths = hadConfig
    ? loadConfig(root)
    : {
        glossary: options.glossary === undefined ? DEFAULTS.glossary : insideRoot(root, options.glossary),
        constitution: options.constitution === undefined ? DEFAULTS.constitution : insideRoot(root, options.constitution),
      }
  const config = readTemplate('config.yml').replaceAll('{{GLOSSARY}}', paths.glossary).replaceAll('{{CONSTITUTION}}', paths.constitution)

  return [
    { path: CONFIG_PATH, outcome: seed(root, CONFIG_PATH, config) },
    { path: paths.constitution, outcome: pointed.constitution ? 'pointed' : seed(root, paths.constitution, readTemplate('constitution.md')) },
    { path: paths.glossary, outcome: pointed.glossary ? 'pointed' : seed(root, paths.glossary, readTemplate('glossary.md')) },
  ]
}
