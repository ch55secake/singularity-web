# Web Operations

## Development server

```bash
npm install
npm run dev
```

This serves the sample matches in `fixtures/api/`. To use a running platform
instead, set `SINGULARITY_API=http://<platform-host>:8080` before `npm run dev`.

## Server deployment

Use the included container. It builds the app and serves it with nginx:

```bash
docker build -t singularity-web .
docker run -d --name singularity-web --restart unless-stopped \
  -p 8088:80 \
  -e SINGULARITY_API_UPSTREAM=http://platform:8080 \
  singularity-web
```

## Configuration

`SINGULARITY_API_UPSTREAM` is the only setting. It is the address nginx forwards
`/api/` requests to, and must point at the platform's read API, not the salt
ingestion route. It never reaches the browser.

To preview the app before the platform serves the read API, set it to
`http://127.0.0.1:8090`. nginx then answers `/api/` from the two sample matches
in `fixtures/api/` instead of forwarding to the platform.

## Troubleshooting

- **"Couldn't load matches":** check `docker logs singularity-web` for upstream
  errors and confirm the platform answers `GET /api/matches` from inside the
  container's network.
- **A match link says the match isn't on the server:** the UUID doesn't exist yet,
  or the match hasn't finished processing.
- **Images missing:** hero, item and map images load from
  `assets-bucket.deadlock-api.com`. The browser needs internet access for them.

## Resource expectations

The container is nginx serving about 300 KB of static files. Memory and CPU use
are negligible next to ClickHouse and the parser workers.
