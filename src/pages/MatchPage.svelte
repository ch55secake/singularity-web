<script lang="ts">
  import { getLaneStats, getMatch } from '../lib/api'
  import { TEAMS, fmt, mmss, when } from '../lib/format'
  import { route, setHash } from '../lib/router.svelte'
  import Scoreboard from '../components/Scoreboard.svelte'
  import SoulsAdvantage from '../components/SoulsAdvantage.svelte'
  import AimTable from '../components/AimTable.svelte'
  import DamageBreakdown from '../components/DamageBreakdown.svelte'
  import BuildTimeline from '../components/BuildTimeline.svelte'
  import MapView from '../components/MapView.svelte'
  import LaneStatsPanel from '../components/LaneStatsPanel.svelte'
  import PlayerPicker from '../components/PlayerPicker.svelte'
  import HeroIcon from '../components/HeroIcon.svelte'
  import LoadingSkeleton from '../components/LoadingSkeleton.svelte'
  import StatePanel from '../components/StatePanel.svelte'
  import Icon from '../components/Icon.svelte'
  import { notify } from '../lib/toast.svelte'
  import type { LaneStats, MatchDetail } from '../lib/types'

  let { uuid }: { uuid: string } = $props()

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'combat', label: 'Combat' },
    { id: 'map', label: 'Map' },
    { id: 'builds', label: 'Builds' },
    { id: 'lane', label: 'Lane' },
  ]
  const tab = $derived(TABS.some((t) => t.id === route.hash) ? route.hash : 'overview')

  let match = $state<MatchDetail | null>(null)
  let error = $state<string | null>(null)
  let focus = $state<number | null>(null)
  let laneStats = $state<LaneStats | null>(null)
  let laneError = $state<string | null>(null)
  let laneState = $state<'idle' | 'loading' | 'ready' | 'error'>('idle')
  const focusedPlayer = $derived(match?.players.find((p) => p.slot === focus) ?? null)

  function selectTab(id: string) {
    setHash(id === 'overview' ? '' : id)
  }

  function loadLaneStats() {
    laneState = 'loading'
    laneError = null
    getLaneStats(uuid).then(
      (stats) => {
        laneStats = stats
        laneState = 'ready'
      },
      (e: Error) => {
        laneError = e.message
        laneState = 'error'
      },
    )
  }

  async function copyMatchLink() {
    try {
      await navigator.clipboard.writeText(location.href)
      notify('Match link copied', 'success')
    } catch {
      notify('Couldn’t copy the match link', 'error')
    }
  }

  function onTabKeydown(event: KeyboardEvent) {
    const currentIndex = TABS.findIndex((t) => t.id === tab)
    let nextIndex: number | null = null
    if (event.key === 'ArrowRight') nextIndex = (currentIndex + 1) % TABS.length
    if (event.key === 'ArrowLeft') nextIndex = (currentIndex - 1 + TABS.length) % TABS.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = TABS.length - 1
    if (nextIndex === null) return

    event.preventDefault()
    const nextTab = TABS[nextIndex]
    selectTab(nextTab.id)
    document.getElementById(`match-tab-${nextTab.id}`)?.focus()
  }

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

  $effect(() => {
    if (tab === 'lane' && laneState === 'idle') loadLaneStats()
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
  <StatePanel kind="error" title="Couldn’t load this match" message={error} actionLabel="Try again" onaction={() => location.reload()} />
{:else if !match}
  <LoadingSkeleton variant="detail" label="Loading match details" />
{:else}
  <div class="page">
    <nav class="breadcrumb match-crumb" aria-label="Breadcrumb">
      <a href="/">Matches</a><Icon name="chevron-right" size={14} /><span class="current">Match {match.match_id}</span>
      <button class="copy-link" type="button" onclick={copyMatchLink}><Icon name="copy" size={14} />Copy link</button>
    </nav>
    <header class="hero panel">
      <div class="side team-0" class:won={match.winning_team === 0}>
        <span class="label">{TEAMS[0].name}</span>
        <span class="outcome">{match.winning_team === 0 ? 'Victory' : 'Defeat'}</span>
        <span class="sub num">{fmt(teamSouls[0])} souls</span>
        <span class="lineup" aria-label="{TEAMS[0].name} lineup">{#each match.players.filter((p) => p.team === 0) as p (p.slot)}<HeroIcon hero={p.hero} team={0} size={28} />{/each}</span>
      </div>
      <div class="centre">
        <div class="score num"><span class="team-0">{teamKills[0]}</span><span class="dash">–</span><span class="team-1">{teamKills[1]}</span></div>
        <div class="facts num">
          <span>{match.mode}</span><span>{mmss(match.duration_s)}</span><span>{when(match.start_time)}</span>
        </div>
        {#if match.average_badge.some((badge) => badge !== null && badge > 0)}
          <span class="sub num">Average badge {Math.round(match.average_badge.filter((badge): badge is number => badge !== null && badge > 0).reduce((sum, badge) => sum + badge, 0) / match.average_badge.filter((badge): badge is number => badge !== null && badge > 0).length)}</span>
        {/if}
        <span class="sub num">Match {match.match_id}</span>
      </div>
      <div class="side right team-1" class:won={match.winning_team === 1}>
        <span class="label">{TEAMS[1].name}</span>
        <span class="outcome">{match.winning_team === 1 ? 'Victory' : 'Defeat'}</span>
        <span class="sub num">{fmt(teamSouls[1])} souls</span>
        <span class="lineup" aria-label="{TEAMS[1].name} lineup">{#each match.players.filter((p) => p.team === 1) as p (p.slot)}<HeroIcon hero={p.hero} team={1} size={28} />{/each}</span>
      </div>
    </header>

    <div class="tabs" role="tablist" aria-label="Match sections" tabindex="-1" onkeydown={onTabKeydown}>
      {#each TABS as t (t.id)}
        <button id="match-tab-{t.id}" type="button" role="tab" aria-selected={tab === t.id} aria-controls="match-tabpanel" tabindex={tab === t.id ? 0 : -1} class:active={tab === t.id} onclick={() => selectTab(t.id)}>{t.label}</button>
      {/each}
    </div>

    <div class="tab-context" aria-live="polite">
      <span class="label">Following</span>
      {#if focusedPlayer}
        <HeroIcon hero={focusedPlayer.hero} team={focusedPlayer.team} size={28} />
        <strong>{focusedPlayer.member?.name ?? focusedPlayer.hero.name}</strong>
        {#if focusedPlayer.member}<span class="sub">{focusedPlayer.hero.name}</span>{/if}
      {/if}
    </div>

    <div id="match-tabpanel" role="tabpanel" aria-labelledby="match-tab-{tab}" tabindex="0">
      {#key tab}
        <div class="tab-content">
          {#if tab === 'overview'}
            <Scoreboard {match} bind:focus />
            <SoulsAdvantage {match} />
          {:else if tab === 'combat'}
            <AimTable {match} bind:focus />
            <section class="panel">
              <div class="panel-head"><h2>Damage breakdown</h2><PlayerPicker players={match.players} bind:focus /></div>
              <DamageBreakdown {match} {focus} />
            </section>
          {:else if tab === 'map'}
            <MapView {match} bind:focus />
          {:else if tab === 'lane'}
            {#if laneState === 'idle' || laneState === 'loading'}
              <p class="lane-loading" aria-live="polite">Loading lane stats…</p>
            {:else if laneState === 'error'}
              <StatePanel kind="error" title="Couldn’t load lane stats" message={laneError ?? 'Try again in a moment.'} actionLabel="Retry" onaction={loadLaneStats} />
            {:else if laneStats}
              <LaneStatsPanel lane={laneStats} {match} />
            {/if}
          {:else if tab === 'builds'}
            <section class="panel">
              <div class="panel-head"><h2>Build order</h2><PlayerPicker players={match.players} bind:focus /></div>
              <BuildTimeline {match} {focus} />
            </section>
          {/if}
        </div>
      {/key}
    </div>
  </div>
{/if}

<style>
  .page { display: grid; grid-template-columns: minmax(0, 1fr); gap: 1rem; }
  .sub { color: var(--muted); font-size: 0.85rem; }
  .match-crumb { min-height: 1.8rem; }
  .copy-link { display: inline-flex; align-items: center; gap: 0.35rem; margin-left: auto; padding: 0.3rem 0.5rem; border: 1px solid transparent; border-radius: 5px; background: none; color: var(--muted); font-size: 0.75rem; cursor: pointer; }
  .copy-link:hover { color: var(--fg); border-color: var(--line); background: rgb(255 255 255 / 0.03); }
  .hero { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 1rem; padding: 1.5rem; position: relative; overflow: hidden; }
  .hero::before, .hero::after { content: ''; position: absolute; top: 0; bottom: 0; width: 40%; opacity: 0.12; pointer-events: none; }
  .hero::before { left: 0; background: linear-gradient(90deg, var(--amber), transparent); }
  .hero::after { right: 0; background: linear-gradient(270deg, var(--sapphire), transparent); }
  .side { display: grid; gap: 0.1rem; position: relative; }
  .side.right { text-align: right; }
  .lineup { display: flex; flex-wrap: wrap; gap: 0.25rem; margin-top: 0.5rem; }
  .side.right .lineup { justify-content: flex-end; }
  .outcome { font-family: var(--display); font-weight: 800; font-size: clamp(1.8rem, 4.5vw, 2.8rem); line-height: 1; text-transform: uppercase; color: var(--faint); }
  .side.won .outcome { color: var(--team); }
  .centre { display: grid; justify-items: center; gap: 0.25rem; position: relative; }
  .score { font-family: var(--display); font-weight: 800; font-size: clamp(2.8rem, 7vw, 4.2rem); line-height: 0.9; display: flex; gap: 0.5rem; text-shadow: 0 0 24px rgb(255 255 255 / 0.08); }
  .score .team-0 { color: var(--amber); }
  .score .team-1 { color: var(--sapphire); }
  .dash { color: var(--faint); }
  .facts { display: flex; flex-wrap: wrap; justify-content: center; gap: 0.2rem 0.9rem; font-size: 0.88rem; }
  .tabs { display: flex; gap: 0.25rem; border-bottom: 1px solid var(--line); overflow-x: auto; }
  .tabs button { position: relative; background: none; border: 0; padding: 0.65rem 0.9rem; font-weight: 600; color: var(--muted); cursor: pointer; white-space: nowrap; transition: color var(--duration-fast) ease, background var(--duration-fast) ease; }
  .tabs button::after { content: ''; position: absolute; right: 0.7rem; bottom: -1px; left: 0.7rem; height: 2px; border-radius: 2px 2px 0 0; background: linear-gradient(90deg, var(--amber), var(--sapphire)); transform: scaleX(0); transition: transform var(--duration-fast) var(--ease-out); }
  .tabs button:hover { color: var(--fg); background: linear-gradient(180deg, transparent, rgb(255 255 255 / 0.035)); }
  .tabs button.active { color: var(--fg); }
  .tabs button.active::after { transform: scaleX(1); }
  .tabs button:focus-visible { outline-offset: -2px; }
  .tab-context { display: flex; align-items: center; gap: 0.55rem; min-height: 2.25rem; color: var(--fg); }
  .tab-context strong { font-size: 0.9rem; }
  .lane-loading { padding: 1rem; color: var(--muted); }
  #match-tabpanel { min-width: 0; }
  #match-tabpanel:focus-visible { outline: 2px solid var(--sapphire); outline-offset: 3px; border-radius: var(--radius); }
  .tab-content { display: grid; gap: 1rem; min-width: 0; animation: tab-in 220ms var(--ease-out) both; }
  @keyframes tab-in {
    from { opacity: 0; transform: translateY(0.35rem); }
    to { opacity: 1; transform: none; }
  }
  @media (max-width: 40rem) {
    .hero { grid-template-columns: 1fr 1fr; }
    .centre { grid-column: 1 / -1; order: -1; }
    .lineup { display: none; }
  }
</style>
