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

test('hooks.json registra os quatro hooks nos eventos e matchers da spec §7', () => {
  const config = readJson('plugin/hooks/hooks.json');
  const hooks = config.hooks as Record<string, { matcher: string; hooks: { command: string }[] }[]>;

  const grupos = new Map<string, string[]>(
    Object.entries(hooks).flatMap(([evento, lista]) =>
      lista.map((grupo) => [`${evento}:${grupo.matcher}`, grupo.hooks.map((hook) => hook.command)] as const),
    ),
  );

  const esperado: Record<string, string[]> = {
    'PreToolUse:Edit|Write': ['hk1-append-only', 'hk3-state-promotion'],
    'PreToolUse:Bash': ['hk5-commit-guard'],
    'PostToolUse:Edit|Write': ['hk4-watch-reminder'],
  };

  assert.deepEqual([...grupos.keys()].sort(), Object.keys(esperado).sort());
  for (const [chave, nomes] of Object.entries(esperado)) {
    const comandos = grupos.get(chave) ?? [];
    assert.equal(comandos.length, nomes.length, `${chave}: ${comandos.length} hooks`);
    for (const nome of nomes) {
      assert.ok(comandos.some((comando) => comando.includes(nome)), `${chave} deveria invocar ${nome}`);
    }
    for (const comando of comandos) {
      assert.ok(comando.includes('${CLAUDE_PLUGIN_ROOT}'), 'o comando precisa ser relocável');
    }
  }
});

test('RNF-0002: o wrapper existe, é executável e falha aberta — o host só empresta o Docker', () => {
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
  let vistos = 0;

  for (const grupos of Object.values(hooks)) {
    for (const grupo of grupos) {
      for (const hook of grupo.hooks) {
        const name = hook.command.trim().split(/\s+/).pop()?.replace(/"/g, '') ?? '';
        assert.ok(existsSync(join(ROOT, 'src/hooks', `${name}.ts`)), `src/hooks/${name}.ts deveria existir`);
        vistos += 1;
      }
    }
  }

  assert.equal(vistos, 4, 'a varredura deveria ver os quatro hooks das Fases 1 e 3');
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

test('RNF-0002: nenhum script executável carrega CR — o runtime é Linux (ADR-0001)', () => {
  for (const relative of ['bin/living-docs', 'plugin/hooks/run-hook.sh']) {
    const source = readFileSync(join(ROOT, relative), 'utf8');
    assert.equal(source.includes('\r'), false, `${relative} com CRLF: o shebang quebra dentro do container`);
  }
});

/**
 * Varredura, não lista fixa — mesma escolha que `authoring.test.ts` faz para as
 * skills: um agent novo entra nas convenções no dia em que nasce, sem ninguém
 * lembrar de acrescentá-lo aqui.
 */
const AGENTS = readdirSync(join(ROOT, 'plugin/agents')).filter((name) => name.endsWith('.md'));

test('AG-2: o diretório de agents existe e traz decision-adversary', () => {
  assert.ok(AGENTS.includes('decision-adversary.md'), `plugin/agents: ${AGENTS.join(', ') || 'vazio'}`);
});

for (const file of AGENTS) {
  test(`${file}: frontmatter com name casando o arquivo, description e tools declaradas`, () => {
    const source = readFileSync(join(ROOT, 'plugin/agents', file), 'utf8');
    const name = file.replace(/\.md$/, '');

    assert.match(source, new RegExp(`^name:\\s*${name}\\s*$`, 'm'), `${file} declara outro name`);
    assert.match(source, /^description:/m, `${file} sem description — é ela que diz quando usar`);
    assert.notEqual(
      source.match(/^tools:\s*(.+)$/m)?.[1] ?? '',
      '',
      `${file} precisa declarar tools explicitamente — agent sem allowlist herda tudo`,
    );
  });
}

test('AG-2: decision-adversary aponta e para — sem Edit nem Write', () => {
  const source = readFileSync(join(ROOT, 'plugin/agents/decision-adversary.md'), 'utf8');
  const toolsLine = source.match(/^tools:\s*(.+)$/m)?.[1] ?? '';
  assert.doesNotMatch(toolsLine, /\bEdit\b/, 'AG-2 aponta e para — nunca reescreve (spec §6)');
  assert.doesNotMatch(toolsLine, /\bWrite\b/, 'AG-2 aponta e para — nunca reescreve (spec §6)');
});

test('decision-recorder referencia o agent decision-adversary antes da aceitação', () => {
  const source = readFileSync(join(ROOT, 'plugin/skills/decision-recorder/SKILL.md'), 'utf8');
  assert.match(source, /decision-adversary/);
});
