# HANDOFF

最終更新: 2026-11-03 / 更新者: Claude Code（T-0001 確認コマンドの実行結果を記録）

## 現在の状態
- LP → 1枚引き → 深掘り（2回）→ premium 導線 → 外部checkout → Webhook → 3枚リーディング、まで実装済み。
- イベント計測（SQLite）、日次・ファネル集計API、CI（.github/workflows/ci.yml）あり。
- 2026-10-28 に PR #1（improve/portfolio-quality-2026）、2026-11-03 に PR #2（AI連携ファイルの設置）がマージ済み。
- 2026-11-03 にローカル（WSL）で確認コマンドを実行。lint・unit テスト・結合テスト・ビルドは成功。
  コンポーネントテスト（vitest）だけが Node 18 では起動できずに失敗（下の検証結果を参照）。コード側の問題ではない。

## 進行中
- なし

## 次にやること（優先順）
1. ローカル環境に Node 22 を入れる（nvm をインストールして `nvm use`）→ `npm test` を再実行して、コンポーネントテストが通ることを確認する
2. イベントDBの永続化方針を決める（Turso / Cloudflare D1 / Vercel 対応のDB などを比較）→ docs/decisions/ に記録。実装はその後
3. 商品C（課金導線＋計測テンプレート）にするかは、商品Aの販売結果を見てから判断する

## 注意点・未解決
- EVENT_DB_PATH=/tmp/... のため、Vercel 本番ではデータが永続しない（AGENTS.md 参照）。直すまで本番の課金は有効にしない。
- NEXT_PUBLIC_NOTE_URL_* は note.com のトップを指すダミー値。
- ローカル（WSL）は nvm 未導入・Node v18.20.8。.nvmrc は 22。Node 18 のままだと vitest / vite / rolldown / eslint 関連が非対応（npm ci で EBADENGINE 警告）。
- `npm ci` 時点で moderate の脆弱性が 14 件。CI は `npm audit --audit-level=high` なので CI は止まらない。対応するかは未判断。

## 直近の検証結果
環境: WSL / Node v18.20.8 / npm 10.8.2（.nvmrc の 22 ではない）、.env なし

| コマンド | 結果 | 日付 |
|---|---|---|
| `nvm use` | 実行できず（nvm 未インストール）。Node 18 のまま続行 | 2026-11-03 |
| `npm ci` | 成功（423 パッケージ）。EBADENGINE 警告あり（Node 18 非対応のパッケージ）、moderate 脆弱性 14 件 | 2026-11-03 |
| `npm run lint` | 成功（警告 0） | 2026-11-03 |
| `npm test` | 失敗。unit は 29 件すべて成功。components（vitest）は起動時エラー: `node:util` に `styleText` がない（Node 18 非対応） | 2026-11-03 |
| `npm run test:integration` | 成功（integration smoke test passed） | 2026-11-03 |
| `npm run build` | 成功（18 ページ生成、警告なし） | 2026-11-03 |
