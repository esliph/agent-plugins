#!/usr/bin/env node
import { runValidate } from './validate.ts';
import { runDrift } from './drift.ts';
import { runChangelog } from './changelog.ts';
import { runInit, STAGES } from './init.ts';
import type { Stage } from './init.ts';
import { formatFindings } from './report.ts';
import { OwnershipError } from '../config/ownership.ts';
import { DEFAULT_ID_FORMAT, PADDING_RANGE, SEPARATORS_ALLOWED } from '../docs/schema.ts';
import { GitError } from '../git/diff.ts';
import { repoRoot } from '../core/roots.ts';

const USAGE = `living-docs <comando>

  validate    Roda os checks de estado da árvore (CI-1, CI-2, CI-3, CI-4, CI-7, CI-8)
  drift       Compara cada artefato gerado com a saída do gerador (CI-5)
  changelog   Cobra a entrada de CHANGELOG do diff da branch (CI-6)
  init        Cria a moldura de documentação viva (skill dona: living-docs-bootstrap)

Opções de init:
  --owner <@handle>   Dono padrão dos artefatos criados
  --stage <estágio>   Conjunto mínimo a instalar: solo (padrão), small-team ou production
  --id-separator <s>  Separador do ID: "-" (padrão), "_", ".", ":" ou "" (vazio)
  --id-padding <n>    Dígitos do ID: 4 (padrão), entre 2 e 6
  --invoke <comando>  Como o CLI é chamado no CI de quem instala (padrão: npx living-docs)
  --dry-run           Mostra o que faria, sem escrever

Opções de validate:
  --base <ref>        Base do diff — liga a metade de CI-7 que lê o diff da branch

Opções de changelog:
  --base <ref>        Base do diff (obrigatório) — ex.: origin/master
`;

