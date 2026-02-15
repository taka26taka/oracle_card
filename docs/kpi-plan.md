# KPI Plan

このドキュメントは、現行イベントと集計APIを前提にCVを追うための実装運用メモです。

## 1. ファネル定義（実装準拠）

```text
page_view_lp
 -> draw_completed
 -> result_viewed
 -> deep_dive_opened
 -> premium_intro_viewed
 -> premium_checkout_clicked
 -> purchase_success
 -> purchase_completed
```

補助指標:
- `note_click`
- `deep_dive_opened`
- `deep_focus_selected`
- `premium_reading_viewed`
- `premium_three_card_generated`

## 2. 集計API

### 日次

`GET /api/analytics/daily?date=YYYY-MM-DD`

返却:
- `counts`（イベント件数）
- `users`（ユニークユーザー数）
- `cv`（件数ベースCV）
- `user_cv`（ユーザーベースCV）

### 期間ファネル

`GET /api/analytics/funnel?date_from=YYYY-MM-DD&date_to=YYYY-MM-DD`

AB比較:

`GET /api/analytics/funnel?date_from=...&date_to=...&experiment_id=lp_copy_test&compare=1`

## 3. フィルタ設計

- `experiment_id`
- `variant`

どちらも `events.meta` 由来で `trackEvent` 側から自動付与されます（`experimentContext`）。

## 4. 必須イベント契約

- `page_view`
- `draw_executed`
- `result_first_paint`
- `result_viewed`
- `premium_intro_viewed`
- `premium_checkout_clicked`
- `purchase_success`
- `purchase_completed`

互換上 `draw_executed` は集計時に `draw_completed` に正規化されます。

主要CVキー（`cv` / `user_cv`）:
- `result_to_deep`
- `deep_to_premium_intro`
- `checkout_to_purchase_success`
- `purchase_success_to_purchase_completed`

## 5. 最低運用ルール

1. 毎日 `daily` を保存して時系列を持つ  
2. 週次で `funnel` を確認し、最大ドロップ箇所を1つだけ改善  
3. AB実験中は `compare=1` の差分だけで判断する  
4. 施策後7日未満では勝敗判定しない

## 6. 管理APIのセキュリティ

- 集計APIは `ANALYTICS_ADMIN_TOKEN` を設定して保護する
- 呼び出しヘッダーは `x-admin-token` か `Authorization: Bearer <token>`
- `NODE_ENV=production` で未設定の場合は `503` を返す
