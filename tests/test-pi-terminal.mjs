import test from 'node:test';
import assert from 'node:assert/strict';
import { createTerminal } from '../config/pi/extensions/terminal/tmux.mjs';

function harness() {
  const calls = [];
  const panes = new Map([['%1', ''], ['%2', 'unrelated']]);
  const run = async (args) => {
    calls.push(args);
    const id = args[args.indexOf('-t') + 1];
    if (args[0] === 'list-panes') return [...panes].map(([pane, owner]) => `${pane}\t${owner}`).join('\n');
    if (args[0] === 'split-window') { panes.set('%3', ''); return '%3'; }
    if (args[0] === 'set-option') panes.set(id, args.at(-1));
    if (args[0] === 'kill-pane') panes.delete(id);
    return '';
  };
  const options = { pane: '%1', tmux: '/tmp/test,1,0', pid: 123, run };
  return { terminal: createTerminal(options), calls, panes, options };
}
test('opens the requested split with literal cwd and focuses it', async () => {
  const { terminal, calls } = harness();
  await terminal('right', '/tmp/a b;$(touch nope)#{window_name}');
  const split = calls.find((args) => args[0] === 'split-window');
  assert.ok(split.includes('-h'));
  assert.equal(split[split.indexOf('-c') + 1], '/tmp/a b;$(touch nope)##{window_name}');
  assert.deepEqual(calls.at(-1), ['select-pane', '-t', '%3']);
});
test('repeat and concurrent opens reuse the same shell, including after reload', async () => {
  const { terminal, calls, options } = harness();
  await Promise.all([terminal('', '/tmp'), terminal('', '/tmp')]);
  await createTerminal(options)('', '/elsewhere');
  assert.equal(calls.filter((args) => args[0] === 'split-window').length, 1);
  assert.equal(calls.filter((args) => args[0] === 'select-pane').length, 3);
});
test('close only touches owned terminal; a later open creates a shell again', async () => {
  const { terminal, panes, calls } = harness();
  await terminal('close', '/tmp');
  assert.equal(calls.some((args) => args[0] === 'kill-pane'), false);
  await terminal('', '/tmp');
  await terminal('close', '/tmp');
  assert.ok(panes.has('%1') && panes.has('%2'));
  assert.equal(panes.has('%3'), false);
  await terminal('', '/tmp');
  assert.equal(calls.filter((args) => args[0] === 'split-window').length, 2);
});
test('invalid commands and non-tmux environments never run a process', async () => {
  let calls = 0;
  const terminal = createTerminal({ pane: '', tmux: '', run: async () => { calls++; } });
  await assert.rejects(terminal('', '/tmp'), /not running inside tmux/);
  await assert.rejects(terminal('bogus', '/tmp'), /Use \/terminal/);
  assert.match(await terminal('help', '/tmp'), /Ctrl\+Alt\+T/);
  assert.equal(calls, 0);
});
test('errors propagate and do not poison subsequent actions', async () => {
  const h = harness();
  let fail = true;
  const terminal = createTerminal({ ...h.options, run: async (args) => {
    if (fail) { fail = false; throw new Error('server unavailable'); }
    return h.options.run(args);
  } });
  await assert.rejects(terminal('', '/tmp'), /server unavailable/);
  await terminal('', '/tmp');
  assert.ok(h.panes.has('%3'));
});
