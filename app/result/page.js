"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildShareText, THEME_LABELS, toDateText } from "../../lib/reading/viralCopy";
import { getSessionState } from "../../lib/session/oracleSession";
import { trackEvent } from "../../lib/analytics/trackEvent";

export default function ResultPage() {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [bodyVisible, setBodyVisible] = useState(false);
  const [template, setTemplate] = useState("short");
  const titleRef = useRef(null);
  const measuredRef = useRef(false);

  useEffect(() => {
    const session = getSessionState();
    if (!session?.lastResult?.card?.id || !session?.selectedTheme) {
      router.replace("/");
      return;
    }

    performance.mark("result_title_measure_start");
    setResult(session.lastResult);
    setBodyVisible(false);
    measuredRef.current = false;
  }, [router]);

  useEffect(() => {
    if (!result || !titleRef.current || measuredRef.current) return;

    performance.mark("result_title_rendered");
    performance.measure("result_title_paint", "result_title_measure_start", "result_title_rendered");
    const entries = performance.getEntriesByName("result_title_paint");
    const firstPaintMs = Math.round(entries[entries.length - 1]?.duration || 0);

    trackEvent("result_first_paint", {
      theme: result.theme,
      cardId: result.card.id,
      meta: { firstPaintMs, under500: firstPaintMs <= 500 }
    });

    measuredRef.current = true;
    setBodyVisible(true);
    performance.clearMeasures("result_title_paint");
    performance.clearMarks("result_title_measure_start");
    performance.clearMarks("result_title_rendered");
  }, [result]);

  const shareUrl = useMemo(() => {
    if (!result) return "#";
    const text = buildShareText({
      template,
      title: result.title,
      message: result.message,
      cardName: result.card.name,
      theme: result.theme,
      afterglowLine: result.afterglowLine,
      shareHooks: result.card.shareHooks
    });
    return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  }, [result, template]);

  const onShare = () => {
    if (!result) return;
    trackEvent("share_clicked", {
      theme: result.theme,
      cardId: result.card.id,
      meta: { template }
    });
  };

  const openDeep = () => {
    if (!result) return;
    trackEvent("deep_dive_opened", { theme: result.theme, cardId: result.card.id });
    router.push("/deep");
  };

  const onScreenshotIntent = () => {
    if (!result) return;
    trackEvent("screenshot_intent", { theme: result.theme, cardId: result.card.id });
  };

  if (!result) return null;

  return (
    <main className="min-h-dvh px-4 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(1.3rem+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-[375px]">
        <article className="rounded-[1.9rem] border border-rose-100 bg-white p-5 shadow-[0_20px_56px_rgba(148,163,184,0.24)]">
          <p className="text-center text-[0.68rem] tracking-[0.24em] text-slate-500">FOR YOU TONIGHT</p>
          <h1 ref={titleRef} className="mt-3 text-center font-serif-jp text-[1.45rem] leading-tight text-slate-800">
            {result.title}
          </h1>
          <p className="mt-2 text-center text-xs text-slate-500">{THEME_LABELS[result.theme]}</p>

          <div className="mt-4 rounded-2xl border border-rose-100/80 bg-gradient-to-b from-rose-50/60 via-white to-amber-50/50 p-4">
            <p className="text-[0.67rem] tracking-[0.16em] text-slate-500">スクショ保存フレーム</p>
            <p className="mt-2 font-serif-jp text-[1.1rem] text-slate-700">{result.card.name}</p>
            <p className="mt-1 text-xs text-slate-500">{THEME_LABELS[result.theme]} / {toDateText(result.drawnAt)}</p>
            <p className="mt-3 text-sm leading-6 text-slate-600">{result.afterglowLine}</p>
            <p className="mt-3 text-right text-[0.68rem] tracking-[0.18em] text-slate-400">月灯りのオラクル</p>
          </div>

          <div className={`transition duration-500 ${bodyVisible ? "opacity-100" : "opacity-0"}`}>
            <p className="mt-4 text-sm leading-7 text-slate-600">{result.message}</p>
            <p className="mt-3 rounded-xl bg-rose-50/50 px-3 py-2 text-sm text-slate-700">今日の行動: {result.actionTip}</p>
            <p className="mt-3 rounded-xl bg-amber-50/60 px-3 py-2 text-sm text-slate-600">
              自分への問い: {result.projectionPrompt}
            </p>
            <p className="mt-3 text-sm text-slate-500">余韻: {result.afterglowLine}</p>
          </div>
        </article>

        <div className="mt-4 grid grid-cols-3 gap-2">
          {[
            ["short", "short"],
            ["emotional", "emotional"],
            ["night", "night"]
          ].map(([key, label]) => (
            <button
              key={key}
              type="button"
              className={`rounded-full border px-3 py-2 text-xs ${
                template === key ? "border-rose-300 bg-rose-50 text-slate-700" : "border-slate-200 bg-white text-slate-500"
              }`}
              onClick={() => setTemplate(key)}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="mt-3 grid gap-2">
          <a
            className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-slate-700 px-5 py-3 text-sm text-white"
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onShare}
          >
            Xで貼る
          </a>
          <button
            type="button"
            className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-700"
            onClick={openDeep}
          >
            深掘りする
          </button>
          <button
            type="button"
            className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600"
            onClick={() => router.push(`/draw?theme=${result.theme}`)}
          >
            もう1枚
          </button>
          <button
            type="button"
            className="w-full rounded-full border border-rose-100 bg-rose-50 px-5 py-3 text-sm text-slate-600"
            onClick={onScreenshotIntent}
          >
            スクショ保存したくなった
          </button>
        </div>
      </section>
    </main>
  );
}
