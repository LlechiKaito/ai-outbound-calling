# ai-outbound-calling

AI を使った電話営業の自動化システム。Twilio で発信し、ElevenLabs Conversational AI がリアルタイムで会話。通話後は OpenAI で分析し、Google Sheets に記録、興味度に応じたフォローアップメールを自動送信する。

## 機能一覧

| 機能 | 説明 |
|------|------|
| AI 電話発信 | Twilio + ElevenLabs でリアルタイム音声会話 |
| 通話分析 | OpenAI gpt-4o-mini でトランスクリプトを分析（興味度・要約・次のアクション） |
| 架電履歴記録 | Google Sheets に自動記録（11カラム） |
| 通話後自動処理 | 通話終了後に分析→記録→メール送信を自動実行 |
| フォローアップメール | AI が興味度に応じたメール文面を生成し、Gmail SMTP で送信 |
| 自動架電オーケストレーター | スプレッドシートのリードに対して順次自動架電。営業時間判定・不在リトライ・開始/一時停止/停止コントロール付き |
| ダッシュボード | KPI 表示・架電リスト管理（追加・編集）・架電履歴一覧・ライブアクティビティをブラウザで操作 |

## 必要なもの

- Docker / Docker Compose
- ngrok アカウント（https://ngrok.com）
- Twilio アカウント（https://www.twilio.com）
- ElevenLabs アカウント（https://elevenlabs.io）
- OpenAI アカウント（https://platform.openai.com）
- Google Cloud サービスアカウント（Google Sheets 連携を使う場合）
- Gmail アカウント + アプリパスワード（メール送信を使う場合）

## セットアップ

### 1. リポジトリをクローン

```bash
git clone https://github.com/LlechiKaito/ai-outbound-calling.git
cd ai-outbound-calling
```

### 2. 環境変数を設定

```bash
cp .env.example .env
```

`.env` を編集して各値を設定する。

#### 必須（電話発信に必要）

```
PORT=3000
HOST=0.0.0.0
PUBLIC_URL=                # 手順 4 で ngrok を起動した後に設定

TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1xxxxxxxxxx

ELEVENLABS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_AGENT_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
ELEVENLABS_LANGUAGE=ja

OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

CALL_COMPANY_NAME=株式会社サンプル
CALL_CONTACT_NAME=営業担当
```

- Twilio: https://console.twilio.com で確認
- ElevenLabs: https://elevenlabs.io/app/settings で API Key、Conversational AI ダッシュボードで Agent ID を確認
- `CALL_COMPANY_NAME` / `CALL_CONTACT_NAME`: 通話後の分析・記録に使用する自社情報

#### オプション: Google Sheets 連携

```
GOOGLE_CREDENTIALS_PATH=credentials.json
GOOGLE_SHEETS_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

1. Google Cloud Console でサービスアカウントを作成
2. JSON キーをダウンロードし、プロジェクトルートに `credentials.json` として配置
3. 対象のスプレッドシートにサービスアカウントのメールアドレスを共有
4. スプレッドシートの URL から ID を取得（`/d/` と `/edit` の間の文字列）

スプレッドシートのカラム構成（A:K）:

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| 会社名 | 担当者名 | 電話番号 | メールアドレス | ステータス | 最終架電日時 | 架電結果 | 興味度 | 次のアクション | メモ | リトライ回数 |

#### オプション: フォローアップメール

```
MAIL_HOST=smtp.gmail.com
MAIL_PORT=587
MAIL_USER=your-email@gmail.com
MAIL_PASSWORD=xxxx xxxx xxxx xxxx
MAIL_FROM=your-email@gmail.com
```

Gmail の場合:
1. Google アカウントで 2 段階認証を有効化
2. https://myaccount.google.com/apppasswords でアプリパスワードを生成
3. `MAIL_PASSWORD` に生成された 16 文字のパスワードを設定

### 3. Google 認証情報を配置（Google Sheets 連携を使う場合）

```bash
# サービスアカウントの JSON キーをプロジェクトルートに配置
cp /path/to/your-service-account-key.json credentials.json
```

`docker-compose.yml` により `credentials.json` はコンテナ内の `/app/credentials.json` にマウントされる。

### 4. Docker イメージをビルド

```bash
docker compose build app
```

### 5. ngrok を起動して公開 URL を取得

別のターミナルで:

```bash
ngrok http 3000
```

表示された URL（例: `https://xxxx-xx-xx.ngrok-free.app`）を `.env` の `PUBLIC_URL` に設定する:

