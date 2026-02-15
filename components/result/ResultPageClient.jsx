"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildQuoteLine, buildShareText, THEME_LABELS, toDateText } from "../../lib/reading/viralCopy";
import { getSessionState, setPremiumIntent } from "../../lib/session/oracleSession";
import { trackEvent } from "../../lib/analytics/trackEvent";
import { EVENT_NAMES, PAGE_NAMES } from "../../lib/analytics/events";
import { buildTrackedNoteUrl, getNoteUrlByDiagnosisType } from "../../lib/monetization/noteMap";
import PageFrame from "../ui/PageFrame";

export default function ResultPageClient() {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [titleVisible, setTitleVisible] = useState(false);
  const [bodyVisible, setBodyVisible] = useState(false);
  const [otherActionsOpen, setOtherActionsOpen] = useState(false);
  const [template, setTemplate] = useState("short");
  const titleRef = useRef(null);
  const measuredRef = useRef(false);

  useEffect(() => {
    const session = getSessionState();
    if (!session?.lastResult?.card?.id || !session?.diagnosisType) {
      router.replace("/");
      return;
    }

    performance.mark("result_title_measure_start");
    trackEvent(EVENT_NAMES.PAGE_VIEW, { meta: { page: PAGE_NAMES.RESULT } });
    setResult(session.lastResult);
    setTitleVisible(false);
    setBodyVisible(false);
    measuredRef.current = false;
  }, [router]);

  useEffect(() => {
    if (!result || !titleRef.current || measuredRef.current) return;

    performance.mark("result_title_rendered");
    performance.measure("result_title_paint", "result_title_measure_start", "result_title_rendered");
    const entries = performance.getEntriesByName("result_title_paint");
    const firstPaintMs = Math.round(entries[entries.length - 1]?.duration || 0);

    trackEvent(EVENT_NAMES.RESULT_FIRST_PAINT, {
      theme: result.theme,
      cardId: result.card.id,
      meta: { firstPaintMs, under500: firstPaintMs <= 500 }
    });

    measuredRef.current = true;
    const ritualMs = result?.ritualMeta?.ritualMs || 0;
    const titleDelay = Math.min(Math.max(Math.round(ritualMs * 0.1), 90), 180);
    const bodyDelay = titleDelay + 170;
    const titleTimer = setTimeout(() => setTitleVisible(true), titleDelay);
    const bodyTimer = setTimeout(() => setBodyVisible(true), bodyDelay);

    performance.clearMeasures("result_title_paint");
    performance.clearMarks("result_title_measure_start");
    performance.clearMarks("result_title_rendered");
    return () => {
      clearTimeout(titleTimer);
      clearTimeout(bodyTimer);
    };
  }, [result]);

  const shareUrl = useMemo(() => {
    if (!result) return "#";
    const text = buildShareText({
      template,
      title: result.title,
      message: result.message,
      cardName: result.card.name,
      theme: result.theme,
      diagnosisType: result.diagnosisType,
      afterglowLine: result.afterglowLine,
      shareHooks: result.card.shareHooks
    });
    return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  }, [result, template]);

  const quoteLine = useMemo(() => {
    if (!result) return "";
    return buildQuoteLine({
      title: result.title,
      theme: result.theme,
      diagnosisType: result.diagnosisType,
      cardName: result.card.name
    });
  }, [result]);

  const noteUrl = useMemo(() => {
    if (!result) return "https://note.com/";
    const session = getSessionState();
    const baseUrl = getNoteUrlByDiagnosisType(result.diagnosisType || result.theme);
    return buildTrackedNoteUrl(baseUrl, {
      diagnosisType: result.diagnosisType || result.theme,
      sessionId: session?.sessionId || "unknown",
      source: "result_secondary",
      cardId: result.card.id
    });
  }, [result]);

  const onShare = () => {
    if (!result) return;
    trackEvent(EVENT_NAMES.SHARE_CLICKED, {
      theme: result.theme,
      cardId: result.card.id,
      meta: {
        diagnosisType: result.diagnosisType || result.theme,
        card: result.card.name,
        template
      }
    });
  };

  const openDeep = () => {
    if (!result) return;
    trackEvent(EVENT_NAMES.DEEP_DIVE_OPENED, { theme: result.theme, cardId: result.card.id });
    router.push("/deep");
  };

  const onScreenshotIntent = () => {
    if (!result) return;
    trackEvent(EVENT_NAMES.SCREENSHOT_INTENT, { theme: result.theme, cardId: result.card.id });
  };

  const openPremiumIntro = () => {
    if (!result) return;
    trackEvent(EVENT_NAMES.PREMIUM_CTA_CLICKED, {
      theme: result.theme,
      cardId: result.card.id,
      meta: { source: "result" }
    });
    setPremiumIntent(true);
    router.push("/premium/intro");
  };

  const onNoteClick = () => {
    if (!result) return;
    const sessionId = getSessionState()?.sessionId || "unknown";
    trackEvent(EVENT_NAMES.NOTE_CLICK, {
      theme: result.theme,
      cardId: result.card.id,
      meta: {
        source: "result_secondary",
        diagnosisType: result.diagnosisType || result.theme,
        sessionId,
        target: noteUrl
      }
    });
  };

  if (!result) return null;

  return (
    <PageFrame width="max-w-[375px]" top="1.3rem" bottom="1.5rem">
      <article className="rounded-[2rem] border border-amber-300/70 bg-[linear-gradient(170deg,#f6f1ea,#f3ecff)] p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
        <p className="text-center text-[0.66rem] tracking-[0.22em] text-amber-700">✦ ORACLE RESULT ✦</p>
        <h1
          ref={titleRef}
          className={`mt-3 text-center font-serif-jp text-[1.52rem] leading-tight text-slate-800 transition duration-500 ${
            titleVisible ? "opacity-100 translate-y-0" : "translate-y-2 opacity-0"
          }`}
        >
          {result.title}
        </h1>
        <p
          className={`mt-2 text-center text-xs text-slate-600 transition duration-500 ${
            titleVisible ? "opacity-100" : "opacity-0"
          }`}
        >
          {THEME_LABELS[result.theme]}
        </p>

        <div
          className={`mt-4 rounded-[1.35rem] border border-amber-300/40 bg-[linear-gradient(160deg,#0b1026,#141a3a)] p-4 shadow-[0_14px_34px_rgba(0,0,0,0.3)] transition duration-500 ${
            titleVisible ? "opacity-100 translate-y-0" : "translate-y-2 opacity-0"
          }`}
        >
          <p className="text-[0.64rem] tracking-[0.16em] text-amber-200">THIS NIGHT'S CARD</p>
          <p className="mt-2 font-serif-jp text-[1.16rem] text-slate-50">{result.card.name}</p>
          <p className="mt-1 text-xs text-indigo-100/85">{THEME_LABELS[result.theme]} / {toDateText(result.drawnAt)}</p>
          <p className="mt-3 text-sm leading-6 text-indigo-100">{result.afterglowLine}</p>
          <p className="mt-3 text-right text-[0.66rem] tracking-[0.18em] text-amber-200/80">MOONLIGHT ORACLE</p>
        </div>

        <div className={`transition duration-500 ${bodyVisible ? "opacity-100" : "opacity-0"}`}>
          <p className="mt-4 text-sm leading-7 text-slate-700">{result.message}</p>
          <p className="mt-3 rounded-xl border border-indigo-200/70 bg-indigo-50/70 px-3 py-2 text-sm text-slate-700">今夜の行動: {result.actionTip}</p>
          <p className="mt-3 rounded-xl border border-amber-200/70 bg-amber-50/70 px-3 py-2 text-sm text-slate-700">自分への問い: {result.projectionPrompt}</p>
          <p className="mt-3 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-700">
            余韻メモ: {result.afterglowLine}
          </p>
          <p className="mt-3 rounded-xl border border-slate-200 bg-white/85 px-3 py-2 text-sm text-slate-700">
            共有用1行: {quoteLine}
          </p>
        </div>
      </article>

      <div className="rounded-2xl border border-amber-200/70 bg-white/95 p-3 shadow-[0_14px_32px_rgba(0,0,0,0.2)]">
        <p className="text-center text-[0.64rem] tracking-[0.14em] text-slate-500">SHARE STYLE</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
        {[
          ["short", "short"],
          ["emotional", "emotional"],
          ["night", "night"],
          ["diagnosis_label", "diagnosis"],
          ["quote_reply", "quote"]
        ].map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`rounded-full border px-3 py-2 text-xs ${
              template === key ? "border-amber-300 bg-amber-100 text-slate-700" : "border-slate-200 bg-white text-slate-500"
            }`}
            onClick={() => setTemplate(key)}
          >
            {label}
          </button>
        ))}
        </div>
      </div>

      <section className="rounded-2xl border border-amber-300/50 bg-[linear-gradient(165deg,#0b1026,#141a3a)] p-4 shadow-[0_20px_50px_rgba(0,0,0,0.35)]">
        <p className="text-center text-[0.66rem] tracking-[0.2em] text-amber-200/90">NEXT STEP</p>
        <p className="mt-2 text-center text-sm text-indigo-100">ここから核心に進む準備ができています。</p>
        <div className="mt-3">
        <button
          type="button"
          className="min-h-11 w-full rounded-full border border-amber-300 bg-gradient-to-r from-indigo-700 via-violet-700 to-indigo-900 px-5 py-3 text-sm font-semibold text-white shadow-[0_20px_60px_rgba(0,0,0,0.35)]"
          onClick={openPremiumIntro}
        >
          あなた専用の3枚リーディングを見る
        </button>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-3 shadow-[0_14px_28px_rgba(0,0,0,0.16)]">
        <button
          type="button"
          className="inline-flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-3 py-2 text-left text-[0.72rem] tracking-[0.12em] text-slate-600"
          onClick={() => setOtherActionsOpen((prev) => !prev)}
          aria-expanded={otherActionsOpen}
          aria-controls="other-actions-panel"
        >
          <span>OTHER ACTIONS</span>
          <span className="text-xs">{otherActionsOpen ? "閉じる" : "開く"}</span>
        </button>
        <div id="other-actions-panel" className={`mt-2 grid gap-2 ${otherActionsOpen ? "block" : "hidden"}`}>
        <a
          className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-700"
          href={shareUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onShare}
        >
          Xで貼る
        </a>
        <button type="button" className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-700" onClick={openDeep}>
          深掘りする
        </button>
        <button
          type="button"
          className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600"
          onClick={() => router.push(`/draw?diagnosisType=${result.diagnosisType || result.theme}`)}
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

      <section className="rounded-xl border border-slate-200 bg-white/85 px-3 py-3">
        <p className="text-xs text-slate-500">補助コンテンツ</p>
        <a
          className="mt-2 inline-flex text-sm text-slate-600 underline decoration-slate-300 underline-offset-4"
          href={noteUrl}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onNoteClick}
        >
          noteの無料記事を読む
        </a>
      </section>
    </PageFrame>
  );
}
