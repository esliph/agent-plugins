import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, statSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { toolkitRoot } from '../../src/core/roots.ts';

const ROOT = toolkitRoot();

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

/**
 * Toda referência a uma skill, em qualquer artefato que o repositório publica,
 * precisa apontar para uma skill que existe. É o irmão do teste de hooks acima:
 * nome citado sem arquivo por trás é um comando que não faz nada.
 */
const SKILL_REFERENCES: readonly { file: string; pattern: RegExp }[] = [
  ...readdirSync(join(ROOT, 'plugin/commands')).map((name) => ({
    file: `plugin/commands/${name}`,
    pattern: /skill\s+`([a-z][a-z0-9-]*)`/g,
  })),
  { file: 'src/cli/index.ts', pattern: /skill dona:\s*([a-z][a-z0-9-]*)/g },
  { file: 'src/config/ownership.ts', pattern: /skill dona:\s*([a-z][a-z0-9-]*)/g },
  { file: 'templates/ownership.yml', pattern: /^\s*skill:\s*([a-z][a-z0-9-]*)\s*$/gm },
  { file: 'docs/.ownership.yml', pattern: /^\s*skill:\s*([a-z][a-z0-9-]*)\s*$/gm },
];

function referencedSkills(): Map<string, string[]> {
  const found = new Map<string, string[]>();
  for (const { file, pattern } of SKILL_REFERENCES) {
    const source = readFileSync(join(ROOT, file), 'utf8');
    for (const match of source.matchAll(pattern)) {
      const name = match[1];
      if (name === undefined) continue;
      found.set(name, [...(found.get(name) ?? []), file]);
    }
  }
  return found;
}

test('toda skill referenciada existe em plugin/skills/', () => {
  const referenced = referencedSkills();

  // Guarda contra um scanner que casa nada e passa por vacuidade.
  assert.ok(referenced.has('decision-recorder'), 'o scanner deveria achar decision-recorder');
  assert.ok(referenced.has('living-docs-bootstrap'), 'o scanner deveria achar living-docs-bootstrap');

  for (const [name, files] of referenced) {
    const skill = join(ROOT, 'plugin/skills', name, 'SKILL.md');
    assert.ok(existsSync(skill), `plugin/skills/${name}/SKILL.md deveria existir — citado em ${files.join(', ')}`);
  }
});

test('o nome no frontmatter de cada skill casa com o diretório', () => {
  const dirs = readdirSync(join(ROOT, 'plugin/skills'));
  assert.ok(dirs.length > 0);
  for (const dir of dirs) {
    const source = readFileSync(join(ROOT, 'plugin/skills', dir, 'SKILL.md'), 'utf8');
    assert.match(source, new RegExp(`^name:\\s*${dir}\\s*$`, 'm'), `${dir}/SKILL.md declara outro name`);
  }
});
