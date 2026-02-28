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
backend/src/
├── domain/           # ビジネスロジックの核（外部依存なし）
│   ├── entities/     # CallHistory, CallAnalysis, FollowUpEmail 等
│   ├── value-objects/ # InterestLevel, CallResult, PhoneNumber 等
│   ├── repositories/ # Repository インターフェース
│   ├── commons/      # Result 型
│   └── errors/       # エラーメッセージ定数
├── application/      # ユースケース、DTO
│   ├── usecases/     # MakeCall, AnalyzeCall, PostCallProcessing, SendFollowUpEmail 等
│   └── dto/          # リクエスト・レスポンス型定義
├── infrastructure/   # 外部サービス実装
│   ├── external/     # Twilio, ElevenLabs, OpenAI, Google Sheets, Nodemailer
│   ├── repositories/ # Repository 実装
│   └── mappers/      # データ変換
├── presentation/     # ルーティング、コントローラー、ハンドラー
│   ├── controllers/  # Call, Analysis, CallHistory, FollowUpEmail
│   ├── routes/       # API ルート定義
│   ├── handlers/     # WebSocket ハンドラー
│   └── errors/       # エラーハンドラー
├── container/        # DI コンテナ（依存の組み立て）
├── config/           # 環境変数の読み込み
├── constants/        # 定数定義
├── utils/            # ユーティリティ（フォーマッター等）
└── server.ts         # エントリーポイント

scripts/
├── test-call-analysis.ts    # 通話分析テストスクリプト
└── test-follow-up-email.ts  # メール送信テストスクリプト

tests/
├── unit/             # ユニットテスト
└── integration/      # インテグレーションテスト（supertest）
```

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
