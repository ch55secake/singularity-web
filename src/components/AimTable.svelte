<script lang="ts">
  import HeroIcon from './HeroIcon.svelte'
  import PlayerPicker from './PlayerPicker.svelte'
  import { fmt, pct } from '../lib/format'
  import type { MatchDetail, Player } from '../lib/types'

  let { match, focus = $bindable() }: { match: MatchDetail; focus: number | null } = $props()

  const minutes = $derived(match.duration_s / 60)
  type Stat = { key: string; label: string; help: string; value: (p: Player) => number; show: (v: number) => string; higherIsBetter: boolean }
  const stats: Stat[] = $derived([
    { key: 'acc', label: 'Accuracy', help: 'Share of all shots that hit something', value: (p) => pct(p.aim.shots_hit, p.aim.shots_hit + p.aim.shots_missed), show: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
    { key: 'crit', label: 'Hero crit rate', help: 'Share of hits on heroes that were headshots', value: (p) => pct(p.aim.hero_crits, p.aim.hero_hits), show: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
    { key: 'hits', label: 'Hero hits', help: 'Bullets that hit an enemy hero', value: (p) => p.aim.hero_hits, show: (v) => fmt(v), higherIsBetter: true },
    { key: 'dpm', label: 'Damage / min', help: 'Damage to enemy heroes per minute', value: (p) => p.hero_damage / minutes, show: (v) => fmt(Math.round(v)), higherIsBetter: true },
    { key: 'taken', label: 'Taken / min', help: 'Damage taken per minute', value: (p) => p.damage_taken / minutes, show: (v) => fmt(Math.round(v)), higherIsBetter: false },
    { key: 'mit', label: 'Mitigated', help: 'Damage blocked by resistances and shields', value: (p) => p.damage_mitigated, show: (v) => fmt(Math.round(v)), higherIsBetter: true },
  ])

  const avg = $derived(Object.fromEntries(stats.map((s) => [s.key, match.players.reduce((a, p) => a + s.value(p), 0) / match.players.length])))
  const focused = $derived(match.players.find((p) => p.slot === focus) ?? match.players[0])

  function delta(s: Stat, p: Player) {
    const a = avg[s.key]
    if (!a) return { text: '–', good: null as boolean | null }
    const d = ((s.value(p) - a) / a) * 100
    const good = Math.abs(d) < 5 ? null : (d > 0) === s.higherIsBetter
    return { text: `${d > 0 ? '+' : ''}${Math.round(d)}% vs lobby`, good }
  }

  const rows = $derived([...match.players].sort((a, b) => a.team - b.team || b.hero_damage - a.hero_damage))
  const kills = (p: Player) => {
    const k = p.kill_types
    const total = k.bullet + k.ability + k.melee
    return { total, parts: [
      { label: 'Gun', n: k.bullet, cls: 'gun' },
      { label: 'Ability', n: k.ability, cls: 'ability' },
      { label: 'Melee', n: k.melee, cls: 'melee' },
    ] }
  }
</script>

<section class="panel">
  <div class="panel-head">
    <h2>Aim &amp; combat</h2>
    <PlayerPicker players={match.players} bind:focus />
  </div>

  <div class="who">
    <HeroIcon hero={focused.hero} team={focused.team} size={44} />
    <div>
      <strong>{focused.hero.name}</strong>
      {#if focused.member}<span class="tag">{focused.member.name}</span>{/if}
      <p class="sub">Compared with the average of all {match.players.length} players in this match.</p>
    </div>
  </div>

  <div class="cards">
    {#each stats as s (s.key)}
      {@const d = delta(s, focused)}
      <div class="card" title={s.help}>
        <span class="label">{s.label}</span>
        <span class="big num">{s.show(s.value(focused))}</span>
        <span class="delta num" class:good={d.good === true} class:bad={d.good === false}>{d.text}</span>
      </div>
    {/each}
    {#each [kills(focused)] as k}
      <div class="card wide">
        <span class="label">How kills happened</span>
        {#if k.total === 0}
          <span class="sub">No kills this match</span>
        {:else}
          <div class="bar" role="img" aria-label={k.parts.map((x) => `${x.label} ${x.n}`).join(', ')}>
            {#each k.parts.filter((x) => x.n > 0) as x}<span class={x.cls} style:flex={x.n}></span>{/each}
          </div>
          <div class="keys num">
            {#each k.parts as x}<span><i class={x.cls}></i>{x.label} {x.n}</span>{/each}
            <span>Headshot kills {focused.kill_types.headshot}</span>
          </div>
        {/if}
      </div>
    {/each}
  </div>

  <h3 class="label all">All players</h3>
  <div class="scroll-x data-scroll" role="region" aria-label="Combat statistics for all players">
    <table class="num">
      <thead><tr><th class="l">Player</th>{#each stats as s}<th title={s.help}>{s.label}</th>{/each}<th>Kills G/A/M</th></tr></thead>
      <tbody>
        {#each rows as p (p.slot)}
          <tr class="team-{p.team}" class:focus={p.slot === focus} onclick={() => (focus = p.slot)}>
            <td class="l"><span class="pl"><HeroIcon hero={p.hero} team={p.team} size={26} />{p.hero.name}{#if p.member}<span class="tag">{p.member.name}</span>{/if}</span></td>
            {#each stats as s}
              {@const d = delta(s, p)}
              <td class:good={d.good === true} class:bad={d.good === false}>{s.show(s.value(p))}</td>
            {/each}
            <td>{p.kill_types.bullet}/{p.kill_types.ability}/{p.kill_types.melee}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  </div>
  <p class="note">Green and red mark players at least 5% better or worse than the lobby average.</p>
</section>

<style>
  .who { display: flex; gap: 0.75rem; align-items: center; margin-bottom: 1rem; }
  .who strong { font-size: 1.05rem; }
  .tag { color: var(--member); font-size: 0.8rem; font-weight: 600; margin-left: 0.5rem; }
  .sub, .note { color: var(--muted); font-size: 0.85rem; }
  .note { margin-top: 0.75rem; }
  .cards { display: grid; grid-template-columns: repeat(auto-fill, minmax(10.5rem, 1fr)); gap: 0.6rem; }
  .card { background: var(--panel-2); border-radius: 6px; padding: 0.85rem 1rem; display: grid; gap: 0.2rem; align-content: start; }
  .card.wide { grid-column: span 2; }
  .big { font-family: var(--display); font-weight: 800; font-size: 2rem; line-height: 1.05; }
  .delta { font-size: 0.8rem; color: var(--muted); }
  .good { color: var(--good) !important; }
  .bad { color: var(--bad) !important; }
  .bar { display: flex; gap: 2px; height: 0.7rem; border-radius: 4px; overflow: hidden; margin: 0.45rem 0 0.35rem; }
  .gun { background: #d9dce3; }
  .ability { background: #a98bf0; }
  .melee { background: #e07fb0; }
  .keys { display: flex; flex-wrap: wrap; gap: 0.2rem 0.9rem; font-size: 0.8rem; color: var(--muted); }
  .keys span { display: inline-flex; align-items: center; gap: 0.35rem; }
  .keys i { width: 0.55rem; height: 0.55rem; border-radius: 2px; display: inline-block; }
  .all { margin: 1.5rem 0 0.5rem; }
  table { width: 100%; border-collapse: separate; border-spacing: 0; font-size: 0.88rem; min-width: 50rem; }
  th, td { padding: 0.4rem 0.55rem; text-align: right; white-space: nowrap; }
  th { position: sticky; top: 0; z-index: 3; background: var(--panel); box-shadow: 0 1px 0 var(--line); font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 600; }
  td { color: var(--fg); border-top: 1px solid var(--line); }
  .l { position: sticky; left: 0; z-index: 2; min-width: 10.5rem; text-align: left; background: var(--panel); box-shadow: 1px 0 0 var(--line); }
  thead .l { z-index: 4; }
  tbody tr { cursor: pointer; }
  tbody tr:hover, tr.focus { background: var(--panel-2); }
  tbody tr:hover .l, tr.focus .l { background: var(--panel-2); }
  tr.focus .l { box-shadow: inset 3px 0 0 var(--team), 1px 0 0 var(--line); }
  .pl { display: inline-flex; align-items: center; gap: 0.5rem; }
  @media (max-width: 30rem) { .card.wide { grid-column: auto; } }
</style>
