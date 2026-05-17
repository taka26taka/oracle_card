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
- 重要: `EVENT_DB_PATH`, `ANALYTICS_ADMIN_TOKEN`, `PURCHASE_WEBHOOK_TOKEN`
- ラベル: `Need caution`

### `next.config.mjs` / `jsconfig.json` / `vercel.json`
- 役割: ビルド・import・デプロイ設定
- ラベル: `Need caution`

## app/

### `app/page.js` (`/`)
- 役割: LP本体（診断4択 + ABコピー）
- 出力: `diagnosisType` 保存、`experimentContext` 保存、`/draw` へ遷移
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

### `app/premium/complete/page.jsx` (`/premium/complete`)
- 役割: エントリ（実体は `components/premium/PremiumCompletePageClient.jsx`）
- ラベル: `Need caution`

### `app/premium/reading/page.jsx` (`/premium/reading`)
- 役割: エントリ（実体は `components/premium/PremiumReadingPageClient.jsx`）
- ラベル: `Need caution`

### `app/admin/dashboard/page.jsx` (`/admin/dashboard`)
- 役割: 管理向け簡易確認画面
- ラベル: `Safe to edit`

### `app/api/reading/route.js`
- 役割: AIメッセージAPI
- input: `cardName`, `theme`, `diagnosisType?`, `deepFocus?`
- ラベル: `High risk`

### `app/api/events/route.js`
- 役割: イベント受信API
- ラベル: `Need caution`

### `app/api/analytics/daily/route.js`
- 役割: 日次集計API（admin token保護）
- ラベル: `Need caution`

### `app/api/analytics/funnel/route.js`
- 役割: 期間ファネル集計API（admin token保護、AB比較対応）
- ラベル: `Need caution`

### `app/api/purchase/complete/route.js`
- 役割: フロント経由の購入完了記録API
- ラベル: `High risk`

### `app/api/purchase/webhook/route.js`
- 役割: サーバー間購入完了Webhook
- ラベル: `High risk`

### `app/api/premium/three-card/route.js`
- 役割: 購入済みattempt検証後に3枚リーディングを生成
- ラベル: `High risk`

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
- 役割: premium案内本体、checkout attempt発行と遷移
- ラベル: `High risk`

### `components/premium/PremiumCompletePageClient.jsx`
- 役割: 完了画面表示、`purchase_completed` 記録と `premiumAccess` 付与
- ラベル: `High risk`

### `components/premium/PremiumReadingPageClient.jsx`
- 役割: 購入権限チェック、3枚結果表示、キャッシュ
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
- 主要: `diagnosisType`, `experimentContext`, `checkoutAttempt`, `premiumAccess`, `threeCardResult`
- ラベル: `High risk`

### `lib/analytics/trackEvent.js`
- 役割: イベント送信
- ラベル: `Need caution`

### `lib/analytics/eventDb.js`
- 役割: SQLite接続と `events` テーブル初期化
- ラベル: `High risk`

### `lib/analytics/eventStore.js`
- 役割: イベント記録、購入検証、集計ロジック
- ラベル: `High risk`

### `lib/analytics/events.js`
- 役割: イベント名/PAGE名の契約
- ラベル: `Need caution`

### `lib/analytics/experiments.js`
- 役割: LP ABテスト割り当てとmeta生成
- ラベル: `Need caution`

### `lib/api/adminAuth.js`
- 役割: 集計APIのトークン認証
- ラベル: `Need caution`

### `lib/monetization/noteMap.js`
- 役割: 診断タイプ別のnote URL解決・UTM組み立て
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
