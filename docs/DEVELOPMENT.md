# Development guide

## Production environment

`docker-compose.prod.yml` reads its settings from the root `.env` (or the
shell). Secrets have **no fallbacks**: compose refuses to start, with a
message naming the missing variable, until they are set.

| Variable | Required | Notes |
|---|---|---|
| `APP_KEY` | yes | `make prod-key` prints one. Without a stable key every restart would log everyone out. |
| `DB_PASSWORD` | yes | Postgres superuser password; also handed to Laravel. |
| `REDIS_PASSWORD` | yes | Redis `requirepass`; also used by the healthcheck and Laravel. |
| `APP_URL` | for a real domain | Defaults to `http://localhost:$NGINX_PORT`. Password-reset emails link here. |
| `SANCTUM_STATEFUL_DOMAINS` | for a real domain | Comma-separated hosts (with port, if non-standard) that get cookie auth. Defaults to localhost variants. |
| `SESSION_DOMAIN` | optional | Cookie domain. Leave unset for a single host; set `.example.com` to share the session across subdomains. |
| `DB_DATABASE`, `DB_USERNAME` | no | Default `manuscript_tracker` / `postgres`. |
| `NGINX_PORT` | no | Host port for the stack, default `80`. |
| `MAIL_MAILER`, `MAIL_FROM_ADDRESS` | no | Default `log`, so reset mail goes to the Laravel log until a real mailer is configured. |

For `tracker.example.com` served over HTTPS, the root `.env` would hold:

```dotenv
APP_KEY=base64:…            # from make prod-key
DB_PASSWORD=…               # long and random
REDIS_PASSWORD=…            # long and random
APP_URL=https://tracker.example.com
SANCTUM_STATEFUL_DOMAINS=tracker.example.com
SESSION_DOMAIN=tracker.example.com
```

### Session cookies

The production stack sets the session cookie `Secure`, `HttpOnly` and
`SameSite=Lax` (`SESSION_SECURE_COOKIE`, `SESSION_HTTP_ONLY`,
`SESSION_SAME_SITE` in the compose file). `config/session.php` also
defaults `secure` to on whenever `APP_ENV=production`, so a missing
variable fails safe. Browsers accept `Secure` cookies on
`http://localhost`, so the local smoke test still works; anywhere else,
serve the stack over TLS.

### Security headers

`docker/nginx-security-headers.conf` is included at server level and
again in every `location` that declares its own `add_header` (nginx drops
inherited `add_header`s in that case). Every response, including `/api`
errors, carries:

- `Content-Security-Policy`: `default-src 'self'`, `script-src 'self'`,
  `connect-src 'self'`, `img-src 'self' data:`, `object-src 'none'`,
  `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`, plus
  two exceptions:
  - `style-src 'self' https://fonts.googleapis.com`: `index.html` links
    the Google Fonts stylesheet for IBM Plex Sans/Mono and Libre Caslon
    Text.
  - `font-src 'self' https://fonts.gstatic.com`: that stylesheet's
    `@font-face` rules load the font files from here.

  No `'unsafe-inline'` is needed: the only inline styling is React
  `style={{…}}` props (the stats bars), which React applies through the
  CSSOM. CSP doesn't restrict the CSSOM.
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` denying camera, microphone, geolocation, payment,
  USB and other powerful features
- `server_tokens off` (no nginx version in `Server`)

`Strict-Transport-Security` is present but commented out. Enable it only
once TLS is terminated for a real domain, because browsers pin the domain
to HTTPS for the full `max-age`.

CI checks the headers by running the built image:
`docker/check-security-headers.sh mt-nginx:prod`.
