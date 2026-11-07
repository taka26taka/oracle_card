# 2026-11-07 イベントDBの永続化先

- 状態: 提案
- 決めた人: 本人 / 提案: Claude Code
- タスク: T-0004

## 背景
イベントDBは better-sqlite3 で `EVENT_DB_PATH`（既定 `/tmp/oracle-events.sqlite`）に置いている。
Vercel では /tmp がインスタンスごとに別で永続しないため、本番ではイベントも購入記録も失われる。
このDBは集計だけでなく購入確認にも使っているので、直すまで本番の課金を有効にできない（AGENTS.md「既知の問題」）。

### 現状の棚卸し
| 項目 | 内容 |
|---|---|
| 接続 | `lib/analytics/eventDb.js` の `getEventDb()`。プロセス内で1つの接続を使い回す。WAL・busy_timeout 5000ms |
| テーブル | `events` 1つ（16列、`meta_json` は JSON 文字列）。インデックス4つ（date+event、event+attempt、user+date、experiment+variant+date） |
| マイグレーション | 起動時に `CREATE TABLE IF NOT EXISTS` と、`PRAGMA table_info` を見て `ALTER TABLE ADD COLUMN`（experiment_id、variant） |
| SQLite 固有の書き方 | `json_extract(meta_json, '$.provider')`、`datetime('now')`、`AUTOINCREMENT`、`PRAGMA` |
| 書き込み | `recordEvent()`。`db.transaction(...).immediate()`（= `BEGIN IMMEDIATE`）の中で「既存行を読んで確認 → INSERT」。購入の重複・注文IDの使い回し・セッション不一致・期限切れをこの中で弾いている |
| 読み込み | `getDailyDashboardStats` / `getFunnelStats` / `getExperimentComparison`（集計）、`hasCompletedPurchaseAttempt`（購入確認） |
| 呼び出し元 | `app/api/events`（記録・日次）、`analytics/daily`、`analytics/funnel`、`purchase/webhook`、`purchase/complete`（記録）、`premium/three-card`（購入確認） |
| 同期APIへの依存 | eventStore の export はすべて同期関数。呼び出し元6ルートも `await` なしで呼んでいる。非同期のDBにすると、eventStore と6ルートを async/await に書き換える必要がある |
| テスト | `tests/eventStore.test.mjs` は一時ディレクトリに SQLite ファイルを作り、`EVENT_DB_PATH` で差し替える（旧スキーマからの移行も確認）。結合テストも `EVENT_DB_PATH` を一時ディレクトリに向ける |

**最重要の観点**: `BEGIN IMMEDIATE` 相当の「読んで確認してから書く」トランザクションを、移行先でも保てるか。
保てないと、Webhook が同時に届いたときに購入の二重記録などを防げなくなり、購入確認のロジックを作り直す必要がある。

### 想定データ量（仮定）
- イベントの種類は 23。1訪問あたり 5〜15 件（LP 表示・1枚引き・結果・深掘り・premium 導線など）と仮定
- 訪問数: 当面 100〜1,000/日 と仮定 → **書き込み 1,000〜10,000 件/日**（月 3万〜30万件）
- 1行 0.3〜0.5KB と仮定 → 上限側で年 約 1.5GB（インデックス込みだとさらに増える）。下限側なら年 0.2GB 程度
- 読み込み: 集計APIは期間内の行をインデックスで走査する。管理画面を1日数十回開く程度なら、月 数千万行の読み込みに収まる見込み
- 書き込みの課金単位はインデックス分も数える（Turso・D1 とも）。インデックス4つ＋テーブルで、1件あたり約5行の書き込みとして扱う → 上限側で 約 5万行/日、月 150万行

## 選択肢
料金・無料枠は 2026-11-07 に公式サイトの情報で確認（下の「出典」）。WebFetch が使えず、検索結果に出た公式ページの記載で確認したため、契約前に料金ページを直接もう一度見ること。

| 案 | 長所 | 短所 | コスト（想定量） |
|---|---|---|---|
| A. Turso（libSQL） | SQLite 互換なので SQL（`json_extract`・`datetime`・`PRAGMA`）をほぼそのまま使える。`client.transaction("write")` が `BEGIN IMMEDIATE` に相当し、今の購入チェックの組み方を保てる。`@libsql/client` はローカルファイル（`file:`）にも接続できるので、テストはネットワークなしで続けられる見込み。Vercel 連携の公式手順あり | 非同期APIになるため、eventStore と6ルートの書き換えが必要。対話的トランザクションは書き込みロックを持ち、タイムアウトは5秒（HTTP の往復が増えると遅くなる）。無料枠はどれか1つでも超えるとDBがブロックされる。プラン内容がよく変わる（公式ページ間でも無料DB数の記載が 100 と 500 で食い違っていた） | 無料（5GB、読み 5億行/月、書き 1,000万行/月）。超えたら Developer $5.99/月（年払い $4.99/月） |
| B. Cloudflare D1 | SQLite 互換。無料枠が大きい（読み 500万行/日、書き 10万行/日、5GB）。egress 無料 | Vercel から直接使えない。REST API は管理用途向けで、アプリから使うには D1 を中継する Worker を別に作ってデプロイし、認証を付ける必要がある。対話的トランザクション（BEGIN〜COMMIT）を使えるかは公式ドキュメントで未確認（使えない場合は batch による一括実行になり、購入チェックの作り直しが必要）。無料枠は 2026-09-01 から日次上限で止まる | 無料（上限側の 5万行/日 は書き込み枠 10万行/日 の半分）。有料は Workers Paid 最低 $5/月 |
| C. Neon（Postgres） | 本格的な RDB で、伸びても困らない。WebSocket（Pool）なら対話的トランザクションが使える。scale to zero でアイドル時は課金なし | SQL の書き換えが必要（`json_extract` → `->>`、`datetime('now')` → `now()`、`AUTOINCREMENT` → identity、`PRAGMA` を使った移行の作り直し）。ローカルのテストにも Postgres（Docker など）が要り、テストと CI の準備が重くなる。無料のストレージは1プロジェクト 1GB で、上限側の見積もりだと1年ほどで足りなくなる | 無料（100 CU 時間/月、1GB/プロジェクト）。有料は従量（$0.106/CU 時間、$0.35/GB 月） |

