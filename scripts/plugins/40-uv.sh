#!/usr/bin/env bash

plugin_run() {
  local REPO_ROOT
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/scripts/common.sh"

  detect_os
  log_info "Installing uv for ${DOTFILES_OS}/${DOTFILES_DISTRO}"

  if [[ "${DOTFILES_OS}" == "macos" ]]; then
    if is_command brew; then
      brew install uv || true
    else
      curl -fsSL https://astral.sh/uv/install.sh | sh
    fi
  else
    curl -fsSL https://astral.sh/uv/install.sh | sh
  fi

  log_success "uv installed (ensure ~/.local/bin is on PATH)"
}


