"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { buildShareText, THEME_LABELS } from "../../lib/reading/viralCopy";
import { getSessionState, setDeepResult, setPremiumIntent } from "../../lib/session/oracleSession";
import { trackEvent } from "../../lib/analytics/trackEvent";
import PageFrame from "../ui/PageFrame";
import PremiumCtaCard from "../premium/PremiumCtaCard";

const OPTIONS = [
  { key: "partner_feeling", label: "相手の気持ち" },
  { key: "contact_timing", label: "連絡タイミング" },
  { key: "reconciliation", label: "復縁" }
];

const FOCUS_PREFIX = {
  partner_feeling: "相手の気持ちを読むと、",
  contact_timing: "連絡のタイミングで見ると、",
  reconciliation: "復縁の文脈で見ると、"
};

export default function DeepPageClient() {
  const router = useRouter();
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [deepMessage, setDeepMessage] = useState("");
  const [deepCount, setDeepCount] = useState(0);

  useEffect(() => {
    const session = getSessionState();
    if (!session?.lastResult?.card?.id) {
      router.replace("/");
      return;
    }

    setResult(session.lastResult);
    setDeepMessage(session.lastResult.deepMessage || "");
    setDeepCount(session.deepCount || 0);
  }, [router]);

  const limitReached = deepCount >= 2;

  const shareUrl = useMemo(() => {
    if (!result) return "#";
    const text = buildShareText({
      template: "night",
      title: result.title,
      message: deepMessage || result.message,
      cardName: result.card.name,
      theme: result.theme,
      afterglowLine: result.afterglowLine,
      shareHooks: result.card.shareHooks
    });
    return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  }, [deepMessage, result]);

  const openFocus = async (focus) => {
    if (!result || loading || limitReached) return;

    setLoading(true);
    let message = result.message;

    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardName: result.card.name,
          cardKey: result.card.key,
          theme: result.theme,
          diagnosisType: result.diagnosisType || result.theme,
          deepFocus: focus
        })
      });
      const data = await res.json();
      if (data?.message) message = data.message;
    } catch {
      // keep previous message
    }

    const nextDeepMessage = `${FOCUS_PREFIX[focus]}${message}`;
    const next = setDeepResult({ deepMessage: nextDeepMessage, deepFocus: focus });
    setDeepCount(next.deepCount || 0);
    setDeepMessage(nextDeepMessage);

    trackEvent("deep_focus_selected", {
      theme: result.theme,
      cardId: result.card.id,
      deepTheme: focus,
      meta: { deepCount: next.deepCount || 0 }
    });

    setLoading(false);
  };

  const openPremiumIntro = () => {
    if (!result) return;
    trackEvent("premium_cta_clicked", {
      theme: result.theme,
      cardId: result.card.id,
      meta: { source: "deep_limit" }
    });
    setPremiumIntent(true);
    router.push("/premium/intro");
  };

  if (!result) return null;

  return (
    <PageFrame>
      <section className="rounded-[2rem] border border-rose-100 bg-white p-5 shadow-[0_20px_56px_rgba(148,163,184,0.2)]">
        <p className="text-xs tracking-[0.2em] text-slate-500">DEEP DIVE</p>
        <h1 className="mt-2 font-serif-jp text-2xl text-slate-700">{result.card.name}</h1>
        <p className="mt-1 text-sm text-slate-500">{THEME_LABELS[result.theme]}を深掘りする</p>

        <div className="mt-4 grid gap-2">
          {OPTIONS.map((item) => (
            <button
              key={item.key}
              type="button"
              disabled={loading || limitReached}
              className={`w-full rounded-xl border px-4 py-3 text-left text-sm ${
                loading || limitReached
                  ? "cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                  : "border-slate-200 bg-white text-slate-700"
              }`}
              onClick={() => openFocus(item.key)}
            >
              {item.label}
            </button>
          ))}
        </div>

        <p className="mt-3 text-xs text-slate-500">深掘り回数: {deepCount}/2</p>
        {limitReached && <p className="mt-1 text-xs text-rose-500">深掘りは2回までです。次は共有かもう1枚へ。</p>}

        <p className="mt-4 min-h-24 rounded-xl bg-rose-50/45 px-3 py-3 text-sm leading-7 text-slate-600">
          {loading ? "深掘りメッセージを整えています..." : deepMessage || "上の項目を選ぶと、同じカードを恋愛文脈で再解釈します。"}
        </p>

        <div className="mt-4 grid gap-2">
          <a
            className="inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-slate-700 px-5 py-3 text-sm text-white"
            href={shareUrl}
            target="_blank"
            rel="noopener noreferrer"
            onClick={() =>
              trackEvent("share_clicked", {
                theme: result.theme,
                cardId: result.card.id,
                meta: { template: "night", source: "deep" }
              })
            }
          >
            再シェア
          </a>
          <button
            type="button"
            className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600"
            onClick={() => router.push("/")}
          >
            トップ戻る
          </button>
        </div>

        {limitReached && (
          <PremiumCtaCard
            title="3枚で恋の流れを見る"
            description="無料の深掘りはここまで。過去・現在・未来の3枚で、あなた専用に続きを読み解けます。"
            buttonLabel="あなた専用の3枚リーディングへ"
            onClick={openPremiumIntro}
          />
        )}
      </section>
    </PageFrame>
  );
}
