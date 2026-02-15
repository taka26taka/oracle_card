import cardDefinitions from "../data/cards.json";

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

export const ORACLE_CARDS = cardDefinitions.map((card, index) => ({
  ...card,
  image: createCardImage(card.name, index)
}));

export const pickRandomCard = () => {
  const randomIndex = Math.floor(Math.random() * ORACLE_CARDS.length);
  return ORACLE_CARDS[randomIndex];
};
