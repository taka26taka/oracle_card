# 編集ルール（壊さず保守するための基準）

この章でわかること: どこまで変更してよく、どこから危険か。

## 1. まず守る原則（破壊防止）

結論: 画面を変えても「遷移」「イベント契約」「制約」は壊さない。

必須で守ること:
- 診断未選択で `/draw` / `/result` に進めない
- deepの上限2回を維持
- premium導線は `/result` と `/deep`（2回到達時）を維持
- イベント名の契約を維持
- APIの必須入力（`cardName` など）を壊さない

## 2. 壊れやすい箇所

この章でわかること: ミスしやすい具体場所。

### `app/result/page.js`
- 理由: `result_first_paint` 計測と `deep_dive_opened` / `premium_cta_clicked` がKPIに直結
- 注意: 計測イベントの意味を混ぜない

### `app/deep/page.js`
- 理由: 深掘り2回制限と `deep_focus_selected` / `premium_cta_clicked` がある
- 注意: `deep_dive_opened` と再利用しない

### `lib/session/oracleSession.js`
- 理由: localStorageキーと制約ロジックの中心
- 注意: `oracle_session_v1` と `selectedTheme/diagnosisType/lastResult/deepCount/sessionId` の互換性

### `app/premium/intro/page.jsx`
- 理由: `premium_intro_viewed` と `premium_checkout_clicked` を送る
- 注意: 外部リンク導線は残し、決済実装を混ぜない

### `lib/reading/viralCopy.js`
- 理由: テーマキーと共有文に強く依存
- 注意: テーマキー変更で画面と計測が壊れる

## 3. UIのみ変更OK範囲

この章でわかること: 見た目だけ触る安全範囲。

変更OK（基本安全）:
- `app/globals.css`
- 各 `app/*/page.js` の Tailwind className
- 画面文言（ただしイベント名/遷移条件を変えない）

変更NG（UI変更のつもりでも危険）:
- `trackEvent("...")` のイベント名
- `router.push/replace` の遷移先
- `disabled` 条件（診断必須）

## 4. 変更禁止・要注意ルール

この章でわかること: 守らないとKPI比較不能になるルール。

### 4.1 イベント名変更禁止（既存互換維持）

次のイベント名は変更禁止:
- `theme_selected`
- `diagnosis_completed`
- `result_first_paint`
- `share_clicked`
- `deep_dive_opened`
- `deep_focus_selected`
- `premium_cta_clicked`
- `premium_intro_viewed`
- `premium_checkout_clicked`

### 4.2 KPIイベントの意味を混ぜない

- `deep_dive_opened`: resultからdeepへ遷移した時のみ
- `deep_focus_selected`: deep内で深掘り実行した時のみ
- `premium_cta_clicked`: resultかdeep(2回到達)からpremium導線を押した時のみ
- `premium_intro_viewed`: premium introを表示した時のみ
- `premium_checkout_clicked`: premium introの外部購入リンクを押した時のみ

### 4.3 制約の維持

- 診断未選択で進行不可
- 深掘り2回まで
- deep 2回到達前は premium CTA を deep に出しすぎない
- `cards.json` は追加中心（既存キー削除は避ける）

## 5. 今後追加しやすい場所（拡張ポイント）

この章でわかること: 将来機能をどこに足すか。

- 新しいコピー生成: `lib/reading/`
- 新しい計測: `lib/analytics/trackEvent.js` + `app/api/events/route.js`
- 新しい画面: `app/<new-route>/page.js`
- 新しいカード属性: `data/cards.json`（追加のみ）
- 外部連携（将来）: `app/api/` に新規route追加
- 有料導線文言: `app/result/page.js` / `app/deep/page.js` / `app/premium/intro/page.jsx`

## 6. PR前チェックリスト

この章でわかること: 最低限の自己確認項目。

- [ ] `npm run build` が通る
- [ ] 入口で診断未選択時にCTAが押せない
- [ ] 診断選択後に `/draw?diagnosisType=...` へ遷移する
- [ ] `/result` で `deep_dive_opened` が送られる
- [ ] `/deep` で `deep_focus_selected` が送られる
- [ ] `/result` と `/deep`(2回到達時) で `premium_cta_clicked` が送られる
- [ ] `/premium/intro` で `premium_intro_viewed` が送られる
- [ ] `/premium/intro` の購入ボタンで `premium_checkout_clicked` が送られる
- [ ] 深掘り2回上限が効く
- [ ] `result_first_paint` が送られる
- [ ] READMEのドキュメントリンクが壊れていない
