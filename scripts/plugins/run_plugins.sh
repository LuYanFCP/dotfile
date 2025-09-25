#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
source "${REPO_ROOT}/scripts/common.sh"

ONLY=""
SKIP=""
UNATTENDED=false
LIST=false

usage() {
  cat <<EOF
Usage: run_plugins.sh [--only a,b,c] [--skip x,y] [--unattended] [--list]
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --only) ONLY="${2:-}"; shift 2 ;;
    --skip) SKIP="${2:-}"; shift 2 ;;
    --unattended) UNATTENDED=true; shift ;;
    --list) LIST=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) log_error "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

export DOTFILES_UNATTENDED="$UNATTENDED"

IFS=',' read -r -a ONLY_ARR <<< "${ONLY}"
IFS=',' read -r -a SKIP_ARR <<< "${SKIP}"

should_run() {
  local id="$1"
  if [[ ${#ONLY_ARR[@]} -gt 0 && -n "${ONLY}" ]]; then
    local found=false
    for x in "${ONLY_ARR[@]}"; do [[ "$x" == "$id" ]] && found=true; done
    $found || return 1
  fi
  for x in "${SKIP_ARR[@]}"; do [[ "$x" == "$id" ]] && return 1; done
  return 0
}

mapfile -t plugin_files < <(ls -1 "${SCRIPT_DIR}"/*.sh | sort)

if $LIST; then
  for f in "${plugin_files[@]}"; do
    id="$(basename "$f" .sh)"
    echo "$id"
  done
  exit 0
fi

for f in "${plugin_files[@]}"; do
  id="$(basename "$f" .sh)"
  if ! should_run "$id"; then
    log_info "Skipping plugin: $id"
    continue
  fi
  # shellcheck source=/dev/null
  source "$f"
  if declare -F plugin_run >/dev/null 2>&1; then
    log_info "Running plugin: $id"
    plugin_run
    # unset function to avoid collisions
    unset -f plugin_run || true
  else
    log_error "Plugin $id does not define plugin_run()"
    exit 1
  fi
done

log_success "All plugins executed"


