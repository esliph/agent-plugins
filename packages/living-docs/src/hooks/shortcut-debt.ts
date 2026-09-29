#!/usr/bin/env node
/**
 * PostToolUse (Edit|Write): suggests registering the debt when a new shortcut
 * appears without a nearby `TDR-`.
 *
 * Rule of origin: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7 — "a legitimate shortcut must not
 * be blocked". The output is `additionalContext`, and this file does not
 * know the word `deny`. Project rule: `RN-0014`.
 *
 * It is the first hook that does **not** read `docs/.ownership.yml`: a shortcut marker
 * is language syntax, not a project path. There is nothing to configure, and
 * inventing configuration here would be asking the project to declare the obvious.
 */
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { applyToolInput } from './lib/edit.ts'
import { toRepoPath } from './lib/paths.ts'
import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv, HookPayload } from './lib/io.ts'

export type ShortcutDebtDecision = { action: 'silent' } | { action: 'remind'; context: string }

const SILENT: ShortcutDebtDecision = { action: 'silent' }

/**
 * Closed list, on purpose: a hook that has to interpret intent is in the
 * wrong place (spec §7). These are the markers the spec names — prose shortcut,
 * type or lint suppression, and skipped test.
 */
const SHORTCUT_MARKERS: readonly RegExp[] = Object.freeze([
  /\bTODO\b/,
  /\bFIXME\b/,
  /\bHACK\b/,
  /\bXXX\b/,
  /@ts-ignore\b/,
  /@ts-expect-error\b/,
  /eslint-disable/,
  /\b(?:test|it|describe)\.(?:skip|todo)\b/,
  /\bskip:\s*true\b/,
])

/**
 * Debt citation, in any written form (`ADR-0011`). This hook still
 * does not read `.ownership.yml`, on purpose: a shortcut marker is language syntax,
 * not a project path — and recognizing `TDR001` and `TDR-0001` requires
 * no configuration at all.
 */
const DEBT = /\bTDR-?\d{2,}\b/

/** Neighborhood window: the comment that registers the debt is usually right next to it. */
const NEAR_LINES = 2

/** Lines with a shortcut marker and no `TDR-` nearby, already trimmed. */
export function shortcutsWithoutDebt(source: string): string[] {
  const lines = source.replace(/\r\n/g, '\n').split('\n')
  const found: string[] = []

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? ''

    if (!SHORTCUT_MARKERS.some(marker => marker.test(line))) {
      continue
    }

    const window = lines.slice(Math.max(0, i - NEAR_LINES), i + NEAR_LINES + 1).join('\n')

    if (DEBT.test(window)) {
      continue
    }

    found.push(line.trim())
  }

  return found
}

/** What `after` has and `before` does not — counting repetition, not just presence. */
function onlyInAfter(before: readonly string[], after: readonly string[]): string[] {
  const remaining = [...before]
  const novos: string[] = []

  for (const line of after) {
    const at = remaining.indexOf(line)

    if (at === -1) {
      novos.push(line)
    } else {
      remaining.splice(at, 1)
    }
  }

  return novos
}

export function decideShortcutDebt(payload: HookPayload, env: HookEnv): ShortcutDebtDecision {
  const toolInput = payload.tool_input

  if (!toolInput) {
    return SILENT
  }

  const filePath = toolInput.file_path

  if (typeof filePath !== 'string') {
    return SILENT
  }

  const repoPath = toRepoPath(filePath, env.hostRoots)

  if (repoPath === null) {
    return SILENT
  }

  // In Markdown, `TODO` is prose **about** the marker — RN-0014 itself
  // writes it. A reminder on every doc edit teaches people to ignore the reminder.
  if (repoPath.toLowerCase().endsWith('.md')) {
    return SILENT
  }

  let current: string

  try {
    current = readFileSync(join(env.root, repoPath), 'utf8')
  } catch {
    current = '' // new file: everything that comes is new
  }

  const next = applyToolInput(current, toolInput)

  if (next === null) {
    return SILENT
  } // the result cannot be predicted

  const novos = onlyInAfter(shortcutsWithoutDebt(current), shortcutsWithoutDebt(next))

  if (novos.length === 0) {
    return SILENT
  }

  return {
    action: 'remind',
    context:
      `living-docs/shortcut-debt: \`${repoPath}\` gained a shortcut marker with no debt recorded nearby.\n` +
      `${novos.map(line => `- \`${line}\``).join('\n')}\n` +
      // Rule of origin: spec §7 and RN-0014.
      'A conscious shortcut becomes a `TDR-nnnn` ' +
      'with an observable payment trigger, not an orphan `TODO`. Valid path: `/debt <the shortcut>` ' +
      '(owning skill: decision-recorder), and cite the `TDR-nnnn` on the marker line.\n' +
      'This is a reminder and hands control back: a legitimate shortcut exists, and whether to record it is a human decision.',
  }
}

async function main(): Promise<void> {
  const payload = await readPayload()

  if (!payload) {
    return
  } // fails open
  const decision = decideShortcutDebt(payload, hookEnv())

  emit(decision.action === 'remind' ? contextOutput('PostToolUse', decision.context) : null)
}

if (process.argv[1]?.endsWith('shortcut-debt.ts')) {
  main().catch(() => process.exit(0)) // fails open, always
}
