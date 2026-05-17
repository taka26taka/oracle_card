# Release Operations Checklist

更新日: 2026-02-15

このチェックリストは、儀式型UX（draw/result）を本番運用するための最終確認手順です。

## 1. 事前チェック（ローカル）

1. 依存確認
```bash
npm install
```

2. ビルド確認
```bash
npm run build
```

3. 起動確認
```bash
npm run dev
```

## 2. 実機導線チェック（スマホ優先）

対象導線:
`/` -> `/draw` -> `/result` -> `/premium/intro`

確認項目:
1. トップ: テーマ選択が「カードを引く体験」に見える
2. draw: `1枚引く` 後に「間」がある（速すぎない）
3. result: タイトル先出し -> 本文遅延表示が自然
4. result: 主CTAが最も目立ち、`OTHER ACTIONS` は初期閉じ
5. premium intro: CTA直前の3訴求が短く読める

## 3. 計測イベントの動作確認

### 3-1. draw完了イベント

```bash
TS=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
curl -sS -X POST http://127.0.0.1:3000/api/events \
  -H 'content-type: application/json' \
  --data "{\"event\":\"draw_executed\",\"sessionId\":\"qa_session_001\",\"ts\":\"$TS\",\"path\":\"/draw\",\"theme\":\"mutual\",\"cardId\":7,\"meta\":{\"delayMs\":1100}}"
```

期待: `{"ok":true}`

### 3-2. premium CTAイベント

```bash
TS=$(date -u +%Y-%m-%dT%H:%M:%S.000Z)
curl -sS -X POST http://127.0.0.1:3000/api/events \
  -H 'content-type: application/json' \
  --data "{\"event\":\"premium_cta_clicked\",\"sessionId\":\"qa_session_001\",\"ts\":\"$TS\",\"path\":\"/result\",\"theme\":\"mutual\",\"cardId\":7,\"meta\":{\"source\":\"result\"}}"
```

期待: `{"ok":true}`

### 3-3. DB記録確認

```bash
node -e "const Database=require('better-sqlite3');const db=new Database('/tmp/oracle-events.sqlite',{readonly:true});const rows=db.prepare('SELECT event,event_normalized,path,theme,card_id,meta_json,ts FROM events WHERE session_id=? ORDER BY id DESC LIMIT 5').all('qa_session_001');console.log(JSON.stringify(rows,null,2));"
```

期待:
1. `draw_executed` が `draw_completed` として正規化されている
2. `premium_cta_clicked` が記録されている
3. `meta_json` に `delayMs` / `source` が入っている

## 4. デプロイ後24時間の監視

毎日1回（最低24時間）:
```bash
curl -H "x-admin-token: <token>" "https://<domain>/api/analytics/daily?date=2026-02-15"
```

注視するCV:
1. `lp_to_draw`
2. `draw_to_result`
3. `result_to_premium_intro`
4. `premium_intro_to_checkout`

補助確認:
1. `draw_completed` 件数
2. `premium_cta_clicked` 件数
3. エラー率（API 4xx/5xx）

## 5. ロールバック基準（UX）

以下のいずれかでロールバック検討:
1. `lp_to_draw` が前週比 -15%以上
2. `result_to_premium_intro` が前週比 -15%以上
3. 実機でdraw演出が重い/固まる報告が継続
