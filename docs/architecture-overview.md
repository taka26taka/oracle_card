# Architecture Overview

## 何のプロダクトか
恋愛オラクルの無料体験を入口に、`note` 購入で3枚リーディングへ進む導線型プロダクトです。  
計測はすべて `/api/events` 経由で SQLite (`EVENT_DB_PATH`) に保存し、`/api/analytics/*` でCVを集計します。

画面だけを作るのではなく、購入導線と分析基盤まで含めて「改善できる小さなプロダクト」として閉じることを重視しています。

## レイヤー構成

```text
app/
  Page Routes
  API Route Handlers

components/
  Client Components
  UI composition
  User interaction

lib/
  ai/
  analytics/
  api/
  domain/
  monetization/
  reading/
  session/

data/
  cards.json

docs/
  design and operation notes
```

| レイヤー | 責務 |
|---|---|
| `app/` | Next.js App Router の画面入口と API Route Handler |
| `components/` | ユーザー操作、画面固有の状態、CTA、表示制御 |
| `lib/ai` | OpenAI 呼び出し、プロンプト、構造化フォールバック |
| `lib/analytics` | イベント契約、入力検証、SQLite保存、CV集計 |
| `lib/session` | localStorage セッションと購入状態の保持 |
| `lib/monetization` | note URL と UTM の解決 |
| `lib/reading` | 共有文、結果タイトル、表示コピー |

`app/` は入口、`components/` は体験、`lib/` は再利用可能なプロダクトロジック、という分け方です。

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

設計意図:

- ログインなしでも同一ブラウザの無料体験と購入導線をつなげる
- `sessionId` を匿名ユーザーIDとしてイベントに付与する
- `selectedTheme` は旧キー互換として残し、`diagnosisType` を主キーにする
- `deepCount` は「深掘りは最大2回」という体験設計上の制約として保持する
- `checkoutAttempt` と `premiumAccess` は外部checkout後の戻り・リーディング解放に使う

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

## AI生成設計

`POST /api/reading` と `POST /api/premium/three-card` は `lib/ai/oracleMessage.js` を経由してメッセージを生成します。

```text
request
  -> cardName / theme / diagnosisType / deepFocus
  -> prompt build
  -> OpenAI Responses API
  -> structured parse
  -> validation / banned terms check
  -> fallback if needed
```

AIまわりで意識した点:

- APIキー未設定・API失敗時でも画面確認できるよう、構造化フォールバックを必ず返す
- 4行固定の出力形式にし、`message`、`actionTip`、`afterglowLine` に分解する
- 禁止語チェックでプロダクトトーンから外れる生成を抑える
- 深掘り視点を `deepFocus` として渡し、同じカードでも読み筋を変える

## イベント計測パイプライン

```text
Client Component
  -> trackEvent()
  -> POST /api/events
  -> validateAndNormalizeEvent()
  -> recordEvent()
  -> SQLite events table
  -> analytics APIs
```

保存される主な列:

```text
event
event_normalized
user_id / session_id
ts / date_key
path
theme
card_id
attempt_id
page_name
experiment_id / variant
meta_json
```

正規化例:

- `draw_executed` -> `draw_completed`
- `result_first_paint` -> `result_viewed`
- `page_view` + `meta.page=lp` -> `page_view_lp`

この正規化により、画面イベントの粒度を保ちながら、ファネル集計では比較しやすいキーに揃えています。

## 有料導線とアクセス制御

```text
/premium/intro で checkoutAttempt 発行
  -> premium_checkout_clicked(attemptId付き) 記録
  -> 外部checkout
  -> webhookで purchase_success 記録
  -> /premium/complete で purchase_completed 記録
  -> premiumAccess 付与
  -> /premium/reading で attemptId検証し3枚生成
```

`attemptId` が未記録/期限切れ/重複の場合は購入完了イベントを拒否します（TTL 48時間）。

## 分析APIとKPI

| API | 役割 |
|---|---|
| `GET /api/events` | 日次の簡易確認 |
| `GET /api/analytics/daily` | 日次CV、ユニークユーザーCV、AB条件絞り込み |
| `GET /api/analytics/funnel` | 期間ファネル、`compare=1` による AB 差分 |

主要CV:

- LP -> draw
- draw -> result
- result -> deep
- result -> premium intro
- premium intro -> checkout
- checkout -> purchase success
- checkout -> purchase completed
- result -> note

イベント件数ベースの `cv` とユニークユーザー数ベースの `user_cv` を併記し、単純なイベント連打とユーザー単位の傾向を分けて見られるようにしています。

## ABテスト設計

実験は環境変数で有効化します。

```text
NEXT_PUBLIC_EXPERIMENT_LP_COPY=1
NEXT_PUBLIC_EXPERIMENT_RESULT_CTA_COPY=1
```

割り当てた `experiment_id` と `variant` は `experimentContext` に保存され、`trackEvent()` から各イベントの `meta` にマージされます。これにより、画面側の実験実装と分析API側の比較条件を疎結合にしています。

## セキュリティと運用上の注意

- `ANALYTICS_ADMIN_TOKEN` 未設定時、本番では集計APIを使えない状態にする
- `PURCHASE_WEBHOOK_TOKEN` 未設定時、Webhook は認証失敗にする
- `OPENAI_API_KEY` はサーバー側のみで使用する
- `EVENT_DB_PATH=/tmp/...` は検証向け。本番で長期保存する場合は永続DBへ移行する
- localStorage はユーザー操作可能なので、購入確定の根拠には使わない

## 代表的な設計判断

| 判断 | 理由 |
|---|---|
| 認証なし + localStorage | 小規模な体験導線を速く検証するため |
| SQLite | ポートフォリオと小規模検証で運用しやすく、集計SQLを見せやすいため |
| APIキー未設定でも動作 | レビュー・デモ環境で壊れた画面にしないため |
| attemptId 検証 | 外部checkout戻りの不正確さを補うため |
| docs を厚めに整備 | 個人開発でも保守可能性と設計意図を伝えるため |

## 今後の拡張余地

- SQLite から Postgres / Supabase などの永続DBへ移行
- Webhook の署名検証
- 管理ダッシュボードの token 入力・期間指定対応
- Playwright による主要導線 E2E
- AI出力のA/Bテストと勝ちパターン反映
- 購入プロバイダ別の売上・CV分析