```
PUBLIC_URL=https://xxxx-xx-xx.ngrok-free.app
```

### 6. アプリを起動

```bash
docker compose up app
```

バックグラウンドで起動する場合:

```bash
docker compose up app -d
```

### 7. 動作確認

```bash
curl http://localhost:3000/health
```

期待されるレスポンス:

```json
{"isSuccess":true,"data":{"status":"ok"}}
```

## 電話のかけ方

### 前提条件

- セットアップが完了していること
- ngrok が起動中で `PUBLIC_URL` が設定されていること
- Twilio トライアルアカウントの場合、発信先は Verified Numbers に登録済みの番号のみ

### 手順

**1. ヘルスチェック**

```bash
curl http://localhost:3000/health
```

**2. 電話を発信**

```bash
curl -X POST http://localhost:3000/api/make-call \
  -H "Content-Type: application/json" \
  -d '{"to": "+819012345678"}'
```

`to` には E.164 形式（`+` + 国番号 + 番号）で指定する。

**3. 相手が応答**

- Twilio トライアルの場合、自動音声で「Press any key to continue」と流れる
- **何かキーを押す**と通話が始まる

**4. AI との会話**

ElevenLabs Conversational AI が日本語でリアルタイム会話する。

**5. 通話終了後の自動処理**

通話が終了すると、以下が自動実行される:

1. OpenAI で通話内容を分析（興味度・要約・次のアクション）
2. Google Sheets に架電履歴を記録（設定済みの場合）
3. フォローアップメールを送信（メール設定済み かつ メールアドレスがある場合）

## 通話分析

通話のトランスクリプトを OpenAI gpt-4o-mini で分析する。

### API で分析

```bash
curl -X POST http://localhost:3000/api/analyze-call \
  -H "Content-Type: application/json" \
  -d '{"transcript": "営業: お忙しいところ恐れ入ります。..."}'
```

レスポンス:

```json
{
  "isSuccess": true,
  "data": {
    "interestLevel": 4,
    "summary": "顧客はサービスに前向き",
    "nextAction": "デモの日程を調整する"
  }
}
```

`interestLevel` の基準:

| レベル | 意味 |
|--------|------|
| 1 | 興味なし・拒否 |
| 2 | やや消極的 |
| 3 | 中立・情報収集段階 |
| 4 | やや興味あり・前向き |
| 5 | 非常に興味あり・即決意向 |

### テストスクリプトで分析

```bash
docker compose run --rm app npx tsx --tsconfig tsconfig.json scripts/test-call-analysis.ts
```

## フォローアップメール

通話後に AI が興味度に応じたフォローアップメールを自動生成し、Gmail SMTP で送信する。

- 興味度 1: お時間をいただいたお礼（押しつけない）
- 興味度 2: お礼と参考資料の送付提案
- 興味度 3: 詳細資料・事例の共有、次回ミーティングの提案
- 興味度 4: 具体的な提案、打ち合わせ日程の候補提示
- 興味度 5: 具体的な次のステップ、導入スケジュールの提案

### API でメール送信

```bash
curl -X POST http://localhost:3000/api/follow-up-email \
  -H "Content-Type: application/json" \
  -d '{
    "to": "recipient@example.com",
    "companyName": "株式会社サンプルテック",
    "contactName": "佐藤一郎",
    "summary": "DX推進のクラウドソリューションを提案。在庫管理に興味あり。",
    "interestLevel": 4
  }'
```

レスポンス:

```json
{
  "isSuccess": true,
  "data": null
}
```

### テストスクリプトでメール送信

架空のテストデータを使って、指定したメールアドレスにフォローアップメールを送信する:

```bash
docker compose run --rm app npx tsx --tsconfig tsconfig.json scripts/test-follow-up-email.ts your-email@example.com
```

出力例:

```
=== フォローアップメール送信テスト ===

--- テストデータ ---
宛先:       your-email@example.com
会社名:     株式会社サンプルテック
担当者名:   佐藤一郎
興味度:     4 / 5
通話要約:   DX推進のクラウドソリューションを提案。在庫管理の課題を...

--- メール文面を AI で生成中... ---

送信完了!
your-email@example.com の受信ボックスを確認してください。
```

## 架電履歴の記録

Google Sheets に架電履歴を記録する。

### API で記録

