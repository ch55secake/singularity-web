import type { LaneStats, MatchDetail, MatchSession, MatchSummary, PlayerAverage } from './types'

async function get<T>(path: string, notFoundMessage = 'This match isn’t on the server. Check the link, or it may not have been processed yet.'): Promise<T> {
  const res = await fetch(path, { headers: { Accept: 'application/json' } })
  if (res.status === 404) throw new Error(notFoundMessage)
  if (!res.ok) throw new Error(`The server answered ${res.status}. Try again in a minute.`)
  return res.json() as Promise<T>
}

export const listMatches = () => get<MatchSummary[]>('/api/matches')
export const listSessions = () => get<MatchSession[]>('/api/sessions')
export const getMatch = (uuid: string) => get<MatchDetail>(`/api/matches/${encodeURIComponent(uuid)}`)
export const getLaneStats = (uuid: string) => get<LaneStats>(
  `/api/matches/${encodeURIComponent(uuid)}/lane-stats`,
  'Lane stats aren’t available for this match yet.',
)
export const getPlayer = (name: string) => get<PlayerAverage>(`/api/players/by-name/${encodeURIComponent(name)}`)
