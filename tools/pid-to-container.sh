#!/usr/bin/env bash

set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <pid>" >&2
  exit 1
fi

PID="$1"

if [[ ! -d "/proc/${PID}" ]]; then
  echo "PID not found: ${PID}" >&2
  exit 1
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker command not found" >&2
  exit 1
fi

CID="$(grep -oE '[0-9a-f]{64}' "/proc/${PID}/cgroup" | head -n 1 || true)"

if [[ -n "${CID}" ]]; then
  echo "Container ID: ${CID}"
  docker ps --filter "id=${CID}" --format "table {{.ID}}\t{{.Image}}\t{{.Names}}\t{{.Status}}"
else
  echo "Not running in a Docker container"
fi

