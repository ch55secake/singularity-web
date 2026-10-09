<script lang="ts">
  import { listMatches } from '../lib/api'
  import { TEAMS, ago, mmss, ratio, when } from '../lib/format'
  import HeroIcon from '../components/HeroIcon.svelte'
  import type { MatchSummary } from '../lib/types'

  const load = listMatches()

  const members = (m: MatchSummary) => m.players.filter((p) => p.member)
</script>

<svelte:head><title>Matches · Singularity</title></svelte:head>

<div class="page">
  <header class="intro">
    <h1>Matches</h1>
    <p>Every Deadlock match the group’s ingest apps have sent to rake, newest first.</p>
  </header>

  {#await load}
    <p class="state">Loading matches…</p>
  {:then matches}
    {#if matches.length === 0}
      <section class="panel state">
        <h2>No matches yet</h2>
        <p>Matches appear here a few minutes after someone in the group finishes a game with the ingest app running.</p>
      </section>
    {:else}
      <ol class="list">
        {#each matches as m (m.uuid)}
          {@const ours = members(m)}
          <li>
            <a class="row panel" href="/m/{m.uuid}">
              <div class="meta">
                <span class="mode">{m.mode}</span>
                <span class="label">{ago(m.start_time)}</span>
                <span class="sub num" title={when(m.start_time)}>{mmss(m.duration_s)}</span>
              </div>
              <div class="teams">
                {#each [0, 1] as const as t}
                  <div class="team team-{t}" class:won={m.winning_team === t}>
                    <span class="tname">{TEAMS[t].short}{m.winning_team === t ? ' · won' : ''}</span>
                    <span class="heroes">
                      {#each m.players.filter((p) => p.team === t) as p (p.slot)}
                        <HeroIcon hero={p.hero} team={t} size={30} />
                      {/each}
                    </span>
                  </div>
                {/each}
              </div>
              <div class="ours">
                {#each ours as p (p.slot)}
                  <span class="member" class:win={p.team === m.winning_team}>
                    <span class="result">{p.team === m.winning_team ? 'W' : 'L'}</span>
                    <strong>{p.member?.name}</strong>
                    <span class="sub">{p.hero.name}</span>
                    <span class="num">{p.kills}/{p.deaths}/{p.assists}</span>
                    <span class="sub num">KDR {ratio(p.kills, p.deaths)}</span>
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
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
  .row {
    display: grid; grid-template-columns: 7rem minmax(0, 1.3fr) minmax(0, 1fr); gap: 1rem 1.5rem; align-items: center;
    text-decoration: none; transition: border-color 0.15s, background 0.15s;
  }
  .row:hover { border-color: var(--faint); background: var(--panel-2); }
  .meta { display: grid; gap: 0.1rem; }
  .mode { font-family: var(--display); font-weight: 800; font-size: 1.6rem; line-height: 1; }
  .teams { display: grid; gap: 0.4rem; min-width: 0; }
  .team { display: flex; align-items: center; gap: 0.75rem; min-width: 0; }
  .tname { width: 7.5rem; flex: none; font-size: 0.82rem; font-weight: 600; color: var(--muted); }
  .team.won .tname { color: var(--team); }
  .heroes { display: flex; gap: 4px; flex-wrap: wrap; }
  .ours { display: grid; gap: 0.35rem; font-size: 0.9rem; min-width: 0; }
  .member { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0.25rem 0.6rem; }
  .member strong { color: var(--member); }
  .result { font-family: var(--display); font-weight: 800; color: var(--bad); width: 1rem; }
  .member.win .result { color: var(--good); }
  @media (max-width: 52rem) {
    .row { grid-template-columns: 1fr; }
    .meta { display: flex; gap: 0.75rem; align-items: baseline; }
  }
</style>
