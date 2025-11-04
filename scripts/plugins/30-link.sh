#!/usr/bin/env bash

plugin_run() {
  local REPO_ROOT
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/scripts/common.sh"

  log_info "Linking dotfiles"

  # Link zsh configuration from config/zsh
  backup_file "${HOME}/.zshrc"
  ln -snf "${REPO_ROOT}/config/zsh/.zshrc" "${HOME}/.zshrc"

  # Link WezTerm configuration from config/wezterm
  ensure_dir "${HOME}/.config/wezterm/static"
  ln -snf "${REPO_ROOT}/config/wezterm/wezterm.lua" "${HOME}/.wezterm.lua"
  ln -snf "${REPO_ROOT}/config/wezterm/core.lua" "${HOME}/.config/wezterm/core.lua"
  # Prefer image from config/wezterm; fall back to legacy path if not migrated
  if [[ -f "${REPO_ROOT}/config/wezterm/static/back.jpg" ]]; then
    ln -snf "${REPO_ROOT}/config/wezterm/static/back.jpg" "${HOME}/.config/wezterm/static/back.jpg"
  elif [[ -f "${REPO_ROOT}/wezterm/static/back.jpg" ]]; then
    ln -snf "${REPO_ROOT}/wezterm/static/back.jpg" "${HOME}/.config/wezterm/static/back.jpg"
  fi

  log_success "Dotfiles linked"
}


