export const THEME_LABELS = {
  mutual: "両想い",
  waiting_love: "待ってる恋",
  waiting_contact: "連絡待ち",
  unrequited: "片思い",
  reconciliation: "復縁"
};

export const THEME_TAGS = {
  mutual: ["#恋愛オラクル", "#両想い"],
  waiting_love: ["#恋愛オラクル", "#待ってる恋"],
  waiting_contact: ["#恋愛オラクル", "#連絡待ち"],
  unrequited: ["#恋愛オラクル", "#片思い"],
  reconciliation: ["#恋愛オラクル", "#復縁したい"]
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

export const buildActionTip = (theme) => {
  const tips = {
    mutual: ["安心しすぎず、あなたから先にやさしい一言を届ける", "今夜は感謝を短く伝えて関係を温める"],
    waiting_love: ["返信を待つ間、スマホを伏せて3分だけ深呼吸する", "気持ちを一行だけメモして、焦りを外に出す"],
    waiting_contact: ["送る前に10分置いて、やさしい一文だけ残す", "今夜は連絡確認の回数を3回までにする"],
    unrequited: ["相手ではなく、今日の自分を褒める言葉をひとつ書く", "背筋を伸ばして、会えたときの笑顔を先に作る"],
    reconciliation: ["思い出よりも、今の自分が変わった点を1つ整理する", "今夜は責めない言葉で下書きを作っておく"]
  };

  return pick(tips[theme] || tips.waiting_love);
};

export const buildAfterglowLine = (card, theme) => {
  const lines = card?.afterglowLines?.[theme] || card?.afterglowLines?.default;
  if (lines?.length) return pick(lines);
  return "夜が深いほど、あなたの本音はやさしく澄んでいきます。";
};

export const buildQuoteLine = ({ title, theme, diagnosisType, cardName }) => {
  const key = diagnosisType || theme;
  const label = THEME_LABELS[key] || "恋";

  const lines = {
    mutual: [
      "この恋、もう気づいてるのは私だけじゃない",
      "近づいていい恋だって、ちゃんと出た"
    ],
    waiting_love: [
      "止まって見える恋ほど、静かに動いてる",
      "待つ時間に意味があるって出た"
    ],
    waiting_contact: [
      "来ない連絡にも、答えは隠れてる",
      "連絡がない夜ほど、焦らないでって出た"
    ],
    unrequited: [
      "片思いでも、終わりとは出なかった",
      "この気持ち、まだ手放さなくていい"
    ],
    reconciliation: [
      "復縁は無理じゃない、ただ順番がある",
      "戻るより、結び直す恋だって出た"
    ]
  };

  const seeded = lines[key];
  if (seeded?.length) return pick(seeded);
  if (title) return `「${title}」って、${label}の答えだった。`;
  if (cardName) return `${cardName}が、今の${label}に触れた。`;
  return "この恋、終わってないって出た。";
};

export const buildShareText = ({ template = "short", title, message, cardName, theme, diagnosisType, afterglowLine, shareHooks }) => {
  const tags = (THEME_TAGS[theme] || ["#恋愛オラクル"]).join(" ");
  const hook = Array.isArray(shareHooks?.[template]) && shareHooks[template].length ? `${pick(shareHooks[template])}\n` : "";
  const quoteLine = buildQuoteLine({ title, theme, diagnosisType, cardName });
  const diagnosisLabel = THEME_LABELS[diagnosisType || theme] || THEME_LABELS[theme] || "恋愛";

  if (template === "emotional") {
    return `${hook}${title}\n${message}\n${cardName}\n${tags}`;
  }

  if (template === "night") {
    return `${hook}夜に効く一枚でした。\n${title}\n${afterglowLine}\n${tags}`;
  }

  if (template === "diagnosis_label") {
    return `${hook}診断: ${diagnosisLabel}\n${quoteLine}\n${cardName}\n${tags}`;
  }

  if (template === "quote_reply") {
    return `${hook}「${quoteLine}」\nこの一行を置いておきます。\n${tags}`;
  }

  return `${hook}${title}\n${cardName}\n${tags}`;
};

export const toDateText = (isoText) => {
  const date = isoText ? new Date(isoText) : new Date();
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}.${m}.${d}`;
};
