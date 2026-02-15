import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    if (!body?.event) {
      return NextResponse.json({ error: "event is required" }, { status: 400 });
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
