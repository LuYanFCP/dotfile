#!/usr/bin/env bash

set -euo pipefail

COLOR_RESET='\033[0m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_RED='\033[0;31m'

log_info() { echo -e "${COLOR_YELLOW}[INFO]${COLOR_RESET} $*"; }
log_success() { echo -e "${COLOR_GREEN}[OK]${COLOR_RESET} $*"; }
log_error() { echo -e "${COLOR_RED}[ERR]${COLOR_RESET} $*" 1>&2; }

is_command() { command -v "$1" >/dev/null 2>&1; }

ensure_dir() {
  local dir="$1"
  [[ -d "$dir" ]] || mkdir -p "$dir"
}

backup_file() {
  local file="$1"
  local backup_dir="${HOME}/.dotfiles_backup"
  ensure_dir "$backup_dir"
  if [[ -e "$file" || -L "$file" ]]; then
    local ts
    ts="$(date +%Y%m%d-%H%M%S)"
    mv -f "$file" "${backup_dir}/$(basename "$file").${ts}"
  fi
}

# Detect OS kernel and distro ID (Ubuntu/Fedora/etc.)
detect_os() {
  local kernel
  kernel="$(uname -s)"
  if [[ "$kernel" == "Darwin" ]]; then
    export DOTFILES_OS="macos"
    export DOTFILES_DISTRO="macos"
  else
    export DOTFILES_OS="linux"
    if [[ -f /etc/os-release ]]; then
      # shellcheck disable=SC1091
      . /etc/os-release || true
      export DOTFILES_DISTRO="${ID:-linux}"
    else
      export DOTFILES_DISTRO="linux"
    fi
  fi
}


