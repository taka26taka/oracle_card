"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSessionState, setThreeCardResult } from "../../lib/session/oracleSession";
import { trackEvent } from "../../lib/analytics/trackEvent";
import { EVENT_NAMES, PAGE_NAMES } from "../../lib/analytics/events";
import PageFrame from "../ui/PageFrame";

export default function PremiumReadingPageClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    const session = getSessionState();
    if (!session?.lastResult?.card?.id) {
      router.replace("/");
      return;
    }
    const premiumAttemptId = session?.premiumAccess?.attemptId || "";
    if (!premiumAttemptId) {
      router.replace("/premium/intro?reason=premium_access_required");
      return;
    }

    trackEvent(EVENT_NAMES.PAGE_VIEW, { meta: { page: PAGE_NAMES.PREMIUM_READING } });
    trackEvent(EVENT_NAMES.PREMIUM_READING_VIEWED, {
      theme: session?.lastResult?.theme,
      cardId: session?.lastResult?.card?.id
    });

    if (session?.threeCardResult?.cards?.length === 3) {
      setResult(session.threeCardResult);
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const res = await fetch("/api/premium/three-card", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            attemptId: premiumAttemptId,
            diagnosisType: session?.lastResult?.diagnosisType || session?.diagnosisType || "",
            theme: session?.lastResult?.theme || session?.diagnosisType || ""
          })
        });
        const data = await res.json();
        if (res.status === 403 && data?.error === "premium_access_required") {
          if (active) router.replace("/premium/intro?reason=premium_access_required");
          return;
        }
        if (!res.ok || !data?.result) throw new Error("failed");
        if (!active) return;

        setResult(data.result);
        setThreeCardResult(data.result);
        trackEvent(EVENT_NAMES.PREMIUM_THREE_CARD_GENERATED, {
          theme: session?.lastResult?.theme,
          cardId: session?.lastResult?.card?.id
        });
      } catch {
        if (!active) return;
        setError("読み込みに失敗しました。時間をおいて再度お試しください。");
      } finally {
        if (active) setLoading(false);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <PageFrame width="max-w-[420px]">
      <section className="rounded-[2rem] border border-rose-100 bg-white p-5 shadow-[0_20px_56px_rgba(148,163,184,0.2)]">
        <p className="text-xs tracking-[0.2em] text-slate-500">PREMIUM READING</p>
        <h1 className="mt-2 font-serif-jp text-2xl text-slate-700">3枚で恋の流れを見る</h1>

        {loading && <p className="mt-4 text-sm text-slate-500">3枚リーディングを生成しています...</p>}
        {!loading && error && <p className="mt-4 rounded-xl bg-rose-50 px-3 py-3 text-sm text-rose-600">{error}</p>}

        {!loading && !error && result && (
          <>
            <p className="mt-2 text-sm text-slate-600">{result.summary}</p>
            <div className="mt-4 grid gap-3">
              {result.cards.map((item) => (
                <article key={item.position} className="rounded-2xl border border-slate-200 bg-slate-50/50 p-4">
                  <p className="text-xs tracking-[0.16em] text-slate-500">{item.positionLabel}</p>
                  <p className="mt-1 font-serif-jp text-lg text-slate-700">{item.card.name}</p>
                  <p className="mt-2 text-sm leading-7 text-slate-600">{item.message}</p>
                  <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm text-slate-700">行動: {item.actionTip}</p>
                  <p className="mt-2 text-sm text-slate-500">余韻: {item.afterglowLine}</p>
                </article>
              ))}
            </div>

            <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50/60 px-3 py-3">
              <p className="text-xs tracking-[0.16em] text-slate-500">今週の1手</p>
              <p className="mt-1 text-sm text-slate-700">{result.weeklyAction || "一番短く実行できる行動から始めてください。"}</p>
            </div>
          </>
        )}

        <div className="mt-5 grid gap-2">
          <button
            type="button"
            className="w-full rounded-full border border-slate-200 bg-slate-700 px-5 py-3 text-sm text-white"
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