function main(argv: readonly string[]): number {
  const root = repoRoot();
  const command = argv[0];

  if (command === undefined || command === '--help' || command === '-h') {
    process.stdout.write(USAGE);
    return command === undefined ? 2 : 0;
  }

  try {
    if (command === 'validate') {
      const baseIndex = argv.indexOf('--base');
      const base = baseIndex === -1 ? null : (argv[baseIndex + 1] ?? '');
      if (base === '') {
        process.stderr.write(
          'living-docs: `--base` precisa de uma ref — a base do diff não se adivinha (CI-7, ADR-0010).\n',
        );
        return 2;
      }

      const result = runValidate(root, base);
      process.stdout.write(`${formatFindings(result.findings)}\n`);
      // Ponteiro, não achado: validate não executa gerador nenhum (ADR-0005), e
      // ficar calado sobre isso seria fingir cobertura que ele não tem.
      if (result.generated > 0) {
        process.stdout.write(
          `living-docs: ${result.generated} artefato(s) gerado(s) declarado(s) — a deriva de contrato é verificada por \`living-docs drift\` (CI-5).\n`,
        );
      }
      if (result.consumerVisible > 0) {
        process.stdout.write(
          `living-docs: ${result.consumerVisible} caminho(s) visível(is) ao consumidor declarado(s) — a entrada de CHANGELOG é verificada por \`living-docs changelog --base <ref>\` (CI-6).\n`,
        );
      }
      // Ponteiro, não achado: sem base não há diff, e ficar calado sobre a metade
      // que não rodou seria fingir a cobertura que o critério 5 pede inteira.
      if (result.base === null && result.watched > 0) {
        process.stdout.write(
          `living-docs: ${result.watched} vínculo(s) código→doc declarado(s) — o caminho vigiado que mudou sem o doc dono é verificado por \`living-docs validate --base <ref>\` (CI-7).\n`,
        );
      }
      return result.exitCode;
    }

    if (command === 'drift') {
      const result = runDrift(root);
      if (result.checked === 0) {
        process.stdout.write(
          'living-docs: nenhum artefato gerado declarado em `generated[]` — nada a comparar.\n',
        );
        return 0;
      }
      process.stdout.write(`${formatFindings(result.findings)}\n`);
      return result.exitCode;
    }

    if (command === 'changelog') {
      const baseIndex = argv.indexOf('--base');
      const base = baseIndex === -1 ? '' : (argv[baseIndex + 1] ?? '');
      if (base === '') {
        process.stderr.write(
          'living-docs: `changelog` precisa de `--base <ref>` — a base do diff não se adivinha (CI-6, ADR-0006).\n',
        );
        return 2;
      }

      const result = runChangelog(root, base);
      if (result.declared === 0) {
        process.stdout.write(
          'living-docs: `consumer-visible-paths` vazio em docs/.ownership.yml — nada a checar (CI-6).\n',
        );
        return 0;
      }
      process.stdout.write(`${formatFindings(result.findings)}\n`);
      return result.exitCode;
    }

    if (command === 'init') {
      const ownerIndex = argv.indexOf('--owner');
      const owner = ownerIndex === -1 ? '@owners' : (argv[ownerIndex + 1] ?? '@owners');

      const stageIndex = argv.indexOf('--stage');
      const stage = stageIndex === -1 ? 'solo' : (argv[stageIndex + 1] ?? '');
      if (stageIndex !== -1 && !STAGES.includes(stage as Stage)) {
        process.stderr.write(`living-docs: estágio "${stage}" desconhecido. Válidos: ${STAGES.join(', ')}.\n`);
        return 2;
      }

      const separatorIndex = argv.indexOf('--id-separator');
      const separator = separatorIndex === -1 ? DEFAULT_ID_FORMAT.separator : (argv[separatorIndex + 1] ?? '');
      const paddingIndex = argv.indexOf('--id-padding');
      const padding =
        paddingIndex === -1 ? DEFAULT_ID_FORMAT.padding : Number.parseInt(argv[paddingIndex + 1] ?? '', 10);
      if (
        !SEPARATORS_ALLOWED.includes(separator) ||
        !Number.isInteger(padding) ||
        padding < PADDING_RANGE.min ||
        padding > PADDING_RANGE.max
      ) {
        process.stderr.write(
          `living-docs: forma de ID inválida. --id-separator aceita ${SEPARATORS_ALLOWED.map((s) => `"${s}"`).join(', ')} ` +
            `e --id-padding um inteiro entre ${PADDING_RANGE.min} e ${PADDING_RANGE.max} (ADR-0011).\n`,
        );
        return 2;
      }

      const invokeIndex = argv.indexOf('--invoke');
      const invoke = invokeIndex === -1 ? 'npx living-docs' : (argv[invokeIndex + 1] ?? '');
      if (invoke.trim() === '') {
        process.stderr.write(
          'living-docs: `--invoke` precisa do comando que roda o CLI no seu CI — ele não se adivinha (DA-0003).\n',
        );
        return 2;
      }

      const result = runInit(root, {
        owner,
        dryRun: argv.includes('--dry-run'),
        stage: stage as Stage,
        idFormat: { separator, padding },
        invoke,
      });

      for (const entry of result.adopted) {
        process.stdout.write(`adotado   ${entry.path}  (${entry.idPrefix} — já existia; nenhum paralelo criado)\n`);
      }
      if (result.detected !== null) {
        const { format, count, sample } = result.detected;
        process.stdout.write(
          `formato   ${sample}  (${count} ocorrência(s) nesta forma) — o repositório escreve IDs de outro jeito.\n` +
            `          Para adotá-la: --id-separator "${format.separator}" --id-padding ${format.padding}. ` +
            'Nenhum arquivo foi alterado (RF-0014).\n',
        );
      }
      for (const path of result.created) process.stdout.write(`criado    ${path}\n`);
      for (const path of result.skipped) process.stdout.write(`mantido   ${path}\n`);
      if (result.created.length === 0) process.stdout.write('living-docs: nada a criar; a moldura já existe.\n');
      // Honestidade sobre o estágio: dizer o que ficou de fora vale mais do que
      // fingir que o conjunto inteiro foi instalado (spec §10).
      for (const item of result.notInstalled) {
        process.stdout.write(`não instalado  ${item}\n`);
      }
      return 0;
    }
  } catch (err) {
    if (err instanceof OwnershipError) {
      process.stderr.write(`living-docs: ${err.message}\n`);
      return 2;
    }
    if (err instanceof GitError) {
      process.stderr.write(
        `living-docs: ${err.message}\n` +
          '             o clone precisa conter a base (em CI: `actions/checkout` com `fetch-depth: 0`).\n',
      );
      return 2;
    }
    throw err;
  }

  process.stderr.write(`living-docs: comando desconhecido "${command}".\n\n${USAGE}`);
  return 2;
}

process.exitCode = main(process.argv.slice(2));
