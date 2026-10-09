# Singularity Web

Private web UI for the Singularity Deadlock match tracker.

The baseline is a dependency-free static dashboard so it can run on the small
home server without a JavaScript build toolchain. It includes responsive
overview, match archive, and player views with representative demo data.

## Run locally

```bash
python3 -m http.server 4173
open http://127.0.0.1:4173
```

The dashboard works without a backend by using demo data. To point it at a
running platform API:

```bash
cp config.example.js config.js
```

Then set `apiBaseUrl` in `config.js`:

```js
window.SINGULARITY_CONFIG = {
  apiBaseUrl: "http://singularity-server:8080",
};
```

The UI will request `GET /api/dashboard`. Until that endpoint is implemented
by the platform, it falls back to demo data and still displays the platform
connection state.

## Container

```bash
docker build -t singularity-web .
docker run --rm -p 8088:80 singularity-web
```

For a deployment-specific API URL, mount a generated `config.js` over the
image's default file:

```bash
docker run --rm -p 8088:80 \
  -v "$PWD/config.js:/usr/share/nginx/html/config.js:ro" \
  singularity-web
```

## Repository docs

- [`SPEC.md`](SPEC.md) — UI scope and API contract
- [`SECURITY.md`](SECURITY.md) — browser and deployment security
- [`OPERATIONS.md`](OPERATIONS.md) — serving and troubleshooting
