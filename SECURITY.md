# Web Security

## Deployment rules

- Serve the UI only over the private LAN, Tailscale, or an authenticated HTTPS
  reverse proxy.
- Do not expose the dashboard directly to the public internet.
- Do not put `SINGULARITY_INGEST_TOKEN` or any Steam credential in the image or
  its environment.
- Point `SINGULARITY_API_UPSTREAM` at the browser-facing read API only. Keep the
  platform's ingestion endpoint separate.

## Browser boundary

The browser is a read-only client. Authentication should be provided by a
reverse proxy or a future platform session mechanism. Nothing secret is built
into the frontend.

The nginx config sends a strict Content Security Policy: scripts, styles, fonts
and API calls are same-origin only. Images are also allowed from
`assets-bucket.deadlock-api.com`, the public Deadlock assets CDN used for hero,
item and map images. Remove that once the images are mirrored locally.

## Data handling

Do not expose match salts, raw replay URLs, Steam session data, or Steam account
IDs in API responses. Players are shown by hero, plus a display name for group
members.
