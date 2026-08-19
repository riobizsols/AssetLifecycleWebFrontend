#!/usr/bin/env bash
#
# Docker deploy — Pressana FRONTEND (alm-pressana-frontend :3003).
# Run on server from ~/pressana-ALM/AssetLifecycleWebFrontend
#
#   ./deploy-docker.sh           # stash, pull frontend, rebuild
#   ./deploy-docker.sh --rebuild # rebuild only (no git pull)
#
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ALM_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEPLOY="${ALM_ROOT}/AssetLifecycleBackend/scripts/deploy/deploy-pull-rebuild.sh"

if [[ ! -f "$DEPLOY" ]]; then
  echo "ERROR: Backend deploy script not found at:"
  echo "  $DEPLOY"
  echo "Expected sibling folder: AssetLifecycleBackend next to AssetLifecycleWebFrontend"
  exit 1
fi

for arg in "$@"; do
  case "$arg" in
    --rebuild)
      export SKIP_GIT_PULL=1
      ;;
    --help|-h)
      echo "Usage: ./deploy-docker.sh [--rebuild]"
      exit 0
      ;;
  esac
done

export BACKEND_ONLY=0
export FRONTEND_ONLY=1
export BACKEND_CONTAINER_NAME="${BACKEND_CONTAINER_NAME:-alm-pressana-backend}"
export FRONTEND_CONTAINER_NAME="${FRONTEND_CONTAINER_NAME:-alm-pressana-frontend}"
export BACKEND_HOST_PORT="${BACKEND_HOST_PORT:-5003}"
export FRONTEND_HOST_PORT="${FRONTEND_HOST_PORT:-3003}"
export MINIO_BUCKET_VALUE="${MINIO_BUCKET_VALUE:-alm-pressana}"
export PRESSANA_PUBLIC_URL="${PRESSANA_PUBLIC_URL:-https://pressanaorg.rioassetmanagement.net}"
export PRESSANA_RESERVED_SUBDOMAINS="${PRESSANA_RESERVED_SUBDOMAINS:-web,www,api,pressanaorg}"
export FORCE_COMPOSE_RECREATE="${FORCE_COMPOSE_RECREATE:-1}"
export COMPOSE_IGNORE_ORPHANS="${COMPOSE_IGNORE_ORPHANS:-1}"
# Prevent clobbering ~/alm-main compose project (same folder name AssetLifecycleWebFrontend)
export COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-pressana-alm}"
exec "$DEPLOY"
