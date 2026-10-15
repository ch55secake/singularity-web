<script lang="ts">
  import { listMatches } from '../lib/api'
  import { TEAMS, ago, mmss, ratio, when } from '../lib/format'
  import HeroIcon from '../components/HeroIcon.svelte'
  import type { MatchSummary } from '../lib/types'

  const load = listMatches()
  let selectedMembers = $state<string[]>([])
  let selectedResult = $state('')
  let selectedHero = $state('')
  let dateFrom = $state('')
  let dateTo = $state('')

  const members = (m: MatchSummary) => m.players.filter((p) => p.member)
  const groupResult = (m: MatchSummary) => {
    const ours = members(m)
    if (ours.length === 0) return 'none'
    const wins = ours.filter((p) => p.team === m.winning_team).length
    return wins === ours.length ? 'win' : wins === 0 ? 'loss' : 'split'
  }
  const localDay = (unix: number) => {
    const date = new Date(unix * 1000)
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  }
  const filteredMatches = (matches: MatchSummary[]) => matches.filter((m) => {
    const ours = members(m)
    const friendMatch = selectedMembers.length === 0 || selectedMembers.some((name) => ours.some((p) => p.member?.name === name))
    const heroMatch = !selectedHero || m.players.some((p) => p.hero.name === selectedHero)
    const day = localDay(m.start_time)
    return friendMatch &&
      (!selectedResult || groupResult(m) === selectedResult) &&
      heroMatch &&
      (!dateFrom || day >= dateFrom) &&
      (!dateTo || day <= dateTo)
  })
  const toggleMember = (name: string, checked: boolean) => {
    selectedMembers = checked ? [...selectedMembers, name] : selectedMembers.filter((item) => item !== name)
  }
  const clearFilters = () => {
    selectedMembers = []
    selectedResult = ''
    selectedHero = ''
    dateFrom = ''
    dateTo = ''
  }
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
    {@const visibleMatches = filteredMatches(matches)}
    {@const memberNames = [...new Set(matches.flatMap((m) => m.players.flatMap((p) => p.member ? [p.member.name] : [])))].sort()}
    {@const heroNames = [...new Set(matches.flatMap((m) => m.players.map((p) => p.hero.name)))].sort()}
    <section class="toolbar panel">
      <fieldset class="member-filter">
        <legend>Friends</legend>
        <details>
          <summary>{selectedMembers.length ? `${selectedMembers.length} selected` : 'Any friend'}</summary>
          <div class="member-options">
            {#each memberNames as name}
              <label><input type="checkbox" checked={selectedMembers.includes(name)} onchange={(event) => toggleMember(name, event.currentTarget.checked)} />{name}</label>
            {/each}
          </div>
        </details>
        <span class="filter-hint">matches with any selected friend</span>
      </fieldset>
      <label class="filter-control">Group result
        <select bind:value={selectedResult}>
          <option value="">Any result</option>
          <option value="win">Group win</option>
          <option value="loss">Group loss</option>
          <option value="split">Split</option>
          <option value="none">No friends</option>
        </select>
      </label>
      <label class="filter-control">Hero
        <select bind:value={selectedHero}>
          <option value="">Any hero</option>
          {#each heroNames as hero}<option value={hero}>{hero}</option>{/each}
        </select>
      </label>
      <label class="filter-control">From
        <input type="date" bind:value={dateFrom} />
      </label>
      <label class="filter-control">To
        <input type="date" bind:value={dateTo} />
      </label>
      {#if selectedMembers.length || selectedResult || selectedHero || dateFrom || dateTo}
        <button class="clear" type="button" onclick={clearFilters}>Clear filters</button>
      {/if}
      <span class="sub count" aria-live="polite">{visibleMatches.length} of {matches.length} matches</span>
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
    {:else if visibleMatches.length === 0}
      <section class="panel state">
        <h2>No matches for these filters</h2>
        <p>Try different friends, results, heroes, or dates.</p>
      </section>
    {:else}
      <ol class="list">
        {#each visibleMatches as m (m.uuid)}
          {@const ours = members(m)}
          {@const groupWins = ours.filter((p) => p.team === m.winning_team).length}
          {@const groupResult = ours.length === 0 ? 'No group' : groupWins === ours.length ? 'Group win' : groupWins === 0 ? 'Group loss' : 'Split' }
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
  .toolbar > label, .member-filter { color: var(--muted); font-size: 0.82rem; }
  .member-filter { display: grid; gap: 0.25rem; margin: 0; padding: 0; border: 0; }
  .member-filter legend { padding: 0; }
  .member-filter details { position: relative; }
  .member-filter summary { color: var(--fg); background: var(--panel-2); border: 1px solid var(--line); border-radius: 4px; padding: 0.35rem 0.5rem; cursor: pointer; list-style-position: inside; }
  .member-options { position: absolute; z-index: 2; top: calc(100% + 0.25rem); left: 0; display: grid; gap: 0.35rem; min-width: 14rem; max-height: 16rem; overflow: auto; padding: 0.6rem; background: var(--panel-2); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: 0 0.5rem 1.5rem #0008; }
  .member-options label { display: flex; align-items: center; gap: 0.5rem; padding: 0.2rem; color: var(--fg); cursor: pointer; }
  .member-options input { accent-color: var(--member); }
  .filter-hint { color: var(--faint); font-size: 0.68rem; }
  .filter-control { display: grid; gap: 0.25rem; }
  select { color: var(--fg); background: var(--panel-2); border: 1px solid var(--line); border-radius: 4px; padding: 0.35rem 0.5rem; }
  input[type='date'] { color: var(--fg); background: var(--panel-2); border: 1px solid var(--line); border-radius: 4px; padding: 0.3rem 0.4rem; }
  .clear { align-self: end; padding: 0.35rem 0; border: 0; background: none; color: var(--member); cursor: pointer; }
  .clear:hover { text-decoration: underline; }
  .count { align-self: end; }
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
