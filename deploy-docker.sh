#!/usr/bin/env bash
#
# Docker deploy — Bannari FRONTEND (alm-bannari-frontend :3004).
# Run on the server from the Bannari frontend directory.
#
#   ./deploy-docker.sh           # stash, pull frontend, rebuild
#   ./deploy-docker.sh --rebuild # rebuild only (no git pull)
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALM_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOY="${ALM_ROOT}/backend/scripts/deploy/deploy-pull-rebuild.sh"

export ALM_ROOT
export BACKEND_DIR="${ALM_ROOT}/backend"
export FRONTEND_DIR="${SCRIPT_DIR}"

if [[ ! -f "$DEPLOY" ]]; then
  echo "ERROR: Backend deploy script not found at:"
  echo "  $DEPLOY"
  echo "Expected sibling folder: backend next to frontend"
  exit 1
fi

for arg in "$@"; do
  case "$arg" in
    --rebuild)
      export SKIP_GIT_PULL=1
      export SKIP_FRONTEND_IF_UNCHANGED=0
      export FRONTEND_FORCE_RECREATE=1
      ;;
    --help|-h)
      echo "Usage: ./deploy-docker.sh [--rebuild]"
      exit 0
      ;;
  esac
done

export BACKEND_ONLY=0
export FRONTEND_ONLY=1
export BACKEND_CONTAINER_NAME="${BACKEND_CONTAINER_NAME:-alm-bannari-backend}"
export FRONTEND_CONTAINER_NAME="${FRONTEND_CONTAINER_NAME:-alm-bannari-frontend}"
export BACKEND_HOST_PORT="${BACKEND_HOST_PORT:-5004}"
export FRONTEND_HOST_PORT="${FRONTEND_HOST_PORT:-3004}"
export MINIO_BUCKET_VALUE="${MINIO_BUCKET_VALUE:-alm-bannari}"
export BANNARI_PUBLIC_URL="${BANNARI_PUBLIC_URL:-https://bannari.rioassetmanagement.net}"
export BANNARI_RESERVED_SUBDOMAINS="${BANNARI_RESERVED_SUBDOMAINS:-web,www,api,pressanaorg,bannari}"
export FORCE_COMPOSE_RECREATE="${FORCE_COMPOSE_RECREATE:-0}"
export SKIP_FRONTEND_IF_UNCHANGED="${SKIP_FRONTEND_IF_UNCHANGED:-1}"
export COMPOSE_IGNORE_ORPHANS="${COMPOSE_IGNORE_ORPHANS:-1}"
# Prevent clobbering other ALM compose projects (same folder name AssetLifecycleWebFrontend)
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-bannari-alm}"
exec "$DEPLOY"
