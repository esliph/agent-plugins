import { existsSync } from 'node:fs'
import { join } from 'node:path'
import type { LivingDocsConfig } from '../config/ownership.ts'
import { listFiles } from '../core/files.ts'

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** Todo caminho que é do living-docs: artefatos, documentos e gerados. */
export function declaredPaths(config: LivingDocsConfig): string[] {
  return [...config.artifacts.map(artifact => artifact.path), ...config.documents.map(document => document.path), ...config.generated.map(generated => generated.path)].map(
    normalize,
  )
}

/**
 * O corpus da documentação: tudo que mora num caminho do living-docs e existe.
 *
 * Antes era "tudo sob o diretório do arquivo de ownership, mais o declarado fora
 * dele". Com o arquivo na raiz, esse diretório seria o repositório inteiro. O
 * corpus passa a ser o que as entradas com bloco `living-docs:` declaram, que é
 * o que o projeto disse ser documentação (ADR-0029). É o conjunto que o check de
 * links varre e onde anexo binário reprova.
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
