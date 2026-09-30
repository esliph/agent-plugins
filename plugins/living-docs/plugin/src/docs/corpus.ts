import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { LivingDocsConfig } from '../config/ownership.ts'
import { listFiles } from '../core/files.ts'

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** Every path that belongs to living-docs: artifacts, documents and generated ones. */
export function declaredPaths(config: LivingDocsConfig): string[] {
  return [...config.artifacts.map(artifact => artifact.path), ...config.documents.map(document => document.path), ...config.generated.map(generated => generated.path)].map(
    normalize,
  )
}

/**
 * The documentation corpus: everything that lives on a living-docs path and exists.
 *
 * It used to be "everything under the ownership file's directory, plus what is declared outside
 * it". With the file at the root, that directory would be the whole repository. The
 * corpus is now what the entries with a `living-docs:` block declare, which is
 * what the project said documentation is (ADR-0029). It is the set the links check
 * scans and where a binary attachment fails.
 */
export function documentationFiles(root: string, config: LivingDocsConfig): string[] {
  const files = new Set<string>()

  for (const declared of declaredPaths(config)) {
    if (declared.endsWith('/')) {
      for (const file of listFiles(root, [`${declared}**`])) {
        files.add(file)
      }
      continue
    }
    if (existsSync(join(root, declared))) {
      files.add(declared)
    }
  }

  return [...files].sort()
}
