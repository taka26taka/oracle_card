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

const BANNED_TERMS = ["前向きに", "運気上昇", "あなたならできる", "新しい出会い", "ポジティブ"];

const DIAGNOSIS_TEMPLATES = {
  mutual: {
    core: ["この恋は、言葉より先に温度がそろい始めています。", "距離はもう、縮まる側に傾いています。"],
    situation: [
      "未読の時間があっても、関係そのものが後退しているサインではありません。返信の速さより、会ったときの目線と会話の長さに現実の温度差が出ます。",
      "連絡の頻度に小さな波があっても、切れたわけではありません。あなたが不安になった直後ほど、相手はタイミングを測っていることがあります。"
    ],
    action: ["次の連絡は短く、質問をひとつだけ添える。", "返信前に10分置いて、要点だけを一通で送る。"],
    afterglow: ["沈黙が続いても、関係の手応えは会う直前に戻ります。", "急がない一言が、ふたりの距離をいちばん動かします。"]
  },
  waiting_love: {
    core: ["止まって見える恋ほど、裏側では調整が進んでいます。", "この沈黙は終わりではなく、間合いを測る時間です。"],
    situation: [
      "未読が長い日は、気持ちより生活リズムの乱れが原因なことが多いです。返信が来ない理由を恋の価値に直結させると、温度差だけが広がります。",
      "連絡が途切れる局面では、相手も言葉選びに迷っています。関係を戻す鍵は、結論を急がずタイミングをずらして話題を軽くすることです。"
    ],
    action: ["今夜は追撃せず、明日の同じ時間に一通だけ送る。", "送る文面を20文字削って、近況ひとつに絞る。"],
    afterglow: ["間を空けた連絡のほうが、相手の反応は戻りやすいです。", "先に整えるべきなのは結論ではなく、言葉の温度です。"]
  },
  waiting_contact: {
    core: ["来ない連絡には、感情よりタイミングの問題が混ざっています。", "未読の長さだけで、恋の行方は決まりません。"],
    situation: [
      "既読がつかない時間は、あなたへの拒否より単純な後回しであることが多いです。温度差を埋めるには、重い確認より短い導線が有効です。",
      "沈黙が長引くほど不安は強くなりますが、連絡回数を増やすほど距離が広がる局面があります。今は内容より送るタイミングが優先です。"
    ],
    action: ["催促は止めて、返信しやすい質問を一つだけ送る。", "24時間空けてから、要件を一行で送る。"],
    afterglow: ["連絡の回復は、量より間合いで決まります。", "沈黙のあとに残るのは、短く整った言葉です。"]
  },
  unrequited: {
    core: ["片思いは、動く日と止まる日の差が大きいだけです。", "届かない時間が続いても、関係はそこで固定されません。"],
    situation: [
      "会話の盛り上がりと返事の遅さが同時にあるとき、相手側にも迷いがあります。温度差を埋めるには、好意の強さより接点の作り方が重要です。",
      "沈黙が続くと自分だけが追っている感覚になりますが、相手は距離感を崩さないように慎重になっている可能性があります。"
    ],
    action: ["次の連絡は相談ではなく、近況共有を一つ送る。", "会話を終える一文を先に用意して、長引かせない。"],
    afterglow: ["追いすぎない姿勢が、次の接点を作ります。", "関係が動く前は、返信速度より会話の質が先に変わります。"]
  },
  reconciliation: {
    core: ["復縁は、謝罪より再接続の順番で決まります。", "戻るかどうかより、話せる状態を先に作る段階です。"],
    situation: [
      "連絡を再開した直後は、過去の整理より現在の温度差が出やすいです。未読や短文は拒絶ではなく、警戒を残したまま様子を見ている反応です。",
      "復縁の初期は沈黙が何度か入ります。焦って結論を取りに行くと距離が戻るので、タイミングをずらして軽い話題を挟む方が現実的です。"
    ],
    action: ["過去の話は出さず、次の連絡は短い近況だけにする。", "連絡は夜遅くを避け、相手の生活時間に合わせる。"],
    afterglow: ["復縁は大きな言葉より、小さく続く連絡で進みます。", "関係の再開は、沈黙を挟みながらでも前に進みます。"]
  }
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const resolveKey = (diagnosisType, theme) => diagnosisType || theme || "waiting_contact";

const applyDeepFocus = (situation, deepFocusLabel) => {
  if (!deepFocusLabel) return situation;
  return `${situation} いまは「${deepFocusLabel}」の視点で読み直すと、判断を急がずに済みます。`;
};

const hasBannedTerms = (text) => BANNED_TERMS.some((word) => text.includes(word));

const buildStructuredFallback = ({ cardName, diagnosisType, theme, deepFocusLabel }) => {
  const key = resolveKey(diagnosisType, theme);
  const base = DIAGNOSIS_TEMPLATES[key] || DIAGNOSIS_TEMPLATES.waiting_contact;
  const core = `${pick(base.core)} ${cardName}がその傾向を強めています。`;
  const situation = applyDeepFocus(pick(base.situation), deepFocusLabel);
  const actionTip = pick(base.action);
  const afterglowLine = pick(base.afterglow);
  const message = `${core} ${situation}`;
  return { message, actionTip, afterglowLine };
};

const normalizeMessage = (text, fallbackMessage) => {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned || cleaned.length < 80 || hasBannedTerms(cleaned)) return fallbackMessage;
  return cleaned.slice(0, 260);
};

