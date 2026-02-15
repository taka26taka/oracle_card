"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pickRandomCard } from "../../lib/cards";
import { generateViralTitle } from "../../lib/reading/generateViralTitle";
import { buildActionTip, buildAfterglowLine, THEME_LABELS } from "../../lib/reading/viralCopy";
import { getSessionState, setDiagnosisType, setLastResult } from "../../lib/session/oracleSession";
import { trackEvent } from "../../lib/analytics/trackEvent";
import { EVENT_NAMES, PAGE_NAMES } from "../../lib/analytics/events";
import { normalizeDiagnosisType } from "../../lib/domain/diagnosis";

const RITUAL_TIMINGS_MS = {
  prelude: 250,
  summon: 300,
  holdMin: 820,
  holdRange: 240,
  flipPrep: 160,
  flip: 430
};

const REDUCED_TIMINGS_MS = {
  prelude: 80,
  summon: 120,
  holdMin: 180,
  holdRange: 60,
  flipPrep: 100,
  flip: 180
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export default function DrawPage() {
  const router = useRouter();
  const [theme, setTheme] = useState("");
  const [diagnosisType, setDiagnosis] = useState("");
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState("idle");

  useEffect(() => {
    const queryDiagnosisType =
      typeof window === "undefined"
        ? ""
        : normalizeDiagnosisType(new URLSearchParams(window.location.search).get("diagnosisType") || "");
    const state = getSessionState();
    const nextTheme = queryDiagnosisType || normalizeDiagnosisType(state?.diagnosisType || "");
    if (!nextTheme || !THEME_LABELS[nextTheme]) {
      router.replace("/");
      return;
    }
    trackEvent(EVENT_NAMES.PAGE_VIEW, { meta: { page: PAGE_NAMES.DRAW } });
    setDiagnosisType(nextTheme);
    setTheme(nextTheme);
    setDiagnosis(nextTheme);
  }, [router]);

  const tone = useMemo(() => {
    const list = ["sad", "quiet", "positive"];
    return list[Math.floor(Math.random() * list.length)];
  }, []);

  const timeHint = useMemo(() => {
    const hour = new Date().getHours();
    return hour >= 18 ? "tonight" : "tomorrow";
  }, []);

  const handleDraw = async () => {
    if (!theme || loading) return;
    setLoading(true);
    const startedAt = Date.now();
    const reducedMotion =
      typeof window !== "undefined" && window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const timings = reducedMotion ? REDUCED_TIMINGS_MS : RITUAL_TIMINGS_MS;

    const resultPromise = (async () => {
      const card = pickRandomCard();
      let message = "未読や沈黙が続いても、関係の温度差は連絡の工夫で変えられます。";
      let actionTip = buildActionTip(theme, diagnosisType || theme);
      let afterglowLine = buildAfterglowLine(card, theme, diagnosisType || theme);

      try {
        const res = await fetch("/api/reading", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardName: card.name, cardKey: card.key, theme, diagnosisType: diagnosisType || theme })
        });
        const data = await res.json();
        if (data?.message) message = data.message;
        if (data?.actionTip) actionTip = data.actionTip;
        if (data?.afterglowLine) afterglowLine = data.afterglowLine;
      } catch {
        // keep fallback
      }

      const title = generateViralTitle({
        theme,
        tone,
        timeHint,
        seeds: card?.viralTitleSeeds?.[theme] || card?.viralTitleSeeds?.default || []
      });
      const prompts = Array.isArray(card?.selfProjectionPrompts) ? card.selfProjectionPrompts : [];
      const projectionPrompt = prompts.length
        ? prompts[Math.floor(Math.random() * prompts.length)]
        : "本当は何を待っていますか？";

      return {
        card,
        theme,
        diagnosisType: diagnosisType || theme,
        title,
        message,
        actionTip,
        afterglowLine,
        projectionPrompt,
        drawnAt: new Date().toISOString(),
        ritualMeta: {
          ritualMs: 0,
          drawPhaseDoneAt: ""
        },
        deepMessage: "",
        deepFocus: ""
      };
    })();

    setPhase("prelude");
    await wait(timings.prelude);
    setPhase("summon");
    await wait(timings.summon);
    setPhase("hold");
    await wait(timings.holdMin + Math.round(Math.random() * timings.holdRange));
    setPhase("flipPrep");
    await wait(timings.flipPrep);
    setPhase("flip");
    await wait(timings.flip);

    const result = await resultPromise;
    const ritualMs = Date.now() - startedAt;
    result.ritualMeta = {
      ritualMs,
      drawPhaseDoneAt: new Date().toISOString()
    };

    setLastResult(result);
    trackEvent(EVENT_NAMES.DRAW_EXECUTED, { theme, cardId: result.card.id, meta: { delayMs: ritualMs } });
    router.replace("/result");
  };

  const ritualGuideText =
    phase === "idle"
      ? "心を整えたら、1枚引いてください。"
      : phase === "hold"
        ? "カードの流れを読み解いています..."
        : phase === "flipPrep" || phase === "flip"
          ? "結果をひらいています..."
          : "カードを呼び出しています...";

  return (
    <main className="min-h-dvh px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md rounded-[2rem] border border-amber-300/40 bg-[linear-gradient(165deg,#0b1026,#141a3a)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <p className="text-center text-xs tracking-[0.22em] text-amber-200/90">✦ DRAW RITUAL ✦</p>
        <h1 className="mt-3 text-center font-serif-jp text-2xl text-slate-50">今夜の1枚を引く</h1>
        <p className="mt-3 text-center text-sm text-indigo-100/90">テーマ: {THEME_LABELS[theme] || "-"}</p>
        <p className="mt-2 text-center text-sm leading-7 text-indigo-100/90">
          心を整えて、静かに1枚。結果画面で行動のヒントまで受け取れます。
        </p>

        <div className="relative mt-5">
          <div
            className={`pointer-events-none absolute inset-0 rounded-[1.4rem] bg-black/20 transition-opacity duration-300 ${
              phase === "idle" ? "opacity-0" : "opacity-100"
            }`}
          />
          <div className="relative mx-auto w-[72%] max-w-[220px]">
            <article
              className={`h-[300px] rounded-[24px] border border-amber-300/60 bg-[linear-gradient(170deg,#f6f1ea,#f3ecff)] px-4 py-4 text-center shadow-[0_18px_40px_rgba(0,0,0,0.28)] transition duration-300 ${
                phase === "idle" || phase === "prelude"
                  ? "opacity-0 scale-95"
                  : phase === "summon"
                    ? "opacity-100 scale-100"
                    : phase === "hold"
                      ? "opacity-100 scale-100 ritual-drift"
                      : phase === "flipPrep"
                        ? "opacity-100 scale-[1.03]"
                        : "ritual-flip"
              }`}
              aria-hidden="true"
            >
              <p className="text-[0.64rem] tracking-[0.16em] text-amber-700">✦ ORACLE ✦</p>
              <p className="mt-12 font-serif-jp text-[1.18rem] text-slate-800">{THEME_LABELS[theme] || "-"}</p>
              <p className="mt-3 text-xs leading-6 text-slate-600">この1枚が、今夜の流れを映します。</p>
            </article>
          </div>
        </div>
        <p className="mt-3 text-center text-xs text-indigo-100/85">{ritualGuideText}</p>

        <button
          type="button"
          disabled={loading || !theme}
          className={`mt-8 min-h-11 w-full rounded-full px-6 py-3.5 text-base font-semibold transition ${
            loading
              ? "cursor-wait border border-slate-200 bg-slate-100 text-slate-400"
              : "border border-amber-300 bg-gradient-to-r from-indigo-700 via-violet-700 to-indigo-900 text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)] active:scale-[0.99]"
          }`}
          onClick={handleDraw}
        >
          {loading ? "カードをひらいています..." : "1枚引く"}
        </button>
      </section>
    </main>
  );
}
