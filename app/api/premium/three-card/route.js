import { NextResponse } from "next/server";
import { generateOracleMessage } from "../../../../lib/ai/oracleMessage";
import { ORACLE_CARDS } from "../../../../lib/cards";

const POSITIONS = [
  { key: "past", label: "過去" },
  { key: "present", label: "現在" },
  { key: "future", label: "未来" }
];

const pickThreeUniqueCards = () => {
  const list = [...ORACLE_CARDS];
  for (let i = list.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list.slice(0, 3);
};

export async function POST(request) {
  try {
    const body = await request.json();
    const diagnosisType = body?.diagnosisType || "";
    const theme = body?.theme || diagnosisType || "waiting_contact";
    const cards = pickThreeUniqueCards();

    const reads = await Promise.all(
      cards.map((card) =>
        generateOracleMessage({
          cardName: card.name,
          theme,
          diagnosisType,
          apiKey: process.env.OPENAI_API_KEY
        })
      )
    );

    const items = cards.map((card, index) => ({
      position: POSITIONS[index].key,
      positionLabel: POSITIONS[index].label,
      card: {
        id: card.id,
        key: card.key,
        name: card.name,
        image: card.image
      },
      message: reads[index]?.message || "",
      actionTip: reads[index]?.actionTip || "",
      afterglowLine: reads[index]?.afterglowLine || ""
    }));

    return NextResponse.json(
      {
        ok: true,
        result: {
          createdAt: new Date().toISOString(),
          diagnosisType,
          theme,
          headline: "3枚で読む、恋の流れ",
          summary: "過去・現在・未来の流れから、今週の一手を具体化しました。",
          weeklyAction: items[1]?.actionTip || items[2]?.actionTip || items[0]?.actionTip || "",
          cards: items
        }
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json({ error: "failed_to_generate_three_card" }, { status: 500 });
  }
}
