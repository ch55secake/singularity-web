<script lang="ts">
  import Icon from './Icon.svelte'

  let {
    kind = 'empty',
    title,
    message,
    actionLabel,
    actionHref,
    onaction,
  }: {
    kind?: 'empty' | 'error' | 'missing'
    title: string
    message: string
    actionLabel?: string
    actionHref?: string
    onaction?: () => void
  } = $props()
</script>

<section class="panel state-panel {kind}" role={kind === 'error' ? 'alert' : undefined}>
  <span class="state-icon"><Icon name={kind === 'error' ? 'alert' : kind === 'missing' ? 'info' : 'inbox'} size={24} /></span>
  <div class="copy"><h2>{title}</h2><p>{message}</p></div>
  {#if actionLabel && actionHref}
    <a class="action" href={actionHref}>{actionLabel}<Icon name="arrow-right" size={15} /></a>
  {:else if actionLabel && onaction}
    <button class="action" type="button" onclick={onaction}>{actionLabel}<Icon name={kind === 'error' ? 'retry' : 'arrow-right'} size={15} /></button>
  {/if}
</section>

<style>
  .state-panel { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; align-items: center; gap: 0.85rem 1rem; min-height: 7rem; }
  .state-icon { width: 2.75rem; height: 2.75rem; display: grid; place-items: center; border: 1px solid color-mix(in srgb, var(--sapphire) 28%, var(--line)); border-radius: 50%; color: var(--sapphire); background: color-mix(in srgb, var(--sapphire) 8%, transparent); }
  .error .state-icon { color: var(--bad); border-color: color-mix(in srgb, var(--bad) 35%, var(--line)); background: color-mix(in srgb, var(--bad) 8%, transparent); }
  .missing .state-icon { color: var(--amber); border-color: color-mix(in srgb, var(--amber) 35%, var(--line)); background: color-mix(in srgb, var(--amber) 8%, transparent); }
  .copy { display: grid; gap: 0.2rem; }
  h2 { font-family: var(--display); font-size: 1.05rem; font-weight: 600; letter-spacing: -0.015em; }
  p { color: var(--muted); }
  .action { display: inline-flex; align-items: center; justify-content: center; gap: 0.4rem; min-height: 2.35rem; padding: 0.45rem 0.75rem; border: 1px solid var(--line); border-radius: 7px; background: var(--panel-2); color: var(--fg); font-weight: 600; font-size: 0.82rem; text-decoration: none; cursor: pointer; transition: border-color var(--duration-fast) ease, transform var(--duration-fast) var(--ease-out); }
  .action:hover { border-color: var(--faint); transform: translateY(-1px); }
  @media (max-width: 34rem) {
    .state-panel { grid-template-columns: auto 1fr; }
    .action { grid-column: 2; justify-self: start; }
  }
</style>
