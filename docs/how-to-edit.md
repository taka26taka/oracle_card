# How To Edit（Next.js未経験者向け）

このドキュメントは「どこを触れば何が変わるか」を実作業向けにまとめています。

## 1. 文言を変えたい

### トップ文言
- ファイル: `app/page.js`
- 変更箇所: タイトル、説明、診断4択ラベル

### 結果画面文言
- ファイル: `components/result/ResultPageClient.jsx`
- 変更箇所: ボタン文言、premiumカード文言

### premium紹介文
- ファイル: `components/premium/PremiumIntroPageClient.jsx`

## 2. カードを追加したい

- ファイル: `data/cards.json`
- 追加項目: `id`, `name`, `key` + 拡張文言（viralTitleSeeds 等）
- 注意: 既存キーは削除しない（追加のみ）

## 3. 価格や有料導線文言を変えたい

- premium比較表: `components/premium/PremiumDiffTable.jsx`
- premium CTAカード: `components/premium/PremiumCtaCard.jsx`
- result/deepのCTA表示位置:
  - `components/result/ResultPageClient.jsx`
  - `components/deep/DeepPageClient.jsx`

## 4. noteリンクを変更したい

- 設定場所: `.env.local`
- 変数名: `NEXT_PUBLIC_CHECKOUT_URL`

例:
```bash
NEXT_PUBLIC_CHECKOUT_URL=https://note.com/xxxx
```

- 表示ロジック: `components/premium/PremiumIntroPageClient.jsx`
- 未設定時: 「現在準備中です」を表示（リンク無効）

## 5. イベントを追加/修正したい

- 送信処理: `lib/analytics/trackEvent.js`
- 受信API: `app/api/events/route.js`
- 既存名は変更しない:
  - `theme_selected`
  - `diagnosis_completed`
  - `result_first_paint`
  - `share_clicked`
  - `deep_dive_opened`
  - `deep_focus_selected`
  - `premium_cta_clicked`
  - `premium_intro_viewed`
  - `premium_checkout_clicked`

## 6. 変更後に必ずやる確認

```bash
npm run build
```

目視チェック:
1. トップで診断未選択だと進めない
2. result/deepからpremiumに遷移できる
3. checkout URL未設定時に「現在準備中です」が出る
4. もう1枚が `diagnosisType` 付きでdrawに戻る
