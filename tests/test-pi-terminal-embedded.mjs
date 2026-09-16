import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { EmbeddedTerminal, terminalInput } from '../config/pi/extensions/terminal/embedded.mjs';

test('keyboard encodings become shell input, including Ctrl+C and Unicode', () => {
  assert.equal(terminalInput('\x1b[99;5u', 'ctrl+c'), '\x03');
  assert.equal(terminalInput('\x1b[13u', 'enter'), '\r');
  assert.equal(terminalInput('\x1b[97u', 'a', 'a'), 'a');
  assert.equal(terminalInput('中文', undefined), '中文');
  assert.equal(terminalInput('unused', 'up'), '\x1b[A');
  assert.equal(terminalInput('unused', 'alt+b'), '\x1bb');
});

test('embedded PTY works outside tmux, persists, resizes, handles Ctrl+C and exit', { skip: process.env.PI_TERMINAL_LIVE !== '1' }, async () => {
  const root = await mkdtemp(join(tmpdir(), 'pi-embedded-test-'));
  const terminal = new EmbeddedTerminal({ shell: '/bin/sh' });
  const waitFor = async (predicate) => {
    const deadline = Date.now() + 8000;
    while (Date.now() < deadline) {
      const state = await terminal.snapshot();
      if (predicate(state)) return state;
      await new Promise((resolve) => setTimeout(resolve, 30));
    }
    throw new Error('Timed out waiting for terminal state');
  };
  try {
    await terminal.open(root, 80, 20);
    const directory = terminal.directory;
    await terminal.send("printf '\\nEMBEDDED_OK\\n'\r");
    await waitFor((state) => state.lines.some((line) => line.trim() === 'EMBEDDED_OK'));
    await terminal.resize(60, 12);
    await terminal.send('stty size\r');
    await waitFor((state) => state.lines.some((line) => line.trim() === '12 60'));
    await terminal.send("while :; do printf x >> heartbeat; sleep 0.1; done\r");
    await new Promise((resolve) => setTimeout(resolve, 250));
    const before = (await readFile(join(root, 'heartbeat'))).length;
    // No polling/display needed: the shell keeps running while the overlay hides.
    await new Promise((resolve) => setTimeout(resolve, 350));
    assert.ok((await readFile(join(root, 'heartbeat'))).length > before);
    await terminal.open('/tmp');
    assert.equal(terminal.directory, directory, 'reopening preserves the shell');
    await terminal.send('\x03');
    await terminal.send("printf '\\nINTERRUPTED_OK\\n'\r");
    await waitFor((state) => state.lines.some((line) => line.trim() === 'INTERRUPTED_OK'));
    await terminal.send("printf '\\033[?1049h\\033[2J\\033[HALT_SCREEN_OK'\r");
    await waitFor((state) => state.lines[0]?.startsWith('ALT_SCREEN_OK'));
    await terminal.send("printf '\\033[?1049l'\r");
    await terminal.send('exit\r');
    const final = await waitFor((state) => state.dead);
    assert.equal(final.exitCode, 0);
    await terminal.close();
    assert.equal(terminal.directory, undefined);
  } finally {
    await terminal.close();
    await rm(root, { recursive: true, force: true });
  }
});
