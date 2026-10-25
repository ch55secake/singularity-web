# Read API contract

The web app reads match, player, session, lane, and lane-pairing data from the read API.
singularity-platform should serve it under the same origin as the app. `npm run dev`
serves the sample responses in `fixtures/api/` unless `SINGULARITY_API` is set to
proxy a platform instance.

The TypeScript types in `src/lib/types.ts` are the source of truth for field names.

## `GET /api/matches/{uuid}/lane-stats`

Lane-phase stats for the first 10 minutes. Each player's counters and soul-source
totals come from the latest recorded cumulative-stat snapshot at or before
10:00; `snapshot_time_s` reports when that snapshot was captured. Missing stats
stay `null`. `souls.net_worth` is held net worth, while the remaining `souls`
fields are source totals from the match metadata. `deaths` lists hero deaths
recorded in the lane window, with match-relative seconds and player slots.

## `GET /api/lane-pairings`

Aggregates tracked-member duos that were assigned to the same lane. Account IDs
are not returned. `matches` counts appearances together; `match_win_rate` is
their whole-match win rate. Lane comparison is limited to matches where each
team had exactly two players on that assigned lane and both had a held-net-worth
snapshot at or before 10:00. The lane lead is the duo's combined net worth minus
the opposing duo's; missing comparisons are excluded rather than counted as
ties or losses. `average_kills`, `average_deaths`, and `average_assists` describe
the tracked duo at its latest available snapshots in the lane window; `stats_samples`
counts games where both players had all three values. Average creep kills and
denies use `economy_samples`, while average hero damage uses `damage_samples`.
`hero_combinations` groups games by the heroes each tracked member played. In
each `heroes` array, order matches the `members` array. `games` contains the most
recent 100 appearances per duo; aggregate totals cover all appearances, and
`games_truncated` indicates when older game details were omitted.

```jsonc
{
  "lane_phase_end_s": 600,
  "pairings": [{
    "members": ["alice", "bob"],
    "matches": 8,
    "result_matches": 8,
    "wins": 5,
    "match_win_rate": 0.625,
    "lane_samples": 6,
    "lane_leads": 4,
    "lane_ties": 0,
    "lane_trails": 2,
    "lane_lead_rate": 0.667,
    "average_net_worth_lead": 1250.0,
    "stats_samples": 8,
    "average_kills": 2.25,
    "average_deaths": 1.5,
    "average_assists": 4.5,
    "economy_samples": 8,
    "average_creep_kills": 42.0,
    "average_denies": 3.0,
    "damage_samples": 8,
    "average_hero_damage": 9200.0,
    "hero_combinations": [{
      "heroes": [{ "id": 72, "name": "Billy", "icon": "...", "card": null },
                 { "id": 76, "name": "Graves", "icon": "...", "card": null }],
      "matches": 3,
      "result_matches": 3,
      "wins": 2,
      "match_win_rate": 0.667,
      "lane_samples": 3,
      "lane_leads": 2,
      "lane_ties": 0,
      "lane_trails": 1,
      "lane_lead_rate": 0.667,
      "average_net_worth_lead": 1800.0
    }],
    "games": [{
      "uuid": "37bb05cc-27d5-5ae8-8c28-129dd11cd85c",
      "match_id": 111839173,
      "start_time": 1791289512,
      "heroes": [{ "id": 72, "name": "Billy", "icon": "...", "card": null },
                 { "id": 76, "name": "Graves", "icon": "...", "card": null }],
      "match_result": "win",
      "lane_net_worth_lead": 2100,
      "stats": { "kills": 3, "deaths": 1, "assists": 4,
                  "creep_kills": 42, "denies": 3, "hero_damage": 9200 }
    }],
    "games_truncated": false
  }]
}
```

## `GET /api/matches`

Newest first. Array of match summaries:

