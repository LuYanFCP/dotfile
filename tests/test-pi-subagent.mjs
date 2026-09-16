import test from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { runAgent, runBatch, childArgs, OUTPUT_LIMIT } from '../config/pi/extensions/subagent/runner.mjs';
const invocation = { command: process.execPath, args: [fileURLToPath(new URL('./fixtures/pi-subagent.mjs', import.meta.url))] };
const defaults = { invocation, cwd: process.cwd(), timeoutMs: 5000, killGraceMs: 50 };
const run = (task, options = {}) => runAgent({ agent: 'scout', task }, { ...defaults, ...options });

test('child isolation, read-only tools, inherited model/thinking, and cwd', async () => {
  const result = await run('inspect', { model: 'provider/model', thinking: 'high' });
  assert.equal(result.status, 'ok');
  const child = JSON.parse(result.output);
  assert.equal(child.cwd, process.cwd());
  assert.equal(child.marker, '1');
  for (const flag of ['--no-session', '--no-extensions', '--no-approve']) assert.ok(child.args.includes(flag));
  assert.equal(child.args[child.args.indexOf('--tools') + 1], 'read,grep,find,ls');
  assert.equal(child.args[child.args.indexOf('--model') + 1], 'provider/model');
  assert.equal(child.args[child.args.indexOf('--thinking') + 1], 'high');
  assert.ok(childArgs({ agent: 'worker' }).includes('read,grep,find,ls,bash,edit,write'));
});
test('task is literal stdin; split UTF-8, multiple text parts, trailing JSON, usage', async () => {
  const task = '@file --model nope $(touch nope)';
  const result = await run(task);
  assert.equal(result.status, 'ok');
  assert.equal(result.output, `你好\n${task}`);
  assert.deepEqual(result.usage, { input: 2, output: 3, cost: 0.01 });
});
test('exit failure, API error, and absent final answer are not successes', async () => {
  for (const task of ['fail', 'api-error', 'empty', 'tool-only']) {
    const result = await run(task);
    assert.equal(result.status, 'error', task);
    assert.ok(result.error);
  }
});
test('missing executable returns an error', async () => {
  const result = await run('inspect', { invocation: { command: '/nonexistent/pi-test-command', args: [] } });
  assert.equal(result.status, 'error');
  assert.match(result.error, /Cannot start Pi/);
});
test('timeout escalates for a process ignoring SIGTERM', async () => {
  const result = await run('hang', { timeoutMs: 200 });
  assert.equal(result.status, 'timeout');
  assert.ok(result.elapsedMs < 3000);
});
test('abort stops the child and its descendant', { skip: process.platform === 'win32' }, async () => {
  const controller = new AbortController();
  let descendant;
  const result = await run('descendant', { signal: controller.signal, onProgress(text) {
    const match = text.match(/pid:(\d+)/);
    if (match) { descendant = Number(match[1]); controller.abort(); }
  } });
  assert.equal(result.status, 'cancelled');
  assert.ok(descendant);
  // Allow the OS to reap the killed process group.
  let alive = true;
  for (let i = 0; i < 50; i++) {
    try { process.kill(descendant, 0); } catch { alive = false; break; }
    await new Promise((resolve) => setTimeout(resolve, 20));
  }
  assert.equal(alive, false);
});
test('already aborted work never spawns', async () => {
  const controller = new AbortController(); controller.abort();
  const result = await run('inspect', { signal: controller.signal, invocation: { command: '/does-not-exist', args: [] } });
  assert.equal(result.status, 'cancelled');
});
test('output is capped and oversized events fail', async () => {
  const result = await run('long-answer');
  assert.equal(result.status, 'ok');
  assert.ok(result.output.length < OUTPUT_LIMIT + 100);
  assert.match(result.output, /truncated/);
  assert.equal((await run('huge-line')).status, 'error');
});
test('parallel execution caps concurrency at three and preserves request order', async () => {
  let active = 0, peak = 0;
  const tasks = [120, 20, 80, 30, 10].map((ms) => ({ agent: 'scout', task: `delay:${ms}` }));
  const results = await runBatch(tasks, { ...defaults, onTaskProgress(_index, state) {
    if (state === 'Starting') peak = Math.max(peak, ++active);
    if (state === 'ok') active--;
  } });
  assert.equal(peak, 3);
  assert.equal(active, 0);
  assert.deepEqual(results.map((result) => result.output), tasks.map((task) => task.task));
});
test('cancellation also prevents queued work from spawning', async () => {
  const controller = new AbortController();
  const tasks = Array.from({ length: 5 }, () => ({ agent: 'scout', task: 'hang' }));
  const results = await runBatch(tasks, { ...defaults, signal: controller.signal, onTaskProgress(_index, state) {
    if (state === 'Using ready') controller.abort();
  } });
  assert.ok(results.every((result) => result.status === 'cancelled'));
  assert.equal(results[4].error, 'Cancelled before starting');
});
