<script lang="ts">
  import { getMatch } from '../lib/api'
  import { TEAMS, fmt, mmss, when } from '../lib/format'
  import { route, setHash } from '../lib/router.svelte'
  import Scoreboard from '../components/Scoreboard.svelte'
  import SoulsAdvantage from '../components/SoulsAdvantage.svelte'
  import AimTable from '../components/AimTable.svelte'
  import DamageBreakdown from '../components/DamageBreakdown.svelte'
  import PlayerPicker from '../components/PlayerPicker.svelte'
  import type { MatchDetail } from '../lib/types'

  let { uuid }: { uuid: string } = $props()

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'combat', label: 'Combat' },
  ]
  const tab = $derived(TABS.some((t) => t.id === route.hash) ? route.hash : 'overview')

  let match = $state<MatchDetail | null>(null)
  let error = $state<string | null>(null)
  let focus = $state<number | null>(null)

  $effect(() => {
    getMatch(uuid).then(
    (m) => {
      match = m
      const firstMember = m.players.find((p) => p.member)
      focus = (firstMember ?? [...m.players].sort((a, b) => b.hero_damage - a.hero_damage)[0]).slot
    },
    (e: Error) => (error = e.message),
  )
  })

  const teamKills = $derived(
    match ? ([0, 1] as const).map((t) => match!.players.filter((p) => p.team === t).reduce((a, p) => a + p.kills, 0)) : [0, 0],
  )
  const teamSouls = $derived(
    match ? ([0, 1] as const).map((t) => match!.players.filter((p) => p.team === t).reduce((a, p) => a + p.souls, 0)) : [0, 0],
  )
</script>

<svelte:head>
  <title>{match ? `${TEAMS[match.winning_team].short} win · ${match.mode} · Singularity` : 'Match · Singularity'}</title>
</svelte:head>

{#if error}
  <section class="panel state"><h1>Couldn’t load this match</h1><p>{error}</p><p><a href="/">Back to all matches</a></p></section>
{:else if !match}
  <p class="state">Loading match…</p>
{:else}
  <div class="page">
    <header class="hero panel">
      <div class="side team-0" class:won={match.winning_team === 0}>
        <span class="label">{TEAMS[0].name}</span>
        <span class="outcome">{match.winning_team === 0 ? 'Victory' : 'Defeat'}</span>
        <span class="sub num">{fmt(teamSouls[0])} souls</span>
      </div>
      <div class="centre">
        <div class="score num"><span class="team-0">{teamKills[0]}</span><span class="dash">–</span><span class="team-1">{teamKills[1]}</span></div>
        <div class="facts num">
          <span>{match.mode}</span><span>{mmss(match.duration_s)}</span><span>{when(match.start_time)}</span>
        </div>
        <span class="sub num">Match {match.match_id}</span>
      </div>
      <div class="side right team-1" class:won={match.winning_team === 1}>
        <span class="label">{TEAMS[1].name}</span>
        <span class="outcome">{match.winning_team === 1 ? 'Victory' : 'Defeat'}</span>
        <span class="sub num">{fmt(teamSouls[1])} souls</span>
      </div>
    </header>

    <nav class="tabs" aria-label="Match sections">
      {#each TABS as t}
        <button class:active={tab === t.id} aria-pressed={tab === t.id} onclick={() => setHash(t.id === 'overview' ? '' : t.id)}>{t.label}</button>
      {/each}
    </nav>

    {#if tab === 'overview'}
      <Scoreboard {match} bind:focus />
      <SoulsAdvantage {match} />
    {:else if tab === 'combat'}
      <AimTable {match} bind:focus />
      <section class="panel">
        <div class="panel-head"><h2>Damage breakdown</h2><PlayerPicker players={match.players} bind:focus /></div>
        <DamageBreakdown {match} {focus} />
      </section>
    {/if}
  </div>
{/if}

<style>
  .page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }
  .state { display: grid; gap: 0.4rem; color: var(--muted); }
  .state h1 { color: var(--fg); font-size: 1.3rem; }
  .sub { color: var(--muted); font-size: 0.85rem; }
  .hero { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; gap: 1rem; padding: 1.5rem; position: relative; overflow: hidden; }
  .hero::before, .hero::after { content: ''; position: absolute; top: 0; bottom: 0; width: 40%; opacity: 0.12; pointer-events: none; }
  .hero::before { left: 0; background: linear-gradient(90deg, var(--amber), transparent); }
  .hero::after { right: 0; background: linear-gradient(270deg, var(--sapphire), transparent); }
  .side { display: grid; gap: 0.1rem; position: relative; }
  .side.right { text-align: right; }
  .outcome { font-family: var(--display); font-weight: 800; font-size: clamp(1.8rem, 4.5vw, 2.8rem); line-height: 1; text-transform: uppercase; color: var(--faint); }
  .side.won .outcome { color: var(--team); }
  .centre { display: grid; justify-items: center; gap: 0.25rem; position: relative; }
  .score { font-family: var(--display); font-weight: 800; font-size: clamp(2.4rem, 6vw, 3.6rem); line-height: 1; display: flex; gap: 0.4rem; }
  .score .team-0 { color: var(--amber); }
  .score .team-1 { color: var(--sapphire); }
  .dash { color: var(--faint); }
  .facts { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.2rem 0.9rem; font-size: 0.88rem; }
  .tabs { display: flex; gap: 0.25rem; border-bottom: 1px solid var(--line); overflow-x: auto; }
  .tabs button { background: none; border: 0; border-bottom: 2px solid transparent; padding: 0.6rem 0.9rem; font-weight: 600; color: var(--muted); cursor: pointer; white-space: nowrap; }
  .tabs button:hover { color: var(--fg); }
  .tabs button.active { color: var(--fg); border-bottom-color: var(--fg); }
  @media (max-width: 40rem) {
    .hero { grid-template-columns: 1fr 1fr; }
    .centre { grid-column: 1 / -1; order: -1; }
  }
</style>
