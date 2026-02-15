import { NextResponse } from "next/server";
import { getDailyDashboardStats } from "../../../../lib/analytics/eventStore";

export async function GET(request) {
  const date = request.nextUrl.searchParams.get("date") || "";
  const experimentId = (request.nextUrl.searchParams.get("experiment_id") || "").trim();
  const variant = (request.nextUrl.searchParams.get("variant") || "").trim();
  const stats = getDailyDashboardStats(date, { experimentId, variant });
  return NextResponse.json({ ok: true, stats }, { status: 200 });
}
