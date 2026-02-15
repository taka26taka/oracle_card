import { getSessionState } from "../session/oracleSession";

export const trackEvent = async (event, payload = {}) => {
  if (typeof window === "undefined") return;

  const sessionId = getSessionState()?.sessionId || "unknown";
  const body = {
    event,
    sessionId,
    ts: new Date().toISOString(),
    path: window.location.pathname,
    ...payload
  };

  try {
    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body)
    });
  } catch {
    // ignore event failures to keep UX fast
  }
};
