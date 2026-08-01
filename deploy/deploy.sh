#!/usr/bin/env bash
# Deploy mnstr-dashboard to the Hetzner box. Encodes the recipe from CLAUDE.md
# with the guardrails that used to be convention only:
#   1. refuses to run from the wrong directory (rsync --delete footgun),
#   2. gates on the local predeploy check (typecheck + tests + build),
#   3. applies tracked migrations on the box (idempotent runner),
#   4. rebuilds remotely and reloads PM2.
#
# Usage: deploy/deploy.sh [--with-poller]
#   --with-poller  also restart mnstr-poller (indexer/script changes)

set -euo pipefail

HOST="root@178.105.127.121"
DEST="/opt/mnstr-dashboard"

cd "$(dirname "$0")/.."
grep -q '"name": "mnstr-dashboard"' package.json || {
  echo "deploy.sh: not in the mnstr-dashboard repo root — refusing to rsync --delete" >&2
  exit 1
}

echo "== local gate: typecheck + tests + build =="
npm run predeploy

echo "== rsync → $HOST:$DEST =="
rsync -az --delete \
  --exclude '.env' --exclude 'node_modules' --exclude '.next' \
  --exclude '.git' --exclude 'design' --exclude 'public/img-cache' \
  ./ "$HOST:$DEST/"

echo "== remote: install deps, migrate, build, reload =="
ssh "$HOST" "cd $DEST && npm install --no-audit --no-fund && npm run db:migrate && npm run build && pm2 reload mnstr-dashboard"

if [[ "${1:-}" == "--with-poller" ]]; then
  echo "== remote: restart poller =="
  ssh "$HOST" "pm2 restart mnstr-poller"
fi

echo "== done. verify: curl -s https://mnstr.watch/api/health =="