const normalizeShortField = (text, fallbackValue, maxLen = 80) => {
  const cleaned = (text || "").replace(/\s+/g, " ").trim();
  if (!cleaned || hasBannedTerms(cleaned)) return fallbackValue;
  return cleaned.slice(0, maxLen);
};

const parseStructuredText = (text) => {
  const rows = (text || "")
    .split(/\r?\n/)
    .map((row) => row.replace(/^\s*[1-4１-４][\.\):：\-\s]*/, "").trim())
    .filter(Boolean);

  if (rows.length >= 4) {
    return {
      message: `${rows[0]} ${rows[1]}`,
      actionTip: rows[2],
      afterglowLine: rows[3]
    };
  }

  const sections = (text || "").split("||").map((row) => row.trim()).filter(Boolean);
  if (sections.length >= 4) {
    return {
      message: `${sections[0]} ${sections[1]}`,
      actionTip: sections[2],
      afterglowLine: sections[3]
    };
  }

  return null;
};

const buildPrompt = (cardName, themeLabel, diagnosisLabel, deepFocusLabel) => {
  const contextLines = [];
  if (themeLabel) contextLines.push(`テーマ: ${themeLabel}`);
  if (diagnosisLabel) contextLines.push(`恋愛状態診断: ${diagnosisLabel}`);
  if (deepFocusLabel) contextLines.push(`深掘り視点: ${deepFocusLabel}`);

  return [
    "あなたは恋愛相談コラムの編集者です。",
    "20-35歳女性向けに、静かで現実的な恋愛文脈で書いてください。",
    "出力ルール:",
    "- 4行固定で出力",
    "- 1行目: 核心1文（短く刺さる）",
    "- 2行目: 状況読み（未読/距離/温度差/タイミング/連絡/復縁/沈黙の語彙を優先）",
    "- 3行目: 行動1つ（具体）",
    "- 4行目: 余韻1文（静かな締め）",
    "- 励まし系やスピリチュアル表現は禁止",
    "- 禁止語: 前向きに / 運気上昇 / あなたならできる / 新しい出会い / ポジティブ",
    "- 絵文字、記号連打、Markdown禁止",
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
  const fallback = buildStructuredFallback({ cardName, diagnosisType, theme, deepFocusLabel });

  if (!apiKey) {
    return {
      ...fallback,
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
      ...fallback,
      fallback: true,
      reason: "openai_error",
      detail
    };
  }

  const data = await response.json();
  const output = extractOutputText(data);
  const structured = parseStructuredText(output);

  return {
    message: normalizeMessage(structured?.message || output, fallback.message),
    actionTip: normalizeShortField(structured?.actionTip, fallback.actionTip),
    afterglowLine: normalizeShortField(structured?.afterglowLine, fallback.afterglowLine),
    fallback: false
  };
};
