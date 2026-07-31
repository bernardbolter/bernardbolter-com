#!/usr/bin/env bash
# Safe Netcup deploy: build to a staging dir while the live process keeps
# serving the current .next. Only then stop → atomic swap → start.
#
# NEVER run `npm run build && pm2 restart` on the live tree — next build
# rewrites .next in place and every in-flight request 500s for the full
# build window (often 60–90s). That is what produced the AI-crawler 500s.
#
# Usage (on server, from app root or any cwd):
#   ./scripts/deploy-netcup.sh
#   ./scripts/deploy-netcup.sh --with-worker   # also restart bernardbolter-worker
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

STAGING_DIR=".next-staging"
PREV_DIR=".next-prev"
ACTIVE_DIR=".next"
RESTART_WORKER=0
HEALTH_URL="${DEPLOY_HEALTH_URL:-http://127.0.0.1:3000/}"

for arg in "$@"; do
  case "$arg" in
    --with-worker) RESTART_WORKER=1 ;;
    -h|--help)
      sed -n '2,12p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown argument: $arg" >&2
      exit 1
      ;;
  esac
done

echo "==> git pull --ff-only"
git pull --ff-only origin main

echo "==> build to ${STAGING_DIR} (live ${ACTIVE_DIR} untouched)"
rm -rf "$STAGING_DIR"
NEXT_DIST_DIR="$STAGING_DIR" npm run build

if [[ ! -f "${STAGING_DIR}/BUILD_ID" && ! -f "${STAGING_DIR}/build-manifest.json" && ! -d "${STAGING_DIR}/server" ]]; then
  echo "ERROR: staging build looks incomplete; aborting without touching live ${ACTIVE_DIR}." >&2
  exit 1
fi

echo "==> stop app (brief downtime — swap only, not the build)"
pm2 stop bernardbolter

echo "==> swap ${ACTIVE_DIR}"
rm -rf "$PREV_DIR"
if [[ -d "$ACTIVE_DIR" ]]; then
  mv "$ACTIVE_DIR" "$PREV_DIR"
fi
mv "$STAGING_DIR" "$ACTIVE_DIR"

echo "==> start app"
pm2 start bernardbolter --update-env

if [[ "$RESTART_WORKER" -eq 1 ]]; then
  echo "==> restart worker"
  pm2 restart bernardbolter-worker --update-env
fi

echo "==> health check ${HEALTH_URL}"
ok=0
for i in 1 2 3 4 5 6 7 8 9 10; do
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 5 "$HEALTH_URL" || echo 000)"
  if [[ "$code" == "200" ]]; then
    ok=1
    echo "    healthy (HTTP ${code}) after ${i}s"
    break
  fi
  echo "    waiting… HTTP ${code}"
  sleep 1
done

if [[ "$ok" -ne 1 ]]; then
  echo "ERROR: health check failed. Rolling back to ${PREV_DIR}." >&2
  pm2 stop bernardbolter || true
  rm -rf "$ACTIVE_DIR"
  mv "$PREV_DIR" "$ACTIVE_DIR"
  pm2 start bernardbolter --update-env
  exit 1
fi

echo ""
echo "Deploy complete ($(git rev-parse --short HEAD))."
if [[ -d "$PREV_DIR" ]]; then
  echo "Previous build kept at ${PREV_DIR}."
  echo "Manual rollback:"
  echo "  pm2 stop bernardbolter && rm -rf ${ACTIVE_DIR} && mv ${PREV_DIR} ${ACTIVE_DIR} && pm2 start bernardbolter --update-env"
fi
