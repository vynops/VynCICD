# VynCICD

**A self-hosted CI/CD control plane for native pipelines, Jenkinsfile execution, Kubernetes delivery, security scanning, notifications, AI triage, and DORA metrics.**

Connect your repositories, define pipelines in YAML, deploy to Kubernetes, and let the AI explain every failure — all in a single open-source platform you own and run.

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=nextdotjs)](https://nextjs.org)
[![Node.js](https://img.shields.io/badge/Node.js-18%2B-green?logo=nodedotjs)](https://nodejs.org)
[![GitHub](https://img.shields.io/badge/GitHub-vynops%2FVynCICD-181717?logo=github)](https://github.com/vynops/VynCICD)
[![Part of VynOps Suite](https://img.shields.io/badge/VynOps-Suite-06b6d4)](https://github.com/vynops)

VynCICD gives teams one place to connect repositories, define or trigger pipelines, inspect runs, track deployments, manage incidents, and compare engineering performance.

```text
Native pipeline:
  VynCICD -> VynCICD runner -> stages execute

Jenkinsfile pipeline:
  VynCICD -> Jenkins -> Jenkinsfile executes -> VynCICD tracks the result
```

VynCICD is the control plane and dashboard. The selected execution engine owns the actual work.

---

## Screenshots
| Screenshot | Screenshot |
|---|---|
| [![Login and first-time setup](screenshots/Screenshot%202026-09-01%20133059.png)](screenshots/Screenshot%202026-09-01%20133059.png)<br>Login and first-time admin setup. | [![Overview dashboard](screenshots/Screenshot%202026-09-01%20133243.png)](screenshots/Screenshot%202026-09-01%20133243.png)<br>Overview dashboard with run health, DORA metrics, recent deployments, and incident load. |
| [![Pipeline catalog](screenshots/Screenshot%202026-09-01%20133312.png)](screenshots/Screenshot%202026-09-01%20133312.png)<br>Pipeline catalog showing pending, idle, successful, and failed pipeline definitions with trigger controls. | [![Jenkins pipeline creation](screenshots/Screenshot%202026-09-01%20133940.png)](screenshots/Screenshot%202026-09-01%20133940.png)<br>New pipeline flow for Jenkinsfile execution through Jenkins. |
| [![Argo CD pipeline creation](screenshots/Screenshot%202026-09-01%20134002.png)](screenshots/Screenshot%202026-09-01%20134002.png)<br>New pipeline flow for Argo CD GitOps deployment. | [![Pipeline runs](screenshots/Screenshot%202026-09-01%20134159.png)](screenshots/Screenshot%202026-09-01%20134159.png)<br>Run history with success, failed, pending, filter, search, and export states. |
| [![Argo CD run detail](screenshots/Screenshot%202026-09-01%20134242.png)](screenshots/Screenshot%202026-09-01%20134242.png)<br>Expanded Argo CD run detail with manual trigger metadata, sync state, health state, and external Argo CD link. | [![Jenkins run detail](screenshots/Screenshot%202026-09-01%20134313.png)](screenshots/Screenshot%202026-09-01%20134313.png)<br>Expanded Jenkins run detail with build duration and Jenkins build artifact link. |
| [![Repositories](screenshots/Screenshot%202026-09-01%20134334.png)](screenshots/Screenshot%202026-09-01%20134334.png)<br>Repository cards with provider metadata and webhook-active status. | [![Environments](screenshots/Screenshot%202026-09-01%20134402.png)](screenshots/Screenshot%202026-09-01%20134402.png)<br>Deployment environment targets for development, production, and lab clusters. |
| [![Deployments](screenshots/Screenshot%202026-09-01%20134441.png)](screenshots/Screenshot%202026-09-01%20134441.png)<br>Deployment ledger with staging releases, versions, passed health gates, and rollback actions. | [![Security scans](screenshots/Screenshot%202026-09-01%20134621.png)](screenshots/Screenshot%202026-09-01%20134621.png)<br>Security and compliance scan artifacts with CVE counts, secret detection, build-block counters, and passed scan results. |
| [![Analytics and DORA](screenshots/Screenshot%202026-09-01%20134646.png)](screenshots/Screenshot%202026-09-01%20134646.png)<br>DORA analytics with deployment frequency, lead time, MTTR, change failure rate, build activity, and failing-pipeline trends. | [![Incidents](screenshots/Screenshot%202026-09-01%20134715.png)](screenshots/Screenshot%202026-09-01%20134715.png)<br>Incident queue with severity, acknowledgement breach timers, assignment, acknowledgement, and resolution actions. |
| [![On-call](screenshots/Screenshot%202026-09-01%20134754.png)](screenshots/Screenshot%202026-09-01%20134754.png)<br>On-call schedule history and shift management. | [![Routing and escalations](screenshots/Screenshot%202026-09-01%20134814.png)](screenshots/Screenshot%202026-09-01%20134814.png)<br>Routing rules and escalation policies for alert delivery to Slack and on-call responders. |
| [![AI Copilot](screenshots/Screenshot%202026-09-01%20134834.png)](screenshots/Screenshot%202026-09-01%20134834.png)<br>AI Copilot workspace with usage counters, prompt shortcuts, and pipeline triage prompts. | [![Settings and integrations](screenshots/Screenshot%202026-09-01%20134859.png)](screenshots/Screenshot%202026-09-01%20134859.png)<br>Settings for Kubernetes, registry, credentials, notifications, AI, DORA targets, and token usage. |
| [![Team and roles](screenshots/Screenshot%202026-09-01%20134915.png)](screenshots/Screenshot%202026-09-01%20134915.png)<br>Team management with admin/viewer roles and role reference. | [![Native pipeline stages](screenshots/Screenshot%202026-09-01%20154833.png)](screenshots/Screenshot%202026-09-01%20154833.png)<br>Native VynCICD stage editor with lint, test, build, and scan steps. |
| [![Execution mode selector](screenshots/Screenshot%202026-09-01%20154954.png)](screenshots/Screenshot%202026-09-01%20154954.png)<br>Execution-mode selector for native stages, Jenkinsfile via Jenkins, and Argo CD GitOps deployment. |  |

---

## Contents

1. [Understand The System](#understand-the-system)
2. [Accounts And Permissions](#accounts-and-permissions)
3. [Architecture](#architecture)
4. [Server Reference](#server-reference)
5. [Install Locally](#install-locally)
6. [Configure Environment](#configure-environment)
7. [Run VynCICD](#run-vyncicd)
8. [Production Deployment](#production-deployment)
9. [Back Up And Restore](#back-up-and-restore)
10. [Connect A Repository](#connect-a-repository)
11. [Native Pipelines](#native-pipelines)
12. [Jenkins CI](#jenkins-ci)
13. [Jenkins Kubernetes CD](#jenkins-kubernetes-cd)
14. [Kubernetes And k3d](#kubernetes-and-k3d)
15. [Container Registry](#container-registry)
16. [Resource Limits](#resource-limits)
17. [Settings Guide](#settings-guide)
18. [Security And Secrets](#security-and-secrets)
19. [Troubleshooting](#troubleshooting)
20. [Checklists](#checklists)
21. [Repository Reference](#repository-reference)

---

## Understand The System

### What VynCICD does

- Connects Gitea, GitHub, GitLab, and Bitbucket repositories.
- Runs native stages: `run`, `test`, `build`, `scan`, `deploy`, and `notify`.
- Triggers and tracks Jenkinsfile jobs.
- Tracks Kubernetes deployments and rollbacks.
- Runs Trivy image scans, secret scans, and SBOM generation.
- Sends Slack, Microsoft Teams, custom webhook, and email notifications.
- Provides AI Copilot with configurable providers.
- Manages incidents, on-call, routing, escalation, and SLAs.
- Calculates deployment frequency, lead time, MTTR, and change failure rate.
- Provides `admin`, `editor`, and `viewer` team roles.

### Native versus Jenkinsfile mode

Choose **Native VynCICD stages** when VynCICD should execute the complete run.

Choose **Jenkinsfile via Jenkins** when Jenkins should execute the complete run. VynCICD triggers the Jenkins job and displays its result; it does not interpret Jenkins Groovy.

| Concern | Native mode | Jenkinsfile mode |
|---|---|---|
| Pipeline definition | VynCICD UI stages | Jenkinsfile or Jenkins job |
| Execution engine | VynCICD runner | Jenkins |
| Build/test/scan commands | VynCICD runner | Jenkins agent |
| Kubernetes deployment | VynCICD runner | Jenkins agent and `kubectl` |
| Run visibility | VynCICD | VynCICD plus Jenkins link |
| Retry/timeout owner | VynCICD | Jenkins |
| Credentials used during work | VynCICD runner | Jenkins Credentials |

Do not configure both engines to execute the same pipeline. Pick one owner.

---

## Accounts And Permissions

Keep host, application, Jenkins, and Kubernetes identities separate.

### `ubuntu`

Deployment operator account. It may use `sudo` for controlled host administration:

- Copy changed files to the server.
- Install files into `/home/vyncicd/vyncicd`.
- Run the VynCICD build as `vyncicd`.
- Restart and save PM2 as `vyncicd`.
- Inspect Docker and Kubernetes when required.

### `vyncicd`

Owns and runs VynCICD:

```text
/home/vyncicd/vyncicd
```

Run application commands as:

```bash
sudo -u vyncicd -H bash
cd /home/vyncicd/vyncicd
```

### `labcicd`

Owns the Jenkins test environment:

```text
/home/labcicd/jenkins
```

Jenkins itself runs inside its container as the image-native `jenkins` user. The host Compose project and Jenkins data remain under `labcicd`.

### `root` or `sudo`

Use root-level access only for host and cluster administration:

- Docker networks and containers.
- k3d cluster operations.
- Kubernetes namespaces, RBAC, quotas, and rollout repair.
- Reading protected service-account token files when necessary.

Never give Jenkins `cluster-admin` for the test setup.

---

## Architecture

```text
User
  |
  v
VynCICD dashboard
  |\
  | \-- Native mode --> VynCICD runner --> Docker/Kubernetes
  |
  \---- Jenkinsfile mode --> Jenkins --> kubectl/Kubernetes
                                  |
                                  \--> Registry and build tools
```

### Important ports

| Service | Port | Purpose |
|---|---:|---|
| VynCICD | `3050` | Dashboard and API |
| Jenkins | `8080` | Jenkins web/API |
| Docker Registry | `5050` | Registry API on host |
| k3d-cicd API | `41815` host / `6443` cluster | Kubernetes API |
| Gitea | `3300` | Repository web/API |

### Application components

| Path | Purpose |
|---|---|
| `src/app/**` | Next.js pages and API routes |
| `src/lib/settings-store.ts` | Typed settings and JSON persistence |
| `src/lib/data-store.ts` | Repositories, pipelines, runs, deployments, scans |
| `src/lib/jenkins.ts` | Jenkins REST client, CSRF, queue/build polling |
| `src/agent/runner.mjs` | Native pipeline runner |
| `data/*.json` | Runtime state; treat as production data |
| `ops/jenkins-cd/` | Jenkins Kubernetes CD setup |

---

## Server Reference

Reference installation:

```text
Host: ubuntu@92.4.75.193
VynCICD user: vyncicd
VynCICD path: /home/vyncicd/vyncicd
VynCICD PM2 name: vyncicd
Jenkins user: labcicd
Jenkins path: /home/labcicd/jenkins
Jenkins URL: http://92.4.75.193:8080
VynCICD URL: http://92.4.75.193:3050
Registry: http://localhost:5050
k3d cluster: cicd / kubectl context k3d-cicd
```

Replace these values for another server. Never copy real passwords or tokens into this README.

Connect from Windows PowerShell:

```powershell
ssh -i "D:\Help\ssh-key-2026-07-18.key" ubuntu@92.4.75.193
```

The server is production-like. Do not run deployment commands unless deployment was explicitly approved.

---

## Install Locally

Prerequisites:

- Node.js 18 or newer.
- npm and Git.
- A repository provider or local Gitea.
- Optional Docker, kubectl, and Kubernetes for pipeline execution.

```bash
git clone <repository-url> vyncicd
cd vyncicd
npm install
```

Create `.env.local` from your environment template:

```bash
cp .env.local.example .env.local
```

On Windows PowerShell:

```powershell
Copy-Item .env.local.example .env.local
```

Start development:

```bash
npm run dev
```

Open:

```text
http://localhost:3050
```

Build and run production locally:

```bash
npm run build
npm run start
```

### Architecture check

The reference server is ARM64. Always check before using container images:

```bash
uname -m
docker info --format '{{.Architecture}}'
```

An AMD64-only image on an ARM64 node causes:

```text
exec format error
```

Build `linux/arm64` on an ARM64 host or publish a multi-architecture image.

---

## Configure Environment

Use strong values. These are placeholders only:

```env
VYNCICD_SECRET=<long-random-signing-secret>
VYNCICD_ADMIN_EMAIL=admin@example.com
VYNCICD_ADMIN_PASSWORD=<unique-admin-password>

GITEA_URL=http://gitea:3000
GITEA_TOKEN=<gitea-api-token>
GITEA_WEBHOOK_SECRET=<webhook-secret>

K8S_API_URL=https://127.0.0.1:<live-port>
K8S_KUBECONFIG=/home/labcicd/kubeconfig/cicd.yaml

REGISTRY_URL=http://localhost:5050
K8S_REGISTRY_URL=cicd-registry:5000

SLACK_WEBHOOK_URL=<slack-webhook>
TEAMS_WEBHOOK_URL=<teams-webhook>
CUSTOM_WEBHOOK_URL=<custom-webhook>
SMTP_HOST=<smtp-host>
SMTP_PORT=587
SMTP_USER=<smtp-user>
SMTP_PASSWORD=<smtp-password>
SMTP_FROM=<from-address>

GROQ_API_KEY=<groq-key>
RUNNER_SECRET=<runner-secret>
```

Generate a signing secret:

```bash
openssl rand -base64 32
```

Never commit `.env.local`, `data/settings.json`, tokens, API keys, Jenkins passwords, or Kubernetes ServiceAccount tokens.

---

## Run VynCICD

### Development

```bash
npm run dev
```

### Production with PM2

Run as `vyncicd`:

```bash
cd /home/vyncicd/vyncicd
npm install
npm run build
pm2 start npm --name vyncicd -- start
pm2 save
pm2 list
```

If it already exists:

```bash
pm2 restart vyncicd
pm2 save
```

Inspect logs and health:

```bash
pm2 logs vyncicd --lines 100
curl -I http://127.0.0.1:3050
```

### Native runner

Native pipelines require the separate runner:

```bash
cd /home/vyncicd/vyncicd
node src/agent/runner.mjs
```

Under PM2:

```bash
pm2 start src/agent/runner.mjs --name vyncicd-runner
pm2 save
pm2 logs vyncicd-runner --lines 100
```

The runner is not required for Jenkinsfile pipelines. Jenkins executes those runs.

---

## Production Deployment

This procedure deploys only explicitly changed files. Never copy the full project, `node_modules`, `.next`, `.env.local`, or runtime data.

### 1. Check local changes

```powershell
git status --short
git diff --name-only
```

Review every file before transfer.

### 2. Transfer a changed file

```powershell
$key = "D:\Help\ssh-key-2026-07-18.key"
scp -i $key src/lib/jenkins.ts ubuntu@92.4.75.193:/tmp/jenkins.ts
```

### 3. Verify SHA-256

Local:

```powershell
Get-FileHash src/lib/jenkins.ts -Algorithm SHA256
```

Server:

```bash
sha256sum /tmp/jenkins.ts
```

Stop if hashes differ.

### 4. Install as `vyncicd`

```bash
sudo cp /tmp/jenkins.ts /home/vyncicd/vyncicd/src/lib/jenkins.ts
sudo chown vyncicd:vyncicd /home/vyncicd/vyncicd/src/lib/jenkins.ts
rm -f /tmp/jenkins.ts
```

### 5. Build before restart

```bash
sudo -u vyncicd -H bash
cd /home/vyncicd/vyncicd
npm install
npm run build
```

If the build fails, do not restart PM2.

For stale generated output:

```bash
rm -rf .next
npm run build
```

Never delete `data/` during a build repair.

### 6. Restart and verify

```bash
pm2 restart vyncicd
pm2 save
pm2 list
```

Expected:

```text
vyncicd  online
```

---

## Back Up And Restore

### VynCICD data

```bash
tar -czf /tmp/vyncicd-data-$(date +%Y%m%d%H%M%S).tar.gz \
  -C /home/vyncicd/vyncicd data
```

Move the archive to protected backup storage. Do not leave long-lived backups in `/tmp`.

### Jenkins home

```bash
tar -czf /tmp/jenkins-home-$(date +%Y%m%d%H%M%S).tar.gz \
  -C /home/labcicd/jenkins home
```

Protect this archive: it contains Jenkins configuration, job history, and credential metadata.

### Restore

Stop before restoring:

```bash
pm2 stop vyncicd
tar -xzf /path/to/vyncicd-data-backup.tar.gz -C /home/vyncicd/vyncicd
chown -R vyncicd:vyncicd /home/vyncicd/vyncicd/data
pm2 start vyncicd
```

Take a fresh backup before overwriting current state.

---

## Connect A Repository

1. Open **Repositories**.
2. Click **Add repository**.
3. Select Gitea, GitHub, GitLab, or Bitbucket.
4. Enter URL and credentials.
5. Click **Test connection**.
6. Save.
7. Configure the provider webhook using the URL shown by VynCICD.
8. Push a small commit or manually trigger a pipeline.

For webhook failures:

```bash
pm2 logs vyncicd --lines 200 | grep -i webhook
```

External providers need a publicly reachable webhook URL. A localhost URL is only suitable for server-side tests.

---

## Native Pipelines

### Create a native pipeline

1. Open **Pipelines -> New Pipeline**.
2. Enter name, repository, and branch.
3. Select **Native VynCICD stages**.
4. Add at least one stage.
5. Save.
6. Click the play button.
7. Open **Runs** to watch status and logs.

Native pipelines require at least one stage.

### Stage types

| Type | Purpose | Typical fields |
|---|---|---|
| `run` | Shell command | `run` |
| `test` | Test command | `run` |
| `build` | Build and push | `run` |
| `scan` | Trivy image scan | `image` |
| `deploy` | Apply Kubernetes manifest | `environment`, `clusterName`, `manifest` |
| `notify` | Notification step | channel configuration |

### Template variables

| Variable | Meaning |
|---|---|
| `${IMAGE}` | Host registry image reference |
| `${K8S_IMAGE}` | Image reference visible from Kubernetes |
| `${COMMIT}` | Commit identifier |
| `${DEPLOY_ENV}` | Deployment environment |
| `${DEPLOY_CLUSTER}` | Selected cluster |

Example deploy manifest:

```yaml
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
    metadata:
      labels:
        app: my-service
    spec:
      containers:
        - name: my-service
          image: ${K8S_IMAGE}
```

---

## Jenkins CI

### Minimal Jenkins installation

Reference setup:

```text
Host account: labcicd
Directory: /home/labcicd/jenkins
Container: labcicd-jenkins
Web: http://92.4.75.193:8080
CPU limit: 0.25 CPU
Memory limit: 768 MiB
Swap ceiling: 768 MiB
Process limit: 256
```

Jenkins runs as the image-native `jenkins` user. Do not force `user: "1008:1008"`; that causes `whoami: cannot find name for user ID` errors.

### First setup

1. Open `http://<server>:8080`.
2. Retrieve the one-time password:

   ```bash
   sudo cat /home/labcicd/jenkins/home/secrets/initialAdminPassword
   ```

3. Choose **Install suggested plugins**.
4. Create a non-default admin user such as `cicd`.
5. Generate a Jenkins API token from the user security page.
6. Use the API token for VynCICD, not the setup password.

### Configure Jenkins in VynCICD

Open **Settings -> Pipeline -> Jenkins**:

```text
Jenkins URL: http://127.0.0.1:8080
Jenkins Username: cicd
Jenkins API Token: <generated API token>
```

Click **Test connection**. Expected:

```text
Connected to Jenkins · <version>
```

The token should show as `***configured***`.

### Create a Jenkinsfile pipeline

1. Open **Pipelines -> New Pipeline**.
2. Enter name, repository, and branch.
3. Select **Jenkinsfile via Jenkins**.
4. Enter the exact Jenkins job name.
5. Enter `Jenkinsfile` or the real repository path.
6. Leave optional parameters empty unless the Jenkins job defines them.
7. Create and click play.

Unparameterized jobs use Jenkins `/build`. Parameterized jobs use `/buildWithParameters` only when explicit parameters exist.

### Jenkins lifecycle

```text
VynCICD creates run
  -> Jenkins queue
  -> Jenkins build starts
  -> Jenkins executes Jenkinsfile
  -> VynCICD polls queue/build
  -> VynCICD stores status, duration, console, and build URL
```

### Jenkins 403

Check:

- API token is valid.
- User has `Overall -> Read`.
- Job has `Job -> Read`, `Job -> Build`, and `Job -> Cancel`.
- The configured username is correct.
- The job name matches exactly.
- CSRF crumb header and session cookie are preserved.

### Jenkins 400 not parameterized

If Jenkins says:

```text
<job> is not parameterized
```

Remove VynCICD optional parameters or define matching Jenkins parameters. Repository and branch metadata are not automatically sent as Jenkins parameters.

---

## Jenkins Kubernetes CD

The reusable CD assets are in:

```text
ops/jenkins-cd/
```

They include:

- ARM64 Jenkins image with `kubectl v1.31.5`.
- Compose network attachment to `k3d-cicd`.
- `jenkins-cd-test` namespace RBAC.
- Safe nginx deployment and rollout Jenkinsfile.
- Setup instructions.

### CD ownership

```text
Root/admin:
  creates namespace, RBAC, quota, and token

labcicd:
  owns Jenkins files and container lifecycle

jenkins user:
  executes Jenkinsfile commands

Kubernetes:
  authorizes only the ServiceAccount token
```

### Namespace and ServiceAccount

```text
Namespace: jenkins-cd-test
ServiceAccount: jenkins-deployer
Credential ID: k8s-cd-test-token
```

The ServiceAccount can manage permitted resources in `jenkins-cd-test` and must not deploy to `production`.

Verify with a live kubeconfig:

```bash
k3d kubeconfig get cicd > /tmp/cicd-live.yaml
kubectl --kubeconfig /tmp/cicd-live.yaml auth can-i create deployments \
  --as=system:serviceaccount:jenkins-cd-test:jenkins-deployer \
  -n jenkins-cd-test
kubectl --kubeconfig /tmp/cicd-live.yaml auth can-i create deployments \
  --as=system:serviceaccount:jenkins-cd-test:jenkins-deployer \
  -n production
rm -f /tmp/cicd-live.yaml
```

Expected:

```text
yes
no
```

### Add the token to Jenkins

Retrieve it only on the server terminal:

```bash
sudo cat /home/labcicd/jenkins/k8s-cd-test-token
```

In Jenkins:

```text
Manage Jenkins -> Credentials -> System -> Global credentials -> Add Credentials
Kind: Secret text
ID: k8s-cd-test-token
Secret: complete token value
```

Do not put the token in Git, a Jenkinsfile, VynCICD settings, README, or chat.

### CD test pipeline

Use [ops/jenkins-cd/Jenkinsfile](ops/jenkins-cd/Jenkinsfile). It:

1. Checks Kubernetes access.
2. Creates or updates `nginx:1.27`.
3. Waits for rollout completion.

Jenkins reaches the k3d API through:

```text
https://k3d-cicd-serverlb:6443
```

The test uses `--insecure-skip-tls-verify=true` only for the isolated lab cluster. Use a trusted CA certificate outside this lab.

Verify from the server:

```bash
kubectl get deployment jenkins-cd-test \
  -n jenkins-cd-test --context k3d-cicd
kubectl get pods \
  -n jenkins-cd-test --context k3d-cicd
```

Expected:

```text
jenkins-cd-test   1/1   Running
```

### CD quota

The test namespace is limited by ResourceQuota and LimitRange:

```text
CPU requests:     500m
CPU limits:       1 CPU
Memory requests:  512Mi
Memory limits:    1Gi
Pods:             5
Services:         3
Storage requests: 2Gi
```

Inspect:

```bash
kubectl get resourcequota -n jenkins-cd-test --context k3d-cicd
kubectl get limitrange -n jenkins-cd-test --context k3d-cicd
kubectl describe resourcequota jenkins-cd-test-quota \
  -n jenkins-cd-test --context k3d-cicd
```

Jenkins must not be allowed to edit these controls.

---

## Kubernetes And k3d

### Identify the cluster

```bash
k3d cluster list
kubectl get ns --context k3d-cicd
kubectl get pods -A --context k3d-cicd
```

If the context is missing, create a live temporary kubeconfig:

```bash
k3d kubeconfig get cicd > /tmp/cicd-live.yaml
kubectl --kubeconfig /tmp/cicd-live.yaml get ns
rm -f /tmp/cicd-live.yaml
```

Do not trust a stale kubeconfig pointing to an old `0.0.0.0` port.

### Workload diagnosis

```bash
kubectl get deployment <name> -n <namespace> --context k3d-cicd
kubectl get pods -n <namespace> --context k3d-cicd
kubectl describe pod <pod> -n <namespace> --context k3d-cicd
kubectl logs <pod> -n <namespace> --context k3d-cicd
```

For a CrashLoopBackOff:

```bash
kubectl logs <pod> -n <namespace> --previous --context k3d-cicd
kubectl describe pod <pod> -n <namespace> --context k3d-cicd
```

For `exec format error`:

```bash
uname -m
docker image inspect <image> --format '{{.Architecture}}/{{.Os}}'
```

An ARM64 node cannot execute an AMD64-only image. Rebuild for ARM64 or publish a multi-architecture image.

### Safe rollout

```bash
kubectl set image deployment/<name> <container>=<image> \
  -n <namespace> --context k3d-cicd
kubectl rollout status deployment/<name> \
  -n <namespace> --timeout=180s --context k3d-cicd
```

Never delete a working deployment before verifying the replacement image.

---

## Container Registry

Reference registry:

```text
Container: cicd-registry
Host port: 5050
Container port: 5000
URL: http://localhost:5050
```

Health check:

```bash
curl -i --max-time 10 http://localhost:5050/v2/
```

Interpretation:

- `200 OK`: reachable and open.
- `401 Unauthorized`: reachable but authentication is required.
- `403 Forbidden`: reachable but access denied.
- Refused/timeout: service or URL problem.

Container check:

```bash
sudo docker ps --filter name=cicd-registry
sudo docker logs --tail 100 cicd-registry
```

The host-side runner commonly uses `localhost:5050`. Kubernetes pods commonly use `cicd-registry:5000`. Do not use host `localhost` from inside a pod.

---

## Resource Limits

Hard limits protect the host. Limits are ceilings, not reservations.

Inspect database limits:

```bash
for c in labdb-pg-primary labdb-pg-replica labdb-mysql labdb-redis \
  labdb-mongodb labdb-couchbase labdb-sqlserver
do
  docker inspect --format \
    "$c: memory={{.HostConfig.Memory}} memorySwap={{.HostConfig.MemorySwap}} nanoCPUs={{.HostConfig.NanoCpus}} pids={{.HostConfig.PidsLimit}}" \
    "$c"
done
```

Interpretation:

- `memory=0`: no memory limit.
- `nanoCPUs=0`: no CPU limit.
- `mem_reservation`: reservation, not a hard ceiling.
- `memswap_limit` equal to `mem_limit`: no additional swap headroom.

Live usage:

```bash
docker stats --no-stream
```

Kubernetes ResourceQuota limits aggregate namespace usage. LimitRange supplies defaults and per-container maximums. Neither pre-allocates the full amount.

---

## Settings Guide

Open **Settings**. Save settings before testing saved values.

### Kubernetes and registry

- API URL must be reachable from the VynCICD server.
- Kubeconfig must be readable by the VynCICD process.
- ServiceAccount tokens display as `***configured***`.
- Registry tests run server-side.

### Pipeline

- Retry count, timeout, and concurrency affect native runner behavior.
- Jenkins URL, username, and API token configure Jenkins REST access.
- Jenkins tokens are masked.

### Security Scans

- Trivy image scanning.
- Secret detection.
- SBOM generation.
- Critical vulnerability blocking.

### Notifications

Channels can be independently enabled or disabled:

- Slack.
- Microsoft Teams.
- Custom webhook.
- SMTP email.

### AI Copilot

Supported provider modes include Groq, OpenAI, Anthropic, Google, and custom OpenAI-compatible endpoints. Keys are masked as `***configured***`.

### DORA Targets

Targets are used by analytics and overview comparisons:

- Deployment frequency.
- Lead time.
- MTTR.
- Change failure rate.

---

## Security And Secrets

Never expose:

- VynCICD signing secret.
- Admin password.
- Jenkins API token.
- Kubernetes ServiceAccount token.
- Git provider token.
- Registry password.
- SMTP password.
- AI API key.

Check presence without printing values:

```bash
test -s /home/labcicd/jenkins/k8s-cd-test-token && echo token-present
python3 - <<'PY'
import json
p='/home/vyncicd/vyncicd/data/settings.json'
s=json.load(open(p))
for key in ('k8sToken','jenkinsApiToken','registryPassword'):
    print(key + '_present=' + str(bool(str(s.get(key,'' )).strip())).lower())
PY
```

Jenkins baseline:

- Use a non-default admin username.
- Disable anonymous read/build permissions.
- Use API tokens for integrations.
- Grant only `Overall -> Read` and required job permissions.
- Do not expose Jenkins agent port `50000` unless needed.
- Do not mount `/var/run/docker.sock` unless Docker builds are required.
- Use namespace-scoped Kubernetes RBAC.
- Use HTTPS and a trusted CA outside the lab.

---

## Troubleshooting

### VynCICD does not start

```bash
pm2 status
pm2 logs vyncicd --lines 200
cd /home/vyncicd/vyncicd
npm run build
```

If build fails, do not restart.

### Jenkins connection fails

```bash
curl -i http://127.0.0.1:8080/api/json
docker ps --filter name=labcicd-jenkins
docker logs --tail 100 labcicd-jenkins
```

Use the API token, not the one-time setup password.

### Jenkins 403

Check API token validity, job permissions, `Overall -> Read`, `Job -> Read`, `Job -> Build`, `Job -> Cancel`, and CSRF crumb/session handling.

### Jenkins 400 not parameterized

Remove VynCICD optional parameters or define matching Jenkins job parameters. An unparameterized job must use `/build`.

### Jenkins run remains pending

```bash
python3 - <<'PY'
import json
runs=json.load(open('/home/vyncicd/vyncicd/data/runs.json'))
for r in runs[:20]:
    if r.get('executionMode') == 'jenkinsfile':
        print({k:r.get(k) for k in ('id','status','jenkinsQueueUrl','jenkinsBuildNumber','jenkinsBuildUrl','error')})
PY
```

If Jenkins has completed but the pipeline card is pending, refresh/expand the run so polling synchronizes both records.

### Kubernetes context missing

```bash
k3d kubeconfig get cicd > /tmp/cicd-live.yaml
kubectl --kubeconfig /tmp/cicd-live.yaml get ns
rm -f /tmp/cicd-live.yaml
```

### Kubernetes 401

The API is reachable but the token is invalid or lacks permission:

```bash
kubectl auth can-i get pods \
  --as=system:serviceaccount:<namespace>:<serviceaccount> \
  -n <namespace>
```

### Kubernetes CrashLoopBackOff

```bash
kubectl logs <pod> -n <namespace> --previous --context k3d-cicd
kubectl describe pod <pod> -n <namespace> --context k3d-cicd
```

### Kubernetes `exec format error`

Compare `uname -m` with the image architecture. Rebuild the image for the node architecture.

### Registry unavailable

```bash
curl -i http://localhost:5050/v2/
docker ps --filter name=cicd-registry
docker logs --tail 100 cicd-registry
```

### Docker health check failures

```bash
docker inspect --format '{{json .Config.Healthcheck}}' <container>
docker inspect --format '{{range .State.Health.Log}}{{.Output}}{{"\n"}}{{end}}' <container>
```

A SQL Edge image without `sqlcmd` needs a valid alternative readiness probe, such as a TCP listener check. An authenticated Couchbase endpoint needs an authenticated health probe or public readiness endpoint.

---

## Checklists

### Before production changes

- [ ] Explicit deployment approval exists.
- [ ] `git status` and `git diff --name-only` reviewed.
- [ ] Only intended files selected.
- [ ] Runtime data backed up when needed.
- [ ] Changed files transferred individually.
- [ ] SHA-256 hashes match.
- [ ] Build run as `vyncicd`.
- [ ] PM2 not restarted after a failed build.
- [ ] PM2 online after restart.
- [ ] Relevant API and UI verified.

### Before Jenkins CD

- [ ] Jenkins has ARM64-compatible `kubectl`.
- [ ] Jenkins reaches `k3d-cicd-serverlb:6443`.
- [ ] Test namespace exists.
- [ ] ServiceAccount has only required permissions.
- [ ] Test token returns `yes` in test namespace and `no` in production.
- [ ] ResourceQuota and LimitRange exist.
- [ ] Token is stored as Jenkins Secret text.
- [ ] Token is not in Git, logs, or Jenkinsfile.
- [ ] Test deployment uses a harmless image.
- [ ] Rollout verification is present.

### After a Jenkins CD run

- [ ] Jenkins build succeeds.
- [ ] VynCICD shows build number and URL.
- [ ] VynCICD run status is success.
- [ ] Duration is recorded.
- [ ] Deployment is Available.
- [ ] Pod is `1/1 Running`.
- [ ] No unexpected restarts.
- [ ] Quota remains within limits.

---

## Repository Reference

| Path | Purpose |
|---|---|
| `src/app/(dashboard)/pipelines/page.tsx` | Native/Jenkinsfile pipeline UI |
| `src/app/(dashboard)/runs/page.tsx` | Run status, duration, Jenkins link |
| `src/app/(dashboard)/settings/page.tsx` | Platform and Jenkins settings |
| `src/app/api/pipelines/route.ts` | Pipeline creation and validation |
| `src/app/api/pipelines/[id]/trigger/route.ts` | Native/Jenkins dispatch |
| `src/app/api/runs/[id]/jenkins/route.ts` | Jenkins queue/build polling |
| `src/app/api/settings/test-jenkins/route.ts` | Jenkins connection test |
| `src/lib/jenkins.ts` | Jenkins REST client |
| `src/lib/settings-store.ts` | Typed settings and secret masking |
| `src/lib/data-store.ts` | JSON state models and persistence |
| `src/agent/runner.mjs` | Native execution |
| `ops/jenkins-cd/` | Kubernetes CD setup |

Runtime state lives in:

```text
data/repos.json
data/pipelines.json
data/runs.json
data/deployments.json
data/environments.json
data/incidents.json
data/oncall.json
data/settings.json
data/users.json
```

Treat `data/` as state, not source code. Back it up before repair.

Validation commands:

```bash
node --check src/agent/runner.mjs
npm run build
```

The production build is the authoritative compile/type validation. The existing Next.js middleware deprecation warning is non-fatal.

---

## Final Mental Model

```text
User
  |
  v
VynCICD dashboard
  |\
  | \-- Native mode --> VynCICD runner --> Docker/Kubernetes
  |
  \---- Jenkinsfile mode --> Jenkins --> kubectl/Kubernetes
                                  |
                                  \--> Registry and build tools
```

Operating principles:

1. Keep execution ownership clear: native or Jenkins, never both.
2. Keep host identities separate: `ubuntu`, `vyncicd`, `labcicd`, and `jenkins`.
3. Use least-privilege Kubernetes ServiceAccounts.
4. Use hard resource limits for test environments.
5. Build images for the actual node architecture.
6. Never expose secrets in source, logs, screenshots, or chat.
7. Build before restart and verify the live result after every change.
8. Test CD in a dedicated namespace before considering production.


---

## Part of the VynOps Suite

| Product | Purpose | Repo |
|---|---|---|
| **VynOps** | Kubernetes operations platform | [vynops/VynOps](https://github.com/vynops/VynOps) |
| **VynAI** | Ollama fleet manager and AI gateway | [vynops/VynAI](https://github.com/vynops/VynAI) |
| **VynCost** | Cloud cost visibility | [vynops/VynCost](https://github.com/vynops/VynCost) |
| **VynDB** | Database operations | [vynops/VynDB](https://github.com/vynops/VynDB) |
| **VynDC** | Data center management | [vynops/VynDC](https://github.com/vynops/VynDC) |
| **VynCICD** | CI/CD pipeline management | [vynops/VynCICD](https://github.com/vynops/VynCICD) |
| **VynHana** | SAP HANA Database management | [vynops/VynHana](https://github.com/vynops/VynHana) |
| **VynSAP** | SAP ERP management | [vynops/VynSAP](https://github.com/vynops/VynSAP) |

---

## License

MIT — see [LICENSE](LICENSE).

---
