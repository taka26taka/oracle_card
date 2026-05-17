# Project Map

このドキュメントは、現行コードのルート・state・API・課金導線を1枚で確認するための地図です。

## ① ユーザーフロー図

```mermaid
flowchart TD
  A[/ LP] --> B[診断4択]
  B --> C[/draw]
  C --> D[/api/reading]
  D --> E[/result]
  E --> F[/deep]
  E --> G[/premium/intro]
  F --> H{deepCount >= 2 ?}
  H -- No --> F
  H -- Yes --> G
  G --> I[外部checkout]
  I --> J[/premium/complete]
  J --> K[/premium/reading]
  I --> L[/api/purchase/webhook]
```

## ② state一覧（`lib/session/oracleSession.js`）

| state | 型 | 役割 | 主に使う場所 |
|---|---|---|---|
| `sessionId` | string | 匿名ID | 全画面/全イベント |
| `diagnosisType` | string | 診断タイプ | `/`, `/draw`, API |
| `selectedTheme` | string | 互換キー（`diagnosisType`と同値） | 互換維持 |
| `lastResult` | object\|null | 1枚結果 | `/result`, `/deep`, premium系 |
| `deepCount` | number | deep回数（上限2） | `/deep` |
| `premiumIntent` | boolean | premium導線タップ履歴 | `/result`, `/deep` |
| `checkoutAttempt` | object\|null | 決済試行ID | `/premium/intro`, `/premium/complete` |
| `premiumAccess` | object\|null | 購入済みアクセス | `/premium/complete`, `/premium/reading` |
| `threeCardResult` | object\|null | 3枚結果キャッシュ | `/premium/reading` |
| `experimentContext` | object\|null | AB情報 | `/`, `trackEvent` |

## ③ 画面別役割

- `app/page.js`
  - LP描画、AB割り当て、`page_view(lp)` と診断イベント送信
- `app/draw/page.js`
  - 1枚抽選、`/api/reading`、`draw_executed` 送信
- `components/result/ResultPageClient.jsx`
  - `result_first_paint`, `result_viewed`, `share_clicked`, `note_click`, `premium_cta_clicked`
- `components/deep/DeepPageClient.jsx`
  - 深掘り生成、`deep_focus_selected`、2回上限判定
- `components/premium/PremiumIntroPageClient.jsx`
  - `checkoutAttempt` 発行、`premium_checkout_clicked` と外部遷移
- `components/premium/PremiumCompletePageClient.jsx`
  - `purchase_completed` 記録API呼び出し、`premiumAccess` 付与
- `components/premium/PremiumReadingPageClient.jsx`
  - 購入済み検証後に `/api/premium/three-card` 実行

## ④ API一覧

- `POST /api/reading`
  - 1枚/深掘りメッセージ生成
- `POST /api/events`
  - 汎用イベント記録
- `GET /api/events`
  - 日次統計（`ANALYTICS_ADMIN_TOKEN` 必須）
- `GET /api/analytics/daily`
  - 日次集計（`experiment_id`/`variant` フィルタ可）
- `GET /api/analytics/funnel`
  - 期間集計、`compare=1` でAB差分
- `POST /api/purchase/complete`
  - 戻りURL経由の購入完了記録
- `POST /api/purchase/webhook`
  - webhook経由の購入完了記録（`x-webhook-token` 必須）
- `POST /api/premium/three-card`
  - `attemptId` が購入済みなら3枚結果を返す

## ⑤ 収益導線のコード位置

```text
LP/無料導線:
  app/page.js
  app/draw/page.js
  components/result/ResultPageClient.jsx
  components/deep/DeepPageClient.jsx

有料導線:
  components/premium/PremiumIntroPageClient.jsx
  components/premium/PremiumCompletePageClient.jsx
  components/premium/PremiumReadingPageClient.jsx

購入記録:
  app/api/purchase/complete/route.js
  app/api/purchase/webhook/route.js
  lib/analytics/eventStore.js
```

## ⑥ 現状の注意点

- `NEXT_PUBLIC_CHECKOUT_URL` 未設定時は購入ボタン無効
- `ANALYTICS_ADMIN_TOKEN` 未設定時は集計APIが公開状態になる
- SQLiteを`/tmp`に置くとサーバー再起動でデータ喪失の可能性がある（環境依存）
