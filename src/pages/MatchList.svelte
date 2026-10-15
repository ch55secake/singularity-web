<script lang="ts">
  import { listMatches } from '../lib/api'
  import { TEAMS, ago, mmss, ratio, when } from '../lib/format'
  import HeroIcon from '../components/HeroIcon.svelte'
  import LoadingSkeleton from '../components/LoadingSkeleton.svelte'
  import StatePanel from '../components/StatePanel.svelte'
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
    <LoadingSkeleton variant="list" label="Loading matches" />
  {:then matches}
    {@const visibleMatches = filteredMatches(matches)}
    {@const memberNames = [...new Set(matches.flatMap((m) => m.players.flatMap((p) => p.member ? [p.member.name] : [])))].sort()}
    {@const heroNames = [...new Set(matches.flatMap((m) => m.players.map((p) => p.hero.name)))].sort()}
    <section class="toolbar panel">
      <div class="filters">
        <fieldset class="member-filter">
          <legend>Friends</legend>
          <details>
            <summary>{selectedMembers.length ? `${selectedMembers.length} selected` : 'Any friend'}</summary>
            <div class="member-options">
              <span class="filter-hint">Matches with any selected friend</span>
              {#each memberNames as name}
                <label><input type="checkbox" checked={selectedMembers.includes(name)} onchange={(event) => toggleMember(name, event.currentTarget.checked)} />{name}</label>
              {/each}
            </div>
          </details>
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
      </div>
      {#if memberNames.length}
        <nav class="players" aria-label="Player pages">
          <span class="label">Player pages</span>
          {#each memberNames as name}<a href="/p/{encodeURIComponent(name)}">{name}</a>{/each}
        </nav>
      {/if}
    </section>

    {#if matches.length === 0}
      <StatePanel title="No matches yet" message="Matches appear a few minutes after someone finishes a game with the ingest app running." />
    {:else if visibleMatches.length === 0}
      <StatePanel title="No matching games" message="Try different friends, results, heroes, or dates." actionLabel="Clear filters" onaction={clearFilters} />
    {:else}
      <ol class="list">
        {#each visibleMatches as m (m.uuid)}
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
    <StatePanel kind="error" title="Couldn’t load matches" message={err.message} actionLabel="Try again" onaction={() => location.reload()} />
  {/await}
</div>

<style>
  .page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1.5rem; }
  .intro { display: grid; gap: 0.35rem; }
  h1 { font-family: var(--display); font-weight: 800; font-size: clamp(2.2rem, 5vw, 3rem); line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; }
  .intro p, .sub { color: var(--muted); }
  .toolbar { display: grid; gap: 0.9rem; }
  .filters { display: flex; align-items: end; flex-wrap: wrap; gap: 0.65rem 0.9rem; }
  .filters > label, .member-filter { color: var(--muted); font-size: 0.78rem; font-weight: 600; }
  .member-filter { display: grid; gap: 0.25rem; margin: 0; padding: 0; border: 0; }
  .member-filter legend { padding: 0; }
  .member-filter details { position: relative; }
  .member-filter summary { min-height: 2.35rem; display: flex; align-items: center; justify-content: space-between; gap: 0.75rem; color: var(--fg); background: var(--panel-2); border: 1px solid var(--line); border-radius: 7px; padding: 0.45rem 0.65rem; cursor: pointer; list-style: none; transition: border-color var(--duration-fast) ease, background var(--duration-fast) ease; }
  .member-filter summary::-webkit-details-marker { display: none; }
  .member-filter summary::after { content: ''; width: 0.42rem; height: 0.42rem; border-right: 1.5px solid var(--muted); border-bottom: 1.5px solid var(--muted); transform: rotate(45deg) translateY(-2px); transition: transform var(--duration-fast) var(--ease-out); }
  .member-filter details[open] summary::after { transform: rotate(225deg) translate(-1px, -1px); }
  .member-filter summary:hover { border-color: var(--faint); background: color-mix(in srgb, var(--panel-2) 94%, white); }
  .member-options { position: absolute; z-index: 2; top: calc(100% + 0.25rem); left: 0; display: grid; gap: 0.35rem; min-width: 14rem; max-height: 16rem; overflow: auto; padding: 0.6rem; background: var(--panel-2); border: 1px solid var(--line); border-radius: var(--radius); box-shadow: 0 0.5rem 1.5rem #0008; }
  .member-options label { display: flex; align-items: center; gap: 0.5rem; padding: 0.35rem 0.4rem; border-radius: 5px; color: var(--fg); cursor: pointer; transition: background var(--duration-fast) ease; }
  .member-options label:hover { background: rgb(255 255 255 / 0.045); }
  .member-options input { accent-color: var(--member); }
  .filter-hint { padding: 0.1rem 0.4rem 0.3rem; color: var(--faint); font-size: 0.68rem; font-weight: 500; }
  .filter-control { display: grid; gap: 0.25rem; }
  select, input[type='date'] { min-height: 2.35rem; color: var(--fg); background: var(--panel-2); border: 1px solid var(--line); border-radius: 7px; padding: 0.4rem 0.65rem; transition: border-color var(--duration-fast) ease, box-shadow var(--duration-fast) ease; }
  select:hover, input[type='date']:hover { border-color: var(--faint); }
  select:focus, input[type='date']:focus { border-color: color-mix(in srgb, var(--sapphire) 70%, var(--line)); box-shadow: 0 0 0 3px color-mix(in srgb, var(--sapphire) 13%, transparent); }
  .clear { min-height: 2.35rem; align-self: end; padding: 0.4rem 0.7rem; border: 1px solid color-mix(in srgb, var(--member) 28%, var(--line)); border-radius: 7px; background: color-mix(in srgb, var(--member) 7%, transparent); color: var(--member); cursor: pointer; transition: border-color var(--duration-fast) ease, background var(--duration-fast) ease, transform var(--duration-fast) var(--ease-out); }
  .clear:hover { border-color: color-mix(in srgb, var(--member) 55%, var(--line)); background: color-mix(in srgb, var(--member) 12%, transparent); transform: translateY(-1px); }
  .clear:active { transform: none; }
  .count { min-height: 2.35rem; display: inline-flex; align-items: center; margin-left: auto; }
  .players { display: inline-flex; align-items: center; flex-wrap: wrap; gap: 0.35rem 0.7rem; padding-top: 0.85rem; border-top: 1px solid var(--line); }
  .players a { color: var(--member); font-weight: 600; text-decoration: none; }
  .players a:hover { text-decoration: underline; }
  .list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.6rem; }
  .row {
    position: relative; overflow: hidden;
    display: grid; grid-template-columns: 7rem minmax(0, 1.3fr) minmax(0, 1fr); gap: 1rem 1.5rem; align-items: center;
    text-decoration: none; transform: translateY(0); transition: border-color var(--duration-fast) ease, background var(--duration-fast) ease, box-shadow var(--duration-fast) ease, transform var(--duration-fast) var(--ease-out);
  }
  .row::before { content: ''; position: absolute; inset: -1px 14% auto; height: 1px; background: linear-gradient(90deg, transparent, var(--amber), var(--sapphire), transparent); opacity: 0; transition: opacity var(--duration-fast) ease; }
  .row:hover, .row:focus-visible { border-color: #3b3d45; background: var(--panel-2); box-shadow: 0 18px 42px rgb(0 0 0 / 0.24); transform: translateY(-2px); }
  .row:hover::before, .row:focus-visible::before { opacity: 0.85; }
  .row:active { transform: translateY(0) scale(0.997); }
  .row :global(.icon) { transition: transform var(--duration-fast) var(--ease-out), filter var(--duration-fast) ease; }
  .row:hover :global(.icon), .row:focus-visible :global(.icon) { transform: translateY(-1px); filter: saturate(1.12) brightness(1.05); }
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
