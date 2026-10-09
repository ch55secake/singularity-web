# Web Security

## Deployment rules

- Serve the UI only over the private LAN, Tailscale, or an authenticated HTTPS
  reverse proxy.
- Do not expose the dashboard directly to the public internet.
- Do not put `SINGULARITY_INGEST_TOKEN` or any Steam credential in `config.js`.
- Treat `config.js` as public browser configuration; it cannot contain secrets.
- Keep the platform's ingestion endpoint separate from the browser-facing API.

## Browser boundary

The browser is a read-only client. Authentication should be provided by a
reverse proxy or a future platform session mechanism. A bearer token embedded
in a static frontend is not a secret and must not be used for collector
ingestion.

The Nginx image supplies restrictive response headers. Review the Content
Security Policy if external assets or API origins are added.

## Data handling

Do not expose match salts, raw replay URLs, Steam session data, or private
player identifiers in dashboard responses. Use display names and derived
statistics only.
