#!/usr/bin/env node
/**
 * SessionStart: injeta o inventário da documentação viva no contexto.
 *
 * Regra de origem: LIVING-DOCUMENTATION-TOOLKIT.md §7 e `RN-0022` — "resolve 'se
 * ninguém lê, não está vivo' na origem". A saída é `additionalContext`, e este
 * arquivo não conhece `deny` nem `ask`.
 *
 * Não reimplementa `CI-4`: chama `staleDocs` e `duePayments`. Um inventário que
 * discordasse do check faria dois números diferentes sobre a mesma pergunta, e
 * ninguém saberia qual acreditar.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { loadOwnership } from '../config/ownership.ts';
import { collectArtifacts, collectDocuments } from '../docs/collect.ts';
import type { ArtifactDoc } from '../docs/collect.ts';
import { duePayments, staleDocs } from '../checks/ci4-staleness.ts';
import { statesFor } from '../docs/schema.ts';
import { todayIso } from '../core/dates.ts';
import { contextOutput, emit, hookEnv, readPayload } from './lib/io.ts';
import type { HookEnv } from './lib/io.ts';

export type Hk6Decision = { action: 'silent' } | { action: 'inform'; context: string };

const SILENT: Hk6Decision = { action: 'silent' };

/**
 * Quantos itens de cada lista entram no contexto. O inventário é lido em toda
 * sessão: lista longa custa contexto sempre e ensina a pular o bloco inteiro.
 */
const MAX_ITEMS = 5;

/** O estado que identifica família de decisão aberta (spec §4: `open → resolved`). */
const DECISION_STATE = 'resolved';

function shorten(items: readonly string[]): string {
  const shown = items.slice(0, MAX_ITEMS).join('; ');
  return items.length > MAX_ITEMS ? `${shown}; … (+${items.length - MAX_ITEMS})` : shown;
}

/** Decisões abertas: itens `open` de família cuja máquina de estados tem `resolved`. */
function openDecisions(docs: readonly ArtifactDoc[]): string[] {
  const found: string[] = [];

  for (const doc of docs) {
    if (!statesFor(doc.rule)?.includes(DECISION_STATE)) continue;

    if (doc.rule.collection === 'per-file') {
      const data = doc.frontmatter?.data;
      if (data?.status === 'open') found.push(`${String(data.id)} (${doc.file})`);
      continue;
    }

    for (const item of doc.items) {
      if (item.status === 'open') found.push(`${item.id} (${doc.file}:${item.line})`);
    }
  }

  return found;
}

export function decideHk6(env: HookEnv, today: string): Hk6Decision {
  let inventory: { lines: string[] };
  try {
    const config = loadOwnership(env.root);
    const docs = collectArtifacts(env.root, config);
    const documents = collectDocuments(env.root, config);
    const context = { root: env.root, config, docs, documents, today };

    const ausentes = [
      ...config.artifacts
        .filter((artifact) => !existsSync(join(env.root, artifact.path)))
        .map((artifact) => `${artifact.idPrefix} (${artifact.path})`),
      ...config.documents
        .filter((document) => !existsSync(join(env.root, document.path)))
        .map((document) => document.path),
    ];

    const abertas = openDecisions(docs);
    const vencidas = duePayments(context);
    const velhos = staleDocs(context);

    const lines = [
      'HK-6: inventário da documentação viva (fonte: `docs/.ownership.yml`).',
      `Declarados: ${config.artifacts.length} artefato(s) e ${config.documents.length} documento(s).`,
    ];

    if (ausentes.length > 0) {
      lines.push(`Declarado e ausente (${ausentes.length}): ${shorten(ausentes)}.`);
    }
    if (abertas.length > 0) {
      lines.push(
        `Decisão aberta (${abertas.length}): ${shorten(abertas)}. Enquanto está aberta, a regra não existe e a ` +
          'implementação para (`/open-decision`).',
      );
    }
    if (vencidas.length > 0) {
      lines.push(
        `Dívida com gatilho de pagamento cumprido (${vencidas.length}): ${shorten(
          vencidas.map((payment) => `${payment.id} — ${payment.evidence}`),
        )}. \`living-docs validate\` reprova até pagar ou reclassificar (spec §12, critério 7).`,
      );
    }
    if (velhos.length > 0) {
      lines.push(
        `Documento vencido (${velhos.length}): ${shorten(
          velhos.map((stale) => `${stale.file} (${stale.months} meses)`),
        )}. É aviso: releia antes de tocar em \`last-reviewed\`.`,
      );
    }

    lines.push(
      'Nada aqui bloqueia — é contexto. O enforcement é `living-docs validate` e os hooks HK-1 a HK-5 e HK-7.',
    );

    inventory = { lines };
  } catch {
    return SILENT; // falha aberta (RNF-0001)
  }

  return { action: 'inform', context: inventory.lines.join('\n') };
}

async function main(): Promise<void> {
  // O payload de SessionStart não traz `tool_input`; lê-lo é só o contrato do
  // stdin, e um payload ilegível cala o hook como qualquer outro erro.
  const payload = await readPayload();
  if (!payload) return;

  const decision = decideHk6(hookEnv(), todayIso());
  emit(decision.action === 'inform' ? contextOutput('SessionStart', decision.context) : null);
}

if (process.argv[1]?.endsWith('hk6-session-inventory.ts')) {
  main().catch(() => process.exit(0)); // falha aberta, sempre
}
