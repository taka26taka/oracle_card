# Turso 採用前のセキュリティ評価（Codex）

- 日付: 2026-11-07
- 実行方法: `codex exec -C ~/projects/oracle_card -s read-only`（読み取りのみ。ファイルの編集・コミットなし）
- 対象: main 8534e01 の docs/decisions/2026-11-07-event-db-persistence.md と、DB まわりのコード（eventDb.js、eventStore.js、6 API ルート、adminAuth.js）
- 依頼文の観点: 購入記録の完全性、認証情報、攻撃面、保存データ、可用性、バックアップと復旧、依存の追加
- 扱い: 以下は Codex の出力そのまま（編集していない）。要約と採用条件は決定記録を参照
- 関連タスク: T-0004（決定記録の作成）、T-0005（採用と条件の追記）

---

**結論：条件付きで採用可。**  
Turso は現在の購入照合を保って移行できるため、候補として妥当です。ただし「SQLite互換なので安全」とは判断できません。  
採用条件に、非同期化による認可漏れ防止、再送の冪等性、資格情報の分離、購入記録の復旧手順を追加してください。

重要度は、移行・課金開始時に未対応だった場合の評価です。現行の同期コードに、すでに Promise による認可漏れがあるという意味ではありません。

| # | 重要度(high/medium/low) | 観点 | 内容 | 採用前に必要か / 実装タスクで対応か | 対応案 |
|---|---|---|---|---|---|
| 1 | high | 購入記録の完全性 | `lib/analytics/eventStore.js:184` の排他制御は移行可能。ただし全照会・INSERTを**同じトランザクションオブジェクト**で実行する必要がある。HTTP往復と5秒の制限で失敗が増える可能性がある。 | 採用前に条件化／段階2・3で実証 | `transaction("write")` 内で確認→INSERT→`await commit()`。失敗・早期return時もrollback／closeする。外部API呼び出しを中に入れない。[公式SDK](https://docs.turso.tech/sdk/ts/reference) |
| 2 | high | async化・認可 | `app/api/premium/three-card/route.js:30` は購入確認を直接否定している。async化後にawaitを忘れるとPromiseがtruthyとなり、未購入でも通る。内部の `Boolean(row)`（`eventStore.js:121`）も同様。 | 実装タスク：段階1・2必須 | 6ルートだけでなく内部ヘルパー・比較集計まで確認。購入照合の結果が明示的に `true` の場合だけ許可。未購入・別session・照合reject・遅延Promiseで、生成処理が呼ばれないテストを追加。better-sqlite3の同期transactionコールバック自体はasyncにしない。 |
| 3 | high | タイムアウト・再送 | `eventStore.js:196` は48時間の期限検証を重複判定より先に行う。コミット後の応答消失→期限後の再送では、記録済みでも400になる。未記録のまま期限を越えた購入も自動回復できない。 | 採用前に回復方針決定／段階2で対応 | 同一attempt・session・注文の記録済み再送は期限と分けて判定。コミット結果不明時は新しい接続で照合し、同じキーで再試行。未確定障害は5xxで返し、送信元の再送・決済記録からの照合復旧を用意する。 |
| 4 | medium | 二重記録の防御 | `lib/analytics/eventDb.js:40` のインデックスは非UNIQUE。現在は排他transactionが唯一の重複防止策。注文検索（`eventStore.js:215`）はJSON抽出で、専用索引もなくロック保持時間が伸びる。 | 実装タスク：段階2 | checkout・purchase_success・purchase_completedのattempt、およびprovider＋注文IDに適切な部分UNIQUE索引等を追加。既存重複を先に検査し、制約違反を正当な再送と注文使い回しに区別する。 |
| 5 | high | 資格情報・影響範囲 | TursoのDBトークンは既定で全権限・無期限。漏れると閲覧だけでなく購入記録の偽造・削除につながる。読み取り専用でも、認可に使うattempt／sessionの組を取得できる。 | 採用前に管理方針決定／段階3で設定 | 本番・Previewを別DB／トークンにし、サーバー環境変数のみで保持。`NEXT_PUBLIC_*`・ログに出さない。単一DB用・期限付きトークンを使い、集計はread-only接続へ分離。DB URL単体は通常認証秘密ではないが、接続先情報として管理する。[発行仕様](https://docs.turso.tech/cli/db/tokens/create) |
| 6 | medium | ローテーション | 単に新トークンを発行しても旧トークンは残る。公式CLIのinvalidateは全DBトークンに加え、所属グループのトークンにも影響すると記載されている。 | 実装・運用：段階3 | 有効期限、更新担当、漏えい時の失効→再発行→再デプロイ手順を決める。グループトークンをアプリに配らず、他サービスへの失効影響も確認。[失効仕様](https://docs.turso.tech/cli/db/tokens/invalidate) |
| 7 | medium | 攻撃面・枠の消費 | `app/api/events/route.js:22` のOrigin等はブラウザー外から偽装可能で、認証ではない。公開イベント投稿からクラウドDBの書込枠・ロックを消費され、購入処理に波及しうる。指定ルート内にレート制限はない。 | 実装タスク：段階2・3 | 投稿頻度・サイズ制限、異常増加の監視、集計期間の上限を設定。接続先を固定しTLSを必須にする。購入確認・購入記録を一般計測と分離する構成も検討する。SQLのパラメータバインドは維持する。 |
| 8 | medium | 保存データ・削除 | `eventStore.js:157` ではuser_idとsession_idが同じ値。時刻・path・恋愛テーマ・診断・注文IDと結びつく仮名識別データであり、匿名とは扱えない。`meta_json` は検証後meta全体を保存する。 | 採用前に保存方針決定／段階2・3で対応 | metaを用途別許可リストにし、自由文・氏名・メール・URLクエリを入れない。計測と購入証跡の保持期間を分け、購入権限や注文重複防止に必要な行を一括TTL削除しない。削除対象はバックアップにも反映する運用を決める。 |
| 9 | medium | 暗号化・保存地域 | Tursoは保存時のボリューム暗号化を公式に記載。ただし有効なトークンでの読出しや購入偽造を防ぐ機能ではない。今回のDBの保存地域・複製先は未確定。 | 採用前に地域・保護要件確認／段階3で検証 | primary・replica・バックアップの保存地域を確認し記録。TLS接続と証明書検証を必須化。BYOKは別機能で、必須とするかは扱うデータから判断する。[暗号化仕様](https://docs.turso.tech/cloud/encryption) |
| 10 | high | 可用性・fail closed | `eventStore.js:329` は実際にはpurchase_successを購入権限として読む。DB障害は購入済み利用者の3枚生成も止める。無料枠への余裕は攻撃・集計負荷を含む可用性保証にならない。 | 採用前に停止時方針決定／段階3で検証 | 購入照合不能時は**fail closed**、生成・OpenAI呼出しをせず503等の再試行可能な応答にする。一般計測の失敗は基本機能を止めない。Webhookは永続化確認前に2xxを返さない。月1回より早い枠・エラー監視と、課金停止／プラン変更手順を設ける。[上限とBLOCKED](https://docs.turso.tech/help/usage-and-billing) |
| 11 | high | バックアップ・復旧 | 購入記録消失は利用権消失になる。`turso db export` は最新変更を含まない場合があり、**書込停止だけでは最新性を保証できない**。 | 採用前に復旧要件決定／段階3・4で実証 | 許容損失時間・復旧時間を定義。PITR＋独立した暗号化バックアップ＋決済側との再照合を用意。exportは公式のsync等で最新性を検証する。復旧後の購入利用・二重注文防止まで訓練する。[export](https://docs.turso.tech/cli/db/export)、[PITR](https://docs.turso.tech/features/point-in-time-recovery) |
| 12 | medium | サプライチェーン | `@libsql/client` は公式SDKだが、採用バージョン・推移依存の安全性は今回未確認。Node版と`/web`版ではfile接続対応も異なる。 | 実装タスク：段階2 | 正式なパッケージ名・配布元を確認しlockfile固定、依存差分・install script・ネイティブ依存・脆弱性を確認。秘密のない環境でインストール／検証し、本番トークンは実行時だけ渡す。[SDK仕様](https://docs.turso.tech/sdk/ts/reference) |

**D1・Neonとの比較**

- **D1:** 公式に`batch()`の原子性・失敗時rollbackは確認できます。ただし「SELECT結果をJSで判定してからINSERT」という現在の対話的処理を、そのまま維持できることは未確認です。batchだけに置き換えても同等にはなりません。条件付きINSERT・UNIQUE制約等への再設計と、中継Workerの認証・入力制限が必要です。[D1 API](https://developers.cloudflare.com/d1/worker-api/d1-database/)
- **Neon:** WebSocketのPool／Clientで対話的transactionを利用できます。ただしPostgresの通常のtransactionを使うだけでは、同時SELECT→INSERTの競合は防げません。UNIQUE制約、適切なロックまたはSerializable＋再試行が必要です。SQL移植に加え、DBロールでの最小権限設計も行う必要があります。[Neon driver](https://neon.com/docs/serverless/serverless-driver)

この比較では、Tursoが変更を小さくできるという推奨は維持できます。

**4段階の移行手順への追加**

1. **async化:** ルート・内部ヘルパーを含むawait一覧を作る。未購入・別session・DB例外時に認可されないテストを必須にする。
2. **クライアント置換:** 同一transactionへの集約、commit待機、全経路の解放、UNIQUE制約、再送処理、依存監査を追加する。`busy_timeout`はTursoでは効かないため、ローカル設定を引き継いだつもりにしない。[Turso制限](https://docs.turso.tech/cloud/limitations)
3. **Preview確認:** 本番とは別のDBで、複数接続から同時Webhook・同一注文の別attempt・5秒超過・commit応答消失・期限後再送・BLOCKED相当・トークン失効を確認する。保存地域、資格情報、バックアップ復元も確認する。
4. **課金開始判定:** high指摘の解消と、監視・再送・復旧手順の実証を開始条件にする。一般計測データの保持期間と購入証跡の保持期間を記録する。

**確認できなかったこと**

- 指定ファイルのみを現在の作業ディレクトリで読みました。レビュー用worktreeとの一致、過去レビューの指摘対応状況は未確認です。
- `eventValidation.js`・入力検証関数・ブラウザー側は対象外のため、metaの全許可項目、識別子の生成強度、pathのクエリ除去、自由文混入防止は未確認です。
- Webhookは共有トークン照合を確認しましたが、決済プロバイダーの署名・金額照合・再送保証は未確認です。
- 実際のTurso契約、TLS設定、保存地域、バックアップ所在地、Vercelの環境変数設定・アクセス権限は未確認です。
- 公式PITR資料には無料24時間・Developer 10日の復元期間がありますが、契約プランへの適用は未確認です。料金資料にもプラン名の揺れがあるため、決定記録の無料枠・価格を確定値とは扱っていません。
- `cat`・`nl -ba`による指定ファイルの静的確認と、公式資料の閲覧を実施しました。lint・テスト・build・依存監査・リモートDB実験は**未実行**です。ファイル作成・編集・コミットは行っていません。