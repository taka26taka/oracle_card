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
    <PageFrame width="max-w-[380px]">
      <section className="rounded-[2rem] border border-indigo-100/80 bg-white/95 p-5 shadow-[0_22px_60px_rgba(15,23,42,0.42)]">
        <p className="text-xs tracking-[0.2em] text-slate-500">PREMIUM INTRO</p>
        <h1 className="mt-2 font-serif-jp text-[1.72rem] leading-tight text-slate-800">ここから核心に入る</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          無料の1枚より一段深く、過去・現在・未来をつないで、今の迷いを具体的な判断に変えます。
        </p>
        <ul className="mt-4 space-y-2 text-sm text-slate-700">
          <li className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">相手視点で、今の沈黙や距離感の理由を読む</li>
          <li className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">3枚の流れで、次の分岐点を見える化する</li>
          <li className="rounded-xl border border-amber-200 bg-amber-50/60 px-3 py-2">今週の行動を、迷わない1行に落とす</li>
        </ul>
        {reason === "premium_access_required" && (
          <p className="mt-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            3枚リーディングの表示には購入完了が必要です。購入後に自動で表示されます。
          </p>
        )}

        <PremiumDiffTable />

        {ready ? (
          <button
            type="button"
            className="mt-5 inline-flex min-h-11 w-full items-center justify-center rounded-full border border-indigo-300 bg-gradient-to-r from-indigo-600 via-violet-600 to-fuchsia-600 px-5 py-3 text-sm font-semibold text-white shadow-[0_18px_36px_rgba(79,70,229,0.45)]"
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
