#!/usr/bin/env bash
set -euo pipefail

CURRENT_FILE="${1:-}"
PREVIOUS_FILE="${2:-}"

if [ -z "${CURRENT_FILE}" ] || [ -z "${PREVIOUS_FILE}" ]; then
  echo "使い方: scripts/ops/weekly_kpi_diff.sh <current.json> <previous.json>"
  exit 1
fi

if [ ! -f "${CURRENT_FILE}" ] || [ ! -f "${PREVIOUS_FILE}" ]; then
  echo "指定したファイルが見つかりません。"
  exit 1
fi

node - "${CURRENT_FILE}" "${PREVIOUS_FILE}" <<'NODE'
const fs = require("fs");

const [currentFile, previousFile] = process.argv.slice(2);
const current = JSON.parse(fs.readFileSync(currentFile, "utf8"));
const previous = JSON.parse(fs.readFileSync(previousFile, "utf8"));

const keys = [
  "lp_to_draw",
  "draw_to_result",
  "result_to_premium_intro",
  "premium_intro_to_checkout",
  "checkout_to_purchase"
];

const curCv = current?.stats?.cv || current?.cv || {};
const prevCv = previous?.stats?.cv || previous?.cv || {};

console.log(`current: ${currentFile}`);
console.log(`previous: ${previousFile}`);

for (const key of keys) {
  const cur = Number(curCv[key] || 0);
  const prev = Number(prevCv[key] || 0);
  const diff = cur - prev;
  const sign = diff >= 0 ? "+" : "";
  console.log(`${key}: ${cur.toFixed(2)} (${sign}${diff.toFixed(2)} pt)`);
}
NODE
