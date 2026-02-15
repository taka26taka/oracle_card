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

const DRAW_DELAY_MS = 760;

export default function DrawPage() {
  const router = useRouter();
  const [theme, setTheme] = useState("");
  const [diagnosisType, setDiagnosis] = useState("");
  const [loading, setLoading] = useState(false);

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
    const started = Date.now();

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
    const elapsed = Date.now() - started;
    const wait = Math.max(DRAW_DELAY_MS - elapsed, 0);
    await new Promise((resolve) => setTimeout(resolve, wait));

    const result = {
      card,
      theme,
      diagnosisType: diagnosisType || theme,
      title,
      message,
      actionTip,
      afterglowLine,
      projectionPrompt,
      drawnAt: new Date().toISOString(),
      deepMessage: "",
      deepFocus: ""
    };

    setLastResult(result);
    trackEvent(EVENT_NAMES.DRAW_EXECUTED, { theme, cardId: card.id, meta: { delayMs: DRAW_DELAY_MS } });
    router.replace("/result");
  };

  return (
    <main className="min-h-dvh px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md rounded-[2rem] border border-indigo-100/70 bg-[linear-gradient(160deg,rgba(255,255,255,0.98),rgba(244,244,255,0.96))] p-6 shadow-[0_24px_70px_rgba(15,23,42,0.45)]">
        <p className="text-center text-xs tracking-[0.22em] text-slate-500">DRAW</p>
        <h1 className="mt-3 text-center font-serif-jp text-2xl text-slate-700">今夜の1枚を引く</h1>
        <p className="mt-3 text-center text-sm text-slate-500">テーマ: {THEME_LABELS[theme] || "-"}</p>
        <p className="mt-2 text-center text-sm leading-7 text-slate-600">カードを引いた後、結果画面で行動のヒントまで確認できます。</p>

        <button
          type="button"
          disabled={loading || !theme}
          className={`mt-8 min-h-11 w-full rounded-full px-6 py-3.5 text-base font-semibold transition ${
            loading
              ? "cursor-wait border border-slate-200 bg-slate-100 text-slate-400"
              : "border border-indigo-300 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 text-white shadow-[0_16px_34px_rgba(79,70,229,0.42)] active:scale-[0.99]"
          }`}
          onClick={handleDraw}
        >
          {loading ? "メッセージを整えています..." : "1タップで診断結果を見る"}
        </button>
      </section>
    </main>
  );
}
