/**
 * The time ceiling of the **set** of checks (`RNF-0005`, spec §9).
 *
 * Of the set, not of each check: the set is what runs on the PR, and a per-check
 * ceiling would approve eight slow checks. The three known candidates to blow it
 * are `ownership/generated-drift` (runs a subprocess), `living-docs/agent-contract-duplication` (compares sentence with sentence) and `living-docs/links`
 * (scans the whole corpus).
 *
 * Two minutes is "minutes, on the PR" with an order of magnitude of slack over the
 * real measurement of this repository — and that is what a budget must catch:
 * an order-of-magnitude regression, not noise from a loaded machine. Raising this
 * number without a new measurement beside it turns it back into intent.
 */
export const CHECK_BUDGET_MS = 120_000

/** Milliseconds, the way whoever reads the PR log reads them. */
export function formatElapsed(ms: number): string {
  return ms < 1000 ? `${Math.round(ms)} ms` : `${(ms / 1000).toFixed(1)} s`
}
