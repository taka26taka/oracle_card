# State Design

このドキュメントは「どの値がどこで保存されるか」を初心者向けにまとめたものです。

## 保存場所
- 保存先: `localStorage`
- キー名: `oracle_session_v1`
- 管理ファイル: `lib/session/oracleSession.js`

## フィールド一覧

### `sessionId`
- 用途: 匿名ユーザーの識別
- 変更タイミング: 初回アクセス

### `selectedTheme`
- 用途: 現在フローで使うテーマ
- 変更タイミング: 診断選択時、draw遷移時

### `diagnosisType`
- 用途: 恋愛状態診断の結果
- 値: `mutual | unrequited | reconciliation | waiting_contact`
- 変更タイミング: トップ4択選択時

### `lastResult`
- 用途: 1枚結果の全データ
- 中身: `card`, `title`, `message`, `actionTip`, `afterglowLine`, `drawnAt`, `deepMessage` など
- 変更タイミング: draw完了時

### `deepCount`
- 用途: deep実行回数の制限
- 範囲: `0-2`
- 変更タイミング: deep実行時

### `premiumIntent`
- 用途: 有料導線をクリックしたか
- 値: `boolean`
- 変更タイミング: result/deepからpremium導線押下時

### `threeCardResult`
- 用途: 将来の3枚結果保存枠（MVPでは未使用）
- 値: `object | null`

## 画面ごとの利用

```text
/            diagnosisType をセット
/draw        diagnosisType を参照し /api/reading へ送信
/result      lastResult を表示、premiumIntent を true にする
/deep        deepCount を更新、premiumIntent を true にする
/premium/... premiumIntent を参照可能（将来拡張）
```

## 変更時の注意
- キー名 `oracle_session_v1` を変えると既存データが読めなくなる
- `deepCount` の上限（2）を壊すと回遊設計が崩れる
- `diagnosisType` は `THEME_LABELS` と同じキー体系にする
