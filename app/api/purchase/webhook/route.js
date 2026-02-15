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
    const body = await request.json();
    const attemptId = typeof body?.attemptId === "string" ? body.attemptId.trim() : "";
    if (!attemptId) {
      return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
    }

    const eventBody = {
      event: EVENT_NAMES.PURCHASE_COMPLETED,
      sessionId: body?.sessionId || "unknown",
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
        amount: Number.isFinite(body?.amount) ? body.amount : undefined
      }
    };

    const validated = validateAndNormalizeEvent(eventBody);
    if (!validated.ok) {
      return NextResponse.json({ error: validated.reason }, { status: 400 });
    }

    const result = recordEvent(validated.value);
    if (!result?.recorded && result?.reason === "duplicate_purchase_attempt") {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    if (!result?.recorded) {
      return NextResponse.json({ error: result?.reason || "failed_to_record_purchase" }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
