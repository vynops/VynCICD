import { NextRequest, NextResponse } from 'next/server'
import { requireRole } from '@/lib/auth'
import { loadRepos, saveRepos, addRepo, purgeDemo } from '@/lib/data-store'
import { loadIncidents, saveIncidents } from '@/lib/oncall-store'
import { getSettings } from '@/lib/settings-store'
import type { GitProvider } from '@/lib/data-store'

function buildCloneUrl(provider: GitProvider, owner: string, name: string): string {
  const s = getSettings()
  switch (provider) {
    case 'github':    return `https://github.com/${owner}/${name}.git`
    case 'gitlab':    return `${(s.gitlabUrl || 'https://gitlab.com').replace(/\/$/, '')}/${owner}/${name}.git`
    case 'bitbucket': return `https://bitbucket.org/${owner}/${name}.git`
    case 'gitea':
    default:          return `${(s.giteaUrl || 'http://localhost:3300').replace(/\/$/, '')}/${owner}/${name}.git`
  }
}

export async function GET(req: NextRequest) {
  const auth = await requireRole(req, 'viewer')
  if (auth instanceof NextResponse) return auth
  return NextResponse.json(loadRepos())
}

export async function POST(req: NextRequest) {
  const auth = await requireRole(req, 'admin')
  if (auth instanceof NextResponse) return auth
  const { owner, name, provider = 'gitea' } = await req.json() as { owner?: string; name?: string; provider?: GitProvider }
  if (!owner || !name) return NextResponse.json({ error: 'owner and name required' }, { status: 400 })
  const cloneUrl = buildCloneUrl(provider, owner, name)
  const repo = addRepo({
    owner, name, fullName: `${owner}/${name}`, provider, cloneUrl,
    defaultBranch: 'main', private: true, language: 'Unknown',
    description: '', webhookActive: false,
  })

  // If demo data is still present, purge it now that a real repo has been connected
  const allRepos = loadRepos()
  const hasDemo = allRepos.some(r => r._demo)
  if (hasDemo) {
    purgeDemo()
    saveIncidents(loadIncidents().filter(i => !i._demo))
  }

  return NextResponse.json(repo, { status: 201 })
}