```bash
curl -X POST http://localhost:3000/api/call-history \
  -H "Content-Type: application/json" \
  -d '{
    "companyName": "株式会社ABC",
    "contactName": "田中太郎",
    "phoneNumber": "+819012345678",
    "email": "tanaka@example.com",
    "status": "新規",
    "callResult": "応答",
    "interestLevel": 4,
    "nextAction": "デモの日程を調整する",
    "memo": "サービスに前向き",
    "retryCount": "0"
  }'
```

`callResult` の選択肢: `応答` / `不在` / `拒否` / `留守電` / `その他`

## 自動架電オーケストレーター

スプレッドシートに登録されたリードに対して、上から順に自動で架電する。通話後の分析・記録・メール送信もすべて自動実行される。

### 前提条件

- Google Sheets 連携が設定済み（`GOOGLE_CREDENTIALS_PATH`, `GOOGLE_SHEETS_ID`）
- ElevenLabs が設定済み（`ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`）
- スプレッドシートに 1 行目がヘッダー、2 行目以降にリードデータが入っていること

### スプレッドシートの準備

A:K の 11 カラム構成でリードを登録する。最低限 **会社名・担当者名・電話番号** を入力する。

| A | B | C | D | E | F | G | H | I | J | K |
|---|---|---|---|---|---|---|---|---|---|---|
| 会社名 | 担当者名 | 電話番号 | メールアドレス | ステータス | 最終架電日時 | 架電結果 | 興味度 | 次のアクション | メモ | リトライ回数 |
| 株式会社ABC | 田中太郎 | 09012345678 | tanaka@example.com | | | | | | | |
| 株式会社DEF | 佐藤花子 | 09087654321 | | 未対応 | | | | | | |

**電話番号の入力について:**

Google Sheets はデフォルトで `09012345678` を数値として扱い、先頭の `0` が消えて `9012345678` になる。どちらの形式でも正しく動作するが、見た目を保ちたい場合は以下のいずれかで対応する:

- C列を選択 → メニュー「表示形式」→「書式なしテキスト」に設定してから入力する
- セルに `'09012345678` と入力する（先頭のアポストロフィでテキスト扱いになる）

対応する電話番号形式:

| 入力形式 | 例 | 変換結果 |
|----------|-----|---------|
| 国内形式 | `09012345678` | `+819012345678` |
| 0 が消えた数値 | `9012345678` | `+819012345678` |
| E.164 形式 | `+819012345678` | そのまま |
| ハイフン付き | `090-1234-5678` | `+819012345678` |

- **対象リード**: ステータスが空または「未対応」で、リトライ回数が 3 未満のリード
- **スキップされるリード**: ステータスが「完了」等、またはリトライ回数が 3 以上

### 使い方

**1. 自動架電を開始**

```bash
curl -X POST http://localhost:3000/api/orchestrator/start
```

レスポンス:

```json
{
  "isSuccess": true,
  "data": {
    "state": "running",
    "processedCount": 0,
    "totalLeads": 5,
    "currentLead": null
  }
}
```

**2. 状態を確認**

```bash
curl http://localhost:3000/api/orchestrator/status
```

レスポンス:

```json
{
  "isSuccess": true,
  "data": {
    "state": "running",
    "processedCount": 2,
    "totalLeads": 5,
    "currentLead": {
      "companyName": "株式会社DEF",
      "contactName": "佐藤花子",
      "phoneNumber": "+819087654321"
    }
  }
}
```

**3. 一時停止**

```bash
curl -X POST http://localhost:3000/api/orchestrator/pause
```

現在の通話が完了してから一時停止する。次のリードへの架電は行わない。

**4. 再開**

```bash
curl -X POST http://localhost:3000/api/orchestrator/resume
```

一時停止した位置から処理を再開する。

**5. 停止**

```bash
curl -X POST http://localhost:3000/api/orchestrator/stop
```

自動架電を完全に停止する。再度 `start` で最初から開始できる。

### 営業時間

自動架電は営業時間内のみ実行される。営業時間外に開始した場合、次の営業時間まで自動で待機する。

| 項目 | 時間帯 |
|------|--------|
| 営業時間 | 9:00 〜 17:30（JST） |
| 昼休み | 12:00 〜 13:00（JST） |
| 休業日 | 土曜・日曜 |

### 不在時の自動リトライ

- 通話が 120 秒以内に応答されない場合、「不在」として処理される
- 不在の場合、リトライ回数がインクリメントされ、スプレッドシートが更新される
- **最大 3 回** までリトライ対象となる（3 回不在になるとスキップ）

