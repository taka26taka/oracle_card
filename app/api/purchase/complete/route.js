import { NextResponse } from "next/server";
import { recordEvent } from "../../../../lib/analytics/eventStore";

export async function POST(request) {
  try {
    const body = await request.json();
    const attemptId = body?.attemptId || "";
    if (!attemptId) {
      return NextResponse.json({ error: "attemptId is required" }, { status: 400 });
    }

    const eventBody = {
      event: "purchase_completed",
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
    const result = recordEvent(eventBody);
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
