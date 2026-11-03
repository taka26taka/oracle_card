# AGENTS.md

このリポジトリ固有の事実とルール。Claude Code と Codex の両方が読む。
AIごとの役割は各自のグローバル設定にあり、ここには書かない。

## プロジェクト概要
- 目的: 恋愛の迷いを短い言葉と行動に整理する1枚引きオラクルカード。無料体験→有料導線→計測までを持つ小さなプロダクト
- 技術構成: Next.js 15 (App Router) / React 18 / better-sqlite3 / OpenAI Responses API / Node.js 22（.nvmrc）
- 公開先: Vercel 想定（vercel.json）
- 費用: OpenAI API は従量課金。モデル・最大トークンは .env の OPENAI_MODEL / OPENAI_MAX_OUTPUT_TOKENS

## 確認コマンド
```bash
nvm use
npm ci
npm run lint
npm test                 # unit + components
npm run test:integration
npm run build
```

## 設計上の約束（詳細は docs/edit-rules.md、docs/file-map.md）
- 購入完了はフロントの戻り先だけで確定させない。Webhook で記録済みの attemptId のみ purchase_completed にする。
- OpenAI API を呼ぶテストは書かない。フォールバック経路でテストする。

## 触るときに注意する場所
- app/api/purchase/、lib/api/adminAuth.js、app/api/analytics/: 変更したら Codex のレビューでセキュリティ観点を必須にする。
- .env.example にはダミー値のみ。

## 既知の問題
- EVENT_DB_PATH が /tmp の SQLite を指している。Vercel では /tmp がインスタンスごとに別で永続しないため、
  本番ではイベントと購入記録（Webhook → purchase_completed の照合）が失われる可能性がある。
  本番で課金を有効にする前に永続DBへの移行が必要。方針を decisions/ に記録してから実装する。
- NEXT_PUBLIC_NOTE_URL_* は note.com トップを指すダミー値。

## 現在の状態
docs/ai/HANDOFF.md を参照。
