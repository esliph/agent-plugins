import { test } from 'node:test'
import assert from 'node:assert/strict'

import { runCli } from '../helpers/cli.ts'
import { tempRepo } from '../helpers/repo.ts'

/** The same structure twice: once written in English, once in Portuguese and Japanese. */
const ENGLISH = {
  '.ownership.yml': [
    '# Who owns what in this repository.',
    'version: 1',
    'owned:',
    '  # The documentation team.',
    '  - path: docs/',
    "    owner: '@docs'",
    '  - path: missing/',
    "    owner: '@docs'",
    'generated:',
    '  - path: docs/api.md',
    '    command: node gen.mjs',
    '',
  ].join('\n'),
  CODEOWNERS: '# Reviewers of the documentation\ndocs/ @other\n',
  'docs/guide.md': '# Guide\n\nThis file is generated: do not edit it, said the prose on line three.\n',
  'docs/api.md': '# The API\n',
  'docs/marked.md': '<!-- generated: do not edit -->\n# A generated page\n',
  'README.md': '# Read me\n\nNobody owns this file yet.\n',
}

const OTHER = {
  '.ownership.yml': ENGLISH['.ownership.yml']
    .replace('# Who owns what in this repository.', '# Quem é dono de quê neste repositório.')
    .replace('# The documentation team.', '# ドキュメントチーム。'),
  CODEOWNERS: '# Revisores da documentação\ndocs/ @other\n',
  'docs/guide.md': '# Guia\n\nEste arquivo é gerado: não edite, dizia a prosa na linha três.\n',
  'docs/api.md': '# A API\n',
  'docs/marked.md': '<!-- generated: do not edit -->\n# 生成されたページ\n',
  'README.md': '# Leia-me\n\nNinguém é dono deste arquivo ainda.\n',
}

test('a repository written in another language gives exactly the same findings', t => {
  const english = runCli(['validate', '--format', 'json'], { cwd: tempRepo(t, ENGLISH) })
  const other = runCli(['validate', '--format', 'json'], { cwd: tempRepo(t, OTHER) })
  const findings = (JSON.parse(english.stdout) as { findings: { checkId: string }[] }).findings

  assert.equal(english.status, 1)
  assert.equal(other.stdout, english.stdout)
  assert.deepEqual([...new Set(findings.map(item => item.checkId))].sort(), [
    'ownership/codeowners-match',
    'ownership/generated-drift',
    'ownership/owner-coverage',
  ])
})
