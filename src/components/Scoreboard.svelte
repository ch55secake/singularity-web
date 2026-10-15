<script lang="ts">
  import HeroIcon from './HeroIcon.svelte'
  import { TEAMS, fmt, pct, ratio } from '../lib/format'
  import type { MatchDetail, Player } from '../lib/types'

  let { match, focus = $bindable() }: { match: MatchDetail; focus: number | null } = $props()

  const minutes = $derived(match.duration_s / 60)
  const impactValue = (value: number) => {
    const rounded = Math.abs(value) < 0.05 ? 0 : value
    return `${rounded > 0 ? '+' : ''}${rounded.toFixed(1)}`
  }
  type Col = { key: string; label: string; title: string; value: (p: Player) => number; show: (p: Player) => string; best?: 'max' | 'min' }
  const cols: Col[] = [
    { key: 'k', label: 'K', title: 'Kills', value: (p) => p.kills, show: (p) => String(p.kills), best: 'max' },
    { key: 'd', label: 'D', title: 'Deaths', value: (p) => p.deaths, show: (p) => String(p.deaths), best: 'min' },
    { key: 'a', label: 'A', title: 'Assists', value: (p) => p.assists, show: (p) => String(p.assists), best: 'max' },
    { key: 'kdr', label: 'KDR', title: 'Kills per death', value: (p) => p.kills / Math.max(p.deaths, 1), show: (p) => ratio(p.kills, p.deaths), best: 'max' },
    { key: 'kda', label: 'KDA', title: '(Kills + assists) per death', value: (p) => (p.kills + p.assists) / Math.max(p.deaths, 1), show: (p) => ratio(p.kills + p.assists, p.deaths), best: 'max' },
    { key: 'souls', label: 'Souls', title: 'Net worth at the end', value: (p) => p.souls, show: (p) => fmt(p.souls), best: 'max' },
    { key: 'dmg', label: 'Hero dmg', title: 'Damage to enemy heroes', value: (p) => p.hero_damage, show: (p) => fmt(p.hero_damage), best: 'max' },
    { key: 'dpm', label: 'Dmg/min', title: 'Hero damage per minute', value: (p) => p.hero_damage / minutes, show: (p) => fmt(Math.round(p.hero_damage / minutes)), best: 'max' },
    { key: 'heal', label: 'Healing', title: 'Healing done', value: (p) => p.healing, show: (p) => fmt(p.healing), best: 'max' },
    { key: 'lh', label: 'LH', title: 'Last hits', value: (p) => p.last_hits, show: (p) => String(p.last_hits), best: 'max' },
    { key: 'acc', label: 'Acc', title: 'Shots hit', value: (p) => pct(p.aim.shots_hit, p.aim.shots_hit + p.aim.shots_missed), show: (p) => `${Math.round(pct(p.aim.shots_hit, p.aim.shots_hit + p.aim.shots_missed))}%`, best: 'max' },
    { key: 'impact', label: 'Impact', title: 'Lobby-relative impact score, from -5 to +5; zero is average', value: (p) => p.impact.score, show: (p) => impactValue(p.impact.score), best: 'max' },
  ]

  const bests = $derived(Object.fromEntries(cols.map((c) => {
    const vals = match.players.map(c.value)
    return [c.key, c.best === 'min' ? Math.min(...vals) : Math.max(...vals)]
  })))

  const teams = $derived(([match.winning_team, 1 - match.winning_team] as (0 | 1)[]).map((t) => ({
    t, players: match.players.filter((p) => p.team === t).sort((a, b) => b.souls - a.souls),
  })))
</script>

<section class="panel">
  <div class="panel-head">
    <h2>Scoreboard</h2>
    <span class="hint">Click a player to follow them across tabs. <span class="best-key">Bold</span> marks the best in the match.</span>
  </div>
  <div class="scroll-x">
    <table class="num">
      <thead>
        <tr><th class="who">Player</th>{#each cols as c}<th title={c.title}>{c.label}</th>{/each}</tr>
      </thead>
      {#each teams as { t, players } (t)}
        <tbody class="team-{t}">
          <tr class="team-row"><th colspan={cols.length + 1}><span class="swatch"></span>{TEAMS[t].name}{t === match.winning_team ? ' · Victory' : ' · Defeat'}</th></tr>
          {#each players as p (p.slot)}
            <tr class:focus={focus === p.slot} class:member={!!p.member} onclick={() => (focus = p.slot)}>
              <td class="who">
                <button class="who-btn" onclick={() => (focus = p.slot)} aria-pressed={focus === p.slot}>
                  <HeroIcon hero={p.hero} team={t} size={32} />
                  <span class="names">
                    <span class="hero">{p.hero.name}</span>
                    {#if p.member}<span class="tag">{p.member.name}</span>{/if}
                  </span>
                </button>
              </td>
              {#each cols as c}
                <td class:best={c.value(p) === bests[c.key]}
                  class:positive={c.key === 'impact' && p.impact.score > 0}
                  class:negative={c.key === 'impact' && p.impact.score < 0}
                  title={c.key === 'impact' ? `Combat ${impactValue(p.impact.combat)} · Economy ${impactValue(p.impact.economy)} · Utility ${impactValue(p.impact.utility)} · Survival ${impactValue(p.impact.survival)} · v${match.impact_score_version}` : undefined}>{c.show(p)}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      {/each}
    </table>
  </div>
</section>

<style>
  .hint { font-size: 0.82rem; color: var(--muted); }
  .best-key { font-weight: 700; color: var(--fg); }
  table { width: 100%; border-collapse: collapse; font-size: 0.9rem; min-width: 52rem; }
  th, td { padding: 0.45rem 0.55rem; text-align: right; white-space: nowrap; }
  thead th { font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 600; border-bottom: 1px solid var(--line); }
  .who { text-align: left; }
  .team-row th { text-align: left; padding-top: 1rem; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.04em; color: var(--team); text-transform: uppercase; }
  .swatch { display: inline-block; width: 0.6rem; height: 0.6rem; border-radius: 2px; background: var(--team); margin-right: 0.5rem; }
  tbody tr:not(.team-row) { border-top: 1px solid var(--line); cursor: pointer; }
  tbody tr:not(.team-row):hover { background: var(--panel-2); }
  tr.focus { background: var(--panel-2); box-shadow: inset 3px 0 0 var(--team); }
  td { color: var(--muted); }
  td.best { color: var(--fg); font-weight: 700; }
  td.positive { color: var(--good); }
  td.negative { color: var(--bad); }
  .who-btn { display: flex; align-items: center; gap: 0.65rem; background: none; border: 0; padding: 0; cursor: pointer; text-align: left; }
  .names { display: grid; line-height: 1.2; }
  .hero { color: var(--fg); font-weight: 600; }
  .tag { color: var(--member); font-size: 0.78rem; font-weight: 600; }
</style>
