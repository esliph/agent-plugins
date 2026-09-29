import { test } from 'node:test'
import assert from 'node:assert/strict'
import { decideGeneratedGuard } from '../../src/hooks/generated-guard.ts'
import { withTempRepo } from '../helpers/tmp.ts'

const env = (root: string) => ({ root, hostRoots: [root] })

test('a path declared in generated[] is denied, even if the file does not exist yet', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\ngenerated:\n  - path: out.md\n    command: gen\n' }, root => {
    const decision = decideGeneratedGuard({ tool_input: { file_path: 'out.md' } }, env(root))

    assert.equal(decision.action, 'deny')
  })
})

test('a file with the marker on the first line is denied', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'x.md': 'generated: do not edit\nbody\n' }, root => {
    const decision = decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root))

    assert.equal(decision.action, 'deny')
  })
})

test('an ordinary file is allowed', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'x.md': 'ordinary body\n' }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root)).action, 'allow')
  })
})

test('without .ownership.yml, fails open', () => {
  withTempRepo({}, root => {
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root)).action, 'allow')
  })
})

test('the marker only counts on the first line — prose about it, or a marker on line 20, does not freeze the file', () => {
  const body = ['# Title', ...Array.from({ length: 18 }, () => 'line'), 'generated: do not edit', 'end'].join('\n')

  // Prose about the marker well after the first line: it is the spec case, and the
  // sentence on the first line of the file would, in fact, be the marker.
  const prose = `${'line of prose\n'.repeat(400)}the marker \`generated: do not edit\` is from the spec\n`

  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n', 'x.md': body, 'y.md': prose }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'x.md' } }, env(root)).action, 'allow')
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'y.md' } }, env(root)).action, 'allow')
  })
})

test('payload without file_path allows', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\n' }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: {} }, env(root)).action, 'allow')
  })
})

test('an absolute host file_path under the root is translated and denied when generated', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\ngenerated:\n  - path: out.md\n    command: gen\n' }, root => {
    const absolute = `${root.split('\\').join('/')}/out.md`

    assert.equal(decideGeneratedGuard({ tool_input: { file_path: absolute } }, env(root)).action, 'deny')
  })
})

test('generated[] requires an exact path — a declared directory does not cover what is inside it', () => {
  withTempRepo({ '.ownership.yml': 'version: 2\nowned: []\ngenerated:\n  - path: out/\n    command: gen\n', 'out/a.md': 'body\n' }, root => {
    assert.equal(decideGeneratedGuard({ tool_input: { file_path: 'out/a.md' } }, env(root)).action, 'allow')
  })
})
