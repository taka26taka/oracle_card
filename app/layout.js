import "./globals.css";

export const metadata = {
  title: "やさしいAIオラクルカード",
  description: "スマホで使えるシンプルなAIオラクルカード占い"
};

export default function RootLayout({ children }) {
  return (
    <html lang="ja">
      <body>{children}</body>
    </html>
  );
}
