import { validateAnalyticsQuery } from "../../../../lib/api/request";
import { NextResponse } from "next/server";
import { getDailyDashboardStats } from "../../../../lib/analytics/eventStore";
import { requireAdminToken } from "../../../../lib/api/adminAuth";

export async function GET(request) {
  const unauthorized = requireAdminToken(request);
  if (unauthorized) return unauthorized;
  try { validateAnalyticsQuery(request.nextUrl.searchParams); }
  catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }

  const date = request.nextUrl.searchParams.get("date") || "";
  const experimentId = (request.nextUrl.searchParams.get("experiment_id") || "").trim();
  const variant = (request.nextUrl.searchParams.get("variant") || "").trim();
  const stats = getDailyDashboardStats(date, { experimentId, variant });
  return NextResponse.json({ ok: true, stats }, { status: 200 });
}
