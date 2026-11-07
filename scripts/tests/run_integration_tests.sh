#!/usr/bin/env bash
set -euo pipefail

PORT="${1:-3101}"
HOST="127.0.0.1"
BASE_URL="http://${HOST}:${PORT}"
TEST_DIR="$(mktemp -d /tmp/oracle-card-integration.XXXXXX)"
LOG_FILE="${TEST_DIR}/server.log"
DEV_PID=""
# Never use real credentials or production analytics data in tests.
export OPENAI_API_KEY=""
export EVENT_DB_PATH="${TEST_DIR}/events.sqlite"
export ANALYTICS_ADMIN_TOKEN="integration-admin-token"
export PURCHASE_WEBHOOK_TOKEN="integration-webhook-token"

cd "$(dirname "$0")/../.."

# The dev server runs in its own process group (DEV_PID is the group id),
# so cleanup can stop npm and the next-server child it spawns together.
server_running() {
  [[ -n "${DEV_PID}" ]] && kill -0 -- "-${DEV_PID}" >/dev/null 2>&1
}

stop_server() {
  server_running || return 0
  kill -TERM -- "-${DEV_PID}" >/dev/null 2>&1 || true
  for _ in $(seq 1 20); do
    server_running || return 0
    sleep 0.5
  done
  kill -KILL -- "-${DEV_PID}" >/dev/null 2>&1 || true
}

cleanup() {
  local status=$?
  stop_server
  if [[ "${status}" -ne 0 && -s "${LOG_FILE}" ]]; then
    echo "--- dev server log (last 50 lines) ---"
    tail -n 50 "${LOG_FILE}"
    echo "--- end of dev server log ---"
  fi
  if [[ "${KEEP_TEST_ARTIFACTS:-0}" == "1" ]]; then
    echo "test artifacts kept: ${TEST_DIR}"
  else
    rm -rf -- "${TEST_DIR}"
  fi
  exit "${status}"
}
trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

# A server left on the port would answer instead of ours, so refuse to run.
if (exec 3<>"/dev/tcp/${HOST}/${PORT}") >/dev/null 2>&1; then
  echo "port ${PORT} is already in use. stop the process on it first (e.g. ss -ltnp | grep ${PORT})." >&2
  exit 1
fi

set -m
npm run dev -- --hostname "${HOST}" --port "${PORT}" > "${LOG_FILE}" 2>&1 &
DEV_PID=$!
set +m

for _ in $(seq 1 120); do
  if curl -sS "${BASE_URL}" >/dev/null 2>&1; then
    break
  fi
  server_running || break
  sleep 1
done

if ! curl -sS "${BASE_URL}" >/dev/null 2>&1; then
  echo "dev server failed to start."
  exit 1
fi

node scripts/tests/integration_smoke.mjs "${BASE_URL}"
