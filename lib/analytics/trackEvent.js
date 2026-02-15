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
  const serialized = JSON.stringify(body);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([serialized], { type: "application/json" });
      if (navigator.sendBeacon("/api/events", blob)) return;
    }

    await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: serialized,
      keepalive: true
    });
  } catch {
    // ignore event failures to keep UX fast
  }
};
