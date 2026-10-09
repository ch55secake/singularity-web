<script lang="ts">
  import HeroIcon from './HeroIcon.svelte'
  import type { Player } from '../lib/types'

  let { players, focus = $bindable() }: { players: Player[]; focus: number | null } = $props()
  const ordered = $derived([...players].sort((a, b) => a.team - b.team || a.slot - b.slot))
</script>

<div class="picker" role="group" aria-label="Choose a player">
  {#each ordered as p (p.slot)}
    <button class:on={focus === p.slot} class:member={!!p.member} aria-pressed={focus === p.slot}
      title="{p.member ? p.member.name + ' · ' : ''}{p.hero.name}" onclick={() => (focus = p.slot)}>
      <HeroIcon hero={p.hero} team={p.team} size={30} />
    </button>
  {/each}
</div>

<style>
  .picker { display: flex; flex-wrap: wrap; gap: 4px; }
  button { padding: 2px; border: 1px solid transparent; border-radius: 8px; background: none; cursor: pointer; opacity: 0.55; transition: opacity 0.15s; }
  button:hover, button.on { opacity: 1; }
  button.on { border-color: var(--fg); }
  button.member { box-shadow: 0 0 0 1px var(--member) inset; }
</style>
