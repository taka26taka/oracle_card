import { getSessionState } from "../session/oracleSession";

const isDebugEnabled = () =>
  typeof process !== "undefined" &&
  process?.env?.NEXT_PUBLIC_ANALYTICS_DEBUG === "1";

export const trackEvent = async (event, payload = {}) => {
  if (typeof window === "undefined") return;

  const session = getSessionState();
  const sessionId = session?.sessionId || "unknown";
  const experimentMeta =
    session?.experimentContext?.enabled &&
    session?.experimentContext?.experimentId &&
    session?.experimentContext?.variant
      ? {
          experiment_id: session.experimentContext.experimentId,
          variant: session.experimentContext.variant
        }
      : {};
  const payloadMeta = payload?.meta && typeof payload.meta === "object" ? payload.meta : {};
  const body = {
    event,
    sessionId,
    ts: new Date().toISOString(),
    path: window.location.pathname,
    ...payload,
    meta: {
      ...experimentMeta,
      ...payloadMeta
    }
  };
  const serialized = JSON.stringify(body);

  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([serialized], { type: "application/json" });
      if (navigator.sendBeacon("/api/events", blob)) {
        if (isDebugEnabled()) {
          console.info("[analytics] beacon_sent", { event, path: body.path });
        }
        return;
      }
    }

    const res = await fetch("/api/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: serialized,
      keepalive: true
    });
    if (!res.ok && isDebugEnabled()) {
      console.warn("[analytics] event_rejected", { event, status: res.status });
    }
  } catch {
    if (isDebugEnabled()) {
      console.error("[analytics] event_send_failed", { event });
    }
  }
};
