# やさしいAIオラクルカード

初心者向けのシンプルなAIオラクルカード占いサイトです。  
`Next.js` で動作し、`Vercel` にそのままデプロイできます。

## 機能

- 「カードを引く」ボタン
- 20種類のオラクルカードをランダム表示
- カード名・カード画像の表示
- OpenAI APIで日本語メッセージ生成（150〜200文字）
- Xシェアボタン
- もう一度引くボタン

## セットアップ

```bash
npm install
cp .env.example .env.local
```

`.env.local` に OpenAI APIキーを設定:

```bash
OPENAI_API_KEY=your_openai_api_key
```

## 起動

```bash
npm run dev
```

## Vercel デプロイ

1. GitHub に push
2. Vercel でプロジェクトを import
3. 環境変数 `OPENAI_API_KEY` を設定
4. Deploy

APIキー未設定でもフォールバック文を返すため、画面動作は確認できます。
