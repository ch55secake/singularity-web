# Web Operations

## Static server

For a quick local preview:

```bash
python3 -m http.server 4173
```

For the server deployment, prefer the included Nginx container:

```bash
docker build -t singularity-web .
docker run -d --name singularity-web --restart unless-stopped \
  -p 8088:80 \
  -v "$PWD/config.js:/usr/share/nginx/html/config.js:ro" \
  singularity-web
```

## Configuration

Create `config.js` from `config.example.js`. The file contains only the
browser-visible API base URL and should point to the private, read-only API
origin, not the salt ingestion route.

## Troubleshooting

- **Demo data is shown:** check the browser network panel and confirm
  `GET /api/dashboard` is reachable from the browser's network.
- **CORS errors:** serve the UI through the same private origin as the API or
  configure the platform/reverse proxy for the UI origin.
- **Stale configuration:** `config.js` is served with `Cache-Control: no-store`;
  reload the page after replacing it.

## Resource expectations

The static UI has no worker process or database. Nginx memory and CPU usage
should be negligible compared with ClickHouse and future parser workers.
