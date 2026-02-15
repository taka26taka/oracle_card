"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { pickRandomCard } from "../../lib/cards";
import { generateViralTitle } from "../../lib/reading/generateViralTitle";
import { buildActionTip, buildAfterglowLine, THEME_LABELS } from "../../lib/reading/viralCopy";
import { getSessionState, setDiagnosisType, setLastResult, setSelectedTheme } from "../../lib/session/oracleSession";
import { trackEvent } from "../../lib/analytics/trackEvent";

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
        : new URLSearchParams(window.location.search).get("diagnosisType") || "";
    const state = getSessionState();
    const nextTheme = queryDiagnosisType || state?.diagnosisType || state?.selectedTheme || "";
    if (!nextTheme || !THEME_LABELS[nextTheme]) {
      router.replace("/");
      return;
    }
    setDiagnosisType(nextTheme);
    setSelectedTheme(nextTheme);
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
    let message = "今は答えを急がず、あなたの気持ちを大切にする夜にしてください。";

    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardName: card.name, cardKey: card.key, theme, diagnosisType: diagnosisType || theme })
      });
      const data = await res.json();
      if (data?.message) message = data.message;
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
    const actionTip = buildActionTip(theme);
    const afterglowLine = buildAfterglowLine(card, theme);

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
    trackEvent("draw_executed", { theme, cardId: card.id, meta: { delayMs: DRAW_DELAY_MS } });
    trackEvent("draw_completed", { theme, cardId: card.id, meta: { delayMs: DRAW_DELAY_MS } });
    router.replace("/result");
  };

  return (
    <main className="min-h-dvh px-4 pb-[calc(2rem+env(safe-area-inset-bottom))] pt-[calc(2rem+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md rounded-[2rem] border border-rose-100 bg-white/90 p-6 shadow-[0_24px_64px_rgba(148,163,184,0.2)]">
        <p className="text-center text-xs tracking-[0.22em] text-slate-500">DRAW</p>
        <h1 className="mt-3 text-center font-serif-jp text-2xl text-slate-700">今夜の1枚を引く</h1>
        <p className="mt-3 text-center text-sm text-slate-500">テーマ: {THEME_LABELS[theme] || "-"}</p>

        <button
          type="button"
          disabled={loading || !theme}
          className={`mt-8 w-full rounded-full px-6 py-4 text-base transition ${
            loading
              ? "cursor-wait border border-slate-200 bg-slate-100 text-slate-400"
              : "border border-rose-200/70 bg-gradient-to-r from-rose-100 via-white to-amber-100 text-slate-700 shadow-[0_12px_28px_rgba(148,163,184,0.2)] active:scale-[0.99]"
          }`}
          onClick={handleDraw}
        >
          {loading ? "メッセージを整えています..." : "1タップで引く"}
        </button>
      </section>
    </main>
  );
}
