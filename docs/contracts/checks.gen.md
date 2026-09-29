<!-- generated: do not edit -->
<!-- source: src/checks/catalog.ts (CHECK_CATALOG) and the core catalog (CORE_CHECK_CATALOG) — regenerate: run this file with node --conditions=development -->

# Checks contract

The identifiers below are public and stable: they appear in the CLI output, are
cited by the Definition of Done of whoever uses the toolkit, and do not change
meaning (`docs/contracts/versioning-policy.md`). Each rule runs in a single plugin.

## living-docs

| ID | Check | Fails when | Command |
| --- | --- | --- | --- |
| living-docs/frontmatter | structure lint | Frontmatter missing or invalid; empty required field; `id` outside the format or the territory of the artifact; `status` in an artifact with no declared `states`; collection item without `status`; `trigger` missing or empty; `last-reviewed` outside the ISO format. | `living-docs validate` |
| living-docs/id-integrity | ID lint | Duplicate ID, out of sequence, or reused from `docs/ids-retired.txt`; citation that does not resolve to an existing item. | `living-docs validate` |
| living-docs/citation-coverage | traceability | Open bidirectional pair; `active` requirement with no citation in the `cited-by` paths; `accepted` ADR without `relates-to`; `resolved` open decision without the ADR that closed it. | `living-docs validate` |
| living-docs/staleness | staleness | An `open` debt does not declare a verifiable `pay-when`, or the declared trigger has already happened in the repository. `last-reviewed` beyond `stale-after-months` produces a warning, not a failure — and an item in a frozen state does not expire. | `living-docs validate` |
| living-docs/agent-contract-duplication | agent contract duplication | The agent contract repeats, word for word, a sentence from an artifact or document with an owning skill, above the toolkit word floor. | `living-docs validate` |
| living-docs/done-verifiable | done verifiable | A Definition of Done item does not name what verifies it — the identifier of a check or hook, or the fixed marker `human`. | `living-docs validate` |
| living-docs/open-decision-claim | open decision claim | The diff between the base and `HEAD` touches a path claimed by an open decision, with no `Docs: none — <reason>` in any commit message. | `living-docs validate --base <ref>` |
| living-docs/links | links | Relative internal link that does not resolve to an existing file or directory; `[[wikilink]]` with no target in the corpus; binary-format file in the documentation. A link inside a code block or inline markup does not count. | `living-docs validate` |
| living-docs/commit-discipline | commit discipline | With `--base <ref>`: the diff changes only the review date of `last-reviewed-bump-limit` documents or more, with no other change in the body of any of them; or it changes an artifact file and no commit message in the diff cites one of the IDs declared in it. | `living-docs validate` |
| living-docs/trigger-routing | trigger routing | Never fails. Warns when a document with a `trigger` declares an owning skill that the toolkit root does not have; the `trigger` of a collection item is not examined. | `living-docs validate` |
| living-docs/external-audience | external audience | A document or artifact declared `audience: external` cites, outside the frontmatter and fenced code blocks, an ID whose prefix has a declared family (`id-prefix`) — in prose, in backticks or in a link path. | `living-docs validate` |

## ownership

| ID | Check | Fails when | Command |
| --- | --- | --- | --- |
| ownership/declared-state | declared state | O estado de um arquivo ou item (o campo de `state-field`, `status` por padrão) está fora de `states` declarado para o caminho; a mesma chave aparece duas vezes no mesmo arquivo; ou o `owner` do frontmatter não começa com `@`. | `ownership validate` |
| ownership/generated-drift | generated drift | A saída do comando declarado em `generated[]` difere do arquivo versionado; o comando falha; ou o arquivo declarado não existe. | `ownership validate` |
| ownership/owner-coverage | owner coverage | Um arquivo do repositório não é coberto por `owned[]` nem por `ignore`; um caminho de `owned[]` não existe ou não tem linha no CODEOWNERS; o CODEOWNERS não existe; ou o `doc` de uma regra de `watches` não existe ou não tem entrada em `owned[]`. | `ownership validate` |
| ownership/derivation-resolves | derivation resolves | Um documento que deriva de uma fonte não declara o campo de derivação, ou o campo aponta para fora da fonte ou para arquivo inexistente. | `ownership validate` |
| ownership/watch-satisfied | watch satisfied | O diff entre a base e `HEAD` toca um caminho de `watches` e o `doc` da regra não está no mesmo diff, sem `Docs: none — <razão>` em alguma mensagem de commit. | `ownership validate --base <ref>` |
| ownership/consumer-change-logged | consumer change logged | O diff toca um caminho de `watches` marcado `consumer-visible: true` e o `doc` da regra não vem no mesmo diff com item em `## [Unreleased]`, sem `Changelog: none — <razão>` em alguma mensagem de commit. | `ownership validate --base <ref>` |
