<script lang="ts">
  import { onDestroy } from 'svelte'
  import HeroIcon from './HeroIcon.svelte'
  import PlayerPicker from './PlayerPicker.svelte'
  import Icon from './Icon.svelte'
  import { uniqueItemPurchases } from '../lib/build'
  import { mmss } from '../lib/format'
  import type { BuildEntry, MatchDetail, ObjectiveEvent, Path, Player, ReplayResourceEvent, ResourceReparseStatus } from '../lib/types'

  let { match, focus = $bindable(), resourceReparseStatus = null }: {
    match: MatchDetail
    focus: number | null
    resourceReparseStatus?: ResourceReparseStatus | null
  } = $props()

  const TEAM_COLOURS = ['#e8a33a', '#4b93f2']
  const TRAIL_S = 12
  const KILL_FLASH_S = 6
  const LANE_PHASE_END_S = 600
  const LANE_ZOOM = 2.4

  // ?t=600 opens the replay at that second, so a moment can be shared as a link.
  let t = $state(Math.max(0, Number(new URLSearchParams(location.search).get('t')) || 0))
  let playing = $state(false)
  let laneOnly = $state(false)
  let speed = $state(16)
  let showTrails = $state(true)
  let showDeaths = $state(true)
  let showObjectives = $state(true)
  let showJungle = $state(true)
  let showSinners = $state(true)
  let showHeat = $state(false)

  const bySlot = $derived(new Map(match.players.map((p) => [p.slot, p])))
  const samples = $derived(Math.max(...Object.values(match.paths.players).map((p) => p.x.length)))
  const replayEnd = $derived(Math.min(match.duration_s, (samples - 1) * match.paths.interval_s))
  const playbackEnd = $derived(laneOnly ? Math.min(replayEnd, LANE_PHASE_END_S) : replayEnd)
  const deathsSoFar = $derived(match.deaths.filter((d) => d.t <= t))
  const focusedPlayer = $derived(focus === null ? null : bySlot.get(focus) ?? null)
  const lanePlayerSlots = $derived.by(() => {
    if (!laneOnly) return new Set(match.players.map((player) => player.slot))
    if (focusedPlayer?.assigned_lane == null) return new Set(focusedPlayer ? [focusedPlayer.slot] : [])
    return new Set(match.players
      .filter((player) => player.assigned_lane === focusedPlayer.assigned_lane)
      .map((player) => player.slot))
  })
  const playersInView = $derived(match.players.filter((player) => lanePlayerSlots.has(player.slot)))
  const deathsInView = $derived(deathsSoFar.filter((death) =>
    lanePlayerSlots.has(death.killer) || lanePlayerSlots.has(death.victim),
  ))
  type KeyMoment =
    | { id: string; t: number; kind: 'kill'; killer: Player | null; victim: Player | null }
    | { id: string; t: number; kind: 'purchase'; player: Player; item: BuildEntry }
    | { id: string; t: number; kind: 'objective'; objective: ObjectiveEvent }
  const allKeyMoments = $derived.by(() => {
    const kills: KeyMoment[] = match.deaths.map((death, index) => ({
      id: `kill-${index}`,
      t: death.t,
      kind: 'kill',
      killer: bySlot.get(death.killer) ?? null,
      victim: bySlot.get(death.victim) ?? null,
    }))
    const purchases: KeyMoment[] = match.players.flatMap((player) =>
      uniqueItemPurchases(player.build).map((entry, index) => ({
        id: `purchase-${player.slot}-${index}`,
        t: entry.t,
        kind: 'purchase',
        player,
        item: entry,
      })),
    )
    const objectives: KeyMoment[] = match.objectives.map((objective, index) => ({
      id: `objective-${index}`,
      t: objective.t,
      kind: 'objective',
      objective,
    }))
    return [...kills, ...purchases, ...objectives].sort((a, b) => a.t - b.t)
  })
  const keyMoments = $derived.by(() => {
    if (!laneOnly) return allKeyMoments
    return allKeyMoments.filter((moment) => {
      if (moment.kind === 'purchase') return lanePlayerSlots.has(moment.player.slot)
      if (moment.kind === 'kill') {
        return (moment.killer !== null && lanePlayerSlots.has(moment.killer.slot))
          || (moment.victim !== null && lanePlayerSlots.has(moment.victim.slot))
      }
      return false
    })
  })
  const liveMoments = $derived(keyMoments.filter((moment) => moment.t <= t).reverse())
  const followedName = $derived(focusedPlayer?.member?.name ?? focusedPlayer?.hero.name ?? 'Player')

  const objectiveLabel = (objective: ObjectiveEvent) => ({
    guardian: 'Guardian',
    walker: 'Walker',
    shrine: 'Shrine',
    base_guardian: 'Base Guardian',
    patron: 'Patron',
    patron_core: 'Patron Core',
    mid_boss: 'Mid Boss',
  })[objective.kind]
  const objectiveSymbol = (kind: ObjectiveEvent['kind']) => ({
    guardian: 'G',
    walker: 'W',
    shrine: 'S',
    base_guardian: 'B',
    patron: 'P',
    patron_core: 'C',
    mid_boss: 'M',
  })[kind]
  const objectiveKindForKey = (key: string): ObjectiveEvent['kind'] | null => {
    if (key === 'mid_boss') return 'mid_boss'
    if (key.endsWith('_core')) return 'patron_core'
    if (key.endsWith('_titan')) return 'patron'
    if (/_tier1_\d+$/.test(key)) return 'guardian'
    if (/_tier2_\d+$/.test(key)) return 'walker'
    return null
  }
  const objectiveMarkers = $derived.by(() =>
    Object.entries(match.map.objective_positions ?? {}).flatMap(([key, position]) => {
      const kind = objectiveKindForKey(key)
      if (!kind) return []
      const capturedAt = match.objectives.find((event) => event.position_key === key)?.t ?? null
      return [{
        key,
        kind,
        team: key === 'mid_boss' ? null : key.startsWith('team1_') ? 1 : 0,
        position,
        capturedAt,
      }]
    }),
  )
  const standingObjectives = $derived(
    objectiveMarkers.filter((objective) => objective.capturedAt === null || t < objective.capturedAt),
  )
  const activeResources = $derived.by(() => {
    const active = new Map<string, ReplayResourceEvent>()
    for (const event of match.resources ?? []) {
      if (event.t > t) break
      const key = `${event.kind}-${event.entity_index}`
      if (event.active) active.set(key, event)
      else active.delete(key)
    }
    return [...active.values()]
  })
  const jungleCamps = $derived.by(() => {
    const clusters: { x: number; y: number; count: number }[] = []
    const campRadius = 450
    for (const resource of activeResources
      .filter((event) => event.kind === 'neutral')
      .sort((a, b) => a.entity_index - b.entity_index)) {
      const [x, y] = resource.position
      const cluster = clusters.find((candidate) =>
        (candidate.x - x) ** 2 + (candidate.y - y) ** 2 <= campRadius ** 2,
      )
      if (cluster) {
        cluster.x = (cluster.x * cluster.count + x) / (cluster.count + 1)
        cluster.y = (cluster.y * cluster.count + y) / (cluster.count + 1)
        cluster.count += 1
      } else {
        clusters.push({ x, y, count: 1 })
      }
    }
    return clusters
  })
  const activeSinners = $derived(activeResources.filter((event) => event.kind === 'sinner'))

  let canvas: HTMLCanvasElement
  let box: HTMLDivElement
  let size = $state(600)
  let img: HTMLImageElement | null = $state(null)
  let imgFailed = $state(false)

  $effect(() => {
    const i = new Image()
    i.onload = () => (img = i)
    i.onerror = () => (imgFailed = true)
    i.src = match.map.image
  })

  $effect(() => {
    const ro = new ResizeObserver(([e]) => (size = Math.floor(e.contentRect.width)))
    ro.observe(box)
    return () => ro.disconnect()
  })

  // Animation loop for playback.
  let raf = 0
  let last = 0
  function tick(now: number) {
    if (!playing) return
    if (last) t = Math.min(playbackEnd, t + ((now - last) / 1000) * speed)
    last = now
    if (t >= playbackEnd) playing = false
    else raf = requestAnimationFrame(tick)
  }
  function toggle() {
    if (playing) { playing = false; return }
    if (t >= playbackEnd) t = 0
    playing = true
    last = 0
    raf = requestAnimationFrame(tick)
  }
  onDestroy(() => cancelAnimationFrame(raf))

  function worldToPx(x: number, y: number): [number, number] {
    const r = match.map.radius
    return [((x + r) / (2 * r)) * size, ((r - y) / (2 * r)) * size]
  }

  function lastAlivePosition(path: Path | undefined, index: number): [number, number] | null {
    if (!path) return null
    for (let sample = Math.min(index, path.x.length - 1); sample >= 0; sample--) {
      if (path.health[sample] && Number.isFinite(path.x[sample]) && Number.isFinite(path.y[sample])) {
        return [path.x[sample], path.y[sample]]
      }
    }
    return null
  }

  function draw() {
    if (!canvas) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr
    const ctx = canvas.getContext('2d')!
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.fillStyle = '#11141a'
    ctx.fillRect(0, 0, size, size)
    const i = Math.min(samples - 1, Math.floor(t / match.paths.interval_s))
    const followedPath = focusedPlayer ? match.paths.players[focusedPlayer.slot] : undefined
    const cameraPosition = laneOnly ? lastAlivePosition(followedPath, i) : null
    const zoom = cameraPosition ? LANE_ZOOM : 1
    const cameraCenter = cameraPosition ? worldToPx(cameraPosition[0], cameraPosition[1]) : [size / 2, size / 2]
    const imageLeft = cameraPosition
      ? Math.max(size - size * zoom, Math.min(0, size / 2 - cameraCenter[0] * zoom))
      : 0
    const imageTop = cameraPosition
      ? Math.max(size - size * zoom, Math.min(0, size / 2 - cameraCenter[1] * zoom))
      : 0
    const project = (x: number, y: number): [number, number] => {
      const [px, py] = worldToPx(x, y)
      return cameraPosition ? [imageLeft + px * zoom, imageTop + py * zoom] : [px, py]
    }
    if (img) {
      // The minimap art is very dark; lift it so the lanes read on the dark page.
      ctx.filter = 'brightness(2.6) contrast(1.1)'
      ctx.drawImage(img, imageLeft, imageTop, size * zoom, size * zoom)
      ctx.filter = 'none'
    }

    if (showHeat && focusedPlayer) {
      const path = match.paths.players[focusedPlayer.slot]
      ctx.fillStyle = TEAM_COLOURS[focusedPlayer.team]
      ctx.globalAlpha = 0.05
      for (let j = 0; j <= i && j < path.x.length; j++) {
        if (!path.health[j]) continue
        const [px, py] = project(path.x[j], path.y[j])
        ctx.beginPath(); ctx.arc(px, py, Math.max(4, size / 90), 0, Math.PI * 2); ctx.fill()
      }
      ctx.globalAlpha = 1
    }

    if (showDeaths) {
      for (const d of deathsInView) {
        const victim = bySlot.get(d.victim)
        if (!victim) continue
        const [vx, vy] = project(d.victim_pos[0], d.victim_pos[1])
        const recent = t - d.t < KILL_FLASH_S
        if (recent) {
          const [kx, ky] = project(d.killer_pos[0], d.killer_pos[1])
          ctx.strokeStyle = 'rgba(255,255,255,0.7)'
          ctx.lineWidth = 1.5
          ctx.setLineDash([4, 3])
          ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(vx, vy); ctx.stroke()
          ctx.setLineDash([])
        }
        const s = recent ? 7 : 4
        ctx.strokeStyle = TEAM_COLOURS[victim.team]
        ctx.globalAlpha = recent ? 1 : 0.6
        ctx.lineWidth = recent ? 3 : 2
        ctx.beginPath(); ctx.moveTo(vx - s, vy - s); ctx.lineTo(vx + s, vy + s); ctx.moveTo(vx + s, vy - s); ctx.lineTo(vx - s, vy + s); ctx.stroke()
        ctx.globalAlpha = 1
      }
    }

    for (const p of playersInView) {
      const path = match.paths.players[p.slot]
      if (!path || i >= path.x.length || !path.health[i]) continue
      const colour = TEAM_COLOURS[p.team]
      if (showTrails) {
        ctx.strokeStyle = colour
        ctx.lineWidth = 2
        ctx.globalAlpha = 0.45
        ctx.beginPath()
        let started = false
        for (let j = Math.max(0, i - TRAIL_S); j <= i; j++) {
          if (!path.health[j]) { started = false; continue }
          const [px, py] = project(path.x[j], path.y[j])
          if (!started) { ctx.moveTo(px, py); started = true } else ctx.lineTo(px, py)
        }
        ctx.stroke()
        ctx.globalAlpha = 1
      }
      const [px, py] = project(path.x[i], path.y[i])
      const r = p.slot === focus ? 8 : 6
      ctx.beginPath(); ctx.arc(px, py, r, 0, Math.PI * 2)
      ctx.fillStyle = colour; ctx.fill()
      ctx.lineWidth = 2
      ctx.strokeStyle = p.slot === focus ? '#ffffff' : p.member ? '#c3a8ff' : '#11141a'
      ctx.stroke()
      if (p.slot === focus || p.member) {
        ctx.font = '600 11px "Public Sans", system-ui, sans-serif'
        ctx.fillStyle = '#ffffff'
        ctx.strokeStyle = '#11141a'
        ctx.lineWidth = 3
        const label = p.member?.name ?? p.hero.name
        ctx.strokeText(label, px + r + 4, py + 4)
        ctx.fillText(label, px + r + 4, py + 4)
      }
    }

    if (showObjectives) {
      for (const objective of standingObjectives) {
        if (!objective.position || match.map.radius <= 0) continue
        const [px, py] = project(objective.position[0], objective.position[1])
        const colour = objective.team === null ? '#d7d3ca' : TEAM_COLOURS[objective.team]
        ctx.beginPath()
        ctx.arc(px, py, 9, 0, Math.PI * 2)
        ctx.fillStyle = '#11141a'
        ctx.fill()
        ctx.strokeStyle = colour
        ctx.lineWidth = 2.5
        ctx.stroke()
        ctx.fillStyle = colour
        ctx.font = '700 10px "Public Sans", system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillText(objectiveSymbol(objective.kind), px, py)
        ctx.textAlign = 'start'
        ctx.textBaseline = 'alphabetic'
      }
    }

    if (showJungle) {
      for (const camp of jungleCamps) {
        const [px, py] = project(camp.x, camp.y)
        ctx.beginPath()
        ctx.arc(px, py, 8, 0, Math.PI * 2)
        ctx.fillStyle = '#11141a'
        ctx.fill()
        ctx.strokeStyle = '#e0b84a'
        ctx.lineWidth = 2
        ctx.stroke()
        ctx.beginPath()
        ctx.moveTo(px, py - 4)
        ctx.lineTo(px + 4, py + 3)
        ctx.lineTo(px - 4, py + 3)
        ctx.closePath()
        ctx.fillStyle = '#e0b84a'
        ctx.fill()
        if (camp.count > 1) {
          ctx.font = '700 8px "Public Sans", system-ui, sans-serif'
          ctx.textAlign = 'center'
          ctx.textBaseline = 'middle'
          ctx.fillStyle = '#11141a'
          ctx.fillText(String(camp.count), px, py + 0.5)
          ctx.textAlign = 'start'
          ctx.textBaseline = 'alphabetic'
        }
      }
    }

    if (showSinners) {
      for (const sinner of activeSinners) {
        const [px, py] = project(sinner.position[0], sinner.position[1])
        ctx.beginPath()
        ctx.arc(px, py, 9, 0, Math.PI * 2)
        ctx.fillStyle = '#11141a'
        ctx.fill()
        ctx.strokeStyle = '#bd91f0'
        ctx.lineWidth = 2.5
        ctx.stroke()
        ctx.font = '700 10px "Public Sans", system-ui, sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = '#e4d0ff'
        ctx.fillText('S', px, py)
        ctx.textAlign = 'start'
        ctx.textBaseline = 'alphabetic'
      }
    }
  }

  $effect(() => {
    // Redraw whenever anything the drawing reads changes.
    void [t, size, img, focus, laneOnly, lanePlayerSlots, playersInView, deathsInView, showTrails, showDeaths, showObjectives, standingObjectives, activeResources, jungleCamps, activeSinners, showJungle, showSinners, showHeat]
    draw()
  })

  function setLaneOnly(enabled: boolean) {
    playing = false
    laneOnly = enabled
    const end = enabled ? Math.min(replayEnd, LANE_PHASE_END_S) : replayEnd
    t = Math.min(t, end)
  }
  function jump(to: number) { t = Math.max(0, Math.min(playbackEnd, to)); playing = false }
  const name = (p: Player | null | undefined) => p ? (p.member ? `${p.member.name} (${p.hero.name})` : p.hero.name) : 'World'
