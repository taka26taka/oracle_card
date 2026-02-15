"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ensureSession,
  resetDiagnosisType,
  resetSelectedTheme,
  setDiagnosisType,
  setSelectedTheme
} from "../lib/session/oracleSession";
import { trackEvent } from "../lib/analytics/trackEvent";

export default function Home() {
  const router = useRouter();
  const [diagnosisType, setDiagnosis] = useState("");
  const diagnosisOptions = useMemo(
    () => [
      { key: "mutual", label: "通じ合ってる気がする（両想い）", hashTag: "#両想い" },
      { key: "unrequited", label: "片思い", hashTag: "#片思い" },
      { key: "reconciliation", label: "復縁したい", hashTag: "#復縁したい" },
      { key: "waiting_contact", label: "連絡が来ない", hashTag: "#連絡待ち" }
    ],
    []
  );

  useEffect(() => {
    const session = ensureSession();
    resetDiagnosisType();
    resetSelectedTheme();
    setDiagnosis("");
    trackEvent("page_view", { meta: { page: "lp" } });

    const revisitInfo = session?.revisitInfo;
    if (revisitInfo?.isRevisit) {
      trackEvent("revisit_detected", {
        daysSinceLastVisit: revisitInfo.daysSinceLastVisit,
        streakDays: revisitInfo.streakDays
      });
    }
  }, []);

  const handleDiagnosisSelect = (nextDiagnosisType) => {
    setDiagnosis(nextDiagnosisType);
    setDiagnosisType(nextDiagnosisType);
    setSelectedTheme(nextDiagnosisType);
    trackEvent("theme_selected", { theme: nextDiagnosisType });
  };

  const goDraw = () => {
    if (!diagnosisType) return;
    trackEvent("diagnosis_completed", { diagnosisType });
    router.push(`/draw?diagnosisType=${encodeURIComponent(diagnosisType)}`);
  };

  const activeDiagnosisLabel = diagnosisOptions.find((item) => item.key === diagnosisType)?.label || "";

  return (
    <main className="min-h-dvh px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(1.4rem+env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md space-y-6">
        <section className="overflow-hidden rounded-[2rem] border border-rose-100/70 bg-white/90 p-6 shadow-[0_24px_64px_rgba(148,163,184,0.22)]">
          <p className="text-center text-[0.68rem] tracking-[0.28em] text-slate-500">MOONLIGHT ORACLE</p>
          <h1 className="mt-3 text-center font-serif-jp text-[1.9rem] leading-tight text-slate-800">今夜の恋を、1枚で読む</h1>
          <p className="mx-auto mt-3 max-w-[18rem] text-center text-sm leading-7 text-slate-600">
            無料で1枚。あなたの今の恋愛状態に合わせて、核心と次の行動を返します。
          </p>

          <div className="mt-5 grid gap-2">
            {diagnosisOptions.map((item) => {
              const active = diagnosisType === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    active
                      ? "border-rose-300 bg-rose-50 text-slate-700 shadow-[0_8px_22px_rgba(251,113,133,0.18)]"
                      : "border-slate-200 bg-white text-slate-600"
                  }`}
                  onClick={() => handleDiagnosisSelect(item.key)}
                >
                  <span className="block text-[0.96rem] font-medium">{item.label}</span>
                  <span className="mt-1 block text-xs text-slate-500">{item.hashTag}</span>
                </button>
              );
            })}
          </div>

          <button
            type="button"
            className={`mt-5 w-full rounded-full px-6 py-4 text-[0.98rem] font-medium transition ${
              diagnosisType
                ? "border border-rose-200/70 bg-gradient-to-r from-rose-100 via-white to-amber-100 text-slate-700 shadow-[0_12px_28px_rgba(148,163,184,0.2)] active:scale-[0.99]"
                : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
            }`}
            onClick={goDraw}
            disabled={!diagnosisType}
          >
            無料で1枚引く
          </button>
          {activeDiagnosisLabel && <p className="mt-2 text-center text-xs text-slate-500">選択中: {activeDiagnosisLabel}</p>}
        </section>

        <section className="rounded-[1.7rem] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(148,163,184,0.14)]">
          <h2 className="font-serif-jp text-xl text-slate-800">こんな夜に読まれています</h2>
          <div className="mt-3 grid gap-2 text-sm text-slate-600">
            <p className="rounded-xl bg-slate-50 px-3 py-2">未読が続いて、追うべきか迷う</p>
            <p className="rounded-xl bg-slate-50 px-3 py-2">両想いっぽいのに、確信が持てない</p>
            <p className="rounded-xl bg-slate-50 px-3 py-2">復縁したいけど、連絡の温度が読めない</p>
          </div>
        </section>

        <section className="rounded-[1.7rem] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(148,163,184,0.14)]">
          <h2 className="font-serif-jp text-xl text-slate-800">無料1枚で分かること</h2>
          <div className="mt-3 space-y-2 text-sm text-slate-600">
            <p className="rounded-xl border border-rose-100 bg-rose-50/45 px-3 py-2">1. いまの関係で起きている核心</p>
            <p className="rounded-xl border border-amber-100 bg-amber-50/45 px-3 py-2">2. 今夜か明日に取るべき行動</p>
            <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">3. Xに貼れる1行要約</p>
          </div>
        </section>

        <section className="rounded-[1.7rem] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(148,163,184,0.14)]">
          <h2 className="font-serif-jp text-xl text-slate-800">結果サンプル</h2>
          <article className="mt-3 rounded-2xl border border-rose-100 bg-gradient-to-b from-rose-50/50 via-white to-amber-50/45 p-4">
            <p className="text-[0.68rem] tracking-[0.18em] text-slate-500">SAMPLE</p>
            <p className="mt-2 font-serif-jp text-[1.08rem] text-slate-700">月のしずく</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              この沈黙は終わりではなく、間合いを測る時間です。今は結論を急がず、短く整えた一通が距離を戻します。
            </p>
            <p className="mt-2 rounded-lg bg-white/70 px-3 py-2 text-sm text-slate-700">今日の行動: 明日の同じ時間に一通だけ送る</p>
          </article>
        </section>

        <section className="rounded-[1.7rem] border border-amber-200/70 bg-gradient-to-b from-amber-50/70 to-white p-5 shadow-[0_16px_40px_rgba(148,163,184,0.16)]">
          <h2 className="font-serif-jp text-xl text-slate-800">もっと深く知りたい人へ</h2>
          <p className="mt-2 text-sm leading-7 text-slate-600">
            無料1枚のあと、過去・現在・未来の3枚リーディング（note）へ進めます。相手視点と今週の行動まで整理します。
          </p>
          <p className="mt-3 text-xs text-slate-500">無料1枚 → 結果確認 → 3枚リーディング購入</p>
          <button
            type="button"
            className={`mt-4 w-full rounded-full px-6 py-3.5 text-sm font-medium transition ${
              diagnosisType
                ? "border border-amber-200 bg-white text-slate-700 shadow-[0_10px_26px_rgba(148,163,184,0.18)] active:scale-[0.99]"
                : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
            }`}
            onClick={goDraw}
            disabled={!diagnosisType}
          >
            まず無料の1枚を受け取る
          </button>
        </section>

        <section className="rounded-[1.7rem] border border-slate-200/80 bg-white p-5 shadow-[0_16px_40px_rgba(148,163,184,0.14)]">
          <h2 className="font-serif-jp text-xl text-slate-800">FAQ</h2>
          <div className="mt-3 space-y-3 text-sm leading-7 text-slate-600">
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="font-medium text-slate-700">Q. 本当に無料ですか？</p>
              <p>A. 1枚リーディングは無料です。購入は任意です。</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="font-medium text-slate-700">Q. しつこい課金誘導はありますか？</p>
              <p>A. ありません。結果画面で任意の案内が表示されるのみです。</p>
            </div>
            <div className="rounded-xl bg-slate-50 px-3 py-2">
              <p className="font-medium text-slate-700">Q. 登録は必要ですか？</p>
              <p>A. 不要です。ブラウザ上でそのまま使えます。</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
