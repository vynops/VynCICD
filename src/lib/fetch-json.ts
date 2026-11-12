export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    const body: unknown = response.headers.get('content-type')?.includes('application/json')
      ? await response.json() : null
    const message = body !== null && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
      ? body.error : `Request failed (${response.status}).`
    throw new Error(message)
  }
  return response.json()
}

export async function fetchList<T>(url: string): Promise<T[]> {
  const data = await fetchJson<T[]>(url)
  if (!Array.isArray(data)) throw new Error('Expected a list response.')
  return data
}
