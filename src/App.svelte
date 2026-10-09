<script lang="ts">
  import { route } from './lib/router.svelte'
  import MatchList from './pages/MatchList.svelte'
</script>

<header class="site">
  <div class="inner">
    <a class="brand" href="/">
      <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="9" fill="none" stroke="var(--amber)" stroke-width="3"/><circle cx="16" cy="16" r="3.5" fill="var(--sapphire)"/></svg>
      Singularity
    </a>
    <nav><a href="/" aria-current={route.path === '/' ? 'page' : undefined}>Matches</a></nav>
  </div>
</header>

<main>
  {#if route.path === '/'}
    <MatchList />
  {:else}
    <section class="panel missing">
      <h1>Page not found</h1>
      <p>There’s nothing at this address. <a href="/">Go to the match list</a>.</p>
    </section>
  {/if}
</main>

<style>
  .site { border-bottom: 1px solid var(--line); background: var(--bg); position: sticky; top: 0; z-index: 10; }
  .inner { max-width: 76rem; margin: 0 auto; padding: 0.7rem 16px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .brand { display: inline-flex; align-items: center; gap: 0.5rem; font-family: var(--display); font-weight: 800; font-size: 1.35rem; letter-spacing: 0.04em; text-transform: uppercase; text-decoration: none; }
  .brand svg { width: 1.5rem; height: 1.5rem; }
  nav a { text-decoration: none; color: var(--muted); font-weight: 600; font-size: 0.9rem; }
  nav a[aria-current='page'] { color: var(--fg); }
  main { max-width: 76rem; margin: 0 auto; padding: 1.5rem 16px 4rem; }
  .missing { display: grid; gap: 0.5rem; }
  .missing h1 { font-family: var(--display); font-size: 2rem; }
</style>
