#!/usr/bin/env bash

plugin_run() {
  local REPO_ROOT
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/scripts/common.sh"

  log_info "Linking dotfiles"

  backup_file "${HOME}/.zshrc"
  ln -snf "${REPO_ROOT}/resource/.zshrc" "${HOME}/.zshrc"

  ensure_dir "${HOME}/.config/wezterm/static"
  ln -snf "${REPO_ROOT}/wezterm/wezterm.lua" "${HOME}/.wezterm.lua"
  ln -snf "${REPO_ROOT}/wezterm/core.lua" "${HOME}/.config/wezterm/core.lua"
  if [[ -f "${REPO_ROOT}/wezterm/static/back.jpg" ]]; then
    ln -snf "${REPO_ROOT}/wezterm/static/back.jpg" "${HOME}/.config/wezterm/static/back.jpg"
  fi

  log_success "Dotfiles linked"
}


