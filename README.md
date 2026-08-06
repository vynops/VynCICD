# VynCICD

**Self-hosted CI/CD pipeline platform with AI failure triage, Kubernetes-native deployments, and DORA metrics.**

Connect your repositories, define pipelines in YAML, deploy to Kubernetes, and let the AI explain every failure — all in a single open-source platform you own and run.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=nodedotjs)](https://nodejs.org)
[![GitHub](https://img.shields.io/badge/GitHub-vynops%2FVynCICD-181717?logo=github)](https://github.com/vynops/VynCICD)
[![Part of VynOps Suite](https://img.shields.io/badge/VynOps-Suite-06b6d4)](https://github.com/vynops)

---

## What is VynCICD?

VynCICD is a complete CI/CD operations platform built for teams who want full control over their delivery pipeline. Connect a Gitea, GitHub, GitLab, or Bitbucket repository, define your stages, and let VynCICD handle the rest:

- **Pipeline runner** — executes lint, test, build, scan, and deploy stages on your own infrastructure
- **Kubernetes deployments** — apply manifests with dynamic cluster targeting per environment
- **Security scanning** — Trivy container image scanning blocks deploys on critical CVEs
- **DORA metrics** — deployment frequency, lead time, MTTR, and change failure rate from real data
- **AI Copilot** — ask natural language questions about your pipelines, failures, and metrics
- **Incident management** — auto-create incidents on pipeline failure with SLA tracking and on-call routing
- **Team access control** — admin, editor, and viewer roles with full audit trail

No cloud vendor lock-in. No per-seat pricing. Your servers, your data.

---

## Features

### Pipeline Orchestration
- YAML-defined pipeline stages: `run`, `test`, `build`, `scan`, `deploy`, `notify`
- Stage dependency resolution and sequential execution
- Configurable retry count, timeout per stage, and allow-failure flags
- Manual trigger from the dashboard or auto-trigger on push/PR/tag/schedule
- Live stage logs streamed to the dashboard as they run

### Repository Management
- Connect Gitea, GitHub, GitLab, and Bitbucket repositories from the UI
- Inline credential management with test-connection validation
- Webhook URL display per provider for quick configuration
- Webhook secret verification (HMAC) on all incoming events
- Repository edit: description, branch, clone URL, webhook status

### Kubernetes Deployments
- Deploy stages target named environments (staging, production, etc.)
- Per-environment cluster name (`$DEPLOY_CLUSTER`) resolved from the Environments registry
- Manifest YAML stored inline in the pipeline stage — no separate files needed
- Deployment records auto-created on successful deploy stage
- Rollback support from the Deployments page

### Environments
- Named deployment targets (development, staging, production, preview)
- Cluster name field → passed as `$DEPLOY_CLUSTER` to the runner
- Approval gates: require manual sign-off before production deploys
- Approver email list per environment
- Protection flag for staging and production environments

### Security Scanning
- Trivy container image scanning at the `scan` stage
- CRITICAL/HIGH CVE reporting with pass/fail/warning/skip status
- Per-run scan history with vulnerability breakdown
- Block-on-critical flag configurable in Settings
- Secret detection and SBOM generation toggles

### DORA Metrics & Analytics
- **Deployment Frequency** — deploys per week from real deployment records
- **Lead Time** — average successful run duration as pipeline lead time proxy
- **MTTR** — mean time to resolve from incident `createdAt` to `resolvedAt`
- **Change Failure Rate** — failed runs / total runs over last 30 days
- Daily run chart (7 days) with success/failure breakdown
- Build time trend (7 days average duration)
- Top failing pipelines by failure rate

### Incident Management
- Auto-create incidents when pipeline runs fail — no manual action needed
- Severity inferred from failing stage type: `deploy/scan` → high, `test/build` → medium
- Link incidents to run, repo, branch, commit, and author
- Acknowledge and resolve workflows with notes
- SLA breach timers on every open incident (configurable per severity)
- Assign to on-call person or custom email

### On-Call & Routing
- On-call shift scheduler with start/end times and timezone
- Routing rules: match incidents by severity + category → notify Slack/email/on-call
- Escalation policies: multi-step escalation with configurable delays
- Current on-call person surfaced in the Assign modal
- SLA tiers configurable per severity level

### AI Copilot
- Ask natural language questions about pipelines, runs, failures, and DORA metrics
- Powered by Groq (Llama-3.3-70b or configurable model)
- Contextual answers using live data from your runs, deployments, and incidents
- Token usage tracking per session

### Team & Access Control
- Three roles: `admin` (full access), `editor` (trigger pipelines, manage incidents), `viewer` (read-only)
- Create, edit, deactivate, and delete users from the Team page
- Last login tracking
- Passwords stored as scrypt hashes — no plaintext storage
- Role enforced on every API route

---

## Quick Start

### Prerequisites

- **Node.js 18+**
- A running Gitea instance (or GitHub/GitLab/Bitbucket)
- At least one Kubernetes cluster or target server accessible from VynCICD

### Install

```bash
git clone https://github.com/vynops/VynCICD
cd VynCICD
cp .env.local.example .env.local
npm install
```

### Configure

Edit `.env.local`:

```env
# Required
VYNCICD_SECRET=<run: openssl rand -base64 32>
VYNCICD_ADMIN_EMAIL=admin@vyncicd.local
VYNCICD_ADMIN_PASSWORD=changeme

# Git providers (configure at least one)
GITEA_URL=http://your-gitea:3300
GITEA_TOKEN=your-gitea-token
GITEA_WEBHOOK_SECRET=your-webhook-secret

# Kubernetes
K8S_KUBECONFIG=/path/to/kubeconfig.yaml

# Optional
GROQ_API_KEY=<from console.groq.com>
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/...
```

### Start

```bash
npm run dev
# Dashboard: http://localhost:3050
```

### Deploy the runner agent

The pipeline runner is a separate Node.js process that polls for pending runs and executes stages:

```bash
# On the server that will run pipelines
node src/agent/runner.mjs

# Or via PM2
pm2 start src/agent/runner.mjs --name vyncicd-runner
```

---

## Pipeline Definition

Pipelines are registered in VynCICD via the UI. Stages are defined per pipeline with the following fields:

| Stage Type | Description | Key Fields |
|---|---|---|
| `run` | Execute a shell command | `run` |
| `test` | Run tests (marks pipeline as failed on exit code != 0) | `run` |
| `build` | Build Docker image and push to registry | `run` |
| `scan` | Trivy security scan of the built image | `image` |
| `deploy` | Apply Kubernetes manifest | `environment`, `clusterName`, `manifest` |
| `notify` | Send notification (stub, configurable) | — |

### Example pipeline stages

```yaml
# Stage: test
type: test
run: |
  docker run --rm -v "$(pwd)":/app -w /app golang:1.22-alpine go test ./... -v

# Stage: build
type: build
run: |
  docker build -t ${IMAGE} .
  docker push ${IMAGE}

# Stage: deploy
type: deploy
environment: staging
clusterName: k3d-cicd    # selects kubectl context
manifest: |
  apiVersion: apps/v1
  kind: Deployment
  metadata:
    name: my-service
    namespace: staging
  spec:
    replicas: 1
    selector:
      matchLabels:
        app: my-service
    template:
      spec:
        containers:
        - name: my-service
          image: ${K8S_IMAGE}
```

### Template variables available to runner

| Variable | Value |
|---|---|
| `$IMAGE` | `${REGISTRY_URL}/${repoFullName}:${commit}` |
| `$K8S_IMAGE` | `${K8S_REGISTRY}/${repoFullName}:${commit}` |
| `$COMMIT` | Git commit SHA |
| `$DEPLOY_CLUSTER` | Cluster name from environment record |
| `$DEPLOY_ENV` | Environment name |

---

## Environment Variables

| Variable | Description | Required |
|---|---|---|
| `VYNCICD_SECRET` | 32-byte random secret for JWT signing | **Yes** |
| `VYNCICD_ADMIN_EMAIL` | Initial admin email | **Yes** |
| `VYNCICD_ADMIN_PASSWORD` | Initial admin password (hashed on first login) | **Yes** |
| `VYNCICD_SECURE_COOKIE` | Set `true` in production (HTTPS) | No |
| `GITEA_URL` | Gitea instance URL | No |
| `GITEA_TOKEN` | Gitea API token | No |
| `GITEA_WEBHOOK_SECRET` | Shared secret for Gitea webhook HMAC | No |
| `GITHUB_TOKEN` | GitHub PAT with repo scope | No |
| `GITHUB_WEBHOOK_SECRET` | GitHub webhook secret | No |
| `GITLAB_TOKEN` | GitLab personal access token | No |
| `GITLAB_URL` | Self-hosted GitLab URL | No |
| `K8S_API_URL` | Kubernetes API server URL | No |
| `K8S_KUBECONFIG` | Path to kubeconfig file | No |
| `REGISTRY_URL` | Docker registry for `docker push` | No |
| `K8S_REGISTRY_URL` | Registry accessible inside the cluster | No |
| `GROQ_API_KEY` | Groq API key for AI Copilot | No |
| `SLACK_WEBHOOK_URL` | Slack webhook for build notifications | No |
| `RUNNER_SECRET` | Shared secret between VynCICD and the runner agent | No |

---

## Data Storage

VynCICD stores all state as JSON files in `data/`. No database required.

| File | Contents |
|---|---|
| `data/repos.json` | Connected repositories |
| `data/pipelines.json` | Pipeline definitions with stages |
| `data/runs.json` | Pipeline run history (last 500) |
| `data/deployments.json` | Deployment records |
| `data/environments.json` | Deployment target environments |
| `data/incidents.json` | Incident records |
| `data/oncall.json` | On-call shifts |
| `data/routing.json` | Routing rules |
| `data/policies.json` | Escalation policies |
| `data/sla.json` | SLA tiers per severity |
| `data/users.json` | User accounts (scrypt-hashed passwords) |
| `data/settings.json` | Platform configuration |

> Add `data/` to `.gitignore` — it is already included in the default `.gitignore`.

---

## Production Deployment

### PM2

```bash
npm run build

# Start the dashboard
pm2 start npm --name vyncicd -- start

# Start the runner agent
pm2 start src/agent/runner.mjs --name vyncicd-runner

pm2 save
```

### Nginx

```nginx
server {
    listen 443 ssl;
    server_name cicd.example.com;

    location / {
        proxy_pass         http://localhost:3050;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_buffering    off;
        proxy_read_timeout 300s;
    }
}
```

---

## API Reference

### Authentication

Dashboard endpoints require a `vyncicd_session` cookie.
Runner endpoints accept `x-runner-token` header.

### Core Endpoints

| Method | Path | Description |
|---|---|---|
| `GET/POST` | `/api/repositories` | List / connect repositories |
| `PATCH/DELETE` | `/api/repositories/:id` | Update / remove repository |
| `GET/POST` | `/api/pipelines` | List / create pipelines |
| `PATCH/DELETE` | `/api/pipelines/:id` | Update / delete pipeline |
| `POST` | `/api/pipelines/:id/trigger` | Manually trigger a pipeline |
| `GET` | `/api/runs` | List pipeline runs |
| `GET` | `/api/runs/:id` | Get run details with deploy env vars |
| `PATCH` | `/api/runs/:id` | Update run status (runner) |
| `POST` | `/api/runs/:id/stage` | Report stage completion (runner) |
| `POST` | `/api/runs/:id/logs` | Push stage logs (runner) |
| `GET/POST` | `/api/deployments` | List / create deployments |
| `POST` | `/api/deployments/:id/rollback` | Roll back a deployment |
| `GET/POST` | `/api/environments` | List / create environments |
| `GET/POST` | `/api/incidents` | List / create incidents |
| `PATCH` | `/api/incidents/:id` | Acknowledge, resolve, or assign |
| `GET/POST` | `/api/oncall` | List / create on-call shifts |
| `GET/POST` | `/api/routing` | List / create routing rules |
| `GET/POST` | `/api/routing/policies` | List / create escalation policies |
| `GET/POST` | `/api/routing/sla` | Get / update SLA tiers |
| `GET` | `/api/analytics` | DORA metrics and chart data |
| `GET/POST` | `/api/users` | List / create users |
| `PATCH/DELETE` | `/api/users/:id` | Update / delete user |
| `POST` | `/api/auth/login` | Create session |
| `POST` | `/api/auth/logout` | Destroy session |
| `GET` | `/api/auth/me` | Current user |
| `POST` | `/api/auth/change-password` | Change own password |
| `POST` | `/api/webhooks/gitea` | Gitea push webhook |
| `POST` | `/api/webhooks/github` | GitHub push webhook |
| `POST` | `/api/webhooks/gitlab` | GitLab push webhook |
| `POST` | `/api/webhooks/bitbucket` | Bitbucket push webhook |
| `POST` | `/api/copilot` | AI Copilot query |
| `POST` | `/api/settings/test-git` | Test git provider connection |
| `POST` | `/api/settings/test-k8s` | Test Kubernetes connectivity |
| `POST` | `/api/settings/test-notification` | Test Slack or SMTP |

---

## Project Structure

```
src/
├── app/
│   ├── (dashboard)/
│   │   ├── overview/          # Fleet health + DORA snapshot
│   │   ├── pipelines/         # Pipeline CRUD and stage editor
│   │   ├── runs/              # Run history with live stage logs
│   │   ├── repositories/      # Repository management
│   │   ├── deployments/       # Deployment history and rollback
│   │   ├── environments/      # Deployment target registry
│   │   ├── security/          # Security scan results
│   │   ├── analytics/         # DORA charts and build trends
│   │   ├── incidents/         # Incident management with SLA timers
│   │   ├── oncall/            # On-call schedule management
│   │   ├── routing/           # Routing rules and escalation policies
│   │   ├── copilot/           # AI Copilot chat
│   │   ├── team/              # User management
│   │   └── settings/          # Platform configuration
│   ├── api/                   # All API routes
│   └── login/
├── components/
│   └── layout/                # Sidebar, Header, DashboardLayout
├── lib/
│   ├── auth.ts                # JWT session + role enforcement
│   ├── data-store.ts          # Repositories, pipelines, runs, deployments
│   ├── oncall-store.ts        # Incidents, on-call, routing, escalation, SLA
│   ├── settings-store.ts      # Platform settings
│   ├── user-store.ts          # Users + scrypt auth
│   ├── notifier.ts            # Slack/email notification delivery
│   ├── webhook-utils.ts       # Webhook payload → pipeline run creation
│   └── seed.ts                # Demo data seed
└── agent/
    └── runner.mjs             # Standalone pipeline runner process
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16, App Router, React 19 |
| Language | TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Data fetching | SWR |
| Auth | jose (JWT) + scrypt password hashing |
| AI | Groq API (Llama-3.3-70b-versatile) |
| Runner | Node.js 18, Docker CLI, kubectl |
| Storage | JSON file store (`data/`) — no database |

---

## Contributing

Open an issue before submitting a large PR.

```bash
git clone https://github.com/YOUR_USERNAME/VynCICD
cd VynCICD && npm install
git checkout -b feat/my-feature
npm run dev
```

---

## Part of the VynOps Suite

| Product | Purpose | Repo |
|---|---|---|
| **VynOps** | Kubernetes operations platform | [vynops/VynOps](https://github.com/vynops/VynOps) |
| **VynCICD** | CI/CD pipeline platform | [vynops/VynCICD](https://github.com/vynops/VynCICD) |
| **VynAI** | Ollama fleet manager and AI gateway | [vynops/VynAI](https://github.com/vynops/VynAI) |
| **VynCost** | Cloud cost visibility | [vynops/VynCost](https://github.com/vynops/VynCost) |
| **VynDB** | Database operations | [vynops/VynDB](https://github.com/vynops/VynDB) |
| **VynDC** | Data center management | [vynops/VynDC](https://github.com/vynops/VynDC) |

---

## License

MIT — see [LICENSE](LICENSE).

---
