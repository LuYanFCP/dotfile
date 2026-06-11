# Tools

Place custom utility scripts in this directory.

## Conventions

- Use executable scripts (`chmod +x`).
- Keep script names descriptive, for example `pid-to-container.sh`.
- Add short usage notes at the top of each script.
- Python tools can use uv inline script metadata (PEP 723) and `#!/usr/bin/env -S uv run --script` so dependencies are auto-managed.

## Available Tools

- `pid-to-container.sh <pid>` — find the Docker container that owns a PID.
- `chat <endpoint>` — interactive AI chat TUI supporting OpenAI / OpenAI Responses / Anthropic; useful for testing NIM endpoints.

## Remote Sync

`bin/deploy-remote` syncs the whole repository (except explicit excludes), so scripts in `tools/` are automatically synced to remote hosts.

