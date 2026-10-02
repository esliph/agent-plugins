const SPECIAL = /[.*+?^${}()|[\]\\]/g

/** Matches a word or phrase as whole words, in any letter case and across any run of spaces. */
export function wholeWord(phrase: string): RegExp {
  const words = phrase
    .trim()
    .split(/\s+/)
    .map(word => word.replace(SPECIAL, '\\$&'))

  return new RegExp(`(?<![\\p{L}\\p{N}_])${words.join('\\s+')}(?![\\p{L}\\p{N}_])`, 'iu')
}

/** The form two spellings of one term share. */
export function termKey(term: string): string {
  return term.trim().replace(/\s+/g, ' ').toLowerCase()
}