```jsonc
{
  "uuid": "37bb05cc-27d5-5ae8-8c28-129dd11cd85c", // public id used in page links
  "match_id": 111839173,
  "start_time": 1791289512,     // unix seconds
  "duration_s": 1910,
  "mode": "6v6",
  "winning_team": 0,            // 0 = Amber Hand, 1 = Sapphire Flame
  "players": [{ "slot": 1, "team": 0, "member": { "name": "max" },
                "hero": { "id": 72, "name": "Billy", "icon": "...", "card": "..." },
                "kills": 7, "deaths": 9, "assists": 14 }]
}
```

`member` is set when the account belongs to someone in the group, otherwise `null`.
Steam account IDs are deliberately not part of the browser API (see SECURITY.md).

## `GET /api/players/by-name/{name}`

The configured group member's aggregate form and recent matches. The name is a
display-name path segment, not a Steam account ID, and unknown names return `404`:

```jsonc
{
  "name": "cheesecake",
  "matches": 12,
  "kdr": 1.34,
  "kda": 2.41,
  "accuracy": 0.61,
  "crit_rate": 0.13,
  "win_rate": 0.58,
  "heroes": [{ "id": 72, "name": "Billy", "matches": 7 }],
  "recent": [{
    "uuid": "37bb05cc-27d5-5ae8-8c28-129dd11cd85c",
    "match_id": 111839173,
    "start_time": 1791289512,
    "duration_s": 1910,
    "winning_team": 0,
    "team": 0,
    "hero": { "id": 72, "name": "Billy", "icon": "...", "card": "..." },
    "kills": 8, "deaths": 10, "assists": 9
  }]
}
```

## `GET /api/matches/{uuid}`

Everything in the summary, plus:

| Field | Source in Valve's match metadata |
|---|---|
| `players[].souls`, `last_hits`, `denies`, `level` | `players[]` |
| `players[].hero_damage`, `healing`, `damage_taken`, `damage_mitigated` | last `stats[]` snapshot: `player_damage`, `player_healing`, `player_damage_taken`, `damage_mitigated` |
| `players[].aim` | last snapshot: `shots_hit`, `shots_missed`, `hero_bullets_hit`, `hero_bullets_hit_crit` |
| `players[].kill_types` | last snapshot: `bullet_kills`, `ability_kills`, `melee_kills`, `headshot_kills` |
| `players[].timeline` | every `stats[]` snapshot: `time_stamp_s`, `net_worth`, `player_damage` |
| `players[].damage_by_source` | `damage_matrix`, see below |
| `players[].build` | `players[].items[]` joined to item/ability names |
| `deaths[]` | `players[].death_details[]` |
| `paths` | `match_paths`, converted to world coordinates |
| `map` | map radius and minimap image from the assets API |
| `resources[]` | Replay-derived active/inactive transitions for neutral camps and Sinner’s Sacrifice |

`resources[]` is ordered by replay time and carries `t`, `entity_index`,
`event_index`, `kind` (`neutral` or `sinner`), `active`, and world `position`.
The map applies these transitions at the current playback time; matches without
parsed replay data return an empty array. Neutral entities are grouped into
camp markers in the UI, while Sinner’s Sacrifice markers are shown separately.
`active` indicates that the entity is present in replay data (and alive for
neutral creeps), not that a Sinner’s Sacrifice machine is ready to be used.

### Damage by source

In `damage_matrix`, hero damage is `stat_type == 0` against **enemy** player slots.
Every hit is listed twice: once under its specific source (an ability, a gun such as
`citadel_weapon_punkgoat_set`, an item upgrade) and once under a generic category
(`Bullet`, `Melee`, `Ability`, `Misc`). Skip the generic categories. With that rule the
per-source totals add up exactly to `player_damage` for all 20 players in the two sample
matches. Fold all `citadel_weapon_*` sources into one "Gun" row and `ability_melee_*`
into "Melee".

### Positions

`match_paths.paths[].x_pos` / `y_pos` are quantised to `0..16383`. Convert with
`world = min + pos / 16383 * (max - min)` using that path's `x_min`/`x_max` (and y).
The map spans `-radius..radius` on both axes, with +y pointing up the minimap.
One sample per `interval_s` (1 s). `health` is 0 while dead.
