#!/usr/bin/env bash

plugin_run() {
  local REPO_ROOT
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/scripts/common.sh"

  log_info "Installing Pi coding agent"

  if is_command pi || [[ -x "${HOME}/.local/bin/pi" ]]; then
    log_info "pi is already installed; skipping"
    log_success "pi ready"
    return 0
  fi

  if ! is_command node || ! is_command npm; then
    log_error "Pi requires Node.js 22.19.0 or newer and npm. Install them, then rerun --only 46-pi."
    return 1
  fi
  if ! node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 19) ? 0 : 1)'; then
    log_error "Pi requires Node.js 22.19.0 or newer. Upgrade Node.js, then rerun --only 46-pi."
    return 1
  fi

  npm install --global --ignore-scripts --prefix "${HOME}/.local" @earendil-works/pi-coding-agent

  log_success "pi installed (ensure ~/.local/bin is on PATH)"
}
