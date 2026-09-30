// The marketplace manifest and the minimum governance of each plugin (RN-0041).
// Plain Node with no dependency: the root has no toolchain (ADR-0036).
import { existsSync, readFileSync } from 'node:fs'
import { dirname, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const GOVERNANCE = ['README.md', 'CHANGELOG.md', '.ownership.yml']

function posix(path) {
  return path.split(sep).join('/')
}

function readJson(root, path, problems, who) {
  try {
    return JSON.parse(readFileSync(join(root, path), 'utf8'))
  } catch (error) {
    problems.push(`${who}: ${path} does not parse — ${error instanceof Error ? error.message : String(error)}`)

    return null
  }
}

/** Every problem found, one string each, prefixed by the plugin name. Empty when all holds. */
export function checkMarketplace(root) {
  const problems = []
  const manifest = readJson(root, '.claude-plugin/marketplace.json', problems, 'marketplace')

  if (manifest === null) {
    return problems
  }
  if (!Array.isArray(manifest.plugins) || manifest.plugins.length === 0) {
    return ['marketplace: `plugins` must be a non-empty list.']
  }

  for (const entry of manifest.plugins) {
    const name = typeof entry?.name === 'string' ? entry.name : '(unnamed)'

    if (typeof entry?.source !== 'string') {
      problems.push(`${name}: \`source\` must be a path.`)
      continue
    }

    const source = resolve(root, entry.source)
    const inside = posix(relative(root, source))

    if (inside === '..' || inside.startsWith('../') || resolve(inside) === inside) {
      problems.push(`${name}: source ${entry.source} is outside the repository.`)
      continue
    }
    if (inside === '') {
      problems.push(`${name}: source ${entry.source} is the repository root; it must be the plugin's distributed directory.`)
      continue
    }
    if (!existsSync(source)) {
      problems.push(`${name}: source ${entry.source} does not exist.`)
      continue
    }

    const pluginJson = `${inside}/.claude-plugin/plugin.json`

    if (!existsSync(join(root, pluginJson))) {
      problems.push(`${name}: ${pluginJson} is missing.`)
    } else {
      const plugin = readJson(root, pluginJson, problems, name)

      if (plugin !== null && plugin.name !== entry.name) {
        problems.push(`${name}: ${pluginJson} declares name "${plugin.name}".`)
      }
      if (plugin !== null && entry.version !== undefined && plugin.version !== entry.version) {
        problems.push(`${name}: the marketplace says version ${entry.version} and ${pluginJson} says ${plugin.version}.`)
      }
    }

    const project = posix(relative(root, dirname(source)))

    for (const file of GOVERNANCE) {
      const path = project === '' ? file : `${project}/${file}`

      if (!existsSync(join(root, path))) {
        problems.push(`${name}: ${path} is missing.`)
      }
    }
  }

  return problems
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const problems = checkMarketplace(resolve(process.argv[2] ?? '.'))

  for (const problem of problems) {
    process.stderr.write(`${problem}\n`)
  }
  if (problems.length === 0) {
    process.stdout.write('marketplace: manifests and plugin governance hold.\n')
  }
  process.exit(problems.length === 0 ? 0 : 1)
}
