# コードレビュー・改善記録（2026-10-28）

対象: taka26taka/oracle_card。既存 `docs/codex-review.md` と編集ルールを参照。
追加添付の全文を受領し、Phase 1〜9 とPR作成までを対象とする。
既存のコンペ関連ドキュメントの作業差分は対象外。

## 構成・依存関係の調査

- `app` はページ/Route Handler、`components` は操作を伴う画面、`lib/domain` は診断などの純粋処理、`lib/ai` は外部API、`lib/analytics` は入力検証/DB/集計、`lib/session` はブラウザ保存を担当。
- result/deep/premiumのページはServer ComponentからClient Componentを呼ぶ構成。LP/draw/adminは状態・ブラウザAPI・イベント処理を持つClient Component。AIキーとSQLiteはAPI側に限定される。
- `cards.js` は静的JSONから画像生成と抽選を行う。カードデータとUIの変更は不要。
- Reactの結果/ロード中/深掘り回数はローカルstate、画面間引継ぎはlocalStorage。既存state更新は概ねイミュータブル。非同期処理は画面離脱時のキャンセルが不足。
- `/api/reading` と `/api/premium/three-card` がAIサービスへ依存。後者はDBの購入成功照合を実施。`premiumAccess` は表示用のヒントであり購入権限ではない。
- `/api/events` はイベント契約検証→eventStore→SQLite。purchase webhookは共有トークン検証→checkout/session/TTL照合→購入成功記録。completeは成功記録を照合する。
- 集計はプレースホルダー付きSQL。動的WHEREも固定句で構成されSQL injectionを避けている。CV計算と件数形状は純粋な`statistics.js`へ分離し、eventStoreはDB記録・集計に絞った。
- 旧CIはechoのみ。スモークテストはreading/eventsが中心で、決済と異常系の保証が不足。

## 問題と対応

|重要度|根拠・問題|修正方針|対応結果|
|---|---|---|---|
|高|oracleMessageが外部エラー本文を`detail`で返す|外部エラーは固定コードにし秘密情報を返さない|修正。HTTP失敗本文は破棄|
|高|fetchに時間制限なし。例外がフォールバックを迂回|全通信/JSON解析をabort対象とし安全な結果に統一|8秒制限、signal伝播、finallyで解放、fetch注入|
|中|不正なoutput配列/型で例外、フォールバックを返してもfallback=false|構造・禁止語・最低長を検証|修正。無効出力はfallback=true|
|高|JSONサイズ制限なし、不正JSONが500、cardNameが任意型|全POST共通のストリーム上限制御と契約検証|16KiB制限、400/413と既存のerror形式を維持|
|中|集計日付に正規化される不正日付・逆転期間|厳密なカレンダー検証|全GETに適用|
|高|localStorage.setItem失敗で処理停止、不正データをspread|型/デフォルト検証、保存失敗時はメモリ継続|修正。v1キーと診断旧名を維持|
|中|日付差がローカル午前0時のミリ秒差でDSTに弱い|現地カレンダー日付をUTC日番号で比較|純粋関数化。タイムゾーン移動/未来日付は連続日をリセット|
|高|SQLiteの旧スキーマに新カラムのindexを移行前に作成|カラム追加後にindex作成|修正|
|高|購入の確認→INSERTが別々で並列処理で重複の可能性|SQLite immediate transactionで検証と保存を不可分に|修正。既存の重複レスポンス契約を維持|
|中|checkout日時が将来でもTTL通過|未来日時は拒否|修正|
|中|refererのstartsWith判定は類似ドメインを許可|URLのoriginで厳密比較|修正。Originは認証の代替ではない|
|中|イベントmeta/リクエストヘッダー/例外本文をログへ出力|任意入力/内部例外の詳細をログへ出さない|削除・固定コード化|
|重大|Next 14.2.32および推移依存にnpm auditのcritical/high|App Router/React/JSを維持し修正版へ更新|Next15.5.28と推移依存を更新、audit0件（末尾参照）|
|高|CIがテストもビルドも実施しない|秘密情報不要のモック単体テスト・分離DB統合・build|lint/単体/React/統合/build/auditをCIに追加（末尾参照）|

## リトライとコストの判断

ネットワーク断/5xx/タイムアウトでは上流が生成を開始したか断定できず、重複課金を招くため再送しない。明示的な拒否である429だけ最大1回再試行する。Retry-Afterの秒数/HTTP-dateを読み、待機が0〜500msなら尊重し、それ以上/不正値は再試行せずフォールバックにする。ヘッダーがなければ250ms待つ。待機と再試行を含めて8秒を上限とする。通常は1通信、429時のみ最大2通信（3枚はそれぞれ同じ上限）。APIキー未設定時は通信なし。クライアントのsignalを上流へ伝播するが、ホスティング環境による切断検知の差と、上流で既に始まった処理の課金停止は保証できない。

## 運用上の制約・残課題

- `/tmp` のSQLiteは揮発性。Vercelの複数インスタンスでcheckoutとwebhookが同じDBを見られる保証がなく、実決済の正本として使えない。新しいクラウド導入は必須にせず、永続ディスクのある単一Nodeプロセス/ホストで `EVENT_DB_PATH` とバックアップを設定する。Vercelはデモ用途と明記する。
- 公開生成APIは回数制限がなく、深掘り2回もUX上の制約。公開本番では既存ホストのレート制限とOpenAI側予算制限を設定する必要がある。新しいRedis等は追加しない。
- webhookはサーバー間共有トークンが前提。実際の購入プロバイダの署名検証/支払額・商品・注文IDの照合を行うアダプタは未実装。provider + externalOrderIdがある通知は、同じ組み合わせを別attemptに再利用することをトランザクション内で拒否する。両値が省略可能なのはデモ互換のためで、正式連携では署名検証とともに必須化する。
- `sessionId`/`attemptId` はbearer相当。サーバーが購入成功を照合しておりlocalStorageだけで権限は付与されないが、ID流出への耐性は認証付きアカウントより弱い。HTTPSを使用し、URLの購入IDを外部計測に渡さない。
- Tailwind CDNを実行時に読み込む既存構成は外部通信/CSP/可用性上の制約が残る。今回デザイン変更やビルド依存追加は行わない。
- 管理APIは本番トークン未設定時すでに503で閉じている。旧レビューの「未設定時公開」は現行コードには当てはまらない。管理画面にはトークン入力機能がないため本番の運用は認証ヘッダー付きAPI/既存スクリプトを利用する。

