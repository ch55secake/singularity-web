# Singularity Web Specification

Status: baseline v0.1.0

## Objective

Provide a private, read-only view of match and player data collected by the
Singularity platform.

## Baseline views

- **Overview** — group metrics, recent matches, and players in form.
- **Matches** — match archive with all, win, and loss filters.
- **Players** — player performance table for the selected period.

The baseline is deliberately read-only. Authentication, permissions, and
mutating actions belong at the platform or private reverse-proxy boundary.

## Dashboard API

When `apiBaseUrl` is configured, the web app requests:

```text
GET /api/dashboard
Accept: application/json
```

Expected response:

```json
{
  "updatedAt": "2026-10-09T14:30:00Z",
  "metrics": {
    "matches": 248,
    "players": 8,
    "winRate": 56.4,
    "avgDuration": "32m 18s"
  },
  "matches": [],
  "players": []
}
```

Match objects require `id`, `result` (`win` or `loss`), `score`, `duration`,
`time`, `hero`, `player`, and `accent`. Player objects require `name`,
`initials`, `games`, `winRate`, `kda`, `hero`, `trend`, and `color`.

## UX requirements

- Dashboard remains useful when the API is unavailable.
- API failures fall back to demo data and show a non-alarming status message.
- Match salts, Steam credentials, and raw replay data are never rendered.
- Layout works on desktop and narrow mobile screens.
- All interactive controls are keyboard-focusable native buttons.

## Non-goals

- Public indexing or search-engine discoverability.
- User registration or password management.
- Steam login in the browser.
- In-browser replay parsing.
- Real-time chat or social features.
