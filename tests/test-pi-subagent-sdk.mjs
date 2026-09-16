// Optional integration test against an installed Pi; no model/API calls.
import test from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
const packageRoot = process.env.PI_PACKAGE_ROOT;

test('Pi loader, schema, tool execution, and recursion guard', { skip: !packageRoot }, async () => {
  const require = createRequire(resolve(packageRoot, 'package.json'));
  const { Check } = await import(pathToFileURL(require.resolve('typebox/value')));
  const { loadExtensions } = await import(pathToFileURL(resolve(packageRoot, 'dist/core/extensions/loader.js')));
  const extensionPath = resolve('config/pi/extensions/subagent/index.ts');
  const loaded = await loadExtensions([extensionPath], process.cwd());
  assert.deepEqual(loaded.errors, []);
  const tool = loaded.extensions[0].tools.get('subagent').definition;
  assert.equal(tool.executionMode, 'sequential');
  assert.ok(Check(tool.parameters, { agent: 'scout', task: 'inspect' }));
  assert.equal(Check(tool.parameters, { agent: 'unknown', task: 'inspect' }), false);
  assert.equal(Check(tool.parameters, { tasks: Array(9).fill({ agent: 'scout', task: 'inspect' }) }), false);
  assert.equal(Check(tool.parameters, { agent: 'scout', task: 'inspect', timeoutSeconds: 0 }), false);
  const ctx = { cwd: process.cwd(), model: { provider: 'test', id: 'model' }, thinkingLevel: 'high' };
  await assert.rejects(tool.execute('test', { agent: 'scout', task: 'inspect', tasks: [{ agent: 'worker', task: 'inspect' }] }, undefined, undefined, ctx), /either/);
  await assert.rejects(tool.execute('test', { agent: 'scout', task: 'inspect' }, undefined, undefined, { ...ctx, model: undefined }), /Select a model/);
  const originalScript = process.argv[1];
  try {
    // Exercise the real registered tool with a deterministic Pi-shaped process.
    process.argv[1] = resolve('tests/fixtures/pi-subagent.mjs');
    const updates = [];
    const result = await tool.execute('test', { tasks: [{ agent: 'scout', task: 'inspect' }, { agent: 'reviewer', task: 'api-error' }] }, undefined, (update) => updates.push(update), ctx);
    assert.deepEqual(result.details.results.map((item) => item.status), ['ok', 'error']);
    const child = JSON.parse(result.details.results[0].output);
    assert.equal(child.args[child.args.indexOf('--model') + 1], 'test/model');
    assert.equal(child.args[child.args.indexOf('--thinking') + 1], 'high');
    assert.match(result.content[0].text, /Provider rejected request/);
    assert.ok(updates.length > 0);
  } finally { process.argv[1] = originalScript; }
  const previousMarker = process.env.PI_DOTFILES_SUBAGENT;
  try {
    process.env.PI_DOTFILES_SUBAGENT = '1';
    const childLoad = await loadExtensions([extensionPath], process.cwd());
    assert.deepEqual(childLoad.errors, []);
    assert.equal(childLoad.extensions[0].tools.size, 0);
  } finally {
    if (previousMarker === undefined) delete process.env.PI_DOTFILES_SUBAGENT;
    else process.env.PI_DOTFILES_SUBAGENT = previousMarker;
  }
});
