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

  # Keep Pi preferences and local extensions in the repository.
  ensure_symlink "${REPO_ROOT}/config/pi/settings.json" "${HOME}/.pi/agent/settings.json"
  ensure_symlink "${REPO_ROOT}/config/pi/extensions" "${HOME}/.pi/agent/extensions"

  # Sync custom tools to ~/.local/bin for both local and remote usage.
  # Any executable file under tools/ is linked, regardless of extension.
  ensure_dir "${HOME}/.local/bin"
  shopt -s nullglob
  local tool tool_name
  for tool in "${REPO_ROOT}/tools/"*; do
    tool_name="$(basename "${tool}")"
    [[ -f "${tool}" ]] || continue
    [[ "${tool_name}" == "README.md" ]] && continue
    chmod +x "${tool}" || true
    ensure_symlink "${tool}" "${HOME}/.local/bin/${tool_name}"
  done

  # Remove stale tool symlinks that point to removed repository scripts.
  local linked_tool link_target
  for linked_tool in "${HOME}/.local/bin/"*; do
    if [[ -L "${linked_tool}" ]]; then
      link_target="$(readlink "${linked_tool}")"
      if [[ "${link_target}" == "${REPO_ROOT}/tools/"* ]] && [[ ! -e "${link_target}" ]]; then
        rm -f "${linked_tool}"
      fi
    fi
  done
  shopt -u nullglob

  log_success "Dotfiles linked"
}


