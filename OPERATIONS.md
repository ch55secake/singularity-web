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

`SINGULARITY_API_UPSTREAM` is the address nginx forwards `/api/` requests to. It
must point at the platform's read API, not the salt ingestion route.

`SINGULARITY_API_TOKEN` is the platform's `SINGULARITY_READ_TOKEN`, if it has one.
nginx sends it as a bearer token on every `/api/` request. Leave it empty when the
platform has no read token.

Neither setting reaches the browser.

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
