#!/usr/bin/env bash

set -euo pipefail

COLOR_RESET='\033[0m'
COLOR_GREEN='\033[0;32m'
COLOR_YELLOW='\033[0;33m'
COLOR_RED='\033[0;31m'

log_write() {
  local level="$1"
  shift
  local message="$*"
  local timestamp
  timestamp="$(date '+%Y-%m-%dT%H:%M:%S%z')"
  if [[ -n "${DOTFILES_LOG_FILE:-}" ]]; then
    mkdir -p "$(dirname "${DOTFILES_LOG_FILE}")"
    printf '%s [%s] %s\n' "$timestamp" "$level" "$message" >> "${DOTFILES_LOG_FILE}"
  fi
}

log_info() {
  log_write INFO "$*"
  echo -e "${COLOR_YELLOW}[INFO]${COLOR_RESET} $*"
}

log_success() {
  log_write SUCCESS "$*"
  echo -e "${COLOR_GREEN}[OK]${COLOR_RESET} $*"
}

log_error() {
  log_write ERROR "$*"
  echo -e "${COLOR_RED}[ERR]${COLOR_RESET} $*" 1>&2
}

log_debug() {
  if [[ "${DOTFILES_DEBUG:-false}" == "true" ]]; then
    log_write DEBUG "$*"
    echo -e "${COLOR_YELLOW}[DBG]${COLOR_RESET} $*"
  fi
}

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

# Ensure a symlink points to the expected source.
# If the destination already points to the same source, do nothing.
# If the destination exists but differs, back it up once and relink.
ensure_symlink() {
  local source="$1"
  local target="$2"

  ensure_dir "$(dirname "$target")"

  if [[ -L "$target" ]] && [[ "$(readlink "$target")" == "$source" ]]; then
    log_debug "Symlink already up to date: $target -> $source"
    return 0
  fi

  if [[ -e "$target" || -L "$target" ]]; then
    backup_file "$target"
  fi

  ln -snf "$source" "$target"
}

# Check if a Debian package is installed.
apt_pkg_installed() {
  local pkg="$1"
  local status
  status="$(dpkg-query -W -f='${Status}' "$pkg" 2>/dev/null || true)"
  [[ "$status" == "install ok installed" ]]
}

# Install packages with apt-get.
# If apt-get returns non-zero due to unrelated dpkg issues, treat as success
# when all requested packages are already installed.
apt_install_tolerant() {
  if [[ $# -eq 0 ]]; then
    return 0
  fi

  if sudo apt-get install -y "$@"; then
    return 0
  fi

  local pkg
  for pkg in "$@"; do
    if ! apt_pkg_installed "$pkg"; then
      log_error "apt install failed and package is missing: $pkg"
      return 1
    fi
  done

  log_info "apt returned non-zero, but requested packages are installed; continuing"
  return 0
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


