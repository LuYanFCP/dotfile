#!/usr/bin/env bash

plugin_run() {
  local REPO_ROOT
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/scripts/common.sh"

  detect_os

  log_info "Configuring docker group and permissions"

  if [[ "${DOTFILES_OS}" == "macos" ]]; then
    log_info "macOS uses Docker Desktop; skipping group setup"
    return 0
  fi

  if ! getent group docker >/dev/null 2>&1; then
    sudo groupadd docker || true
  fi
  sudo usermod -aG docker "$USER" || true

  log_success "Added ${USER} to docker group (re-login or run: newgrp docker)"
}


