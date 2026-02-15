# やさしいAIオラクルカード

初心者向けのシンプルな 1 枚引きオラクルカードサイトです。  
Next.js(App Router) で構築し、スマホ表示を前提に、余白を活かした軽いスピリチュアルトーンのUIで整えています。

## 成果物の範囲

- 20 枚のカードデータ
- 1 枚引き（ランダム）
- deep（2回制限）
- カード名/カード画像の表示
- OpenAI API による日本語メッセージ生成（150〜200文字）
- APIキー未設定時のフォールバック文表示
- X シェアボタン
- premium導線（intro/complete/reading）
- イベントDB永続化（SQLite）
- 日次/期間CV集計API
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
  api/analytics/daily/route.js   # 日次集計
  api/analytics/funnel/route.js  # 期間ファネル集計
  api/purchase/complete/route.js # 購入完了記録（戻り）
  api/purchase/webhook/route.js  # 購入完了記録（Webhook）
  api/premium/three-card/route.js # 3枚リーディング生成
  deep/page.js              # deep画面エントリ
  draw/page.js              # 1枚引き画面
  globals.css               # ベーススタイル/背景/フォント
  layout.js                 # メタ情報/viewport/Tailwind CDN読み込み
  page.js                   # トップ画面（診断4択）
  premium/intro/page.jsx    # 有料導線紹介ページ
  premium/complete/page.jsx # 購入完了画面
  premium/reading/page.jsx  # 3枚リーディング画面
  result/page.js            # 結果画面エントリ
components/
  deep/DeepPageClient.jsx
  premium/PremiumCtaCard.jsx
  premium/PremiumCompletePageClient.jsx
  premium/PremiumDiffTable.jsx
  premium/PremiumIntroPageClient.jsx
  premium/PremiumReadingPageClient.jsx
  result/ResultPageClient.jsx
  ui/PageFrame.jsx
data/
  cards.json                # 20枚カードデータ
lib/
  ai/oracleMessage.js       # AI生成ロジック
  analytics/eventDb.js      # SQLite初期化
  analytics/eventStore.js   # 記録・集計
  analytics/events.js       # イベント契約
  analytics/experiments.js  # AB割り当て
  analytics/trackEvent.js   # イベント送信
  api/adminAuth.js          # 管理API認証
  cards.js                  # カード読み込み/画像生成/ランダム抽選
  monetization/noteMap.js   # 診断別note URL
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
- KPI設計: `docs/kpi-plan.md`

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
NEXT_PUBLIC_CHECKOUT_RETURN_PARAM=redirect_url
EVENT_DB_PATH=/tmp/oracle-events.sqlite
NEXT_PUBLIC_ANALYTICS_DEBUG=0
ANALYTICS_ADMIN_TOKEN=change_me
NEXT_PUBLIC_EXPERIMENT_LP_COPY=0
PURCHASE_WEBHOOK_TOKEN=change_me
NEXT_PUBLIC_NOTE_URL_DEFAULT=https://note.com/
NEXT_PUBLIC_NOTE_URL_MUTUAL=https://note.com/
NEXT_PUBLIC_NOTE_URL_WAITING_LOVE=https://note.com/
NEXT_PUBLIC_NOTE_URL_WAITING_CONTACT=https://note.com/
NEXT_PUBLIC_NOTE_URL_UNREQUITED=https://note.com/
NEXT_PUBLIC_NOTE_URL_RECONCILIATION=https://note.com/
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

## 日次CV集計API

`GET /api/analytics/daily?date=YYYY-MM-DD`

例:

```bash
curl -H "x-admin-token: change_me" "http://localhost:3000/api/analytics/daily?date=2026-02-15"
```

ABテスト条件での絞り込み:

```bash
curl -H "x-admin-token: change_me" "http://localhost:3000/api/analytics/daily?date=2026-02-15&experiment_id=lp_copy_test&variant=B"
```

期間ファネル集計:

```bash
curl -H "x-admin-token: change_me" "http://localhost:3000/api/analytics/funnel?date_from=2026-02-01&date_to=2026-02-15"
```

AB比較（B-A差分を返す）:

```bash
curl -H "x-admin-token: change_me" "http://localhost:3000/api/analytics/funnel?date_from=2026-02-01&date_to=2026-02-15&experiment_id=lp_copy_test&compare=1"
```

集計レスポンスには `cv`（イベント件数ベース）に加えて `user_cv`（ユニークユーザー数ベース）も含まれます。

購入Webhook受信（サーバー間）:

```bash
curl -X POST "http://localhost:3000/api/purchase/webhook" \
  -H "content-type: application/json" \
  -H "x-webhook-token: change_me" \
  -d '{"attemptId":"attempt_xxx","sessionId":"s_xxx","provider":"note","externalOrderId":"order_123","amount":1980}'
```

## Vercel デプロイ

1. GitHub に push
2. Vercel でこのリポジトリを Import
3. Environment Variables に以下を設定
   - `OPENAI_API_KEY` (必須)
   - `OPENAI_MODEL` (任意)
   - `OPENAI_MAX_OUTPUT_TOKENS` (任意)
   - `EVENT_DB_PATH` (任意, 例: `/tmp/oracle-events.sqlite`)
   - `ANALYTICS_ADMIN_TOKEN` (推奨, 集計API保護用)
   - `NEXT_PUBLIC_EXPERIMENT_LP_COPY` (任意, `1`でLPコピーABを有効化)
   - `PURCHASE_WEBHOOK_TOKEN` (推奨, 購入Webhook認証用)
4. Deploy

`OPENAI_API_KEY` 未設定時でも API はフォールバックメッセージを返すため、画面確認は可能です。

## 補足

- 機能追加は行わず、構成分離と運用しやすさを優先して整理しています。
- カード画像は実ファイルを持たず、SVG を動的生成しています。
