import { normalizeDiagnosisType } from "../domain/diagnosis.js";
import { calendarDay } from "../domain/calendar.js";

const STORAGE_KEY = "oracle_session_v1";

const createSessionId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const createAttemptId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return `attempt_${crypto.randomUUID()}`;
  return `attempt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

export const getToday = (now = new Date()) => {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

let memoryState = null;
let storageUnavailable = false;

const readRaw = () => {
  if (typeof window === "undefined") return null;
  try {
    if (storageUnavailable) return memoryState;
    const text = window.localStorage.getItem(STORAGE_KEY);
    return text ? JSON.parse(text) : null;
  } catch {
    storageUnavailable = true;
    return memoryState;
  }
};

const writeRaw = (state) => {
  if (typeof window === "undefined") return;
  memoryState = state;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    storageUnavailable = false;
  } catch {
    storageUnavailable = true;
  }
};

const isObject = (value) => value !== null && typeof value === "object" && !Array.isArray(value);
const count = (value, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= 0 ? Math.min(value, max) : 0;

/** Migrate v1 fields without trusting storage as proof of purchase. */
export const normalizeState = (state) => {
  if (!isObject(state)) return null;
  const diagnosisType = normalizeDiagnosisType(state.diagnosisType) || normalizeDiagnosisType(state.selectedTheme);
  const initial = getInitialState();
  const candidate = isObject(state.lastResult) && isObject(state.lastResult.card)
    && Number.isInteger(state.lastResult.card.id) && typeof state.lastResult.card.name === "string"
    && typeof state.lastResult.message === "string" ? state.lastResult : null;
  const result = candidate ? { ...candidate,
    diagnosisType: normalizeDiagnosisType(candidate.diagnosisType) || diagnosisType,
    theme: normalizeDiagnosisType(candidate.theme) || diagnosisType,
    ...Object.fromEntries(["title", "actionTip", "afterglowLine", "projectionPrompt", "deepMessage", "deepFocus"].map((key) =>
      [key, typeof candidate[key] === "string" ? candidate[key] : ""]))
  } : null;
  return {
    ...initial,
    sessionId: typeof state.sessionId === "string" && state.sessionId.length > 0 && state.sessionId.length <= 120
      ? state.sessionId : initial.sessionId,
    diagnosisType,
    selectedTheme: diagnosisType,
    premiumIntent: state.premiumIntent === true,
    experimentContext: isObject(state.experimentContext) ? state.experimentContext : null,
    premiumAccess: isObject(state.premiumAccess) && typeof state.premiumAccess.attemptId === "string" ? state.premiumAccess : null,
    checkoutAttempt: isObject(state.checkoutAttempt) && typeof state.checkoutAttempt.attemptId === "string" ? state.checkoutAttempt : null,
    threeCardResult: isObject(state.threeCardResult) && Array.isArray(state.threeCardResult.cards)
      && state.threeCardResult.cards.length === 3 && state.threeCardResult.cards.every((item) =>
        isObject(item) && isObject(item.card) && typeof item.card.name === "string" && typeof item.message === "string")
      ? state.threeCardResult : null,
    visitCount: count(state.visitCount),
    streakDays: count(state.streakDays),
    lastVisitDate: calendarDay(state.lastVisitDate) !== null ? state.lastVisitDate : "",
    deepCount: count(state.deepCount, 2),
    lastResult: result
  };
};

const getInitialState = () => ({
  sessionId: createSessionId(),
  diagnosisType: "",
  selectedTheme: "",
  premiumIntent: false,
  experimentContext: null,
  premiumAccess: null,
  threeCardResult: null,
  visitCount: 0,
  streakDays: 0,
  lastVisitDate: "",
  checkoutAttempt: null,
  deepCount: 0,
  lastResult: null
});

export const getSessionState = () => {
  const state = normalizeState(readRaw()) || getInitialState();
  writeRaw(state);
  return state;
};

export const advanceVisit = (base, today) => {
  const lastVisit = calendarDay(base.lastVisitDate);
  const current = calendarDay(today);
  const diffDays = lastVisit !== null && current !== null ? current - lastVisit : null;
  const isSameDay = diffDays === 0;
  const isRevisit = diffDays !== null && diffDays >= 1;

  const nextState = {
    ...base,
    visitCount: isSameDay ? base.visitCount : (base.visitCount || 0) + 1,
    streakDays:
      diffDays === 1
        ? (base.streakDays || 0) + 1
        : isSameDay
          ? base.streakDays || 1
          : 1,
    lastVisitDate: today
  };

  return {
    ...nextState,
    revisitInfo: {
      isRevisit,
      daysSinceLastVisit: diffDays,
      streakDays: nextState.streakDays
    }
  };
};

export const ensureSession = () => {
  const { revisitInfo, ...state } = advanceVisit(getSessionState(), getToday());
  writeRaw(state);
  return { ...state, revisitInfo };
};

export const setSelectedTheme = (theme) => {
  return setDiagnosisType(theme);
};

export const resetSelectedTheme = () => setSelectedTheme("");

export const setDiagnosisType = (value) => {
  const diagnosisType = normalizeDiagnosisType(value);
  const prev = getSessionState();
  const next = { ...prev, diagnosisType, selectedTheme: diagnosisType };
  writeRaw(next);
  return next;
};

export const resetDiagnosisType = () => setDiagnosisType("");

export const setPremiumIntent = (premiumIntent) => {
  const prev = getSessionState();
  const next = { ...prev, premiumIntent };
  writeRaw(next);
  return next;
};

export const setExperimentContext = (experimentContext) => {
  const prev = getSessionState();
  const next = { ...prev, experimentContext };
  writeRaw(next);
  return next;
};

export const clearExperimentContext = () => setExperimentContext(null);

export const grantPremiumAccess = ({ attemptId, source = "unknown" }) => {
  const prev = getSessionState();
  const premiumAccess = {
    attemptId,
    source,
    grantedAt: new Date().toISOString()
  };
  const next = { ...prev, premiumAccess };
  writeRaw(next);
  return next;
};

export const clearPremiumAccess = () => {
  const prev = getSessionState();
  const next = { ...prev, premiumAccess: null };
  writeRaw(next);
  return next;
};

export const setThreeCardResult = (threeCardResult) => {
  const prev = getSessionState();
  const next = { ...prev, threeCardResult };
  writeRaw(next);
  return next;
};

export const resetPremiumState = () => {
  const prev = getSessionState();
  const next = { ...prev, premiumIntent: false, premiumAccess: null, threeCardResult: null };
  writeRaw(next);
  return next;
};

export const setLastResult = (result) => {
  const prev = getSessionState();
  const next = { ...prev, lastResult: result, deepCount: 0 };
  writeRaw(next);
  return next;
};

export const setDeepResult = ({ deepMessage, deepFocus }) => {
  const prev = getSessionState();
  const next = {
    ...prev,
    deepCount: Math.min(2, (prev.deepCount || 0) + 1),
    lastResult: prev.lastResult
      ? {
          ...prev.lastResult,
          deepMessage,
          deepFocus
        }
      : prev.lastResult
  };
  writeRaw(next);
  return next;
};

export const startCheckoutAttempt = (source = "premium_intro") => {
  const prev = getSessionState();
  const checkoutAttempt = {
    attemptId: createAttemptId(),
    source,
    createdAt: new Date().toISOString()
  };
  const next = { ...prev, checkoutAttempt };
  writeRaw(next);
  return next;
};

export const clearCheckoutAttempt = () => {
  const prev = getSessionState();
  const next = { ...prev, checkoutAttempt: null };
  writeRaw(next);
  return next;
};
