#!/usr/bin/env node
/**
 * VynCICD Lab Seed Script
 * Adds the 3 Gitea lab repos + pipeline definitions to VynCICD's data/ directory
 * 
 * Usage: node seed-lab.mjs [--data-dir /path/to/data]
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'

const DATA_DIR = process.argv.includes('--data-dir')
  ? process.argv[process.argv.indexOf('--data-dir') + 1]
  : path.join(process.cwd(), 'data')

mkdirSync(DATA_DIR, { recursive: true })

function load(file, def) {
  const f = path.join(DATA_DIR, file)
  if (!existsSync(f)) return def
  try { return JSON.parse(readFileSync(f, 'utf8')) } catch { return def }
}
function save(file, data) {
  writeFileSync(path.join(DATA_DIR, file), JSON.stringify(data, null, 2), 'utf8')
}

const now = new Date().toISOString()

// ── Seed Repositories ──────────────────────────────────────────────────────────
const repos = load('repos.json', [])

const labRepos = [
  {
    id: 'lab-repo-api',
    owner: 'labadmin',
    name: 'api-service',
    fullName: 'labadmin/api-service',
    provider: 'github',
    defaultBranch: 'main',
    private: false,
    language: 'Go',
    description: 'Demo REST API service for VynCICD lab',
    connectedAt: now,
    webhookActive: true,
  },
  {
    id: 'lab-repo-web',
    owner: 'labadmin',
    name: 'web-frontend',
    fullName: 'labadmin/web-frontend',
    provider: 'github',
    defaultBranch: 'main',
    private: false,
    language: 'TypeScript',
    description: 'Demo React frontend for VynCICD lab',
    connectedAt: now,
    webhookActive: true,
  },
  {
    id: 'lab-repo-ml',
    owner: 'labadmin',
    name: 'ml-pipeline',
    fullName: 'labadmin/ml-pipeline',
    provider: 'github',
    defaultBranch: 'main',
    private: false,
    language: 'Python',
    description: 'Demo ML training pipeline for VynCICD lab',
    connectedAt: now,
    webhookActive: true,
  },
]

for (const lr of labRepos) {
  const idx = repos.findIndex(r => r.id === lr.id)
  if (idx !== -1) {
    repos[idx] = lr
  } else {
    repos.push(lr)
  }
}
save('repos.json', repos)
console.log('✓ repos.json seeded with 3 lab repos')

// ── Seed Pipelines ─────────────────────────────────────────────────────────────
const pipelines = load('pipelines.json', [])

const K8S_REGISTRY = 'cicd-registry:5000'

const labPipelines = [
  {
    id: 'lab-pipe-api',
    name: 'api-service CI',
    repoId: 'lab-repo-api',
    repoFullName: 'labadmin/api-service',
    branch: 'main',
    triggerOn: ['push'],
    stages: [
      {
        name: 'lint',
        type: 'run',
        run: 'echo "[lint] go vet..." && docker run --rm -v "$(pwd)":/app -w /app golang:1.22-alpine go vet ./...',
      },
      {
        name: 'test',
        type: 'test',
        run: 'echo "[test] go test..." && docker run --rm -v "$(pwd)":/app -w /app golang:1.22-alpine go test ./...',
      },
      {
        name: 'build',
        type: 'build',
        run: 'echo "[build] building ${IMAGE}" && docker build -t "${IMAGE}" . && docker push "${IMAGE}" && echo "[build] pushed ${IMAGE}"',
      },
      {
        name: 'scan',
        type: 'scan',
        image: '${IMAGE}',
      },
      {
        name: 'deploy-dev',
        type: 'deploy',
        environment: 'dev',
        manifest: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-service
  labels:
    app: api-service
    version: "\${COMMIT}"
spec:
  replicas: 1
  selector:
    matchLabels:
      app: api-service
  template:
    metadata:
      labels:
        app: api-service
        version: "\${COMMIT}"
    spec:
      containers:
      - name: api-service
        image: ${K8S_REGISTRY}/labadmin/api-service:\${COMMIT}
        ports:
        - containerPort: 8080
        env:
        - name: VERSION
          value: "\${COMMIT}"
        - name: PORT
          value: "8080"
---
apiVersion: v1
kind: Service
metadata:
  name: api-service
spec:
  selector:
    app: api-service
  ports:
  - port: 80
    targetPort: 8080
`,
      },
    ],
    environments: ['dev'],
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'lab-pipe-web',
    name: 'web-frontend CI',
    repoId: 'lab-repo-web',
    repoFullName: 'labadmin/web-frontend',
    branch: 'main',
    triggerOn: ['push'],
    stages: [
      {
        name: 'build',
        type: 'build',
        run: 'echo "[build] building ${IMAGE}" && docker build -t "${IMAGE}" . && docker push "${IMAGE}" && echo "[build] pushed ${IMAGE}"',
      },
      {
        name: 'scan',
        type: 'scan',
        image: '${IMAGE}',
      },
      {
        name: 'deploy-dev',
        type: 'deploy',
        environment: 'dev',
        manifest: `apiVersion: apps/v1
kind: Deployment
metadata:
  name: web-frontend
  labels:
    app: web-frontend
spec:
  replicas: 1
  selector:
    matchLabels:
      app: web-frontend
  template:
    metadata:
      labels:
        app: web-frontend
        version: "\${COMMIT}"
    spec:
      containers:
      - name: web-frontend
        image: ${K8S_REGISTRY}/labadmin/web-frontend:\${COMMIT}
        ports:
        - containerPort: 80
---
apiVersion: v1
kind: Service
metadata:
  name: web-frontend
spec:
  selector:
    app: web-frontend
  ports:
  - port: 80
    targetPort: 80
`,
      },
    ],
    environments: ['dev'],
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: 'lab-pipe-ml',
    name: 'ml-pipeline CI',
    repoId: 'lab-repo-ml',
    repoFullName: 'labadmin/ml-pipeline',
    branch: 'main',
    triggerOn: ['push'],
    stages: [
      {
        name: 'build',
        type: 'build',
        run: 'echo "[build] building ${IMAGE}" && docker build -t "${IMAGE}" . && docker push "${IMAGE}" && echo "[build] pushed ${IMAGE}"',
      },
      {
        name: 'scan',
        type: 'scan',
        image: '${IMAGE}',
      },
      {
        name: 'train',
        type: 'run',
        run: 'echo "[train] running training job in Docker" && docker run --rm -e MIN_ACCURACY=0.80 "${IMAGE}"',
      },
      {
        name: 'deploy-dev',
        type: 'deploy',
        environment: 'dev',
        manifest: `apiVersion: batch/v1
kind: Job
metadata:
  name: ml-train-\${COMMIT}
  labels:
    app: ml-pipeline
    version: "\${COMMIT}"
spec:
  ttlSecondsAfterFinished: 3600
  template:
    metadata:
      labels:
        app: ml-pipeline
    spec:
      containers:
      - name: ml-trainer
        image: ${K8S_REGISTRY}/labadmin/ml-pipeline:\${COMMIT}
        env:
        - name: MIN_ACCURACY
          value: "0.80"
      restartPolicy: Never
`,
      },
    ],
    environments: ['dev'],
    enabled: true,
    createdAt: now,
    updatedAt: now,
  },
]

for (const lp of labPipelines) {
  const idx = pipelines.findIndex(p => p.id === lp.id)
  if (idx !== -1) {
    pipelines[idx] = lp  // always overwrite with latest stage definitions
  } else {
    pipelines.push(lp)
  }
}
save('pipelines.json', pipelines)
console.log('✓ pipelines.json seeded with 3 lab pipelines')

// ── Seed Environments ──────────────────────────────────────────────────────────
const environments = load('environments.json', [])

const labEnvs = [
  {
    id: 'lab-env-dev',
    name: 'dev',
    type: 'development',
    url: 'http://dev.cicd.internal',
    k8sNamespace: 'dev',
    protected: false,
    requiresApproval: false,
    approvers: [],
    variables: { REGISTRY: 'localhost:5050', CLUSTER: 'k3d-cicd' },
    createdAt: now,
  },
  {
    id: 'lab-env-staging',
    name: 'staging',
    type: 'staging',
    url: 'http://staging.cicd.internal',
    k8sNamespace: 'staging',
    protected: false,
    requiresApproval: false,
    approvers: [],
    variables: { REGISTRY: 'localhost:5050', CLUSTER: 'k3d-cicd' },
    createdAt: now,
  },
  {
    id: 'lab-env-prod',
    name: 'production',
    type: 'production',
    url: 'https://cicd.vynops.online',
    k8sNamespace: 'production',
    protected: true,
    requiresApproval: true,
    approvers: ['admin@vyncicd.local'],
    variables: { REGISTRY: 'localhost:5050', CLUSTER: 'k3d-cicd' },
    createdAt: now,
  },
]

for (const le of labEnvs) {
  if (!environments.find(e => e.id === le.id)) environments.push(le)
}
save('environments.json', environments)
console.log('✓ environments.json seeded with dev/staging/production')

console.log('\nSeed complete! Data directory:', DATA_DIR)
