# Project Map

このドキュメントは、Next.js初心者でもこのリポジトリ全体を一気に理解できるように作っています。

## ① ユーザーフロー図（Mermaid）

```mermaid
flowchart TD
  A[トップ /] --> B[恋愛状態診断 4択]
  B --> C[/draw]
  C --> D[/api/reading]
  D --> E[/result]
  E --> F[/deep]
  E --> G[/premium/intro]
  F --> H{deepCount >= 2 ?}
  H -- No --> F
  H -- Yes --> G
  G --> I[外部購入リンク NOTE想定]
```

補足:
- 診断未選択では `/draw` に進めません。
- `deep` は最大2回の深掘り制限があります。

---

## ② state一覧（oracleSession中心）

管理ファイル: `lib/session/oracleSession.js`  
保存先: localStorage (`oracle_session_v1`)

| state | 型 | 役割 | 主に使う場所 |
|---|---|---|---|
| `sessionId` | string | 匿名ユーザー識別 | 全画面（イベント送信時） |
| `selectedTheme` | string | 現在テーマ（互換維持） | `/`, `/draw`, `/result` |
| `diagnosisType` | string | 恋愛状態診断の選択値 | `/`, `/draw`, `/api/reading` |
| `premiumIntent` | boolean | 有料導線を踏んだか | `/result`, `/deep`, `/premium/intro` |
| `threeCardResult` | object\|null | 将来の3枚結果の保存枠 | 現在は未使用 |
| `visitCount` | number | 訪問回数 | トップ初期化処理 |
| `streakDays` | number | 連続訪問日数 | トップ初期化処理 |
| `lastVisitDate` | string | 最終訪問日 | トップ初期化処理 |
| `deepCount` | number | deep実行回数（上限2） | `/deep` |
| `lastResult` | object\|null | 1枚結果データ本体 | `/result`, `/deep`, `/premium/intro` |

---

## ③ 画面別役割（page.jsx / page.js）

### `app/page.js` (`/`)
- 恋愛状態診断4択を表示
- `diagnosisType` を保存
- `diagnosis_completed` を送信して `/draw` へ遷移

### `app/draw/page.js` (`/draw`)
- 1枚抽選と演出（約0.76秒）
- `/api/reading` に `diagnosisType` を含めて送信
- `lastResult` を保存して `/result` へ

### `app/result/page.js` (`/result`)
- エントリのみ（実装本体は `components/result/ResultPageClient.jsx`）
- 結果表示、シェア、deep遷移、有料導線

### `app/deep/page.js` (`/deep`)
- エントリのみ（実装本体は `components/deep/DeepPageClient.jsx`）
- dynamic import（`ssr: false`）で build安定化対策

### `app/premium/intro/page.jsx` (`/premium/intro`)
- エントリのみ（実装本体は `components/premium/PremiumIntroPageClient.jsx`）
- 無料 vs 有料差分表示、外部リンク導線

---

## ④ API一覧

### `POST /api/reading`
- ファイル: `app/api/reading/route.js`
- 入力:
  - `cardName` (必須)
  - `theme` (任意)
  - `diagnosisType` (任意)
  - `deepFocus` (任意)
- 出力: `{ message, fallback, reason? }`

### `POST /api/events`
- ファイル: `app/api/events/route.js`
- 入力:
  - `event` (必須)
  - `sessionId`, `ts`, `path`, `theme`, `cardId`, `meta`
- 出力: `{ ok: true }`

### `/api/premium`
- 現在: **未実装**
- 状態: 有料は外部リンク遷移のみ（MVP）

---

## ⑤ 収益導線（無料→有料）のコード位置

```text
無料導線
  app/page.js                    診断入口
  app/draw/page.js               1枚生成
  components/result/ResultPageClient.jsx  結果表示
  components/deep/DeepPageClient.jsx      深掘り

有料導線
  components/result/ResultPageClient.jsx  premiumCTA（source: result）
  components/deep/DeepPageClient.jsx      deep2回後 premiumCTA（source: deep_limit）
  components/premium/PremiumIntroPageClient.jsx  差分表 + 購入リンク
```

関連イベント:
- `premium_cta_clicked`
- `premium_intro_viewed`
- `premium_checkout_clicked`

---

## ⑥ 不要コード・重複の指摘

### A. 未使用のstateヘルパー（軽微）
- `lib/session/oracleSession.js`
  - `setThreeCardResult`
  - `resetPremiumState`
- 現状のMVPでは呼ばれていません（将来3枚実装用の先置き）

### B. 概念重複（要整理候補）
- `selectedTheme` と `diagnosisType` がほぼ同じ値で運用されている
- 現在は互換維持のため併存。将来どちらかへ統一すると理解しやすくなります。

### C. pageファイルは薄くてOK
- `app/result/page.js` / `app/deep/page.js` / `app/premium/intro/page.jsx` はエントリ専用
- 実ロジックは `components/*` 側にあるのが正しい構造です。
