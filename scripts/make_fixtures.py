#!/usr/bin/env python3
"""Build sample API responses for the web app from public Deadlock match data.

Until singularity-platform serves /api/matches (platform issue #9), the web app
runs against these fixtures. The output shape is the API contract in API.md.

Usage: python3 scripts/make_fixtures.py [match_id ...]

Raw downloads are cached in .cache/ (gitignored). Steam account IDs are left out:
the browser API doesn't expose them (SECURITY.md).
"""

import json
import sys
import urllib.request
import uuid
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / ".cache"
OUT = ROOT / "fixtures" / "api"
API = "https://api.deadlock-api.com/v1"
DEFAULT_MATCHES = [111839173, 113390164]

# Pretend two players in the first sample are group members so the
# "your group" highlighting has something to show.
FAKE_MEMBERS = {(111839173, 0): "cheesecake", (111839173, 4): "max"}

# Stable UUIDs for fixtures so links don't change between regenerations.
NAMESPACE = uuid.UUID("5b8f0c2e-3c1d-4a8e-9a63-2f7f5d1c9e10")

GENERIC_DAMAGE_SOURCES = {"Bullet", "Melee", "Ability", "Misc"}


def fetch(name, url):
    CACHE.mkdir(exist_ok=True)
    path = CACHE / name
    if not path.exists():
        req = urllib.request.Request(url, headers={"User-Agent": "singularity-web-fixtures"})
        with urllib.request.urlopen(req, timeout=60) as resp:
            path.write_bytes(resp.read())
    return json.loads(path.read_text())


def world(path, axis, i):
    lo, hi = path[f"{axis}_min"], path[f"{axis}_max"]
    res = 16383
    return round(lo + path[f"{axis}_pos"][i] / res * (hi - lo))


