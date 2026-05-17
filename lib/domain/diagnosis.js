export const DIAGNOSIS_TYPES = [
  "mutual",
  "waiting_love",
  "waiting_contact",
  "unrequited",
  "reconciliation"
];

const TYPE_SET = new Set(DIAGNOSIS_TYPES);

export const isDiagnosisType = (value) => TYPE_SET.has(value);

export const normalizeDiagnosisType = (value, fallback = "") => {
  if (typeof value !== "string") return fallback;
  const cleaned = value.trim();
  if (isDiagnosisType(cleaned)) return cleaned;
  return fallback;
};
