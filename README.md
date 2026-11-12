<div align="center">

# VynCICD

### AI-Powered CI/CD Pipeline Platform

**Self-hosted · Open Source · Native, Jenkins, and Kubernetes Workflows**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/Node.js-20.9%2B-339933?logo=node.js&logoColor=white)](https://nodejs.org)
[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js&logoColor=white)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Live Demo](https://img.shields.io/badge/Live_Demo-cicd.vynops.online-10b981)](https://cicd.vynops.online)
[![Part of VynOps](https://img.shields.io/badge/Part_of-VynOps_Suite-6366f1)](https://vynops.com)

*Build. Scan. Deploy. Operate. Your pipelines, your infrastructure.*

[**Live Demo**](https://cicd.vynops.online) · [**Product Page**](https://vynops.com/product/vyncicd) · [**VynOps Suite**](https://vynops.com)

</div>

---

## Overview

VynCICD is a **self-hosted CI/CD control plane** for native pipelines, Jenkinsfile
execution, Kubernetes delivery, security scanning, notifications, AI triage, and
DORA metrics.

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

1. [Overview](#overview)
2. [Screenshots](#screenshots)
3. [Understand The System](#understand-the-system)
4. [Accounts And Permissions](#accounts-and-permissions)
5. [Architecture](#architecture)
6. [Server Reference](#server-reference)
7. [Install Locally](#install-locally)
8. [Configure Environment](#configure-environment)
9. [Run VynCICD](#run-vyncicd)
10. [Connect A Repository](#connect-a-repository)
11. [Native Pipelines](#native-pipelines)
12. [Jenkins CI](#jenkins-ci)
13. [Jenkins Kubernetes CD](#jenkins-kubernetes-cd)
14. [Argo CD GitOps Lab Setup](#argo-cd-gitops-lab-setup)
15. [Kubernetes And k3d](#kubernetes-and-k3d)
16. [Container Registry](#container-registry)
17. [Resource Limits](#resource-limits)
18. [Dashboard Workflows](#dashboard-workflows)
19. [Settings Guide](#settings-guide)
20. [Security And Secrets](#security-and-secrets)
21. [Troubleshooting](#troubleshooting)
22. [Checklists](#checklists)
23. [Repository Reference](#repository-reference)
24. [Final Mental Model](#final-mental-model)
25. [Part of the VynOps Suite](#part-of-the-vynops-suite)
26. [License](#license)

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

### First application login

A fresh installation creates `admin@vyncicd.local` with initial password `changeme`
on the first sign-in attempt. `VYNCICD_ADMIN_EMAIL` and `VYNCICD_ADMIN_PASSWORD`
can override these initial credentials. The initial administrator must choose a
different password of 8 to 128 characters before using the dashboard or protected
APIs. Keep a new installation local or access-restricted until this is complete.

Existing accounts keep their passwords. Legacy default administrators still using
`changeme` must also change it. Existing sessions require signing in again after
this update; completing the password change invalidates earlier sessions.
Runner requests must supply a nonempty configured `RUNNER_SECRET` (or
`VYNCICD_SECRET`); an arbitrary runner header cannot bypass the password-change gate.

Run the isolated first-login regression checks with `node --test tests/first-login.test.mjs`.
They use synthetic temporary storage and do not access application data or integrations.

Keep host, application, Jenkins, and Kubernetes identities separate.

### `<SSH_USER>`

Deployment operator account. It may use `sudo` for controlled host administration:

- Copy changed files to the server.
- Install files into `<APP_DIRECTORY>`.
- Run the VynCICD build as `vyncicd`.
- Restart and save PM2 as `vyncicd`.
- Inspect Docker and Kubernetes when required.

### `vyncicd`

Owns and runs VynCICD:

```text
<APP_DIRECTORY>
```

Run application commands as:

```bash
sudo -u vyncicd -H bash
cd <APP_DIRECTORY>
```

### `labcicd`

Owns the Jenkins test environment:

```text
<JENKINS_DIRECTORY>
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

Use your own installation values in place of these placeholders:

| Setting | Placeholder or example |
|---|---|
| SSH host | `<SSH_USER>@<SERVER_HOST>` |
| Application user | `<APP_USER>` |
| Application directory | `<APP_DIRECTORY>` |
| PM2 process name | `<PM2_PROCESS_NAME>` |
| Jenkins user | `<JENKINS_USER>` |
| Jenkins directory | `<JENKINS_DIRECTORY>` |
| Jenkins URL | `https://<JENKINS_HOST>` |
| VynCICD URL | `https://<VYNCICD_HOST>` |
| Local registry example | `http://localhost:5050` |
| Kubernetes context | `<KUBECONFIG_CONTEXT>` |

Connect from Windows PowerShell:

```powershell
ssh -i "<SSH_KEY_PATH>" <SSH_USER>@<SERVER_HOST>
```

Replace placeholders before running commands. Keep actual host addresses,
operator identities, private-key paths, passwords, and tokens out of this README.

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
cd <APP_DIRECTORY>
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
cd <APP_DIRECTORY>
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
Directory: <JENKINS_DIRECTORY>
Container: labcicd-jenkins
Web: http://<SERVER_HOST>:8080
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
   sudo cat <JENKINS_DIRECTORY>/home/secrets/initialAdminPassword
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
sudo cat <JENKINS_DIRECTORY>/k8s-cd-test-token
```

In Jenkins:

```text
Manage Jenkins -> Credentials -> System -> Global credentials -> Add Credentials
Kind: Secret text
ID: k8s-cd-test-token
Secret: complete token value
```

Do not put the token in Git, a Jenkinsfile, VynCICD settings, README, or chat.

### Jenkins Kubernetes Token Rotation And Namespace Security

The Jenkins CD ServiceAccount is intentionally restricted to the
`jenkins-cd-test` namespace. It must not be able to deploy to `production`.

Before adding or rotating the Jenkins credential, verify the permissions with a
live kubeconfig and token:

```bash
k3d kubeconfig get cicd > /tmp/cicd-live.yaml

TOKEN="$(cat /tmp/jenkins-cd-test-token-new)"
API_SERVER="$(kubectl --kubeconfig /tmp/cicd-live.yaml config view \
  --minify -o jsonpath='{.clusters[0].cluster.server}')"

kubectl \
  --server="$API_SERVER" \
  --token="$TOKEN" \
  --insecure-skip-tls-verify=true \
  auth can-i create deployments \
  -n jenkins-cd-test
```

Expected result:

```text
yes
```

Verify that the same token cannot deploy to production:

```bash
kubectl \
  --server="$API_SERVER" \
  --token="$TOKEN" \
  --insecure-skip-tls-verify=true \
  auth can-i create deployments \
  -n production
```

Expected result:

```text
no
```

A direct API check should also return `HTTP 200` for deployments in
`jenkins-cd-test` and `HTTP 403` for deployments in `production`.

#### Generate A Replacement Token

ServiceAccount tokens created with `kubectl create token` are time-limited.
Generate a replacement before the current token expires:

```bash
kubectl --kubeconfig /tmp/cicd-live.yaml \
  -n jenkins-cd-test \
  create token jenkins-deployer \
  --duration=8760h \
  > /tmp/jenkins-cd-test-token-new
```

The `8760h` duration is approximately one year. It is not permanent and should
be rotated periodically.

#### Update Jenkins After Rotation

Updating the token file on the Linux server does not update the Secret Text
credential already stored inside Jenkins.

After generating and verifying a replacement token:

1. Open Jenkins.
2. Go to **Manage Jenkins -> Credentials -> System -> Global credentials**.
3. Open the credential with ID `k8s-cd-test-token`.
4. Replace its Secret Text value with the complete new token.
5. Save the credential.
6. Run the Jenkins Kubernetes CD test again.

After verification, remove temporary credential files:

```bash
rm -f /tmp/jenkins-cd-test-token-new
rm -f /tmp/cicd-live.yaml
rm -f /tmp/production-response
rm -f /tmp/test-response
```

#### Reapply RBAC After Cluster Recreation

If the `k3d-cicd` cluster is deleted and recreated, its namespace,
ServiceAccount, Role, and RoleBinding may need to be recreated:

```bash
k3d kubeconfig get cicd > /tmp/cicd-live.yaml

kubectl --kubeconfig /tmp/cicd-live.yaml \
  apply -f <JENKINS_DIRECTORY>/rbac.yaml
```

Reapply namespace resource limits when required:

```bash
kubectl --kubeconfig /tmp/cicd-live.yaml \
  apply -f /root/jenkins-cd-test-resources.yaml
```

Then verify:

```bash
kubectl --kubeconfig /tmp/cicd-live.yaml \
  get namespace jenkins-cd-test
kubectl --kubeconfig /tmp/cicd-live.yaml \
  get role,rolebinding -n jenkins-cd-test
kubectl --kubeconfig /tmp/cicd-live.yaml \
  get resourcequota,limitrange -n jenkins-cd-test
```

Never commit or publish these files:

```text
<JENKINS_DIRECTORY>/home/
<JENKINS_DIRECTORY>/k8s-cd-test-token
/tmp/jenkins-cd-test-token-new
```

Never place a token in a Jenkinsfile, Git repository, VynCICD settings, shell
history, build log, README, or chat message.

The `jenkins-cd-test` namespace is also protected by Kubernetes `ResourceQuota`
and `LimitRange` objects. These limit aggregate CPU, memory, pod, service, and
storage usage. Jenkins does not have permission to modify those limits.

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

## Argo CD GitOps Lab Setup

VynCICD also supports Argo CD as a separate CD execution owner. Argo CD
reconciles Kubernetes state from Git; VynCICD triggers synchronization and
polls the application until it is `Synced` and `Healthy`.

```text
VynCICD -> Argo CD API -> GitOps repository -> Kubernetes
```

This lab setup intentionally uses only the existing services:

```text
Kubernetes cluster: k3d-cicd
Argo namespace:     argocd
Test namespace:     jenkins-cd-test
Git service:        existing Gitea
GitOps repository:  labadmin/argocd-gitops
Test application:   argocd-nginx-test
```

### Argo CD resource caps

Argo CD runs in its own namespace with hard resource limits. The current lab
caps are:

| Component | CPU limit | Memory limit |
|---|---:|---:|
| Application controller | `500m` | `512Mi` |
| Repo server | `250m` | `256Mi` |
| Argo server | `150m` | `128Mi` |
| Applicationset controller | `100m` | `128Mi` |
| Dex server | `100m` | `128Mi` |
| Redis | `50m` | `64Mi` |
| Notifications controller | `50m` | `64Mi` |

The `argocd` namespace quota is:

```text
CPU requests:     500m
CPU limits:       1.5 CPU
Memory requests:  1Gi
Memory limits:    2Gi
Pods:             12
Services:         10
ConfigMaps:       20
Secrets:          20
```

Check usage:

```bash
kubectl --context k3d-cicd -n argocd get pods
kubectl --context k3d-cicd -n argocd describe resourcequota argocd-quota
```

Do not increase these limits casually. The server is shared with Jenkins,
databases, the registry, Gitea, and both k3d clusters.

### Access Argo CD in this lab

Argo CD is intentionally a private `ClusterIP` service. The server-side
port-forward is not public and must be running for VynCICD to reach Argo CD:

```bash
nohup kubectl --context k3d-cicd \
  -n argocd \
  port-forward \
  --address 127.0.0.1 \
  svc/argocd-server \
  8081:443 \
  > /tmp/argocd-port-forward.log 2>&1 &
```

This must be started again after a server reboot. Verify it:

```bash
pgrep -af "kubectl.*port-forward.*argocd-server"
curl -skI https://127.0.0.1:8081
curl -sk https://127.0.0.1:8081/api/version
```

Expected Argo version response:

```json
{"Version":"v3.5.1"}
```

Occasional `broken pipe` messages in the port-forward log usually mean a
browser or API client closed a connection. They are harmless if the process is
still running and the `curl` checks succeed.

For browser access from Windows, tunnel the server port-forward over SSH:

```powershell
ssh -i "<SSH_KEY_PATH>" `
  -L 8081:127.0.0.1:8081 `
  <SSH_USER>@<SERVER_HOST>
```

Open `https://127.0.0.1:8081` and accept the self-signed lab certificate.

### Create an Argo CD API token

The initial Argo admin password is not an API token. If the CLI is not
installed, install the ARM64 CLI on the ARM64 server:

```bash
ARCH=$(uname -m)
[ "$ARCH" = "aarch64" ] && CLI_ARCH=arm64 || CLI_ARCH=amd64
curl -fL "https://github.com/argoproj/argo-cd/releases/latest/download/argocd-linux-${CLI_ARCH}" -o /tmp/argocd
chmod +x /tmp/argocd
sudo mv /tmp/argocd /usr/local/bin/argocd
argocd version --client
```

Log in through the server-side port-forward:

```bash
argocd login 127.0.0.1:8081 \
  --username admin \
  --password '<initial-admin-password>' \
  --insecure
```

If token generation reports that the admin account does not have API-key
capability, enable it as an administrator:

```bash
kubectl --context k3d-cicd -n argocd patch configmap argocd-cm \
  --type merge \
  -p '{"data":{"accounts.admin":"apiKey, login"}}'
kubectl --context k3d-cicd -n argocd rollout restart deployment/argocd-server
kubectl --context k3d-cicd -n argocd rollout status deployment/argocd-server
```

Log in again and generate a token:

```bash
argocd login 127.0.0.1:8081 --username admin \
  --password '<initial-admin-password>' --insecure
argocd account generate-token
```

Use the generated token in VynCICD, not the password. A dedicated restricted
Argo account is preferable beyond this lab.

### VynCICD Argo CD settings

Open **Settings -> Pipeline -> Argo CD** and enter:

```text
Argo CD URL:   https://127.0.0.1:8081
Argo CD token: <generated Argo CD API token>
```

Click **Test connection**. A successful response looks like:

```text
Connected to Argo CD · v3.5.1
```

The token is stored masked as `***configured***`. VynCICD accepts the lab’s
self-signed Argo certificate. The URL is admin-configurable, but ordinary
viewers must not change it.

### Gitea GitOps repository

Argo CD runs inside Kubernetes, so the Docker name `gitea` is not resolvable by
Kubernetes DNS. Connect Gitea to the k3d network if needed:

```bash
sudo docker network connect k3d-cicd gitea
sudo docker inspect gitea --format '{{json .NetworkSettings.Networks}}'
```

Use the Gitea IP on the `k3d-cicd` network in Argo CD, not `http://gitea:3000`.
The tested GitOps repository is:

```text
http://<HOST_IP>:3000/labadmin/argocd-gitops.git
```

The IP can change if the container is recreated; recheck the Docker network IP
before repair. For a private repository, add Gitea credentials to Argo CD.

The repository must contain:

```text
apps/jenkins-cd-test/deployment.yaml
```

### Argo CD Project and Application

The restricted project is:

```text
Project: vyncicd-test
```

It should allow only the GitOps repository, the in-cluster destination, and
the `jenkins-cd-test` namespace. Do not add `production`.

The tested Application is:

```text
Application: argocd-nginx-test
Project:     vyncicd-test
Revision:    main
Path:        apps/jenkins-cd-test
Namespace:   jenkins-cd-test
```

Expected healthy state:

```text
Sync:   Synced
Health: Healthy
```

If Argo says `app path does not exist`, verify the Git repository and revision:

```bash
git clone http://127.0.0.1:3300/labadmin/argocd-gitops.git /tmp/argocd-gitops
cd /tmp/argocd-gitops
git ls-tree -r --name-only origin/main
```

The output must include:

```text
apps/jenkins-cd-test/deployment.yaml
```

### Test VynCICD Argo CD execution

1. Ensure the server port-forward is running.
2. Confirm **Test connection** reports `Connected to Argo CD`.
3. Open **Pipelines -> New Pipeline**.
4. Select **Argo CD GitOps deployment**.
5. Enter application `argocd-nginx-test`.
6. Enter project `vyncicd-test`.
7. Create the pipeline and click Play.
8. Open **Runs**.

Expected lifecycle:

```text
VynCICD run: pending
Argo sync:  running
Argo sync:  Synced
Argo health: Healthy
VynCICD run: success
```

The Runs page polls active Argo and Jenkins integrations automatically. It no
longer requires expanding a run first. A run stores the Argo application,
sync status, health status, URL, duration, and final result.

Verify Kubernetes:

```bash
kubectl --context k3d-cicd -n jenkins-cd-test \
  get deployment argocd-nginx-test
kubectl --context k3d-cicd -n jenkins-cd-test get pods
```

Expected:

```text
argocd-nginx-test   1/1   Running
```

### Argo CD troubleshooting

| Symptom | Cause | Fix |
|---|---|---|
| VynCICD test returns 404 | Wrong version endpoint or missing route | Use `/api/version`; confirm `/api/settings/test-argocd` is in the build |
| VynCICD test says Network error | Port-forward stopped or TLS rejected | Start `nohup` port-forward; use the self-signed-safe client; test `curl -sk` |
| Argo UI shows broken pipe | Client closed a port-forward connection | Usually harmless if the forward remains alive |
| `gitea` DNS not found | Docker name is not Kubernetes DNS | Use Gitea’s IP on `k3d-cicd` or create a stable Service/Endpoints bridge |
| App path does not exist | Wrong Git path/revision | Ensure `apps/jenkins-cd-test` exists on `main` |
| Application OutOfSync | Git desired state differs from cluster | Click Sync and inspect the diff |
| Application Degraded | Workload is unhealthy | Inspect Application events and `kubectl describe pod` |
| Run remains pending | Old trigger route or stale run | Inspect `data/runs.json`; trigger a new run after deployment |
| Run remains running | Polling not reached or Argo API unavailable | Refresh Runs; check `argoCdSyncStatus`, `argoCdHealthStatus`, and port-forward |
| Argo HTTP 401/403 | Invalid token or insufficient Argo permission | Generate a fresh token; verify Argo project/application permissions |
| Quota exceeded | `argocd` or test namespace cap reached | `kubectl describe resourcequota` before increasing any limit |

Inspect a VynCICD Argo run without exposing secrets:

```bash
python3 - <<'PY'
import json
runs = json.load(open('<APP_DIRECTORY>/data/runs.json'))
for run in runs[:20]:
    if run.get('executionMode') == 'argocd':
        print({k: run.get(k) for k in (
            'id', 'status', 'argoCdApplication', 'argoCdSyncStatus',
            'argoCdHealthStatus', 'argoCdUrl', 'startedAt', 'finishedAt',
            'durationMs', 'error')})
PY
```

Check port-forward and Argo from the VynCICD host:

```bash
pgrep -af 'kubectl.*port-forward.*argocd-server'
curl -sk https://127.0.0.1:8081/api/version
```

Do not delete Argo applications or raise quotas as a first troubleshooting
step. Diagnose the status and logs first.

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

## Dashboard Workflows

- Overview cards open the corresponding records. Run totals use the last 24 hours
  of retained history; success rates use completed successful/failed runs, not
  pending or cancelled runs. Recent runs, deployments and incidents link to their
  individual details. Missing requests show an error, not a clean zero.
- Analytics cards link to their source records; failing-pipeline links preserve
  pipeline IDs even when names match. Daily activity links use UTC dates.
  Deployment frequency counts tracked deployment records. Build duration is only
  a lead-time proxy, and failed completed runs are only a change-failure proxy;
  these are not commit-to-production lead time or production change-failure rate.
  No duration/rate samples are shown as missing data, not elite performance.
- Repository cards link to their pipelines; environment cards link to deployments
  for that environment. Repository registration alone does not validate provider
  access. Failed or disabled pipeline triggers do not report a successful run.
- Deployment details link to the exact affected run. Rollback is **not implemented**:
  the UI marks it unavailable and its API returns HTTP 501 without changing history.
- Incident summary cards filter their records. `status=open` includes acknowledged
  incidents, `status=resolved` selects resolved incidents, `from` filters creation
  time inclusively, and `incidentId` focuses a specific incident.
- On-call shift editing preserves the chosen timezone and rejects invalid local
  times. Routing/shift mutations report failures; referenced escalation policies
  cannot be deleted while routing rules still use them.
- AI Copilot links to provider settings and token usage. Request failures remain
  visibly failed, successful replies refresh usage, and the 7-day total sums only
  the last seven daily records. Browser-history storage failures are explicit.
- Lists and metrics reflect retained history, not an unlimited audit archive.
  Integration availability still depends on the configured self-hosted services;
  synthetic UI/API tests do not establish that those services are reachable.

## Settings Guide

Open **Settings**. Save settings before testing saved values.
Unsaved edits disable non-AI connection/notification tests so that these tests
cannot accidentally validate an older configuration. AI connection tests use the
current draft and can run before saving. Failed saves remain visibly failed and
preserve the draft; non-admin users have read-only controls. Configured credentials
remain masked in settings responses and are retained when their placeholders are
unchanged. Numeric settings enforce the same limits as the controls.

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
- Native scan stages publish structured results to the security dashboard. External
  execution engines must publish compatible results to `POST /api/security`.
- The existing blocking setting gates critical/high vulnerabilities and detected
  secrets. Allowed-failure stages do not count as blocked builds.
- Summary cards filter findings; each scan links to its affected run. Run details
  link back to that run's findings, and editors/admins can explicitly start the full
  pipeline again after confirming that it may include deployment stages.
- Totals default to the latest result per pipeline, stage and scan type, so a clean
  rerun replaces earlier findings. Enable **Include previous scans** for history.
  **Builds Blocked** counts unique run IDs.
- Unscanned, skipped and failed scans are not presented as clean. Secret records
  retain only rule/file/line metadata, never matched secret values or code snippets.
- Native stage retries replace the same run/stage/type result instead of duplicating
  it. Results refresh automatically every 30 seconds or via **Refresh results**.

### Notifications

Channels can be independently enabled or disabled:

- Slack.
- Microsoft Teams.
- Custom webhook.
- SMTP email.

### AI Copilot

Supported providers include Groq, OpenAI, Anthropic, Google, and custom
OpenAI-compatible endpoints.

**Models and credentials:**

- **Model** accepts a manually entered model ID for any provider. Replace retired
  models without a code update.
- API keys are masked as `***configured***`.
- Groq connection retests and Copilot prefer the key saved through AI Copilot
  settings. The legacy Groq key is a fallback only.
- Browser password-manager prompts are separate from application saves.
  Dismissing a prompt does not discard the saved API key.

**Test and save:**

- **Test AI provider** tests the entered settings before saving.
- **Save Changes** remains available without a successful test.
- A running test shows **Testing...**, followed by its result.
- Editing settings clears previous results and discards results from tests
  started before the edit.
- Other integration tests require saved settings and show a reminder while
  changes are unsaved.

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
test -s <JENKINS_DIRECTORY>/k8s-cd-test-token && echo token-present
python3 - <<'PY'
import json
p='<APP_DIRECTORY>/data/settings.json'
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
cd <APP_DIRECTORY>
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
runs=json.load(open('<APP_DIRECTORY>/data/runs.json'))
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
2. Keep host identities separate: `<SSH_USER>`, `vyncicd`, `labcicd`, and `jenkins`.
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

MIT — see [LICENSE](LICENSE)

---
