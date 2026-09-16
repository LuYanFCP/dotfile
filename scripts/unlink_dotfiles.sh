#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
source "${SCRIPT_DIR}/common.sh"

log_info "Unlinking dotfiles"

for f in \
  "${HOME}/.zshrc" \
  "${HOME}/.wezterm.lua" \
  "${HOME}/.config/wezterm/core.lua" \
  "${HOME}/.config/wezterm/static/back.jpg"; do
  if [[ -L "$f" ]]; then
    rm -f "$f"
  fi
done

# Only remove Pi links owned by this checkout.
for name in settings.json extensions; do
  target="${HOME}/.pi/agent/${name}"
  if [[ -L "$target" ]] && [[ "$(readlink "$target")" == "${REPO_ROOT}/config/pi/${name}" ]]; then
    rm -f "$target"
  fi
done

log_success "Dotfiles unlinked"


