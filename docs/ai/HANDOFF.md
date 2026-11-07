# HANDOFF

最終更新: 2026-11-04 / 更新者: Claude Code（T-0002 Node 22 での確認コマンドの再実行結果を記録）

## 現在の状態
- LP → 1枚引き → 深掘り（2回）→ premium 導線 → 外部checkout → Webhook → 3枚リーディング、まで実装済み。
- イベント計測（SQLite）、日次・ファネル集計API、CI（.github/workflows/ci.yml）あり。
- 2026-10-28 に PR #1（improve/portfolio-quality-2026）、2026-11-03 に PR #2（AI連携ファイルの設置）、2026-11-04 に PR #3（T-0001 確認コマンドの記録）がマージ済み。
- 2026-11-04 にローカル（WSL）を Node 22 にして確認コマンドを再実行。lint・unit・コンポーネントテスト・ビルドは成功。
  結合テストは1回目が失敗（reading API が 500）、その後の再実行2回は成功。1回目の原因は未特定（下の注意点を参照）。

## 進行中
- なし

## 次にやること（優先順）
1. 結合テストのスクリプト（scripts/tests/run_integration_tests.sh）が終了時に dev サーバーを止めきれない問題を直す（下の注意点を参照）。直したあと、1回目の 500 が再現するかもあわせて確認する
2. イベントDBの永続化方針を決める（Turso / Cloudflare D1 / Vercel 対応のDB などを比較）→ docs/decisions/ に記録。実装はその後
3. 商品C（課金導線＋計測テンプレート）にするかは、商品Aの販売結果を見てから判断する

## 注意点・未解決
- EVENT_DB_PATH=/tmp/... のため、Vercel 本番ではデータが永続しない（AGENTS.md 参照）。直すまで本番の課金は有効にしない。
- NEXT_PUBLIC_NOTE_URL_* は note.com のトップを指すダミー値。
- ローカル（WSL）: nvm 導入済み。oracle_card では `nvm use` で Node 22 になる。nvm の既定は system（apt の Node 18）のままなので、新しいシェルでは Node 18。作業前に必ず `nvm use` する。
- 結合テストのサーバーが残る: run_integration_tests.sh の cleanup は `npm run dev` の PID だけを kill するため、子プロセスの next-server がポート 3101 に残る（Node 22 で3回とも再現）。
  残ったサーバーがあると、次の実行は自前のサーバーを起動できず（EADDRINUSE）、古いサーバー（削除済みの一時DBを指す）に接続してしまう。
  手動で止めるときは `ss -ltnp | grep 3101` で PID を確認して kill する。
- 結合テスト1回目の 500: サーバーログがテスト後に削除されて原因は未特定。直前の .next が Node 18 でビルドしたものだった、dev サーバー起動直後の初回コンパイル、などが候補。`KEEP_TEST_ARTIFACTS=1` を付けるとログが残る。
- `npm ci` 時点で moderate の脆弱性が 14 件（ESLint まわりの minimatch。開発時だけ使う依存）。CI は `npm audit --audit-level=high` なので CI は止まらない。対応するかは未判断。

## 直近の検証結果
環境: WSL / Node v22.23.4 / npm 10.9.9（nvm v0.40.8、.nvmrc どおり）、.env なし

| コマンド | 結果 | 日付 |
|---|---|---|
| `nvm use` | 成功（Node v22.23.4） | 2026-11-04 |
| `npm ci` | 成功（429 パッケージ）。EBADENGINE 警告なし、moderate 脆弱性 14 件 | 2026-11-04 |
| `npm run lint` | 成功（警告 0） | 2026-11-04 |
| `npm test` | 成功。unit 29 件、components 8 件（1 ファイル） | 2026-11-04 |
| `npm run test:integration` | 1回目は失敗（`reading api failed: status=500`）。再実行2回は成功（integration smoke test passed）。毎回 dev サーバーが残る | 2026-11-04 |
| `npm run build` | 成功（18 ページ生成、警告なし） | 2026-11-04 |
