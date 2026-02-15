const STORAGE_KEY = "oracle_session_v1";

const DAY_MS = 24 * 60 * 60 * 1000;

const createSessionId = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return `s_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
};

const getToday = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

const parseDate = (dateText) => {
  if (!dateText) return null;
  const parsed = new Date(`${dateText}T00:00:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const readRaw = () => {
  if (typeof window === "undefined") return null;
  try {
    const text = window.localStorage.getItem(STORAGE_KEY);
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
};

const writeRaw = (state) => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
};

const getInitialState = () => ({
  sessionId: createSessionId(),
  selectedTheme: "",
  diagnosisType: "",
  visitCount: 0,
  streakDays: 0,
  lastVisitDate: "",
  deepCount: 0,
  lastResult: null
});

export const getSessionState = () => readRaw() || getInitialState();

export const ensureSession = () => {
  const base = readRaw() || getInitialState();
  const today = getToday();
  const lastVisit = parseDate(base.lastVisitDate);
  const current = parseDate(today);
  const diffDays = lastVisit && current ? Math.floor((current.getTime() - lastVisit.getTime()) / DAY_MS) : null;
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

  writeRaw(nextState);
  return {
    ...nextState,
    revisitInfo: {
      isRevisit,
      daysSinceLastVisit: diffDays,
      streakDays: nextState.streakDays
    }
  };
};

export const setSelectedTheme = (theme) => {
  const prev = getSessionState();
  const next = { ...prev, selectedTheme: theme };
  writeRaw(next);
  return next;
};

export const resetSelectedTheme = () => setSelectedTheme("");

export const setDiagnosisType = (diagnosisType) => {
  const prev = getSessionState();
  const next = { ...prev, diagnosisType };
  writeRaw(next);
  return next;
};

export const resetDiagnosisType = () => setDiagnosisType("");

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
