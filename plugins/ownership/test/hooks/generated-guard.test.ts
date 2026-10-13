import { test } from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, symlinkSync } from 'node:fs'
import { join } from 'node:path'

import { decideGeneratedGuard } from '../../plugin/src/hooks/generated-guard.ts'
import type { Decision } from '../../plugin/src/hooks/generated-guard.ts'
import { tempRepo } from '../helpers/repo.ts'

const OWNERSHIP = [
  'version: 1',
  'owned:',
  '  - path: .ownership.yml',
  "    owner: '@a'",
  '  - path: docs/',
  "    owner: '@a'",
  'generated:',
  '  - path: docs/api.md',
  '    command: node tools/gen.mjs',
  '',
].join('\n')

const FILES = { '.ownership.yml': OWNERSHIP, 'docs/api.md': 'api\n', 'docs/guide.md': '# Guide\n', 'docs/marked.md': '<!-- GENERATED: DO NOT EDIT -->\nbody\n' }

const DECLARED =
  'docs/api.md is a generated file, declared in .ownership.yml:8: do not edit it by hand. Change what it is generated from and run: node tools/gen.mjs > docs/api.md'

function decide(root: string, tool: string, input: Record<string, unknown>, hostRoot?: string): Decision {
  return decideGeneratedGuard({ tool_name: tool, tool_input: input }, hostRoot === undefined ? { root } : { root, hostRoot })
}

function reasonOf(decision: Decision): string {
  assert.equal(decision.action, 'deny')

  return decision.action === 'deny' ? decision.reason : ''
}

test('a file declared in generated[] is denied, naming where it is declared and its command', t => {
  const root = tempRepo(t, FILES)

  assert.equal(reasonOf(decide(root, 'Edit', { file_path: join(root, 'docs', 'api.md') })), DECLARED)
})

test('every file tool is judged, by file_path or by notebook_path', t => {
  const root = tempRepo(t, FILES)

  for (const tool of ['Edit', 'Write', 'MultiEdit']) {
    assert.equal(decide(root, tool, { file_path: join(root, 'docs', 'api.md') }).action, 'deny', tool)
  }

  assert.equal(decide(root, 'NotebookEdit', { notebook_path: join(root, 'docs', 'api.md') }).action, 'deny')
})

test('a declared file is denied even before it exists', t => {
  const root = tempRepo(t, { '.ownership.yml': OWNERSHIP, 'docs/guide.md': '' })

  assert.equal(reasonOf(decide(root, 'Write', { file_path: join(root, 'docs', 'api.md'), content: 'x' })), DECLARED)
})

test('a file whose first line carries the marker is denied, asking to declare it', t => {
  const root = tempRepo(t, FILES)

  assert.equal(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'docs', 'marked.md') })),
    'docs/marked.md carries the "generated: do not edit" marker on its first line: do not edit it by hand. Declare it in generated[] of .ownership.yml with the command that produces it.',
  )
})

test('an ordinary file is allowed', t => {
  const root = tempRepo(t, FILES)

  assert.deepEqual(decide(root, 'Edit', { file_path: join(root, 'docs', 'guide.md') }), { action: 'allow' })
  assert.deepEqual(decide(root, 'Write', { file_path: join(root, 'docs', 'new.md'), content: '# New\n' }), { action: 'allow' })
})

test('a Write whose content carries the marker is denied, whether or not the file exists', t => {
  const root = tempRepo(t, FILES)
  const content = '<!-- generated: do not edit -->\nbody\n'

  assert.equal(
    reasonOf(decide(root, 'Write', { file_path: join(root, 'docs', 'new.md'), content })),
    'The content for docs/new.md carries the "generated: do not edit" marker: a generated file is not written by hand. Declare docs/new.md in generated[] of .ownership.yml and produce it with: <command> > docs/new.md',
  )
  assert.equal(decide(root, 'Write', { file_path: join(root, 'docs', 'guide.md'), content }).action, 'deny')
})

test('a Write into a directory that does not exist yet is still judged by the payload path', t => {
  const root = tempRepo(t, FILES)
  const file = join(root, 'not', 'yet', 'there', 'out.md')

  assert.match(reasonOf(decide(root, 'Write', { file_path: file, content: 'generated: do not edit\n' })), /^The content for not\/yet\/there\/out\.md carries/)
  assert.deepEqual(decide(root, 'Write', { file_path: file, content: 'plain\n' }), { action: 'allow' })
})

test('a Write of a declared file gets the message that names the command, marker or not', t => {
  const root = tempRepo(t, FILES)

  assert.equal(reasonOf(decide(root, 'Write', { file_path: join(root, 'docs', 'api.md'), content: 'generated: do not edit\n' })), DECLARED)
})

test('an Edit that introduces the marker into a file without it is not judged by its new text', t => {
  const root = tempRepo(t, FILES)

  assert.deepEqual(decide(root, 'Edit', { file_path: join(root, 'docs', 'guide.md'), old_string: '# Guide', new_string: 'generated: do not edit' }), {
    action: 'allow',
  })
})

test('the payload path may be relative, use backslashes or come under the host root', t => {
  const root = tempRepo(t, FILES)

  assert.equal(decide(root, 'Edit', { file_path: 'docs/api.md' }).action, 'deny')
  assert.equal(decide(root, 'Edit', { file_path: 'docs\\api.md' }).action, 'deny')
  assert.equal(decide(root, 'Edit', { file_path: '/host/checkout/docs/api.md' }, '/host/checkout').action, 'deny')
  assert.equal(decide(root, 'Edit', { file_path: 'C:\\Host\\Checkout\\docs\\api.md' }, 'c:\\host\\checkout').action, 'deny')
})

