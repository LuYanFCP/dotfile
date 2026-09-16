# Pi configuration

`30-link` links these files into Pi's global configuration:

| Repository path | Installed path |
| --- | --- |
| `config/pi/settings.json` | `~/.pi/agent/settings.json` |
| `config/pi/extensions/` | `~/.pi/agent/extensions/` |

Apply the links with `bin/install --only 30-link --unattended`. Existing files
or directories are backed up to `~/.dotfiles_backup` before replacement.
Authentication, sessions, and downloaded packages stay in `~/.pi/agent`.

## Add packages

Add npm or Git sources to the `packages` array in `settings.json`, for example:

```json
{
  "packages": [
    "npm:@scope/package-name",
    "git:github.com/owner/repo"
  ]
}
```

These are placeholders; replace them with actual packages. Alternatively,
`pi install npm:<package-name>` records the package in global settings. Since
settings are linked, these changes can be reviewed and committed here.

## Add local extensions

Place a TypeScript extension in `extensions/my-extension.ts`, or use
`extensions/my-extension/index.ts` for an extension with multiple files. Pi
auto-discovers this directory; use `/reload` in a running session after edits.
The bundled [subagent extension](extensions/subagent/README.md) adds isolated
scout, reviewer, and worker agents with single-task and parallel execution.
The [terminal extension](extensions/terminal/README.md) adds `/terminal` and
`Ctrl+Alt+T` to open a tmux shell alongside Pi while the agent keeps running.

Other preferences can be added to `settings.json` as needed; model and provider
choices are initially left at Pi's defaults.

See the official [settings](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/settings.md),
[packages](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/packages.md),
and [extensions](https://github.com/badlogic/pi-mono/blob/main/packages/coding-agent/docs/extensions.md) documentation.
