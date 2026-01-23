<div align="center">

<img src="assets/banner.png" alt="Knowsee Banner" width="100%" />

**A fullstack reference implementation for building AI assistants with Google ADK and CopilotKit using AGUI, A2A and GenerativeUI**

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)

</div>

---

Knowsee demonstrates how to build a multi-agent conversational AI using [Google Agent Development Kit (ADK)](https://github.com/google/adk-python) for the backend and [CopilotKit](https://copilotkit.ai) for the frontend, connected via the [AG-UI protocol](https://docs.ag-ui.com).

## Features

### 🤖 Agentic Architecture

- **Multi-Agent Orchestration** — Hierarchical delegation via `AgentTool` with isolated contexts
- **A2A Composition** — Agent-to-agent patterns without namespace contamination
- **Extended Thinking** — Gemini 2.5 Pro with dedicated reasoning budget
- **AG-UI Protocol** — Bidirectional streaming between frontend and backend
- **Generative UI** — Tool calls, reasoning, and sources as interactive components
- **SSE Event Bus** — Live updates without polling

### 🔍 Retrieval & Grounding

- **Vertex AI RAG Engine** — Semantic search with team-scoped corpus access
- **Web Search Grounding** — Google Search with inline citations
- **Multi-Source Synthesis** — RAG + web + uploads unified in responses

### 🏗️ Production-Ready

- **Better Auth** — Email/password, OTP verification, TOTP 2FA
- **Pluggable Identity** — Supports Google Groups, Azure AD, custom providers
- **Permission-Scoped RAG** — Users only access corpora their teams own
- **Terraform IaC** — Cloud Run, Cloud SQL, Vertex AI, KMS
- **SOPS Secrets** — Encrypted configuration management
- **Scheduled Sync** — Automated RAG corpus updates from GDrive/OneDrive

## Demo

### 1. Create an Account

Sign up with email and password.

<div align="center">
<img src="assets/create-account.png" alt="Create Account" width="600" />
</div>

### 2. Verify Your Email

An OTP is sent to your inbox.

<div align="center">
<img src="assets/email-verification.png" alt="Email Verification" width="600" />

<br />

<img src="assets/otp.png" alt="Enter OTP" width="400" />
</div>

### 3. Welcome to Knowsee

After verification, you're in.

<div align="center">
<img src="assets/verification.png" alt="Verified" width="600" />
</div>

### 4. Chat with Personality

Ask anything — get up-to-date answers with a touch of humour.

<div align="center">
<img src="assets/new-chat-personality.gif" alt="Chat Personality" width="600" />
</div>

### 5. Sessions & Tools

Conversations persist. Tools like Google Search just work.

<div align="center">
<img src="assets/sessions-tools.gif" alt="Sessions and Tools" width="600" />
</div>

### 6. Light Mode

For the light-mode lovers.

<div align="center">
<img src="assets/light-mode.gif" alt="Light Mode" width="600" />
</div>

### 7. Sign In & Out

Seamless authentication flow.

<div align="center">
<img src="assets/auth-flow.gif" alt="Auth Flow" width="600" />
</div>

## Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| [Node.js](https://nodejs.org/) | 20+ | Frontend runtime |
| [Python](https://python.org/) | 3.11+ | Backend runtime |
| [uv](https://docs.astral.sh/uv/) | Latest | Python package manager |
| [Docker](https://docker.com/) | Latest | Local Postgres |
| [gcloud CLI](https://cloud.google.com/sdk/gcloud) | Latest | GCP authentication |

For deployment only:
| [Terraform](https://terraform.io/) | 1.5+ | Infrastructure as Code |
| [SOPS](https://github.com/getsops/sops) | Latest | Secrets encryption |

## Quick Start

### 1. Clone and Install

```bash
git clone https://github.com/saahil-mehta/knowsee-public.git
cd knowsee-public
make install
```

### 2. Configure Environment

```bash
cp sagent/.env.example sagent/.env.development
cp web/.env.example web/.env.development
```

Edit both files with your values:

| Variable | Where | Notes |
|----------|-------|-------|
| `GOOGLE_CLOUD_PROJECT` | sagent | [GCP Free Tier](https://cloud.google.com/free) includes Vertex AI credits |
| `NEXT_PUBLIC_COPILOTKIT_PUBLIC_KEY` | web | [Free for personal use](https://cloud.copilotkit.ai) |
| `BETTER_AUTH_SECRET` | web | Generate: `openssl rand -base64 32` |
| `MAILGUN_*` | web | [Free tier](https://www.mailgun.com/pricing/) includes 1,000 emails/month |

### 3. Authenticate with GCP

Required for Vertex AI (Gemini models, RAG engine):

```bash
make gcp-login
```

### 4. Start Development

Ensure Docker Desktop is running, then:

```bash
make dev
```

This automatically:
- Starts local Postgres via Docker
- Runs database migrations
- Launches ADK backend → http://localhost:8000
- Launches Next.js frontend → http://localhost:3000

### 5. Create an Account

Open http://localhost:3000 and sign up. You'll receive an OTP via email (or check Mailgun logs in sandbox mode).
