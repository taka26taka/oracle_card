const EMOTION_WORDS = {
  mutual: ["通じ合う予感", "重なり始めた気持ち", "やわらかく近づく距離"],
  waiting_love: ["止まっていた恋", "揺れていた気持ち", "言えないままの想い"],
  waiting_contact: ["来ない連絡", "既読の沈黙", "あなたを待つ夜"],
  unrequited: ["片思いの熱", "届かない言葉", "遠いままの距離"],
  reconciliation: ["ほどけた縁", "戻れないはずの恋", "忘れたふりの気持ち"],
  default: ["言葉にならない想い", "あなたの中の恋", "静かな予感"]
};

const TURN_WORDS = {
  sad: ["に、少しだけ余白が生まれる", "が、今夜だけほどけていく", "にも、やわらかな兆しが差す"],
  quiet: ["は、まだ終わっていない", "に、そっと意味が灯る", "は、静かに動き始める"],
  positive: ["が、次の一歩へ変わる", "に、小さな追い風が吹く", "は、あなたの味方になる"]
};

const TIME_WORDS = {
  tonight: ["今夜", "この夜", "夜の終わりに"],
  tomorrow: ["明日", "明日の朝", "明日へ向かう途中で"]
};

const pick = (list) => list[Math.floor(Math.random() * list.length)];

const clampLength = (text) => {
  if (text.length <= 28 && text.length >= 18) return text;
  if (text.length > 28) return text.slice(0, 27);

  return `${text}、あなたへ`;
};

export const generateViralTitle = ({ theme, tone = "quiet", timeHint = "tonight", seeds = [] }) => {
  const emotionPool = Array.isArray(seeds) && seeds.length ? seeds : EMOTION_WORDS[theme] || EMOTION_WORDS.default;
  const emotion = pick(emotionPool);
  const turn = pick(TURN_WORDS[tone] || TURN_WORDS.quiet);
  const time = pick(TIME_WORDS[timeHint] || TIME_WORDS.tonight);

  const base = `${emotion}${turn}。${time}、あなたへ。`;
  return clampLength(base);
};
