<script lang="ts">
  import { listMatches } from '../lib/api'
  import { TEAMS, ago, mmss, ratio, when } from '../lib/format'
  import HeroIcon from '../components/HeroIcon.svelte'
  import type { MatchSummary } from '../lib/types'

  const load = listMatches()
  let selected = $state('')

  const members = (m: MatchSummary) => m.players.filter((p) => p.member)
  const includesPlayer = (m: MatchSummary) => !selected || m.players.some((p) => p.member?.name === selected)
</script>

<svelte:head><title>Matches · Singularity</title></svelte:head>

<div class="page">
  <header class="intro">
    <h1>Matches</h1>
    <p>Recent Deadlock matches captured by the group.</p>
  </header>

  {#await load}
    <p class="state">Loading matches…</p>
  {:then matches}
    {@const memberNames = [...new Set(matches.flatMap((m) => m.players.flatMap((p) => p.member ? [p.member.name] : [])))].sort()}
    <section class="toolbar panel">
      <label for="player-filter">Show matches with</label>
      <select id="player-filter" bind:value={selected}>
        <option value="">Everyone</option>
        {#each memberNames as name}<option value={name}>{name}</option>{/each}
      </select>
      <span class="sub">{matches.filter(includesPlayer).length} of {matches.length} matches</span>
      {#if memberNames.length}
        <nav class="players" aria-label="Player pages">
          <span class="label">Player pages</span>
          {#each memberNames as name}<a href="/p/{encodeURIComponent(name)}">{name}</a>{/each}
        </nav>
      {/if}
    </section>

    {#if matches.length === 0}
      <section class="panel state">
        <h2>No matches yet</h2>
        <p>Matches appear here a few minutes after someone in the group finishes a game with the ingest app running.</p>
      </section>
    {:else if matches.filter(includesPlayer).length === 0}
      <section class="panel state">
        <h2>No matches for {selected}</h2>
        <p>Choose everyone or another group member to see more matches.</p>
      </section>
    {:else}
      <ol class="list">
        {#each matches.filter(includesPlayer) as m (m.uuid)}
          {@const ours = members(m)}
          {@const groupWins = ours.filter((p) => p.team === m.winning_team).length}
          {@const groupResult = ours.length === 0 ? 'No group' : groupWins === ours.length ? 'Group win' : groupWins === 0 ? 'Group loss' : 'Split' }
          {@const groupKills = ours.reduce((total, p) => total + p.kills, 0)}
          {@const groupDeaths = ours.reduce((total, p) => total + p.deaths, 0)}
          {@const groupAssists = ours.reduce((total, p) => total + p.assists, 0)}
          <li>
            <a class="row panel" href="/m/{m.uuid}">
              <div class="meta">
                <div class="meta-top">
                  <span class="mode">{m.mode}</span>
                  <span class="group-result" class:win={ours.length > 0 && groupWins === ours.length} class:loss={ours.length > 0 && groupWins === 0} class:split={groupWins > 0 && groupWins < ours.length}>{groupResult}</span>
                </div>
                <span class="date" title={when(m.start_time)}>{ago(m.start_time)}</span>
                <span class="sub num">{mmss(m.duration_s)} · Match {m.match_id}</span>
              </div>
              <div class="teams">
                {#each [0, 1] as const as t}
                  <div class="team team-{t}" class:won={m.winning_team === t}>
                    <span class="tname">{TEAMS[t].short}<span class="team-score num">{m.players.filter((p) => p.team === t).reduce((sum, p) => sum + p.kills, 0)}</span>{#if m.winning_team === t}<span class="winner">WIN</span>{/if}</span>
                    <span class="heroes">
                      {#each m.players.filter((p) => p.team === t) as p (p.slot)}
                        <HeroIcon hero={p.hero} team={t} size={30} />
                      {/each}
                    </span>
                  </div>
                {/each}
              </div>
              <div class="ours">
                {#if ours.length}
                  <div class="group-recap">
                    <strong>{ours.length} {ours.length === 1 ? 'friend' : 'friends'}</strong>
                    <span class="sub">{groupWins}/{ours.length} on winning team</span>
                    <span class="recap-kda"><span class="label">Combined K/D/A</span><span class="num">{groupKills}/{groupDeaths}/{groupAssists}</span></span>
                  </div>
                {/if}
                {#each ours as p (p.slot)}
                  <span class="member" class:win={p.team === m.winning_team}>
                    <span class="member-result" aria-label={p.team === m.winning_team ? 'Win' : 'Loss'}>{p.team === m.winning_team ? 'W' : 'L'}</span>
                    <span class="member-identity">
                      <strong>{p.member?.name}</strong>
                      <span class="sub">{p.hero.name}</span>
                    </span>
                    <span class="member-stats">
                      <span class="num">{p.kills}/{p.deaths}/{p.assists}</span>
                      <span class="sub num">KDR {ratio(p.kills, p.deaths)}</span>
                    </span>
                  </span>
                {:else}
                  <span class="sub">No group members in this match</span>
                {/each}
              </div>
            </a>
          </li>
        {/each}
      </ol>
    {/if}
  {:catch err}
    <section class="panel state"><h2>Couldn’t load matches</h2><p>{err.message}</p></section>
  {/await}
</div>

<style>
  .page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.5rem; }
  .intro { display: grid; gap: 0.35rem; }
  h1 { font-family: var(--display); font-weight: 800; font-size: clamp(2.2rem, 5vw, 3rem); line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; }
  .intro p, .sub { color: var(--muted); }
  .state { display: grid; gap: 0.4rem; color: var(--muted); }
  .state h2 { color: var(--fg); font-size: 1.1rem; }
  .toolbar { display: flex; align-items: center; flex-wrap: wrap; gap: 0.65rem 0.9rem; }
  .toolbar label { color: var(--muted); font-size: 0.88rem; }
  select { color: var(--fg); background: var(--panel-2); border: 1px solid var(--line); border-radius: 4px; padding: 0.35rem 0.5rem; }
  .players { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 0.35rem 0.7rem; margin-left: auto; }
  .players a { color: var(--member); font-weight: 600; text-decoration: none; }
  .players a:hover { text-decoration: underline; }
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
  .row {
    display: grid; grid-template-columns: 7rem minmax(0, 1.3fr) minmax(0, 1fr); gap: 1rem 1.5rem; align-items: center;
    text-decoration: none; transition: border-color 0.15s, background 0.15s;
  }
  .row:hover { border-color: var(--faint); background: var(--panel-2); }
  .meta { display: grid; align-content: center; gap: 0.3rem; }
  .meta-top { display: flex; align-items: center; flex-wrap: wrap; gap: 0.45rem; }
  .mode { font-family: var(--display); font-weight: 800; font-size: 1.6rem; line-height: 1; }
  .group-result { display: inline-flex; align-items: center; border: 1px solid var(--line); border-radius: 99px; padding: 0.08rem 0.45rem; font-size: 0.66rem; font-weight: 700; letter-spacing: 0.04em; line-height: 1.4; text-transform: uppercase; color: var(--muted); white-space: nowrap; }
  .group-result.win { color: var(--good); border-color: color-mix(in srgb, var(--good) 45%, var(--line)); }
  .group-result.loss { color: var(--bad); border-color: color-mix(in srgb, var(--bad) 45%, var(--line)); }
  .group-result.split { color: var(--amber); border-color: color-mix(in srgb, var(--amber) 45%, var(--line)); }
  .date { font-size: 0.9rem; font-weight: 600; }
  .teams { display: grid; gap: 0.4rem; min-width: 0; }
  .team { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
  .tname { width: 9.5rem; flex: none; display: inline-flex; align-items: center; gap: 0.45rem; font-size: 0.82rem; font-weight: 600; color: var(--muted); }
  .team.won .tname { color: var(--team); }
  .team-score { margin-left: auto; font-size: 0.95rem; color: var(--fg); }
  .winner { border-radius: 3px; padding: 0.05rem 0.25rem; color: var(--team); background: color-mix(in srgb, var(--team) 12%, transparent); font-size: 0.57rem; letter-spacing: 0.06em; }
  .heroes { display: flex; gap: 4px; flex-wrap: wrap; }
  .ours { display: grid; gap: 0.35rem; font-size: 0.9rem; min-width: 0; }
  .group-recap { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.2rem 0.65rem; padding-bottom: 0.35rem; border-bottom: 1px solid var(--line); }
  .recap-kda { display: inline-flex; align-items: baseline; gap: 0.35rem; margin-left: auto; }
  .recap-kda .label { font-size: 0.65rem; }
  .member { display: grid; grid-template-columns: 1.25rem minmax(0, 1fr) auto; align-items: center; gap: 0.25rem 0.55rem; min-width: 0; }
  .member-result { display: inline-grid; place-items: center; width: 1.15rem; height: 1.15rem; border: 1px solid color-mix(in srgb, var(--bad) 45%, var(--line)); border-radius: 50%; color: var(--bad); font-family: var(--display); font-size: 0.68rem; font-weight: 800; line-height: 1; }
  .member.win .member-result { color: var(--good); border-color: color-mix(in srgb, var(--good) 45%, var(--line)); }
  .member-identity { display: flex; align-items: baseline; flex-wrap: wrap; gap: 0.1rem 0.5rem; min-width: 0; }
  .member strong { color: var(--member); }
  .member-stats { display: inline-flex; align-items: center; gap: 0.65rem; white-space: nowrap; }
  @media (max-width: 35rem) {
    .member { grid-template-columns: 1.25rem minmax(0, 1fr); }
    .member-stats { grid-column: 2; }
  }
  @media (max-width: 52rem) {
    .row { grid-template-columns: 1fr; }
    .meta { display: flex; gap: 0.75rem; align-items: baseline; }
  }
</style>
