"use client";

import { useMemo, useState } from "react";
import { ORACLE_CARDS } from "../lib/cards";

const randomCard = () => ORACLE_CARDS[Math.floor(Math.random() * ORACLE_CARDS.length)];

export default function Home() {
  const [card, setCard] = useState(null);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const shareUrl = useMemo(() => {
    if (!card || !message) return "#";
    const text = `${card.name}のカードを引きました。\n${message}\n#AIオラクルカード`;
    return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
  }, [card, message]);

  const drawCard = async () => {
    const newCard = randomCard();
    setCard(newCard);
    setMessage("");
    setLoading(true);

    try {
      const res = await fetch("/api/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardName: newCard.name, cardKey: newCard.key })
      });

      const data = await res.json();
      setMessage(data?.message || "今はゆっくり休み、心の声を優しく聞いてみましょう。");
    } catch {
      setMessage("今はゆっくり休み、心の声を優しく聞いてみましょう。");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <section className="container">
        <h1 className="title">やさしいAIオラクルカード</h1>
        <p className="subtitle">気持ちを整えたいときに、そっと一枚。</p>

        {!card && (
          <button className="primaryButton" onClick={drawCard}>
            カードを引く
          </button>
        )}

        {card && (
          <article className="result">
            <h2 className="cardName">{card.name}</h2>
            <img className="cardImage" src={card.image} alt={`${card.name}のカード画像`} />

            <p className="message">
              {loading ? "メッセージを受け取っています..." : message}
            </p>

            <div className="actions">
              <a
                className={`shareButton ${!message || loading ? "disabled" : ""}`}
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                aria-disabled={!message || loading}
              >
                Xでシェア
              </a>
              <button className="secondaryButton" onClick={drawCard}>
                もう一度引く
              </button>
            </div>
          </article>
        )}
      </section>
    </main>
  );
}
