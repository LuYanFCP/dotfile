#!/usr/bin/env bash

plugin_run() {
  local REPO_ROOT
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/scripts/common.sh"

  log_info "Linking dotfiles"

  # Link zsh configuration from config/zsh
  ensure_symlink "${REPO_ROOT}/config/zsh/.zshrc" "${HOME}/.zshrc"

  # Link WezTerm configuration from config/wezterm
  ensure_symlink "${REPO_ROOT}/config/wezterm/wezterm.lua" "${HOME}/.wezterm.lua"
  ensure_symlink "${REPO_ROOT}/config/wezterm/core.lua" "${HOME}/.config/wezterm/core.lua"
  # Prefer image from config/wezterm; keep legacy fallback for compatibility
  if [[ -f "${REPO_ROOT}/config/wezterm/static/back.jpg" ]]; then
    ensure_symlink "${REPO_ROOT}/config/wezterm/static/back.jpg" "${HOME}/.config/wezterm/static/back.jpg"
  elif [[ -f "${REPO_ROOT}/wezterm/static/back.jpg" ]]; then
    ensure_symlink "${REPO_ROOT}/wezterm/static/back.jpg" "${HOME}/.config/wezterm/static/back.jpg"
  fi

  log_success "Dotfiles linked"
}


