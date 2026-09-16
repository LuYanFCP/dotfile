import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';
import { Type } from 'typebox';
import { runBatch } from './runner.mjs';

const Agent = Type.Union([Type.Literal('scout'), Type.Literal('reviewer'), Type.Literal('worker')]);
const Task = Type.Object({
  agent: Agent,
  task: Type.String({ minLength: 1, maxLength: 32000, description: 'Self-contained task, including relevant paths, constraints, and expected result.' }),
});

export default function subagentExtension(pi: ExtensionAPI) {
  if (process.env.PI_DOTFILES_SUBAGENT === '1') return;
  pi.registerTool({
    name: 'subagent',
    label: 'Subagent',
    description: 'Delegate to isolated Pi conversations in the current working directory. Use agent + task for one task, or tasks for up to 8 independent tasks (3 concurrent). scout and reviewer have read-only built-in tools; worker can edit files and run shell commands. Children inherit the current model and thinking level, but not conversation history or extensions. Shared files: never delegate overlapping writes concurrently. Return results to the parent for verification.',
    promptSnippet: 'Delegate self-contained exploration, review, or implementation tasks to subagents.',
    executionMode: 'sequential',
    parameters: Type.Object({
      agent: Type.Optional(Agent),
      task: Type.Optional(Type.String({ minLength: 1, maxLength: 32000 })),
      tasks: Type.Optional(Type.Array(Task, { minItems: 1, maxItems: 8 })),
      timeoutSeconds: Type.Optional(Type.Integer({ minimum: 1, maximum: 3600, description: 'Timeout per child after it starts; default 600 seconds.' })),
    }),
    async execute(_id, params, signal, onUpdate, ctx) {
      const single = params.agent !== undefined || params.task !== undefined;
      if ((single && params.tasks !== undefined) || (!single && !params.tasks?.length) || (single && (!params.agent || !params.task?.trim())) || params.tasks?.some((task) => !task.task.trim())) {
        throw new Error('Provide either agent + a non-empty task, or a non-empty tasks array, never both.');
      }
      if (!ctx.model) throw new Error('Select a model before delegating tasks.');
      const tasks = params.tasks ?? [{ agent: params.agent!, task: params.task! }];
      const states = tasks.map(() => 'Queued');
      const results = await runBatch(tasks, {
        cwd: ctx.cwd,
        model: `${ctx.model.provider}/${ctx.model.id}`,
        thinking: ctx.thinkingLevel,
        timeoutMs: (params.timeoutSeconds ?? 600) * 1000,
        signal,
        onTaskProgress(index: number, state: string) {
          states[index] = state;
          onUpdate?.({ content: [{ type: 'text', text: tasks.map((task, i) => `${i + 1}. ${task.agent}: ${states[i]}`).join('\n') }], details: { states: [...states] } });
        },
      });
      return {
        content: [{ type: 'text', text: results.map((result, index) => [
          `## ${index + 1}. ${result.agent} — ${result.status}`,
          result.error ? `Error: ${result.error}` : '',
          result.output,
        ].filter(Boolean).join('\n\n')).join('\n\n') }],
        details: { results },
      };
    },
  });
}
