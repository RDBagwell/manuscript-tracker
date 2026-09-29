# Manuscript Tracker

![CI](https://github.com/RDBagwell/manuscript-tracker/actions/workflows/ci.yml/badge.svg)

Query tracking for working authors — every submission, request, rejection,
and nudge in one event-sourced ledger.

Built by a novelist actively in the query trenches, as both a daily-use
tool and a working demonstration of production Laravel + React practice.
The seed data is a real querying wave.

![The query ledger — threads with an expanded correspondence log](docs/screenshots/queries.png)
![Reminders — due and upcoming nudges](docs/screenshots/reminders.png)

More in [docs/screenshots/](docs/screenshots/): logging an event, the
closed-door advisory, the stats dashboard, and a
[walkthrough video](docs/screenshots/walkthrough.webm).

## What to look at

Five places a reviewer gets the most signal per minute:

- **[`Query::recordEvent()`](backend/app/Models/Query.php#L71)**: the one
  write path into a query's lifecycle. It appends an immutable event and
  re-projects the cached status, `sent_at` and `closed_at`. Its rules are
  pinned by [`tests/Unit/QueryStatusProjectionTest.php`](backend/tests/Unit/QueryStatusProjectionTest.php).
- **[The enforced morph map](backend/app/Providers/AppServiceProvider.php#L30)**:
  polymorphic reminders store `query` / `manuscript` / `agent` aliases,
  and an unmapped model is an error rather than silent class-name drift.
- **[`AppliesSorting`](backend/app/Http/Controllers/Concerns/AppliesSorting.php)**:
  server-side sorting through a per-endpoint whitelist, so `?sort=` can
  never become an arbitrary `ORDER BY`.
- **[Ownership-scoped validation](backend/app/Http/Requests/StoreQueryRequest.php)**:
  `exists` rules constrained to the caller's `user_id` stop cross-tenant
  foreign keys with a 422, one layer before the policies' 403s. Advisories
  are built next door in
  [`QueryController::warningsFor()`](backend/app/Http/Controllers/QueryController.php#L103).
- **[The hermetic test setup](Makefile#L98)**: `make test` injects the
  test environment at exec time so the suite can't reach the dev database.
  On the front end, [`src/test/`](frontend/src/test/) mounts the real app
  and mocks only `services/api.ts`.


## Why this exists

Querying literary agents is a long game of parallel threads: five letters
out, a partial with one agent, a nudge owed in three weeks, and an agency
whose policy means a colleague's rejection closes every door in the
building. Spreadsheets record events; they don't understand them. This
tracker models the process as it actually behaves:

- **The correspondence log is the truth.** A query's status is a cached
  projection of an append-only event stream (sent → partial requested →
  materials sent → …). One write path, `recordEvent()`, keeps the cache
  honest — and makes response-time analytics a query away.
- **Advisories, not roadblocks.** Logging a query against a second agent
  at a "one no means all no" agency that already passed returns a warning
  in `meta`, not a 422. The tool flags "are you sure?" moments without
  overruling the author.
- **Nudge timing is the whole game.** Polymorphic reminders attach to
  query threads, manuscripts, or agents, surface when due, and snooze in
  one click.

## Features

Manuscripts, agents, and agencies with full CRUD and cascade-aware
deletes · event-driven query lifecycle with an inline correspondence
ledger · closed-door and closed-agent warnings · reminders with due
badges and snooze · jsonb genre filtering (GIN-indexed on Postgres) ·
server-side whitelisted sorting · Sanctum SPA cookie auth with profile
management and full password recovery (Mailpit dev mailbox) · 77 back-end
tests on a hermetic sqlite `:memory:` database, plus Vitest + Testing
Library on the front end.

## Stack

Laravel 13 (API-only) · React 18 + TypeScript + Vite · PostgreSQL ·
Redis · nginx · Mailpit · Docker Compose. No UI framework — the design
system is ~750 lines of handwritten CSS (IBM Plex + Libre Caslon,
carbon-and-paper palette, status rendered as semantic ink).

## Quick start

```bash
git clone https://github.com/RDBagwell/manuscript-tracker.git
cd manuscript-tracker
make dev-setup      # build images, start services, run migrations
make fresh          # seed the demo data (a real querying wave)
```

Open http://localhost (or `http://localhost:$NGINX_PORT` if 80 is taken)
and sign in as `robert@example.test` / `password`. The Mailpit inbox for
password-reset mail lives at http://localhost:8025.

Deeper configuration, database UIs and troubleshooting:
[docs/DEVELOPMENT.md](docs/DEVELOPMENT.md)

## Testing

```bash
make test
```

The target injects the test environment at `docker-compose exec` time —
`APP_ENV=testing`, sqlite `:memory:`, array drivers — because
container-provided env reaches PHP via `$_SERVER` and outranks
`phpunit.xml` overrides. Tests are structurally incapable of touching
the dev database. CI runs the identical environment, plus Pint, and on
the front end `npm run lint` (type-aware ESLint) and `npm test` (Vitest).
`make demo-capture` regenerates the screenshots and walkthrough video.

## Production build

```bash
make prod-build
make prod-key      # once — put the printed key as APP_KEY= in your root .env
make prod-up
```

`APP_KEY`, `DB_PASSWORD` and `REDIS_PASSWORD` have no fallbacks: the
stack refuses to start until they're set. Settings for a real domain are
in [docs/DEVELOPMENT.md](docs/DEVELOPMENT.md#production-environment).

Baked immutable images under an isolated compose project: nginx serves
the compiled SPA with immutable asset caching and fastcgis `/api` +
`/sanctum` to php-fpm running cached config and routes. No bind mounts,
no Vite, no Mailpit — dev tooling doesn't exist here, and dev data is
untouched. nginx sends a strict CSP and the usual hardening headers on
every response. CI builds both production images on every push and
curls the nginx image for those headers, so the path can't silently rot.

## Architecture notes

Decisions a reviewer might ask about:

- **Event sourcing where it earns its keep.** Only the query lifecycle is
  event-sourced — it's the one place history *is* the product. Everything
  else is plain CRUD.
- **Enforced morph map.** Polymorphic reminders store `query` /
  `manuscript` / `agent` aliases, not class names; a data migration
  converted pre-map rows the day the map arrived.
- **Tenancy at two layers.** Policies (403) guard direct access;
  validation-level `exists`-with-`user_id` rules (422) stop cross-tenant
  foreign keys at the door.
- **Hermetic tests as a hard requirement**, learned the interesting way —
  see below.

## Bugs this repo survived

Documented because they're the instructive kind:

1. **The APP_KEY that couldn't lose, and did** — compose injected a
   placeholder key as process env; the entrypoint's `key:generate`
   dutifully wrote a real one to `.env`… which process env silently
   outranks. First Encrypter touch, 500.
2. **A shebang assassinated by Windows** — `git apply` under
   `autocrlf=true` rewrote the entrypoint with CRLF endings; the baked
   image's kernel went looking for `/bin/sh\r`. Instant restart loop,
   zero log lines. `.gitattributes` now enforces LF on anything executed.
3. **`$_SERVER` beats `$_ENV`** — PHPUnit's `<env>` overrides never stood
   a chance against compose-provided variables, so "sqlite" tests ran
   against dev Postgres and `RefreshDatabase` ate the seed data. Twice.
   Hence exec-time env injection.
4. **Node modules that rose from the grave** — `docker-compose down`
   discards anonymous volumes and reseeds from the image, resurrecting
   whatever `node_modules` existed at last build. `make frontend-rebuild`
   is the named cure.

## Roadmap

Live deployment — everything before it now exists.

---

Built by Robert Bagwell — full-stack engineer and fiction author.
