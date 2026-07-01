#!/usr/bin/env bash
#
# Docker deploy — FRONTEND container (alm-main-frontend).
# Pushed with this repo; run on server from ~/alm-main/AssetLifecycleWebFrontend
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
  echo "Expected sibling folder: ~/alm-main/AssetLifecycleBackend"
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
exec "$DEPLOY"
