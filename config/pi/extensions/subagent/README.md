# Subagent

A local Pi extension that registers the `subagent` tool. The parent delegates a
self-contained task to a separate Pi process, waits for its result, then
continues its own conversation. No additional npm dependencies are needed;
Pi supplies the extension API and TypeBox.

## Load

With the repository's `30-link` configuration installed, restart Pi or use
`/reload`. To try the extension directly from the repository root:

```bash
pi -e ./config/pi/extensions/subagent/index.ts
```

Ask Pi, for example:

> Use a scout subagent to find the authentication entry points, then explain them.

> Run two reviewer subagents in parallel: one checks the request validation,
> the other checks error handling. Summarize their findings.

## Tool arguments

Single task:

```json
{
  "agent": "scout",
  "task": "Find the authentication entry points under src/. Return file paths and a short flow explanation."
}
```

Parallel tasks:

```json
{
  "tasks": [
    { "agent": "reviewer", "task": "Review src/api/ for missing input validation. Report concrete bugs with file paths." },
    { "agent": "reviewer", "task": "Review src/storage/ for error-handling bugs. Report concrete bugs with file paths." }
  ],
  "timeoutSeconds": 300
}
```

Provide either `agent` + `task`, or `tasks`. There are at most 8 tasks per call
and 3 active children. The timeout applies separately to each child after it
starts: default 600 seconds, configurable from 1 to 3600 seconds. Each task can
contain up to 32,000 characters.

| Role | Tools | Purpose |
| --- | --- | --- |
| `scout` | read, grep, find, ls | Locate code and explain relationships |
| `reviewer` | read, grep, find, ls | Review code and report actionable findings |
| `worker` | Above plus bash, edit, write | Implement changes and run validation |

## Behavior

- Each child starts a fresh conversation with the assigned task and a role
  prompt. Parent chat history is not copied. Include relevant paths, constraints,
  previous findings, and expected results in the task.
- Children inherit the parent's working directory, model, thinking level, and
  environment. Normal Pi credential and model configuration remains available.
- Files are shared, not copied into worktrees. Keep concurrent write tasks on
  separate files; the parent should inspect and validate all changes.
- Children use `--no-session`. They disable extension, skill, prompt-template,
  and theme discovery, and ignore project-local Pi resources. Normal repository
  context files can still be loaded by Pi. The read-only roles have no shell or
  write tools; this is tool restriction, not an OS sandbox.
- Extension-defined providers and custom tools are unavailable in children.
  Models configured through Pi's normal model configuration can still be used.
- There is no recursive delegation, background session, session resume, or
  direct communication between children. The parent can make another call for
  follow-up work and include the earlier result in the next task.
- Progress reports the current tool and completion state. Results include each
  task's status (`ok`, `error`, `cancelled`, `timeout`), final answer, error,
  elapsed time, exit code, and reported input/output tokens and cost in details.
  Mixed-success batches preserve both successful answers and failures.
- Cancellation and timeouts terminate the process group on macOS/Linux, with a
  SIGKILL fallback after one second. Windows only terminates the direct child;
  this repository primarily targets macOS/Linux.
- Answers are capped at 24,000 characters per child. Oversized JSON events
  (2 MiB of decoded text) or event streams (32 MiB) terminate the child with an
  explicit error. Truncated output is marked; full transcripts are not saved.

## Validation

Process tests use a fake Pi executable and make no API calls:

```bash
node --test tests/test-pi-subagent.mjs
```

To additionally check loading, schema validation, and execution through an
installed Pi SDK (also without API calls):

```bash
PI_PACKAGE_ROOT="$(npm root -g)/@earendil-works/pi-coding-agent" \
  node --test tests/test-pi-subagent-sdk.mjs
```

Tested with Pi 0.85.1 and Node.js 24.5.0. Architecture reference:
[Pi's official subagent example](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent/examples/extensions/subagent).
