import { test } from 'node:test';
import assert from 'node:assert/strict';
import { SettingsError, mergeSettings } from '../../src/config/claude-settings.ts';

test('RF-0013: sem settings, o registro nasce com o marketplace e o plugin', () => {
  const { text, added } = mergeSettings(null, 'time/living-docs');
  const parsed = JSON.parse(text) as Record<string, Record<string, unknown>>;

  assert.deepEqual(parsed.extraKnownMarketplaces?.['living-docs'], {
    source: { source: 'github', repo: 'time/living-docs' },
  });
  assert.equal(parsed.enabledPlugins?.['living-docs@living-docs'], true);
  assert.equal(added.length, 2);
  assert.ok(text.endsWith('\n'));
});

test('RF-0013: o que o consumidor já tinha continua lá', () => {
  const meu = JSON.stringify(
    {
      hooks: { PreToolUse: [{ matcher: 'Edit', hooks: [{ type: 'command', command: './meu-hook.sh' }] }] },
      enabledPlugins: { 'outro@loja': true },
    },
    null,
    2,
  );

  const { text } = mergeSettings(meu, 'time/living-docs');
  const parsed = JSON.parse(text) as Record<string, Record<string, unknown>>;

  assert.ok(parsed.hooks, 'nenhum hook do consumidor é perdido');
  assert.equal(parsed.enabledPlugins?.['outro@loja'], true);
  assert.equal(parsed.enabledPlugins?.['living-docs@living-docs'], true);
});

test('RF-0013: mesclar duas vezes não duplica e não muda um byte', () => {
  const primeira = mergeSettings(null, 'time/living-docs');
  const segunda = mergeSettings(primeira.text, 'time/living-docs');

  assert.equal(segunda.text, primeira.text);
  assert.deepEqual(segunda.added, []);
});

test('RF-0013: entrada que o consumidor escreveu à mão não é reescrita', () => {
  const meu = JSON.stringify(
    { extraKnownMarketplaces: { 'living-docs': { source: { source: 'git', url: 'file:///opt/toolkit' } } } },
    null,
    2,
  );

  const { text, added } = mergeSettings(meu, 'time/living-docs');
  const parsed = JSON.parse(text) as Record<string, Record<string, Record<string, unknown>>>;

  assert.deepEqual(parsed.extraKnownMarketplaces?.['living-docs']?.source, {
    source: 'git',
    url: 'file:///opt/toolkit',
  });
  assert.deepEqual(added, ['enabledPlugins["living-docs@living-docs"]']);
});

test('RF-0013: settings ilegível é erro, nunca sobrescrita', () => {
  assert.throws(() => mergeSettings('{ isto não é json', 'time/living-docs'), SettingsError);
});
