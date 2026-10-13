import { segmentsOf } from '../paths/paths.ts'

/**
 * The paths that replace `outer` so that it stops containing `inner`: level by
 * level, from `outer` down to `inner`, every child of the level except the one
 * that leads to `inner`, directories with a trailing `/`. A child that an
 * ignore leaves out is not listed. Sorted.
 */
export function splitSuggestion(outer: string, inner: string, repoFiles: ReadonlySet<string>, isIgnored: (path: string) => boolean): string[] {
  const rest = segmentsOf(inner.slice(outer.length))
  const levels: { dir: string; skip: string }[] = []
  let dir = outer

  rest.forEach((segment, i) => {
    const leadsToFile = i === rest.length - 1 && !inner.endsWith('/')

    levels.push({ dir, skip: leadsToFile ? segment : `${segment}/` })
    dir = `${dir}${segment}/`
  })

  const children = new Set<string>()

  for (const file of repoFiles) {
    for (const level of levels) {
      if (!file.startsWith(level.dir)) {
        break
      }

      const tail = file.slice(level.dir.length)
      const slash = tail.indexOf('/')
      const child = slash === -1 ? tail : tail.slice(0, slash + 1)

      if (child !== level.skip) {
        children.add(`${level.dir}${child}`)
      }
    }
  }

  return [...children].filter(child => !isIgnored(child)).sort()
}
