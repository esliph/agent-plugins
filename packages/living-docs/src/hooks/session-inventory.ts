#!/usr/bin/env node
/**
 * SessionStart: injects the living-documentation inventory into the context.
 *
 * Rule of origin: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7 and `RN-0022` — "resolves 'if
 * nobody reads it, it is not alive' at the source". The output is `additionalContext`, and this
 * file knows neither `deny` nor `ask`.
 *
 * It does not reimplement `living-docs/staleness`: it calls `staleDocs` and `duePayments`. An inventory that
 * disagreed with the check would give two different numbers for the same question, and
 * nobody would know which to believe.
 */
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { loadLivingDocsConfig } from '../config/ownership.ts'
import { collectArtifacts, collectDocuments } from '../docs/collect.ts'
import type { ArtifactDoc } from '../docs/collect.ts'
import { duePayments, staleDocs } from '../checks/staleness.ts'
import { todayIso } from '../core/dates.ts'
import { forgetTree } from '../core/files.ts'
import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts'
import type { HookEnv } from './lib/io.ts'

export type SessionInventoryDecision = { action: 'silent' } | { action: 'inform'; context: string }

const SILENT: SessionInventoryDecision = { action: 'silent' }

/**
 * How many items of each list go into the context. The inventory is read in every
 * session: a long list costs context every time and teaches people to skip the whole block.
 */
const MAX_ITEMS = 5

/** The state that identifies an open-decision family (spec §4: `open → resolved`). */
const DECISION_STATE = 'resolved'

function shorten(items: readonly string[]): string {
  const shown = items.slice(0, MAX_ITEMS).join('; ')

  return items.length > MAX_ITEMS ? `${shown}; … (+${items.length - MAX_ITEMS})` : shown
}

/** Open decisions: `open` items of a family whose state machine has `resolved`. */
function openDecisions(docs: readonly ArtifactDoc[]): string[] {
  const found: string[] = []

  for (const doc of docs) {
    if (!doc.rule.states?.includes(DECISION_STATE)) {
      continue
    }

    if (doc.rule.collection === 'per-file') {
      const data = doc.frontmatter?.data

      if (data?.status === 'open') {
        found.push(`${String(data.id)} (${doc.file})`)
      }
      continue
    }

    for (const item of doc.items) {
      if (item.state === 'open') {
        found.push(`${item.key} (${doc.file}:${item.line})`)
      }
    }
  }

  return found
}

export function decideSessionInventory(env: HookEnv, today: string): SessionInventoryDecision {
  let inventory: { lines: string[] }

  try {
    // Same policy as `validate`: the scan is memoized per root within the
    // process, and a new decision starts with the tree as it is now.
    forgetTree(env.root)

    const config = loadLivingDocsConfig(env.root)
    const docs = collectArtifacts(env.root, config)
    const documents = collectDocuments(env.root, config)
    const context = { root: env.root, config, docs, documents, today }

    const ausentes = [
      ...config.artifacts.filter(artifact => !existsSync(join(env.root, artifact.path))).map(artifact => `${artifact.idPrefix} (${artifact.path})`),
      ...config.documents.filter(document => !existsSync(join(env.root, document.path))).map(document => document.path),
    ]

    const abertas = openDecisions(docs)
    const vencidas = duePayments(context)
    const velhos = staleDocs(context)

    const lines = [
      `living-docs/session-inventory: inventory of the living documentation (source: \`${config.rootFile}\`).`,
      `Declared: ${config.artifacts.length} artifact(s) and ${config.documents.length} document(s).`,
    ]

    if (ausentes.length > 0) {
      lines.push(`Declared and missing (${ausentes.length}): ${shorten(ausentes)}.`)
    }
    if (abertas.length > 0) {
      lines.push(
        `Open decision (${abertas.length}): ${shorten(abertas)}. While it is open, the rule does not exist and the ` + 'implementation stops (`/open-decision`).',
      )
    }
    if (vencidas.length > 0) {
      lines.push(
        // Rule of origin: spec §12, criterion 7.
        `Debt with its payment trigger met (${vencidas.length}): ${shorten(
          vencidas.map(payment => `${payment.id} — ${payment.evidence}`),
        )}. \`living-docs validate\` fails until it is paid or reclassified.`,
      )
    }
    if (velhos.length > 0) {
      lines.push(
        `Expired document (${velhos.length}): ${shorten(
          velhos.map(stale => `${stale.file} (${stale.months} months)`),
        )}. This is a warning: re-read before touching \`last-reviewed\`.`,
      )
    }

    lines.push('Nothing here blocks — it is context. Enforcement is `living-docs validate` and the hooks living-docs/append-only to ownership/commit-guard and living-docs/shortcut-debt.')

    inventory = { lines }
  } catch {
    return SILENT // fails open (RNF-0001)
  }

  return { action: 'inform', context: inventory.lines.join('\n') }
}

async function main(): Promise<void> {
  // The SessionStart payload carries no `tool_input`; reading it is only the stdin
  // contract, and an unreadable payload silences the hook like any other error.
  const payload = await readPayload()

  if (!payload) {
    return
  }

  const decision = decideSessionInventory(hookEnv(), todayIso())

  emit(decision.action === 'inform' ? contextOutput('SessionStart', decision.context) : null)
}

if (process.argv[1]?.endsWith('session-inventory.ts')) {
  main().catch(() => process.exit(0)) // fails open, always
}
