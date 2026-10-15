<script lang="ts">
  import { getPlayer } from '../lib/api'
  import { ago, fmt, mmss, when } from '../lib/format'
  import HeroIcon from '../components/HeroIcon.svelte'
  import type { RecentPlayerMatch } from '../lib/types'

  let { name }: { name: string } = $props()

  const load = $derived(getPlayer(name))
  type FormView = 'recent' | 'best' | 'worst'
  let formView = $state<FormView>('recent')
  const percent = (value: number) => `${Math.round(value * 100)}%`
  const matchKda = (match: RecentPlayerMatch) => (match.kills + match.assists) / Math.max(match.deaths, 1)
  const formMatches = (matches: RecentPlayerMatch[], view: FormView) => {
    if (view === 'recent') return matches
    return [...matches].sort((a, b) => {
      const impactOrder = view === 'best' ? b.impact_score - a.impact_score : a.impact_score - b.impact_score
      return impactOrder || b.start_time - a.start_time || b.match_id - a.match_id
    })
  }
  const impactLabel = (value: number) => {
    const rounded = Math.abs(value) < 0.05 ? 0 : value
    return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`
  }
  const shortDate = (unix: number) => new Date(unix * 1000).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
</script>

<svelte:head><title>{name} · Singularity</title></svelte:head>

{#await load}
  <p class="state">Loading player…</p>
{:then player}
  {@const selectedMatches = formMatches(player.recent, formView)}
  {@const trend = formView === 'recent' ? [...selectedMatches].reverse() : selectedMatches}
  {@const peakKda = Math.max(1, ...trend.map(matchKda))}
  <div class="page">
    <header class="intro">
      <a class="back" href="/">← All matches</a>
      <h1>{player.name || name}</h1>
      <p>{player.matches} matches in the group’s recent history.</p>
    </header>

    <section class="metric-group" aria-labelledby="performance-heading">
      <h2 id="performance-heading">Match performance</h2>
      <div class="stats">
        <article class="panel stat"><span class="label">KDR</span><strong>{player.kdr.toFixed(2)}</strong><span class="sub">kills / deaths</span></article>
        <article class="panel stat"><span class="label">KDA</span><strong>{player.kda.toFixed(2)}</strong><span class="sub">kills + assists / deaths</span></article>
        <article class="panel stat"><span class="label">Win rate</span><strong>{percent(player.win_rate)}</strong><span class="sub">match victories</span></article>
        <article class="panel stat impact-stat">
          <span class="label">Average impact</span>
          <strong class:positive={player.average_impact_score > 0} class:negative={player.average_impact_score < 0}>{impactLabel(player.average_impact_score)}</strong>
          <span class="sub">{player.impact_score_matches} matches · v{player.impact_score_version} · 0 is lobby average</span>
        </article>
      </div>
    </section>

    <section class="metric-group" aria-labelledby="combat-heading">
      <h2 id="combat-heading">Combat averages</h2>
      <div class="stats">
        <article class="panel stat"><span class="label">Accuracy</span><strong>{percent(player.accuracy)}</strong><span class="sub">shots hit</span></article>
        <article class="panel stat"><span class="label">Crit rate</span><strong>{percent(player.crit_rate)}</strong><span class="sub">hero bullets</span></article>
        <article class="panel stat"><span class="label">Damage / min</span><strong>{fmt(Math.round(player.damage_per_minute))}</strong><span class="sub">hero damage per minute</span></article>
      </div>
    </section>

    <section class="panel">
      <div class="panel-head"><h2>Heroes played</h2><span class="hint">Most frequent in this group</span></div>
      <div class="heroes">
        {#each player.heroes as hero (hero.id)}
          <div class="hero-row">
            <HeroIcon hero={{ id: hero.id, name: hero.name, icon: hero.icon, card: null }} size={32} />
            <span class="hero-name">{hero.name}</span>
            <span class="sub num">{hero.matches} {hero.matches === 1 ? 'match' : 'matches'}</span>
            <span class="bar"><i style:width="{`${(hero.matches / player.matches) * 100}%`}"></i></span>
          </div>
        {:else}
          <p class="state">No hero history is available yet.</p>
        {/each}
      </div>
    </section>

    <section class="panel">
      <div class="panel-head form-head">
        <div class="form-title">
          <h2>Recent form</h2>
          <span class="hint">
            {#if formView === 'recent'}Latest {player.recent.length} matches
            {:else if formView === 'best'}Best impact scores · latest {player.recent.length} matches
            {:else}Worst impact scores · latest {player.recent.length} matches{/if}
          </span>
        </div>
        <div class="form-tabs" role="group" aria-label="Filter recent form games">
          <button type="button" class:active={formView === 'recent'} aria-pressed={formView === 'recent'} onclick={() => (formView = 'recent')}>Recent</button>
          <button type="button" class:active={formView === 'best'} aria-pressed={formView === 'best'} aria-label="Best games by impact score" onclick={() => (formView = 'best')}>Best</button>
          <button type="button" class:active={formView === 'worst'} aria-pressed={formView === 'worst'} aria-label="Worst games by impact score" onclick={() => (formView = 'worst')}>Worst</button>
        </div>
      </div>
      {#if player.recent.length}
        <figure class="form-chart">
          <figcaption><span class="label">KDA per match</span><span class="hint">{formView === 'recent' ? 'Oldest → newest' : formView === 'best' ? 'Highest impact → lower' : 'Lowest impact → higher'}</span></figcaption>
          <div class="trend-scroll">
            <ol class="trend">
              {#each trend as match (match.uuid)}
                {@const won = match.team === match.winning_team}
                {@const kda = matchKda(match)}
                <li class:win={won} class:loss={!won} title="Match {match.match_id}: {kda.toFixed(2)} KDA · {won ? 'Win' : 'Loss'}">
                  <span class="trend-value num">{kda.toFixed(1)}</span>
                  <span class="trend-bar"><i style:--height="{`${Math.max(5, (kda / peakKda) * 100)}%`}"></i></span>
                  <span class="trend-meta"><span>{won ? 'W' : 'L'}</span><span>{shortDate(match.start_time)}</span></span>
                </li>
              {/each}
            </ol>
          </div>
          <p class="chart-note">KDA is (kills + assists) ÷ deaths; a zero-death match uses one as the divisor.</p>
        </figure>
        <figure class="impact-chart">
          <figcaption><span class="label">Impact score by match</span><span class="hint">{formView === 'recent' ? '−5 to +5 · 0 is lobby average' : formView === 'best' ? 'Best → lowest · 0 is lobby average' : 'Worst → highest · 0 is lobby average'}</span></figcaption>
          <div class="trend-scroll">
            <ol class="impact-trend">
              {#each trend as match (match.uuid)}
                {@const impact = match.impact_score}
                {@const won = match.team === match.winning_team}
                <li class:positive={impact > 0} class:negative={impact < 0} title="Match {match.match_id}: {impactLabel(impact)} impact · {won ? 'Win' : 'Loss'}">
                  <span class="trend-value num">{impactLabel(impact)}</span>
                  <span class="impact-bar"><i class:positive={impact > 0} class:negative={impact < 0} style:--height="{`${Math.abs(impact) / 5 * 50}%`}"></i></span>
                  <span class="trend-meta"><span class:win={won} class:loss={!won}>{won ? 'W' : 'L'}</span><span>{shortDate(match.start_time)}</span></span>
                </li>
              {/each}
            </ol>
          </div>
        </figure>
      {:else}
        <p class="empty">No recent matches to chart yet.</p>
      {/if}
      <div class="scroll-x">
        <table class="num">
          <thead><tr><th>Result</th><th>Match</th><th>Hero</th><th>K/D/A</th><th>KDA</th><th>Impact</th><th>Length</th><th>Date</th></tr></thead>
          <tbody>
            {#each selectedMatches as match (match.uuid)}
              <tr>
                <td class:win={match.team === match.winning_team} class:loss={match.team !== match.winning_team}>{match.team === match.winning_team ? 'W' : 'L'}</td>
                <td><a href="/m/{match.uuid}">{match.match_id}</a></td>
                <td class="hero-cell"><HeroIcon hero={match.hero} team={match.team} size={26} />{match.hero.name}</td>
                <td>{match.kills}/{match.deaths}/{match.assists}</td>
                <td>{matchKda(match).toFixed(2)}</td>
                <td class:positive={match.impact_score > 0} class:negative={match.impact_score < 0}>{impactLabel(match.impact_score)}</td>
                <td>{mmss(match.duration_s)}</td>
                <td title={when(match.start_time)}>{ago(match.start_time)}</td>
              </tr>
            {:else}
              <tr><td colspan="8" class="empty">No recent matches found.</td></tr>
            {/each}
          </tbody>
        </table>
      </div>
    </section>
  </div>
{:catch err}
  <section class="panel state"><h1>Couldn’t load this player</h1><p>{err.message}</p><p><a href="/">Back to all matches</a></p></section>
{/await}

<style>
  .page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }
  .intro { display: grid; gap: 0.3rem; }
  .intro h1 { font-family: var(--display); font-size: clamp(2.2rem, 5vw, 3rem); line-height: 1; text-transform: uppercase; }
  .intro p, .hint, .sub { color: var(--muted); }
  .back { color: var(--muted); font-size: 0.85rem; text-decoration: none; }
  .back:hover { color: var(--fg); }
  .metric-group { display: grid; gap: 0.5rem; }
  .metric-group h2 { font-family: var(--display); font-size: 1.2rem; letter-spacing: 0.02em; text-transform: uppercase; }
  .stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; }
  .stat { display: grid; gap: 0.1rem; }
  .stat strong { font-family: var(--display); font-size: 2rem; line-height: 1.1; }
  .stat .sub { font-size: 0.75rem; }
  .impact-stat strong.positive, .positive { color: var(--good); }
  .impact-stat strong.negative, .negative { color: var(--bad); }
  .heroes { display: grid; gap: 0.65rem; }
  .hero-row { display: grid; grid-template-columns: 2rem 10rem 5rem minmax(5rem, 1fr); gap: 0.7rem; align-items: center; }
  .hero-name { font-weight: 600; }
  .bar { height: 0.35rem; background: var(--panel-2); border-radius: 99px; overflow: hidden; }
  .bar i { display: block; height: 100%; background: var(--member); border-radius: inherit; }
  .form-chart { display: grid; gap: 0.45rem; margin: 0 0 1rem; }
  .form-title { display: grid; gap: 0.15rem; }
  .form-tabs { display: flex; gap: 0.15rem; border-bottom: 1px solid var(--line); }
  .form-tabs button { background: none; border: 0; border-bottom: 2px solid transparent; padding: 0.45rem 0.65rem; color: var(--muted); font: inherit; font-size: 0.85rem; font-weight: 600; cursor: pointer; }
  .form-tabs button:hover { color: var(--fg); }
  .form-tabs button.active { color: var(--fg); border-bottom-color: var(--fg); }
  .form-tabs button:focus-visible { outline: 2px solid var(--fg); outline-offset: 1px; }
  .form-chart figcaption { display: flex; align-items: baseline; gap: 0.75rem; }
  .trend-scroll { overflow-x: auto; }
  .trend { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(3.25rem, 1fr); align-items: end; gap: 0.35rem; min-width: 100%; min-height: 7.5rem; margin: 0; padding: 0.5rem 0 0; list-style: none; }
  .trend li { display: grid; grid-template-rows: auto 4.5rem auto; justify-items: center; gap: 0.2rem; min-width: 0; }
  .trend-value { font-size: 0.7rem; }
  .trend-bar { display: flex; align-items: end; width: min(1.4rem, 70%); height: 100%; overflow: hidden; border-radius: 4px 4px 0 0; background: var(--panel-2); }
  .trend-bar i { display: block; width: 100%; height: var(--height); min-height: 3px; background: var(--bad); border-radius: inherit; }
  .trend li.win .trend-bar i { background: var(--good); }
  .trend-meta { display: flex; flex-direction: column; align-items: center; color: var(--muted); font-size: 0.64rem; line-height: 1.2; white-space: nowrap; }
  .trend li.win .trend-meta span:first-child { color: var(--good); font-weight: 700; }
  .trend li.loss .trend-meta span:first-child { color: var(--bad); font-weight: 700; }
  .chart-note { color: var(--faint); font-size: 0.72rem; }
  .impact-chart { display: grid; gap: 0.45rem; margin: 0 0 1rem; }
  .impact-chart figcaption { display: flex; align-items: baseline; gap: 0.75rem; }
  .impact-trend { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(3.25rem, 1fr); align-items: end; gap: 0.35rem; min-width: 100%; min-height: 7.5rem; margin: 0; padding: 0.5rem 0 0; list-style: none; }
  .impact-trend li { display: grid; grid-template-rows: auto 4.5rem auto; justify-items: center; gap: 0.2rem; min-width: 0; }
  .impact-bar { position: relative; width: min(1.4rem, 70%); height: 100%; background: linear-gradient(to bottom, transparent calc(50% - 0.5px), var(--line) calc(50% - 0.5px), var(--line) calc(50% + 0.5px), transparent calc(50% + 0.5px)); }
  .impact-bar i { position: absolute; left: 0; width: 100%; height: var(--height); background: var(--muted); }
  .impact-bar i.positive { bottom: 50%; background: var(--good); }
  .impact-bar i.negative { top: 50%; background: var(--bad); }
  .impact-trend .trend-meta .win { color: var(--good); font-weight: 700; }
  .impact-trend .trend-meta .loss { color: var(--bad); font-weight: 700; }
  table { width: 100%; border-collapse: collapse; min-width: 43rem; font-size: 0.9rem; }
  th, td { padding: 0.5rem 0.6rem; text-align: right; white-space: nowrap; border-top: 1px solid var(--line); }
  th { border-top: 0; color: var(--muted); font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; }
  th:first-child, td:first-child, .hero-cell { text-align: left; }
  td a { color: var(--fg); text-decoration: none; }
  td a:hover { text-decoration: underline; }
  .hero-cell { display: flex; align-items: center; gap: 0.5rem; }
  .win { color: var(--good); font-weight: 700; }
  .loss { color: var(--bad); font-weight: 700; }
  .empty, .state { color: var(--muted); }
  @media (max-width: 50rem) {
    .stats { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .hero-row { grid-template-columns: 2rem minmax(6rem, 1fr) 5rem; }
    .hero-row .bar { grid-column: 2 / -1; }
  }
</style>
