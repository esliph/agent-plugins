import { existsSync } from 'node:fs'
import { join, posix } from 'node:path'
import { OWNERSHIP_PATH } from '../config/ownership.ts'
import type { OwnershipConfig } from '../config/ownership.ts'
import { listFiles } from '../core/files.ts'

/**
 * A raiz da documentação: o diretório onde o `.ownership.yml` mora.
 *
 * É o único caminho que o toolkit conhece, e ele o conhece desde a Fase 0
 * (`OWNERSHIP_PATH`). Derivar daqui, em vez de escrever `docs/` dentro de um
 * check, é o que mantém a spec §3 verdadeira: "hooks e checks não conhecem
 * caminho nenhum".
 */
export function docsRoot(): string {
  return posix.dirname(OWNERSHIP_PATH.replace(/\\/g, '/'))
}

function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/^\.\//, '')
}

/** Todo caminho que o `.ownership.yml` declara, em qualquer das três chaves. */
export function declaredPaths(config: OwnershipConfig): string[] {
  return [
    ...config.artifacts.map(artifact => artifact.path),
    ...config.documents.map(document => document.path),
    ...config.generated.map(generated => generated.path),
  ].map(normalize)
}

/**
 * O corpus da documentação: tudo que vive sob a raiz da documentação, mais todo
 * caminho declarado que mora fora dela e existe.
 *
 * É o conjunto de que `CI-7` cobra dono e que `CI-8` varre. `CONTRIBUTING.md`,
 * `CHANGELOG.md` e o contrato do agente entram por serem declarados; um
 * `README.md` que ninguém declarou fica de fora, e isso é deliberado — o
 * toolkit não decide que a raiz do repositório é documentação.
 */
export function documentationFiles(root: string, config: OwnershipConfig): string[] {
  const files = new Set(listFiles(root, [`${docsRoot()}/**`]))
  const prefix = `${docsRoot()}/`

  for (const declared of declaredPaths(config)) {
    if (declared.startsWith(prefix)) {
      continue
    }
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
