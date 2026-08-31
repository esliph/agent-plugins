import type { Check, CheckContext, Finding } from '../core/types.ts';
import type { ArtifactRule } from '../config/ownership.ts';
import { fieldOf } from '../config/ownership.ts';
import { canonicalId, parseId } from '../docs/schema.ts';
import type { IdFormat } from '../docs/schema.ts';
import { findCitations } from '../ids/citations.ts';
import { scanCitations } from '../ids/coverage.ts';
import type { CitationSite } from '../ids/coverage.ts';

const RULE = 'CI-3';

/** Pares que precisam fechar dos dois lados (spec §8). */
const PAIRS: readonly { from: string; to: string }[] = Object.freeze([
  { from: 'supersedes', to: 'superseded-by' },
  { from: 'revokes', to: 'revoked-by' },
]);

interface Entry {
  id: string;
  file: string;
  line: number;
  status: string;
  rule: ArtifactRule;
  /** Leitura de um campo canônico, seja frontmatter ou item de coleção. */
  read(canonical: string): string | null;
}

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix };
}

/** IDs canônicos citados dentro de um valor, qualquer que seja a forma dele. */
function idsIn(value: string | null, format: IdFormat): string[] {
  if (value === null) return [];
  return findCitations(value, format)
    .map((citation) => parseId(citation.id, format))
    .filter((parsed): parsed is { prefix: string; number: number } => parsed !== null)
    .map(canonicalId);
}

/**
 * Todo item rastreável do repositório, com uma leitura uniforme de campo.
 * Frontmatter de arquivo e item de coleção respondem à mesma pergunta canônica,
 * e é isso que permite a `CI-3` não conhecer nome de campo nenhum.
 */
function entriesOf(context: CheckContext, format: IdFormat): Entry[] {
  const entries: Entry[] = [];

  for (const doc of context.docs) {
    if (doc.rule.collection === 'per-file') {
      const data = doc.frontmatter?.data;
      const id = data?.id;
      if (typeof id !== 'string' || !parseId(id, format)) continue;
      entries.push({
        id,
        file: doc.file,
        line: doc.frontmatter?.lines.id ?? 1,
        status: typeof data?.status === 'string' ? data.status : '',
        rule: doc.rule,
        read: (canonical) => {
          const value = data?.[canonical];
          if (value === undefined || value === null) return null;
          const text = Array.isArray(value) ? value.join(', ') : String(value);
          return text.trim() === '' || text === 'null' ? null : text;
        },
      });
      continue;
    }

    for (const item of doc.items) {
      entries.push({
        id: item.id,
        file: doc.file,
        line: item.line,
        status: item.status,
        rule: doc.rule,
        read: (canonical) => fieldOf(doc.rule, item, canonical),
      });
    }
  }

  return entries;
}

export const ci3Traceability: Check = {
  id: RULE,
  name: 'traceability',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = [];
    const format = context.config.idFormat;
    const entries = entriesOf(context, format);
    const byId = new Map(entries.map((entry) => [canonicalId(parseId(entry.id, format)!), entry]));

    for (const entry of entries) {
      const self = canonicalId(parseId(entry.id, format)!);

      // 1 e 2 — pares bidirecionais.
      for (const pair of PAIRS) {
        for (const side of [pair, { from: pair.to, to: pair.from }]) {
          for (const targetId of idsIn(entry.read(side.from), format)) {
            const target = byId.get(targetId);
            if (!target) {
              findings.push(
                error(
                  entry.file,
                  entry.line,
                  `${entry.id} declara \`${side.from}: ${targetId}\`, que não existe.`,
                  'Cite um ID existente, ou remova o campo (spec §8).',
                ),
              );
              continue;
            }
            if (!idsIn(target.read(side.to), format).includes(self)) {
              findings.push(
                error(
                  target.file,
                  target.line,
                  `Par aberto: ${entry.id} declara \`${side.from}: ${target.id}\`, mas ${target.id} não declara \`${side.to}: ${entry.id}\`.`,
                  `Acrescente \`${side.to}: ${entry.id}\` em ${target.file}:${target.line} — o par fecha dos dois lados (spec §8).`,
                ),
              );
            }
          }
        }
      }

      // 3 — revogação sem quem revogou.
      if (entry.status === 'revoked' && entry.read('revoked-by') === null) {
        findings.push(
          error(
            entry.file,
            entry.line,
            `${entry.id} está \`revoked\` sem declarar \`revoked-by\`.`,
            'Regra removida é revogada, não deletada — aponte o ID que a substituiu (spec §5, SK-4).',
          ),
        );
      }

      // 4 e 5 — DA resolvida aponta o ADR, e o ADR aponta de volta.
      if (entry.status === 'resolved') {
        const resolvers = idsIn(entry.read('resolved-by'), format);
        if (resolvers.length === 0) {
          findings.push(
            error(
              entry.file,
              entry.line,
              `${entry.id} está \`resolved\` sem dizer o que a resolveu.`,
              'Toda decisão aberta fechada aponta o ADR que a fechou (spec §5, SK-3, regra 7).',
            ),
          );
        }
        for (const resolverId of resolvers) {
          const resolver = byId.get(resolverId);
          if (!resolver) {
            findings.push(
              error(
                entry.file,
                entry.line,
                `${entry.id} aponta ${resolverId}, que não existe.`,
                'Crie o ADR ou corrija a referência.',
              ),
            );
            continue;
          }
          if (!idsIn(resolver.read('relates-to'), format).includes(self)) {
            findings.push(
              error(
                resolver.file,
                resolver.line,
                `${resolver.id} resolve ${entry.id}, mas não a cita em \`relates-to\`.`,
                `Acrescente ${entry.id} a \`relates-to\` — CI-3 verifica os dois lados (spec §5, SK-3, regra 7).`,
              ),
            );
          }
        }
      }

      // 6 — ADR aceito sem ligação.
      if (entry.status === 'accepted' && idsIn(entry.read('relates-to'), format).length === 0) {
        findings.push(
          error(
            entry.file,
            entry.line,
            `${entry.id} está \`accepted\` sem \`relates-to\`.`,
            'Um ADR aceito cita ao menos um requisito, decisão aberta ou princípio — decisão que não se liga a nada é sinal de contexto faltando (spec §8).',
          ),
        );
      }
    }

    // 7 — cobertura por citação, uma varredura por conjunto distinto de globs.
    const scans = new Map<string, Map<string, CitationSite[]>>();
    for (const entry of entries) {
      if (entry.status !== 'active' || entry.rule.citedBy.length === 0) continue;

      const key = JSON.stringify(entry.rule.citedBy);
      let sites = scans.get(key);
      if (!sites) {
        sites = scanCitations(context.root, entry.rule.citedBy, format);
        scans.set(key, sites);
      }

      const canonical = canonicalId(parseId(entry.id, format)!);
      const found = [...sites.entries()].some(([id, places]) => {
        const parsed = parseId(id, format);
        // Citação dentro do próprio arquivo do artefato não cobre nada: a regra
        // precisa ser citada de fora para que o grafo feche (spec §8).
        return (
          parsed !== null &&
          canonicalId(parsed) === canonical &&
          places.some((place) => place.file !== entry.file)
        );
      });

      if (!found) {
        findings.push(
          error(
            entry.file,
            entry.line,
            `${entry.id} está \`active\` e não é citada em nenhum de ${entry.rule.citedBy.join(', ')}.`,
            `Cite ${entry.id} no teste que a cobre — rastreabilidade fecha nos dois lados (spec §5, SK-4, regra 6).`,
          ),
        );
      }
    }

    return findings;
  },
};
