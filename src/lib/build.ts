import type { BuildEntry } from './types'

export function uniqueItemPurchases(build: BuildEntry[]): BuildEntry[] {
  const unique = new Map<string, BuildEntry>()
  for (const entry of build) {
    if (entry.kind !== 'item') continue
    const key = [entry.t, entry.id, entry.tier ?? ''].join(':')
    const previous = unique.get(key)
    if (!previous || (entry.sold_t !== null && (previous.sold_t === null || entry.sold_t > previous.sold_t))) {
      unique.set(key, entry)
    }
  }
  return [...unique.values()]
}
