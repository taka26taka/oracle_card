# Architecture Overview

## 何のアプリか（3行）
このアプリは、女性向け恋愛オラクルのWebアプリです。  
無料の1枚リーディングで拡散と保存を狙い、深掘り後に有料導線へつなげます。  
匿名運用・個人開発を前提に、最小構成で収益実験できる設計です。

## 画面構成

```text
/                  トップ（恋愛状態診断4択）
  -> /draw         1枚引き演出
  -> /result       結果表示（スクショ + 共有 + premium導線）
      -> /deep     深掘り（最大2回）
      -> /premium/intro   有料3枚の案内
```

## state構造

保存先: localStorage (`oracle_session_v1`)

```text
sessionId          匿名セッションID
selectedTheme      描画時のテーマキー
diagnosisType      診断4択の選択値
lastResult         1枚結果（カード、文、日付、deep文など）
deepCount          deep実行回数（0-2）
premiumIntent      有料導線を踏んだか
threeCardResult    将来の3枚結果用スロット（未使用）
```

## API構造

```text
POST /api/reading
  input: cardName, theme, diagnosisType?, deepFocus?
  output: { message, fallback, reason? }

POST /api/events
  input: event, sessionId, ts, path, ...meta
  output: { ok: true }
```

## 有料導線構造

```text
無料1枚 (/result)
  -> premiumカード表示
  -> /premium/intro

無料deep2回到達 (/deep)
  -> premiumカード表示
  -> /premium/intro
```

## 収益導線（現在）

```text
X拡散
  -> 無料1枚
  -> deepで回遊
  -> /premium/intro
  -> 外部購入リンク（NEXT_PUBLIC_CHECKOUT_URL）
```

購入リンク未設定時は「現在準備中です」を表示し、リンク無効にします。
