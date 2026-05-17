#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3101}"
BASE_URL="http://127.0.0.1:${PORT}"
LOG_FILE="/tmp/oracle-card-integration-test.log"

cd "$(dirname "$0")/../.."

npm run dev -- --hostname 127.0.0.1 --port "${PORT}" > "${LOG_FILE}" 2>&1 &
DEV_PID=$!

cleanup() {
  if kill -0 "${DEV_PID}" >/dev/null 2>&1; then
    kill "${DEV_PID}" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

for _ in $(seq 1 120); do
  if curl -sS "${BASE_URL}" >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

if ! curl -sS "${BASE_URL}" >/dev/null 2>&1; then
  echo "dev server failed to start. see: ${LOG_FILE}"
  exit 1
fi

node scripts/tests/integration_smoke.mjs "${BASE_URL}"
