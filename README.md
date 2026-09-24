# MUZA — Autonomous AI Content Management & Social Media Publishing Platform

MUZA is a production-grade, full-stack, autonomous content publishing platform that connects Google Drive to YouTube and Instagram Reels. It continuously detects new video assets, transcribes audio, extracts multimodal insights via AI, generates platform-optimized copy adhering to customized Brand Profiles, and orchestrates publishing via official OAuth APIs.

---

## 🏛 Architecture Overview

```
                          ┌────────────────────────┐
                          │   Google Drive Folder  │
                          │     (MUZA / INBOX)     │
                          └───────────┬────────────┘
                                      │ Polling / Webhook Sync
                                      ▼
┌────────────────────────────────────────────────────────────────────────┐
│                              MUZA Monorepo                             │
│                                                                        │
│   ┌─────────────────────┐      REST API      ┌─────────────────────┐   │
│   │   Next.js 14 Web    │ ◄────────────────► │  Fastify API Server │   │
│   │   App Router & UI   │                    │     (Port 4000)     │   │
│   └─────────────────────┘                    └──────────┬──────────┘   │
│                                                         │              │
│                                              Enqueues   │ Updates      │
│                                              Jobs       │ State        │
│                                                         ▼              │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                     Redis + BullMQ Queues                      │   │
│   │  drive-sync | video-processing | ai-analysis | content-gen    │   │
│   │  youtube-publishing | instagram-publishing | notifications     │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │ Consumes Jobs                      │
│                                   ▼                                    │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │                   BullMQ Background Workers                    │   │
│   │  - Google Drive Downloader & SHA-256 Duplicate Guard           │   │
│   │  - Whisper Audio Transcription                                 │   │
│   │  - AI Semantic Analysis & Structured Output Validator          │   │
│   │  - YouTube & Instagram Social Copywriters                      │   │
│   │  - YouTube Resumable Uploader & Instagram Container Publisher   │   │
│   └───────────────────────────────┬────────────────────────────────┘   │
│                                   │                                    │
│                                   ▼ State & Metadata                   │
│   ┌────────────────────────────────────────────────────────────────┐   │
│   │              MySQL 8+ (ONLY Persistent Relational DB)          │   │
│   │  Users, Sessions, BrandProfiles, Videos, Analyses, Variants,   │   │
│   │  SocialAccounts, PublishJobs, PublishedPosts, AuditLogs        │   │
│   └────────────────────────────────────────────────────────────────┘   │
└────────────────────────────────────────────────────────────────────────┘
                                    │
               ┌────────────────────┴────────────────────┐
               ▼                                         ▼
   ┌───────────────────────┐                 ┌───────────────────────┐
   │  YouTube Data API v3  │                 │    Meta Graph API     │
   │   (Channel Uploads)   │                 │   (Instagram Reels)   │
   └───────────────────────┘                 └───────────────────────┘
```

---

## ⚡ Technology Stack

- **Frontend**: Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Lucide React, Framer Motion, TanStack Query, Zod.
- **Backend API**: Node.js 20+, Fastify, TypeScript, `@fastify/cors`, `@fastify/helmet`, `@fastify/rate-limit`, `@fastify/jwt`, `@fastify/cookie`.
- **Database**: **MySQL 8+ ONLY** with Prisma ORM. No MongoDB, PostgreSQL, SQLite, or Firebase. Fully normalized schema with UUID primary keys and transactional integrity.
- **Job Processing**: Redis 7 + BullMQ. *Redis is strictly an ephemeral queue and cache; MySQL is the sole source of truth.*
- **AI Engine**: Abstracted AI Service with OpenAI API (`gpt-4o`, `gpt-4o-mini`, `whisper-1`), JSON Mode, `jsonrepair` recovery, and Zod runtime schema validation.
- **Integrations**:
  - Google Drive API (OAuth 2.0 offline access, folder scanning, chunked video streaming)
  - YouTube Data API v3 (OAuth 2.0, channel metadata, resumable video uploads, metrics)
  - Meta Graph API (OAuth 2.0, Instagram Professional Accounts, 9:16 Reel containers, publishing status polling)
- **Security**: AES-256-GCM token encryption, Bcrypt password hashing, RBAC, Rate Limiting, Audit Logging.

---

## 📁 Repository Structure

```
muza/
├── apps/
│   ├── web/                     # Next.js 14 Frontend Application
│   │   ├── src/
│   │   │   ├── app/             # App Router pages (Dashboard, Videos, Review Studio, Publishing, etc.)
│   │   │   ├── components/      # Glassmorphic UI components, Sidebar, Header, Modals
│   │   │   ├── lib/             # API client, formatting utils
│   │   │   └── styles/          # Tailwind globals with dark mode tokens
│   │   └── package.json
│   ├── api/                     # Fastify REST API Server
│   │   ├── src/
│   │   │   ├── modules/         # auth, drive, videos, content, youtube, instagram, publishing, etc.
│   │   │   ├── middleware/      # auth, rbac, rate limiting
│   │   │   ├── config/          # Environment configuration
│   │   │   └── server.ts        # Server entry point
│   │   └── package.json
│   └── worker/                  # BullMQ Background Job Worker
│       ├── src/
│       │   ├── queues/          # BullMQ queue instantiations
│       │   ├── processors/      # Video download, transcription, AI analysis, publishing
│       │   └── worker.ts        # Worker orchestrator
│       └── package.json
├── packages/
│   ├── database/                # Prisma ORM & MySQL 8+ Schema, Seed scripts
│   ├── shared/                  # Common TypeScript interfaces, Enums, Zod schemas
│   ├── ai/                      # AI provider abstraction, OpenAI, prompt builder, json repair
│   └── integrations/            # Google Drive, YouTube, Instagram, AES-256-GCM crypto
├── infrastructure/
│   └── docker/                  # Production Dockerfiles for API, Worker, and Web
├── tests/                       # 10 Critical Pipeline & Acceptance Criteria Tests
├── scripts/                     # Parallel development runner (dev.js)
├── docker-compose.yml           # MySQL 8, Redis, API, and Worker orchestration
├── .env.example                 # Environment variables specification
└── package.json                 # Monorepo root workspace config
```

