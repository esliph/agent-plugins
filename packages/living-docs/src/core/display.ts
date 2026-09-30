/**
 * How a value read from a file or from a process shows in a message. A string
 * is itself; a map or a list shows as written in JSON, never as
 * `[object Object]`; a Buffer (the stderr of a child process) is its text.
 */
export function display(value: unknown): string {
  if (typeof value === 'string') {
    return value
  }
  if (Buffer.isBuffer(value)) {
    return value.toString('utf8')
  }
  if (value === undefined || typeof value === 'bigint' || typeof value === 'symbol' || typeof value === 'function') {
    return String(value)
  }

  try {
    return JSON.stringify(value)
  } catch {
    // A cyclic structure (YAML aliases) cannot be written as JSON.
    return Object.prototype.toString.call(value)
  }
}
