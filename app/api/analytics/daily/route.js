import { NextResponse } from "next/server";
import { getDailyDashboardStats } from "../../../../lib/analytics/eventStore";

export async function GET(request) {
  const date = request.nextUrl.searchParams.get("date") || "";
  const stats = getDailyDashboardStats(date);
  return NextResponse.json({ ok: true, stats }, { status: 200 });
}
