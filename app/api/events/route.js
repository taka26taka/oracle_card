import { NextResponse } from "next/server";
import { getDailyDashboardStats, recordEvent } from "../../../lib/analytics/eventStore";

export async function GET(request) {
  const date = request.nextUrl.searchParams.get("date") || "";
  const stats = getDailyDashboardStats(date);
  return NextResponse.json({ ok: true, stats }, { status: 200 });
}

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body?.event) {
      return NextResponse.json({ error: "event is required" }, { status: 400 });
    }

    const result = recordEvent(body);
    if (!result?.recorded && result?.reason === "invalid_event") {
      return NextResponse.json({ error: "invalid_event" }, { status: 400 });
    }
    if (!result?.recorded && result?.reason === "invalid_purchase_attempt") {
      return NextResponse.json({ error: "invalid_purchase_attempt" }, { status: 400 });
    }
    if (!result?.recorded && result?.reason === "duplicate_purchase_attempt") {
      return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
    }

    console.log("[event]", {
      event: body.event,
      sessionId: body.sessionId,
      ts: body.ts,
      path: body.path,
      theme: body.theme,
      cardId: body.cardId,
      meta: body.meta || null
    });

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch {
    return NextResponse.json({ error: "failed_to_record_event" }, { status: 500 });
  }
}
