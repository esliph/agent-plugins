// The public surface. Renaming or removing a name here breaks whoever builds on this package.

export { resolveOwnership } from './resolve/resolve.ts'
export { findGeneratedRule, findOwnedRule } from './resolve/lookup.ts'
export { explainPath } from './resolve/explain.ts'
export { entriesForPlugin } from './resolve/plugins.ts'
export type { GeneratedRule, IgnoreRule, OwnedRule, OwnershipFileInfo, ResolvedOwnership, ResolveOptions, Rule, RuleOrigin, TrieNode } from './resolve/types.ts'
export type { Coverage, ExplainContext, GeneratedOrigin, PathExplanation } from './resolve/explain.ts'
export type { PluginEntry } from './resolve/plugins.ts'
export type { PluginBlock, PluginBlocks } from './schema/types.ts'

export { coreCheckCatalog, coreChecks } from './checks/core.ts'
export type { CatalogEntry } from './checks/core.ts'
export type { Check, CheckContext, Finding, Severity } from './checks/types.ts'

export { loadCodeowners } from './codeowners/locate.ts'
export { ownersOf } from './codeowners/match.ts'
export { parseCodeowners } from './codeowners/parse.ts'
export type { Codeowners, CodeownersLine, OwnersResult } from './codeowners/types.ts'

export { isGeneratedByMarker } from './generated/marker.ts'

export { OwnershipError } from './errors.ts'
export type { Issue } from './errors.ts'
