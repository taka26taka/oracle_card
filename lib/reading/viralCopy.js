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

export const buildActionTip = (theme, diagnosisType) => {
  const key = diagnosisType || theme;
  const tips = {
    mutual: ["次の連絡は質問を一つだけにして、文量を半分にする", "会う約束は広げず、候補日を1つだけ送る"],
    waiting_love: ["今日は追い連絡を止めて、明日同じ時間に一通だけ送る", "不安のまま送らず、20分置いてから短文に直す"],
    waiting_contact: ["未読の間は追加送信しない。24時間後に一行だけ送る", "返信を求める文を削って、要件だけ残す"],
    unrequited: ["長文を避けて、近況共有を一つだけ送る", "会話を終える一文を先に決めて、引き際を作る"],
    reconciliation: ["復縁の話題は出さず、短い近況だけ送る", "深夜の連絡を避けて、相手の生活時間に合わせる"]
  };

  return pick(tips[key] || tips.waiting_contact);
};

export const buildAfterglowLine = (_card, theme, diagnosisType) => {
  const fallbackLines = {
    mutual: ["返信速度より、会ったときの空気が答えになります。", "距離は、静かなやり取りの積み重ねで変わります。"],
    waiting_love: ["沈黙の直後ほど、言葉の温度差が見えます。", "動かない夜は、タイミングを整える時間です。"],
    waiting_contact: ["未読の長さと、気持ちの大きさは同じではありません。", "連絡は、間を取った一言から戻ることがあります。"],
    unrequited: ["焦りを抑えた連絡ほど、次の会話につながります。", "距離がある時期は、言葉の量より質が効きます。"],
    reconciliation: ["復縁は、沈黙を挟みながら少しずつ戻ります。", "結論より先に、話せる距離を作る段階です。"]
  };
  const key = diagnosisType || theme;
  return pick(fallbackLines[key] || fallbackLines.waiting_contact);
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
