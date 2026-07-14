# Slice 1 — Schema, Models, Seed Data

Drops into a fresh Laravel 11/12 skeleton (PHP 8.2+) inside your existing
`backend/` container. Nothing here requires packages beyond the skeleton.

## File placement

```
backend/
├── app/
│   ├── Enums/            ← all 6 enum files (new directory)
│   └── Models/           ← 8 models (User.php replaces the skeleton's)
└── database/
    ├── migrations/       ← 7 new migrations (keep the skeleton's users migration)
    └── seeders/          ← DatabaseSeeder.php replaces skeleton's; UnresolvedWaveSeeder.php is new
```

## Run

```bash
make fresh          # migrate:fresh --seed
make psql           # then sanity-check below
```

## Sanity checks (in psql)

```sql
SELECT status, count(*) FROM queries GROUP BY status;
-- expect: partial 1, sent 4

SELECT sent_at, closed_at, status FROM queries;
-- all sent_at = 2026-05-12, all closed_at NULL

SELECT type, happened_at FROM query_events ORDER BY happened_at;
-- 5x sent, then partial_requested + materials_sent on the Nadol thread

SELECT reason, due_at FROM reminders;
-- Nadol nudge (Aug 13) + ATLAS wave prep (Jul 20)
```

If the counts match, `Query::recordEvent()` — the single write-path that
keeps cached status / sent_at / closed_at in sync with the event log —
is working against real Postgres.

## Things I guessed — adjust freely

- **Dates**: wave-1 send date seeded as 2026-05-12, Nadol request 05-13.
  Fix to your actual records; they drive response-time analytics later.
- **Manuscript statuses**: SUSTAINED COHERENCE = shelved, ATLAS = querying
  (query-ready, wave not sent), IT COMES BACK = production. One-line
  UPDATEs if you see these differently.
- **Agency policies**: ABLA seeded as one-no-means-all-no (they state
  this). Unter and Writers House seeded false with verify notes.
- **Ramsay / Evans**: no agency on record — agency_id is null by design.
- **MSWL / genres**: left thin deliberately; backfill from your wave-1
  research rather than my guesses.

## Design notes

- `production` was added to ManuscriptStatus so IT COMES BACK fits
  honestly — the only deviation from the approved schema.
- QueryEvent's relation to its parent is `queryThread()`, not `query()`:
  `Model::query()` is static in Eloquent's base class and PHP fatals on
  an instance-method redeclaration.
- Morph types currently store FQCNs. Worth adding
  `Relation::enforceMorphMap()` in a service provider before real data
  accumulates; flagging rather than touching your AppServiceProvider.
- Agency::hasClosedDoorFor($manuscript) exists and counts explicit
  rejections only — CNR is too ambiguous to block a colleague on.

## Next slice candidates

1. Sanctum auth + user-scoped API resource controllers (agents, queries,
   events) — makes the React side possible.
2. Feature tests for recordEvent transitions + the closed-door warning.
