# Infrastructure (AWS CDK)

## Architecture

```
User
 │
 ├── https://<cloudfront-id>.cloudfront.net    ← S3 (Frontend)
 │
 └── https://<service-id>.awsapprunner.com     ← App Runner (Backend API)
```

| Resource | Service | Purpose |
|----------|---------|---------|
| Frontend | S3 + CloudFront | Static file hosting (dashboard) |
| Backend | App Runner | API server (Fastify) |
| Secrets | SSM Parameter Store | Environment variables for App Runner |

## Prerequisites

- AWS CLI configured
- Node.js 20+
- Docker (for ECR image build)

## Setup

### 1. Install dependencies

```bash
cd infra
npm install
```

### 2. Register SSM Parameters

All secrets must be registered in AWS SSM Parameter Store before deployment.

**Prefix:** `/ai-outbound-calling/{env}/` (e.g., `/ai-outbound-calling/dev/`)

```bash
# テンプレートをコピーして実際の値を入力
cp scripts/ssm-params.example.json scripts/ssm-params.json
vi scripts/ssm-params.json

# ビルド & 一括登録
npm run build
node dist/scripts/register-ssm-params.js dev scripts/ssm-params.json
```

機密情報（API キー等）は自動で `SecureString` として登録されます。

### 3. SSM Parameters Reference

#### Required

| SSM Parameter Name | Type | Description |
|-------------------|------|-------------|
| `PUBLIC_URL` | String | App Runner service URL (set after first deploy) |
| `TWILIO_ACCOUNT_SID` | SecureString | Twilio account SID |
| `TWILIO_AUTH_TOKEN` | SecureString | Twilio auth token |
| `TWILIO_PHONE_NUMBER` | String | Twilio phone number (E.164 format) |
| `OPENAI_API_KEY` | SecureString | OpenAI API key (call analysis) |
| `CALL_COMPANY_NAME` | String | Company name for outbound calls |
| `CALL_CONTACT_NAME` | String | Contact name for outbound calls |

#### Google Sheets (conditional: `enableGoogle`)

| SSM Parameter Name | Type | Description |
|-------------------|------|-------------|
| `GOOGLE_SHEETS_ID` | String | Google Sheets document ID |
| `GOOGLE_CREDENTIALS_JSON` | SecureString | Service account JSON (full content) |

#### ElevenLabs (conditional: `enableElevenLabs`)

| SSM Parameter Name | Type | Description |
|-------------------|------|-------------|
| `ELEVENLABS_API_KEY` | SecureString | ElevenLabs API key |
| `ELEVENLABS_AGENT_ID` | String | ElevenLabs agent ID |
| `ELEVENLABS_LANGUAGE` | String | Language code (e.g., `ja`) |

#### Mail (conditional: `enableMail`)

| SSM Parameter Name | Type | Description |
|-------------------|------|-------------|
| `MAIL_HOST` | String | SMTP server host |
| `MAIL_PORT` | String | SMTP server port |
| `MAIL_USER` | String | SMTP username |
| `MAIL_PASSWORD` | SecureString | SMTP password |
| `MAIL_FROM` | String | Sender email address |

#### App Runner direct env vars (set by CDK, not SSM)

| Variable | Value | Description |
|----------|-------|-------------|
| `PORT` | `3000` | Server port |
| `HOST` | `0.0.0.0` | Server bind address |
| `SKIP_BUSINESS_HOURS_CHECK` | `false` | Business hours validation |

### 4. Build & Diff

```bash
npm run build
npx cdk diff -c env=dev
```

### 5. Deploy (human only)

```bash
npx cdk deploy -c env=dev
```

## Environments

| Setting | dev | prod |
|---------|-----|------|
| CPU | 0.25 vCPU | 0.5 vCPU |
| Memory | 0.5 GB | 1 GB |
| S3 removal policy | DESTROY | RETAIN |

Switch environment with `-c env=prod`:

```bash
npx cdk deploy -c env=prod
```

## Post-Deploy

After the first deployment:

1. Note the `BackendUrl` output (App Runner URL)
2. `scripts/ssm-params.json` の `PUBLIC_URL` を App Runner URL に書き換える
3. 再登録: `node dist/scripts/register-ssm-params.js dev scripts/ssm-params.json`
4. App Runner を再起動: `aws apprunner start-deployment --service-arn <ARN>`
5. `FrontendUrl` の CloudFront URL で Dashboard にアクセス
