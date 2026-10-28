#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3101}"
BASE_URL="http://127.0.0.1:${PORT}"
TEST_DIR="$(mktemp -d /tmp/oracle-card-integration.XXXXXX)"
LOG_FILE="${TEST_DIR}/server.log"
# Never use real credentials or production analytics data in tests.
export OPENAI_API_KEY=""
export EVENT_DB_PATH="${TEST_DIR}/events.sqlite"
export ANALYTICS_ADMIN_TOKEN="integration-admin-token"
export PURCHASE_WEBHOOK_TOKEN="integration-webhook-token"

cd "$(dirname "$0")/../.."

npm run dev -- --hostname 127.0.0.1 --port "${PORT}" > "${LOG_FILE}" 2>&1 &
DEV_PID=$!

cleanup() {
  if kill -0 "${DEV_PID}" >/dev/null 2>&1; then
    kill "${DEV_PID}" >/dev/null 2>&1 || true
  fi
  if [[ "${KEEP_TEST_ARTIFACTS:-0}" != "1" ]]; then rm -rf -- "${TEST_DIR}"; fi
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
