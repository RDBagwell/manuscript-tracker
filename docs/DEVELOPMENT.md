# Development guide

Everything past the README's quick start: the dev stack, its settings,
tests, the demo capture, production configuration and troubleshooting.

- [Dev stack](#dev-stack)
- [Environment variables](#environment-variables)
- [Database and mail UIs](#database-and-mail-uis)
- [Everyday commands](#everyday-commands)
- [Testing and linting](#testing-and-linting)
- [Demo walkthrough capture](#demo-walkthrough-capture)
- [Troubleshooting](#troubleshooting)
- [Production environment](#production-environment)

## Dev stack

```bash
cp .env.docker .env   # optional: every variable has a default in docker-compose.yml
make dev-setup        # build images, start services, run migrations
make fresh            # migrate:fresh --seed (the demo data)
```

`docker-compose.yml` runs nine services on one bridge network:

| Service | Image / build | Host port | Role |
|---|---|---|---|
| `nginx` | `nginx:alpine` + `docker/nginx.conf` | `NGINX_PORT` (80) | Front door: `/api/*` and `/sanctum/*` go to php-fpm over FastCGI, everything else to the Vite dev server |
| `laravel` | `docker/laravel-dockerfile`, target `development` | `LARAVEL_PORT` (9000) | PHP 8.4-FPM (FastCGI, not HTTP) with `./backend` bind-mounted, Xdebug in `develop` mode |
| `react` | `docker/react-dockerfile` | `REACT_PORT` (3000) | Vite dev server with HMR; `./frontend` bind-mounted |
| `postgres` | `postgres:16-alpine` | `DB_PORT` (5432) | Data, in the `postgres_data` volume. `docker/init-db.sql` runs on first boot |
| `redis` | `redis:7-alpine` | `REDIS_PORT` (6379) | Sessions, cache and queue, password-protected, AOF persistence |
| `mailpit` | `axllent/mailpit` | `MAILPIT_UI_PORT` (8025) | Catches all outgoing mail (password resets) |
| `adminer`, `pgadmin`, `redis-commander` | upstream images | 8081–8083 | Database UIs, see below |

The SPA calls a relative `/api`, so it works on whatever port nginx is
published. Browsing to Vite directly on `:3000` also works: `vite.config.ts`
proxies `/api` and `/sanctum` to the nginx container.

On every start the Laravel entrypoint (`docker/docker-entrypoint.sh`):

1. waits for Postgres and Redis,
2. creates the `storage/` skeleton and fixes its permissions,
3. makes sure `backend/.env` exists and holds an `APP_KEY` (generating
   one once, so it survives restarts),
4. runs migrations, and seeds if `SEED_DATABASE=true` (production compose
   only; in dev use `make fresh`),
5. caches config, routes and views when `APP_ENV` isn't `local`, or
   clears stale caches when it is,
6. starts php-fpm.

## Environment variables

Compose reads the root `.env`. `.env.docker` is the template and lists
only the variables `docker-compose.yml` actually interpolates; nothing
else in `.env` reaches the containers.

| Variable | Default | Used for |
|---|---|---|
| `APP_ENV`, `APP_DEBUG` | `local`, `true` | Laravel environment |
| `DB_NAME`, `DB_USER`, `DB_PASSWORD` | `manuscript_tracker`, `postgres`, `postgres_dev_password` | Postgres, Laravel |
| `REDIS_PASSWORD` | `redis_dev_password` | Redis, Laravel, Redis Commander |
| `MAIL_MAILER`, `MAIL_HOST`, `MAIL_PORT`, `MAIL_FROM_ADDRESS` | `smtp`, `mailpit`, `1025`, `noreply@manuscripttracker.local` | Outgoing mail |
| `VITE_API_URL` | empty (relative `/api`) | Only for a genuinely cross-origin API |
| `NGINX_PORT`, `LARAVEL_PORT`, `REACT_PORT`, `DB_PORT`, `REDIS_PORT`, `MAILPIT_UI_PORT` | 80, 9000, 3000, 5432, 6379, 8025 | Host ports |
| `ADMINER_PORT`, `PGADMIN_PORT`, `REDIS_COMMANDER_PORT` | 8081, 8082, 8083 | Host ports for the UIs |
| `PGADMIN_EMAIL`, `PGADMIN_PASSWORD` | `admin@example.com`, `pgadmin_dev_password` | pgAdmin's required bootstrap account |

`APP_URL` and `SANCTUM_STATEFUL_DOMAINS` follow `NGINX_PORT`
automatically, so changing the port needs no other edits. These are dev
defaults only. Production has no fallbacks (see
[Production environment](#production-environment)).

## Database and mail UIs

| UI | URL | Sign-in |
|---|---|---|
| Mailpit | http://localhost:8025 | none |
| Adminer | http://localhost:8081 | System *PostgreSQL*, server `postgres`, user `postgres`, password `DB_PASSWORD`, database `manuscript_tracker` |
| pgAdmin | http://localhost:8082 | Desktop mode, no login. The server is pre-registered from `docker/pgadmin-servers.json`; enter `DB_PASSWORD` when first connecting |
| Redis Commander | http://localhost:8083 | none (preconfigured with the Redis password) |

From a shell instead: `make psql` and `make redis-cli`.

## Everyday commands

`make help` lists everything. The ones you'll use most:

```bash
make up / make down / make restart   # start, stop (data kept), restart
make clean                           # stop and delete volumes (data gone)
make logs / make logs-laravel        # follow logs (also logs-react, logs-nginx)
make shell                           # sh inside the laravel container
make artisan CMD="route:list"        # any artisan command
make migrate / make seed / make fresh
make frontend-rebuild                # after changing frontend/package.json
```

Back up and restore the dev database:

```bash
docker-compose exec postgres pg_dump -U postgres manuscript_tracker > backup.sql
docker-compose exec -T postgres psql -U postgres manuscript_tracker < backup.sql
```

## Testing and linting

**Back end.** `make test` runs PHPUnit inside the container: 59 feature
tests and 23 unit tests on sqlite `:memory:`. The target injects the test
environment at exec time because compose-provided env reaches PHP via
`$_SERVER` and outranks `phpunit.xml`, so the suite cannot touch the dev
database. `make lint` / `make format` run Pint.

Without Docker (PHP 8.4 with pdo_sqlite), from `backend/`:

```bash
composer install
APP_ENV=testing DB_CONNECTION=sqlite DB_DATABASE=:memory: \
  SESSION_DRIVER=array CACHE_STORE=array QUEUE_CONNECTION=sync MAIL_MAILER=array \
  APP_KEY=base64:Hfz0IWxJPfsqqpIFNCCaeF+2nHaqFXGQxpJtkmT+izs= php artisan test
composer run lint
```

**Front end.** From `frontend/` (or `docker-compose exec react …`):

```bash
npm run lint    # type-aware ESLint, zero warnings allowed
npm test        # Vitest + Testing Library in jsdom
npm run build   # tsc --noEmit, then vite build
```

The tests mount the whole app through its real router and mock the
network at `src/services/api.ts` (`src/test/setup.ts`, `src/test/api.ts`),
so no server is involved.

CI (`.github/workflows/ci.yml`) runs all of the above, builds both
production images, checks that the production compose file refuses to
start without secrets, and curls the built nginx image for its security
headers.

## Demo walkthrough capture

`docs/screenshots/` (the README images plus `walkthrough.webm`) is
generated by `frontend/e2e/demo-walkthrough.spec.ts` against a running,
seeded stack:

```bash
make dev-setup      # if the stack isn't up
make demo-capture   # re-seeds (make fresh), installs Chromium once, captures
```

or, from `frontend/` against another URL:
`DEMO_BASE_URL=http://localhost:8080 npm run demo:capture`.

It signs in as the demo user and walks the query ledger (Jen Nadol's
correspondence log), the reminders desk, logging an event, the
closed-door advisory, setting and snoozing a reminder, and the stats
dashboard. The seed is a real querying wave, so the script never edits
it. The event-logging and advisory steps use a fictional *Demo Literary
Agency* ("one no means all no") with agents *Avery Demo* and *Blake Demo*,
created through the API at the start and deleted at the end.

## Troubleshooting

**Port 80 is taken.** Set `NGINX_PORT=8080` in `.env` and `make restart`.
Cookie auth, `APP_URL` and the reset-mail links follow automatically.

**A new npm package is missing inside the `react` container.** Its
`node_modules` lives in an anonymous volume seeded from the image, and
`docker-compose down` / `up` reseeds it from whatever image was last
built. Run `make frontend-rebuild` after any change to
`frontend/package.json`.

**Logged out after every restart (dev).** The key lives in
`backend/.env`. If that file was deleted, the entrypoint generates a new
key on next boot, which invalidates existing sessions once. Sign in again.

**Migrations fail on boot.** `make logs-laravel` shows the error. Check
Postgres with `docker-compose exec postgres pg_isready`, then re-run with
`make migrate`.

**Redis auth errors.** `REDIS_PASSWORD` must match between the `redis`
command line and the `laravel` environment. Both read the same variable,
so recreate both after changing it: `make down && make up`.

**The container restarts with no log output.** Check that
`docker/docker-entrypoint.sh` has LF line endings. `.gitattributes`
enforces this, but a manual copy on Windows can reintroduce CRLF.

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
