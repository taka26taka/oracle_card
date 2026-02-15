# Architecture Overview

## 何のプロダクトか
恋愛オラクルの無料体験を入口に、`note` 購入で3枚リーディングへ進む導線型プロダクトです。  
計測はすべて `/api/events` 経由で SQLite (`EVENT_DB_PATH`) に保存し、`/api/analytics/*` でCVを集計します。

## ルート構成

```text
/                    LP（診断4択 + ABコピー）
/draw                1枚抽選
/result              1枚結果（共有 / deep / premium導線）
/deep                深掘り（最大2回）
/premium/intro       有料導線（checkout開始）
/premium/complete    購入完了戻り先（purchase_completed記録）
/premium/reading     3枚リーディング（購入済みattempt必須）
/admin/dashboard     管理用の簡易ダッシュボード
```

## 状態管理（localStorage）

保存先は `oracle_session_v1` です。主キー:

```text
sessionId
diagnosisType / selectedTheme(互換キー)
lastResult
deepCount
premiumIntent
checkoutAttempt
premiumAccess
threeCardResult
experimentContext
```

## API構成

```text
POST /api/reading
POST /api/events
GET  /api/events                    # admin token必須
GET  /api/analytics/daily           # admin token必須
GET  /api/analytics/funnel          # admin token必須
POST /api/purchase/complete
POST /api/purchase/webhook          # x-webhook-token必須
POST /api/premium/three-card        # 購入attempt検証
```

## 有料導線とアクセス制御

```text
/premium/intro で checkoutAttempt 発行
  -> premium_checkout_clicked(attemptId付き) 記録
  -> 外部checkout
  -> /premium/complete で purchase_completed 記録（または webhook）
  -> premiumAccess 付与
  -> /premium/reading で attemptId検証し3枚生成
```

`attemptId` が未記録/期限切れ/重複の場合は購入完了イベントを拒否します（TTL 48時間）。
