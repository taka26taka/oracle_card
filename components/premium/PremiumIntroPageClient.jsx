"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessionState } from "../../lib/session/oracleSession";
import { trackEvent } from "../../lib/analytics/trackEvent";
import PageFrame from "../ui/PageFrame";
import PremiumDiffTable from "./PremiumDiffTable";

const CHECKOUT_URL = process.env.NEXT_PUBLIC_CHECKOUT_URL || "";

export default function PremiumIntroPageClient() {
  const router = useRouter();
  const ready = Boolean(CHECKOUT_URL);

  useEffect(() => {
    const session = getSessionState();
    if (!session?.lastResult?.card?.id) {
      router.replace("/");
      return;
    }

    trackEvent("premium_intro_viewed", {
      theme: session.lastResult.theme,
      cardId: session.lastResult.card.id
    });
  }, [router]);

  const onCheckoutClick = () => {
    if (!ready) return;
    const session = getSessionState();
    trackEvent("premium_checkout_clicked", {
      theme: session?.lastResult?.theme,
      cardId: session?.lastResult?.card?.id
    });
  };

  return (
    <PageFrame>
      <section className="rounded-[2rem] border border-rose-100 bg-white p-5 shadow-[0_20px_56px_rgba(148,163,184,0.2)]">
        <p className="text-xs tracking-[0.2em] text-slate-500">PREMIUM INTRO</p>
        <h1 className="mt-2 font-serif-jp text-2xl text-slate-700">3枚で恋の流れを見る</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          無料の1枚リーディングより深く、過去・現在・未来の流れをあなた専用に整理します。
        </p>

        <PremiumDiffTable />

        {ready ? (
          <a
            className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-slate-700 px-5 py-3 text-sm text-white"
            href={CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onCheckoutClick}
          >
            noteで購入して続きを読む
          </a>
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
