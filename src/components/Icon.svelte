<script lang="ts">
  export type IconName = 'alert' | 'arrow-right' | 'check' | 'chevron-left' | 'chevron-right' | 'close' | 'copy' | 'inbox' | 'info' | 'menu' | 'pause' | 'play' | 'retry'
  let { name, size = 18, label }: { name: IconName; size?: number; label?: string } = $props()
</script>

<svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden={label ? undefined : 'true'} aria-label={label} role={label ? 'img' : undefined}>
  {#if name === 'alert'}
    <path d="M10.3 3.7 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.7a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>
  {:else if name === 'arrow-right'}
    <path d="M5 12h14"/><path d="m13 6 6 6-6 6"/>
  {:else if name === 'check'}
    <path d="m5 12 4 4L19 6"/>
  {:else if name === 'chevron-left'}
    <path d="m15 18-6-6 6-6"/>
  {:else if name === 'chevron-right'}
    <path d="m9 18 6-6-6-6"/>
  {:else if name === 'close'}
    <path d="m6 6 12 12M18 6 6 18"/>
  {:else if name === 'copy'}
    <rect x="9" y="9" width="11" height="11" rx="2"/><path d="M15 9V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h3"/>
  {:else if name === 'inbox'}
    <path d="M4 5h16l2 9v5H2v-5l2-9Z"/><path d="M2 14h5l2 3h6l2-3h5"/>
  {:else if name === 'info'}
    <circle cx="12" cy="12" r="9"/><path d="M12 11v5M12 8h.01"/>
  {:else if name === 'menu'}
    <path d="M4 7h16M4 12h16M4 17h16"/>
  {:else if name === 'pause'}
    <path d="M9 7v10M15 7v10"/>
  {:else if name === 'play'}
    <path d="m9 7 8 5-8 5V7Z" fill="currentColor" stroke="none"/>
  {:else if name === 'retry'}
    <path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 0-2 5"/>
  {/if}
</svg>
