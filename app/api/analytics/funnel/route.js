import { validateAnalyticsQuery } from "../../../../lib/api/request";
import { NextResponse } from "next/server";
import { getExperimentComparison, getFunnelStats } from "../../../../lib/analytics/eventStore";
import { requireAdminToken } from "../../../../lib/api/adminAuth";

const toDateText = (value) => {
  if (typeof value === "string") return value;
  return new Intl.DateTimeFormat("sv-SE", { timeZone: "Asia/Tokyo", year: "numeric", month: "2-digit", day: "2-digit" }).format(value);
};

export async function GET(request) {
  const unauthorized = requireAdminToken(request);
  if (unauthorized) return unauthorized;
  try { validateAnalyticsQuery(request.nextUrl.searchParams); }
  catch (error) { return NextResponse.json({ error: error.message }, { status: 400 }); }

  const dateFrom = toDateText(request.nextUrl.searchParams.get("date_from")) || toDateText(new Date());
  const dateTo = toDateText(request.nextUrl.searchParams.get("date_to")) || dateFrom;
  const experimentId = (request.nextUrl.searchParams.get("experiment_id") || "").trim();
  const variant = (request.nextUrl.searchParams.get("variant") || "").trim();
  const compare = (request.nextUrl.searchParams.get("compare") || "").trim() === "1";

  if (compare && experimentId && !variant) {
    const comparison = getExperimentComparison({ dateFrom, dateTo, experimentId });
    return NextResponse.json({ ok: true, comparison }, { status: 200 });
  }
  const stats = getFunnelStats({ dateFrom, dateTo, experimentId, variant });
  return NextResponse.json({ ok: true, stats }, { status: 200 });
}
