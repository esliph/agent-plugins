import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { checkCapacity } from '../checks/capacity.ts'
import { checkEars } from '../checks/ears.ts'
import { checkIds } from '../checks/ids.ts'
import { checkForbiddenWords, checkGlossary } from '../checks/vocabulary.ts'
import { loadConfig } from '../config/config.ts'
import { insideRoot } from '../core/paths.ts'
import { KanonError, type Finding } from '../core/types.ts'
import { parseCriterion, type ParsedCriterion } from '../ears/parse.ts'
import { loadGlossary } from '../glossary/glossary.ts'
import { loadRegistry } from '../registry/registry.ts'
import { findSpecs, parseSpec, type Requirement } from '../specs/parse.ts'

export interface LintResult {
  findings: Finding[]
  errors: number
  warnings: number
  exitCode: 0 | 1
}

/**
 * Checks the current specs and the capability registries. With `only`, the
 * whole project is still read — a duplicate ID lives in two files — and only
 * the findings of those specs are reported.
 */
export function runLint(root: string, only: readonly string[] = []): LintResult {
  const config = loadConfig(root)
  const registry = loadRegistry(root)
  const glossary = loadGlossary(root, config.glossary)
  const specs = findSpecs(root)
  const selected = only.map(path => insideRoot(root, path))

  for (const path of selected) {
    if (!specs.includes(path)) {
      throw new KanonError(`${path} is not a spec of this project.`)
    }
  }

  const requirements: Requirement[] = specs.flatMap(file => parseSpec(file, readFileSync(join(root, file), 'utf8')))
  const parsed = new Map<Requirement, ParsedCriterion>()

  for (const requirement of requirements) {
    if (requirement.criterion !== '') {
      parsed.set(requirement, parseCriterion(requirement.criterion))
    }
  }

  const findings = [
    ...checkIds(requirements, registry),
    ...checkCapacity(requirements, registry, config.thresholds),
    ...checkEars(requirements, parsed),
    ...checkForbiddenWords(requirements, config.forbiddenWords),
    ...checkGlossary(requirements, parsed, glossary),
  ]
    .filter(finding => selected.length === 0 || selected.includes(finding.file))
    .sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)

  const errors = findings.filter(finding => finding.severity === 'error').length

  return { findings, errors, warnings: findings.length - errors, exitCode: errors === 0 ? 0 : 1 }
}
