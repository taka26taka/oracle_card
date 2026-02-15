# やさしいAIオラクルカード

初心者向けのシンプルな 1 枚引きオラクルカードサイトです。  
Next.js(App Router) で構築し、スマホ表示を前提に、余白を活かした軽いスピリチュアルトーンのUIで整えています。

## 成果物の範囲

- 20 枚のカードデータ
- 1 枚引き（ランダム）
- カード名/カード画像の表示
- OpenAI API による日本語メッセージ生成（150〜200文字）
- APIキー未設定時のフォールバック文表示
- X シェアボタン
- Vercel デプロイ可能構成

## 技術スタック

- Next.js 14 (App Router)
- React 18
- Tailwind CSS (CDN版 `cdn.tailwindcss.com` を利用)
- Node.js 18+ 推奨

## ディレクトリ構成

```text
app/
  api/reading/route.js      # 占いメッセージ API
  api/events/route.js       # イベント受信 API
  deep/page.js              # deep画面エントリ
  draw/page.js              # 1枚引き画面
  globals.css               # ベーススタイル/背景/フォント
  layout.js                 # メタ情報/viewport/Tailwind CDN読み込み
  page.js                   # トップ画面（診断4択）
  premium/intro/page.jsx    # 有料導線紹介ページ
  result/page.js            # 結果画面エントリ
components/
  deep/DeepPageClient.jsx
  premium/PremiumCtaCard.jsx
  premium/PremiumDiffTable.jsx
  premium/PremiumIntroPageClient.jsx
  result/ResultPageClient.jsx
  ui/PageFrame.jsx
data/
  cards.json                # 20枚カードデータ
lib/
  ai/oracleMessage.js       # AI生成ロジック
  analytics/trackEvent.js   # イベント送信
  cards.js                  # カード読み込み/画像生成/ランダム抽選
  reading/generateViralTitle.js
  reading/viralCopy.js
  session/oracleSession.js  # localStorage状態管理
docs/
  review-spec.md            # AI実装レビュー仕様書
```

## ドキュメント

- レビュー仕様書: `docs/review-spec.md`
- プロジェクト全体マップ: `docs/project-map.md`
- アーキテクチャ概要: `docs/architecture-overview.md`
- システム全体像: `docs/system-overview.md`
- ファイルマップ: `docs/file-map.md`
- 編集ルール: `docs/edit-rules.md`
- state設計: `docs/state-design.md`
- 収益導線: `docs/monetization-flow.md`
- 編集ガイド: `docs/how-to-edit.md`
- 内部レビュー: `docs/codex-review.md`

## セットアップ

```bash
npm install
cp .env.example .env.local
```

`.env.local` を設定:

```bash
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
OPENAI_MAX_OUTPUT_TOKENS=260
```

## ローカル起動

```bash
npm run dev
```

アクセス: `http://localhost:3000`

## スタイリング補足

- UIはTailwindユーティリティクラス中心で実装しています。
- 本リポジトリはビルド依存を増やさないため、`app/layout.js` で Tailwind CDN を読み込む構成です。

## ビルド確認

```bash
npm run build
npm run start
```

## Vercel デプロイ

1. GitHub に push
2. Vercel でこのリポジトリを Import
3. Environment Variables に以下を設定
   - `OPENAI_API_KEY` (必須)
   - `OPENAI_MODEL` (任意)
   - `OPENAI_MAX_OUTPUT_TOKENS` (任意)
4. Deploy

`OPENAI_API_KEY` 未設定時でも API はフォールバックメッセージを返すため、画面確認は可能です。

## 補足

- 機能追加は行わず、構成分離と運用しやすさを優先して整理しています。
- カード画像は実ファイルを持たず、SVG を動的生成しています。
