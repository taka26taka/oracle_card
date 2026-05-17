# Release Day Checklist

更新日: 2026-02-16

## 1. リリース前（必須）

1. `npm run build` が通る
2. 導線確認: `/` -> `/draw` -> `/result` -> `/premium/intro`
3. 主CTAが常に最強表示（result/premium）
4. `OTHER ACTIONS` が初期閉じ
5. `.env` 本番値確認
   - `ANALYTICS_ADMIN_TOKEN`
   - `NEXT_PUBLIC_CHECKOUT_URL`
   - `PURCHASE_WEBHOOK_TOKEN`

## 2. 最低限の信頼表示（必須）

1. フッターに運営者情報（または運営名）
2. 問い合わせ導線（メール or フォーム）
3. プライバシーポリシーリンク
4. 特商法相当ページリンク

## 3. 計測確認（必須）

1. `draw_executed` が記録される
2. `premium_cta_clicked` が記録される
3. `other_actions_toggled` が記録される
4. 日次保存実行

```bash
ANALYTICS_ADMIN_TOKEN=xxx scripts/ops/save_daily_kpi.sh https://<domain> YYYY-MM-DD
```

## 4. リリース後24時間監視

1. API 4xx/5xx に異常がない
2. `lp_to_draw` を確認
3. `draw_to_result` を確認
4. `result_to_premium_intro` を確認
5. `premium_intro_to_checkout` を確認

## 5. 判定

1. Go継続
   - `lp_to_draw >= 30%` かつ `result_to_premium_intro >= 12%`
2. Hold改善
   - どちらか未達（コピー1点のみ修正）
3. Stop再設計
   - 両方未達が継続（7日/300セッション目安）
