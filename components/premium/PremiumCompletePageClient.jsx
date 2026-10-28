"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { clearCheckoutAttempt, getSessionState, grantPremiumAccess } from "../../lib/session/oracleSession";
import { trackEvent } from "../../lib/analytics/trackEvent";
import { EVENT_NAMES, PAGE_NAMES } from "../../lib/analytics/events";
import PageFrame from "../ui/PageFrame";

export default function PremiumCompletePageClient() {
  const router = useRouter();
  const [status, setStatus] = useState("checking");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setStatus("checking");

    const session = getSessionState();
    const params = typeof window === "undefined" ? new URLSearchParams() : new URLSearchParams(window.location.search);
    const attemptId = params.get("attemptId") || session?.checkoutAttempt?.attemptId || "";
    const diagnosisType =
      params.get("diagnosisType") || session?.diagnosisType || session?.lastResult?.diagnosisType || session?.lastResult?.theme || "";
    const price = params.get("price") || "";
    const sessionId = session?.sessionId || "unknown";

    trackEvent(EVENT_NAMES.PAGE_VIEW, { meta: { page: PAGE_NAMES.PREMIUM_COMPLETE } });
    if (!attemptId) { setStatus("unverified"); return; }

    fetch("/api/purchase/complete", {
      method: "POST",
      signal: controller.signal,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        attemptId,
        sessionId,
        diagnosisType,
        price,
        source: params.get("source") || "note",
        theme: session?.lastResult?.theme,
        cardId: session?.lastResult?.card?.id
      })
    })
      .then((res) => {
        if (!active) return;
        if (res.ok) {
          setStatus("verified");
          grantPremiumAccess({
            attemptId,
            source: params.get("source") || "note"
          });
          clearCheckoutAttempt();
        } else {
          setStatus("unverified");
        }
      })
      .catch(() => {
        if (active) setStatus("error");
      });
    return () => { active = false; controller.abort(); };
  }, [retry]);

  return (
    <PageFrame>
      <section className="rounded-[2rem] border border-rose-100 bg-white p-5 shadow-[0_20px_56px_rgba(148,163,184,0.2)]">
        <p className="text-xs tracking-[0.2em] text-slate-500">PREMIUM COMPLETE</p>
        <h1 className="mt-2 font-serif-jp text-2xl text-slate-700">{status === "verified" ? "購入ありがとうございます" : "購入状況の確認"}</h1>
        <p role={status === "error" ? "alert" : "status"} className="mt-3 text-sm leading-7 text-slate-600">
          {status === "verified" ? "ご購入を確認しました。3枚リーディングへ進めます。"
            : status === "checking" ? "購入情報を確認しています..."
              : status === "error" ? "確認に失敗しました。時間をおいて再度お試しください。"
                : "購入の確認がまだできていません。決済後、少し待ってから再確認してください。"}
        </p>

        <div className="mt-6 grid gap-2">
          {["error", "unverified"].includes(status) && <button type="button" onClick={() => setRetry((value) => value + 1)} className="rounded-full border border-slate-200 px-5 py-3 text-sm">購入状況を再確認する</button>}
          <button
            type="button"
            className="w-full rounded-full border border-slate-200 bg-slate-700 px-5 py-3 text-sm text-white"
            onClick={() => router.push("/premium/reading")}
            disabled={status !== "verified"}
          >
            3枚リーディングを見る
          </button>
          <button
            type="button"
            className="w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600"
            onClick={() => router.push("/result")}
          >
            無料結果へ戻る
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
