/**
 * O contrato público dos checks do núcleo. O `living-docs` o imprime junto do
 * dele em `docs/contracts/checks.gen.md`. Só tipos e dados, de propósito: um
 * gerador não precisa puxar YAML nem git para listar o que existe.
 */
export interface CatalogEntry {
  id: string
  name: string
  command: string
  failsWhen: string
}

export const CORE_CHECK_CATALOG: readonly CatalogEntry[] = Object.freeze([
  {
    id: 'ownership/declared-state',
    name: 'declared state',
    command: 'ownership validate',
    failsWhen:
      'The state of a file or item (the `state-field` field, `status` by default) is outside the `states` declared for the path; the same key appears twice in one file; or the frontmatter `owner` does not start with `@`.',
  },
  {
    id: 'ownership/generated-drift',
    name: 'generated drift',
    command: 'ownership validate',
    failsWhen: 'The output of the command declared in `generated[]` differs from the versioned file; the command fails; or the declared file does not exist.',
  },
  {
    id: 'ownership/owner-coverage',
    name: 'owner coverage',
    command: 'ownership validate',
    failsWhen:
      'A repository file is covered by neither `owned[]` nor `ignore`; an `owned[]` path does not exist or has no line in CODEOWNERS; CODEOWNERS does not exist; or the `doc` of a `watches` rule does not exist or has no entry in `owned[]`.',
  },
  {
    id: 'ownership/derivation-resolves',
    name: 'derivation resolves',
    command: 'ownership validate',
    failsWhen: 'A document that derives from a source does not declare the derivation field, or the field points outside the source or to a file that does not exist.',
  },
  {
    id: 'ownership/watch-satisfied',
    name: 'watch satisfied',
    command: 'ownership validate --base <ref>',
    failsWhen:
      'The diff between the base and `HEAD` touches a `watches` path and the `doc` of the rule is not in the same diff, with no `Docs: none — <reason>` in any commit message.',
  },
  {
    id: 'ownership/consumer-change-logged',
    name: 'consumer change logged',
    command: 'ownership validate --base <ref>',
    failsWhen:
      'The diff touches a `watches` path marked `consumer-visible: true` and the `doc` of the rule is not in the same diff with an item under `## [Unreleased]`, with no `Changelog: none — <reason>` in any commit message.',
  },
])
