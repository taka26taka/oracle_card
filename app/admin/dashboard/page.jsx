"use client";

import { useEffect, useMemo, useState } from "react";

const toDateKey = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "";
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const metricLabels = {
  page_view_lp: "page_view(lp)",
  draw_completed: "draw_completed",
  result_viewed: "result_viewed",
  share_clicked: "share_clicked",
  note_click: "note_click",
  purchase_completed: "purchase_completed"
};

export default function AdminDashboardPage() {
  const [date, setDate] = useState(toDateKey());
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;

    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/events?date=${encodeURIComponent(date)}`, { cache: "no-store" });
        const data = await res.json();
        if (!active) return;
        setStats(data?.stats || null);
      } catch {
        if (!active) return;
        setStats(null);
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [date]);

  const rows = useMemo(() => {
    if (!stats?.counts) return [];
    return Object.keys(metricLabels).map((key) => ({ key, label: metricLabels[key], value: stats.counts[key] || 0 }));
  }, [stats]);

  return (
    <main className="min-h-dvh px-4 py-8">
      <section className="mx-auto w-full max-w-2xl rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs tracking-[0.2em] text-slate-500">ADMIN</p>
            <h1 className="mt-1 text-xl font-semibold text-slate-800">Dashboard</h1>
          </div>
          <label className="text-sm text-slate-600">
            日付
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value || toDateKey())}
              className="ml-2 rounded-lg border border-slate-200 px-2 py-1 text-sm text-slate-700"
            />
          </label>
        </header>

        {loading ? (
          <p className="text-sm text-slate-500">集計中...</p>
        ) : (
          <>
            <div className="grid gap-2">
              {rows.map((row) => (
                <div key={row.key} className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/70 px-3 py-2">
                  <span className="text-sm text-slate-600">{row.label}</span>
                  <span className="text-sm font-medium text-slate-800">{row.value}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 grid gap-2">
              <div className="flex items-center justify-between rounded-lg border border-rose-100 bg-rose-50/60 px-3 py-2">
                <span className="text-sm text-slate-700">CV: result→note</span>
                <span className="text-sm font-semibold text-slate-800">{stats?.cv?.result_to_note ?? 0}%</span>
              </div>
              <div className="flex items-center justify-between rounded-lg border border-amber-100 bg-amber-50/60 px-3 py-2">
                <span className="text-sm text-slate-700">CV: note→purchase</span>
                <span className="text-sm font-semibold text-slate-800">{stats?.cv?.note_to_purchase ?? 0}%</span>
              </div>
            </div>
          </>
        )}
      </section>
    </main>
  );
}
