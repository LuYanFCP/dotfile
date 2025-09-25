#!/usr/bin/env bash

plugin_run() {
  local REPO_ROOT
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
  # shellcheck source=/dev/null
  source "${REPO_ROOT}/scripts/common.sh"

  detect_os

  log_info "Installing core utilities for ${DOTFILES_OS}/${DOTFILES_DISTRO}"

  if [[ "${DOTFILES_OS}" == "macos" ]]; then
    if ! is_command brew; then
      log_error "Homebrew is required. Install from https://brew.sh"
      return 1
    fi
    brew update
    brew install git wget curl axel autojump rsync unzip || true
  else
    case "${DOTFILES_DISTRO}" in
      ubuntu|debian)
        sudo apt-get update -y
        sudo apt-get install -y git wget curl axel autojump rsync unzip
        ;;
      fedora)
        sudo dnf install -y git wget curl axel autojump rsync unzip
        ;;
      arch)
        sudo pacman -Syu --noconfirm git wget curl axel autojump rsync unzip
        ;;
      *)
        if is_command apt-get; then
          sudo apt-get update -y
          sudo apt-get install -y git wget curl axel autojump rsync unzip
        elif is_command dnf; then
          sudo dnf install -y git wget curl axel autojump rsync unzip
        elif is_command pacman; then
          sudo pacman -Syu --noconfirm git wget curl axel autojump rsync unzip
        else
          log_error "Unsupported package manager. Install deps manually."
        fi
        ;;
    esac
  fi

  log_success "Core utilities installed"
}


