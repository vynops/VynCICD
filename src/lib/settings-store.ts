import fs from 'fs'
import path from 'path'

export interface AppSettings {
  // Git providers
  githubToken: string
  githubAppId: string
  githubAppPrivateKey: string
  githubWebhookSecret: string
  gitlabToken: string
  gitlabUrl: string
  gitlabWebhookSecret: string
  bitbucketUsername: string
  bitbucketAppPassword: string
  bitbucketWebhookSecret: string
  // Gitea (lab / self-hosted)
  giteaUrl: string
  giteaToken: string
  giteaWebhookSecret: string
  // Kubernetes
  k8sApiUrl: string
  k8sToken: string
  k8sNamespace: string
  k8sKubeconfig: string
  // Container registries
  registryUrl: string
  registryUsername: string
  registryPassword: string
  // Security scanning
  trivyEnabled: boolean
  secretScanEnabled: boolean
  sbomEnabled: boolean
  blockOnCriticalCves: boolean
  // Pipeline defaults
  defaultRetryCount: number
  defaultTimeoutMinutes: number
  buildConcurrency: number
  // Notification thresholds
  notifyOnFailure: boolean
  notifyOnSuccess: boolean
  notifyOnSlowBuild: boolean
  slowBuildThresholdMinutes: number
  // Alerting delivery
  alertSlackEnabled: boolean
  alertTeamEnabled: boolean
  alertWebhookEnabled: boolean
  slackWebhookUrl: string
  teamsWebhookUrl: string
  customWebhookUrl: string
  alertEmailEnabled: boolean
  alertRecipients: string
  smtpHost: string
  smtpPort: number
  smtpUser: string
  smtpPassword: string
  smtpFrom: string
  // AI Copilot
  aiProvider: 'groq' | 'openai' | 'anthropic' | 'google' | 'custom'
  aiApiKey: string
  aiBaseUrl: string
  groqApiKey: string
  aiModel: string
  // Jenkins integration
  jenkinsUrl: string
  jenkinsUsername: string
  jenkinsApiToken: string
  // DORA / analytics
  deploymentFrequencyTarget: number   // deploys/week
  leadTimeTargetHours: number
  mttrTargetMinutes: number
  changeFailureRateTarget: number     // percent
  // General
  defaultRefreshInterval: number
  timezone: string
  productionBranch: string
}

const DEFAULTS: AppSettings = {
  githubToken: process.env.GITHUB_TOKEN ?? '',
  githubAppId: '',
  githubAppPrivateKey: '',
  githubWebhookSecret: process.env.GITHUB_WEBHOOK_SECRET ?? '',
  gitlabToken: process.env.GITLAB_TOKEN ?? '',
  gitlabUrl: process.env.GITLAB_URL ?? '',
  gitlabWebhookSecret: process.env.GITLAB_WEBHOOK_SECRET ?? '',
  bitbucketAppPassword: process.env.BITBUCKET_APP_PASSWORD ?? '',
  bitbucketUsername: process.env.BITBUCKET_USERNAME ?? '',
  bitbucketWebhookSecret: process.env.BITBUCKET_WEBHOOK_SECRET ?? '',
  giteaUrl: process.env.GITEA_URL ?? '',
  giteaToken: process.env.GITEA_TOKEN ?? '',
  giteaWebhookSecret: process.env.GITEA_WEBHOOK_SECRET ?? '',
  k8sApiUrl: process.env.K8S_API_URL ?? '',
  k8sToken: '',
  k8sNamespace: 'default',
  k8sKubeconfig: process.env.K8S_KUBECONFIG ?? '',
  registryUrl: process.env.REGISTRY_URL ?? '',
  registryUsername: '',
  registryPassword: '',
  trivyEnabled: true,
  secretScanEnabled: true,
  sbomEnabled: true,
  blockOnCriticalCves: true,
  defaultRetryCount: 2,
  defaultTimeoutMinutes: 30,
  buildConcurrency: 4,
  notifyOnFailure: true,
  notifyOnSuccess: false,
  notifyOnSlowBuild: true,
  slowBuildThresholdMinutes: 20,
  alertSlackEnabled: true,
  alertTeamEnabled: false,
  alertWebhookEnabled: false,
  slackWebhookUrl: process.env.SLACK_WEBHOOK_URL ?? '',
  teamsWebhookUrl: process.env.TEAMS_WEBHOOK_URL ?? '',
  customWebhookUrl: process.env.CUSTOM_WEBHOOK_URL ?? '',
  alertEmailEnabled: false,
  alertRecipients: '',
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPassword: process.env.SMTP_PASSWORD ?? '',
  smtpFrom: process.env.SMTP_FROM ?? '',
  aiProvider: 'groq',
  aiApiKey: process.env.GROQ_API_KEY ?? '',
  aiBaseUrl: '',
  groqApiKey: process.env.GROQ_API_KEY ?? '',
  aiModel: 'llama-3.3-70b-versatile',
  jenkinsUrl: process.env.JENKINS_URL ?? '',
  jenkinsUsername: process.env.JENKINS_USERNAME ?? '',
  jenkinsApiToken: process.env.JENKINS_API_TOKEN ?? '',
  deploymentFrequencyTarget: 5,
  leadTimeTargetHours: 24,
  mttrTargetMinutes: 60,
  changeFailureRateTarget: 5,
  defaultRefreshInterval: 30,
  timezone: 'UTC',
  productionBranch: 'main',
}

const DATA_DIR = path.join(process.cwd(), 'data')
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json')

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

/** Fields whose DEFAULTS are seeded from env vars.
 *  If a saved value is an empty string, the env default wins —
 *  prevents an old settings.json (with '' for these keys) from shadowing the env. */
const ENV_SEEDED: ReadonlyArray<keyof AppSettings> = [
  'githubToken', 'githubWebhookSecret',
  'gitlabToken', 'gitlabUrl', 'gitlabWebhookSecret',
  'bitbucketAppPassword', 'bitbucketUsername', 'bitbucketWebhookSecret',
  'giteaUrl', 'giteaToken', 'giteaWebhookSecret',
  'k8sApiUrl', 'k8sKubeconfig',
  'registryUrl',
  'slackWebhookUrl', 'teamsWebhookUrl', 'customWebhookUrl',
  'smtpHost', 'smtpUser', 'smtpPassword', 'smtpFrom',
  'groqApiKey', 'aiApiKey',
]

export function getSettings(): AppSettings {
  ensureDir()
  if (!fs.existsSync(SETTINGS_FILE)) return { ...DEFAULTS }
  try {
    const raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) as Partial<AppSettings>
    const merged: AppSettings = { ...DEFAULTS, ...raw }
    // For env-seeded fields: if saved value is empty, fall back to env default
    for (const key of ENV_SEEDED) {
      if (!merged[key] && DEFAULTS[key]) (merged as unknown as Record<string, unknown>)[key] = DEFAULTS[key]
    }
    return merged
  } catch { return { ...DEFAULTS } }
}

export function saveSettings(partial: Partial<AppSettings>): AppSettings {
  const current = getSettings()
  const updated: AppSettings = { ...current, ...partial }
  ensureDir()
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(updated, null, 2), 'utf8')
  return updated
}
