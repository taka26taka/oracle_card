import { NextResponse } from "next/server";
import { getDailyDashboardStats, recordEvent } from "../../../lib/analytics/eventStore";
import { validateAndNormalizeEvent } from "../../../lib/analytics/eventValidation";
import { requireAdminToken } from "../../../lib/api/adminAuth";
import { EVENT_NAMES } from "../../../lib/analytics/events";

const logEventApi = (level, message, details = {}) => {
  const payload = {
    at: "api/events",
    message,
    ...details
  };
  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }
  console.log(JSON.stringify(payload));
};

export async function GET(request) {
  const unauthorized = requireAdminToken(request);
  if (unauthorized) return unauthorized;

  const date = request.nextUrl.searchParams.get("date") || "";
  const stats = getDailyDashboardStats(date);
  return NextResponse.json({ ok: true, stats }, { status: 200 });
}

export async function POST(request) {
  try {
    const payload = await request.json();
    const validated = validateAndNormalizeEvent(payload);
    if (!validated.ok) {
      logEventApi("warn", "rejected_event_payload", { reason: validated.reason });
      return NextResponse.json({ error: validated.reason }, { status: 400 });
    }
    const body = validated.value;
    if (body.event === EVENT_NAMES.PURCHASE_SUCCESS) {
      logEventApi("warn", "forbidden_event_source", { event: body.event });
      return NextResponse.json({ error: "forbidden_event_source" }, { status: 403 });
    }

    const result = recordEvent(body);
    if (!result?.recorded && result?.reason === "invalid_payload") {
      logEventApi("warn", "failed_to_record_event", { reason: result.reason, event: body.event });
      return NextResponse.json({ error: "invalid_payload" }, { status: 400 });
    }
    if (!result?.recorded && result?.reason === "invalid_purchase_attempt") {
      logEventApi("warn", "rejected_purchase_attempt", {
        reason: result.reason,
        event: body.event,
        attemptId: body?.meta?.attemptId || ""
      });
      return NextResponse.json({ error: "invalid_purchase_attempt" }, { status: 400 });
    }
    if (!result?.recorded && result?.reason === "expired_purchase_attempt") {
      logEventApi("warn", "expired_purchase_attempt", {
        event: body.event,
        attemptId: body?.meta?.attemptId || ""
      });
      return NextResponse.json({ error: "expired_purchase_attempt" }, { status: 400 });
    }
    if (!result?.recorded && result?.reason === "invalid_purchase_session") {
      logEventApi("warn", "invalid_purchase_session", {
        event: body.event,
        attemptId: body?.meta?.attemptId || "",
        sessionId: body.sessionId
      });
      return NextResponse.json({ error: "invalid_purchase_session" }, { status: 400 });
    }
    if (!result?.recorded && result?.reason === "missing_purchase_success") {
      logEventApi("warn", "missing_purchase_success", {
        event: body.event,
        attemptId: body?.meta?.attemptId || "",
        sessionId: body.sessionId
      });
      return NextResponse.json({ error: "missing_purchase_success" }, { status: 400 });
    }
    if (!result?.recorded && result?.reason === "duplicate_purchase_attempt") {
      logEventApi("info", "duplicate_purchase_attempt", {
        event: body.event,
        attemptId: body?.meta?.attemptId || ""
      });
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    if (!result?.recorded) {
      logEventApi("warn", "failed_to_record_event", {
        reason: result?.reason || "unknown",
        event: body.event
      });
      return NextResponse.json({ error: result?.reason || "failed_to_record_event" }, { status: 400 });
    }

    logEventApi("info", "event_recorded", {
      event: body.event,
      sessionId: body.sessionId,
      ts: body.ts,
      path: body.path,
      theme: body.theme,
      cardId: body.cardId,
      meta: body.meta || null
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logEventApi("error", "failed_to_record_event", {
      reason: "failed_to_record_event",
      errorMessage: error instanceof Error ? error.message : "unknown_error"
    });
    return NextResponse.json({ error: "failed_to_record_event" }, { status: 500 });
  }
}
