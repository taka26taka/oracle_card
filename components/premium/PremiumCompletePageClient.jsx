"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { getSessionState } from "../../lib/session/oracleSession";
import { trackEvent } from "../../lib/analytics/trackEvent";
import PageFrame from "../ui/PageFrame";

export default function PremiumCompletePageClient() {
  const router = useRouter();
  const trackedRef = useRef(false);

  useEffect(() => {
    if (trackedRef.current) return;

    const session = getSessionState();
    const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
    const diagnosisType =
      params.get("diagnosisType") || session?.diagnosisType || session?.lastResult?.diagnosisType || session?.lastResult?.theme || "";
    const price = params.get("price") || "";
    const sessionId = session?.sessionId || "unknown";

    trackEvent("purchase_completed", {
      theme: session?.lastResult?.theme,
      cardId: session?.lastResult?.card?.id,
      meta: {
        sessionId,
        diagnosisType,
        price,
        source: "note"
      }
    });

    trackedRef.current = true;
  }, []);

  return (
    <PageFrame>
      <section className="rounded-[2rem] border border-rose-100 bg-white p-5 shadow-[0_20px_56px_rgba(148,163,184,0.2)]">
        <p className="text-xs tracking-[0.2em] text-slate-500">PREMIUM COMPLETE</p>
        <h1 className="mt-2 font-serif-jp text-2xl text-slate-700">購入ありがとうございます</h1>
        <p className="mt-3 text-sm leading-7 text-slate-600">
          ご購入を確認しました。結果ページに戻って、恋の流れの解釈を続けてください。
        </p>

        <div className="mt-6 grid gap-2">
          <button
            type="button"
            className="w-full rounded-full border border-slate-200 bg-slate-700 px-5 py-3 text-sm text-white"
            onClick={() => router.push("/result")}
          >
            結果画面へ戻る
          </button>
          <button
            type="button"
            className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600"
            onClick={() => router.push("/")}
          >
            トップへ戻る
          </button>
        </div>
      </section>
    </PageFrame>
  );
}
