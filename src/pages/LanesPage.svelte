<script lang="ts">
  import { getLanePairings } from '../lib/api'
  import { fmt, pct, when } from '../lib/format'
  import HeroIcon from '../components/HeroIcon.svelte'
  import LoadingSkeleton from '../components/LoadingSkeleton.svelte'
  import StatePanel from '../components/StatePanel.svelte'
  import Icon from '../components/Icon.svelte'
  import type { LanePairing } from '../lib/types'

  const load = getLanePairings()
  type SortBy = 'lane-lead' | 'lead-rate' | 'match-wins' | 'matches'
  let sortBy = $state<SortBy>('lane-lead')
  let selectedMember = $state('')

  const sortedPairings = (pairings: LanePairing[]) => {
    const filtered = selectedMember
      ? pairings.filter((pairing) => pairing.members.includes(selectedMember))
      : pairings
    return [...filtered].sort((a, b) => {
      if (sortBy === 'matches') return b.matches - a.matches || compareMembers(a, b)
      const aValue = sortBy === 'lead-rate'
        ? a.lane_lead_rate
        : sortBy === 'match-wins'
          ? a.match_win_rate
          : a.average_net_worth_lead
      const bValue = sortBy === 'lead-rate'
        ? b.lane_lead_rate
        : sortBy === 'match-wins'
          ? b.match_win_rate
          : b.average_net_worth_lead
      if (aValue === null && bValue !== null) return 1
      if (aValue !== null && bValue === null) return -1
      return (bValue ?? 0) - (aValue ?? 0) || b.lane_samples - a.lane_samples || compareMembers(a, b)
    })
  }
  const compareMembers = (a: LanePairing, b: LanePairing) =>
    a.members.join('\0').localeCompare(b.members.join('\0'))
  const leadLabel = (value: number | null) => {
    if (value === null) return '—'
    const rounded = Math.round(value)
    return `${rounded > 0 ? '+' : ''}${fmt(rounded)}`
  }
  const rateLabel = (value: number | null) => value === null ? '—' : `${pct(value, 1).toFixed(0)}%`
  const averageLabel = (value: number | null) => value === null ? '—' : value.toFixed(1)
  const damageLabel = (value: number | null) => value === null ? '—' : fmt(Math.round(value))
</script>

<svelte:head><title>Lanes · Singularity</title></svelte:head>

