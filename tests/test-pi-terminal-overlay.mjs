import test from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
const root = process.env.PI_PACKAGE_ROOT;

test('Pi overlay renders a live shell, forwards keys, and preserves state when hidden', { skip: !root || process.env.PI_TERMINAL_LIVE !== '1' }, async () => {
  const require = createRequire(resolve(root, 'package.json'));
  const { visibleWidth, stripTerminalSequences } = await import(pathToFileURL(require.resolve('@earendil-works/pi-tui')));
  const { loadExtensions } = await import(pathToFileURL(resolve(root, 'dist/core/extensions/loader.js')));
  const oldShell = process.env.SHELL;
  process.env.SHELL = '/bin/sh';
  const loaded = await loadExtensions([resolve('config/pi/extensions/terminal/index.ts')], process.cwd());
  if (oldShell === undefined) delete process.env.SHELL; else process.env.SHELL = oldShell;
  assert.deepEqual(loaded.errors, []);
  const command = loaded.extensions[0].commands.get('terminal');
  const failures = [];
  let component, done, view = [], renders = 0;
  const ctx = { cwd: process.cwd(), mode: 'tui', isIdle: () => false,
    abort() { throw new Error('must not abort'); },
    ui: {
      notify(message, level) { if (level === 'error') failures.push(message); },
      custom(factory, options) {
        assert.equal(options.overlay, true);
        return new Promise((resolveDone) => {
          done = () => { component?.dispose(); component = undefined; resolveDone(); };
          const tui = { terminal: { rows: 30 }, requestRender() {
            if (component) { view = component.render(88); renders++; }
          } };
          component = factory(tui, { fg: (_color, text) => text }, {}, done);
          tui.requestRender();
        });
      },
    },
  };
  const waitFor = async (predicate) => {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      if (predicate()) return;
      if (failures.length) throw new Error(failures.join('\n'));
      await new Promise((resolveWait) => setTimeout(resolveWait, 30));
    }
    throw new Error(`Overlay timed out: ${view.join('\n')}`);
  };
  let running;
  try {
    running = command.handler('', ctx);
    await waitFor(() => component && renders > 1);
    component.handleInput("TERMINAL_SMOKE=42; printf '\\nOVERLAY_READY\\n'\r");
    await waitFor(() => view.some((line) => stripTerminalSequences(line).includes('│OVERLAY_READY')));
    assert.ok(view.every((line) => visibleWidth(line) === 88), 'all rendered rows fit the overlay');
    component.handleInput('\x1d'); // Ctrl+] hides without exiting the shell.
    await running;
    running = command.handler('', ctx);
    await waitFor(() => component);
    component.handleInput('printf "\\nVALUE_%s\\n" "$TERMINAL_SMOKE"\r');
    await waitFor(() => view.some((line) => stripTerminalSequences(line).includes('│VALUE_42')));
    component.handleInput('\x1d');
    await running;
    assert.deepEqual(failures, []);
  } finally {
    done?.();
    if (running) await running;
    await command.handler('close', ctx);
  }
});
