<script lang="ts">
import { tick } from 'svelte'
import { navigate, route } from './lib/router.svelte'
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
let commandOpen = $state(false)
let commandQuery = $state('')
let commandIndex = $state(0)
let commandInput = $state<HTMLInputElement>()

const commands = $derived([
  { label: 'Matches', detail: 'Browse and filter recent games', href: '/', icon: 'matches' as const },
  { label: 'Sessions', detail: 'Review grouped play sessions', href: '/sessions', icon: 'sessions' as const },
  { label: 'Players', detail: 'Open the player directory', href: '/players', icon: 'players' as const },
  ...(playerName ? [{ label: playerName, detail: 'Return to this player profile', href: `/p/${encodeURIComponent(playerName)}`, icon: 'players' as const }] : []),
])
const filteredCommands = $derived(commands.filter((command) => `${command.label} ${command.detail}`.toLowerCase().includes(commandQuery.trim().toLowerCase())))
const currentSection = $derived(route.path === '/' ? 'Matches' : sessionsPage ? 'Sessions' : playersPage ? 'Players' : matchUuid ? 'Match details' : playerName ?? 'Singularity')

async function openCommand() {
  navOpen = false
  commandQuery = ''
  commandIndex = 0
  commandOpen = true
  await tick()
  commandInput?.focus()
}

function runCommand(href: string) {
  commandOpen = false
  navigate(href)
}

function onWindowKeydown(event: KeyboardEvent) {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault()
    commandOpen ? (commandOpen = false) : openCommand()
  } else if (event.key === 'Escape') {
    commandOpen = false
    navOpen = false
  }
}

function onCommandKeydown(event: KeyboardEvent) {
  if (event.key === 'ArrowDown' && filteredCommands.length) {
    event.preventDefault()
    commandIndex = Math.min(commandIndex + 1, filteredCommands.length - 1)
  } else if (event.key === 'ArrowUp' && filteredCommands.length) {
    event.preventDefault()
    commandIndex = Math.max(commandIndex - 1, 0)
  } else if (event.key === 'Enter' && filteredCommands[commandIndex]) {
    event.preventDefault()
    runCommand(filteredCommands[commandIndex].href)
  }
}

$effect(() => {
  route.path
  navOpen = false
  commandOpen = false
})

$effect(() => {
  commandQuery
  commandIndex = 0
})
</script>

<svelte:window onkeydown={onWindowKeydown} />

