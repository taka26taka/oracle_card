"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { buildQuoteLine, buildShareText, THEME_LABELS, toDateText } from "../../lib/reading/viralCopy";
import { getSessionState, setPremiumIntent } from "../../lib/session/oracleSession";
import { trackEvent } from "../../lib/analytics/trackEvent";
import { EVENT_NAMES, PAGE_NAMES } from "../../lib/analytics/events";
import { buildTrackedNoteUrl, getNoteUrlByDiagnosisType } from "../../lib/monetization/noteMap";
import PageFrame from "../ui/PageFrame";
import PremiumCtaCard from "../premium/PremiumCtaCard";

export default function ResultPageClient() {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [bodyVisible, setBodyVisible] = useState(false);
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
    trackEvent(EVENT_NAMES.RESULT_VIEWED, {
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
          <p className="mt-3 rounded-xl bg-amber-50/60 px-3 py-2 text-sm text-slate-600">自分への問い: {result.projectionPrompt}</p>
          <p className="mt-3 text-sm text-slate-500">余韻: {result.afterglowLine}</p>
          <p className="mt-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700">
            X投稿専用1行: {quoteLine}
          </p>
        </div>
      </article>

      <div className="mt-4 grid grid-cols-3 gap-2">
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
              template === key ? "border-rose-300 bg-rose-50 text-slate-700" : "border-slate-200 bg-white text-slate-500"
            }`}
            onClick={() => setTemplate(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-3 grid gap-2">
        <button
          type="button"
          className="w-full rounded-full border border-slate-200 bg-slate-700 px-5 py-3 text-sm text-white"
          onClick={openPremiumIntro}
        >
          あなた専用の3枚リーディングへ
        </button>
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

      <PremiumCtaCard
        title="3枚で恋の流れを見る"
        description="過去・現在・未来を3枚で読み、相手視点と今週の行動まで整理します。"
        buttonLabel="3枚リーディングの詳細を見る"
        onClick={openPremiumIntro}
      />

      <section className="mt-3 rounded-xl border border-slate-200 bg-white/80 px-3 py-3">
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
