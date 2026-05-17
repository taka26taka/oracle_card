#!/usr/bin/env bash
set -euo pipefail

BASE_URL="${1:-http://127.0.0.1:3000}"
DATE_KEY="${2:-$(date +%F)}"
TOKEN="${ANALYTICS_ADMIN_TOKEN:-${3:-}}"

if [ -z "${TOKEN}" ]; then
  echo "ANALYTICS_ADMIN_TOKEN が未設定です。"
  echo "使い方: ANALYTICS_ADMIN_TOKEN=xxx scripts/ops/save_daily_kpi.sh [BASE_URL] [YYYY-MM-DD]"
  exit 1
fi

OUT_DIR="logs/kpi/daily"
OUT_FILE="${OUT_DIR}/${DATE_KEY}.json"
mkdir -p "${OUT_DIR}"

curl -sS -H "x-admin-token: ${TOKEN}" \
  "${BASE_URL}/api/analytics/daily?date=${DATE_KEY}" \
  > "${OUT_FILE}"

echo "saved: ${OUT_FILE}"
