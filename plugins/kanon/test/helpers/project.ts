import { spawnSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { CLI } from './roots.ts'

/** Creates a disposable project with the given files and removes it at the end. */
export function withProject(files: Record<string, string>, fn: (root: string) => void): void {
  const root = mkdtempSync(join(tmpdir(), 'kanon-'))

  try {
    for (const [relative, content] of Object.entries(files)) {
      const absolute = join(root, relative)

      mkdirSync(dirname(absolute), { recursive: true })
      writeFileSync(absolute, content, 'utf8')
    }
    fn(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

export const CONFIG = [
  'version: 1',
  'glossary: specs/glossary.md',
  'constitution: specs/constitution.md',
  'forbidden-words: []',
  'thresholds:',
  '  active-requirements: 150',
  '  counter: 900',
  '',
].join('\n')

export const GLOSSARY = [
  '# Glossary',
  '',
  '| Term | Definition | Status |',
  '| --- | --- | --- |',
  '| Checkout | The purchase flow | active |',
  '| coupon | A discount code | active |',
  '| voucher | Write coupon instead | banned |',
  '',
].join('\n')

export function capability(prefix: string, name: string, counter: number, tombstones: readonly string[] = []): string {
  return [
    '---',
    `prefix: ${prefix}`,
    `name: ${name}`,
    `counter: ${counter}`,
    `tombstones: [${tombstones.join(', ')}]`,
    'split-from: null',
    'split-into: []',
    '---',
    '',
    `# ${prefix} — ${name}`,
    '',
  ].join('\n')
}

export function requirement(id: string, pattern: string, criterion: string): string {
  return `### ${id} [${pattern}]\n\n${criterion}\n`
}

/** An initialized project with the `CHK` capability and the given spec for it. */
export function project(spec: string, extra: Record<string, string> = {}): Record<string, string> {
  return {
    '.kanon/config.yml': CONFIG,
    '.kanon/capabilities/CHK.md': capability('CHK', 'checkout', 20),
    'specs/glossary.md': GLOSSARY,
    'specs/checkout/spec.md': `# checkout\n\n${spec}`,
    ...extra,
  }
}

export function kanon(root: string, ...args: string[]): { status: number | null; stdout: string; stderr: string } {
  const env: NodeJS.ProcessEnv = { ...process.env, KANON_REPO_ROOT: root }
  const run = spawnSync('node', [CLI, ...args], { cwd: root, env, encoding: 'utf8' })

  return { status: run.status, stdout: run.stdout, stderr: run.stderr }
}