### 自動架電フロー

```
1. スプレッドシートから未対応リードを取得

2. 営業時間内であることを確認（時間外なら待機）

3. リードに電話を発信

4. 応答した場合:
   → AI が会話 → 通話終了
   → OpenAI で分析（興味度・要約・次のアクション）
   → スプレッドシートの該当行を更新
   → フォローアップメール送信（メール設定済みの場合）

5. 不在の場合:
   → スプレッドシートの該当行を「不在」で更新
   → リトライ回数をインクリメント

6. 次のリードへ（5 秒間隔）

7. 全リード処理完了 → 自動停止
```

## 停止

```bash
docker compose down
```

## テスト

```bash
# Docker でテスト実行
docker compose build test
docker compose run --rm test

# ローカルでテスト実行（Node.js が必要）
npm install
npm test

# ユニットテストのみ
npm run test:unit

# インテグレーションテストのみ
npm run test:integration

# E2E テスト（Playwright）
npx playwright test
```

## API エンドポイント一覧

| メソッド | パス | 説明 |
|---------|------|------|
| GET | `/health` | ヘルスチェック |
| POST | `/api/make-call` | 電話を発信する |
| POST | `/api/twiml` | Twilio Webhook 用の TwiML を返す |
| GET | `/api/media-stream` | Twilio Media Stream 用 WebSocket エンドポイント |
| POST | `/api/analyze-call` | 通話トランスクリプトを分析する |
| POST | `/api/call-history` | 架電履歴を Google Sheets に記録する |
| POST | `/api/follow-up-email` | フォローアップメールを AI 生成して送信する |
| POST | `/api/orchestrator/start` | 自動架電を開始する |
| POST | `/api/orchestrator/pause` | 自動架電を一時停止する |
| POST | `/api/orchestrator/resume` | 自動架電を再開する |
| POST | `/api/orchestrator/stop` | 自動架電を停止する |
| GET | `/api/orchestrator/status` | 自動架電の状態を取得する |
| GET | `/api/dashboard/kpis` | KPI（総架電数・成功率・平均興味度・メール送信数）を取得 |
| GET | `/api/dashboard/leads` | リード一覧を取得（`?status=pending` でフィルタ可能） |
| POST | `/api/dashboard/leads` | リードを追加する（Google Sheets に同期） |
| PUT | `/api/dashboard/leads/:rowIndex` | リードを編集する（Google Sheets に同期） |
| GET | `/api/dashboard/call-history` | 架電履歴一覧を取得する |
| GET | `/api/dashboard/status` | ライブアクティビティ状態を取得する |

### POST /api/make-call

リクエスト:

```json
{
  "to": "+819012345678"
}
```

電話番号は E.164 形式（`+` + 国番号 + 番号）で指定する。

### POST /api/analyze-call

リクエスト:

```json
{
  "transcript": "営業: こんにちは。...\n顧客: はい、..."
}
```

レスポンス:

```json
{
  "isSuccess": true,
  "data": {
    "interestLevel": 4,
    "summary": "通話内容の要約",
    "nextAction": "次に取るべきアクション"
  }
}
```

### POST /api/call-history

リクエスト:

```json
{
  "companyName": "株式会社ABC",
  "contactName": "田中太郎",
  "phoneNumber": "+819012345678",
  "email": "tanaka@example.com",
  "status": "新規",
  "callResult": "応答",
  "interestLevel": 4,
  "nextAction": "デモの日程を調整する",
  "memo": "サービスに前向き",
  "retryCount": "0"
}
```

### POST /api/follow-up-email

リクエスト:

```json
{
  "to": "recipient@example.com",
  "companyName": "株式会社ABC",
  "contactName": "田中太郎",
  "summary": "通話内容の要約",
  "interestLevel": 4
}
```

### POST /api/orchestrator/start

自動架電を開始する。スプレッドシートから未対応リードを取得し、順次架電を実行する。

レスポンス:

```json
{
  "isSuccess": true,
  "data": {
    "state": "running",
    "processedCount": 0,
    "totalLeads": 5,
    "currentLead": null
  }
}
```

### POST /api/orchestrator/pause

自動架電を一時停止する。`running` 状態でのみ使用可能。

### POST /api/orchestrator/resume

一時停止した自動架電を再開する。`paused` 状態でのみ使用可能。

