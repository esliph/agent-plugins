#!/usr/bin/env node
/**
 * SessionStart: injeta o inventário da documentação viva no contexto.
 *
 * Regra de origem: docs/superpowers/research/2026-08-24-living-documentation-toolkit.md §7 e `RN-0022` — "resolve 'se
 * ninguém lê, não está vivo' na origem". A saída é `additionalContext`, e este
 * arquivo não conhece `deny` nem `ask`.
 *
 * Não reimplementa `living-docs/staleness`: chama `staleDocs` e `duePayments`. Um inventário que
 * discordasse do check faria dois números diferentes sobre a mesma pergunta, e
 * ninguém saberia qual acreditar.
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
 * Quantos itens de cada lista entram no contexto. O inventário é lido em toda
 * sessão: lista longa custa contexto sempre e ensina a pular o bloco inteiro.
 */
const MAX_ITEMS = 5

/** O estado que identifica família de decisão aberta (spec §4: `open → resolved`). */
const DECISION_STATE = 'resolved'

function shorten(items: readonly string[]): string {
  const shown = items.slice(0, MAX_ITEMS).join('; ')

  return items.length > MAX_ITEMS ? `${shown}; … (+${items.length - MAX_ITEMS})` : shown
}

/** Decisões abertas: itens `open` de família cuja máquina de estados tem `resolved`. */
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
    // Mesma política do `validate`: a varredura é memoizada por raiz dentro do
    // processo, e uma decisão nova começa com a árvore de agora.
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
      `living-docs/session-inventory: inventário da documentação viva (fonte: \`${config.rootFile}\`).`,
      `Declarados: ${config.artifacts.length} artefato(s) e ${config.documents.length} documento(s).`,
    ]

    if (ausentes.length > 0) {
      lines.push(`Declarado e ausente (${ausentes.length}): ${shorten(ausentes)}.`)
    }
    if (abertas.length > 0) {
      lines.push(
        `Decisão aberta (${abertas.length}): ${shorten(abertas)}. Enquanto está aberta, a regra não existe e a ` + 'implementação para (`/open-decision`).',
      )
    }
    if (vencidas.length > 0) {
      lines.push(
        // Regra de origem: spec §12, critério 7.
        `Dívida com gatilho de pagamento cumprido (${vencidas.length}): ${shorten(
          vencidas.map(payment => `${payment.id} — ${payment.evidence}`),
        )}. \`living-docs validate\` reprova até pagar ou reclassificar.`,
      )
    }
    if (velhos.length > 0) {
      lines.push(
        `Documento vencido (${velhos.length}): ${shorten(
          velhos.map(stale => `${stale.file} (${stale.months} meses)`),
        )}. É aviso: releia antes de tocar em \`last-reviewed\`.`,
      )
    }

    lines.push('Nada aqui bloqueia — é contexto. O enforcement é `living-docs validate` e os hooks living-docs/append-only a ownership/commit-guard e living-docs/shortcut-debt.')

    inventory = { lines }
  } catch {
    return SILENT // falha aberta (RNF-0001)
  }

  return { action: 'inform', context: inventory.lines.join('\n') }
}

async function main(): Promise<void> {
  // O payload de SessionStart não traz `tool_input`; lê-lo é só o contrato do
  // stdin, e um payload ilegível cala o hook como qualquer outro erro.
  const payload = await readPayload()

  if (!payload) {
    return
  }

  const decision = decideSessionInventory(hookEnv(), todayIso())

  emit(decision.action === 'inform' ? contextOutput('SessionStart', decision.context) : null)
}

if (process.argv[1]?.endsWith('session-inventory.ts')) {
  main().catch(() => process.exit(0)) // falha aberta, sempre
}
