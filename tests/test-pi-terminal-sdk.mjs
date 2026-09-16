import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const packageRoot = process.env.PI_PACKAGE_ROOT;

test('Pi registers terminal command/shortcut and handles modes without waiting for the agent', { skip: !packageRoot }, async () => {
  const { loadExtensions } = await import(pathToFileURL(resolve(packageRoot, 'dist/core/extensions/loader.js')));
  const savedTmux = process.env.TMUX;
  delete process.env.TMUX;
  try {
    const loaded = await loadExtensions([resolve('config/pi/extensions/terminal/index.ts')], process.cwd());
    assert.deepEqual(loaded.errors, []);
    const extension = loaded.extensions[0];
    const command = extension.commands.get('terminal');
    const shortcut = extension.shortcuts.get('ctrl+alt+t');
    assert.ok(command && shortcut);
    const notices = [];
    const ctx = { mode: 'tui', cwd: process.cwd(), ui: { notify: (...args) => notices.push(args) },
      waitForIdle() { throw new Error('must not wait for the agent'); },
      abort() { throw new Error('must not interrupt the agent'); } };
    await command.handler('help', ctx);
    assert.match(notices.at(-1)[0], /persistent shell overlay/);
    assert.match(shortcut.description, /Show\/hide/);
    await command.handler('', { ...ctx, mode: 'rpc' });
    assert.equal(notices.at(-1)[1], 'warning');
    assert.equal(extension.tools.size, 0, 'shell is controlled by the user, not an LLM tool');
  } finally {
    if (savedTmux !== undefined) process.env.TMUX = savedTmux;
  }
});
