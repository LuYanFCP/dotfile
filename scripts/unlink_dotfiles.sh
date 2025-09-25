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

log_success "Dotfiles unlinked"


