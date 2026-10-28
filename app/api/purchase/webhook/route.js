import { RequestError, readJson, validatePurchase } from "../../../../lib/api/request";
import { NextResponse } from "next/server";
import { recordEvent } from "../../../../lib/analytics/eventStore";
import { EVENT_NAMES } from "../../../../lib/analytics/events";
import { validateAndNormalizeEvent } from "../../../../lib/analytics/eventValidation";

const isAuthorized = (request) => {
  const expected = (process.env.PURCHASE_WEBHOOK_TOKEN || "").trim();
  if (!expected) return false;
  const actual = (request.headers.get("x-webhook-token") || "").trim();
  return actual === expected;
};

export async function POST(request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const body = await readJson(request);
    validatePurchase(body);
    const attemptId = typeof body?.attemptId === "string" ? body.attemptId.trim() : "";
    const sessionId = typeof body?.sessionId === "string" ? body.sessionId.trim() : "";
    const success = body?.success === true;
    if (!attemptId) {
      return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
    }
    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required" }, { status: 400 });
    }
    if (!success) {
      return NextResponse.json({ error: "success flag is required" }, { status: 400 });
    }

    const eventBody = {
      event: EVENT_NAMES.PURCHASE_SUCCESS,
      sessionId,
      ts: new Date().toISOString(),
      path: "/api/purchase/webhook",
      theme: body?.theme || "",
      cardId: Number.isFinite(body?.cardId) ? body.cardId : null,
      meta: {
        attemptId,
        diagnosisType: body?.diagnosisType || "",
        source: "webhook",
        provider: body?.provider || "",
        externalOrderId: body?.externalOrderId || "",
        amount: Number.isFinite(body?.amount) ? body.amount : undefined,
        success: true
      }
    };

    const validated = validateAndNormalizeEvent(eventBody);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.reason }, { status: 400 });
    }

    const result = recordEvent(validated.value);
    if (!result?.recorded && result?.reason === "duplicate_purchase_success") {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    if (!result?.recorded) {
      return NextResponse.json({ error: result?.reason || "failed_to_record_purchase" }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof RequestError) return NextResponse.json({ error: error.message }, { status: error.status });
    return NextResponse.json({ error: "internal_error" }, { status: 500 });
  }
}
