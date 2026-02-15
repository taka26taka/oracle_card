import { EVENT_NAMES, PAGE_NAMES } from "./events";

const EVENT_NAME_SET = new Set(Object.values(EVENT_NAMES));
const PAGE_NAME_SET = new Set(Object.values(PAGE_NAMES));
const MAX_STRING_LENGTH = 300;
const MAX_META_KEYS = 20;

const isPlainObject = (value) => value && typeof value === "object" && !Array.isArray(value);

const sanitizeString = (value, max = MAX_STRING_LENGTH) => {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
};

const sanitizeMeta = (meta) => {
  if (!isPlainObject(meta)) return {};
  const cleaned = {};
  const keys = Object.keys(meta).slice(0, MAX_META_KEYS);

  for (const key of keys) {
    const safeKey = sanitizeString(key, 64);
    if (!safeKey) continue;
    const value = meta[key];
    if (value === null || typeof value === "boolean") {
      cleaned[safeKey] = value;
      continue;
    }
    if (typeof value === "number" && Number.isFinite(value)) {
      cleaned[safeKey] = value;
      continue;
    }
    if (typeof value === "string") {
      cleaned[safeKey] = sanitizeString(value, MAX_STRING_LENGTH);
    }
  }

  return cleaned;
};

const validateTimestamp = (ts) => {
  if (typeof ts !== "string" || !ts.trim()) return false;
  return !Number.isNaN(new Date(ts).getTime());
};

export const validateAndNormalizeEvent = (input) => {
  if (!isPlainObject(input)) return { ok: false, reason: "invalid_payload" };

  const event = sanitizeString(input.event, 80);
  if (!EVENT_NAME_SET.has(event)) return { ok: false, reason: "invalid_event_name" };

  const sessionId = sanitizeString(input.sessionId, 120) || "unknown";
  const ts = sanitizeString(input.ts, 64);
  if (!validateTimestamp(ts)) return { ok: false, reason: "invalid_ts" };

  const path = sanitizeString(input.path, 120);
  if (!path || !path.startsWith("/")) return { ok: false, reason: "invalid_path" };

  const normalized = {
    event,
    sessionId,
    ts,
    path,
    theme: sanitizeString(input.theme, 64),
    cardId: typeof input.cardId === "number" && Number.isFinite(input.cardId) ? input.cardId : null,
    meta: sanitizeMeta(input.meta)
  };

  if (event === EVENT_NAMES.PAGE_VIEW) {
    const page = sanitizeString(normalized.meta.page, 64).toLowerCase();
    if (!PAGE_NAME_SET.has(page)) return { ok: false, reason: "invalid_page_name" };
    normalized.meta.page = page;
  }

  if (
    event === EVENT_NAMES.PREMIUM_CHECKOUT_CLICKED ||
    event === EVENT_NAMES.PURCHASE_COMPLETED
  ) {
    const attemptId = sanitizeString(normalized.meta.attemptId, 120);
    if (!attemptId) return { ok: false, reason: "missing_attempt_id" };
    normalized.meta.attemptId = attemptId;
  }

  if (event === EVENT_NAMES.DIAGNOSIS_COMPLETED) {
    const diagnosisType = sanitizeString(input.diagnosisType, 64);
    if (!diagnosisType) return { ok: false, reason: "missing_diagnosis_type" };
    normalized.diagnosisType = diagnosisType;
  }

  if (event === EVENT_NAMES.THEME_SELECTED) {
    const theme = sanitizeString(input.theme, 64);
    if (!theme) return { ok: false, reason: "missing_theme" };
    normalized.theme = theme;
  }

  return { ok: true, value: normalized };
};
