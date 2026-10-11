# Read API contract

The web app reads match data from three endpoints. singularity-platform should serve
them under the same origin as the app (platform issues #9 and #10). Until then,
`npm run dev` serves the sample responses in `fixtures/api/`.

The TypeScript types in `src/lib/types.ts` are the source of truth for field names.

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
