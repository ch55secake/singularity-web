# Singularity Web

The match web app for Singularity, the group's private Deadlock match tracker. Each
match gets its own page at `/m/<uuid>` with a Leetify-style breakdown:

- **Overview:** scoreboard (K/D/A, KDR, KDA, souls, hero damage, healing, last hits,
  accuracy) and the team souls lead over time
- **Combat:** aim stats for each player against the lobby average (accuracy, hero crit
  rate, damage per minute, damage taken, how kills happened) and damage broken down
  by ability and by target
- **Map:** a replay of every player's position with trails, kill markers, a heatmap for
  the selected player and a kill feed. `?t=<seconds>` opens it at a moment.
- **Builds:** items in the order bought and when each ability was unlocked and upgraded
- **Lanes:** tracked-player duos ranked by 10-minute assigned-lane net-worth lead, with
  early K/D/A, farm, hero combinations, match history, and whole-match win rate

Clicking a player anywhere selects them across all tabs.
The match list can be filtered by group member and links to each member's player
page, which shows aggregate form, favourite heroes, and recent matches.

## Run it

```bash
npm install
npm run dev          # http://localhost:5173, using the sample data in fixtures/
npm run check        # type-check
```

To use a real platform instead of the fixtures:

```bash
SINGULARITY_API=http://192.168.1.110:8080 npm run dev
```

## Data

The app reads match, lane, lane-pairing, session, and player data from the platform
read API on the same origin.
[`API.md`](API.md) is the contract for singularity-platform, and `src/lib/types.ts`
has the exact field names.

Until the platform serves those endpoints, `fixtures/api/` holds two sample matches
built from public match data by `scripts/make_fixtures.py`. Account IDs in the
fixtures are made up, and two players are labelled as group members so the
highlighting has something to show.

```bash
python3 scripts/make_fixtures.py [match_id ...]   # regenerate the fixtures
```

## Container

The Docker image builds the app and serves it with nginx, so the server only needs
Docker. nginx also forwards `/api/` to singularity-platform, which keeps the app and
its data on one address.

```bash
docker build -t singularity-web .
docker run --rm -p 8088:80 \
  -e SINGULARITY_API_UPSTREAM=http://192.168.1.110:8080 \
  singularity-web
```

`SINGULARITY_API_UPSTREAM` defaults to `http://platform:8080`, the platform's name
inside the deployment's Compose network.

Hero, item and map images currently load from the public Deadlock assets CDN.

## Repository docs

- [`API.md`](API.md): the read API the app expects from the platform
- [`SPEC.md`](SPEC.md): UI scope and requirements
- [`SECURITY.md`](SECURITY.md): browser and deployment security
- [`OPERATIONS.md`](OPERATIONS.md): serving and troubleshooting