### POST /api/orchestrator/stop

自動架電を停止する。`running` または `paused` 状態で使用可能。

### GET /api/orchestrator/status

自動架電の現在の状態を取得する。

レスポンス:

```json
{
  "isSuccess": true,
  "data": {
    "state": "running",
    "processedCount": 2,
    "totalLeads": 5,
    "currentLead": {
      "companyName": "株式会社DEF",
      "contactName": "佐藤花子",
      "phoneNumber": "+819087654321"
    }
  }
}
```

`state` の値: `idle`（初期状態）/ `running`（実行中）/ `paused`（一時停止）/ `stopped`（停止）

### GET /api/media-stream（WebSocket）

Twilio Media Stream と ElevenLabs Conversational AI を中継する WebSocket エンドポイント。直接呼び出すのではなく、Twilio が TwiML の `<Connect><Stream>` 指示に基づいて自動的に接続する。

## 通話フロー

```
1. POST /api/make-call
   → Twilio が電話を発信

2. 相手が応答
   → Twilio が POST /api/twiml を呼び出し

3. TwiML で <Connect><Stream> を返却
   → Twilio が /api/media-stream に WebSocket 接続

4. サーバーが ElevenLabs Conversational AI に WebSocket 接続
   → 音声が双方向にリアルタイム中継

5. 通話終了
   → OpenAI で分析 → Google Sheets に記録 → フォローアップメール送信
```

## プロジェクト構成

```
├── backend/src/            # バックエンド（API サーバー）
│   ├── domain/             #   ビジネスロジックの核（外部依存なし）
│   ├── application/        #   ユースケース、DTO
│   ├── infrastructure/     #   外部サービス実装（Twilio, Google Sheets 等）
│   ├── presentation/       #   ルーティング、コントローラー
│   ├── container/          #   DI コンテナ
│   ├── config/             #   環境変数の読み込み
│   ├── constants/          #   定数定義
│   ├── utils/              #   ユーティリティ
│   └── server.ts           #   エントリーポイント
├── frontend/public/        # フロントエンド（静的ファイル）
│   ├── dashboard.html      #   ダッシュボード HTML
│   └── js/                 #   JavaScript（config / constants / api / ui / dashboard）
├── infra/                  # AWS CDK（インフラ定義）
│   ├── bin/app.ts          #   CDK エントリポイント
│   ├── lib/compute/        #   App Runner + ECR
│   ├── lib/frontend/       #   S3 + CloudFront
│   └── config/             #   環境別設定（dev / prod）
├── scripts/                # ユーティリティスクリプト
├── tests/                  # テスト
│   ├── unit/               #   ユニットテスト
│   ├── integration/        #   インテグレーションテスト（supertest）
│   └── e2e/                #   E2E テスト（Playwright）
├── Dockerfile              # Docker（dev / test / prod ステージ）
└── docker-compose.yml      # ローカル開発用
```

バックエンドとフロントエンドは独立してデプロイ可能。バックエンドは API のみ（`@fastify/cors` で CORS 対応）、フロントエンドは `js/config.js` の `API_BASE_URL` でバックエンド URL を設定する。

## トラブルシューティング

| 症状 | 原因 | 対処 |
|------|------|------|
| 電話が鳴らない | ngrok URL が古い / PUBLIC_URL 未設定 | ngrok を再起動し `.env` の `PUBLIC_URL` を更新、`docker compose up --build` |
| キーを押しても無音 | ElevenLabs の設定不備 | `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID` を確認 |
| 音声がガラガラ | 音声フォーマット不一致 | `docker compose logs app` でエラーを確認 |
| すぐ切れる | Twilio トライアルの残高不足 | Twilio コンソールで残高を確認 |
| メールが届かない | Gmail アプリパスワード不正 | 2 段階認証を有効化し、アプリパスワードを再生成 |
| Sheets に記録されない | credentials.json が見つからない | プロジェクトルートに `credentials.json` を配置し `docker compose up --build` |
| ElevenLabs quota エラー | 無料枠（10,000 credits/月）を超過 | 月次リセットを待つか、有料プランにアップグレード |

## ダッシュボード

ブラウザから自動架電システムを操作・監視できるダッシュボード。

### 機能

