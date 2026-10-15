<script lang="ts">
import { route } from './lib/router.svelte'
import MatchList from './pages/MatchList.svelte'
import MatchPage from './pages/MatchPage.svelte'
import PlayersPage from './pages/PlayersPage.svelte'
import PlayerPage from './pages/PlayerPage.svelte'
import SessionsPage from './pages/SessionsPage.svelte'
import Icon from './components/Icon.svelte'
import StatePanel from './components/StatePanel.svelte'
import ToastRegion from './components/ToastRegion.svelte'

const matchUuid = $derived(route.path.match(/^\/m\/([0-9a-f-]{36})\/?$/i)?.[1])
const playersPage = $derived(/^\/players\/?$/.test(route.path))
const sessionsPage = $derived(/^\/sessions\/?$/.test(route.path))
const playerPath = $derived(route.path.match(/^\/p\/([^/]+)\/?$/)?.[1])
const playerName = $derived(playerPath ? decodeURIComponent(playerPath) : null)
let navOpen = $state(false)

$effect(() => {
  route.path
  navOpen = false
})
</script>

<header class="site">
  <div class="inner">
    <a class="brand" href="/">
      <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="9" fill="none" stroke="var(--amber)" stroke-width="3"/><circle cx="16" cy="16" r="3.5" fill="var(--sapphire)"/></svg>
      Singularity
    </a>
    <button class="nav-toggle" type="button" aria-label={navOpen ? 'Close navigation' : 'Open navigation'} aria-expanded={navOpen} aria-controls="primary-nav" onclick={() => (navOpen = !navOpen)}><Icon name={navOpen ? 'close' : 'menu'} size={20} /></button>
    <nav id="primary-nav" class:open={navOpen} aria-label="Primary navigation">
      <a href="/" aria-current={route.path === '/' ? 'page' : undefined}>Matches</a>
      <a href="/sessions" aria-current={sessionsPage ? 'page' : undefined}>Sessions</a>
      <a href="/players" aria-current={playersPage ? 'page' : undefined}>Players</a>
      {#if playerName}<a href="/p/{encodeURIComponent(playerName)}" aria-current="page">{playerName}</a>{/if}
    </nav>
  </div>
</header>

<main>
  {#key route.path}
    <div class="route">
      {#if route.path === '/'}
        <MatchList />
      {:else if sessionsPage}
        <SessionsPage />
      {:else if matchUuid}
        <MatchPage uuid={matchUuid} />
      {:else if playersPage}
        <PlayersPage />
      {:else if playerName}
        <PlayerPage name={playerName} />
      {:else}
        <StatePanel kind="missing" title="Page not found" message="There’s nothing at this address." actionLabel="Go to matches" actionHref="/" />
      {/if}
    </div>
  {/key}
</main>
<ToastRegion />

<style>
  .site { border-bottom: 1px solid color-mix(in srgb, var(--line) 84%, transparent); background: color-mix(in srgb, var(--bg) 82%, transparent); box-shadow: 0 12px 32px rgb(0 0 0 / 0.14); position: sticky; top: 0; z-index: 10; backdrop-filter: blur(18px) saturate(1.15); }
  .site::after { content: ''; position: absolute; inset: auto 0 -1px; height: 1px; background: linear-gradient(90deg, transparent 8%, color-mix(in srgb, var(--amber) 38%, transparent), color-mix(in srgb, var(--sapphire) 38%, transparent), transparent 92%); opacity: 0.55; pointer-events: none; }
  .inner { max-width: 76rem; min-height: 3.7rem; margin: 0 auto; padding: 0.55rem 16px; display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .brand { display: inline-flex; align-items: center; gap: 0.5rem; font-family: var(--display); font-weight: 800; font-size: 1.35rem; letter-spacing: 0.04em; text-transform: uppercase; text-decoration: none; }
  .brand svg { width: 1.5rem; height: 1.5rem; filter: drop-shadow(0 0 8px color-mix(in srgb, var(--sapphire) 24%, transparent)); transition: transform var(--duration-fast) var(--ease-out), filter var(--duration-fast) ease; }
  .brand:hover svg { transform: rotate(12deg) scale(1.06); filter: drop-shadow(0 0 10px color-mix(in srgb, var(--amber) 34%, transparent)); }
  .nav-toggle { display: none; width: 2.35rem; height: 2.35rem; place-items: center; border: 1px solid var(--line); border-radius: 7px; background: var(--panel); cursor: pointer; }
  nav { display: flex; align-items: center; justify-content: flex-end; flex-wrap: wrap; gap: 0.25rem; }
  nav a { position: relative; padding: 0.45rem 0.7rem; border-radius: 6px; text-decoration: none; color: var(--muted); font-weight: 600; font-size: 0.9rem; transition: color var(--duration-fast) ease, background var(--duration-fast) ease; }
  nav a::after { content: ''; position: absolute; right: 0.7rem; bottom: 0.2rem; left: 0.7rem; height: 2px; border-radius: 2px; background: linear-gradient(90deg, var(--amber), var(--sapphire)); transform: scaleX(0); transition: transform var(--duration-fast) var(--ease-out); }
  nav a:hover { color: var(--fg); background: rgb(255 255 255 / 0.035); }
  nav a[aria-current='page'] { color: var(--fg); background: rgb(255 255 255 / 0.045); }
  nav a[aria-current='page']::after { transform: scaleX(1); }
  main { max-width: 76rem; margin: 0 auto; padding: 1.5rem 16px 4rem; }
  .route { animation: route-in var(--duration-page) var(--ease-out) both; }
  @keyframes route-in {
    from { opacity: 0; transform: translateY(0.6rem); }
    to { opacity: 1; transform: none; }
  }
  @media (max-width: 44rem) {
    .inner { position: relative; }
    .nav-toggle { display: grid; }
    nav { position: absolute; top: calc(100% + 0.35rem); right: 16px; left: 16px; display: none; padding: 0.45rem; border: 1px solid var(--line); border-radius: 8px; background: color-mix(in srgb, var(--panel) 96%, transparent); box-shadow: 0 18px 42px rgb(0 0 0 / 0.42); backdrop-filter: blur(18px); }
    nav.open { display: grid; animation: menu-in var(--duration-fast) var(--ease-out) both; }
    nav a { width: 100%; padding: 0.7rem 0.75rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    nav a::after { right: auto; bottom: 0.35rem; left: 0.75rem; width: 2rem; }
  }
  @media (max-width: 34rem) {
    .brand { font-size: 1.15rem; }
  }
  @keyframes menu-in { from { opacity: 0; transform: translateY(-0.35rem) scale(0.99); } }
</style>
