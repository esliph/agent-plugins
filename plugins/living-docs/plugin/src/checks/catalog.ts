export interface CatalogEntry {
  id: string
  name: string
  /** The CLI command that runs this check. */
  command: string
  /** The failure condition — the 'Fails when' column of spec §9. */
  failsWhen: string
}

/**
 * The public contract of the checks: this is what a consuming project cites in
 * its Definition of Done, and it is the annotated source of `docs/contracts/checks.gen.md`
 * (`ownership/generated-drift` compares it with the generator output). To change the
 * contract, change it here and regenerate — never the other way around. The core catalog lives in
 * `@esliph/ownership` (`CORE_CHECK_CATALOG`).
 *
 * This file imports nothing (neither `yaml`, `picomatch`, `node:child_process`,
 * nor the living-docs/frontmatter/2/3 checks): it is only types and data, on purpose — `src/tools/gen-checks.ts`
 * imports from here, and not from `registry.ts`, so as not to transitively pull in
 * dependencies a generator does not need.
 */
export const CHECK_CATALOG: readonly CatalogEntry[] = Object.freeze([
  {
    id: 'living-docs/frontmatter',
    name: 'structure lint',
    command: 'living-docs validate',
    failsWhen:
      'Frontmatter missing or invalid; empty required field; `id` outside the format or the territory of the artifact; `status` in an artifact with no declared `states`; collection item without `status`; `trigger` missing or empty; `last-reviewed` outside the ISO format.',
  },
  {
    id: 'living-docs/id-integrity',
    name: 'ID lint',
    command: 'living-docs validate',
    failsWhen: 'Duplicate ID, out of sequence, or reused from `docs/ids-retired.txt`; citation that does not resolve to an existing item.',
  },
  {
    id: 'living-docs/citation-coverage',
    name: 'traceability',
    command: 'living-docs validate',
    failsWhen:
      'Open bidirectional pair; `active` requirement with no citation in the `cited-by` paths; `accepted` ADR without `relates-to`; `resolved` open decision without the ADR that closed it.',
  },
  {
    id: 'living-docs/staleness',
    name: 'staleness',
    command: 'living-docs validate',
    failsWhen:
      'An `open` debt does not declare a verifiable `pay-when`, or the declared trigger has already happened in the repository. `last-reviewed` beyond `stale-after-months` produces a warning, not a failure — and an item in a frozen state does not expire.',
  },
  {
    id: 'living-docs/agent-contract-duplication',
    name: 'agent contract duplication',
    command: 'living-docs validate',
    failsWhen: 'The agent contract repeats, word for word, a sentence from an artifact or document with an owning skill, above the toolkit word floor.',
  },
  {
    id: 'living-docs/done-verifiable',
    name: 'done verifiable',
    command: 'living-docs validate',
    failsWhen: 'A Definition of Done item does not name what verifies it — the identifier of a check or hook, or the fixed marker `human`.',
  },
  {
    id: 'living-docs/open-decision-claim',
    name: 'open decision claim',
    command: 'living-docs validate --base <ref>',
    failsWhen: 'The diff between the base and `HEAD` touches a path claimed by an open decision, with no `Docs: none — <reason>` in any commit message.',
  },
  {
    id: 'living-docs/links',
    name: 'links',
    command: 'living-docs validate',
    failsWhen:
      'Relative internal link that does not resolve to an existing file or directory; `[[wikilink]]` with no target in the corpus; binary-format file in the documentation. A link inside a code block or inline markup does not count.',
  },
  {
    id: 'living-docs/commit-discipline',
    name: 'commit discipline',
    command: 'living-docs validate',
    failsWhen:
      'With `--base <ref>`: the diff changes only the review date of `last-reviewed-bump-limit` documents or more, with no other change in the body of any of them; or it changes an artifact file and no commit message in the diff cites one of the IDs declared in it.',
  },
  {
    id: 'living-docs/trigger-routing',
    name: 'trigger routing',
    command: 'living-docs validate',
    failsWhen:
      'Never fails. Warns when a document with a `trigger` declares an owning skill that the toolkit root does not have; the `trigger` of a collection item is not examined.',
  },
  {
    id: 'living-docs/external-audience',
    name: 'external audience',
    command: 'living-docs validate',
    failsWhen:
      'A document or artifact declared `audience: external` cites, outside the frontmatter and fenced code blocks, an ID whose prefix has a declared family (`id-prefix`) — in prose, in backticks or in a link path.',
  },
])
