const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const DEFAULT_MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 260);

export const buildFallbackMessage = (cardName) => {
  const text = `${cardName}のカードが示すのは、焦らなくても大丈夫というサインです。今日は結果を急ぐより、深呼吸して自分の気持ちをやさしく整えてみてください。小さな一歩でも、あなたの歩みはちゃんと前に進んでいます。`;
  return text.slice(0, 200);
};

const normalizeMessage = (text, cardName) => {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length < 150) return buildFallbackMessage(cardName);
  if (cleaned.length > 200) return cleaned.slice(0, 200);
  return cleaned;
};

const buildPrompt = (cardName) =>
  [
    "あなたはやさしいオラクルカード占い師です。",
    "日本語で、初心者向けに安心できるメッセージを作成してください。",
    "条件:",
    "- 150〜200文字",
    "- やわらかく癒し系の口調",
    "- 断定しすぎず、前向きで穏やかな助言",
    "- 絵文字・記号の連発・Markdownは使わない",
    `カード名: ${cardName}`
  ].join("\n");

const extractOutputText = (responseData) =>
  responseData?.output_text ||
  responseData?.output
    ?.flatMap((item) => item.content || [])
    ?.filter((item) => item.type === "output_text")
    ?.map((item) => item.text)
    ?.join(" ");

export const generateOracleMessage = async ({ cardName, apiKey }) => {
  if (!apiKey) {
    return {
      message: buildFallbackMessage(cardName),
      fallback: true,
      reason: "missing_api_key"
    };
  }

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model: DEFAULT_MODEL,
      input: buildPrompt(cardName),
      temperature: 0.9,
      max_output_tokens: DEFAULT_MAX_OUTPUT_TOKENS
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      message: buildFallbackMessage(cardName),
      fallback: true,
      reason: "openai_error",
      detail
    };
  }

  const data = await response.json();
  return {
    message: normalizeMessage(extractOutputText(data), cardName),
    fallback: false
  };
};
