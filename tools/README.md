# Tools

Place custom utility scripts in this directory.

## Conventions

- Use executable scripts (`chmod +x`).
- Keep script names descriptive, for example `pid-to-container.sh`.
- Add short usage notes at the top of each script.

## Remote Sync

`bin/deploy-remote` syncs the whole repository (except explicit excludes), so scripts in `tools/` are automatically synced to remote hosts.

