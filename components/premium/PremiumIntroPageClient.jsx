"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { getSessionState, startCheckoutAttempt } from "../../lib/session/oracleSession";
import { trackEvent } from "../../lib/analytics/trackEvent";
import { EVENT_NAMES, PAGE_NAMES } from "../../lib/analytics/events";
import PageFrame from "../ui/PageFrame";
import PremiumDiffTable from "./PremiumDiffTable";

const CHECKOUT_URL = process.env.NEXT_PUBLIC_CHECKOUT_URL || "";
const CHECKOUT_RETURN_PARAM = process.env.NEXT_PUBLIC_CHECKOUT_RETURN_PARAM || "";

export default function PremiumIntroPageClient() {
  const router = useRouter();
  const ready = Boolean(CHECKOUT_URL);
  const session = useMemo(() => getSessionState(), []);
  const reason = useMemo(() => {
    if (typeof window === "undefined") return "";
    return new URLSearchParams(window.location.search).get("reason") || "";
  }, []);

  useEffect(() => {
    if (!session?.lastResult?.card?.id) {
      router.replace("/");
      return;
    }

    trackEvent(EVENT_NAMES.PAGE_VIEW, { meta: { page: PAGE_NAMES.PREMIUM_INTRO } });
    trackEvent(EVENT_NAMES.PREMIUM_INTRO_VIEWED, {
      theme: session.lastResult.theme,
      cardId: session.lastResult.card.id
    });
  }, [router, session]);

  const onCheckoutClick = () => {
    if (!ready) return;
    const nextState = startCheckoutAttempt("premium_intro");
    const attemptId = nextState?.checkoutAttempt?.attemptId || "";
    const sessionId = nextState?.sessionId || "unknown";
    const diagnosisType = nextState?.lastResult?.diagnosisType || nextState?.lastResult?.theme || "";

    let nextCheckoutUrl = CHECKOUT_URL;
    try {
      const checkoutUrl = new URL(CHECKOUT_URL);
      checkoutUrl.searchParams.set("attemptId", attemptId);
      checkoutUrl.searchParams.set("sessionId", sessionId);
      checkoutUrl.searchParams.set("diagnosisType", diagnosisType);
      checkoutUrl.searchParams.set("source", "premium_intro");
      if (CHECKOUT_RETURN_PARAM && typeof window !== "undefined") {
        const callback = new URL("/premium/complete", window.location.origin);
        callback.searchParams.set("attemptId", attemptId);
        callback.searchParams.set("sessionId", sessionId);
        callback.searchParams.set("diagnosisType", diagnosisType);
        callback.searchParams.set("source", "premium_intro");
        checkoutUrl.searchParams.set(CHECKOUT_RETURN_PARAM, callback.toString());
      }
      nextCheckoutUrl = checkoutUrl.toString();
    } catch {
      return;
    }

    trackEvent(EVENT_NAMES.PREMIUM_CHECKOUT_CLICKED, {
      theme: nextState?.lastResult?.theme,
      cardId: nextState?.lastResult?.card?.id,
      meta: { attemptId }
    });
    window.open(nextCheckoutUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <PageFrame>
      <section className="rounded-[2rem] border border-rose-100 bg-white p-5 shadow-[0_20px_56px_rgba(148,163,184,0.2)]">
        <p className="text-xs tracking-[0.2em] text-slate-500">PREMIUM INTRO</p>
        <h1 className="mt-2 font-serif-jp text-2xl text-slate-700">3枚で恋の流れを見る</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          無料の1枚リーディングより深く、過去・現在・未来の流れをあなた専用に整理します。
        </p>
        {reason === "premium_access_required" && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            3枚リーディングの表示には購入完了が必要です。購入後に自動で表示されます。
          </p>
        )}

        <PremiumDiffTable />

        {ready ? (
          <button
            type="button"
            className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-slate-700 px-5 py-3 text-sm text-white"
            onClick={onCheckoutClick}
          >
            noteで購入して続きを読む
          </button>
        ) : (
          <div className="mt-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">現在準備中です</div>
        )}

        <button
          type="button"
          className="mt-2 w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600"
          onClick={() => router.push("/result")}
        >
          無料結果へ戻る
        </button>
      </section>
    </PageFrame>
  );
}
