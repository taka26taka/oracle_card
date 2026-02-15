"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { getSessionState } from "../../../lib/session/oracleSession";
import { trackEvent } from "../../../lib/analytics/trackEvent";

const CHECKOUT_URL = "仮";

export default function PremiumIntroPage() {
  const router = useRouter();

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
    const session = getSessionState();
    trackEvent("premium_checkout_clicked", {
      theme: session?.lastResult?.theme,
      cardId: session?.lastResult?.card?.id
    });
  };

  return (
    <main className="min-h-dvh px-4 pb-[calc(1.6rem+env(safe-area-inset-bottom))] pt-[calc(1.6rem+env(safe-area-inset-top))]">
      <section className="mx-auto w-full max-w-md rounded-[2rem] border border-rose-100 bg-white p-5 shadow-[0_20px_56px_rgba(148,163,184,0.2)]">
        <p className="text-xs tracking-[0.2em] text-slate-500">PREMIUM INTRO</p>
        <h1 className="mt-2 font-serif-jp text-2xl text-slate-700">3枚で恋の流れを見る</h1>
        <p className="mt-2 text-sm leading-7 text-slate-600">
          無料の1枚リーディングより深く、過去・現在・未来の流れをあなた専用に整理します。
        </p>

        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          <div className="grid grid-cols-3 bg-slate-100 text-xs text-slate-600">
            <p className="px-3 py-2">項目</p>
            <p className="px-3 py-2">無料</p>
            <p className="px-3 py-2">有料</p>
          </div>
          {[
            ["カード枚数", "1枚", "3枚（過去・現在・未来）"],
            ["視点", "今の示唆", "相手視点まで含む"],
            ["行動", "1つ", "今週の行動プラン"],
            ["内容", "汎用", "あなた専用解析"]
          ].map((row) => (
            <div key={row[0]} className="grid grid-cols-3 border-t border-slate-200 text-xs text-slate-600">
              <p className="px-3 py-2">{row[0]}</p>
              <p className="px-3 py-2">{row[1]}</p>
              <p className="px-3 py-2 text-slate-700">{row[2]}</p>
            </div>
          ))}
        </div>

        <a
          className="mt-5 inline-flex w-full items-center justify-center rounded-full border border-slate-200 bg-slate-700 px-5 py-3 text-sm text-white"
          href={CHECKOUT_URL}
          target="_blank"
          rel="noopener noreferrer"
          onClick={onCheckoutClick}
        >
          noteで購入して続きを読む
        </a>

        <button
          type="button"
          className="mt-2 w-full rounded-full border border-slate-200 bg-white px-5 py-3 text-sm text-slate-600"
          onClick={() => router.push("/result")}
        >
          無料結果へ戻る
        </button>
      </section>
    </main>
  );
}