| セクション | 機能 |
|-----------|------|
| KPI 表示 | 総架電数・通話成功率・平均興味度・メール送信数 |
| 架電リスト管理 | リードの一覧・フィルタ・追加・編集（Google Sheets に同期） |
| 架電履歴一覧 | 過去の架電結果を時系列で確認 |
| ライブアクティビティ | オーケストレーターの状態・進捗・開始/停止コントロール |

### ローカルでの確認

バックエンドとフロントエンドは分離されている。ローカルで確認するには両方を起動する。

**バックエンド（API サーバー）:**

```bash
docker compose up app
```

**フロントエンド（静的ファイル配信）:**

`frontend/public/` を任意の静的ファイルサーバーで配信する。例:

```bash
npx serve frontend/public -l 8080
```

ブラウザで `http://localhost:8080/dashboard.html` を開く。

バックエンドが別ホストの場合は、`frontend/public/js/config.js` を編集して `API_BASE_URL` を設定する:

```javascript
window.API_BASE_URL = 'http://localhost:3000';
```

### フロントエンド構成

```
frontend/public/
├── dashboard.html      # メイン HTML
└── js/
    ├── config.js       # API_BASE_URL 設定（デプロイ時に上書き）
    ├── constants.js    # API パス・状態ラベル・エラーメッセージ
    ├── api.js          # HTTP 通信層（axios）
    ├── ui.js           # UI ヘルパー（エスケープ・バッジ・バー）
    └── dashboard.js    # メインロジック（KPI・リスト・履歴・ステータス）
```

## AWS デプロイ

AWS CDK を使ってデプロイする。App Runner（バックエンド）+ S3/CloudFront（フロントエンド）の構成で月額 ~$6-11。

### アーキテクチャ

```
┌─────────────────┐     ┌──────────────────────────┐
│  CloudFront     │     │  App Runner              │
│  + S3           │────▶│  (Fastify API)           │
│  (静的ファイル)  │     │  0.25 vCPU / 0.5 GB      │
└─────────────────┘     └──────────────────────────┘
  フロントエンド            バックエンド
  ~$1/月                   ~$5-10/月

  機密情報: SSM Parameter Store
  設定値: environments.ts → 環境変数
  Docker イメージ: ECR（DockerImageAsset で自動ビルド）
```

### コスト内訳

| リソース | サービス | 月額目安 |
|---------|---------|---------|
| バックエンド | App Runner (0.25 vCPU / 0.5 GB) | ~$5-10 |
| フロントエンド | S3 + CloudFront | <$1 |
| シークレット | SSM Parameter Store | 無料 |
| Docker イメージ | ECR | <$1 |
| **合計** | | **~$6-11/月** |

### CDK プロジェクト構成

```
infra/
├── bin/app.ts                    # CDK エントリポイント
├── lib/
│   ├── app-stack.ts              # メインスタック
│   ├── compute/compute.ts        # App Runner + ECR
│   └── frontend/frontend.ts      # S3 + CloudFront
├── config/environments.ts        # 環境別設定（dev / prod）
├── cdk.json                      # CDK 設定（環境は context で切替）
├── tsconfig.json
└── package.json
```

### 手順 1: SSM パラメータを登録

デプロイ前に、AWS SSM Parameter Store に機密情報を登録する。一括登録スクリプトを使う。

**1. パラメータファイルを作成:**

`infra/scripts/ssm-params.json` を `ssm-params.example.json` を参考に作成し、実際の値を設定する。

```bash
cd infra
cp scripts/ssm-params.example.json scripts/ssm-params.json
```

Google Sheets 連携を使う場合は、`credentials.json` も同じディレクトリに配置する（`file://credentials.json` で参照される）。

**SSM に格納するパラメータ（機密情報のみ）:**

| パラメータ | 説明 | 必須 |
|-----------|------|------|
| `TWILIO_ACCOUNT_SID` | Twilio アカウント SID | Yes |
| `TWILIO_AUTH_TOKEN` | Twilio 認証トークン | Yes |
| `TWILIO_PHONE_NUMBER` | Twilio 発信番号（E.164） | Yes |
| `OPENAI_API_KEY` | OpenAI API キー | Yes |
| `CALL_COMPANY_NAME` | 自社名（分析・記録に使用） | Yes |
| `CALL_CONTACT_NAME` | 担当者名（分析・記録に使用） | Yes |
| `GOOGLE_SHEETS_ID` | スプレッドシート ID | enableGoogle 時 |
| `GOOGLE_CREDENTIALS_JSON` | サービスアカウント JSON | enableGoogle 時 |
| `ELEVENLABS_API_KEY` | ElevenLabs API キー | enableElevenLabs 時 |
| `ELEVENLABS_AGENT_ID` | ElevenLabs エージェント ID | enableElevenLabs 時 |
| `MAIL_PASSWORD` | SMTP パスワード | enableMail 時 |
| `MAIL_USER` | SMTP ユーザー | enableMail 時 |
| `MAIL_FROM` | 送信元メールアドレス | enableMail 時 |

