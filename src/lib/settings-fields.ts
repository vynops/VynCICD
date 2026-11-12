import type { AppSettings } from './settings-store'

export const CONFIGURED_MASK = '***configured***'
export const SECRET_SETTING_FIELDS = [
  'githubToken', 'githubAppPrivateKey', 'githubWebhookSecret',
  'gitlabToken', 'gitlabWebhookSecret', 'bitbucketAppPassword', 'bitbucketWebhookSecret',
  'giteaToken', 'giteaWebhookSecret', 'k8sToken', 'registryPassword',
  'slackWebhookUrl', 'teamsWebhookUrl', 'customWebhookUrl', 'smtpPassword',
  'aiApiKey', 'groqApiKey', 'jenkinsApiToken', 'argoCdToken',
] as const satisfies readonly (keyof AppSettings)[]

export function maskSettings(settings: AppSettings): AppSettings {
  const masked = { ...settings }
  for (const key of SECRET_SETTING_FIELDS) masked[key] = masked[key] ? CONFIGURED_MASK : ''
  return masked
}
