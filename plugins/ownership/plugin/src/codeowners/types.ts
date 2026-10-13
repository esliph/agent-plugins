export interface CodeownersLine {
  readonly pattern: string
  /** Empty when the line has a pattern and no owner: on GitHub, that unsets the owner. */
  readonly owners: readonly string[]
  readonly line: number
  readonly regex: RegExp
  readonly dirOnly: boolean
}

export interface Codeowners {
  readonly file: string
  readonly lines: readonly CodeownersLine[]
}

export type OwnersResult =
  { readonly kind: 'no-codeowners' } | { readonly kind: 'unmatched' } | { readonly kind: 'matched'; readonly owners: readonly string[]; readonly line: number }
