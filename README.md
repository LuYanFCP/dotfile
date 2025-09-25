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
