<script lang="ts">
  import HeroIcon from './HeroIcon.svelte'
  import { fmt, pct } from '../lib/format'
  import type { MatchDetail } from '../lib/types'

  let { match, focus }: { match: MatchDetail; focus: number | null } = $props()

  const p = $derived(match.players.find((x) => x.slot === focus) ?? match.players[0])
  const sources = $derived(p.damage_by_source)
  const maxSource = $derived(Math.max(1, ...sources.map((s) => s.total)))
  const targets = $derived.by(() => {
    const totals = new Map<number, number>()
    for (const s of sources) for (const [slot, d] of Object.entries(s.by_target)) totals.set(+slot, (totals.get(+slot) ?? 0) + d)
    return [...totals].map(([slot, dmg]) => ({ player: match.players.find((x) => x.slot === slot)!, dmg }))
      .filter((t) => t.player).sort((a, b) => b.dmg - a.dmg)
  })
  const maxTarget = $derived(Math.max(1, ...targets.map((t) => t.dmg)))
  const KIND: Record<string, string> = { weapon: 'Gun', melee: 'Melee', ability: 'Ability', upgrade: 'Item' }
</script>

<div class="grid">
  <div class="col">
    <h3 class="label">What did the damage <span class="num">· {fmt(p.hero_damage)} total</span></h3>
    {#if sources.length === 0}
      <p class="sub">No damage to enemy heroes recorded.</p>
    {:else}
      <ol>
        {#each sources as s (s.source)}
          <li>
            <span class="icon">{#if s.icon}<img src={s.icon} alt="" loading="lazy" />{/if}</span>
            <span class="name">{s.name} <span class="kind">{KIND[s.kind] ?? ''}</span></span>
            <span class="track"><span class="fill {s.kind}" style:width="{(s.total / maxSource) * 100}%"></span></span>
            <span class="val num">{fmt(s.total)} <span class="sub">{Math.round(pct(s.total, p.hero_damage))}%</span></span>
          </li>
        {/each}
      </ol>
    {/if}
  </div>
  <div class="col">
    <h3 class="label">Who they hit</h3>
    <ol>
      {#each targets as t (t.player.slot)}
        <li class="team-{t.player.team}">
          <HeroIcon hero={t.player.hero} team={t.player.team} size={24} />
          <span class="name">{t.player.hero.name}{#if t.player.member}<span class="tag">{t.player.member.name}</span>{/if}</span>
          <span class="track"><span class="fill target" style:width="{(t.dmg / maxTarget) * 100}%"></span></span>
          <span class="val num">{fmt(t.dmg)}</span>
        </li>
      {/each}
    </ol>
  </div>
</div>

<style>
  .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); gap: 1.5rem 2.5rem; }
  .col { display: grid; gap: 0.6rem; align-content: start; min-width: 0; }
  ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 0.45rem; }
  li { display: grid; grid-template-columns: 24px minmax(6rem, 10rem) 1fr auto; align-items: center; gap: 0.6rem; font-size: 0.88rem; }
  .icon { width: 24px; height: 24px; border-radius: 4px; background: var(--panel-2); overflow: hidden; display: grid; place-items: center; }
  .icon img { width: 100%; height: 100%; object-fit: contain; }
  .name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .kind { color: var(--faint); font-size: 0.75rem; margin-left: 0.25rem; }
  .tag { color: var(--member); font-size: 0.75rem; margin-left: 0.35rem; }
  .track { height: 0.6rem; background: var(--panel-2); border-radius: 4px; overflow: hidden; }
  .fill { display: block; height: 100%; border-radius: 0 4px 4px 0; background: #d9dce3; }
  .fill.ability { background: #a98bf0; }
  .fill.melee { background: #e07fb0; }
  .fill.upgrade { background: #5fc2c9; }
  .fill.target { background: var(--team); }
  .val { text-align: right; min-width: 5.5rem; }
  .sub { color: var(--muted); font-size: 0.8rem; }
</style>
