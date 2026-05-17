import { NextResponse } from "next/server";
import { getExperimentComparison, getFunnelStats } from "../../../../lib/analytics/eventStore";
import { requireAdminToken } from "../../../../lib/api/adminAuth";

const toDateText = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

export async function GET(request) {
  const unauthorized = requireAdminToken(request);
  if (unauthorized) return unauthorized;

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
