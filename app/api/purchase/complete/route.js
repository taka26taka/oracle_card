import { NextResponse } from "next/server";
import { recordEvent } from "../../../../lib/analytics/eventStore";
import { EVENT_NAMES } from "../../../../lib/analytics/events";
import { validateAndNormalizeEvent } from "../../../../lib/analytics/eventValidation";

export async function POST(request) {
  try {
    const body = await request.json();
    const attemptId = body?.attemptId || "";
    if (!attemptId) {
      return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
    }

    const eventBody = {
      event: EVENT_NAMES.PURCHASE_COMPLETED,
      sessionId: body?.sessionId || "unknown",
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
      return NextResponse.json({ error: validated.reason }, { status: 400 });
    }

    const result = recordEvent(validated.value);
    if (!result?.recorded && result?.reason === "duplicate_purchase_attempt") {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }
    if (!result?.recorded && result?.reason === "invalid_purchase_attempt") {
      return NextResponse.json({ error: "invalid_purchase_attempt" }, { status: 400 });
    }
    if (!result?.recorded) {
      return NextResponse.json({ error: "failed_to_record_purchase" }, { status: 400 });
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "invalid_request" }, { status: 400 });
  }
}
