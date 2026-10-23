<script lang="ts">
  import HeroIcon from './HeroIcon.svelte'
  import { fmt, when } from '../lib/format'
  import type { LanePairing } from '../lib/types'

  let { pairing }: { pairing: LanePairing } = $props()

  const leadLabel = (value: number | null) => {
    if (value === null) return '—'
    const rounded = Math.round(value)
    return `${rounded > 0 ? '+' : ''}${fmt(rounded)}`
  }
</script>

<details>
  <summary>Hero combinations and game history <span>{pairing.hero_combinations.length} combinations · {pairing.games.length} recent games</span></summary>
  <div class="details-grid">
    <section class="hero-combinations" aria-label="Hero combinations">
      <h3>Hero combinations</h3>
      {#each pairing.hero_combinations as combination (`${combination.heroes[0].id}-${combination.heroes[1].id}`)}
        <article class="combo">
          <div class="combo-heroes">
            <HeroIcon hero={combination.heroes[0]} size={26} />
            <span aria-hidden="true">+</span>
            <HeroIcon hero={combination.heroes[1]} size={26} />
          </div>
          <div class="combo-copy">
            <strong>{pairing.members[0]}: {combination.heroes[0].name} · {pairing.members[1]}: {combination.heroes[1].name}</strong>
            <span class="sub">{combination.matches} {combination.matches === 1 ? 'game' : 'games'} · {combination.wins}/{combination.result_matches} match wins</span>
          </div>
          <div class="combo-lead" class:positive={combination.average_net_worth_lead !== null && combination.average_net_worth_lead > 0} class:negative={combination.average_net_worth_lead !== null && combination.average_net_worth_lead < 0}>
            <strong>{leadLabel(combination.average_net_worth_lead)}</strong>
            <small>{combination.lane_samples} lane samples</small>
          </div>
        </article>
      {:else}
        <p class="sub">No hero combinations available.</p>
      {/each}
    </section>

    <section class="game-history" aria-label="Recent games">
      <h3>Recent games</h3>
      {#each pairing.games as game (game.uuid)}
        <a class="game" href="/m/{game.uuid}">
          <span class="game-date">{when(game.start_time)}</span>
          <span class="game-match">Match {game.match_id}<small class:win={game.match_result === 'win'} class:loss={game.match_result === 'loss'}>{game.match_result ?? 'result unavailable'}</small></span>
          <span class="game-heroes">
            <span><HeroIcon hero={game.heroes[0]} size={23} /><small>{pairing.members[0]} · {game.heroes[0].name}</small></span>
            <span><HeroIcon hero={game.heroes[1]} size={23} /><small>{pairing.members[1]} · {game.heroes[1].name}</small></span>
          </span>
          <span class="game-lane" class:positive={game.lane_net_worth_lead !== null && game.lane_net_worth_lead > 0} class:negative={game.lane_net_worth_lead !== null && game.lane_net_worth_lead < 0}>{leadLabel(game.lane_net_worth_lead)}<small>lane lead</small></span>
          <span class="game-kda">{game.stats.kills ?? '—'}/{game.stats.deaths ?? '—'}/{game.stats.assists ?? '—'}<small>K/D/A</small></span>
        </a>
      {:else}
        <p class="sub">No match details available.</p>
      {/each}
      {#if pairing.games_truncated}<p class="history-note">Showing the latest {pairing.games.length} games; aggregate stats include the full history.</p>{/if}
    </section>
  </div>
</details>

<style>
  details { border-bottom: 1px solid var(--line); }
  summary { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.6rem 0.7rem; color: var(--muted); font-size: 0.72rem; cursor: pointer; }
  summary:hover { color: var(--fg); }
  summary span { color: var(--faint); font-size: 0.65rem; }
  .details-grid { display: grid; grid-template-columns: minmax(15rem, 0.8fr) minmax(25rem, 1.2fr); gap: 1.25rem; padding: 0.8rem; border-top: 1px solid var(--line); background: color-mix(in srgb, var(--panel-2) 45%, transparent); }
  .details-grid h3 { margin-bottom: 0.55rem; color: var(--muted); font-size: 0.68rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
  .hero-combinations { display: grid; align-content: start; gap: 0.35rem; }
  .combo { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 0.55rem; padding: 0.45rem; border: 1px solid var(--line); border-radius: 6px; background: var(--panel); }
  .combo-heroes { display: flex; align-items: center; gap: 0.25rem; color: var(--faint); }
  .combo-copy { display: grid; gap: 0.08rem; min-width: 0; }
  .combo-copy strong { overflow: hidden; color: var(--fg); font-size: 0.75rem; text-overflow: ellipsis; white-space: nowrap; }
  .combo-copy .sub { font-size: 0.62rem; }
  .combo-lead { text-align: right; }
  .combo-lead strong { display: block; font-size: 0.74rem; }
  .combo-lead small { display: block; color: var(--muted); font-size: 0.6rem; }
  .game-history { display: grid; align-content: start; gap: 0.35rem; }
  .game { display: grid; grid-template-columns: minmax(7rem, 1fr) auto minmax(10rem, 1.2fr) 4.5rem 4.2rem; align-items: center; gap: 0.7rem; padding: 0.4rem 0.45rem; border: 1px solid var(--line); border-radius: 6px; background: var(--panel); text-decoration: none; }
  .game:hover { border-color: var(--faint); background: var(--panel-2); }
  .game-date { color: var(--muted); font-size: 0.65rem; }
  .game-match { color: var(--fg); font-size: 0.7rem; }
  .game-match small { color: var(--muted); font-size: 0.6rem; text-transform: uppercase; }
  .game-heroes { display: flex; gap: 0.6rem; }
  .game-heroes > span { display: flex; align-items: center; gap: 0.25rem; min-width: 0; }
  .game-heroes small { overflow: hidden; color: var(--muted); font-size: 0.62rem; text-overflow: ellipsis; white-space: nowrap; }
  .game-lane, .game-kda { text-align: right; color: var(--fg); font-size: 0.7rem; font-variant-numeric: tabular-nums; }
  .game-lane small, .game-kda small { display: block; color: var(--faint); font-size: 0.58rem; }
  .positive { color: var(--good); }
  .negative { color: var(--bad); }
  .history-note { color: var(--muted); font-size: 0.65rem; }
  .sub { color: var(--muted); }
  @media (max-width: 620px) {
    .details-grid { grid-template-columns: 1fr; }
    .game { grid-template-columns: minmax(6rem, 1fr) auto auto; }
    .game-heroes { grid-column: 1 / -1; grid-row: 2; }
    .game-lane { grid-column: 2; grid-row: 1; }
    .game-kda { grid-column: 3; grid-row: 1; }
  }
</style>