## 追加調査・設計判断（全文指示のPhase 5〜9）

|重要度|根拠・問題|修正方針|対応結果|
|---|---|---|---|
|高|同一attemptのcheckout再登録で所有者が変わる|最初のsessionとattemptの紐付けを保つ|同一sessionは冪等、別sessionは拒否|
|高|同じ外部注文を異なるattemptに再利用可能|provider/orderの組を照合|即時トランザクション内で拒否|
|高|complete画面は確認前/失敗でも「確認しました」|サーバー結果に応じた状態遷移|checking/verified/unverified/error、再確認ボタン、確認後のみ進行|
|中|非同期処理が画面離脱後も保存・遷移する|キャンセルと同期的な二重送信ガード|draw/deep/premium readingでAbortController/ref、completeでcleanup|
|中|集計日付が実行ホストのTZに依存|業務TZとtimestampを明示|新規date_keyはAsia/Tokyo、timestampはUTC正規化|
|中|CV計算がSQLite処理と同じモジュール|計算を純粋関数へ分離|statistics.jsと独立テスト|
|中|隠れたラジオボタンに明確な名前・フォーカス表示不足|aria-label、focus-within、status/alert|外観維持、選択と非同期結果を支援技術に公開|
|中|next lintが未設定、CIがechoだけ|Nextに適したflat config|ESLint9 + next/core-web-vitals、未使用変数/HooksをCI検査|
|中|Next15でServer Componentのdynamic ssr:falseが禁止|Client境界を保ち通常import|deepページを他ページと同じ薄いServer Componentに修正|

### 分析の契約

- 日次/期間境界はJSTのカレンダー日、date_from/date_toは両端を含む。過去のdate_keyは変更しないため、旧ホストがJST以外だった履歴は移行前後で日付の意味が異なり得る。既存データを一括変更せず、運用者がバックアップ後に再集計する方針とした。
- 件数CVはイベントの比率なので100%を超えることがある。ユニーク数はsessionIdのdistinctであり実人数ではない。ゼロ分母は0。AB比較は同じ期間・実験のB−A（パーセントポイント）で、統計的な有意差を示すものではない。
- 一般イベントは重複を自動除外しない（既存KPIの意味を維持）。購入イベントとcheckoutだけをattempt単位で冪等化。SQLフィルター値はバインドする。

### 採用しなかった追加案

- Redis、クラウドDB、監視SaaSは導入しない。永続ディスク+単一ホスト+バックアップが追加有料サービス不要の選択肢。
- AIキャッシュは表示のランダム性・失効・購入結果の保存契約が未定のため保留。公開生成APIの厳格な分散レート制限もホスト側で設定する。
- Tailwind CDNを許容したまま厳格なCSPを設定すると既存表示を壊すため、CSP導入はローカルCSSビルドと併せて検討する。

## 検証結果

Node.js 22.23.4で実行。CIでは実OpenAIへ通信しない。

- ESLint: 成功（警告0）。
- 単体テスト: 29件成功。AI正常/欠落キー/タイムアウト/429/500/不正JSON/不正構造/禁止語/切断/限定再試行、保存破損/失敗/旧形式/日付/DST、旧DB移行/購入所有者/期限/冪等性/注文再利用、JST境界/CV/ユニーク/AB/SQLバインディングを検証。
- Reactテスト: 8件成功。トップ選択、抽選と二重送信、保存結果と購入導線、深掘り上限、離脱中断、プレミアムエラー表示、購入確認と再確認、外部checkoutへIDの引継ぎ。
- 本番build: Next.js15.5.28で成功（全18ルートを生成）。Next15互換修正とPostCSS overrideの適合を確認。
- 統合テスト: 成功。実Nextサーバー + 一時SQLite、全POSTの不正JSON/サイズ制限、認証拒否、未購入拒否、並列Webhook3通知の2件重複応答、完了の冪等性、3枚生成、集計API日付/認証を確認。
- npm audit: 開発依存も含め0件（2026-10-28時点）。当初はcritical1/high3、Next更新後に残る推移依存も修正。Next15.5.28は[公式セキュリティ告知](https://nextjs.org/blog/nextjs-security-update-october-14-2026)に従って採用。
- 実OpenAIと実決済への通信、実ブラウザのピクセル比較、実モバイル端末は未実施。UIはclassName/カードデータを原則維持し、ラジオのfocus表示と購入状態文言だけを意図的に修正。
- main起点の独立作業ツリーでも `npm ci` が成功し、監査0件を確認。既存のコンペ資料コミット/未コミット差分は提出対象から除外。
- GitHub Actions/PR: 未実行・未作成。ローカルGitにHTTPS認証情報がなく、接続済みGitHub連携もtree/branch作成に403 `Resource not accessible by integration`。書き込み認証の設定後に提出が必要。
- npmはESLint9のサポート終了を警告。Next15の公式lint configとの整合を優先した構成で、監査の指摘はない。次のツールチェーン更新時にESLint10移行を検証する。