<div class="shell">
  <aside class="sidebar" class:open={navOpen}>
    <div class="sidebar-head">
      <a class="brand" href="/">
        <svg viewBox="0 0 32 32" aria-hidden="true"><circle cx="16" cy="16" r="9" fill="none" stroke="var(--amber)" stroke-width="3"/><circle cx="16" cy="16" r="3.5" fill="var(--sapphire)"/></svg>
        <span><strong>Singularity</strong></span>
      </a>
      <button class="sidebar-close" type="button" aria-label="Close navigation" onclick={() => (navOpen = false)}><Icon name="close" size={18} /></button>
    </div>

    <nav class="side-nav" aria-label="Primary navigation">
      <span class="nav-label">Workspace</span>
      <a href="/" aria-current={route.path === '/' ? 'page' : undefined}><Icon name="matches" size={17} /><span>Matches</span></a>
      <a href="/sessions" aria-current={sessionsPage ? 'page' : undefined}><Icon name="sessions" size={17} /><span>Sessions</span></a>
      <a href="/players" aria-current={playersPage ? 'page' : undefined}><Icon name="players" size={17} /><span>Players</span></a>
      {#if playerName}
        <span class="nav-label context-label">Current</span>
        <a href="/p/{encodeURIComponent(playerName)}" aria-current="page"><Icon name="players" size={17} /><span>{playerName}</span></a>
      {/if}
    </nav>

    <div class="sidebar-foot">
      <button class="command-trigger" type="button" onclick={openCommand}><Icon name="search" size={16} /><span>Quick search</span><kbd>⌘K</kbd></button>
      <span class="version">Singularity web</span>
    </div>
  </aside>

  {#if navOpen}<button class="scrim" type="button" aria-label="Close navigation" onclick={() => (navOpen = false)}></button>{/if}

  <div class="workspace">
    <header class="topbar">
      <button class="nav-toggle" type="button" aria-label="Open navigation" aria-expanded={navOpen} onclick={() => (navOpen = true)}><Icon name="menu" size={19} /></button>
      <span class="context">{currentSection}</span>
      <button class="top-search" type="button" onclick={openCommand}><Icon name="search" size={15} /><span>Search</span><kbd>⌘K</kbd></button>
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
  </div>
</div>

{#if commandOpen}
  <div class="command-backdrop" role="presentation" onclick={(event) => event.target === event.currentTarget && (commandOpen = false)}>
    <div class="command-menu" role="dialog" aria-modal="true" aria-label="Quick navigation">
      <div class="command-input"><Icon name="search" size={18} /><input bind:this={commandInput} bind:value={commandQuery} onkeydown={onCommandKeydown} placeholder="Search destinations…" aria-label="Search destinations" /><kbd>ESC</kbd></div>
      <div class="command-results" role="listbox" aria-label="Destinations">
        {#each filteredCommands as command, index (command.href)}
          <button class:active={index === commandIndex} type="button" role="option" aria-selected={index === commandIndex} onmouseenter={() => (commandIndex = index)} onclick={() => runCommand(command.href)}>
            <span class="command-icon"><Icon name={command.icon} size={17} /></span>
            <span><strong>{command.label}</strong><small>{command.detail}</small></span>
            <Icon name="arrow-right" size={15} />
          </button>
        {:else}
          <p class="no-results">No destinations match “{commandQuery}”.</p>
        {/each}
      </div>
      <footer><span><kbd>↑</kbd><kbd>↓</kbd> Navigate</span><span><kbd>↵</kbd> Open</span></footer>
    </div>
  </div>
{/if}

<ToastRegion />

<style>
  .shell { display: grid; grid-template-columns: 14.5rem minmax(0, 1fr); min-height: 100vh; }
  .sidebar { position: sticky; top: 0; z-index: 20; height: 100vh; display: grid; grid-template-rows: auto 1fr auto; padding: 0.85rem; border-right: 1px solid var(--line); background: color-mix(in srgb, #0a0b0d 94%, transparent); backdrop-filter: blur(20px); }
  .sidebar::after { content: ''; position: absolute; inset: 12% -1px 12% auto; width: 1px; background: linear-gradient(transparent, color-mix(in srgb, var(--amber) 55%, transparent), color-mix(in srgb, var(--sapphire) 55%, transparent), transparent); opacity: 0.7; }
  .sidebar-head { display: flex; align-items: center; justify-content: space-between; min-width: 0; padding: 0.25rem 0.25rem 1.2rem; }
  .brand { display: inline-flex; align-items: center; gap: 0.65rem; min-width: 0; text-decoration: none; }
  .brand svg { width: 2rem; height: 2rem; flex: none; padding: 0.2rem; border: 1px solid var(--line); border-radius: 8px; background: linear-gradient(135deg, color-mix(in srgb, var(--amber) 11%, var(--panel-2)), color-mix(in srgb, var(--sapphire) 13%, var(--panel-2))); }
  .brand > span { display: grid; min-width: 0; line-height: 1.2; }
  .brand strong { font-size: 0.9rem; letter-spacing: -0.025em; }
  .sidebar-close { display: none; }
  .side-nav { display: grid; align-content: start; gap: 0.2rem; }
  .nav-label { padding: 0.65rem 0.65rem 0.3rem; color: var(--faint); font-size: 0.62rem; font-weight: 700; letter-spacing: 0.1em; text-transform: uppercase; }
  .context-label { margin-top: 0.65rem; border-top: 1px solid var(--line); padding-top: 1rem; }
  .side-nav a { position: relative; display: flex; align-items: center; gap: 0.65rem; min-width: 0; padding: 0.58rem 0.65rem; border-radius: 7px; color: var(--muted); font-size: 0.82rem; font-weight: 500; text-decoration: none; transition: color var(--duration-fast) ease, background var(--duration-fast) ease; }
  .side-nav a span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .side-nav a:hover { color: var(--fg); background: rgb(255 255 255 / 0.035); }
  .side-nav a[aria-current='page'] { color: var(--fg); background: linear-gradient(90deg, color-mix(in srgb, var(--amber) 7%, transparent), color-mix(in srgb, var(--sapphire) 9%, transparent)); box-shadow: 0 0 0 1px rgb(255 255 255 / 0.035) inset; }
  .side-nav a[aria-current='page']::before { content: ''; position: absolute; top: 0.45rem; bottom: 0.45rem; left: -0.2rem; width: 2px; border-radius: 2px; background: linear-gradient(var(--amber), var(--sapphire)); }
  .sidebar-foot { display: grid; gap: 0.7rem; }
  .command-trigger, .top-search { display: flex; align-items: center; gap: 0.55rem; border: 1px solid var(--line); border-radius: 7px; background: #0c0d0f; color: var(--muted); cursor: pointer; }
  .command-trigger { width: 100%; padding: 0.55rem 0.6rem; font-size: 0.76rem; }
  .command-trigger span { flex: 1; text-align: left; }
  kbd { padding: 0.08rem 0.32rem; border: 1px solid var(--line); border-radius: 4px; background: var(--panel-2); color: var(--faint); font-family: var(--body); font-size: 0.62rem; }
  .version { padding: 0 0.25rem; color: var(--faint); font-size: 0.62rem; }
  .workspace { min-width: 0; }
  .topbar { position: sticky; top: 0; z-index: 9; height: 3.35rem; display: flex; align-items: center; gap: 0.7rem; padding: 0 1rem; border-bottom: 1px solid color-mix(in srgb, var(--line) 80%, transparent); background: color-mix(in srgb, var(--bg) 84%, transparent); backdrop-filter: blur(18px); }
  .nav-toggle { display: none; width: 2rem; height: 2rem; place-items: center; border: 1px solid var(--line); border-radius: 6px; background: var(--panel); cursor: pointer; }
  .context { color: var(--muted); font-size: 0.76rem; font-weight: 600; }
  .top-search { margin-left: auto; padding: 0.35rem 0.45rem; font-size: 0.72rem; }
  .top-search span { color: var(--faint); }
  main { max-width: 76rem; margin: 0 auto; padding: 2.25rem 20px 4rem; }
  .route { animation: route-in var(--duration-page) var(--ease-out) both; }
  .scrim { display: none; }
  .command-backdrop { position: fixed; inset: 0; z-index: 40; display: grid; place-items: start center; padding: min(18vh, 9rem) 1rem 1rem; background: rgb(0 0 0 / 0.62); backdrop-filter: blur(5px); animation: backdrop-in var(--duration-fast) ease both; }
  .command-menu { width: min(36rem, 100%); overflow: hidden; border: 1px solid #373940; border-radius: 12px; background: #0d0e10; box-shadow: 0 28px 80px rgb(0 0 0 / 0.65), 0 1px 0 rgb(255 255 255 / 0.05) inset; animation: command-in 200ms var(--ease-out) both; }
  .command-input { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.7rem; padding: 0.85rem 1rem; border-bottom: 1px solid var(--line); color: var(--muted); }
  .command-input input { min-width: 0; border: 0; outline: 0; background: none; color: var(--fg); font: inherit; font-size: 0.95rem; }
  .command-input input::placeholder { color: var(--faint); }
  .command-results { display: grid; gap: 0.2rem; max-height: 22rem; overflow-y: auto; padding: 0.45rem; }
  .command-results button { display: grid; grid-template-columns: auto 1fr auto; align-items: center; gap: 0.7rem; width: 100%; padding: 0.65rem; border: 0; border-radius: 7px; background: none; color: var(--muted); text-align: left; cursor: pointer; }
  .command-results button.active { color: var(--fg); background: linear-gradient(90deg, color-mix(in srgb, var(--amber) 6%, transparent), color-mix(in srgb, var(--sapphire) 8%, transparent)); }
  .command-icon { width: 2rem; height: 2rem; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 6px; background: var(--panel-2); }
  .command-results button > span:nth-child(2) { display: grid; gap: 0.08rem; }
  .command-results strong { font-size: 0.82rem; }
  .command-results small { color: var(--faint); font-size: 0.68rem; }
  .no-results { padding: 1.5rem; color: var(--muted); text-align: center; }
  .command-menu footer { display: flex; gap: 1rem; padding: 0.55rem 0.8rem; border-top: 1px solid var(--line); color: var(--faint); font-size: 0.65rem; }
  .command-menu footer span { display: flex; align-items: center; gap: 0.25rem; }
  @keyframes route-in {
    from { opacity: 0; transform: translateY(0.6rem); }
    to { opacity: 1; transform: none; }
  }
  @keyframes command-in { from { opacity: 0; transform: translateY(-0.7rem) scale(0.98); } }
  @keyframes backdrop-in { from { opacity: 0; } }
  @media (max-width: 52rem) {
    .shell { grid-template-columns: 1fr; }
    .sidebar { position: fixed; inset: 0 auto 0 0; width: min(17rem, calc(100vw - 3rem)); height: 100vh; transform: translateX(-102%); transition: transform 220ms var(--ease-out); box-shadow: 20px 0 60px rgb(0 0 0 / 0.45); }
    .sidebar.open { transform: none; }
    .sidebar-close { display: grid; place-items: center; width: 2rem; height: 2rem; padding: 0; border: 0; border-radius: 5px; background: none; color: var(--muted); cursor: pointer; }
    .nav-toggle { display: grid; }
    .scrim { position: fixed; inset: 0; z-index: 19; display: block; padding: 0; border: 0; background: rgb(0 0 0 / 0.58); }
    main { padding-top: 1.5rem; }
  }
  @media (max-width: 34rem) { .top-search span { display: none; } }
</style>