test('a path outside the roots, or a payload without a path, is allowed', t => {
  const root = tempRepo(t, FILES)

  assert.deepEqual(decide(root, 'Edit', { file_path: '/somewhere/else/docs/api.md' }), { action: 'allow' })
  assert.deepEqual(decide(root, 'Edit', { file_path: '/host/checkout/docs/api.md' }), { action: 'allow' })
  assert.deepEqual(decide(root, 'Edit', {}), { action: 'allow' })
  assert.deepEqual(decide(root, 'Edit', { file_path: 12 }), { action: 'allow' })
  assert.deepEqual(decideGeneratedGuard(null, { root }), { action: 'allow' })
  assert.deepEqual(decideGeneratedGuard('text', { root }), { action: 'allow' })
  assert.deepEqual(decideGeneratedGuard({ tool_name: 'Edit', tool_input: [] }, { root }), { action: 'allow' })
})

test('a link to a generated file is denied: the path behind the link is judged too', t => {
  const root = tempRepo(t, FILES)

  try {
    symlinkSync(join(root, 'docs', 'api.md'), join(root, 'docs', 'alias.md'), 'file')
    symlinkSync(join(root, 'docs', 'marked.md'), join(root, 'docs', 'alias-marked.md'), 'file')
  } catch {
    t.skip('this machine cannot create symbolic links; CI (ubuntu) runs this proof')

    return
  }

  assert.match(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'docs', 'alias.md') })),
    /^docs\/alias\.md is a generated file, declared in \.ownership\.yml:8/,
  )
  assert.match(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'docs', 'alias-marked.md') })),
    /^docs\/alias-marked\.md carries the "generated: do not edit" marker/,
  )
})

test('a path through a linked directory is judged by where it really is', t => {
  const root = tempRepo(t, FILES)

  // A junction needs no privilege on Windows; elsewhere this is an ordinary directory link.
  symlinkSync(join(root, 'docs'), join(root, 'manual'), process.platform === 'win32' ? 'junction' : 'dir')

  assert.match(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'manual', 'api.md') })),
    /^manual\/api\.md is a generated file, declared in \.ownership\.yml:8/,
  )
  assert.match(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'manual', 'marked.md') })),
    /^manual\/marked\.md carries the "generated: do not edit" marker/,
  )
  assert.deepEqual(decide(root, 'Edit', { file_path: join(root, 'manual', 'guide.md') }), { action: 'allow' })
})

test('a link that leads outside the repository is judged by the payload path alone', t => {
  const root = tempRepo(t, FILES)
  const outside = tempRepo(t, { 'marked.md': 'generated: do not edit\n' }, { git: false })

  try {
    symlinkSync(join(outside, 'marked.md'), join(root, 'docs', 'out-link.md'), 'file')
  } catch {
    t.skip('this machine cannot create symbolic links; CI (ubuntu) runs this proof')

    return
  }

  assert.deepEqual(decide(root, 'Edit', { file_path: join(root, 'docs', 'out-link.md') }), { action: 'allow' })
})

test('without an ownership file, or with one that does not load, the guard is silent', t => {
  const none = tempRepo(t, { 'docs/marked.md': 'generated: do not edit\n' })
  const broken = tempRepo(t, { '.ownership.yml': 'version: 2\n', 'docs/marked.md': 'generated: do not edit\n' })
  const noGit = tempRepo(t, FILES, { git: false })

  assert.deepEqual(decide(none, 'Edit', { file_path: join(none, 'docs', 'marked.md') }), { action: 'allow' })
  assert.deepEqual(decide(broken, 'Edit', { file_path: join(broken, 'docs', 'marked.md') }), { action: 'allow' })
  assert.deepEqual(decide(noGit, 'Edit', { file_path: join(noGit, 'docs', 'api.md') }), { action: 'allow' })
})

test('only the includes that can hold the path are read: a broken one elsewhere does not silence the guard', t => {
  const root = tempRepo(t, {
    ...FILES,
    '.ownership.yml': `${OWNERSHIP}include:\n  - plugins/x/\n  - plugins/y/\n`,
    'plugins/x/.ownership.yml': 'version: 2\n',
    'plugins/y/.ownership.yml': "version: 1\nowned:\n  - path: out/\n    owner: '@y'\ngenerated:\n  - path: out/gen.md\n    command: make gen\n",
  })

  assert.equal(decide(root, 'Edit', { file_path: join(root, 'docs', 'api.md') }).action, 'deny')
  assert.equal(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'plugins', 'y', 'out', 'gen.md') })),
    'plugins/y/out/gen.md is a generated file, declared in plugins/y/.ownership.yml:6: do not edit it by hand. Change what it is generated from and run: make gen > plugins/y/out/gen.md',
  )
  assert.deepEqual(decide(root, 'Edit', { file_path: join(root, 'plugins', 'x', 'a.md') }), { action: 'allow' })
  assert.equal(existsSync(join(root, 'plugins', 'x', '.ownership.yml')), true)
})

test('a marker file inside an included base is to be declared in that ownership file', t => {
  const root = tempRepo(t, {
    '.ownership.yml': 'version: 1\ninclude:\n  - plugins/y/\n',
    'plugins/y/.ownership.yml': 'version: 1\n',
    'plugins/y/gen.md': 'generated: do not edit\n',
  })

  assert.match(
    reasonOf(decide(root, 'Edit', { file_path: join(root, 'plugins', 'y', 'gen.md') })),
    /Declare it in generated\[\] of plugins\/y\/\.ownership\.yml /,
  )
})
