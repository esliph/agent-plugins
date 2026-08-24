import type { Check, CheckContext, Finding } from '../core/types.ts';
import type { ArtifactDoc } from '../docs/collect.ts';
import {
  REQUIRED_FIELDS,
  CONTAINER_REQUIRED_FIELDS,
  findCadence,
  isIsoDate,
  parseId,
  statesFor,
} from '../docs/schema.ts';

const RULE = 'CI-1';

function error(file: string, line: number, message: string, fix: string): Finding {
  return { ruleId: RULE, file, line, severity: 'error', message, fix };
}

function isFilled(value: unknown): boolean {
  if (value === undefined || value === null) return false;
  if (typeof value === 'string') return value.trim() !== '';
  return true;
}

function checkDoc(doc: ArtifactDoc): Finding[] {
  const findings: Finding[] = [];

  if (doc.syntaxError) {
    return [
      error(
        doc.file,
        doc.syntaxError.line,
        `Frontmatter com YAML inválido: ${doc.syntaxError.message}`,
        'Corrija o bloco YAML entre os `---` no topo do arquivo.',
      ),
    ];
  }

  const frontmatter = doc.frontmatter;
  if (!frontmatter) {
    return [
      error(
        doc.file,
        1,
        'Frontmatter ausente — todo artefato de documentação viva abre com o bloco YAML padrão.',
        'Adicione `id`, `title`, `status`, `owner`, `trigger` e `last-reviewed` entre `---` no topo (spec §2).',
      ),
    ];
  }

  const { data, lines } = frontmatter;
  const lineOf = (field: string): number => lines[field] ?? 1;
  const isContainer = doc.rule.collection === 'table';
  const required = isContainer ? CONTAINER_REQUIRED_FIELDS : REQUIRED_FIELDS;

  for (const field of required) {
    if (!isFilled(data[field])) {
      findings.push(
        error(
          doc.file,
          frontmatter.endLine,
          `Campo obrigatório \`${field}\` ausente ou vazio.`,
          `Preencha \`${field}\` no frontmatter (skill dona: ${doc.rule.skill}).`,
        ),
      );
    }
  }

  if (!isContainer && isFilled(data.id)) {
    const parsed = parseId(data.id);
    if (!parsed) {
      findings.push(
        error(
          doc.file,
          lineOf('id'),
          `\`id\` "${String(data.id)}" fora do formato <PREFIXO>-<número>.`,
          `Use ${doc.rule.idPrefix}-0001 (spec §8).`,
        ),
      );
    } else if (parsed.prefix !== doc.rule.idPrefix) {
      findings.push(
        error(
          doc.file,
          lineOf('id'),
          `\`id\` usa o prefixo ${parsed.prefix}, mas ${doc.rule.path} é território de ${doc.rule.idPrefix}.`,
          `Renomeie para ${doc.rule.idPrefix}-... ou mova o arquivo para o artefato dono.`,
        ),
      );
    }
  }

  const states = statesFor(doc.rule);
  if (!isContainer && isFilled(data.status)) {
    if (!states) {
      findings.push(
        error(
          doc.file,
          lineOf('status'),
          `Prefixo ${doc.rule.idPrefix} não tem máquina de estados declarada.`,
          `Declare \`states:\` para esse artefato em docs/.ownership.yml.`,
        ),
      );
    } else if (!states.includes(String(data.status))) {
      findings.push(
        error(
          doc.file,
          lineOf('status'),
          `\`status\` "${String(data.status)}" fora da máquina de estados de ${doc.rule.idPrefix}.`,
          `Estados válidos: ${states.join(' → ')} (spec §4).`,
        ),
      );
    }
  }

  if (isFilled(data.owner) && !String(data.owner).startsWith('@')) {
    findings.push(
      error(
        doc.file,
        lineOf('owner'),
        `\`owner\` "${String(data.owner)}" precisa começar com @ e espelhar o CODEOWNERS.`,
        'Use o handle de pessoa ou time, ex.: "@team-platform".',
      ),
    );
  }

  if (isFilled(data.trigger)) {
    const cadence = findCadence(String(data.trigger));
    if (cadence) {
      findings.push(
        error(
          doc.file,
          lineOf('trigger'),
          `\`trigger\` descreve cadência ("${cadence}") em vez de um evento observável.`,
          'Nomeie o evento: "no mesmo PR que altera src/domain/billing", "quando um código de erro novo é adicionado" (spec §2, mecanismo 2).',
        ),
      );
    }
  }

  if (isFilled(data['last-reviewed']) && !isIsoDate(data['last-reviewed'])) {
    findings.push(
      error(
        doc.file,
        lineOf('last-reviewed'),
        `\`last-reviewed\` "${String(data['last-reviewed'])}" não é uma data ISO.`,
        'Use YYYY-MM-DD, e só toque neste campo se você realmente reviu o documento (spec §2).',
      ),
    );
  }

  if (isContainer && states) {
    for (const item of doc.items) {
      if (!states.includes(item.status)) {
        findings.push(
          error(
            doc.file,
            item.line,
            `Item ${item.id} com status "${item.status}" fora da máquina de estados de ${doc.rule.idPrefix}.`,
            `Estados válidos: ${states.join(' → ')} (spec §4).`,
          ),
        );
      }
    }
  }

  return findings;
}

export const ci1Structure: Check = {
  id: RULE,
  name: 'structure lint',
  run(context: CheckContext): Finding[] {
    return context.docs.flatMap(checkDoc);
  },
};
