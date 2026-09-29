import { mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { loadLivingDocsConfig } from '../../src/config/ownership.ts'
import type { LivingDocsConfig } from '../../src/config/ownership.ts'

/** Onde as fixtures escrevem o arquivo de ownership: a raiz, como o `init` semeia. */
export const OWNERSHIP_FILE = '.ownership.yml'

/**
 * A configuração que o adaptador lê deste YAML v2. Para teste de função pura
 * que não precisa do repositório: o arquivo vive num diretório descartável e
 * some antes do retorno. Quem precisa dos arquivos do repositório usa
 * `withTempRepo` com `OWNERSHIP_FILE` e `loadLivingDocsConfig(root)`.
 */
export function configFrom(yaml: string): LivingDocsConfig {
  const root = mkdtempSync(join(tmpdir(), 'living-docs-config-'))

  try {
    writeFileSync(join(root, OWNERSHIP_FILE), yaml, 'utf8')

    return loadLivingDocsConfig(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}