> `PUBLIC_URL` は CDK が App Runner の URL を自動で SSM に書き込むため、手動設定不要。

**2. 一括登録を実行:**

```bash
node scripts/register-ssm-params.mjs dev scripts/ssm-params.json
```

JSON にないパラメータは自動削除される（同期モード）。パラメータを変更した場合も同じコマンドで更新できる。

### 手順 2: 環境設定を確認

`infra/config/environments.ts` で環境ごとの設定を確認する:

```typescript
dev: {
  envName: "dev",
  backendPort: 3000,
  backendCpu: "0.25 vCPU",
  backendMemory: "0.5 GB",
  skipBusinessHoursCheck: true,   // true: 営業時間外でも架電可能
  enableGoogle: true,              // false にすると Google 系 SSM パラメータ不要
  enableElevenLabs: true,
  enableMail: true,
  elevenLabsLanguage: "ja",
  mailHost: "smtp.gmail.com",
  mailPort: "587",
},
```

| 設定 | 説明 |
|-----|------|
| `skipBusinessHoursCheck` | `true` で営業時間チェックをスキップ（テスト用） |
| `enableGoogle` / `enableElevenLabs` / `enableMail` | `false` にすると対応する SSM パラメータが不要になる |
| `elevenLabsLanguage` / `mailHost` / `mailPort` | 非機密の設定値（環境変数として直接注入） |

### 手順 3: CDK デプロイ

```bash
cd infra
npm install

# 差分確認（デプロイはしない）
npx cdk diff

# dev 環境にデプロイ
npx cdk deploy --all

# prod 環境にデプロイ
npx cdk deploy --all -c env=prod
```

デプロイ完了後、以下の URL が出力される:

```
Outputs:
AiOutboundCalling-dev.BackendUrl = https://xxxxxxxx.ap-northeast-1.awsapprunner.com
AiOutboundCalling-dev.FrontendUrl = https://xxxxxxxxxx.cloudfront.net
AiOutboundCalling-dev.BucketName = ai-outbound-calling-dev-frontend-xxxxxxxx
```

### 手順 4: 動作確認

`PUBLIC_URL` は CDK が自動で SSM に書き込むため、手動設定は不要。

デプロイ後、出力された `BackendUrl` でヘルスチェックを確認:

```bash
curl https://xxxxxxxx.ap-northeast-1.awsapprunner.com/health
```

> 初回デプロイ時は `PUBLIC_URL` がまだ SSM にないため、App Runner の再デプロイが必要:
>
> ```bash
> npx cdk deploy --all
> ```
>
> 2回目以降は URL が変わらないため、再デプロイ1回で完了する。

### Docker イメージのビルドについて

CDK は `DockerImageAsset` を使い、`cdk deploy` 時に自動で Docker イメージをビルド・ECR にプッシュする。手動でのビルド・プッシュは不要。

Dockerfile の `prod` ステージがマルチステージビルドで本番イメージを生成する:

```
base（npm ci + ソースコピー）
  → build（TypeScript コンパイル）
    → prod（コンパイル済み JS + 本番依存のみ）
```

### Google 認証情報の扱い

ローカル開発では `credentials.json` ファイルを Docker ボリュームでマウントする。

AWS 環境では、SSM Parameter Store の `GOOGLE_CREDENTIALS_JSON` に JSON 全体を格納し、コンテナ起動時に `docker-entrypoint.sh` がファイルに変換する:

```
SSM: GOOGLE_CREDENTIALS_JSON（JSON 文字列）
  → docker-entrypoint.sh が /tmp/google-credentials.json に書き出し
  → GOOGLE_CREDENTIALS_PATH=/tmp/google-credentials.json を設定
  → アプリはファイルパスから読み込み（コード変更なし）
```

### インフラの削除

```bash
cd infra

# dev 環境を削除
npx cdk destroy --all

# prod 環境を削除（S3 バケットは RETAIN ポリシーのため手動削除が必要）
npx cdk destroy --all -c env=prod
```
