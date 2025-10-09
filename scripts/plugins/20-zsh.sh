#!/usr/bin/env bash

plugin_run() {
  local REPO_ROOT
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/scripts/common.sh"

  detect_os

  log_info "Installing zsh and zplug for ${DOTFILES_OS}/${DOTFILES_DISTRO}"

  if [[ "${DOTFILES_OS}" == "macos" ]]; then
    brew install zsh || true
  else
    case "${DOTFILES_DISTRO}" in
      ubuntu|debian)
        sudo apt-get install -y zsh git
        ;;
      fedora)
        sudo dnf install -y zsh git util-linux-user
        ;;
      arch)
        sudo pacman -S --noconfirm zsh git
        ;;
      *)
        if is_command apt-get; then
          sudo apt-get install -y zsh git
        elif is_command dnf; then
          sudo dnf install -y zsh git
        elif is_command pacman; then
          sudo pacman -S --noconfirm zsh git
        fi
        ;;
    esac
  fi

  # ensure zplug is available (zshrc will install if missing too)
  if [[ ! -d "${HOME}/.zplug" ]]; then
    # Use zsh -f to avoid sourcing rc files during installer, preventing recursion
    curl -sL --proto-redir -all,https https://raw.githubusercontent.com/zplug/installer/master/installer.zsh | zsh -f || true
  fi

  log_success "zsh and zplug ready"
}