{#await load}
  <LoadingSkeleton variant="cards" label="Loading lane pairings" />
{:then data}
  {@const pairings = sortedPairings(data.pairings)}
  {@const totalAppearances = data.pairings.reduce((sum, pairing) => sum + pairing.matches, 0)}
  {@const totalLaneSamples = data.pairings.reduce((sum, pairing) => sum + pairing.lane_samples, 0)}
  {@const totalLaneLeads = data.pairings.reduce((sum, pairing) => sum + pairing.lane_leads, 0)}
  {@const weightedLead = totalLaneSamples
    ? data.pairings.reduce((sum, pairing) => sum + (pairing.average_net_worth_lead ?? 0) * pairing.lane_samples, 0) / totalLaneSamples
    : null}
  {@const members = [...new Set(data.pairings.flatMap((pairing) => pairing.members))].sort()}
  <div class="page">
    <header class="intro">
      <div class="eyebrow"><Icon name="lanes" size={15} /> TEAM ANALYTICS</div>
      <h1>Lane pairings</h1>
      <p>See which tracked duos are getting ahead together in the opening ten minutes.</p>
    </header>

    <section class="overview panel" aria-label="Lane pairing overview">
      <div><span class="label">Tracked duos</span><strong class="num">{data.pairings.length}</strong><span class="sub">with shared lane assignments</span></div>
      <div><span class="label">Duo appearances</span><strong class="num">{fmt(totalAppearances)}</strong><span class="sub">matches played together in lane</span></div>
      <div><span class="label">Lane comparisons</span><strong class="num">{fmt(totalLaneSamples)}</strong><span class="sub">complete 2v2 snapshots</span></div>
      <div><span class="label">Average lane lead</span><strong class="num" class:positive={weightedLead !== null && weightedLead > 0} class:negative={weightedLead !== null && weightedLead < 0}>{leadLabel(weightedLead)}</strong><span class="sub">held net worth at {Math.floor(data.lane_phase_end_s / 60)}:00</span></div>
    </section>

    {#if data.pairings.length === 0}
      <StatePanel title="No tracked lane duos yet" message="Pairings appear after two configured group members have shared an assigned lane in a processed match." />
    {:else}
      <section class="panel ranking" aria-labelledby="ranking-heading">
        <div class="panel-head">
          <div class="heading-copy">
            <h2 id="ranking-heading">Duo performance</h2>
            <p class="hint">{totalLaneSamples ? `${fmt(totalLaneLeads)} of ${fmt(totalLaneSamples)} complete comparisons led their lane` : 'No complete lane comparisons yet'}</p>
          </div>
          <div class="controls">
            <label>Player
              <select bind:value={selectedMember}>
                <option value="">All tracked players</option>
                {#each members as member}<option value={member}>{member}</option>{/each}
              </select>
            </label>
            <label>Rank by
              <select bind:value={sortBy}>
                <option value="lane-lead">Average lane lead</option>
                <option value="lead-rate">Lane lead rate</option>
                <option value="match-wins">Match win rate</option>
                <option value="matches">Games played</option>
              </select>
            </label>
          </div>
        </div>

        <div class="table-scroll scroll-x data-scroll" role="region" aria-label="Tracked lane duo performance">
          <table class="num">
            <thead><tr><th class="pair-cell">Pair</th><th>Games</th><th>Avg. K / D / A</th><th>Farm / denies</th><th>Lane record</th><th>Avg. 10m lead</th><th>Lane lead rate</th><th>Hero damage</th><th>Match wins</th></tr></thead>
            <tbody>
              {#each pairings as pairing, index (`${pairing.members.join('-')}-${index}`)}
                <tr>
                  <td class="pair-cell"><span class="rank">{String(index + 1).padStart(2, '0')}</span><strong>{pairing.members[0]} <span>+</span> {pairing.members[1]}</strong></td>
                  <td>{fmt(pairing.matches)}</td>
                  <td>
                    <strong>{averageLabel(pairing.average_kills)} / {averageLabel(pairing.average_deaths)} / {averageLabel(pairing.average_assists)}</strong>
                    <small>{pairing.stats_samples} snapshot pairs</small>
                  </td>
                  <td>
                    <strong>{averageLabel(pairing.average_creep_kills)} / {averageLabel(pairing.average_denies)}</strong>
                    <small>{pairing.economy_samples} snapshot pairs</small>
                  </td>
                  <td class="lane-record">
                    {#if pairing.lane_samples}
                      <strong>{pairing.lane_leads}–{pairing.lane_ties}–{pairing.lane_trails}</strong>
                      <small>{pairing.lane_samples} evaluated</small>
                    {:else}
                      <span class="muted">No lane data</span>
                    {/if}
                  </td>
                  <td class:positive={pairing.average_net_worth_lead !== null && pairing.average_net_worth_lead > 0} class:negative={pairing.average_net_worth_lead !== null && pairing.average_net_worth_lead < 0}>
                    <strong>{leadLabel(pairing.average_net_worth_lead)}</strong>
                    {#if pairing.lane_samples > 0 && pairing.lane_samples < 3}<small class="sample-note">Small sample</small>{/if}
                  </td>
                  <td>
                    {#if pairing.lane_lead_rate !== null}
                      <span>{rateLabel(pairing.lane_lead_rate)}</span>
                      <span class="lead-bar" aria-hidden="true"><i style:width="{`${pairing.lane_lead_rate * 100}%`}"></i></span>
                    {:else}<span class="muted">—</span>{/if}
                  </td>
                  <td>
                    <strong>{damageLabel(pairing.average_hero_damage)}</strong>
                    <small>{pairing.damage_samples} snapshot pairs</small>
                  </td>
                  <td>
                    {#if pairing.match_win_rate !== null}
                      <strong>{rateLabel(pairing.match_win_rate)}</strong>
                      <small>{pairing.wins}/{pairing.result_matches} wins</small>
                    {:else}<span class="muted">—</span>{/if}
                  </td>
                </tr>
                <tr class="details-row">
                  <td colspan="9">
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
                  </td>
                </tr>
              {:else}
                <tr><td colspan="9" class="empty">No duo matches this player filter.</td></tr>
              {/each}
            </tbody>
          </table>
        </div>
      </section>

      <aside class="method panel">
        <span class="method-icon"><Icon name="info" size={17} /></span>
        <div>
          <strong>How lane performance is measured</strong>
          <p>Pairings use recorded lane assignments. A lane comparison needs two players on each side and a held-net-worth snapshot for all four at or before {Math.floor(data.lane_phase_end_s / 60)}:00. The average lead is your duo’s combined net worth minus the opposing duo’s; whole-match wins are shown separately. K/D/A, creep kills, denies, and hero damage are combined per duo at their latest available snapshots. Hero combinations and recent match details are expandable; low sample counts are a reminder these are trends, not guarantees.</p>
        </div>
      </aside>
    {/if}
  </div>
{:catch err}
  <StatePanel kind="error" title="Couldn’t load lane pairings" message={err.message} actionLabel="Try again" onaction={() => location.reload()} />
{/await}

<style>
  .page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }
  .intro { display: grid; gap: 0.35rem; }
  h1 { font-family: var(--display); font-weight: 800; font-size: clamp(2.2rem, 5vw, 3rem); line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; }
  .intro p, .sub, .hint { color: var(--muted); }
  .eyebrow { display: flex; align-items: center; gap: 0.4rem; color: var(--amber); font-size: 0.65rem; font-weight: 700; letter-spacing: 0.1em; }
  .overview { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 0; padding: 0; overflow: hidden; }
  .overview > div { display: grid; align-content: center; gap: 0.05rem; min-height: 6.25rem; padding: 0.9rem 1rem; }
  .overview > div + div { border-left: 1px solid var(--line); }
  .overview strong { font-family: var(--display); font-size: 1.55rem; line-height: 1.1; }
  .overview .sub { font-size: 0.68rem; }
  .ranking { min-width: 0; }
  .heading-copy { display: grid; gap: 0.2rem; }
  .heading-copy p { font-size: 0.75rem; }
  .controls { display: flex; gap: 0.6rem; }
  .controls label { display: grid; gap: 0.2rem; color: var(--muted); font-size: 0.67rem; }
  select { max-width: 12rem; padding: 0.45rem 1.8rem 0.45rem 0.55rem; border: 1px solid var(--line); border-radius: 6px; background: var(--panel-2); color: var(--fg); font: inherit; font-size: 0.75rem; }
  table { width: 100%; min-width: 70rem; border-collapse: collapse; font-size: 0.8rem; }
  th, td { padding: 0.7rem 0.65rem; border-bottom: 1px solid var(--line); text-align: right; white-space: nowrap; }
  th { color: var(--muted); font-size: 0.64rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
  .pair-cell { min-width: 14rem; text-align: left; }
  .pair-cell strong { color: var(--fg); }
  .pair-cell strong span { color: var(--faint); font-weight: 400; }
  .rank { display: inline-grid; place-items: center; width: 1.7rem; margin-right: 0.4rem; color: var(--faint); font-size: 0.67rem; }
  tbody tr:last-child td { border-bottom: 0; }
  td strong { display: block; }
  td small { display: block; margin-top: 0.12rem; color: var(--muted); font-size: 0.66rem; }
  .lane-record strong { color: var(--fg); }
  .lane-record small { color: var(--muted); }
  .sample-note { color: var(--amber) !important; }
  .lead-bar { display: inline-block; width: 3.5rem; height: 0.28rem; margin-left: 0.35rem; overflow: hidden; vertical-align: middle; border-radius: 9px; background: var(--panel-2); }
  .lead-bar i { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--amber), var(--good)); }
  .positive { color: var(--good); }
  .negative { color: var(--bad); }
  .muted { color: var(--faint); }
  .empty { padding: 1.25rem; color: var(--muted); text-align: center; }
  .details-row > td { padding: 0; text-align: left; white-space: normal; }
  .details-row details { border-bottom: 1px solid var(--line); }
  .details-row summary { display: flex; align-items: center; justify-content: space-between; gap: 1rem; padding: 0.6rem 0.7rem; color: var(--muted); font-size: 0.72rem; cursor: pointer; }
  .details-row summary:hover { color: var(--fg); }
  .details-row summary span { color: var(--faint); font-size: 0.65rem; }
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
  .history-note { color: var(--muted); font-size: 0.65rem; }
  .method { display: grid; grid-template-columns: auto minmax(0, 1fr); align-items: start; gap: 0.7rem; padding: 0.85rem 1rem; }
  .method-icon { color: var(--muted); }
  .method strong { font-size: 0.78rem; }
  .method p { margin-top: 0.25rem; color: var(--muted); font-size: 0.72rem; line-height: 1.5; }
  @media (max-width: 800px) {
    .overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .overview > div:nth-child(3) { border-left: 0; border-top: 1px solid var(--line); }
    .overview > div:nth-child(4) { border-top: 1px solid var(--line); }
  }
  @media (max-width: 620px) {
    .panel-head { align-items: flex-start; flex-direction: column; }
    .controls { width: 100%; }
    .controls label { flex: 1; min-width: 0; }
    .controls select { width: 100%; max-width: none; }
    .overview > div { min-height: 5.5rem; padding: 0.75rem; }
    .overview strong { font-size: 1.3rem; }
    .overview .sub { font-size: 0.63rem; }
    .details-grid { grid-template-columns: 1fr; }
    .game { grid-template-columns: minmax(6rem, 1fr) auto auto; }
    .game-heroes { grid-column: 1 / -1; grid-row: 2; }
    .game-lane { grid-column: 2; grid-row: 1; }
    .game-kda { grid-column: 3; grid-row: 1; }
  }
</style>
