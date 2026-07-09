#!/usr/bin/env bash
#
# Docker deploy — TENANT frontend (alm-tenant-web, port 3001).
# Run on server from ~/tenant-ALM-Wildcard/frontend
#
#   ./deploy-docker.sh           # stash, pull frontend, rebuild
#   ./deploy-docker.sh --rebuild # rebuild only (no git pull)
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALM_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOY="${ALM_ROOT}/backend/scripts/deploy/deploy-pull-rebuild.sh"

if [[ ! -f "$DEPLOY" ]]; then
  echo "ERROR: Tenant backend deploy script not found at:"
  echo "  $DEPLOY"
  echo "Expected sibling folder: ~/tenant-ALM-Wildcard/backend"
  exit 1
fi

export ALM_ROOT
export BACKEND_DIR="${ALM_ROOT}/backend"
export FRONTEND_DIR="${SCRIPT_DIR}"
export BACKEND_CONTAINER_NAME=alm-tenant-backend
export FRONTEND_CONTAINER_NAME=alm-tenant-web
export BACKEND_HOST_PORT=5001
export FRONTEND_HOST_PORT=3001

for arg in "$@"; do
  case "$arg" in
    --rebuild)
      export SKIP_GIT_PULL=1
      ;;
    --help|-h)
      echo "Usage: ./deploy-docker.sh [--rebuild]"
      echo "Tenant stack: alm-tenant-web:3001"
      exit 0
      ;;
  esac
done

export BACKEND_ONLY=0
export FRONTEND_ONLY=1
exec "$DEPLOY"
