# How To Edit（実装運用向け）

このドキュメントは、実装変更時にどこを触るかを最短で判断するための作業ガイドです。

## 1. LP文言やABコピーを変える

- ファイル: `app/page.js`
- 変更対象:
  - hero文言
  - セクション文言
  - ABテスト分岐（`experiment.variant`）

注意:
- `trackEvent(EVENT_NAMES.PAGE_VIEW, { meta: { page: PAGE_NAMES.LP }})` は消さない
- `setExperimentContext` を残す（後続イベントのmeta付与に必要）

## 2. 1枚結果やdeep体験を変える

- 結果本体: `components/result/ResultPageClient.jsx`
- 深掘り本体: `components/deep/DeepPageClient.jsx`
- タイトル/共有文: `lib/reading/generateViralTitle.js`, `lib/reading/viralCopy.js`

注意:
- `result_first_paint`, `result_viewed`, `deep_focus_selected` の契約を壊さない
- `deepCount` 上限（2）を変える場合はKPI定義も同時更新

## 3. note導線を変える

- ルーティング先URL: `.env.local` (`NEXT_PUBLIC_NOTE_URL_*`, `NEXT_PUBLIC_CHECKOUT_URL`)
- 診断別マップ: `lib/monetization/noteMap.js`
- CTA表示: `components/result/ResultPageClient.jsx`, `components/premium/PremiumIntroPageClient.jsx`

## 4. 課金完了フローを変える

- 戻り完了API: `app/api/purchase/complete/route.js`
- webhook完了API: `app/api/purchase/webhook/route.js`
- 完了画面: `components/premium/PremiumCompletePageClient.jsx`
- 購入検証ロジック: `lib/analytics/eventStore.js`

注意:
- `attemptId` 検証と重複防止ロジックは維持する

## 5. 計測を追加/修正する

- 送信: `lib/analytics/trackEvent.js`
- 受信/保存: `app/api/events/route.js`, `lib/analytics/eventStore.js`
- 契約定義: `lib/analytics/events.js`
- 集計API: `app/api/analytics/daily/route.js`, `app/api/analytics/funnel/route.js`

注意:
- 既存イベント名は変更しない
- 変更時は `docs/kpi-plan.md` も更新する

## 6. 実装後の確認

```bash
npm run build
```

手動確認:
1. `/` で診断未選択時にCTA無効
2. `/result` で `result_viewed` が送信される
3. `/premium/intro` で checkoutクリック時に `attemptId` が付与される
4. `/premium/complete` から `/premium/reading` に遷移できる
5. `GET /api/analytics/daily` が `x-admin-token` で取得できる
