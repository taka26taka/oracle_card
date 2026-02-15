# ファイルマップ（どこを編集すると何が変わるか）

この章でわかること: 「この変更はどのファイルか」を迷わず判断できます。

## 1. このマップの使い方

- `Safe to edit`: 比較的安全に編集しやすい
- `Need caution`: 仕様や連携先を確認してから編集
- `High risk`: KPIや遷移が壊れやすい

## 2. ルートファイル一覧

### `README.md`
- 役割: プロジェクト全体説明
- 入出力: 人間向けドキュメント
- 依存: なし
- 編集: `Safe to edit`
- 確認: 新しい docs へのリンクがあるか

### `package.json`
- 役割: スクリプトと依存定義
- 入出力: npm scripts / dependency
- 依存: 全体
- 編集: `Need caution`
- 確認: `npm run build` が通るか

### `next.config.mjs`
- 役割: Next.js設定
- 入出力: ビルド/ランタイム設定
- 依存: Next.js本体
- 編集: `Need caution`
- 確認: 本番ビルド影響

### `jsconfig.json`
- 役割: import解決設定（baseUrl）
- 入出力: 開発体験
- 依存: エディタ/ビルド
- 編集: `Need caution`
- 確認: importエラーが出ないか

### `vercel.json`
- 役割: デプロイ設定
- 入出力: Vercelの挙動
- 依存: デプロイ
- 編集: `Need caution`
- 確認: デプロイ先設定に影響

## 3. `app/` 役割マップ

### `app/layout.js`
- 役割: 全ページ共通レイアウト・Tailwind CDN読み込み
- 入出力: すべての画面
- 依存先: `app/globals.css`
- 編集: `Need caution`
- 確認: 全ページに副作用が出ないか

### `app/globals.css`
- 役割: 全体背景/基本フォント
- 入出力: UI全体
- 依存先: `layout.js`
- 編集: `Safe to edit`（見た目のみ）
- 確認: コントラスト・可読性

### `app/page.js` (`/`)
- 役割: テーマ選択入口
- 入出力: `selectedTheme` を保存して `/draw` へ
- 依存先: `lib/session/oracleSession.js`, `lib/analytics/trackEvent.js`
- 編集: `High risk`
- 確認: テーマ未選択で進めないこと

### `app/draw/page.js` (`/draw`)
- 役割: 抽選演出と結果データ作成
- 入出力: `lastResult` を保存して `/result` へ
- 依存先: `lib/cards.js`, `lib/reading/*`, `app/api/reading/route.js`
- 編集: `High risk`
- 確認: 抽選後に必ず結果遷移するか

### `app/result/page.js` (`/result`)
- 役割: 結果表示・共有導線・deep遷移
- 入出力: `result_first_paint`, `share_clicked`, `deep_dive_opened`
- 依存先: `lib/session/oracleSession.js`, `lib/reading/viralCopy.js`
- 編集: `High risk`
- 確認: タイトル表示計測とイベント名

### `app/deep/page.js` (`/deep`)
- 役割: 同カード深掘り（2回制限）
- 入出力: `deep_focus_selected` と deepCount更新
- 依存先: `app/api/reading/route.js`, `lib/session/oracleSession.js`
- 編集: `High risk`
- 確認: 深掘り2回上限が守られるか

### `app/api/reading/route.js`
- 役割: AIメッセージAPI
- 入出力: POST `cardName/theme/deepFocus` → `{message}`
- 依存先: `lib/ai/oracleMessage.js`
- 編集: `Need caution`
- 確認: `cardName` 未指定時 400 になるか

### `app/api/events/route.js`
- 役割: イベント受け取りAPI
- 入出力: POST `event` を受け取る
- 依存先: 画面の `trackEvent`
- 編集: `Need caution`
- 確認: 必須 event 未指定時 400

## 4. `lib/` 役割マップ

### `lib/cards.js`
- 役割: cards.json読み込み、SVG画像生成、ランダム抽選
- 編集: `Need caution`
- 確認: cardオブジェクト形式が変わらないか

### `lib/ai/oracleMessage.js`
- 役割: OpenAI呼び出しとフォールバック生成
- 編集: `Need caution`
- 確認: APIキーなしでもメッセージ返却

### `lib/reading/generateViralTitle.js`
- 役割: ルールベースで意味深タイトル生成
- 編集: `Safe to edit`
- 確認: 長さと口調が大きく崩れないか

### `lib/reading/viralCopy.js`
- 役割: テーマラベル/タグ、共有文、行動TIP
- 編集: `Need caution`
- 確認: テーマキー整合とハッシュタグ

### `lib/session/oracleSession.js`
- 役割: localStorageセッション管理
- 編集: `High risk`
- 確認: `oracle_session_v1` と主要フィールド互換

### `lib/analytics/trackEvent.js`
- 役割: `/api/events` へイベント送信
- 編集: `Need caution`
- 確認: event名とpayloadの破壊がないか

## 5. `data/` の役割

### `data/cards.json`
- 役割: カードの基礎データと拡張文言
- 編集: `Need caution`
- 確認: 既存キーを削除しない（追加のみ推奨）

## 6. `docs/` の役割

### `docs/review-spec.md`
- 役割: 実装レビュー基準
- 編集: `Safe to edit`

### `docs/system-overview.md`
- 役割: 全体理解
- 編集: `Safe to edit`

### `docs/file-map.md`
- 役割: ファイル責務の索引
- 編集: `Safe to edit`

### `docs/edit-rules.md`
- 役割: 変更ルール
- 編集: `Safe to edit`

## 7. 依存関係（図解）

この章でわかること: 画面とロジックのつながり。

```text
app/page.js
  └─ lib/session/oracleSession.js
  └─ lib/analytics/trackEvent.js

app/draw/page.js
  └─ lib/cards.js
  └─ lib/reading/generateViralTitle.js
  └─ lib/reading/viralCopy.js
  └─ app/api/reading/route.js

app/result/page.js
  └─ lib/session/oracleSession.js
  └─ lib/reading/viralCopy.js
  └─ lib/analytics/trackEvent.js

app/deep/page.js
  └─ lib/session/oracleSession.js
  └─ lib/reading/viralCopy.js
  └─ app/api/reading/route.js
  └─ lib/analytics/trackEvent.js
```

