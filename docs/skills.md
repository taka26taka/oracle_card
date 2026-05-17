# Skills

このドキュメントは、転職ポートフォリオとしてこのプロジェクトから読み取れるスキルを整理したものです。README では概要を伝え、面接や職務経歴書ではこの内容をもとに説明できます。

## 呼び出し方

この `docs/skills.md` は実行コマンドではなく、ポートフォリオ説明用のスキル索引です。README や面接準備、職務経歴書の補足資料から参照して使います。

### READMEから参照する

README の「ドキュメント」欄から `docs/skills.md` を開くと、プロジェクトで示せる技術領域を一覧できます。採用担当者には、README で概要を見てもらい、詳細な技術説明としてこのファイルを読んでもらう想定です。

### 面接で使う

面接では、聞かれた領域に合わせて該当セクションを呼び出します。

```text
AI実装について聞かれた場合:
  -> 「2. AIアプリケーション設計」

課金導線について聞かれた場合:
  -> 「5. 収益導線・課金前後の整合性」

分析やKPIについて聞かれた場合:
  -> 「4. データ設計・分析」

保守性について聞かれた場合:
  -> 「8. 保守・運用設計」
```

### Codexに依頼するときの例

Codex にこのプロジェクトの説明や改善を頼む場合は、次のように対象セクションを指定します。

```text
docs/skills.md の「AIアプリケーション設計」をもとに、面接で30秒で説明できる文章を作って
```

```text
docs/skills.md の「収益導線・課金前後の整合性」を見て、README向けに短く要約して
```

```text
docs/skills.md を前提に、このPJで職務経歴書に書ける技術要約を作って
```

### 変更するときのルール

- 新機能を追加したら、該当するスキル領域に関連ファイルを追記する
- 技術スタックを変えたら README と `docs/architecture-overview.md` も同時に更新する
- 面接で説明しやすい言葉に寄せ、実装していないことは書かない

## 1. フロントエンド実装

- Next.js App Router によるページ構成
- React Client Component による画面状態とユーザー操作の実装
- モバイル前提のLP、結果画面、深掘り画面、有料導線画面のUI設計
- Tailwind CSS ユーティリティによる軽量なスタイリング
- 画面遷移、CTA、disabled状態、戻り導線の制御

関連ファイル:

- `app/page.js`
- `app/draw/page.js`
- `components/result/ResultPageClient.jsx`
- `components/deep/DeepPageClient.jsx`
- `components/premium/*`

## 2. AIアプリケーション設計

- OpenAI Responses API を使った文章生成
- プロンプト内で出力形式、文体、禁止語を制御
- 生成結果を `message` / `actionTip` / `afterglowLine` に構造化
- APIキー未設定・API失敗時も体験を止めないフォールバック設計
- 診断タイプ、カード、深掘り視点を入力にしたパーソナライズ

関連ファイル:

- `app/api/reading/route.js`
- `app/api/premium/three-card/route.js`
- `lib/ai/oracleMessage.js`

## 3. API設計

- Next.js Route Handler による JSON API 実装
- 入力値の検証と正規化
- 管理APIの token 認証
- Webhook 受信APIの token 認証
- エラー時のレスポンス設計

関連ファイル:

- `app/api/events/route.js`
- `app/api/analytics/daily/route.js`
- `app/api/analytics/funnel/route.js`
- `app/api/purchase/complete/route.js`
- `app/api/purchase/webhook/route.js`
- `lib/api/adminAuth.js`

## 4. データ設計・分析

- SQLite を使ったイベント永続化
- イベント名と集計キーの分離
- 日次集計、期間ファネル集計、ユニークユーザーCV
- ABテストの `experiment_id` / `variant` 保存
- KPI保存スクリプトと週次差分スクリプト

関連ファイル:

- `lib/analytics/eventDb.js`
- `lib/analytics/eventStore.js`
- `lib/analytics/events.js`
- `lib/analytics/eventValidation.js`
- `scripts/ops/save_daily_kpi.sh`
- `scripts/ops/weekly_kpi_diff.sh`

## 5. 収益導線・課金前後の整合性

- 無料体験から有料ページへの導線設計
- checkout attempt の発行
- Webhook の `purchase_success` と戻り画面の `purchase_completed` を分けた設計
- `attemptId`、`sessionId`、TTL、重複記録の検証
- 購入済みユーザーだけに3枚リーディングを返すアクセス制御

関連ファイル:

- `components/premium/PremiumIntroPageClient.jsx`
- `components/premium/PremiumCompletePageClient.jsx`
- `components/premium/PremiumReadingPageClient.jsx`
- `app/api/purchase/complete/route.js`
- `app/api/purchase/webhook/route.js`
- `app/api/premium/three-card/route.js`
- `lib/analytics/eventStore.js`

## 6. 状態管理

- localStorage を使った匿名セッション管理
- 旧キー互換を残した state migration
- 診断結果、抽選結果、深掘り回数、購入試行、購入アクセス権の保持
- 再訪回数と連続訪問日の計測

関連ファイル:

- `lib/session/oracleSession.js`
- `docs/state-design.md`

## 7. プロダクト設計

- LP、無料結果、深掘り、有料体験のファネル設計
- 「深掘りは最大2回」という体験と収益導線のバランス
- note URL と UTM の診断タイプ別出し分け
- 共有文やバイラルタイトルの生成ルール
- 改善のためのKPI定義

関連ファイル:

- `docs/monetization-flow.md`
- `docs/kpi-plan.md`
- `lib/monetization/noteMap.js`
- `lib/reading/viralCopy.js`
- `lib/reading/generateViralTitle.js`

## 8. 保守・運用設計

- ファイルマップによる編集範囲の明確化
- 壊しやすいイベント契約と遷移条件の明文化
- リリース前チェックリスト
- 実機QAログテンプレート
- 統合スモークテスト

関連ファイル:

- `docs/file-map.md`
- `docs/edit-rules.md`
- `docs/release-operations-checklist.md`
- `docs/release-day-checklist.md`
- `docs/mobile-qa-log-template.md`
- `scripts/tests/integration_smoke.mjs`

## 面接で説明しやすいポイント

1. AI生成だけでなく、失敗時のフォールバックまで設計している
2. CV改善を前提に、イベント保存とファネル集計を自前で実装している
3. 外部決済の戻りURLを信用しすぎず、Webhook と attempt 検証で整合性を取っている
4. 個人開発でも docs を整備し、変更時に壊しやすい契約を明文化している
5. 画面、API、分析、課金導線を小さく分離し、拡張しやすい構造にしている
