import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decideHk2 } from '../../src/hooks/hk2-generated-artifact.ts';
import { OWNERSHIP_PATH } from '../../src/config/ownership.ts';
import { withTempRepo } from '../helpers/tmp.ts';
import type { HookEnv } from '../../src/hooks/lib/io.ts';
import type { Hk2Decision } from '../../src/hooks/hk2-generated-artifact.ts';

/** Narrowing tipado: sem isto, `decision.reason` não existe para o TypeScript. */
function assertDeny(decision: Hk2Decision): asserts decision is { action: 'deny'; reason: string } {
  assert.equal(decision.action, 'deny');
}

const CONFIG = `
version: 1
artifacts:
  - id-prefix: ADR
    path: docs/decisions/adr/
    owner: "@team"
    skill: decision-recorder
generated:
  - path: docs/contracts/openapi.gen.yaml
    command: "node tools/gen-openapi.js"
`;

const GENERATED = 'docs/contracts/openapi.gen.yaml';

function decide(files: Record<string, string>, toolInput: Record<string, unknown>): Hk2Decision {
  let decision: Hk2Decision = { action: 'allow' };
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, ...files }, (root) => {
    const env: HookEnv = { root, hostRoots: [root] };
    decision = decideHk2({ tool_name: 'Edit', tool_input: toolInput }, env);
  });
  return decision;
}

test('RN-0012: nega editar artefato declarado em generated[] — critério de aceite 6', () => {
  const decision = decide(
    { [GENERATED]: 'openapi: 3.1.0\n' },
    { file_path: GENERATED, old_string: '3.1.0', new_string: '3.0.0' },
  );
  assertDeny(decision);
  assert.match(decision.reason, /node tools\/gen-openapi\.js/, 'a mensagem precisa nomear o comando do gerador');
  assert.match(decision.reason, /contract-keeper/, 'a mensagem precisa nomear a skill dona');
  assert.match(decision.reason, /openapi\.gen\.yaml/);
});

test('RN-0012: nega criar à mão o artefato gerado que ainda não existe', () => {
  const decision = decide({}, { file_path: GENERATED, content: 'openapi: 3.1.0\n' });
  assertDeny(decision);
});

test('RN-0012: o marcador vale sozinho — arquivo não declarado, mas autodeclarado gerado', () => {
  const file = 'docs/contracts/errors.gen.md';
  const decision = decide(
    { [file]: '<!-- generated: do not edit -->\n\n# Erros\n' },
    { file_path: file, old_string: '# Erros', new_string: '# Erros!' },
  );
  assertDeny(decision);
  assert.match(decision.reason, /generated\[\]/, 'a mensagem precisa pedir a declaração que falta');
});

test('o marcador só conta no topo do arquivo — prosa sobre o assunto não congela um doc', () => {
  const file = 'docs/requirements/rules.md';
  const corpo = `${'linha de prosa\n'.repeat(400)}o marcador \`generated: do not edit\` é da spec §2\n`;
  const decision = decide({ [file]: corpo }, { file_path: file, content: 'outra coisa' });
  assert.equal(decision.action, 'allow');
});

test('caminho comum passa — HK-2 só conhece o que é gerado', () => {
  assert.equal(decide({ 'src/index.ts': 'x' }, { file_path: 'src/index.ts', content: 'y' }).action, 'allow');
});

test('RNF-0001: falha aberta — .ownership.yml ilegível permite', () => {
  let decision: Hk2Decision = { action: 'deny', reason: 'não deveria' };
  withTempRepo({ [GENERATED]: 'openapi: 3.1.0\n' }, (root) => {
    decision = decideHk2(
      { tool_name: 'Write', tool_input: { file_path: GENERATED, content: 'x' } },
      { root, hostRoots: [root] },
    );
  });
  assert.equal(decision.action, 'allow');
});

test('payload sem file_path permite', () => {
  assert.equal(decide({ [GENERATED]: 'x' }, { content: 'y' }).action, 'allow');
});

test('aceita file_path absoluto do host', () => {
  let decision: Hk2Decision = { action: 'allow' };
  withTempRepo({ [OWNERSHIP_PATH]: CONFIG, [GENERATED]: 'openapi: 3.1.0\n' }, (root) => {
    decision = decideHk2(
      { tool_name: 'Write', tool_input: { file_path: `${root}/${GENERATED}`, content: 'x' } },
      { root, hostRoots: [root] },
    );
  });
  assert.equal(decision.action, 'deny');
});

test('diretório declarado em generated[] cobre o que está dentro dele', () => {
  const config = CONFIG.replace('path: docs/contracts/openapi.gen.yaml', 'path: docs/contracts/gen/');
  let decision: Hk2Decision = { action: 'allow' };
  withTempRepo({ [OWNERSHIP_PATH]: config }, (root) => {
    decision = decideHk2(
      { tool_name: 'Write', tool_input: { file_path: 'docs/contracts/gen/schema.json', content: '{}' } },
      { root, hostRoots: [root] },
    );
  });
  assert.equal(decision.action, 'deny');
});