def build_match(match_id, heroes, items, game_map):
    info = fetch(f"{match_id}.json", f"{API}/matches/{match_id}/metadata")["match_info"]
    by_class = {i["class_name"]: i for i in items if i.get("class_name")}
    by_id = {i["id"]: i for i in items}
    slot_of = {}

    players = []
    for p in info["players"]:
        slot = p["player_slot"]
        slot_of[slot] = p
        last = p["stats"][-1]
        hero = heroes.get(p["hero_id"], {})
        member = FAKE_MEMBERS.get((match_id, len(players)))
        build = []
        for it in p["items"]:
            meta = by_id.get(it["item_id"], {})
            build.append({
                "t": it["game_time_s"],
                "id": it["item_id"],
                "name": meta.get("name", str(it["item_id"])),
                "kind": "ability" if meta.get("type") == "ability" else "item",
                "tier": meta.get("item_tier"),
                "icon": meta.get("shop_image_small") or meta.get("image"),
                "sold_t": it["sold_time_s"] or None,
            })
        players.append({
            "slot": slot,
            "team": p["team"],
            "member": {"name": member} if member else None,
            "hero": {
                "id": p["hero_id"],
                "name": hero.get("name", str(p["hero_id"])),
                "icon": hero.get("images", {}).get("icon_image_small_webp"),
                "card": hero.get("images", {}).get("icon_hero_card_webp"),
            },
            "kills": p["kills"],
            "deaths": p["deaths"],
            "assists": p["assists"],
            "souls": p["net_worth"],
            "last_hits": p["last_hits"],
            "denies": p["denies"],
            "level": p["level"],
            "hero_damage": last["player_damage"],
            "healing": last["player_healing"],
            "damage_taken": last["player_damage_taken"],
            "damage_mitigated": last["damage_mitigated"],
            "aim": {
                "shots_hit": last["shots_hit"],
                "shots_missed": last["shots_missed"],
                "hero_hits": last["hero_bullets_hit"],
                "hero_crits": last["hero_bullets_hit_crit"],
            },
            "kill_types": {
                "bullet": last["bullet_kills"],
                "ability": last["ability_kills"],
                "melee": last["melee_kills"],
                "headshot": last["headshot_kills"],
            },
            "timeline": {
                "t": [s["time_stamp_s"] for s in p["stats"]],
                "souls": [s["net_worth"] for s in p["stats"]],
                "hero_damage": [s["player_damage"] for s in p["stats"]],
            },
            "damage_by_source": [],
            "build": build,
        })

    # Damage matrix: cumulative series per dealer/source/target; keep final totals.
    # Hero damage is stat_type 0 against enemy players. Every hit is listed twice,
    # once under its specific source and once under a generic category, so the
    # categories are skipped. With that rule the per-source totals sum exactly to
    # player_damage for every player in both sample matches.
    dm = info["damage_matrix"]
    src = dm["source_details"]
    player_by_slot = {pl["slot"]: pl for pl in players}
    team_of = {pl["slot"]: pl["team"] for pl in players}
    for dealer in dm["damage_dealers"]:
        pl = player_by_slot.get(dealer["dealer_player_slot"])
        if not pl:
            continue
        merged = {}
        for s in dealer["damage_sources"]:
            idx = s["source_details_index"]
            cname = src["source_name"][idx]
            if src["stat_type"][idx] != 0 or cname in GENERIC_DAMAGE_SOURCES:
                continue
            entry = merged.setdefault(cname, {"total": 0, "by_target": {}})
            for tgt in s["damage_to_players"]:
                if team_of.get(tgt["target_player_slot"], pl["team"]) == pl["team"]:
                    continue
                dmg = tgt["damage"][-1] if tgt["damage"] else 0
                key = str(tgt["target_player_slot"])
                entry["by_target"][key] = entry["by_target"].get(key, 0) + dmg
                entry["total"] += dmg
        for cname, entry in sorted(merged.items(), key=lambda kv: -kv[1]["total"]):
            if entry["total"] <= 0:
                continue
            meta = by_class.get(cname, {})
            name = meta.get("name")
            if cname.startswith("citadel_weapon"):
                name, kind = "Gun", "weapon"
            elif cname.startswith("ability_melee"):
                name, kind = "Melee", "melee"
            else:
                kind = meta.get("type", "other")
            pl["damage_by_source"].append({
                "source": cname,
                "name": name or cname.replace("_", " "),
                "kind": kind,
                "icon": meta.get("image"),
                "total": entry["total"],
                "by_target": entry["by_target"],
            })
        # Fold the separate gun entries (normal, crit, per-skin) into one "Gun" row.
        guns = [d for d in pl["damage_by_source"] if d["kind"] == "weapon"]
        if len(guns) > 1:
            gun = {"source": "weapon", "name": "Gun", "kind": "weapon", "icon": None, "total": 0, "by_target": {}}
            for g in guns:
                gun["total"] += g["total"]
                for k, v in g["by_target"].items():
                    gun["by_target"][k] = gun["by_target"].get(k, 0) + v
            pl["damage_by_source"] = sorted(
                [d for d in pl["damage_by_source"] if d["kind"] != "weapon"] + [gun],
                key=lambda d: -d["total"],
            )

    deaths = []
    for p in info["players"]:
        for d in p["death_details"]:
            deaths.append({
                "t": d["game_time_s"],
                "victim": p["player_slot"],
                "killer": d["killer_player_slot"],
                "victim_pos": [round(d["death_pos"]["x"]), round(d["death_pos"]["y"])],
                "killer_pos": [round(d["killer_pos"]["x"]), round(d["killer_pos"]["y"])],
                "time_to_kill_s": round(d["time_to_kill_s"], 2),
            })
    deaths.sort(key=lambda d: d["t"])

    mp = info["match_paths"]
    paths = {}
    for path in mp["paths"]:
        n = len(path["x_pos"])
        paths[str(path["player_slot"])] = {
            "x": [world(path, "x", i) for i in range(n)],
            "y": [world(path, "y", i) for i in range(n)],
            "health": path["health"],
        }

    mode = f"{len(players) // 2}v{len(players) // 2}"
    match_uuid = str(uuid.uuid5(NAMESPACE, str(match_id)))
    detail = {
        "uuid": match_uuid,
        "match_id": match_id,
        "start_time": info["start_time"],
        "duration_s": info["duration_s"],
        "mode": mode,
        "winning_team": info["winning_team"],
        "average_badge": [info.get("average_badge_team0"), info.get("average_badge_team1")],
        "players": players,
        "deaths": deaths,
        "paths": {"interval_s": mp["interval_s"], "players": paths},
        "map": {"radius": game_map["radius"], "image": game_map["images"]["minimap"]},
    }
    summary = {
        "uuid": match_uuid,
        "match_id": match_id,
        "start_time": info["start_time"],
        "duration_s": info["duration_s"],
        "mode": mode,
        "winning_team": info["winning_team"],
        "players": [
            {k: pl[k] for k in ("slot", "team", "member", "hero", "kills", "deaths", "assists")}
            for pl in players
        ],
    }
    return summary, detail


def main():
    match_ids = [int(a) for a in sys.argv[1:]] or DEFAULT_MATCHES
    heroes = {h["id"]: h for h in fetch("heroes.json", f"{API}/assets/heroes")}
    items = fetch("items.json", f"{API}/assets/items")
    game_map = fetch("map.json", f"{API}/assets/map")
    OUT.joinpath("matches").mkdir(parents=True, exist_ok=True)
    summaries = []
    for mid in match_ids:
        summary, detail = build_match(mid, heroes, items, game_map)
        summaries.append(summary)
        out = OUT / "matches" / f"{detail['uuid']}.json"
        out.write_text(json.dumps(detail, separators=(",", ":")))
        print(f"{mid} -> {out.relative_to(ROOT)} ({out.stat().st_size // 1024} KB)")
    summaries.sort(key=lambda s: -s["start_time"])
    (OUT / "matches.json").write_text(json.dumps(summaries, separators=(",", ":")))


if __name__ == "__main__":
    main()
