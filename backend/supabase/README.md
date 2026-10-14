# Cars24 auction lot API — deployment gate

This branch versions the existing `cars24-public-api` Edge Function. It does not
alter WordPress, Astro, or Vehicle Graph. The source remains
`src_parser_best.lots` (Copart US / IAAI US). The private
`src_parser_best.public_lots` table is a serving projection, not a second feed.

## Observed source, 2026-09-29 14:44 UTC

- 717,644 US source records; 567,487 source-active and not archived.
- 545,520 source-active eligible cars/motorcycles; 534,511 also had a first
  photo matching the existing API's IAAI image rule.
- The upstream cursor reported `caught_up`, 1,432 pages, 1,175,750 received
  rows, last success at 14:44:06 UTC.
- `parser_id` is the raw primary key; no duplicate `(source, lot_id)` appeared
  in the audited corpus. Keep both keys in public URLs.
- The raw table preserves `gone` and `sold` tombstones; detail reads raw by
  `parser_id` and retains an inactive result.
- Source `pre_bid`, `min_bid`, `buy_now_price` and `current_bid` are distinct.
  The sampled active rows had no `current_bid`; do not infer it from pre-bid.
- Raw JSON contains branch, auction lane/item, ACV, repair cost, title,
  damage, keys, engine, transmission, media, and many nullable fields.

## Routes in this branch (not yet deployed)

- `GET /functions/v1/cars24-public-api/lots`
- `GET /functions/v1/cars24-public-api/lot?key=iaai-46231751-1228925`
- Legacy detail form: `/lot?source=iaai&id=46231751&record=1228925`

List query values: `source=copart|iaai`, `type=auto|moto`,
`make`, `model` (case insensitive exact names), `year`, `year_min`,
`year_max` (1900–2030), `buy_now=1`, `auction_date=YYYY-MM-DD`,
`date_from`, `date_to`, `q` (3–80 characters), `limit=1..48`.
`page=1..100` is retained for compatibility; use `next_cursor` as
`cursor` for deep keyset paging. Do not mix `page` and `cursor`.
Dates are the UTC date part supplied by parser.best. Missing auction dates
do not match date filters. Buy Now requires a positive numeric source price.

`lot_key` combines source, source lot ID, and parser record ID. The latter
prevents a future reused source lot number from changing an old detail URL.
A cursor pins an upper stream timestamp and the filter set. A record updated
during paging can move outside the snapshot; clients should restart paging
for a fresh view.

## Current recovery and activation sequence

The initial serving-table migration was applied, but a concurrent 20,000-row
backfill timed out. An additional 1,000-row chunk committed; the larger chunks
timed out. The production API remains on version 18. Do not deploy the
branch API until the projection count has been reconciled.

1. Restore database connectivity. The temporary `parser-best-sync` recovery
   version removes `lots_public_serving_sync` before normal sync on its first
   successful call. Verify it ran, then restore its original version 2.
2. Apply `parser_best_public_lot_trigger_fix.sql` and keep the trigger
   disabled during bulk backfill. Use small cursor batches and track every
   committed cursor. Never treat a timed-out batch as committed without
   checking the table.
3. Add the indexes in `parser_best_public_lot_indexes.sql`; compare projection
   count by source to the raw eligibility predicate. Verify archived rows are
   absent from listing and retained in raw detail.
4. Recreate the corrected trigger and verify one ordinary sync cycle. Check
   throughput and source cursor movement.
5. Deploy the branch Edge Function only after query plans, response time, CORS,
   no-secret output, detail photos, filtered pagination, and negative responses
   pass against live data. Run Supabase advisors. Keep version 18 for rollback.

Local checks: `node --experimental-strip-types
backend/supabase/functions/cars24-public-api/verify-local.cjs`.
These are contract checks with mocked rows, not live performance evidence.
