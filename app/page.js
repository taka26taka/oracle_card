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

  return (
    <main className="min-h-dvh px-4 pb-[calc(2.5rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md">
        <header className="mb-8 text-center">
          <p className="mb-3 text-[0.68rem] tracking-[0.28em] text-slate-500">EMOTIONAL ORACLE</p>
          <h1 className="font-serif-jp text-[1.8rem] font-medium leading-tight text-slate-700">
            たまたま開いたあなたへ、
            <br />
            今夜の恋の一枚
          </h1>
          <p className="mx-auto mt-4 max-w-[19rem] text-sm leading-7 text-slate-500">
            いまの恋愛状態をひとつ選んでください。
          </p>
        </header>

        <div className="grid gap-3">
          {diagnosisOptions.map((item) => {
            const active = diagnosisType === item.key;
            return (
              <button
                key={item.key}
                type="button"
                className={`w-full rounded-2xl border px-4 py-3.5 text-left text-sm transition ${
                  active
                    ? "border-rose-300 bg-rose-50 text-slate-700 shadow-[0_8px_22px_rgba(251,113,133,0.2)]"
                    : "border-slate-200 bg-white/85 text-slate-600"
                }`}
                onClick={() => handleDiagnosisSelect(item.key)}
              >
                <span className="block text-base font-medium">{item.label}</span>
                <span className="mt-1 block text-xs text-slate-500">{item.hashTag}</span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          className={`mt-8 w-full rounded-full px-6 py-4 text-[0.98rem] font-medium transition ${
            diagnosisType
              ? "border border-rose-200/70 bg-gradient-to-r from-rose-100 via-white to-amber-100 text-slate-700 shadow-[0_12px_28px_rgba(148,163,184,0.2)] active:scale-[0.99]"
              : "cursor-not-allowed border border-slate-200 bg-slate-100 text-slate-400"
          }`}
          onClick={goDraw}
          disabled={!diagnosisType}
        >
          診断して1枚引く
        </button>
      </section>
    </main>
  );
}
