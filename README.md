### dotfiles
Opinionated, scriptable dotfiles for local and remote setup.

### Features
- **Local install**: One command to install zsh, zplug-managed plugins, and link configs
- **Remote deploy**: Rsync dotfiles to a remote host and run setup remotely (unattended)
- **Idempotent**: Safe to re-run; uses symlinks and checks

### Structure
- `bin/` executables
- `scripts/` modular installers and helpers
- `resource/` static config files (e.g., `.zshrc`)
- `wezterm/` terminal config
- `docker/` optional container build

### Quick start (local)
```bash
bin/install --unattended
```

Uninstall:
```bash
bin/uninstall
```

### Remote deploy
```bash
bin/deploy-remote --host user@server --path ~/.dotfiles --unattended
```

### Notes
- Uses `zplug` for Zsh plugin management ([zplug/zplug](https://github.com/zplug/zplug))
- Scripts are non-interactive by default when `--unattended` is used
- Safe to re-run; existing files are backed up to `~/.dotfiles_backup`

### Bash settings migration
The Zsh installer creates `~/.config/zsh/bashrc-migrated.zsh` once from
standalone portable `export` and `alias` declarations in `~/.bashrc`. Quoted
multiline values and simple variable references are supported. Conditional
blocks, functions, here-documents, command substitutions, and unsupported
syntax are skipped; review those settings manually. The source is never
executed, and an existing migration file is preserved.

Run the migration regression checks with `bash tests/test-bashrc-migration.sh`.

### Pi coding agent
The `46-pi` plugin installs [Pi](https://github.com/badlogic/pi-mono/tree/main/packages/coding-agent)
with npm into `~/.local`, using the official `@earendil-works/pi-coding-agent`
package. It requires Node.js 22.19.0 or newer and npm, and skips installation
when `pi` is already on PATH or executable at `~/.local/bin/pi`.

Install just Pi with `bin/install --only 46-pi --unattended`. Ensure
`~/.local/bin` is on PATH, then run `pi` and use `/login` to authenticate.