---

## 🔑 Environment Configuration

Create a `.env` file at the root of the project:

```bash
cp .env.example .env
```

| Key | Description |
| --- | --- |
| `DATABASE_URL` | MySQL connection string: `mysql://muza_user:muza_password@localhost:3306/muza_db` |
| `REDIS_URL` | Redis URL: `redis://localhost:6379` |
| `GOOGLE_CLIENT_ID` | Google OAuth Client ID (Google Cloud Console) |
| `GOOGLE_CLIENT_SECRET` | Google OAuth Client Secret |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/api/drive/callback` |
| `YOUTUBE_CLIENT_ID` | YouTube OAuth Client ID |
| `YOUTUBE_CLIENT_SECRET`| YouTube OAuth Client Secret |
| `YOUTUBE_REDIRECT_URI` | `http://localhost:3000/api/youtube/callback` |
| `META_APP_ID` | Meta Developer App ID |
| `META_APP_SECRET` | Meta Developer App Secret |
| `META_REDIRECT_URI` | `http://localhost:3000/api/instagram/callback` |
| `OPENAI_API_KEY` | OpenAI API key (`sk-proj-...`) |
| `OPENAI_MODEL` | `gpt-4o` |
| `ENCRYPTION_KEY` | 32-byte secret string for AES-256-GCM OAuth token encryption |
| `SESSION_SECRET` | JWT secret for user sessions |
| `APP_URL` | `http://localhost:3000` |
| `API_URL` | `http://localhost:4000` |

---

## 🚀 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Generate Prisma Client & Migrate MySQL Database
Ensure MySQL 8+ is running locally or in Docker:
```bash
npm run db:generate
npm run db:migrate
npm run db:seed
```
*The seed command populates default administrator credentials (`admin@muza.ai` / `MuzaAdmin123!`), default Brand Profile, system settings, and hashtag engine tables.*

### 3. Start Development Servers
Run the full-stack suite concurrently:
```bash
npm run dev
```
Or start individual applications:
```bash
npm run dev:api     # Starts Fastify API on http://localhost:4000
npm run dev:worker  # Starts BullMQ Background Worker
npm run dev:web     # Starts Next.js UI on http://localhost:3000
```

---

## 🧪 Testing the 10 Critical Requirements

Run the acceptance criteria test suite:
```bash
node --test tests/critical-pipeline.test.ts
```

This tests:
1. **Duplicate Video Detection**: File identity and SHA-256 hash checks.
2. **Drive Connection Resilience**: Graceful error reporting when OAuth credentials are missing.
3. **AES-256-GCM Encryption**: Secure token encryption & decryption.
4. **AI Generation Fallbacks**: Zod validation on platform copy.
5. **Invalid AI JSON Recovery**: `jsonrepair` and schema recovery.
6. **YouTube Upload Boundaries**: 100-character titles and PRIVATE privacy defaults.
7. **Instagram Reels Constraints**: Caption limits and regex hashtag formatting.
8. **Exponential Backoff**: 30s, 2m, 5m, 15m delay intervals.
9. **Scheduler & Timezone Accuracy**: Deterministic UTC scheduling calculations.
10. **Publish Idempotency**: Unique `userId:videoId:platform:socialAccountId` composite keys to prevent duplicate uploads.

---

## 🐳 Production Deployment with Docker Compose

Deploy the complete containerized stack (MySQL 8, Redis 7, API, BullMQ Worker):
```bash
docker compose up -d --build
```

Healthchecks ensure:
- MySQL 8.0 is healthy before API and Workers start.
- Redis is responding to `PING` before queue processors register.
- Database migrations execute automatically during startup.

---

## 🔒 Security Best Practices

1. **AES-256-GCM Encryption**: All external OAuth refresh and access tokens are encrypted in MySQL using authenticated AES-256-GCM with unique initialization vectors (IV) and authentication tags.
2. **Zero Client Secret Exposure**: Secrets and tokens are never transferred to the browser.
3. **Idempotency Guard**: Every publish action evaluates an idempotency key before uploading. If a record already exists with status `SUCCESS`, the upload is aborted.
4. **Brand Safety Enforcement**: Content variants cannot be approved if required fields (title, caption) are empty or violate forbidden words.
5. **Auto-Publish Safety**: Auto Publish is **strictly disabled by default** (`auto_publish: false`) to ensure creators inspect AI copy prior to public release.
