import { NextResponse } from "next/server";

const buildFallbackMessage = (cardName) => {
  const text = `${cardName}のカードが示すのは、焦らなくても大丈夫というサインです。今日は結果を急ぐより、深呼吸して自分の気持ちをやさしく整えてみてください。小さな一歩でも、あなたの歩みはちゃんと前に進んでいます。`;
  return text.slice(0, 200);
};

const normalizeMessage = (text, cardName) => {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned) return buildFallbackMessage(cardName);
  if (cleaned.length < 150) {
    return buildFallbackMessage(cardName);
  }
  if (cleaned.length > 200) {
    return cleaned.slice(0, 200);
  }
  return cleaned;
};

export async function POST(request) {
  try {
    const body = await request.json();
    const cardName = body?.cardName;

    if (!cardName) {
      return NextResponse.json({ error: "cardName is required" }, { status: 400 });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ message: buildFallbackMessage(cardName), fallback: true });
    }

    const prompt = [
      "あなたはやさしいオラクルカード占い師です。",
      "日本語で、初心者向けに安心できるメッセージを作成してください。",
      "条件:",
      "- 150〜200文字",
      "- やわらかく癒し系の口調",
      "- 断定しすぎず、前向きで穏やかな助言",
      "- 絵文字・記号の連発・Markdownは使わない",
      `カード名: ${cardName}`
    ].join("\n");

    const openaiResponse = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        input: prompt,
        temperature: 0.9,
        max_output_tokens: 260
      })
    });

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      return NextResponse.json(
        { message: buildFallbackMessage(cardName), fallback: true, detail: errorText },
        { status: 200 }
      );
    }

    const data = await openaiResponse.json();
    const modelText =
      data?.output_text ||
      data?.output
        ?.flatMap((item) => item.content || [])
        ?.filter((item) => item.type === "output_text")
        ?.map((item) => item.text)
        ?.join(" ");

    const message = normalizeMessage(modelText, cardName);
    return NextResponse.json({ message, fallback: false });
  } catch {
    return NextResponse.json({ error: "failed_to_generate_message" }, { status: 500 });
  }
}
