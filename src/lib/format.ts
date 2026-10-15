import type { Team } from './types'

export const TEAMS: Record<Team, { name: string; short: string }> = {
  0: { name: 'Archmother', short: 'Archmother' },
  1: { name: 'Hidden King', short: 'Hidden King' },
}

export const fmt = (n: number) => n.toLocaleString('en-GB')

export const compact = (n: number) =>
  n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}k` : String(n)

export const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`

export const pct = (part: number, whole: number) => (whole > 0 ? (100 * part) / whole : 0)

export const ratio = (n: number, d: number) => (n / Math.max(d, 1)).toFixed(2)

export function when(unix: number) {
  const d = new Date(unix * 1000)
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) +
    ', ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

export function ago(unix: number) {
  const s = Date.now() / 1000 - unix
  if (s < 3600) return `${Math.max(1, Math.round(s / 60))} min ago`
  if (s < 86400) return `${Math.round(s / 3600)} h ago`
  const days = Math.round(s / 86400)
  return days === 1 ? 'yesterday' : `${days} days ago`
}
