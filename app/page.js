"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ensureSession,
  resetDiagnosisType,
  setDiagnosisType,
  setExperimentContext
} from "../lib/session/oracleSession";
import { trackEvent } from "../lib/analytics/trackEvent";
import { EVENT_NAMES, PAGE_NAMES } from "../lib/analytics/events";
import { getLpCopyExperiment, toExperimentMeta } from "../lib/analytics/experiments";

export default function Home() {
  const router = useRouter();
  const [diagnosisType, setDiagnosis] = useState("");
  const [experiment, setExperiment] = useState({ enabled: false, experimentId: "", variant: "" });
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
    setDiagnosis("");
    const exp = getLpCopyExperiment(session?.sessionId || "");
    setExperiment(exp);
    setExperimentContext(exp);
    trackEvent(EVENT_NAMES.PAGE_VIEW, {
      meta: {
        page: PAGE_NAMES.LP,
        ...toExperimentMeta(exp)
      }
    });

    const revisitInfo = session?.revisitInfo;
    if (revisitInfo?.isRevisit) {
      trackEvent(EVENT_NAMES.REVISIT_DETECTED, {
        meta: {
          daysSinceLastVisit: revisitInfo.daysSinceLastVisit,
          streakDays: revisitInfo.streakDays,
          ...toExperimentMeta(exp)
        }
      });
    }
  }, []);

  const handleDiagnosisSelect = (nextDiagnosisType) => {
    setDiagnosis(nextDiagnosisType);
    setDiagnosisType(nextDiagnosisType);
    trackEvent(EVENT_NAMES.THEME_SELECTED, { theme: nextDiagnosisType, meta: toExperimentMeta(experiment) });
  };

  const goDraw = () => {
    if (!diagnosisType) return;
    trackEvent(EVENT_NAMES.DIAGNOSIS_COMPLETED, { diagnosisType, meta: toExperimentMeta(experiment) });
    router.push(`/draw?diagnosisType=${encodeURIComponent(diagnosisType)}`);
  };

  const activeDiagnosisLabel = diagnosisOptions.find((item) => item.key === diagnosisType)?.label || "";

  const heroCopy =
    experiment.enabled && experiment.variant === "B"
      ? "迷う恋ほど、1枚で今夜の動き方が決まる"
      : "今夜の恋を、1枚で読む";

  return (
    <main className="min-h-dvh px-4 pb-[calc(2.8rem+env(safe-area-inset-bottom))] pt-[calc(1.5rem+env(safe-area-inset-top))]">
      <div className="mx-auto w-full max-w-md space-y-10">
        <section className="overflow-hidden rounded-[2rem] border border-indigo-100/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(244,244,255,0.96))] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.45)]">
          <p className="text-center text-[0.68rem] tracking-[0.28em] text-slate-500">MOONLIGHT ORACLE</p>
          <h1 className="mt-3 text-center font-serif-jp text-[1.95rem] leading-tight text-slate-800">{heroCopy}</h1>
          <p className="mx-auto mt-3 max-w-[18.5rem] text-center text-sm leading-7 text-slate-600">
            無料で1回診断。今の恋の空気を言語化し、次に取る行動まで短く整理します。
          </p>
          <div className="mt-5 grid gap-3">
            {diagnosisOptions.map((item) => {
              const active = diagnosisType === item.key;
              return (
                <button
                  key={item.key}
                  type="button"
                  aria-pressed={active}
                  className={`w-full rounded-2xl border px-4 py-3 text-left text-sm transition ${
                    active
                      ? "border-indigo-300 bg-indigo-50/80 text-slate-700 shadow-[0_10px_26px_rgba(79,70,229,0.2)]"
                      : "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
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
            className={`mt-6 min-h-11 w-full rounded-full px-6 py-3.5 text-[1rem] font-semibold transition ${
              diagnosisType
                ? "border border-indigo-300 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-[0_16px_34px_rgba(79,70,229,0.42)] active:scale-[0.99]"
                : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
            }`}
            onClick={goDraw}
            disabled={!diagnosisType}
          >
            無料で診断する
          </button>
          {activeDiagnosisLabel && <p className="mt-3 text-center text-xs text-slate-500">選択中: {activeDiagnosisLabel}</p>}
        </section>

        <section className="rounded-[1.8rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.3)]">
          <h2 className="font-serif-jp text-[1.28rem] text-slate-800">診断の流れ</h2>
          <div className="mt-3 grid gap-3 text-sm text-slate-600">
            {[
              "1. テーマを選んで、1タップでカードを引く",
              "2. 結果で今の関係性と行動のヒントを確認する",
              "3. さらに必要なら3枚リーディングで核心に進む"
            ].map((step) => (
              <p key={step} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                {step}
              </p>
            ))}
          </div>
        </section>

        <section className="rounded-[1.8rem] border border-slate-200/80 bg-white/95 p-5 shadow-[0_18px_48px_rgba(15,23,42,0.28)]">
          <h2 className="font-serif-jp text-[1.28rem] text-slate-800">結果イメージ</h2>
          <article className="mt-3 rounded-2xl border border-indigo-100 bg-gradient-to-b from-indigo-50/70 via-white to-amber-50/70 p-4">
            <p className="text-[0.68rem] tracking-[0.18em] text-slate-500">SAMPLE RESULT</p>
            <p className="mt-2 font-serif-jp text-[1.08rem] text-slate-700">月のしずく</p>
            <p className="mt-2 text-sm leading-7 text-slate-600">
              この沈黙は終わりではなく、間合いを測る時間です。今は結論を急がず、短く整えた一通が距離を戻します。
            </p>
            <p className="mt-3 rounded-lg bg-white/80 px-3 py-2 text-sm text-slate-700">今日の行動: 明日の同じ時間に一通だけ送る</p>
          </article>
        </section>

        <section className="rounded-[1.8rem] border border-amber-200/80 bg-[linear-gradient(170deg,rgba(255,251,235,0.98),rgba(255,255,255,0.98))] p-5 shadow-[0_20px_52px_rgba(15,23,42,0.3)]">
          <h2 className="font-serif-jp text-[1.28rem] text-slate-800">ここから核心に入る</h2>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="rounded-xl border border-amber-200 bg-white px-3 py-2">相手視点で「なぜ迷っているか」を整理</li>
            <li className="rounded-xl border border-amber-200 bg-white px-3 py-2">過去・現在・未来を3枚でつないで読む</li>
            <li className="rounded-xl border border-amber-200 bg-white px-3 py-2">今週の行動を具体的な1行に落とす</li>
          </ul>
          <p className="mt-3 text-xs text-slate-500">無料診断の後に、任意で進めます。</p>
        </section>

        <section className="rounded-[1.8rem] border border-indigo-200 bg-white/95 p-5 shadow-[0_20px_52px_rgba(15,23,42,0.35)]">
          <h2 className="font-serif-jp text-[1.2rem] text-slate-800">準備ができたら、まずは無料診断から</h2>
          <button
            type="button"
            className={`mt-4 min-h-11 w-full rounded-full px-6 py-3.5 text-base font-semibold transition ${
              diagnosisType
                ? "border border-indigo-300 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-[0_18px_34px_rgba(79,70,229,0.45)] active:scale-[0.99]"
                : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
            }`}
            onClick={goDraw}
            disabled={!diagnosisType}
          >
            無料で診断を開始する
          </button>
          <div className="mt-5 space-y-2 text-xs leading-6 text-slate-500">
            <p>1枚リーディングは無料です。購入は任意です。</p>
            <p>登録不要・ブラウザでそのまま利用できます。</p>
          </div>
          <p className="mt-4 border-t border-slate-200 pt-3 text-center text-[0.68rem] tracking-[0.2em] text-slate-400">
            MOONLIGHT ORACLE
          </p>
        </section>
      </div>
    </main>
  );
}
