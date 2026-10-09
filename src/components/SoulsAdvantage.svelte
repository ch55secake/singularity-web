<script lang="ts">
  import { TEAMS, compact, fmt, mmss } from '../lib/format'
  import type { MatchDetail } from '../lib/types'

  let { match }: { match: MatchDetail } = $props()

  const W = 760, H = 260, L = 52, R = 16, T = 16, B = 30
  const times = $derived(match.players[0].timeline.t)
  const totals = $derived(([0, 1] as const).map((t) =>
    times.map((_, i) => match.players.filter((p) => p.team === t).reduce((a, p) => a + p.timeline.souls[i], 0))))
  // Positive = Amber ahead.
  const lead = $derived(times.map((_, i) => totals[0][i] - totals[1][i]))
  const flat = $derived(lead.every((v) => v === 0))
  const span = $derived(niceSpan(Math.max(1000, ...lead.map(Math.abs))))
  const tmax = $derived(times[times.length - 1])
  const x = (t: number) => L + ((W - L - R) * t) / tmax
  const y = (v: number) => T + ((H - T - B) * (span - v)) / (2 * span)

  function niceSpan(v: number) {
    const p = 10 ** Math.floor(Math.log10(v)), f = v / p
    return (f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10) * p
  }

  const line = $derived([[0, 0], ...times.map((t, i) => [t, lead[i]])].map(([t, v]) => `${x(t)},${y(v)}`).join(' '))
  const area = $derived(`M${x(0)},${y(0)} L${line.split(' ').join(' L')} L${x(tmax)},${y(0)} Z`)
  const ticks = $derived([-span, -span / 2, 0, span / 2, span])
  const xticks = $derived(Array.from({ length: Math.floor(tmax / 300) + 1 }, (_, i) => i * 300))

  let hover = $state<number | null>(null)
  let svg = $state<SVGSVGElement>()
  function move(e: PointerEvent) {
    if (!svg) return
    const r = svg.getBoundingClientRect()
    const px = ((e.clientX - r.left) * W) / r.width
    let best = 0
    times.forEach((t, i) => { if (Math.abs(x(t) - px) < Math.abs(x(times[best]) - px)) best = i })
    hover = best
  }
</script>

<section class="panel">
  <div class="panel-head">
    <h2>Souls lead</h2>
    <span class="legend"><span class="team-0"><i></i>{TEAMS[0].short} ahead</span><span class="team-1"><i></i>{TEAMS[1].short} ahead</span></span>
  </div>
  {#if flat}
    <p class="note">Both teams had the same souls all game. This looks like a fixed-economy mode, so there’s no lead to chart.</p>
  {:else}
    <div class="chart">
      <svg bind:this={svg} viewBox="0 0 {W} {H}" role="img" aria-label="Team souls lead over time" onpointermove={move} onpointerleave={() => (hover = null)}>
        <defs>
          <clipPath id="above"><rect x={L} y={T} width={W - L - R} height={y(0) - T} /></clipPath>
          <clipPath id="below"><rect x={L} y={y(0)} width={W - L - R} height={H - B - y(0)} /></clipPath>
        </defs>
        {#each ticks as v}
          <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} class:zero={v === 0} />
          <text x={L - 8} y={y(v) + 4} text-anchor="end">{v === 0 ? 'Even' : compact(Math.abs(v))}</text>
        {/each}
        {#each xticks as t}
          <text x={x(t)} y={H - 8} text-anchor="middle">{t / 60}m</text>
        {/each}
        <path d={area} clip-path="url(#above)" fill="var(--amber)" opacity="0.22" />
        <path d={area} clip-path="url(#below)" fill="var(--sapphire)" opacity="0.22" />
        <polyline points={line} clip-path="url(#above)" stroke="var(--amber)" />
        <polyline points={line} clip-path="url(#below)" stroke="var(--sapphire)" />
        {#if hover !== null}
          <line class="cross" x1={x(times[hover])} x2={x(times[hover])} y1={T} y2={H - B} />
          <circle cx={x(times[hover])} cy={y(lead[hover])} r="5" fill={lead[hover] >= 0 ? 'var(--amber)' : 'var(--sapphire)'} stroke="var(--panel)" stroke-width="2" />
        {/if}
      </svg>
      {#if hover !== null}
        {@const i = hover}
        <div class="tip num" style:left="{(x(times[i]) / W) * 100}%">
          <strong>{mmss(times[i])}</strong>
          <span class="team-0"><i></i>{TEAMS[0].short}: {fmt(totals[0][i])}</span>
          <span class="team-1"><i></i>{TEAMS[1].short}: {fmt(totals[1][i])}</span>
          <span>{lead[i] === 0 ? 'Even' : `${lead[i] > 0 ? TEAMS[0].short : TEAMS[1].short} +${fmt(Math.abs(lead[i]))}`}</span>
        </div>
      {/if}
    </div>
    <p class="note">Total souls (net worth) of each team, sampled at {times.length} points in the match.</p>
  {/if}
</section>

<style>
  .legend { display: flex; gap: 1rem; font-size: 0.82rem; color: var(--muted); }
  .legend span, .tip span { display: inline-flex; align-items: center; gap: 0.4rem; }
  i { width: 0.6rem; height: 0.6rem; border-radius: 50%; background: var(--team); display: inline-block; }
  .chart { position: relative; }
  svg { display: block; width: 100%; height: auto; touch-action: none; }
  line { stroke: var(--line); stroke-width: 1; }
  line.zero { stroke: var(--faint); }
  line.cross { stroke: var(--muted); stroke-dasharray: 3 3; }
  polyline { fill: none; stroke-width: 2; stroke-linejoin: round; }
  text { fill: var(--muted); font-size: 11px; font-family: var(--body); font-variant-numeric: tabular-nums; }
  .tip {
    position: absolute; top: 0; transform: translateX(-50%); pointer-events: none;
    display: grid; gap: 0.1rem; padding: 0.45rem 0.65rem; font-size: 0.8rem; white-space: nowrap;
    background: var(--panel-2); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 6px 18px rgb(0 0 0 / 0.35);
  }
  .note { margin-top: 0.75rem; color: var(--muted); font-size: 0.85rem; }
</style>
