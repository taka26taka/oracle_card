# KPI Plan

このドキュメントは、無料→有料の収益導線を数字で改善するための設計書です。

## 1. ファネル定義

```text
LP(/)
 -> draw(/draw)
 -> result(/result)
 -> deep(/deep)
 -> premium(/premium/intro)
 -> 購入(外部)
```

計測イベント対応:
- LP到達: `page_view` (未実装・追加推奨)
- draw到達: `draw_executed`
- result到達: `result_first_paint`
- deep到達: `deep_dive_opened`
- premium到達: `premium_intro_viewed`
- 購入クリック: `premium_checkout_clicked`
- 購入完了: `purchase_completed` (未実装)

## 2. 各地点CV率の目安

### MVP目標（現実ライン）
- LP -> draw: 35%
- draw -> result: 90%
- result -> deep: 30%
- deep -> premium: 20%
- premium -> 購入クリック: 15%
- 購入クリック -> 購入完了: 50%

合成CV（LP -> 購入完了）: 約0.14%

### 改善後の理想
- LP -> draw: 45%
- draw -> result: 95%
- result -> deep: 40%
- deep -> premium: 30%
- premium -> 購入クリック: 20%
- 購入クリック -> 購入完了: 60%

合成CV（LP -> 購入完了）: 約0.62%

## 3. イベント設計（不足分と追加案）

### 実装済みイベント
- `theme_selected`
- `diagnosis_completed`
- `draw_executed`
- `result_first_paint`
- `share_clicked`
- `deep_dive_opened`
- `deep_focus_selected`
- `premium_cta_clicked`
- `premium_intro_viewed`
- `premium_checkout_clicked`
- `screenshot_intent`
- `revisit_detected`

### 追加推奨イベント

1. `page_view`
- 目的: 正確な分母の取得
- 対象: `/`, `/draw`, `/result`, `/deep`, `/premium/intro`

2. `result_rendered`
- 目的: result到達数を純粋カウント
- 補足: `result_first_paint` は速度計測用途のため分離推奨

3. `purchase_completed`
- 目的: 売上CVの確定
- 方法: 外部購入完了後の戻りURLまたはWebhook連携

### 共通payload

```json
{
  "event": "premium_cta_clicked",
  "sessionId": "...",
  "ts": "ISO8601",
  "path": "/result",
  "theme": "...",
  "diagnosisType": "...",
  "cardId": 12,
  "meta": { "source": "result" }
}
```

## 4. ダッシュボード（改善点が分かる見る順）

### ダッシュボードA: ファネル
- `LP数`
- `draw数`
- `result数`
- `deep数`
- `premium数`
- `購入完了数`
- 各ステップCV率

### ダッシュボードB: premium導線比較
- `premium_cta_clicked` の `source=result/deep_limit` 比較
- どちらの導線が購入に寄与しているか

### ダッシュボードC: 収益
- 日次売上 / 月次売上
- 購入件数
- 客単価（AOV）
- 1ユーザーあたり売上（RPU）

### ダッシュボードD: 体験品質
- `result_first_paint` の under500率
- `deepCount` 分布（0/1/2）
- `screenshot_intent / result`

## 5. 月30万までの試算

前提:
- 客単価（AOV）: 1,980円
- 目標売上: 300,000円/月

必要購入件数:
- `300,000 / 1,980 = 約152件/月`

必要LPユーザー数:
- CV 0.14% の場合: 約108,600人/月
- CV 0.30% の場合: 約50,700人/月
- CV 0.62% の場合: 約24,500人/月

## 6. 実務の運用順

1. まず `page_view` と `purchase_completed` を実装
2. ファネルAを毎日確認
3. 落ち幅が最大のステップを1つだけ改善
4. 7日単位で比較し、改善有無を判定
