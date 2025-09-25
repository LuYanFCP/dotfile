#!/usr/bin/env bash

set -euo pipefail

usage() {
  echo "Usage: bash ./setup.sh [--install|--uninstall] [--unattended]"
}

INSTALL=false
UNINSTALL=false
UNATTENDED=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    --install) INSTALL=true; shift ;;
    --uninstall) UNINSTALL=true; shift ;;
    --unattended) UNATTENDED=true; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown arg: $1"; usage; exit 1 ;;
  esac
done

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"

if $INSTALL; then
  chmod +x "${ROOT_DIR}/bin/install"
  if $UNATTENDED; then
    "${ROOT_DIR}/bin/install" --unattended
  else
    "${ROOT_DIR}/bin/install"
  fi
elif $UNINSTALL; then
  chmod +x "${ROOT_DIR}/bin/uninstall"
  "${ROOT_DIR}/bin/uninstall"
else
  usage
  exit 1
fi
