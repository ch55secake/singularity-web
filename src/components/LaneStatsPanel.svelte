<script lang="ts">
  import HeroIcon from './HeroIcon.svelte'
  import { TEAMS, fmt, mmss } from '../lib/format'
  import type { LanePlayer, LaneStats, MatchDetail } from '../lib/types'

  let { lane, match }: { lane: LaneStats; match: MatchDetail } = $props()

  const teams = [0, 1] as const
  const matchPlayers = $derived(new Map(match.players.map((player) => [player.slot, player])))
  const hasSnapshot = $derived(lane.players.some((player) => player.snapshot_time_s !== null))
  const playersForTeam = (team: 0 | 1) => lane.players
    .filter((player) => player.team === team)
    .sort((a, b) => a.slot - b.slot)
  const value = (n: number | null) => n === null ? '—' : fmt(n)
  const playerName = (player: LanePlayer) => {
    const member = matchPlayers.get(player.slot)?.member
    return member?.name ?? player.hero.name
  }
  const deathName = (slot: number) => {
    const player = matchPlayers.get(slot)
    return player?.member?.name ?? player?.hero.name ?? `Player ${slot}`
  }
</script>

<section class="panel lane-panel">
  <div class="panel-head">
    <div>
      <h2>Lane phase</h2>
      <p class="hint">First {mmss(lane.lane_phase_end_s)} · cumulative stats at each player’s latest snapshot in the window</p>
    </div>
    <span class="phase num">0:00–{mmss(lane.lane_phase_end_s)}</span>
  </div>

  {#if hasSnapshot}
    <div class="scroll-x data-scroll" role="region" aria-label="Lane phase player statistics">
      <table class="num">
        <thead>
          <tr>
            <th class="who">Player</th>
            <th title="Kills, deaths, assists">K / D / A</th>
            <th title="Creep kills / denies">Creeps / denies</th>
            <th title="Net worth at the snapshot">Souls held</th>
            <th title="Lane creep souls / lane creep orb souls">Lane / orbs</th>
            <th title="Neutral creep souls / neutral creep orb souls">Neutral / orbs</th>
            <th>Hero damage</th>
          </tr>
        </thead>
        {#each teams as team (team)}
          <tbody class="team-{team}">
            <tr class="team-row"><th colspan="7">{TEAMS[team].name}</th></tr>
            {#each playersForTeam(team) as player (player.slot)}
              <tr>
                <td class="who">
                  <div class="player">
                    <HeroIcon hero={player.hero} team={team} size={30} />
                    <span class="player-name">
                      <strong>{playerName(player)}</strong>
                      {#if matchPlayers.get(player.slot)?.member}<small>{player.hero.name}</small>{/if}
                      <small>Snapshot {player.snapshot_time_s === null ? 'unavailable' : mmss(player.snapshot_time_s)}</small>
                    </span>
                  </div>
                </td>
                <td>{value(player.kills)} / {value(player.deaths)} / {value(player.assists)}</td>
                <td>{value(player.creep_kills)} / {value(player.denies)}</td>
                <td>{value(player.souls.net_worth)}</td>
                <td>{value(player.souls.lane_creeps)} / {value(player.souls.lane_creep_orbs)}</td>
                <td>{value(player.souls.neutral_creeps)} / {value(player.souls.neutral_creep_orbs)}</td>
                <td>{value(player.hero_damage)}</td>
              </tr>
            {/each}
          </tbody>
        {/each}
      </table>
    </div>
    <p class="footnote">Souls held is net worth. Lane and neutral values are source totals; orb totals are shown separately.</p>
  {:else}
    <p class="empty">No lane-phase stat snapshots are available for this match.</p>
  {/if}
</section>

<section class="panel lane-panel">
  <div class="panel-head">
    <div>
      <h2>Lane deaths</h2>
      <p class="hint">Hero deaths recorded before {mmss(lane.lane_phase_end_s)}</p>
    </div>
    <span class="phase num">{lane.deaths.length}</span>
  </div>
  {#if lane.deaths.length}
    <ol class="death-list">
      {#each lane.deaths as death, i (i)}
        {@const killer = matchPlayers.get(death.killer)}
        {@const victim = matchPlayers.get(death.victim)}
        <li>
          <time class="num">{mmss(death.t)}</time>
          {#if killer}<HeroIcon hero={killer.hero} team={killer.team} size={24} />{/if}
          <span class="killer">{deathName(death.killer)}</span>
          <span class="verb">eliminated</span>
          {#if victim}<HeroIcon hero={victim.hero} team={victim.team} size={24} />{/if}
          <span class="victim">{deathName(death.victim)}</span>
        </li>
      {/each}
    </ol>
  {:else}
    <p class="empty">No hero deaths were recorded during the lane phase.</p>
  {/if}
</section>

<style>
  .lane-panel { min-width: 0; }
  .panel-head > div { display: grid; gap: 0.2rem; }
  .hint, .footnote { color: var(--muted); font-size: 0.78rem; }
  .phase { flex: none; padding: 0.3rem 0.55rem; border: 1px solid var(--line); border-radius: 99px; color: var(--fg); font-size: 0.75rem; }
  table { width: 100%; min-width: 48rem; border-collapse: separate; border-spacing: 0; font-size: 0.84rem; }
  th, td { padding: 0.5rem 0.6rem; text-align: right; white-space: nowrap; }
  thead th { position: sticky; top: 0; z-index: 3; background: var(--panel); box-shadow: 0 1px 0 var(--line); color: var(--muted); font-size: 0.67rem; font-weight: 600; letter-spacing: 0.06em; text-transform: uppercase; }
  .who { position: sticky; left: 0; z-index: 2; min-width: 10rem; text-align: left; background: var(--panel); box-shadow: 1px 0 0 var(--line); }
  thead .who { z-index: 4; }
  .team-row th { position: sticky; left: 0; z-index: 2; padding-top: 0.9rem; text-align: left; background: var(--panel); box-shadow: 0 1px 0 var(--line); color: var(--team); font-size: 0.75rem; letter-spacing: 0.04em; text-transform: uppercase; }
  .player { display: flex; align-items: center; gap: 0.55rem; }
  .player-name { display: grid; gap: 0.08rem; line-height: 1.2; }
  .player-name strong { color: var(--fg); font-weight: 600; }
  .player-name small { color: var(--muted); font-size: 0.67rem; }
  tbody tr:not(.team-row) { border-top: 1px solid var(--line); }
  tbody tr:not(.team-row) td { border-top: 1px solid var(--line); color: var(--fg); }
  tbody tr:not(.team-row) .who { border-top-color: var(--line); }
  .footnote { margin-top: 0.75rem; }
  .empty { padding: 0.75rem; border: 1px dashed var(--line); border-radius: 6px; color: var(--muted); font-size: 0.85rem; }
  .death-list { display: grid; gap: 0.2rem; margin: 0; padding: 0; list-style: none; }
  .death-list li { display: flex; align-items: center; gap: 0.55rem; min-height: 2.5rem; padding: 0.35rem 0.5rem; border-bottom: 1px solid var(--line); font-size: 0.82rem; }
  .death-list li:last-child { border-bottom: 0; }
  time { min-width: 2.8rem; color: var(--muted); }
  .killer { color: var(--good); font-weight: 650; }
  .victim { color: var(--bad); font-weight: 650; }
  .verb { color: var(--muted); }
  @media (max-width: 40rem) {
    .panel-head { align-items: flex-start; }
    .death-list li { flex-wrap: wrap; gap: 0.35rem; font-size: 0.74rem; }
  }
</style>
