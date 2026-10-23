<script lang="ts">
  let { variant, label }: { variant: 'list' | 'cards' | 'detail' | 'profile'; label: string } = $props()
  const placeholders = [0, 1, 2]
</script>

<div class="loading variant-{variant}" role="status" aria-label={label}>
  <span class="sr-only">{label}</span>
  <div aria-hidden="true">
    {#if variant === 'list'}
      <div class="panel toolbar-shell">
        {#each placeholders as placeholder (placeholder)}<span class="line control"></span>{/each}
        <span class="line control short"></span>
      </div>
      <div class="row-list">
        {#each placeholders as placeholder (placeholder)}
          <div class="panel row-shell"><span class="line heading"></span><span class="line wide"></span><span class="line medium"></span></div>
        {/each}
      </div>
    {:else if variant === 'cards'}
      <span class="line count"></span>
      <div class="card-grid">
        {#each placeholders as placeholder (placeholder)}
          <div class="panel card-shell"><span class="line heading"></span><span class="line medium"></span><span class="line short"></span></div>
        {/each}
      </div>
    {:else if variant === 'detail'}
      <div class="panel hero-shell"><span class="line heading"></span><span class="line score"></span><span class="line heading"></span></div>
      <span class="line tabs"></span>
      <span class="line context"></span>
      <div class="panel detail-shell"><span class="line heading"></span><span class="block"></span></div>
    {:else}
      <div class="profile-head"><span class="line short"></span><span class="line title"></span><span class="line medium"></span></div>
      <div class="card-grid metrics">
        {#each placeholders as placeholder (placeholder)}
          <div class="panel card-shell"><span class="line short"></span><span class="line score"></span><span class="line medium"></span></div>
        {/each}
      </div>
      <div class="panel detail-shell"><span class="line heading"></span><span class="block compact"></span></div>
    {/if}
  </div>
</div>

<style>
  .loading > div { display: grid; gap: 1rem; }
  .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }
  .line, .block {
    display: block;
    border-radius: 5px;
    background: linear-gradient(90deg, var(--panel-2) 20%, color-mix(in srgb, var(--faint) 22%, var(--panel-2)) 50%, var(--panel-2) 80%);
    background-size: 220% 100%;
    animation: shimmer 1.5s ease-in-out infinite;
  }
  .line { width: 8rem; height: 0.8rem; }
  .short { width: 5rem; }
  .medium { width: min(12rem, 72%); }
  .wide { width: min(24rem, 86%); }
  .heading { width: 7rem; height: 1.1rem; }
  .title { width: min(18rem, 65%); height: 2.75rem; }
  .score { width: 6rem; height: 2.6rem; }
  .count { margin-bottom: 0.1rem; }
  .toolbar-shell { display: flex; flex-wrap: wrap; gap: 0.8rem; }
  .control { width: 8.5rem; height: 2.35rem; border-radius: 7px; }
  .control.short { width: 6rem; }
  .row-list { display: grid; gap: 0.6rem; }
  .row-shell { display: grid; grid-template-columns: 7rem minmax(10rem, 1.3fr) minmax(8rem, 1fr); align-items: center; gap: 1.5rem; min-height: 7rem; }
  .card-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.7rem; }
  .card-shell { display: grid; align-content: start; gap: 0.8rem; min-height: 8rem; }
  .hero-shell { display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; justify-items: center; min-height: 8.5rem; }
  .tabs { width: min(24rem, 70%); height: 2.6rem; }
  .context { width: 10rem; height: 2rem; }
  .detail-shell { display: grid; gap: 1rem; }
  .block { width: 100%; height: 15rem; }
  .block.compact { height: 8rem; }
  .profile-head { display: grid; gap: 0.45rem; margin-bottom: 0.5rem; }
  @keyframes shimmer {
    from { background-position: 120% 0; }
    to { background-position: -120% 0; }
  }
  @media (max-width: 52rem) {
    .row-shell { grid-template-columns: 1fr; gap: 0.8rem; }
  }
  @media (max-width: 40rem) {
    .card-grid { grid-template-columns: 1fr; }
    .hero-shell { grid-template-columns: 1fr 1fr; }
    .hero-shell .score { grid-column: 1 / -1; grid-row: 1; }
  }
</style>
