import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { basename } from 'node:path';

export const ROLES = {
  scout: { tools: 'read,grep,find,ls', prompt: 'Explore the codebase without modifying files. Report relevant paths, facts, and uncertainties.' },
  reviewer: { tools: 'read,grep,find,ls', prompt: 'Review the requested code without modifying files. Prioritize actionable bugs, cite file paths, and explain impact. Distinguish findings from assumptions.' },
  worker: { tools: 'read,grep,find,ls,bash,edit,write', prompt: 'Implement the assigned task within its stated scope. Other agents may share this directory: preserve unrelated work. Validate your changes and report modified files, checks, and limitations. Do not commit or push unless the task explicitly requests it.' },
};
export const OUTPUT_LIMIT = 24000;
const LINE_LIMIT = 2 * 1024 * 1024;
const STREAM_LIMIT = 32 * 1024 * 1024;

export function clip(text, limit = OUTPUT_LIMIT) {
  return text.length <= limit ? text : text.slice(0, limit) + '\n[Output truncated]';
}

export function piInvocation(argv = process.argv, executable = process.execPath) {
  if (argv[1] && !argv[1].startsWith('/$bunfs/') && existsSync(argv[1]) && /^(node|bun)(\.exe)?$/i.test(basename(executable))) {
    return { command: executable, args: [argv[1]] };
  }
  return { command: /^(node|bun)(\.exe)?$/i.test(basename(executable)) ? 'pi' : executable, args: [] };
}

export function childArgs(task, model, thinking) {
  const role = ROLES[task.agent];
  if (!role) throw new Error(`Unknown agent: ${task.agent}`);
  const args = ['--mode', 'json', '--print', '--no-session', '--no-extensions', '--no-skills', '--no-prompt-templates', '--no-themes', '--no-approve', '--tools', role.tools];
  if (model) args.push('--model', model);
  if (thinking) args.push('--thinking', thinking);
  args.push('--append-system-prompt', `You are a delegated ${task.agent} agent. You have a fresh conversation; use the task and repository files as context. ${role.prompt}`);
  return args;
}

// Each child has its own context, but shares the parent's working directory.
// The task goes over stdin: no shell interpolation or CLI option/file parsing.
export async function runAgent(task, options) {
  const started = Date.now();
  const result = { agent: task.agent, task: task.task, status: 'error', output: '', error: '', exitCode: null, elapsedMs: 0, usage: { input: 0, output: 0, cost: 0 } };
  if (options.signal?.aborted) return { ...result, status: 'cancelled', error: 'Cancelled before starting' };
  const invocation = options.invocation ?? piInvocation();
  const args = [...invocation.args, ...childArgs(task, options.model, options.thinking)];
  return new Promise((resolve) => {
    let pending = '', stderr = '', bytes = 0, lastStop = '', assistantError = '';
    let stopReason = '', stopStatus = 'error', closed = false, killTimer;
    let finalSeen = false;
    const grouped = process.platform !== 'win32';
    const child = spawn(invocation.command, args, {
      cwd: options.cwd, env: { ...process.env, PI_DOTFILES_SUBAGENT: '1' },
      stdio: ['pipe', 'pipe', 'pipe'], shell: false, detached: grouped,
    });
    const kill = (signal) => {
      if (!child.pid) return;
      try { if (grouped) process.kill(-child.pid, signal); else child.kill(signal); }
      catch (error) { if (error.code !== 'ESRCH') stderr = clip(`${stderr}\n${error.message}`, 4000); }
    };
    const stop = (status, reason) => {
      if (closed || stopReason) return;
      stopStatus = status;
      stopReason = reason;
      kill('SIGTERM');
      // child.killed only means a signal was sent, not that it has exited.
      killTimer = setTimeout(() => kill('SIGKILL'), options.killGraceMs ?? 1000);
    };
    const abort = () => stop('cancelled', 'Cancelled by parent');
    const timer = setTimeout(() => stop('timeout', 'Subagent timed out'), options.timeoutMs ?? 600000);
    options.signal?.addEventListener('abort', abort, { once: true });
    if (options.signal?.aborted) abort();
    const progress = (text) => options.onProgress?.(text);
    const line = (raw) => {
      if (!raw.trim() || stopReason) return;
      let event;
      try { event = JSON.parse(raw); } catch { return; }
      if (event?.type === 'tool_execution_start') progress(`Using ${event.toolName}`);
      if (event?.type !== 'message_end' || event.message?.role !== 'assistant') return;
      const message = event.message;
      finalSeen = true;
      lastStop = message.stopReason;
      assistantError = typeof message.errorMessage === 'string' ? message.errorMessage : '';
      result.output = clip((Array.isArray(message.content) ? message.content : [])
        .filter((part) => part?.type === 'text' && typeof part.text === 'string').map((part) => part.text).join('\n'));
      for (const key of ['input', 'output']) {
        const value = message.usage?.[key];
        if (Number.isFinite(value)) result.usage[key] += value;
      }
      if (Number.isFinite(message.usage?.cost?.total)) result.usage.cost += message.usage.cost.total;
      progress('Assistant response received');
    };
    child.stdout.setEncoding('utf8');
    child.stdout.on('data', (chunk) => {
      if (stopReason) return;
      bytes += Buffer.byteLength(chunk);
      if (bytes > STREAM_LIMIT) { stop('error', 'Subagent event stream exceeded 32 MiB'); return; }
      pending += chunk;
      let newline;
      while ((newline = pending.indexOf('\n')) !== -1) {
        if (newline > LINE_LIMIT) { stop('error', 'Subagent event exceeded 2 MiB'); return; }
        line(pending.slice(0, newline));
        pending = pending.slice(newline + 1);
      }
      if (pending.length > LINE_LIMIT) stop('error', 'Subagent event exceeded 2 MiB');
    });
    child.stderr.setEncoding('utf8');
    child.stderr.on('data', (chunk) => { stderr = (stderr + chunk).slice(-4000); });
    child.stdin.on('error', (error) => { if (error.code !== 'EPIPE') stop('error', error.message); });
    child.on('error', (error) => { stopStatus = 'error'; stopReason = `Cannot start Pi: ${error.message}`; });
    child.on('close', (code, signal) => {
      if (pending) line(pending);
      closed = true;
      clearTimeout(timer);
      clearTimeout(killTimer);
      options.signal?.removeEventListener('abort', abort);
      // A cancelled leader may exit before its children; reap the whole group.
      if (stopReason) kill('SIGKILL');
      result.exitCode = code;
      result.elapsedMs = Date.now() - started;
      if (stopReason) { result.status = stopStatus; result.error = stopReason; }
      else if (code !== 0 || signal || lastStop === 'error' || lastStop === 'aborted' || !finalSeen || !result.output || lastStop === 'toolUse') {
        result.error = assistantError || stderr || `Pi did not finish with a final answer (exit ${code}, signal ${signal ?? 'none'})`;
      } else result.status = 'ok';
      result.error = clip(result.error, 4000);
      resolve(result);
    });
    child.stdin.end(`Delegated task:\n${task.task}\n`);
  });
}

export async function runBatch(tasks, options) {
  const results = new Array(tasks.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(3, tasks.length) }, async () => {
    while (next < tasks.length) {
      const index = next++;
      options.onTaskProgress?.(index, 'Starting');
      results[index] = await runAgent(tasks[index], { ...options, onProgress: (text) => options.onTaskProgress?.(index, text) });
      options.onTaskProgress?.(index, results[index].status);
    }
  });
  await Promise.all(workers);
  return results;
}
