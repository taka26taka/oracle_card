# HANDOFF

最終更新: 2026-11-07 / 更新者: Claude Code（T-0003 結合テストの dev サーバー残りを修正）

## 現在の状態
- LP → 1枚引き → 深掘り（2回）→ premium 導線 → 外部checkout → Webhook → 3枚リーディング、まで実装済み。
- イベント計測（SQLite）、日次・ファネル集計API、CI（.github/workflows/ci.yml）あり。
- マージ済み: PR #1（2026-10-28、improve/portfolio-quality-2026）、#2（2026-11-03、AI連携ファイル）、#3（2026-11-04、T-0001）、#4（2026-11-07、T-0002）。
- 2026-11-07: scripts/tests/run_integration_tests.sh を修正。dev サーバーを専用のプロセスグループで起動し、終了時（成功・失敗・Ctrl+C）にグループごと止める。
  起動前にポートが使用中ならエラーで止まり、失敗時はサーバーログの末尾を表示する。Node 22 で確認コマンドはすべて成功。

## 進行中
- なし

## 次にやること（優先順）
1. イベントDBの永続化方針を決める（Turso / Cloudflare D1 / Vercel 対応のDB などを比較）→ docs/decisions/ に記録。実装はその後
2. 商品C（課金導線＋計測テンプレート）にするかは、商品Aの販売結果を見てから判断する

## 注意点・未解決
- EVENT_DB_PATH=/tmp/... のため、Vercel 本番ではデータが永続しない（AGENTS.md 参照）。直すまで本番の課金は有効にしない。
- NEXT_PUBLIC_NOTE_URL_* は note.com のトップを指すダミー値。
- ローカル（WSL）: nvm 導入済み。oracle_card では `nvm use` で Node 22 になる。nvm の既定は system（apt の Node 18）のままなので、新しいシェルでは Node 18。作業前に必ず `nvm use` する。
- 結合テスト: ポート 3101 が使用中だと `port 3101 is already in use` で止まる。そのときは `ss -ltnp | grep 3101` で PID を確認して止める。
  `KEEP_TEST_ARTIFACTS=1` を付けると一時ディレクトリ（サーバーログ・テスト用DB）が残る。
- 2026-11-04 の結合テスト1回目の 500 は、その後の実行（2026-11-07 に計5回）では再現していない。原因は未特定。再発したら、失敗時に表示されるサーバーログを見る。
- `npm audit` の moderate 脆弱性: 2026-11-07 の `npm ci` 時点で 6 件（2026-11-04 は 14 件。package-lock.json は変わっていないので、脆弱性データベース側の更新によるものと見られる）。
  ESLint まわりの開発用依存。CI は `npm audit --audit-level=high` なので止まらない。対応するかは未判断。

## 直近の検証結果
環境: WSL / Node v22.23.4 / npm 10.9.9（nvm v0.40.8、.nvmrc どおり）、.env なし

| コマンド | 結果 | 日付 |
|---|---|---|
| `nvm use` | 成功（Node v22.23.4） | 2026-11-07 |
| `npm ci` | 成功。EBADENGINE 警告なし、moderate 脆弱性 6 件 | 2026-11-07 |
| `npm run lint` | 成功（警告 0） | 2026-11-07 |
| `npm test` | 成功。unit 29 件、components 8 件 | 2026-11-07 |
| `npm run test:integration` | 成功。修正後に3回続けて実行し、3回とも成功・ポート 3101 にプロセス残りなし。確認コマンドの通し実行でも成功 | 2026-11-07 |
| `npm run build` | 成功（18 ページ生成、警告なし） | 2026-11-07 |
| 結合テストの異常系（手動） | ポート使用中 → exit 1 で停止 / Ctrl+C（SIGINT）→ exit 130、サーバー残りなし / 起動失敗（不正なポート）→ exit 1、サーバーログ末尾を表示、一時ディレクトリ削除 | 2026-11-07 |
