import type { ResolvedConfig, ResolvedOwnedRule, ResolvedGeneratedRule, ResolvedWatchRule } from '../../src/resolve/hierarchy.ts'

function owned(partial: Partial<ResolvedOwnedRule> & { path: string; owner: string }): ResolvedOwnedRule {
  return {
    skill: null,
    states: null,
    format: { collection: 'per-file', key: null, keyMode: null, stateField: 'status' },
    derivesFrom: null,
    pluginBlocks: {},
    origin: '.ownership.yml',
    ...partial,
  }
}

function watch(partial: Partial<ResolvedWatchRule> & { code: string; doc: string }): ResolvedWatchRule {
  return { reason: null, consumerVisible: false, origin: '.ownership.yml', ...partial }
}

function generated(partial: Partial<ResolvedGeneratedRule> & { path: string; command: string }): ResolvedGeneratedRule {
  return { origin: '.ownership.yml', ...partial }
}

export function buildConfig(partial: {
  owned?: Parameters<typeof owned>[0][]
  watches?: Parameters<typeof watch>[0][]
  generated?: Parameters<typeof generated>[0][]
  ignore?: string[]
}): ResolvedConfig {
  return {
    version: 2,
    plugins: [],
    owned: (partial.owned ?? []).map(owned),
    watches: (partial.watches ?? []).map(watch),
    generated: (partial.generated ?? []).map(generated),
    ignore: partial.ignore ?? [],
    files: [{ file: '.ownership.yml', base: '' }],
    rootDir: '/repo',
    rootFile: '.ownership.yml',
  }
}
