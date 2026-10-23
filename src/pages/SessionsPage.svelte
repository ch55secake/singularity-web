<script lang="ts">
  import { listSessions } from '../lib/api'
  import { fmt, mmss, when } from '../lib/format'
  import LoadingSkeleton from '../components/LoadingSkeleton.svelte'
  import StatePanel from '../components/StatePanel.svelte'
  import Icon from '../components/Icon.svelte'
  import type { MatchSession } from '../lib/types'

  const load = listSessions()
  const impactLabel = (score: number) => `${score > 0 ? '+' : ''}${score.toFixed(2)}`
  const durationLabel = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`
  }
  const matchLabel = (session: MatchSession) => `${session.matches.length} ${session.matches.length === 1 ? 'game' : 'games'}`
  const resultSummary = (session: MatchSession) => session.matches.map((match, index) => `Game ${index + 1}: ${match.result}`).join(', ')
</script>

<svelte:head><title>Sessions · Singularity</title></svelte:head>

<div class="page">
  <header class="intro">
    <h1>Sessions</h1>
    <p>Group matches played by tracked friends. A 90-minute break after a match starts a new session.</p>
  </header>

  {#await load}
    <LoadingSkeleton variant="cards" label="Loading sessions" />
  {:then sessions}
    {#if sessions.length === 0}
      <StatePanel title="No sessions yet" message="Sessions appear when a tracked friend has played a processed match." />
    {:else}
      {@const matches = sessions.flatMap((session) => session.matches)}
      {@const totalWins = matches.filter((match) => match.result === 'win').length}
      {@const totalLosses = matches.filter((match) => match.result === 'loss').length}
      {@const totalSplits = matches.filter((match) => match.result === 'split').length}
      {@const averageImpact = matches.reduce((total, match) => total + match.impact_score, 0) / matches.length}
      <section class="overview panel" aria-label="Session overview">
        <div><span class="label">Sessions</span><strong class="num">{sessions.length}</strong><span class="sub">recent groups</span></div>
        <div><span class="label">Games</span><strong class="num">{fmt(matches.length)}</strong><span class="sub">tracked matches</span></div>
        <div><span class="label">Record</span><strong class="num"><span class="win">{totalWins}W</span>–<span class="loss">{totalLosses}L</span>{#if totalSplits}<span class="split">–{totalSplits}S</span>{/if}</strong><span class="sub">{Math.round((totalWins / matches.length) * 100)}% win rate</span></div>
        <div><span class="label">Game time</span><strong class="num">{durationLabel(matches.reduce((total, match) => total + match.duration_s, 0))}</strong><span class="sub">inside matches</span></div>
        <div><span class="label">Average impact</span><strong class="num" class:positive={averageImpact > 0} class:negative={averageImpact < 0}>{impactLabel(averageImpact)}</strong><span class="sub">0 is lobby average</span></div>
      </section>
      <ol class="sessions">
        {#each sessions as session, index (`${session.start_time}-${index}`)}
          <li>
            <article class="session panel" class:up={session.impact_score > 0} class:down={session.impact_score < 0}>
              <header class="session-head">
                <div class="session-title">
                  <span class="label">Session {index + 1}</span>
                  <h2>{when(session.start_time)}</h2>
                  <p class="sub">Through {when(session.end_time)} · {matchLabel(session)} · {durationLabel(session.duration_s)} elapsed</p>
                </div>
                <div class="rating" class:positive={session.impact_score > 0} class:negative={session.impact_score < 0}>
                  <span class="label">Impact rating</span>
                  <strong class="num">{impactLabel(session.impact_score)}</strong>
                  <span class="hint">0 is lobby average</span>
                </div>
              </header>

              <div class="stats" role="group" aria-label="Session results">
                <div><span class="label">W–L</span><strong class="num">{session.wins}–{session.losses}</strong>{#if session.splits}<span class="sub">{session.splits} {session.splits === 1 ? 'split' : 'splits'}</span>{/if}</div>
                <div><span class="label">Win rate</span><strong class="num">{Math.round(session.win_rate * 100)}%</strong><span class="sub">wins / all games</span></div>
                <div><span class="label">Games</span><strong class="num">{session.matches.length}</strong></div>
                <div class="friends"><span class="label">Tracked friends</span><div>{#each session.members as member}<span class="friend">{member}</span>{/each}</div></div>
              </div>

              <div class="result-strip" role="img" aria-label={resultSummary(session)}>
                <span class="label">Run</span>
                {#each session.matches as match, matchIndex (match.uuid)}
                  <span class="result-dot {match.result}" title="Game {matchIndex + 1}: {match.result}">{matchIndex + 1}</span>
                {/each}
              </div>

              <ol class="match-list" aria-label="Matches in this session">
                {#each session.matches as match (match.uuid)}
                  <li>
                    <a class="match" href="/m/{match.uuid}">
                      <span class="match-time"><strong>{when(match.start_time)}</strong><span class="sub">{mmss(match.duration_s)} · Match {match.match_id}</span></span>
                      <span class="match-members">{match.members.join(', ')}</span>
                      <span class="match-result" class:win={match.result === 'win'} class:loss={match.result === 'loss'} class:split={match.result === 'split'}>{match.result}</span>
                      <span class="match-impact" class:positive={match.impact_score > 0} class:negative={match.impact_score < 0}>{impactLabel(match.impact_score)}</span>
                      <span class="match-arrow" aria-hidden="true"><Icon name="arrow-right" size={15} /></span>
                    </a>
                  </li>
                {/each}
              </ol>
            </article>
          </li>
        {/each}
      </ol>
    {/if}
  {:catch err}
    <StatePanel kind="error" title="Couldn’t load sessions" message={err.message} actionLabel="Try again" onaction={() => location.reload()} />
  {/await}
</div>

<style>
  .page { display: grid; gap: 1rem; }
  .intro { display: grid; gap: 0.35rem; margin-bottom: 0.25rem; }
  h1 { font-family: var(--display); font-weight: 800; font-size: clamp(2.2rem, 5vw, 3rem); line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; }
  .intro p, .sub, .hint { color: var(--muted); }
  .overview { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 0; padding: 0; overflow: hidden; }
  .overview > div { display: grid; align-content: center; gap: 0.05rem; min-height: 6.5rem; padding: 1rem 1.1rem; }
  .overview > div + div { border-left: 1px solid var(--line); }
  .overview strong { font-family: var(--display); font-size: 1.65rem; line-height: 1.1; }
  .overview .sub { font-size: 0.7rem; }
  .sessions, .match-list { display: grid; gap: 0.8rem; margin: 0; padding: 0; list-style: none; }
  .session { position: relative; display: grid; gap: 1rem; overflow: hidden; }
  .session::before { content: ''; position: absolute; inset: 0 auto 0 0; width: 3px; background: var(--faint); opacity: 0.65; }
  .session.up::before { background: var(--good); }
  .session.down::before { background: var(--bad); }
  .session-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; }
  .session-title { display: grid; gap: 0.2rem; min-width: 0; }
  .session-title h2 { font-family: var(--display); font-size: 1.55rem; line-height: 1.1; }
  .session-title p { font-size: 0.82rem; }
  .rating { display: grid; justify-items: end; gap: 0.05rem; flex: none; }
  .rating strong { font-size: 1.65rem; line-height: 1.1; }
  .rating .hint { font-size: 0.68rem; }
  .positive { color: var(--good); }
  .negative { color: var(--bad); }
  .stats { display: grid; grid-template-columns: repeat(3, minmax(5rem, auto)) minmax(8rem, 1fr); gap: 0.8rem; padding: 0.8rem 0; border-top: 1px solid var(--line); border-bottom: 1px solid var(--line); }
  .stats > div { display: grid; align-content: start; gap: 0.05rem; }
  .stats strong { font-size: 1.05rem; }
  .stats .sub { font-size: 0.72rem; }
  .friends > div { display: flex; flex-wrap: wrap; gap: 0.3rem; margin-top: 0.1rem; }
  .friend { color: var(--member); background: color-mix(in srgb, var(--member) 10%, transparent); border-radius: 99px; padding: 0.12rem 0.45rem; font-size: 0.75rem; font-weight: 600; }
  .result-strip { display: flex; align-items: center; flex-wrap: wrap; gap: 0.35rem; }
  .result-strip > .label { margin-right: 0.15rem; }
  .result-dot { width: 1.55rem; height: 1.55rem; display: grid; place-items: center; border: 1px solid var(--line); border-radius: 50%; color: var(--muted); background: var(--panel-2); font-size: 0.65rem; font-weight: 700; }
  .result-dot.win { color: var(--good); border-color: color-mix(in srgb, var(--good) 45%, var(--line)); background: color-mix(in srgb, var(--good) 8%, var(--panel-2)); }
  .result-dot.loss { color: var(--bad); border-color: color-mix(in srgb, var(--bad) 45%, var(--line)); background: color-mix(in srgb, var(--bad) 8%, var(--panel-2)); }
  .result-dot.split { color: var(--amber); border-color: color-mix(in srgb, var(--amber) 45%, var(--line)); background: color-mix(in srgb, var(--amber) 8%, var(--panel-2)); }
  .match-list { gap: 0; }
  .match-list li + li { border-top: 1px solid var(--line); }
  .match { display: grid; grid-template-columns: minmax(12rem, 1fr) minmax(8rem, 1fr) 4.5rem 3.5rem auto; align-items: center; gap: 0.75rem; padding: 0.7rem 0.5rem; text-decoration: none; border-radius: 5px; transition: background var(--duration-fast) ease, transform var(--duration-fast) var(--ease-out); }
  .match:hover, .match:focus-visible { background: var(--panel-2); transform: translateX(2px); }
  .match-time { display: grid; gap: 0.05rem; }
  .match-time strong { font-size: 0.85rem; }
  .match-time .sub, .match-members { font-size: 0.72rem; }
  .match-members { color: var(--member); }
  .match-result { justify-self: start; border: 1px solid var(--line); border-radius: 99px; padding: 0.08rem 0.45rem; color: var(--muted); font-size: 0.68rem; font-weight: 700; text-transform: uppercase; }
  .match-result.win { color: var(--good); border-color: color-mix(in srgb, var(--good) 45%, var(--line)); }
  .match-result.loss { color: var(--bad); border-color: color-mix(in srgb, var(--bad) 45%, var(--line)); }
  .match-result.split { color: var(--amber); border-color: color-mix(in srgb, var(--amber) 45%, var(--line)); }
  .match-impact { justify-self: end; font-variant-numeric: tabular-nums; font-weight: 700; }
  .match-arrow { display: grid; place-items: center; color: var(--faint); transition: color var(--duration-fast) ease, transform var(--duration-fast) var(--ease-out); }
  .match:hover .match-arrow, .match:focus-visible .match-arrow { color: var(--fg); transform: translateX(2px); }
  .win { color: var(--good); }
  .loss { color: var(--bad); }
  .split { color: var(--amber); }
  @media (max-width: 800px) {
    .overview { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .overview > div:nth-child(4) { border-left: 0; border-top: 1px solid var(--line); }
    .overview > div:nth-child(5) { border-top: 1px solid var(--line); }
  }
  @media (max-width: 640px) {
    .overview { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .overview > div { min-height: 5.75rem; }
    .overview > div:nth-child(odd) { border-left: 0; }
    .overview > div:nth-child(even) { border-left: 1px solid var(--line); }
    .overview > div:nth-child(n + 3) { border-top: 1px solid var(--line); }
    .session { padding: 1rem; }
    .session-head { gap: 0.6rem; }
    .session-title h2 { font-size: 1.3rem; }
    .session-title p { font-size: 0.72rem; }
    .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; }
    .friends { grid-column: 1 / -1; }
    .match { grid-template-columns: minmax(0, 1fr) auto auto auto; gap: 0.5rem; }
    .match-members { display: none; }
  }
</style>
