# HANDOFF

最終更新: 2026-11-03 / 更新者: Claude（初期作成、公開リポジトリの調査結果から）

## 現在の状態
- LP → 1枚引き → 深掘り（2回）→ premium 導線 → 外部checkout → Webhook → 3枚リーディング、まで実装済み。
- イベント計測（SQLite）、日次・ファネル集計API、CI（.github/workflows/ci.yml）あり。
- 2026-10-28 に PR #1（improve/portfolio-quality-2026）がマージ済み。
- 上記は README と構成ファイルから確認したもの。確認コマンドはまだこちらで実行していない。

## 進行中
- なし

## 次にやること（優先順）
1. ローカルで確認コマンドを実行し、結果を記録する
2. イベントDBの永続化方針を決める（Turso / Cloudflare D1 / Vercel 対応のDB などを比較）→ docs/decisions/ に記録。実装はその後
3. 商品C（課金導線＋計測テンプレート）にするかは、商品Aの販売結果を見てから判断する

## 注意点・未解決
- EVENT_DB_PATH=/tmp/... のため、Vercel 本番ではデータが永続しない（AGENTS.md 参照）。直すまで本番の課金は有効にしない。
- NEXT_PUBLIC_NOTE_URL_* は note.com のトップを指すダミー値。

## 直近の検証結果
| コマンド | 結果 | 日付 |
|---|---|---|
| （未実行） |  |  |
