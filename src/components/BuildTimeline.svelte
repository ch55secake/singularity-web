<script lang="ts">
  import { mmss } from '../lib/format'
  import type { BuildEntry, MatchDetail } from '../lib/types'

  let { match, focus }: { match: MatchDetail; focus: number | null } = $props()

  const p = $derived(match.players.find((x) => x.slot === focus) ?? match.players[0])
  const items = $derived(p.build.filter((b) => b.kind === 'item'))
  // Each ability shows up once when unlocked and again for each upgrade.
  const abilities = $derived.by(() => {
    const rows = new Map<number, { name: string; icon: string | null; steps: BuildEntry[] }>()
    for (const b of p.build) {
      if (b.kind !== 'ability') continue
      if (!rows.has(b.id)) rows.set(b.id, { name: b.name, icon: b.icon, steps: [] })
      rows.get(b.id)!.steps.push(b)
    }
    return [...rows.values()]
  })
  const maxSteps = $derived(Math.max(0, ...abilities.map((a) => a.steps.length)))
</script>

<div class="wrap">
  <div>
    <h3 class="label">Items in the order bought</h3>
    {#if items.length === 0}
      <p class="sub">No items bought.</p>
    {:else}
      <ol class="items">
        {#each items as it, i (i)}
          <li class:sold={it.sold_t !== null} class="tier-{it.tier ?? 0}"
            title="{it.name}{it.tier ? ` · tier ${it.tier}` : ''} · bought {mmss(it.t)}{it.sold_t ? ` · sold ${mmss(it.sold_t)}` : ''}">
            <span class="img">{#if it.icon}<img src={it.icon} alt="" loading="lazy" />{:else}{it.name.slice(0, 2)}{/if}</span>
            <span class="t num">{mmss(it.t)}</span>
            <span class="n">{it.name}</span>
          </li>
        {/each}
      </ol>
      <p class="sub">Faded items were sold later. Hover for times.</p>
    {/if}
  </div>

  <div>
    <h3 class="label">Ability points</h3>
    <div class="scroll-x data-scroll" role="region" aria-label="Ability upgrade timeline">
      <table class="num">
        <thead><tr><th class="l">Ability</th>{#each { length: maxSteps } as _, i (i)}<th>{i === 0 ? 'Unlocked' : `Upgrade ${i}`}</th>{/each}</tr></thead>
        <tbody>
          {#each abilities as a (a.name)}
            <tr>
              <td class="l"><span class="ab">{#if a.icon}<img src={a.icon} alt="" loading="lazy" />{/if}{a.name}</span></td>
              {#each { length: maxSteps } as _, i (i)}
                <td>{a.steps[i] ? mmss(a.steps[i].t) : ''}</td>
              {/each}
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  </div>
</div>

<style>
  .wrap { display: grid; gap: 1.75rem; }
  .wrap > div { display: grid; gap: 0.6rem; min-width: 0; }
  .sub { color: var(--muted); font-size: 0.82rem; }
  .items { list-style: none; margin: 0; padding: 0; display: grid; grid-template-columns: repeat(auto-fill, minmax(5.2rem, 1fr)); gap: 0.6rem; }
  .items li { display: grid; justify-items: center; gap: 0.15rem; text-align: center; font-size: 0.75rem; }
  .img { width: 3rem; height: 3rem; border-radius: 6px; background: var(--panel-2); display: grid; place-items: center; overflow: hidden; border: 2px solid var(--tier, var(--line)); color: var(--muted); }
  .img img { width: 80%; height: 80%; object-fit: contain; }
  .tier-1 { --tier: #6b7280; } .tier-2 { --tier: #4aa36c; } .tier-3 { --tier: #4b93f2; } .tier-4 { --tier: #a98bf0; }
  .t { color: var(--muted); }
  .n { line-height: 1.2; max-width: 100%; overflow: hidden; text-overflow: ellipsis; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
  li.sold { opacity: 0.4; }
  table { border-collapse: separate; border-spacing: 0; font-size: 0.88rem; min-width: 32rem; width: 100%; }
  th, td { padding: 0.4rem 0.6rem; text-align: center; white-space: nowrap; border-top: 1px solid var(--line); }
  th { position: sticky; top: 0; z-index: 3; background: var(--panel); font-size: 0.7rem; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); font-weight: 600; border-top: 0; }
  .l { position: sticky; left: 0; z-index: 2; min-width: 10rem; text-align: left; background: var(--panel); box-shadow: 1px 0 0 var(--line); }
  thead .l { z-index: 4; }
  .ab { display: inline-flex; align-items: center; gap: 0.5rem; }
  .ab img { width: 24px; height: 24px; border-radius: 4px; background: var(--panel-2); }
</style>
