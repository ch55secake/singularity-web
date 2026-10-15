<script lang="ts">
  import { listMatches } from '../lib/api'
  import { ago } from '../lib/format'
  import LoadingSkeleton from '../components/LoadingSkeleton.svelte'
  import type { MatchSummary } from '../lib/types'

  const load = listMatches()

  type PlayerCard = {
    name: string
    matches: number
    wins: number
    lastPlayed: number
    mostPlayedHero: string | null
  }

  function summarize(matches: MatchSummary[]): PlayerCard[] {
    const players = new Map<string, {
      matches: number
      wins: number
      lastPlayed: number
      heroes: Map<string, number>
    }>()

    for (const match of matches) {
      const seen = new Set<string>()
      for (const player of match.players) {
        const name = player.member?.name
        if (!name || seen.has(name)) continue
        seen.add(name)

        const stats = players.get(name) ?? { matches: 0, wins: 0, lastPlayed: 0, heroes: new Map<string, number>() }
        stats.matches += 1
        if (player.team === match.winning_team) stats.wins += 1
        stats.lastPlayed = Math.max(stats.lastPlayed, match.start_time)
        stats.heroes.set(player.hero.name, (stats.heroes.get(player.hero.name) ?? 0) + 1)
        players.set(name, stats)
      }
    }

    return [...players].map(([name, stats]) => ({
      name,
      matches: stats.matches,
      wins: stats.wins,
      lastPlayed: stats.lastPlayed,
      mostPlayedHero: [...stats.heroes].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0]?.[0] ?? null,
    })).sort((a, b) => a.name.localeCompare(b.name))
  }
</script>

<svelte:head><title>Players · Singularity</title></svelte:head>

{#await load}
  <LoadingSkeleton variant="cards" label="Loading players" />
{:then matches}
  {@const players = summarize(matches)}
  <div class="page">
    <header class="intro">
      <h1>Players</h1>
      <p>Group profiles and recent match records.</p>
    </header>

    {#if players.length}
      <p class="sub count">{players.length} {players.length === 1 ? 'player' : 'players'} in recent matches</p>
      <ul class="player-list">
        {#each players as player (player.name)}
          <li>
            <a class="player-card panel" href="/p/{encodeURIComponent(player.name)}">
              <span class="card-heading">
                <strong>{player.name}</strong>
                <span class="arrow" aria-hidden="true">→</span>
              </span>
              <span class="stats">
                <span><strong>{player.matches}</strong> {player.matches === 1 ? 'match' : 'matches'}</span>
                <span><strong>{Math.round((player.wins / player.matches) * 100)}%</strong> wins</span>
              </span>
              {#if player.mostPlayedHero}
                <span class="sub">Most played: {player.mostPlayedHero}</span>
              {/if}
              <span class="sub last-played">Last played {ago(player.lastPlayed)}</span>
            </a>
          </li>
        {/each}
      </ul>
    {:else}
      <section class="panel state">
        <h2>No player profiles yet</h2>
        <p>Profiles appear here when a configured group member has a collected match.</p>
      </section>
    {/if}
  </div>
{:catch err}
  <section class="panel state"><h1>Couldn’t load players</h1><p>{err.message}</p><p><a href="/">Back to matches</a></p></section>
{/await}

<style>
  .page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }
  .intro { display: grid; gap: 0.35rem; }
  h1 { font-family: var(--display); font-weight: 800; font-size: clamp(2.2rem, 5vw, 3rem); line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; }
  .intro p, .sub { color: var(--muted); }
  .count { margin: 0; }
  .player-list { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(100%, 16rem), 1fr)); gap: 0.7rem; margin: 0; padding: 0; list-style: none; }
  .player-card { display: grid; gap: 0.65rem; min-height: 8rem; text-decoration: none; transform: translateY(0); transition: border-color var(--duration-fast) ease, background var(--duration-fast) ease, box-shadow var(--duration-fast) ease, transform var(--duration-fast) var(--ease-out); }
  .player-card:hover, .player-card:focus-visible { border-color: color-mix(in srgb, var(--member) 40%, var(--faint)); background: linear-gradient(145deg, color-mix(in srgb, var(--panel-2) 90%, var(--member)), var(--panel-2)); box-shadow: 0 1px 0 rgb(255 255 255 / 0.04) inset, 0 20px 48px rgb(0 0 0 / 0.3); transform: translateY(-2px); }
  .player-card:active { transform: translateY(0) scale(0.995); }
  .card-heading, .stats { display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; }
  .card-heading strong { color: var(--member); font-size: 1.1rem; }
  .arrow { color: var(--muted); transition: color var(--duration-fast) ease, transform var(--duration-fast) var(--ease-out); }
  .player-card:hover .arrow, .player-card:focus-visible .arrow { color: var(--member); transform: translateX(0.2rem); }
  .stats { justify-content: flex-start; color: var(--muted); font-size: 0.85rem; }
  .stats strong { color: var(--fg); }
  .last-played { font-size: 0.78rem; }
  .state { display: grid; gap: 0.4rem; color: var(--muted); }
  .state h1, .state h2 { color: var(--fg); }
</style>