検討から外したもの: SQLite ファイルのままホスティングを VPS や永続ボリュームのある環境へ移す案。ホスティングの変更はこのタスクの範囲外なので比較していない。

## 推奨（決定は本人）
**A. Turso を推奨する。**
- 今の SQL とトランザクションの組み方（`BEGIN IMMEDIATE` の中で確認してから書く）をほぼ保てる。購入確認のロジックを作り直さずに済み、セキュリティ面の変更が一番小さい
- ローカルとテストは `file:` の SQLite のままにできる見込みで、`npm test`・結合テスト・CI に外部サービスが要らない
- 想定量なら無料枠に十分収まる（書き込みは上限側でも枠の約15%）

B は Vercel のままだと中継 Worker が増えるので外した。アプリ全体を Cloudflare へ移すことになったら、もう一度検討する。
C は書き換え量とテスト環境のコストが、今の規模に見合わない。

### 主なリスクと対策
- 非同期化の書き換え漏れ（`await` 忘れで Promise が truthy になり、購入確認がすり抜けるなど）→ 最初のタスクで、DB を変えずに async 化だけを先に行い、テストで確認する。購入まわりの変更なので Codex のレビューでセキュリティ観点を必須にする
- 無料枠を超えるとDBがブロックされる → 使用量を月1回確認する。課金を有効にする段階で Developer プラン（$5.99/月）への切り替えを判断する
- HTTP 越しの書き込みトランザクションの遅さ（ロックのタイムアウト5秒）→ Preview 環境で Webhook と購入完了を実際に流して確認する

## 移行手順（決定後。1タスク = 1PR）
1. **eventStore の async 化**（DB は better-sqlite3 のまま）: eventStore の export を async にし、6ルートで `await` する。テストを async に合わせる。動作は変えない
2. **`@libsql/client` への置き換え**: better-sqlite3 → `@libsql/client`（依存の追加は事前承認）。`EVENT_DB_URL`（ローカル・テストは `file:...`）と `EVENT_DB_AUTH_TOKEN` を導入し、`.env.example` にダミー値を入れる。`recordEvent` は `transaction("write")` に置き換える。テストと結合テストはローカルファイルのまま通す。`file:` で `transaction("write")` が使えるかはこのタスクで確かめる
3. **Turso の準備と Preview での確認**（本人作業を含む）: Turso のアカウント作成と DB 作成（外部サービスの契約なので本人が行う）、Vercel の環境変数を設定。Preview で購入フロー（checkout → Webhook → 3枚リーディング）を流して確認する
4. **AGENTS.md と HANDOFF の「既知の問題」を更新**し、本番で課金を有効にするかを判断する

## 影響
- 変わるファイル（実装時）: `lib/analytics/eventDb.js`、`lib/analytics/eventStore.js`、上記6ルート、`tests/eventStore.test.mjs`、`scripts/tests/run_integration_tests.sh`、`package.json`、`.env.example`、AGENTS.md
- 運用: Turso の使用量の確認（月1回）、トークンの管理（Vercel の環境変数のみ。コミットしない）
- 費用: 当面 0円。無料枠を超えたら月 $5.99 程度

## 出典（2026-11-07 確認）
- Turso 料金: https://turso.tech/pricing
- Turso TypeScript SDK（transaction の mode、/web 版）: https://docs.turso.tech/sdk/ts/reference
- Turso と Vercel: https://docs.turso.tech/integrations/vercel
- D1 料金: https://developers.cloudflare.com/d1/platform/pricing/
- D1 制限: https://developers.cloudflare.com/d1/platform/limits/
- D1 を Worker 経由で外部から使う: https://developers.cloudflare.com/d1/tutorials/build-an-api-to-access-d1/
- D1 無料枠の日次上限の適用（2026-09-01）: https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/
- Neon 料金: https://neon.com/pricing
- Neon serverless driver（HTTP と WebSocket、トランザクション）: https://neon.com/docs/serverless/serverless-driver