</script>

<section class="panel">
  <div class="panel-head">
    <h2>Map replay</h2>
    <PlayerPicker players={match.players} bind:focus />
  </div>

  <div class="layout">
    <div class="stage">
      <div class="canvas-box" bind:this={box}>
        <canvas bind:this={canvas} style:width="{size}px" style:height="{size}px" aria-label={laneOnly ? `Zoomed lane view following ${followedName} at ${mmss(t)}` : `Map of player positions and replay-time jungle resources at ${mmss(t)}.`}></canvas>
        {#if imgFailed}<p class="imgnote">Map image didn’t load, so positions are shown on a blank map.</p>{/if}
      </div>
      <div class="controls">
        <div class="range" role="group" aria-label="Replay range">
          <button class:active={!laneOnly} aria-pressed={!laneOnly} onclick={() => setLaneOnly(false)}>Full match</button>
          <button class:active={laneOnly} aria-pressed={laneOnly} onclick={() => setLaneOnly(true)}>Lane view · 10m</button>
        </div>
        <button class="play" onclick={toggle} aria-label={playing ? 'Pause' : 'Play'}><Icon name={playing ? 'pause' : 'play'} size={16} /></button>
        <input type="range" id="map-time" min="0" max={playbackEnd} step="1" bind:value={t} oninput={() => (playing = false)} aria-label="Match time" />
        <span class="time num">{mmss(t)} / {mmss(playbackEnd)}</span>
        <label class="speed">Speed
          <select id="map-speed" bind:value={speed}>
            {#each [4, 8, 16, 32, 64] as s (s)}<option value={s}>{s}×</option>{/each}
          </select>
        </label>
      </div>
      <div class="toggles">
        <label><input id="map-trails" type="checkbox" bind:checked={showTrails} /> Trails</label>
        <label><input id="map-deaths" type="checkbox" bind:checked={showDeaths} /> Deaths</label>
        <label><input id="map-objectives" type="checkbox" bind:checked={showObjectives} /> Objectives</label>
        <label><input id="map-jungle" type="checkbox" bind:checked={showJungle} /> Jungle</label>
        <label><input id="map-sinners" type="checkbox" bind:checked={showSinners} /> Sinner’s Sacrifice</label>
        <label><input id="map-heat" type="checkbox" bind:checked={showHeat} /> Heatmap for {focusedPlayer?.hero.name ?? 'selected player'}</label>
      </div>
      {#if laneOnly}
        <p class="lane-context">
          {#if focusedPlayer?.assigned_lane == null}
            Assigned lane data is unavailable; following {followedName} and showing their purchases and kills.
          {:else}
            Following {followedName} in assigned lane {focusedPlayer.assigned_lane}; showing lane players, their purchases, and kills involving the lane.
          {/if}
        </p>
      {/if}
      <p class="objective-legend">G Guardian · W Walker · P Patron · C Core · M Mid Boss. Symbols show standing objectives and disappear when taken; color shows the owning team (Mid Boss is neutral).</p>
      <p class="objective-legend">Gold △ marks active jungle camps; purple S marks a Sinner’s Sacrifice entity while present in replay data. S does not indicate readiness; icons require parsed replay data.</p>
      {#if match.resources?.length === 0 && resourceReparseStatus?.status === 'pending'}
        <p class="lane-context" role="status">Resource markers are missing; a replay reparse is queued. This map will refresh when it completes.</p>
      {:else if match.resources?.length === 0 && resourceReparseStatus?.status === 'unavailable'}
        <p class="lane-context" role="status">This match’s replay is no longer available to reparse, so resource markers can’t be recovered.</p>
      {:else if match.resources?.length === 0 && resourceReparseStatus?.status === 'completed'}
        <p class="lane-context" role="status">Replay reparse finished, but it produced no resource markers for this match.</p>
      {:else if match.resources?.length === 0 && resourceReparseStatus?.status === 'failed'}
        <p class="lane-context" role="status">The replay reparse could not be queued. Try reloading this match later.</p>
      {/if}
    </div>

    <aside class="feed">
      <h3 class="label">{laneOnly ? `${followedName}’s lane` : 'Live event feed'} · {liveMoments.length}</h3>
      <p class="feed-hint">
        {#if laneOnly && focusedPlayer?.assigned_lane == null}
          Only the followed player’s buys and kills are shown.
        {:else if laneOnly}
          Only lane-player purchases and kills involving a lane player are shown.
        {:else}
          Events appear as playback reaches them. Scrub back to replay earlier moments.
        {/if}
      </p>
      <ol aria-live="polite" aria-relevant="additions">
        {#each liveMoments as d (d.id)}
          <li class:recent={Math.abs(t - d.t) < KILL_FLASH_S}>
            <button onclick={() => jump(d.kind === 'kill' ? d.t - 4 : d.t)} title={d.kind === 'kill' ? 'Jump to 4 seconds before this kill' : d.kind === 'objective' ? 'Jump to when this objective was taken' : 'Jump to this item purchase'}>
              <span class="ft num">{mmss(d.t)}</span>
              {#if d.kind === 'kill'}
                {#if d.killer}<HeroIcon hero={d.killer.hero} team={d.killer.team} size={22} />{/if}
                <span class="kn">{name(d.killer)}</span>
                <span class="arrow"><Icon name="arrow-right" size={13} /></span>
                {#if d.victim}<HeroIcon hero={d.victim.hero} team={d.victim.team} size={22} />{/if}
                <span class="kn">{name(d.victim)}</span>
              {:else if d.kind === 'purchase'}
                <HeroIcon hero={d.player.hero} team={d.player.team} size={22} />
                {#if d.item.icon}
                  <img class="item-icon" src={d.item.icon} alt="" loading="lazy" />
                {:else}
                  <span class="item-icon item-placeholder" aria-hidden="true">{d.item.name.slice(0, 2)}</span>
                {/if}
                <span class="purchase-copy">
                  <span class="kn">{d.item.name}</span>
                  <small>{d.player.member?.name ?? d.player.hero.name}</small>
                </span>
              {:else}
                <span class="objective-symbol" class:team0={d.objective.team === 0} class:team1={d.objective.team === 1}>{objectiveSymbol(d.objective.kind)}</span>
                <span class="event-kind">OBJ</span>
                <span class="kn">{d.objective.kind === 'mid_boss' ? `Team ${d.objective.team} claimed ${objectiveLabel(d.objective)}` : `Team ${d.objective.team}'s ${objectiveLabel(d.objective)} destroyed`}</span>
              {/if}
            </button>
          </li>
        {:else}
          <li class="empty"><Icon name="inbox" size={18} />No events yet. Play or scrub the replay to see kills, purchases, and objectives.</li>
        {/each}
      </ol>
    </aside>
  </div>
</section>

<style>
  .layout { display: grid; grid-template-columns: minmax(0, 1fr) 20rem; gap: 1.25rem; }
  .stage { display: grid; gap: 0.75rem; align-content: start; min-width: 0; }
  .canvas-box { width: 100%; max-width: 44rem; aspect-ratio: 1; position: relative; }
  canvas { display: block; border-radius: 6px; }
  .imgnote { position: absolute; left: 0.75rem; bottom: 0.75rem; font-size: 0.8rem; color: var(--muted); }
  .controls { display: flex; align-items: center; gap: 0.75rem; flex-wrap: wrap; max-width: 44rem; }
  .range { display: inline-flex; gap: 2px; padding: 2px; border: 1px solid var(--line); border-radius: 7px; background: var(--panel-2); }
  .range button { padding: 0.35rem 0.55rem; border: 0; border-radius: 5px; background: transparent; color: var(--muted); font: inherit; font-size: 0.72rem; cursor: pointer; white-space: nowrap; }
  .range button:hover { color: var(--fg); }
  .range button.active { background: var(--panel); color: var(--fg); box-shadow: 0 1px 3px rgb(0 0 0 / 0.25); }
  .play { width: 2.4rem; height: 2.4rem; display: grid; place-items: center; border-radius: 50%; border: 1px solid var(--line); background: var(--panel-2); cursor: pointer; font-size: 0.85rem; transition: border-color var(--duration-fast) ease, background var(--duration-fast) ease, transform var(--duration-fast) var(--ease-out); }
  .play:hover { border-color: var(--faint); background: color-mix(in srgb, var(--panel-2) 92%, var(--sapphire)); transform: scale(1.04); }
  .play:active { transform: scale(0.98); }
  input[type='range'] { flex: 1; min-width: 10rem; accent-color: var(--fg); }
  .time { color: var(--muted); font-size: 0.85rem; min-width: 6.5rem; }
  .speed { font-size: 0.85rem; color: var(--muted); display: inline-flex; gap: 0.4rem; align-items: center; }
  select { min-height: 2rem; background: var(--panel-2); color: var(--fg); border: 1px solid var(--line); border-radius: 7px; padding: 0.25rem 0.45rem; transition: border-color var(--duration-fast) ease; }
  select:hover { border-color: var(--faint); }
  input[type='checkbox'] { accent-color: var(--sapphire); }
  .toggles { display: flex; flex-wrap: wrap; gap: 0.4rem 1.2rem; font-size: 0.88rem; color: var(--muted); }
  .toggles label { display: inline-flex; gap: 0.4rem; align-items: center; cursor: pointer; }
  .objective-legend { max-width: 44rem; color: var(--faint); font-size: 0.72rem; }
  .lane-context { max-width: 44rem; color: var(--muted); font-size: 0.75rem; }
  .feed { display: grid; gap: 0.5rem; align-content: start; min-width: 0; }
  .feed-hint { color: var(--muted); font-size: 0.75rem; }
  .feed ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 2px; max-height: 40rem; overflow-y: auto; }
  .feed button { width: 100%; display: flex; align-items: center; gap: 0.4rem; background: none; border: 0; padding: 0.3rem 0.4rem; border-radius: 4px; cursor: pointer; font-size: 0.8rem; text-align: left; }
  .feed button:hover { background: var(--panel-2); }
  .recent button { background: var(--panel-2); }
  .ft { color: var(--muted); min-width: 2.6rem; }
  .kn { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; min-width: 0; flex: 1; }
  .arrow { color: var(--faint); }
  .event-kind { flex: none; color: var(--amber); font-size: 0.62rem; font-weight: 700; letter-spacing: 0.05em; }
  .item-icon { width: 1.45rem; height: 1.45rem; flex: none; border: 1px solid var(--line); border-radius: 4px; background: var(--panel-2); object-fit: contain; }
  .item-placeholder { display: grid; place-items: center; color: var(--muted); font-size: 0.52rem; font-weight: 700; }
  .purchase-copy { display: grid; min-width: 0; flex: 1; }
  .purchase-copy small { overflow: hidden; color: var(--muted); font-size: 0.62rem; text-overflow: ellipsis; white-space: nowrap; }
  .empty { display: flex; align-items: center; gap: 0.5rem; color: var(--muted); font-size: 0.85rem; padding: 0.65rem; border: 1px dashed var(--line); border-radius: 6px; }
  @media (max-width: 60rem) { .layout { grid-template-columns: 1fr; } .feed ol { max-height: 18rem; } }
</style>
