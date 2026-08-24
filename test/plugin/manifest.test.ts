import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.env.LIVING_DOCS_ROOT ?? '/app';

function readJson(relative: string): Record<string, unknown> {
  return JSON.parse(readFileSync(join(ROOT, relative), 'utf8')) as Record<string, unknown>;
}

test('o manifesto do plugin declara nome, versão e descrição', () => {
  const manifest = readJson('plugin/.claude-plugin/plugin.json');
  assert.equal(manifest.name, 'living-docs');
  assert.equal(typeof manifest.version, 'string');
  assert.equal(typeof manifest.description, 'string');
});

test('hooks.json registra HK-1 e HK-3 em PreToolUse com matcher Edit|Write', () => {
  const config = readJson('plugin/hooks/hooks.json');
  const hooks = config.hooks as Record<string, unknown[]>;
  const preToolUse = hooks.PreToolUse as { matcher: string; hooks: { command: string }[] }[];

  assert.equal(preToolUse.length, 1);
  assert.equal(preToolUse[0]?.matcher, 'Edit|Write');

  const commands = (preToolUse[0]?.hooks ?? []).map((hook) => hook.command);
  assert.equal(commands.length, 2);
  assert.ok(commands.some((command) => command.includes('hk1-append-only')));
  assert.ok(commands.some((command) => command.includes('hk3-state-promotion')));
  for (const command of commands) {
    assert.ok(command.includes('${CLAUDE_PLUGIN_ROOT}'), 'o comando precisa ser relocável');
  }
});

test('o wrapper existe, é executável e falha aberta', () => {
  const wrapper = join(ROOT, 'plugin/hooks/run-hook.sh');
  assert.ok(existsSync(wrapper));
  assert.ok((statSync(wrapper).mode & 0o111) !== 0, 'run-hook.sh precisa ser executável');

  const source = readFileSync(wrapper, 'utf8');
  assert.match(source, /timeout 5/, 'precisa respeitar o teto de 5s da spec §7');
  assert.match(source, /exit 0/, 'precisa falhar aberta');
  assert.doesNotMatch(source, /set -e\b/, 'set -e mataria a falha aberta');
});

test('todo hook referenciado existe no repositório', () => {
  const config = readJson('plugin/hooks/hooks.json');
  const hooks = config.hooks as Record<string, { hooks: { command: string }[] }[]>;
  for (const group of hooks.PreToolUse ?? []) {
    for (const hook of group.hooks) {
      const name = hook.command.trim().split(/\s+/).pop()?.replace(/"/g, '') ?? '';
      assert.ok(existsSync(join(ROOT, 'src/hooks', `${name}.ts`)), `src/hooks/${name}.ts deveria existir`);
    }
  }
});
