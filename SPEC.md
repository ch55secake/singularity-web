# Singularity Web Specification

Status: v0.3.0, match and player pages on sample data

## Objective

Provide a private, read-only view of match and player data collected by the
Singularity platform, with a Leetify-style page for every match.

## Views

- **Matches** (`/`): every match, newest first, with the group's players picked out
  (result, hero, K/D/A, KDR), a group-member filter, and links to player pages.
- **Match** (`/m/<uuid>`): one page per match. The UUID is a random public id, so
  links can be shared in Discord without exposing or letting anyone guess other
  matches. Four tabs:
  - **Overview:** scoreboard (K/D/A, KDR, KDA, souls, hero damage, damage per minute,
    healing, last hits, accuracy) and the team souls lead over time.
  - **Combat:** aim and combat stats for each player against the lobby average, how
    kills happened, and damage broken down by ability and by target.
  - **Map:** a replay of player positions with trails, kill markers, a kill feed and a
    heatmap for the selected player. `?t=<seconds>` opens it at a moment.
  - **Builds:** items in the order bought and ability unlock/upgrade times.

Selecting a player on any tab follows them across all tabs.

- **Player** (`/p/<name>`): aggregate KDR, KDA, accuracy, crit rate, win rate,
  favourite heroes, and recent form for one configured group member.

The app is read-only. Authentication, permissions and mutating actions belong at
the platform or private reverse-proxy boundary.

## API

The app reads `GET /api/matches`, `GET /api/matches/{uuid}`, and
`GET /api/players/by-name/{name}` from its own origin.
[`API.md`](API.md) is the contract and `src/lib/types.ts` has the field names. In
development, `fixtures/api/` stands in for the platform.

## UX requirements

- A missing or unreachable API shows a plain explanation, not a blank page.
- Match salts, Steam credentials, Steam account IDs and raw replay URLs are never
  rendered or sent to the browser.
- Layout works on desktop and narrow mobile screens; wide tables scroll inside
  their own panel.
- All interactive controls are keyboard-focusable native buttons and inputs.

## Non-goals

- Public indexing or search-engine discoverability.
- User registration or password management.
- Steam login in the browser.
- In-browser replay parsing.
- Real-time chat or social features.
