#!/usr/bin/env bash
#
# Fast tenant frontend deploy: build on this machine, upload dist, swap it into
# the running alm-tenant-web container. No Docker build on the server.
#
#   ./scripts/deploy-fast.sh              # build + deploy
#   ./scripts/deploy-fast.sh --skip-build # deploy the existing dist/
#   ./scripts/deploy-fast.sh --rollback   # restore the previous release
#   ./scripts/deploy-fast.sh --allow-dirty  # deploy with uncommitted changes
#
# Override with env vars: DEPLOY_HOST, CONTAINER, VITE_API_BASE_URL, VITE_FRONTEND_URL
#
# The next full deploy (deploy-docker.sh / docker build) replaces this release,
# so always push the same code to the production branch.
#
set -euo pipefail

DEPLOY_HOST="${DEPLOY_HOST:-root@103.192.199.178}"
CONTAINER="${CONTAINER:-alm-tenant-web}"
WEB_ROOT="/usr/share/nginx/html"

export VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://rioassetmanagement.net/api}"
export VITE_FRONTEND_URL="${VITE_FRONTEND_URL:-https://rioassetmanagement.net}"
export VITE_API_PORT="${VITE_API_PORT:-}"
export VITE_RESERVED_SUBDOMAINS="${VITE_RESERVED_SUBDOMAINS:-web,www,api,pressanaorg,bannari}"

SKIP_BUILD=0
ROLLBACK=0
ALLOW_DIRTY=0
for arg in "$@"; do
  case "$arg" in
    --skip-build) SKIP_BUILD=1 ;;
    --rollback) ROLLBACK=1 ;;
    --allow-dirty) ALLOW_DIRTY=1 ;;
    -h|--help) sed -n '2,15p' "$0"; exit 0 ;;
    *) echo "Unknown option: $arg"; exit 1 ;;
  esac
done

cd "$(dirname "${BASH_SOURCE[0]}")/.."
log() { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
die() { printf '\033[1;31m[deploy] %s\033[0m\n' "$*" >&2; exit 1; }

# One SSH connection for the whole run, so the password is asked only once.
SSH_SOCK="$(mktemp -u /tmp/alm-deploy-ssh.XXXXXX)"
SSH_OPTS=(-o ControlMaster=auto -o ControlPath="$SSH_SOCK" -o ControlPersist=120 -o ConnectTimeout=15)
cleanup() { ssh "${SSH_OPTS[@]}" -O exit "$DEPLOY_HOST" >/dev/null 2>&1 || true; rm -f "${ARCHIVE:-}"; }
trap cleanup EXIT
remote() { ssh "${SSH_OPTS[@]}" "$DEPLOY_HOST" "$@"; }

log "Connecting to $DEPLOY_HOST ..."
remote "docker inspect -f '{{.State.Running}}' $CONTAINER" | grep -q true \
  || die "Container $CONTAINER is not running on $DEPLOY_HOST"

if [[ "$ROLLBACK" == "1" ]]; then
  log "Rolling back $CONTAINER to the previous release ..."
  remote "docker exec $CONTAINER sh -c '
    set -e
    [ -d ${WEB_ROOT}_prev ] || { echo \"No previous release to roll back to\"; exit 1; }
    mv $WEB_ROOT ${WEB_ROOT}_rollback_tmp
    mv ${WEB_ROOT}_prev $WEB_ROOT
    mv ${WEB_ROOT}_rollback_tmp ${WEB_ROOT}_prev
  '"
  log "Rollback done."
  exit 0
fi

if [[ "$ALLOW_DIRTY" != "1" && -n "$(git status --porcelain)" ]]; then
  git status --short
  die "Uncommitted changes. Commit/push them first or pass --allow-dirty."
fi
git fetch -q origin production 2>/dev/null || true
if [[ "$(git rev-parse HEAD)" != "$(git rev-parse origin/production 2>/dev/null || echo none)" ]]; then
  log "WARNING: local HEAD differs from origin/production — push so the server repo matches."
fi

if [[ "$SKIP_BUILD" != "1" ]]; then
  log "Building ($VITE_API_BASE_URL) ..."
  start=$(date +%s)
  NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}" npx vite build --logLevel warn
  log "Build finished in $(( $(date +%s) - start ))s"
fi
[[ -f dist/index.html ]] || die "dist/index.html missing — build first."
grep -rqs "$VITE_API_BASE_URL" dist/static || die "dist/ was not built for $VITE_API_BASE_URL — rebuild without --skip-build."

ARCHIVE="$(mktemp /tmp/alm-dist.XXXXXX).tgz"
COPYFILE_DISABLE=1 tar -czf "$ARCHIVE" -C dist .
log "Uploading $(du -h "$ARCHIVE" | cut -f1) ..."
REMOTE_ARCHIVE="/tmp/alm-tenant-web-$(date +%Y%m%d%H%M%S).tgz"
scp -q "${SSH_OPTS[@]}" "$ARCHIVE" "$DEPLOY_HOST:$REMOTE_ARCHIVE"

log "Swapping files in $CONTAINER ..."
remote "set -e
  docker exec $CONTAINER sh -c 'rm -rf ${WEB_ROOT}_next && mkdir -p ${WEB_ROOT}_next'
  docker cp $REMOTE_ARCHIVE $CONTAINER:/tmp/dist.tgz
  rm -f $REMOTE_ARCHIVE
  docker exec $CONTAINER sh -c '
    set -e
    tar -xzf /tmp/dist.tgz -C ${WEB_ROOT}_next
    rm -f /tmp/dist.tgz
    # Keep old hashed chunks so open tabs on the previous version keep loading.
    for d in static assets; do
      [ -d $WEB_ROOT/\$d ] && mkdir -p ${WEB_ROOT}_next/\$d && cp -rn $WEB_ROOT/\$d/. ${WEB_ROOT}_next/\$d/ 2>/dev/null || true
    done
    rm -rf ${WEB_ROOT}_prev
    mv $WEB_ROOT ${WEB_ROOT}_prev
    mv ${WEB_ROOT}_next $WEB_ROOT
  '"

code="$(remote "curl -s -o /dev/null -w '%{http_code}' http://127.0.0.1:3001/" || true)"
[[ "$code" == "200" ]] || die "Health check returned HTTP $code — run with --rollback to restore."
log "Done. Live at $VITE_FRONTEND_URL (HTTP $code). Rollback: ./scripts/deploy-fast.sh --rollback"
