import { NextResponse } from "next/server";
import { getDailyDashboardStats, recordEvent } from "../../../lib/analytics/eventStore";
import { validateAndNormalizeEvent } from "../../../lib/analytics/eventValidation";

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
    if (!result?.recorded && result?.reason === "duplicate_purchase_attempt") {
      logEventApi("info", "duplicate_purchase_attempt", {
        event: body.event,
        attemptId: body?.meta?.attemptId || ""
      });
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
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
