import { NextResponse } from "next/server";
import { recordEvent } from "../../../../lib/analytics/eventStore";
import { EVENT_NAMES } from "../../../../lib/analytics/events";
import { validateAndNormalizeEvent } from "../../../../lib/analytics/eventValidation";

const logPurchaseApi = (level, message, details = {}) => {
  const payload = {
    at: "api/purchase/complete",
    message,
    ...details
  };
  if (level === "error") {
    console.error(JSON.stringify(payload));
    return;
  }
  console.log(JSON.stringify(payload));
};

export async function POST(request) {
  try {
    const body = await request.json();
    const attemptId = body?.attemptId || "";
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    if (!attemptId) {
      logPurchaseApi("warn", "missing_attempt_id");
      return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
    }
    if (!sessionId) {
      logPurchaseApi("warn", "missing_session_id", { attemptId });
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }

    const eventBody = {
      event: EVENT_NAMES.PURCHASE_COMPLETED,
      sessionId,
      ts: new Date().toISOString(),
      path: "/premium/complete",
      theme: body?.theme || "",
      cardId: body?.cardId || null,
      meta: {
        attemptId,
        diagnosisType: body?.diagnosisType || "",
        price: body?.price || "",
        source: body?.source || "note"
      }
    };
    const validated = validateAndNormalizeEvent(eventBody);
    if (!validated.ok) {
      logPurchaseApi("warn", "invalid_purchase_payload", { reason: validated.reason, attemptId });
      return NextResponse.json({ error: validated.reason }, { status: 400 });
    }

    const result = recordEvent(validated.value);
    if (!result?.recorded && result?.reason === "duplicate_purchase_attempt") {
      logPurchaseApi("info", "duplicate_purchase_attempt", { attemptId });
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    if (!result?.recorded && result?.reason === "invalid_purchase_attempt") {
      logPurchaseApi("warn", "invalid_purchase_attempt", { attemptId });
      return NextResponse.json({ error: "invalid_purchase_attempt" }, { status: 400 });
    }
    if (!result?.recorded && result?.reason === "invalid_purchase_session") {
      logPurchaseApi("warn", "invalid_purchase_session", { attemptId, sessionId });
      return NextResponse.json({ error: "invalid_purchase_session" }, { status: 400 });
    }
    if (!result?.recorded && result?.reason === "missing_purchase_success") {
      logPurchaseApi("warn", "missing_purchase_success", { attemptId, sessionId });
      return NextResponse.json({ error: "missing_purchase_success" }, { status: 400 });
    }
    if (!result?.recorded && result?.reason === "expired_purchase_attempt") {
      logPurchaseApi("warn", "expired_purchase_attempt", { attemptId });
      return NextResponse.json({ error: "expired_purchase_attempt" }, { status: 400 });
    }
    if (!result?.recorded) {
      logPurchaseApi("warn", "failed_to_record_purchase", { reason: result?.reason || "unknown", attemptId });
      return NextResponse.json({ error: "failed_to_record_purchase" }, { status: 400 });
    }

    logPurchaseApi("info", "purchase_completed_recorded", { attemptId });
    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    logPurchaseApi("error", "invalid_request", {
      errorMessage: error instanceof Error ? error.message : "unknown_error"
    });
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
