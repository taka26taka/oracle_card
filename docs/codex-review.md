# Codex Internal Review

## 構造理解難易度
- 評価: **B+**
- 理由: premium完了/3枚/集計APIまで繋がり、導線の一貫性は上がった。`app/page.js` の責務はまだ重い。

## 保守性
- 評価: **A-**
- 良い点:
  - `components/result`, `components/premium`, `components/ui`, `components/deep` に分離
  - session責務が `lib/session/oracleSession.js` に集約
  - 集計責務が `lib/analytics/eventStore.js` に集約
- 課題:
  - `diagnosisType` と `selectedTheme` の互換維持コストが残る

## 収益導線
- 評価: **A-**
- 現状:
  - result/deepの2箇所でpremium導線
  - introでattempt発行→外部購入→complete/webhook→reading解放
- 伸びしろ:
  - `premium_intro_viewed -> premium_checkout_clicked` の改善余地
  - note無料導線(`note_click`)と購入導線の相互干渉最適化

## バグ残り
- 重大バグ: なし（build成功）
- 軽微リスク:
  - `ANALYTICS_ADMIN_TOKEN` 未設定時の集計API公開
  - `/tmp` DB運用時のデータ永続性不足（環境依存）

## 次やるべき1手
1. analyticsの定点運用（daily/funnelの定期取得）
2. LP ABテスト（`lp_copy_test`）の勝敗判定ロジック運用
