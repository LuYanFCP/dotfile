// Opt-in test with an isolated tmux server. Does not touch user sessions.
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, mkdir, readFile, realpath, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createTerminal } from '../config/pi/extensions/terminal/tmux.mjs';
const exec = promisify(execFile);

test('real tmux split preserves running parent, cwd, reuse, and close', { skip: process.env.PI_TERMINAL_LIVE !== '1' }, async () => {
  const root = await realpath(await mkdtemp(join(tmpdir(), 'pi-terminal-')));
  const socket = join(root, 'socket');
  const heartbeat = join(root, 'heartbeat');
  const cwd = join(root, 'project with spaces #{window_name}');
  await mkdir(cwd);
  const run = async (args) => (await exec('tmux', ['-S', socket, '-f', '/dev/null', ...args], { timeout: 5000 })).stdout.trim();
  try {
    await run(['new-session', '-d', '-s', 'test', '-x', '120', '-y', '40', '-e', `PI_TERMINAL_TEST_HEARTBEAT=${heartbeat}`, '/bin/sh', '-c', 'while :; do printf x >> "$PI_TERMINAL_TEST_HEARTBEAT"; sleep 0.1; done']);
    const pane = await run(['display-message', '-p', '-t', 'test', '#{pane_id}']);
    const terminal = createTerminal({ pane, tmux: socket, run });
    await terminal('', cwd);
    const listing = await run(['list-panes', '-t', 'test', '-F', '#{pane_id}']);
    assert.equal(listing.split('\n').length, 2);
    const child = listing.split('\n').find((id) => id !== pane);
    assert.equal(await run(['display-message', '-p', '-t', child, '#{pane_current_path}']), cwd);
    const before = (await readFile(heartbeat)).length;
    await new Promise((resolve) => setTimeout(resolve, 350));
    assert.ok((await readFile(heartbeat)).length > before, 'parent process continues while terminal is open');
    await terminal('', cwd);
    assert.equal((await run(['list-panes', '-t', 'test', '-F', '#{pane_id}'])).split('\n').length, 2);
    await terminal('close', cwd);
    assert.equal(await run(['list-panes', '-t', 'test', '-F', '#{pane_id}']), pane);
  } finally {
    await run(['kill-server']).catch(() => {});
    await rm(root, { recursive: true, force: true });
  }
});
