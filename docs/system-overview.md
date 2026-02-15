# システム全体像（保守理解用）

この章でわかること: このアプリが「何を目指し」「どの順番で動き」「どこで計測しているか」を短時間で把握できます。

## 1. アプリの目的

結論: このアプリは「占い」よりも、Xでシェアされる感情コンテンツを作ることを優先しています。

- ユーザーは恋愛状態を診断する（4択）
- 1枚引きでメッセージを受け取る
- スクショしやすい結果を見てXに貼る
- 深掘りで回遊し、再シェアできる
- 必要な人だけ有料導線へ進む（3枚リーディング予告）

## 2. 全体構造

この章でわかること: どのフォルダに何があるか。

```text
app/    画面とAPI
lib/    ロジック（カード・文生成・計測・セッション）
data/   元データ（cards.json）
docs/   運用ドキュメント
```

## 3. ページ遷移図

この章でわかること: 画面の移動順。

```text
[/] トップ
  └─ 恋愛状態4択を選択して「診断して1枚引く」
      ↓
[/draw] 抽選演出 (約0.76秒)
      ↓ 自動遷移
[/result] 結果表示・共有・深掘り
  ├─ 「深掘りする」→ [/deep]
  ├─ 「3枚で恋の流れを見る」→ [/premium/intro]
  └─ 「もう1枚」→ [/draw?diagnosisType=...]

[/deep] 同カード深掘り（最大2回）
  ├─ 2回到達後「3枚で恋の流れを見る」→ [/premium/intro]
  └─ 「トップ戻る」→ [/]

[/premium/intro] 有料案内
  ├─ 無料 vs 有料の差分表
  └─ 外部リンク（note想定）
```

## 4. データの流れ

この章でわかること: どこでデータが作られて保存されるか。

```text
[UI] /draw
  ├─ pickRandomCard() でカード決定
  ├─ /api/reading に cardName, theme, diagnosisType を送信
  ├─ generateViralTitle() でタイトル生成
  └─ setLastResult() で localStorage 保存

[UI] /result
  ├─ getSessionState() で lastResult 読み込み
  ├─ buildShareText() で投稿文生成
  └─ X intent URL を作る

[UI] /deep
  ├─ /api/reading に deepFocus + diagnosisType を送信
  └─ setDeepResult() で deepCount を更新（2回上限）

[UI] /premium/intro
  ├─ premium_intro_viewed を送信
  └─ 外部リンク押下で premium_checkout_clicked を送信
```

補足:
- セッション保存先は localStorage の `oracle_session_v1`
- 主要フィールドは `selectedTheme`, `diagnosisType`, `lastResult`, `deepCount`, `sessionId`

## 5. 計測イベント一覧

この章でわかること: KPIに使うイベント名と発火場所。

必須契約（変更禁止）:
- `theme_selected`（トップでテーマ選択）
- `diagnosis_completed`（診断確定）
- `result_first_paint`（resultタイトル描画計測）
- `share_clicked`（共有ボタン押下）
- `deep_dive_opened`（resultからdeepへ遷移）
- `deep_focus_selected`（deepで深掘り実行）
- `premium_cta_clicked`（result/deep から有料導線押下）
- `premium_intro_viewed`（premium intro 表示）
- `premium_checkout_clicked`（購入リンク押下）

実装済みの補助イベント:
- `draw_executed`
- `revisit_detected`
- `screenshot_intent`

## 6. バズ設計意図

この章でわかること: なぜこのUI設計か。

- 最初に刺さる一文を先に見せる（結果タイトル）
- 1画面でスクショ完結する情報構成
- 共有文はテンプレ3種（short / emotional / night）
- 無料入口を恋愛状態4択にして自己投影しやすくする
- 深掘りで回遊率を上げる（ただし2回で止める）
- deep到達後にだけ有料導線を出し、違和感を減らす

## 7. 30日後に読む人向けの最短理解3ステップ

この章でわかること: まず何を見ればよいか。

1. `app/page.js` → `app/draw/page.js` → `app/result/page.js` → `app/deep/page.js` → `app/premium/intro/page.jsx` を順に読む  
2. `lib/session/oracleSession.js` で状態保存と制約（診断必須・deep上限）を確認  
3. `lib/analytics/trackEvent.js` と `app/api/events/route.js` でイベント契約を確認  
