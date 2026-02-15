# File Map

このファイルは「どこを編集すると何が変わるか」を最短で確認するための地図です。

## ラベル
- `Safe to edit`: 比較的安全
- `Need caution`: 依存先を確認して編集
- `High risk`: 導線/KPIを壊しやすい

## Root

### `README.md`
- 役割: プロジェクトの入口説明
- ラベル: `Safe to edit`

### `package.json`
- 役割: スクリプトと依存
- ラベル: `Need caution`

### `.env.example`
- 役割: 必須環境変数の雛形
- 重要: `NEXT_PUBLIC_CHECKOUT_URL`
- ラベル: `Need caution`

### `next.config.mjs` / `jsconfig.json` / `vercel.json`
- 役割: ビルド・import・デプロイ設定
- ラベル: `Need caution`

## app/

### `app/page.js` (`/`)
- 役割: 恋愛状態診断4択
- 出力: `diagnosisType` 保存、`/draw` へ遷移
- ラベル: `High risk`

### `app/draw/page.js` (`/draw`)
- 役割: 1枚抽選と結果作成
- 出力: `lastResult` 保存、`/result` へ遷移
- ラベル: `High risk`

### `app/result/page.js` (`/result`)
- 役割: エントリ（実体は `components/result/ResultPageClient.jsx`）
- ラベル: `Need caution`

### `app/deep/page.js` (`/deep`)
- 役割: エントリ（dynamic importでClient読み込み）
- ラベル: `Need caution`

### `app/premium/intro/page.jsx` (`/premium/intro`)
- 役割: エントリ（実体は `components/premium/PremiumIntroPageClient.jsx`）
- ラベル: `Need caution`

### `app/api/reading/route.js`
- 役割: AIメッセージAPI
- input: `cardName`, `theme`, `diagnosisType?`, `deepFocus?`
- ラベル: `High risk`

### `app/api/events/route.js`
- 役割: イベント受信API
- ラベル: `Need caution`

### `app/layout.js` / `app/globals.css`
- 役割: 共通レイアウトと全体スタイル
- ラベル: `Safe to edit`（レイアウトは注意）

## components/

### `components/result/ResultPageClient.jsx`
- 役割: 結果画面の本体（共有、計測、premium導線）
- ラベル: `High risk`

### `components/deep/DeepPageClient.jsx`
- 役割: deep画面の本体（2回制限、deep API、premium導線）
- ラベル: `High risk`

### `components/premium/PremiumIntroPageClient.jsx`
- 役割: premium案内本体、checkout URL制御
- ラベル: `High risk`

### `components/premium/PremiumCtaCard.jsx`
- 役割: result/deep 共通の有料CTAカード
- ラベル: `Safe to edit`

### `components/premium/PremiumDiffTable.jsx`
- 役割: 無料vs有料の差分表
- ラベル: `Safe to edit`

### `components/ui/PageFrame.jsx`
- 役割: 画面共通の余白/safe-area枠
- ラベル: `Need caution`

## lib/

### `lib/session/oracleSession.js`
- 役割: localStorage state管理
- 主要: `selectedTheme`, `diagnosisType`, `lastResult`, `deepCount`, `premiumIntent`, `threeCardResult`
- ラベル: `High risk`

### `lib/analytics/trackEvent.js`
- 役割: イベント送信
- ラベル: `Need caution`

### `lib/ai/oracleMessage.js`
- 役割: OpenAI呼び出し/フォールバック
- ラベル: `Need caution`

### `lib/reading/viralCopy.js`
- 役割: 表示ラベル、共有文、タグ
- ラベル: `Need caution`

### `lib/reading/generateViralTitle.js`
- 役割: タイトル生成ルール
- ラベル: `Safe to edit`

### `lib/cards.js`
- 役割: cards.json読み込み + 画像生成 + 抽選
- ラベル: `Need caution`

## data/

### `data/cards.json`
- 役割: カード定義と拡張文言
- ラベル: `Need caution`
- ルール: 既存キー削除は避ける（追加中心）

## docs/

### `docs/architecture-overview.md`
- 全体設計の要約

### `docs/file-map.md`
- このファイル

### `docs/state-design.md`
- state定義の解説

### `docs/monetization-flow.md`
- 無料→有料導線

### `docs/how-to-edit.md`
- 実作業の編集手順

### `docs/edit-rules.md`
- 変更禁止事項とレビュー前チェック

### `docs/review-spec.md`
- 評価基準

### `docs/codex-review.md`
- 現状の内部レビュー
