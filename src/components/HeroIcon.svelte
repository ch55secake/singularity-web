<script lang="ts">
  import type { Hero, Team } from '../lib/types'

  let { hero, team, size = 36 }: { hero: Hero; team?: Team; size?: number } = $props()
  let failed = $state(false)
</script>

<span class="icon" class:team-0={team === 0} class:team-1={team === 1} style:--size="{size}px" title={hero.name}>
  {#if hero.icon && !failed}
    <img src={hero.icon} alt="" loading="lazy" onerror={() => (failed = true)} />
  {:else}
    <span class="initial">{hero.name.slice(0, 2)}</span>
  {/if}
</span>

<style>
  .icon {
    width: var(--size); height: var(--size); flex: none;
    display: inline-grid; place-items: center; overflow: hidden;
    border-radius: 6px; background: var(--panel-2);
    box-shadow: inset 0 -2px 0 var(--team, transparent);
  }
  img { width: 100%; height: 100%; object-fit: cover; }
  .initial { font-family: var(--display); font-weight: 700; font-size: calc(var(--size) * 0.42); color: var(--muted); }
</style>
