import type { Check, CheckContext, Finding } from '../core/types.ts';
import { parseId } from '../docs/schema.ts';
import { findCitations, loadRetiredIds, RETIRED_IDS_PATH } from '../ids/citations.ts';

const RULE = 'CI-2';

interface Declaration {
  id: string;
  file: string;
  line: number;
}

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix };
}

function collectDeclarations(context: CheckContext): Declaration[] {
  const declarations: Declaration[] = [];

  for (const doc of context.docs) {
    if (doc.rule.collection === 'table') {
      for (const item of doc.items) {
        declarations.push({ id: item.id, file: doc.file, line: item.line });
      }
      continue;
    }
    const id = doc.frontmatter?.data.id;
    if (typeof id === 'string' && parseId(id)) {
      declarations.push({ id, file: doc.file, line: doc.frontmatter?.lines.id ?? 1 });
    }
  }

  return declarations;
}

export const ci2Ids: Check = {
  id: RULE,
  name: 'ID lint',
  run(context: CheckContext): Finding[] {
    const findings: Finding[] = [];
    const retired = loadRetiredIds(context.root);
    const declarations = collectDeclarations(context);

    const byId = new Map<string, Declaration>();
    for (const declaration of declarations) {
      const previous = byId.get(declaration.id);
      if (previous) {
        findings.push(
          error(
            declaration.file,
            declaration.line,
            `ID ${declaration.id} duplicado — já declarado em ${previous.file}:${previous.line}.`,
            'Um ID identifica um único item. Escolha o próximo número livre da sequência.',
          ),
        );
        continue;
      }
      byId.set(declaration.id, declaration);

      if (retired.has(declaration.id)) {
        findings.push(
          error(
            declaration.file,
            declaration.line,
            `ID ${declaration.id} está em ${RETIRED_IDS_PATH} e não pode ser reciclado.`,
            'Use o próximo número livre; IDs retirados nunca voltam (spec §2).',
          ),
        );
      }
    }

    // Sequência contígua por prefixo, contando os retirados.
    const known = new Set(context.config.artifacts.map((artifact) => artifact.idPrefix));
    const numbersByPrefix = new Map<string, Set<number>>();
    for (const id of [...byId.keys(), ...retired]) {
      const parsed = parseId(id);
      if (!parsed || !known.has(parsed.prefix)) continue;
      const numbers = numbersByPrefix.get(parsed.prefix) ?? new Set<number>();
      numbers.add(parsed.number);
      numbersByPrefix.set(parsed.prefix, numbers);
    }

    for (const [prefix, numbers] of numbersByPrefix) {
      const highest = Math.max(...numbers);
      for (let n = 1; n <= highest; n++) {
        if (numbers.has(n)) continue;
        const missing = `${prefix}-${String(n).padStart(4, '0')}`;
        findings.push(
          error(
            RETIRED_IDS_PATH,
            0,
            `Sequência de ${prefix} tem buraco: ${missing} não existe nem está retirado.`,
            `Se o item foi removido, registre \`${missing}\` em ${RETIRED_IDS_PATH}; senão, renumere sem pular.`,
          ),
        );
      }
    }

    // Citações precisam resolver para um ID existente e não retirado.
    for (const doc of context.docs) {
      const declaredHere = new Set(
        declarations.filter((declaration) => declaration.file === doc.file).map((d) => d.id),
      );
      for (const citation of findCitations(doc.source)) {
        const parsed = parseId(citation.id);
        if (!parsed || !known.has(parsed.prefix)) continue;
        if (declaredHere.has(citation.id)) continue;
        if (byId.has(citation.id) && !retired.has(citation.id)) continue;

        findings.push(
          error(
            doc.file,
            citation.line,
            retired.has(citation.id)
              ? `Citação a ${citation.id}, que está retirado.`
              : `Citação a ${citation.id}, que não resolve para nenhum artefato existente.`,
            `Cite um ID existente ou crie o artefato (skill dona: ${doc.rule.skill}).`,
          ),
        );
      }
    }

    return findings;
  },
};
