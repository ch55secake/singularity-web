<script lang="ts">
  import { listSessions } from '../lib/api'
  import { fmt, mmss, when } from '../lib/format'
  import type { MatchSession } from '../lib/types'

  const load = listSessions()
  const impactLabel = (score: number) => `${score > 0 ? '+' : ''}${score.toFixed(2)}`
  const durationLabel = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    return hours ? `${hours}h ${minutes}m` : `${minutes}m`
  }
  const matchLabel = (session: MatchSession) => `${session.matches.length} ${session.matches.length === 1 ? 'game' : 'games'}`
</script>

<svelte:head><title>Sessions · Singularity</title></svelte:head>

<div class="page">
  <header class="intro">
    <h1>Sessions</h1>
    <p>Group matches played by tracked friends. A 90-minute break after a match starts a new session.</p>
  </header>

  {#await load}
    <p class="panel state">Loading sessions…</p>
  {:then sessions}
    {#if sessions.length === 0}
      <section class="panel state">
        <h2>No sessions yet</h2>
        <p>Sessions appear here when a tracked friend has played a processed match.</p>
      </section>
    {:else}
      <p class="sub count">{sessions.length} {sessions.length === 1 ? 'session' : 'sessions'} · {fmt(sessions.reduce((total, session) => total + session.matches.length, 0))} tracked games</p>
      <ol class="sessions">
        {#each sessions as session, index (`${session.start_time}-${index}`)}
          <li>
            <article class="session panel">
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

              <ol class="match-list" aria-label="Matches in this session">
                {#each session.matches as match (match.uuid)}
                  <li>
                    <a class="match" href="/m/{match.uuid}">
                      <span class="match-time"><strong>{when(match.start_time)}</strong><span class="sub">{mmss(match.duration_s)} · Match {match.match_id}</span></span>
                      <span class="match-members">{match.members.join(', ')}</span>
                      <span class="match-result" class:win={match.result === 'win'} class:loss={match.result === 'loss'} class:split={match.result === 'split'}>{match.result}</span>
                      <span class="match-impact" class:positive={match.impact_score > 0} class:negative={match.impact_score < 0}>{impactLabel(match.impact_score)}</span>
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
    <section class="panel state"><h2>Couldn’t load sessions</h2><p>{err.message}</p></section>
  {/await}
</div>

<style>
  .page { display: grid; gap: 1rem; }
  .intro { display: grid; gap: 0.35rem; margin-bottom: 0.25rem; }
  h1 { font-family: var(--display); font-weight: 800; font-size: clamp(2.2rem, 5vw, 3rem); line-height: 1; text-transform: uppercase; letter-spacing: 0.02em; }
  .intro p, .sub, .hint { color: var(--muted); }
  .count { margin: 0 0 -0.4rem; }
  .state { display: grid; gap: 0.4rem; color: var(--muted); }
  .state h2 { color: var(--fg); font-size: 1.1rem; }
  .sessions, .match-list { display: grid; gap: 0.8rem; margin: 0; padding: 0; list-style: none; }
  .session { display: grid; gap: 1rem; }
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
  .match-list { gap: 0; }
  .match-list li + li { border-top: 1px solid var(--line); }
  .match { display: grid; grid-template-columns: minmax(12rem, 1fr) minmax(8rem, 1fr) 4.5rem 3.5rem; align-items: center; gap: 0.75rem; padding: 0.65rem 0.35rem; text-decoration: none; border-radius: 4px; }
  .match:hover { background: var(--panel-2); }
  .match-time { display: grid; gap: 0.05rem; }
  .match-time strong { font-size: 0.85rem; }
  .match-time .sub, .match-members { font-size: 0.72rem; }
  .match-members { color: var(--member); }
  .match-result { justify-self: start; border: 1px solid var(--line); border-radius: 99px; padding: 0.08rem 0.45rem; color: var(--muted); font-size: 0.68rem; font-weight: 700; text-transform: uppercase; }
  .match-result.win { color: var(--good); border-color: color-mix(in srgb, var(--good) 45%, var(--line)); }
  .match-result.loss { color: var(--bad); border-color: color-mix(in srgb, var(--bad) 45%, var(--line)); }
  .match-result.split { color: var(--amber); border-color: color-mix(in srgb, var(--amber) 45%, var(--line)); }
  .match-impact { justify-self: end; font-variant-numeric: tabular-nums; font-weight: 700; }
  @media (max-width: 640px) {
    .session { padding: 1rem; }
    .session-head { gap: 0.6rem; }
    .session-title h2 { font-size: 1.3rem; }
    .session-title p { font-size: 0.72rem; }
    .stats { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 0.6rem; }
    .friends { grid-column: 1 / -1; }
    .match { grid-template-columns: minmax(0, 1fr) auto auto; gap: 0.5rem; }
    .match-members { display: none; }
  }
</style>
