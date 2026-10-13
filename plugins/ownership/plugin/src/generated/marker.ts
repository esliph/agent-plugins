import { closeSync, lstatSync, openSync, readSync } from 'node:fs'

const MARKER = 'generated: do not edit'

export const HEAD_BYTES = 512

/** True when the first line, within the first 512 bytes, carries `generated: do not edit`, in any case. */
export function isGeneratedByMarker(content: string | Uint8Array): boolean {
  const bytes =
    typeof content === 'string' ? Buffer.from(content.slice(0, HEAD_BYTES), 'utf8') : Buffer.from(content.buffer, content.byteOffset, content.byteLength)
  const head = bytes.subarray(0, HEAD_BYTES).toString('utf8')
  const newline = head.indexOf('\n')

  return (newline === -1 ? head : head.slice(0, newline)).toLowerCase().includes(MARKER)
}

/** The first 512 bytes of a regular file; null for a missing file, a directory, a symbolic link or a submodule. */
export function readHead(path: string): Buffer | null {
  try {
    if (!lstatSync(path).isFile()) {
      return null
    }

    const fd = openSync(path, 'r')

    try {
      const buffer = Buffer.alloc(HEAD_BYTES)

      return buffer.subarray(0, readSync(fd, buffer, 0, HEAD_BYTES, 0))
    } finally {
      closeSync(fd)
    }
  } catch {
    return null
  }
}
