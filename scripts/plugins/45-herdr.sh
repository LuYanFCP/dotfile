#!/usr/bin/env bash

plugin_run() {
  local REPO_ROOT
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/scripts/common.sh"

  log_info "Installing herdr"

  # Skip installation when herdr is already available.
  if is_command herdr; then
    log_info "herdr is already installed; skipping"
    log_success "herdr ready"
    return 0
  fi

  curl -fsSL https://herdr.dev/install.sh | sh

  log_success "herdr installed"
}
