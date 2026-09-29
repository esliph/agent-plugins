function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '')
}

/**
 * Caminho relativo à raiz do repositório, ou null se o arquivo está fora dele.
 * `roots` traz a raiz do container e a raiz do host, nessa ordem de preferência.
 */
export function toRepoPath(filePath: string, roots: readonly string[]): string | null {
  const normalized = normalize(filePath)

  const isAbsolute = normalized.startsWith('/') || /^[A-Za-z]:\//.test(normalized)

  if (!isAbsolute) {
    return normalized.replace(/^\.\//, '')
  }

  for (const root of roots) {
    const prefix = `${normalize(root)}/`

    if (normalized.toLowerCase().startsWith(prefix.toLowerCase())) {
      return normalized.slice(prefix.length)
    }
  }

  return null
}
