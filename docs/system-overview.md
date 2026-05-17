# システム全体像（保守理解用）

このドキュメントは、現行実装の「導線」「計測」「購入判定」を短時間で把握するための要約です。

## 1. 目的

- LP起点で `draw -> result -> premium` のCVを計測可能にする
- イベントをDB永続化し、日次・期間ファネルをAPIで取得できる状態を維持する
- 外部決済（note/Stripe想定）の前後で `purchase_completed` を確実に記録する

## 2. フォルダ責務

```text
app/    画面とAPIルート
components/  画面本体（Client Component）
lib/    セッション・計測・AI・導線ロジック
data/   カード定義
docs/   運用ドキュメント
```

## 3. 主要画面遷移

```text
/ -> /draw -> /result -> (/deep | /premium/intro)
/premium/intro -> 外部checkout -> /premium/complete -> /premium/reading
```

- `/deep` は2回まで（`deepCount` で制御）
- `/premium/reading` は購入済み `attemptId` がないと遷移不可

## 4. 計測パイプライン

```text
Client(trackEvent)
  -> POST /api/events
  -> lib/analytics/eventStore.recordEvent
  -> SQLite(events table)
  -> GET /api/analytics/daily or /api/analytics/funnel
```

- 保存先: `EVENT_DB_PATH`（未設定時 `/tmp/oracle-events.sqlite`）
- `event_normalized` で集計キーを統一
  - `draw_executed` -> `draw_completed`
  - `result_first_paint` -> `result_viewed`
  - `page_view` -> `page_view_{page}`

## 5. 購入イベントの整合性

- checkoutクリック時に `attemptId` を発行して `premium_checkout_clicked` に保存
- `purchase_completed` は checkout実績を検証してからのみ記録
  - 存在しない `attemptId`: reject
  - 48時間超過: reject
  - 同一 `attemptId` 二重完了: duplicate扱い
- 経路は2つ
  - `/premium/complete` から `POST /api/purchase/complete`
  - サーバー間 `POST /api/purchase/webhook`（`x-webhook-token` 必須）

## 6. 主要イベント（現行）

- `page_view`
- `theme_selected`
- `diagnosis_completed`
- `draw_executed`
- `result_first_paint`
- `result_viewed`
- `deep_dive_opened`
- `deep_focus_selected`
- `premium_cta_clicked`
- `premium_intro_viewed`
- `premium_checkout_clicked`
- `note_click`
- `purchase_completed`

## 7. まず読むべきファイル

1. `lib/session/oracleSession.js`
2. `lib/analytics/eventStore.js`
3. `app/api/events/route.js`
4. `app/api/analytics/daily/route.js`
5. `app/api/analytics/funnel/route.js`
6. `components/premium/PremiumIntroPageClient.jsx`
7. `components/premium/PremiumCompletePageClient.jsx`
8. `components/premium/PremiumReadingPageClient.jsx`
