#!/usr/bin/env bash

plugin_run() {
  local REPO_ROOT
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/scripts/common.sh"

  detect_os

  log_info "Installing and configuring tmux for ${DOTFILES_OS}/${DOTFILES_DISTRO}"

  # Install tmux using the appropriate package manager
  if [[ "${DOTFILES_OS}" == "macos" ]]; then
    if is_command brew; then
      brew install tmux || true
    else
      log_error "Homebrew is required to install tmux on macOS. Install from https://brew.sh"
    fi
  else
    case "${DOTFILES_DISTRO}" in
      ubuntu|debian)
        sudo apt-get update -y
        apt_install_tolerant tmux
        ;;
      fedora)
        sudo dnf install -y tmux
        ;;
      arch)
        sudo pacman -S --noconfirm tmux
        ;;
      *)
        if is_command apt-get; then
          sudo apt-get update -y
          apt_install_tolerant tmux
        elif is_command dnf; then
          sudo dnf install -y tmux
        elif is_command pacman; then
          sudo pacman -S --noconfirm tmux
        else
          log_error "Unsupported package manager. Install tmux manually."
        fi
        ;;
    esac
  fi

  # Use local tmux configuration; only link template if missing
  if [[ -f "${HOME}/.tmux.conf" || -L "${HOME}/.tmux.conf" ]]; then
    log_info "Using existing ~/.tmux.conf (no link created)"
  else
    log_info "No ~/.tmux.conf found; linking template from config/tmux"
    ln -snf "${REPO_ROOT}/config/tmux/.tmux.conf" "${HOME}/.tmux.conf"
  fi

  # Ensure TPM is installed for plugin management (idempotent)
  if [[ ! -d "${HOME}/.tmux/plugins/tpm" ]]; then
    ensure_dir "${HOME}/.tmux/plugins"
    git clone https://github.com/tmux-plugins/tpm "${HOME}/.tmux/plugins/tpm" || true
  fi

  log_success "tmux configured"
}


