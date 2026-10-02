import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { loadOpenChanges, type OpenChange } from '../changes/change.ts'
import { checkCapacity } from '../checks/capacity.ts'
import { checkChanges } from '../checks/delta.ts'
import { checkEars } from '../checks/ears.ts'
import { checkIdForm, checkIds } from '../checks/ids.ts'
import { checkForbiddenWords, checkGlossary } from '../checks/vocabulary.ts'
import { loadConfig, type Config } from '../config/config.ts'
import { CHANGES_DIR, insideRoot } from '../core/paths.ts'
import { KanonError, type Finding } from '../core/types.ts'
import { parseCriterion, type ParsedCriterion } from '../ears/parse.ts'
import { loadGlossary, type Glossary } from '../glossary/glossary.ts'
import { loadRegistry, type Capability } from '../registry/registry.ts'
import { findSpecs, parseSpec, type Requirement } from '../specs/parse.ts'

export interface LintResult {
  findings: Finding[]
  errors: number
  warnings: number
  exitCode: 0 | 1
}

/** Everything the lint reads, read once. */
export interface Project {
  config: Config
  registry: Map<string, Capability>
  glossary: Glossary
  /** Path of every current spec. */
  specs: string[]
  /** The requirements of the current specs. */
  requirements: Requirement[]
  /** The changes under `changes/`, never the archived ones. */
  changes: OpenChange[]
}

export function loadProject(root: string): Project {
  const config = loadConfig(root)
  const specs = findSpecs(root)

  return {
    config,
    registry: loadRegistry(root),
    glossary: loadGlossary(root, config.glossary),
    specs,
    requirements: specs.flatMap(file => parseSpec(file, readFileSync(join(root, file), 'utf8'))),
    changes: loadOpenChanges(root),
  }
}

// Every finding of the project, by file and line. A requirement under ADDED or
// MODIFIED is held to the rules of a requirement of a current spec; the
// capacity warnings measure the current specs alone (RF-0029).
export function lintProject({ config, registry, glossary, requirements, changes }: Project): Finding[] {
  const written = changes.flatMap(change =>
    change.deltas.flatMap(delta => delta.entries.filter(entry => entry.operation !== 'REMOVED').map(entry => entry.requirement)),
  )
  const everywhere = [...requirements, ...written]
  const parsed = new Map<Requirement, ParsedCriterion>()

  for (const requirement of everywhere) {
    if (requirement.criterion !== '') {
      parsed.set(requirement, parseCriterion(requirement.criterion))
    }
  }

  return [
    ...checkIds(requirements, registry),
    ...checkIdForm(written, registry),
    ...checkCapacity(requirements, registry, config.thresholds),
    ...checkEars(everywhere, parsed),
    ...checkForbiddenWords(everywhere, config.forbiddenWords),
    ...checkGlossary(everywhere, parsed, glossary),
    ...checkChanges(changes, requirements, registry),
  ].sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
}

/**
 * Checks the current specs, the capability registries and the open changes.
 * With `only`, the whole project is still read — a duplicate ID lives in two
 * files — and only the findings of those specs and deltas are reported.
 */
export function runLint(root: string, only: readonly string[] = []): LintResult {
  const project = loadProject(root)
  const deltas = project.changes.flatMap(change => change.deltas.map(delta => delta.file))
  const selected = only.map(path => insideRoot(root, path))

  for (const path of selected) {
    if (path.startsWith(`${CHANGES_DIR}/`) ? !deltas.includes(path) : !project.specs.includes(path)) {
      throw new KanonError(path.startsWith(`${CHANGES_DIR}/`) ? `${path} is not a delta of an open change.` : `${path} is not a spec of this project.`)
    }
  }

  const findings = lintProject(project).filter(finding => selected.length === 0 || selected.includes(finding.file))
  const errors = findings.filter(finding => finding.severity === 'error').length

  return { findings, errors, warnings: findings.length - errors, exitCode: errors === 0 ? 0 : 1 }
}
