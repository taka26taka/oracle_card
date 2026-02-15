# Monetization Flow

このドキュメントは、無料から有料に移る導線だけを説明します。

## 全体フロー

```text
無料1枚（/draw -> /result）
  ↓
スクショ / 共有（X）
  ↓
deep回遊（最大2回）
  ↓
premium導線カード
  ↓
/premium/intro
  ↓
外部購入リンク（attemptId付き）
  ↓
/premium/complete または webhook
  ↓
/premium/reading
```

## どこで有料導線を出すか

1. `/result` 下部
- イベント: `premium_cta_clicked`（source: result）

2. `/deep` で2回到達後
- イベント: `premium_cta_clicked`（source: deep_limit）

## premium introでやること

```text
無料 vs 有料 差分を見せる
  - 無料: 1枚・今の示唆
  - 有料: 3枚（過去・現在・未来）+ 相手視点 + 今週の行動
```

- 表示イベント: `premium_intro_viewed`
- 購入クリック: `premium_checkout_clicked`（`attemptId` 付き）

## 購入完了判定

1. `premium_checkout_clicked` に記録済みの `attemptId` が必須  
2. `purchase_completed` は 48時間以内のみ有効  
3. 同一 `attemptId` の重複完了は拒否（idempotent）  

受信ルート:
- `POST /api/purchase/complete`（フロント戻り）
- `POST /api/purchase/webhook`（サーバー間連携）

## 収益実験の最低KPI

- `premium_cta_clicked / result_viewed`
- `premium_intro_viewed / premium_cta_clicked`
- `premium_checkout_clicked / premium_intro_viewed`
- `purchase_completed / premium_checkout_clicked`

この3つを追うと、導線のどこで落ちるかが見えます。
