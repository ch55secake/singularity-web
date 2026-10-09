import type { MatchDetail, MatchSummary } from './types'

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path, { headers: { Accept: 'application/json' } })
  if (res.status === 404) throw new Error('This match isn’t on the server. Check the link, or it may not have been processed yet.')
  if (!res.ok) throw new Error(`The server answered ${res.status}. Try again in a minute.`)
  return res.json() as Promise<T>
}

export const listMatches = () => get<MatchSummary[]>('/api/matches')
export const getMatch = (uuid: string) => get<MatchDetail>(`/api/matches/${encodeURIComponent(uuid)}`)
