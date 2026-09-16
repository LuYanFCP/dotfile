import { spawn } from 'node:child_process';
let input = '';
for await (const chunk of process.stdin) input += chunk;
const task = input.replace(/^Delegated task:\n/, '').trim();
const emit = (event) => process.stdout.write(JSON.stringify(event) + '\n');
const answer = (text, extra = {}) => ({ type: 'message_end', message: { role: 'assistant', content: [{ type: 'text', text }], stopReason: 'stop', usage: { input: 2, output: 3, cost: { total: 0.01 } }, ...extra } });
if (task === 'hang' || task === 'descendant') {
  process.on('SIGTERM', () => {});
  if (task === 'descendant') {
    const child = spawn(process.execPath, ['-e', 'process.on("SIGTERM", () => {}); setInterval(() => {}, 1000)'], { stdio: 'inherit' });
    emit({ type: 'tool_execution_start', toolName: `pid:${child.pid}` });
  } else emit({ type: 'tool_execution_start', toolName: 'ready' });
  setInterval(() => {}, 1000);
} else if (task === 'fail') {
  process.stderr.write('installer failed');
  process.exitCode = 7;
} else if (task === 'api-error') {
  emit(answer('', { stopReason: 'error', errorMessage: 'Provider rejected request' }));
} else if (task === 'empty') {
  emit({ type: 'session' });
} else if (task === 'tool-only') {
  emit(answer('I will look at the files', { stopReason: 'toolUse' }));
} else if (task === 'huge-line') {
  process.stdout.write('x'.repeat(2 * 1024 * 1024 + 1));
} else if (task === 'long-answer') {
  emit(answer('文'.repeat(30000)));
} else if (task.startsWith('delay:')) {
  await new Promise((resolve) => setTimeout(resolve, Number(task.split(':')[1])));
  emit(answer(task));
} else if (task === 'inspect') {
  emit(answer(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), marker: process.env.PI_DOTFILES_SUBAGENT })));
} else {
  process.stdout.write('non-JSON startup notice\n');
  const json = JSON.stringify(answer(task, { content: [{ type: 'text', text: '你好' }, { type: 'text', text: task }] }));
  const bytes = Buffer.from(json);
  // Deliberately split inside a UTF-8 character and omit the final newline.
  const split = bytes.indexOf(Buffer.from('你好')) + 1;
  process.stdout.write(bytes.subarray(0, split));
  await new Promise((resolve) => setTimeout(resolve, 10));
  process.stdout.write(bytes.subarray(split));
}
