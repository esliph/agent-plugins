function normalize(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/+$/, '')
}

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
