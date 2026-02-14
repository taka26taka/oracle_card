const CARD_DEFINITIONS = [
  { id: 1, name: "朝露のはじまり", key: "new_start" },
  { id: 2, name: "月光の休息", key: "rest" },
  { id: 3, name: "小鳥のさえずり", key: "communication" },
  { id: 4, name: "やわらかな風", key: "change" },
  { id: 5, name: "ひだまりの約束", key: "trust" },
  { id: 6, name: "静かな湖面", key: "inner_voice" },
  { id: 7, name: "花びらの贈り物", key: "gratitude" },
  { id: 8, name: "虹のしずく", key: "healing" },
  { id: 9, name: "星屑の地図", key: "purpose" },
  { id: 10, name: "やすらぎの毛布", key: "self_care" },
  { id: 11, name: "森のコンパス", key: "direction" },
  { id: 12, name: "白い羽の知らせ", key: "support" },
  { id: 13, name: "灯りのともる窓", key: "home" },
  { id: 14, name: "雲間のひかり", key: "hope" },
  { id: 15, name: "小さな種", key: "growth" },
  { id: 16, name: "青空の深呼吸", key: "release" },
  { id: 17, name: "波音のリズム", key: "balance" },
  { id: 18, name: "金色の鍵", key: "opportunity" },
  { id: 19, name: "風船の手紙", key: "joy" },
  { id: 20, name: "祈りのキャンドル", key: "faith" }
];

const COLOR_PALETTES = [
  ["#f9f7ff", "#efe8ff", "#e2f1ff"],
  ["#fff8f2", "#ffece0", "#ffe0f3"],
  ["#f4fff8", "#dff8ea", "#d9eefc"],
  ["#fffdf5", "#f7f2ff", "#e6f7ff"],
  ["#f8fbff", "#e7f0ff", "#f8e9ff"]
];

const splitName = (name) => {
  if (name.length <= 7) return [name];
  const middle = Math.floor(name.length / 2);
  return [name.slice(0, middle), name.slice(middle)];
};

const createCardImage = (name, index) => {
  const [c1, c2, c3] = COLOR_PALETTES[index % COLOR_PALETTES.length];
  const lines = splitName(name);
  const text = lines
    .map(
      (line, i) =>
        `<text x="50%" y="${50 + i * 12}%" text-anchor="middle" fill="#5f6b7a" font-size="16" font-family="'Hiragino Sans', sans-serif">${line}</text>`
    )
    .join("");

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 460">
    <defs>
      <linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${c1}" />
        <stop offset="50%" stop-color="${c2}" />
        <stop offset="100%" stop-color="${c3}" />
      </linearGradient>
    </defs>
    <rect x="10" y="10" rx="24" ry="24" width="300" height="440" fill="url(#g)" stroke="#dde4ef" stroke-width="2" />
    <circle cx="160" cy="140" r="46" fill="#ffffff" opacity="0.58" />
    <path d="M160 100 L170 132 L205 132 L176 152 L186 184 L160 164 L134 184 L144 152 L115 132 L150 132 Z" fill="#ffffff" opacity="0.75" />
    ${text}
  </svg>`;

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};

export const ORACLE_CARDS = CARD_DEFINITIONS.map((card, index) => ({
  ...card,
  image: createCardImage(card.name, index)
}));

export const pickRandomCard = () => {
  const randomIndex = Math.floor(Math.random() * ORACLE_CARDS.length);
  return ORACLE_CARDS[randomIndex];
};
