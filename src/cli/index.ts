#!/usr/bin/env node
import { runValidate } from './validate.ts';
import { runInit, STAGES } from './init.ts';
import type { Stage } from './init.ts';
import { formatFindings } from './report.ts';
import { OwnershipError } from '../config/ownership.ts';
import { repoRoot } from '../core/roots.ts';

const USAGE = `living-docs <comando>

  validate    Roda os checks de documentação viva (CI-1, CI-2, CI-3)
  init        Cria a moldura de documentação viva (skill dona: living-docs-bootstrap)

Opções de init:
  --owner <@handle>   Dono padrão dos artefatos criados
  --stage <estágio>   Conjunto mínimo a instalar: solo (padrão) ou small-team
  --dry-run           Mostra o que faria, sem escrever
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
      const result = runValidate(root);
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

      const result = runInit(root, { owner, dryRun: argv.includes('--dry-run'), stage: stage as Stage });

      for (const entry of result.adopted) {
        process.stdout.write(`adotado   ${entry.path}  (${entry.idPrefix} — já existia; nenhum paralelo criado)\n`);
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
    throw err;
  }

  process.stderr.write(`living-docs: comando desconhecido "${command}".\n\n${USAGE}`);
  return 2;
}

process.exitCode = main(process.argv.slice(2));
