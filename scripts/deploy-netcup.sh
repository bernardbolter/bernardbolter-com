#!/usr/bin/env bash
# Safe Netcup deploy: build to a staging dir; only swap .next and restart pm2 if build succeeds.
# Usage (on server): ./scripts/deploy-netcup.sh
set -euo pipefail

APP_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$APP_DIR"

STAGING_DIR=".next-staging"
PREV_DIR=".next-prev"
ACTIVE_DIR=".next"

echo "==> git pull"
git pull

echo "==> build to ${STAGING_DIR} (live ${ACTIVE_DIR} untouched until success)"
rm -rf "$STAGING_DIR"
NEXT_DIST_DIR="$STAGING_DIR" npm run build

echo "==> swap ${ACTIVE_DIR}"
rm -rf "$PREV_DIR"
if [[ -d "$ACTIVE_DIR" ]]; then
  mv "$ACTIVE_DIR" "$PREV_DIR"
fi
mv "$STAGING_DIR" "$ACTIVE_DIR"

echo "==> restart pm2"
pm2 restart bernardbolter bernardbolter-worker --update-env

echo ""
echo "Deploy complete."
if [[ -d "$PREV_DIR" ]]; then
  echo "Previous build kept at ${PREV_DIR} for rollback."
  echo "Rollback: rm -rf ${ACTIVE_DIR} && mv ${PREV_DIR} ${ACTIVE_DIR} && pm2 restart bernardbolter bernardbolter-worker --update-env"
fi
