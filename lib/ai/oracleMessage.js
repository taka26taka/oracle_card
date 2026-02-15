const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4.1-mini";
const DEFAULT_MAX_OUTPUT_TOKENS = Number(process.env.OPENAI_MAX_OUTPUT_TOKENS || 260);

const THEME_LABELS = {
  mutual: "両想い",
  waiting_love: "待ってる恋",
  waiting_contact: "連絡待ち",
  unrequited: "片思い",
  reconciliation: "復縁"
};

const DEEP_FOCUS_LABELS = {
  partner_feeling: "相手の気持ち",
  contact_timing: "連絡タイミング",
  reconciliation: "復縁"
};

export const buildFallbackMessage = (cardName, themeLabel, deepFocusLabel) => {
  const context = [themeLabel, deepFocusLabel].filter(Boolean).join(" / ");
  const prefix = context ? `${context}の文脈で、` : "";
  const text = `${cardName}のカードが示すのは、${prefix}焦らなくても大丈夫というサインです。今日は結果を急ぐより、深呼吸して自分の気持ちをやさしく整えてみてください。小さな一歩でも、あなたの歩みはちゃんと前に進んでいます。`;
  return text.slice(0, 200);
};

const normalizeMessage = (text, cardName, themeLabel, deepFocusLabel) => {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length < 150) return buildFallbackMessage(cardName, themeLabel, deepFocusLabel);
  if (cleaned.length > 200) return cleaned.slice(0, 200);
  return cleaned;
};

const buildPrompt = (cardName, themeLabel, diagnosisLabel, deepFocusLabel) => {
  const contextLines = [];
  if (themeLabel) contextLines.push(`テーマ: ${themeLabel}`);
  if (diagnosisLabel) contextLines.push(`恋愛状態診断: ${diagnosisLabel}`);
  if (deepFocusLabel) contextLines.push(`深掘り視点: ${deepFocusLabel}`);

  return [
    "あなたはやさしいオラクルカード占い師です。",
    "日本語で、恋愛文脈の感情コンテンツとして刺さるメッセージを作成してください。",
    "条件:",
    "- 150〜200文字",
    "- やわらかく余韻のある口調",
    "- 断定しすぎず、前向きで穏やかな助言",
    "- 主語は『あなた』を中心にする",
    "- 絵文字・記号の連発・Markdownは使わない",
    `カード名: ${cardName}`,
    ...contextLines
  ].join("\n");
};

const extractOutputText = (responseData) =>
  responseData?.output_text ||
  responseData?.output
    ?.flatMap((item) => item.content || [])
    ?.filter((item) => item.type === "output_text")
    ?.map((item) => item.text)
    ?.join(" ");

export const generateOracleMessage = async ({ cardName, theme, diagnosisType, deepFocus, apiKey }) => {
  const themeLabel = THEME_LABELS[theme] || "";
  const diagnosisLabel = THEME_LABELS[diagnosisType] || "";
  const deepFocusLabel = DEEP_FOCUS_LABELS[deepFocus] || "";

  if (!apiKey) {
    return {
      message: buildFallbackMessage(cardName, themeLabel, deepFocusLabel),
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
      input: buildPrompt(cardName, themeLabel, diagnosisLabel, deepFocusLabel),
      temperature: 0.9,
      max_output_tokens: DEFAULT_MAX_OUTPUT_TOKENS
    })
  });

  if (!response.ok) {
    const detail = await response.text();
    return {
      message: buildFallbackMessage(cardName, themeLabel, deepFocusLabel),
      fallback: true,
      reason: "openai_error",
      detail
    };
  }

  const data = await response.json();
  return {
    message: normalizeMessage(extractOutputText(data), cardName, themeLabel, deepFocusLabel),
    fallback: false
  };
};
