import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import postgres from "npm:postgres@3.4.3";

const dbUrl = Deno.env.get("SUPABASE_DB_URL");
if (!dbUrl) throw new Error("SUPABASE_DB_URL is not configured");
const sql = postgres(dbUrl, { prepare: false, max: 2 });

const cors = {
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "public, max-age=60, s-maxage=300",
};
const json = (data: unknown, status = 200) => new Response(JSON.stringify(data, (_k, v) => typeof v === "bigint" ? Number(v) : v), { status, headers: { ...cors, "content-type": "application/json; charset=utf-8" } });



function parseIntParam(value: string | null, fallback: number, min: number, max: number): number | null {
  if (value === null) return fallback;
  if (!/^[0-9]+$/.test(value)) return null;
  const n = Number(value);
  return Number.isSafeInteger(n) && n >= min && n <= max ? n : null;
}
function encodeLotCursor(value: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify(value));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function decodeLotCursor(value: string): any {
  if (value.length > 2048 || !/^[A-Za-z0-9_-]+$/.test(value)) throw Error("bad cursor");
  const bytes = Uint8Array.from(atob(value.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function parserLot(row: any, full = false) {
  const g = row.general ?? {};
  const a = row.auction ?? {};
  const c = row.condition ?? {};
  const s = row.specs ?? {};
  const safeUrl = (value: unknown, image = false) => {
    try {
      const u = new URL(String(value || ""));
      if (u.protocol !== "https:") return null;
      const host = u.hostname.toLowerCase();
      if (image && host === "vis.iaai.com" && !/~SID~B\d+~S\d+~I\d+/i.test(u.searchParams.get("imageKeys") || "")) return null;
      if (image ? (host === "cs.copart.com" || host === "vis.iaai.com" || host === "d323w7klwy72q3.cloudfront.net") : (host === "www.copart.com" || host === "www.iaai.com")) return u.toString();
    } catch (_) {}
    return null;
  };
  const amount = (value: unknown) => value === null || value === undefined || value === "" || !Number.isFinite(Number(value)) ? null : Number(value);
  const images = (full && Array.isArray(row.images) ? row.images : [row.first_image].filter(Boolean)).map((value: any, index: number) => ({ value, index })).sort((x: any, y: any) => (Number(x.value?.position) || x.index + 1) - (Number(y.value?.position) || y.index + 1) || x.index - y.index).map(({value}: any) => value);
  const photos = images.map((entry: any) => {
    const safe = safeUrl(entry?.url, true);
    if (!safe || full) return safe;
    // Catalog cards need a smaller rendition; detail pages retain source resolution.
    const u = new URL(safe);
    if (u.hostname === "vis.iaai.com") {
      u.searchParams.set("width", "640");
      u.searchParams.set("height", "480");
    } else if (u.hostname === "cs.copart.com") {
      u.pathname = u.pathname.replace(/_hrs\.jpg$/i, "_ful.jpg");
    }
    return u.toString();
  }).filter(Boolean);
  const rawVin = String(row.vin || g.vin || "").toUpperCase();
  const vin = /^[A-HJ-NPR-Z0-9]{17}$/.test(rawVin) ? rawVin : null;
  const vinMasked = typeof g.vin_masked === "string" && g.vin_masked.trim() ? g.vin_masked.trim() : null;
  const result: Record<string, unknown> = {
    lot_key: row.source + "-" + row.lot_id + "-" + row.parser_id,
    source: row.source, lot_id: row.lot_id, parser_id: row.parser_id,
    vin, vin_masked: vinMasked, vin_display: vin || vinMasked,
    vin_status: vin ? "full" : vinMasked ? "masked" : rawVin ? "invalid" : "missing",
    title: g.title || null, year: amount(s.year), make: s.make || null,
    model: s.model || null, trim: s.modification || null,
    vehicle_type: s.vehicle_type || null, body_style: s.body_style || null,
    fuel: s.fuel || null, engine: s.engine || null, drive: s.drive || null,
    transmission: s.transmission || null, color: s.color || null,
    odometer: amount(c.odometer), odometer_unit: c.odometer_unit || null,
    odometer_brand: c.odometer_brand || null,
    damage_primary: c.damage_primary || null, damage_secondary: c.damage_secondary || null,
    title_document: c.title_document || null, title_status: c.title_status || null,
    keys: c.keys ?? null, runs_drives: c.runs_drives ?? null, condition: c.condition || null,
    current_bid: amount(a.current_bid), pre_bid: amount(a.pre_bid), min_bid: amount(a.min_bid),
    buy_now: amount(a.buy_now_price), currency: a.currency || null,
    auction_date: a.auction_date || null, auction_date_estimated: a.auction_date_estimated ?? null,
    sale_status: a.sale_status || null, auction_type: a.auction_type || null,
    location: a.branch?.name || null, state: a.location_state || a.branch?.state || null,
    seller: a.seller || null, seller_type: a.seller_type || null,
    source_url: safeUrl(g.url), photos, image_count: full ? photos.length : (photos.length ? (row.image_count || photos.length) : 0),
    status: row.is_active && !row.archived ? "active" : "inactive", archive_reason: row.archive_reason || null,
    first_seen: row.first_seen, last_seen: row.last_seen,
    provenance: { source: "parser.best", source_record_id: row.parser_id, market: row.market }
  };
  if (full) Object.assign(result, {
    photo_count: photos.length,
    branch: a.branch ? { code: a.branch.code ?? null, name: a.branch.name ?? null, city: a.branch.city ?? null, state: a.branch.state ?? null, country: a.branch.country ?? null, zip: a.branch.zip ?? null, lat: amount(a.branch.lat), lng: amount(a.branch.lng) } : null,
    auction_item: a.auction_item ?? null, auction_lane: a.auction_lane ?? null,
    reserve_met: a.reserve_met ?? null, source_acv: amount(a.acv), source_repair_cost: amount(a.repair_cost),
    loss_type: c.loss_type ?? null, airbags: c.airbags ?? null, title_state: c.title_state ?? null,
    odometer_km: amount(c.odometer_km), engine_liters: amount(s.engine_liters),
    cylinders: amount(s.cylinders), doors: amount(s.doors),
    features: Array.isArray(g.features) ? g.features.filter((x: unknown) => typeof x === "string") : []
  });
  return result;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "GET") return json({ error: "method_not_allowed" }, 405);

  try {
    const url = new URL(req.url);
    const parts = url.pathname.split("/").filter(Boolean);
    const route = parts[parts.length - 1] === "cars24-public-api" ? "catalog" : parts[parts.length - 1];



    if (route === "lots") {
      const source = (url.searchParams.get("source") || "").toLowerCase();
      const type = (url.searchParams.get("type") || "").toLowerCase();
      const make = (url.searchParams.get("make") || "").trim().toLowerCase();
      const model = (url.searchParams.get("model") || "").trim().toLowerCase();
      const q = (url.searchParams.get("q") || "").trim();
      const year = parseIntParam(url.searchParams.get("year"), 0, 1900, 2030);
      const yearMin = parseIntParam(url.searchParams.get("year_min"), 0, 1900, 2030);
      const yearMax = parseIntParam(url.searchParams.get("year_max"), 0, 1900, 2030);
      const limit = parseIntParam(url.searchParams.get("limit"), 24, 1, 48);
      const page = parseIntParam(url.searchParams.get("page"), 1, 1, 100);
      const buyNow = url.searchParams.get("buy_now") || "0";
      const auctionDate = url.searchParams.get("auction_date") || "";
      const dateFrom = url.searchParams.get("date_from") || "";
      const dateTo = url.searchParams.get("date_to") || "";
      const cursorValue = url.searchParams.get("cursor") || "";
      if (source && !["copart", "iaai"].includes(source)) return json({ error: "invalid_source" }, 400);
      if (type && !["auto", "moto"].includes(type)) return json({ error: "invalid_type" }, 400);
      if (make.length > 60 || model.length > 80 || q.length > 80 || (q && (q.length < 3 || /[%_\\]/.test(q)))) return json({ error: "invalid_search" }, 400);
      if ([year, yearMin, yearMax, limit, page].some(x => x === null) || (yearMin! > yearMax! && yearMax! > 0)) return json({ error: "invalid_pagination_or_year" }, 400);
      if (!["0", "1"].includes(buyNow)) return json({ error: "invalid_buy_now" }, 400);
      const validDay = (value: string) => !value || (/^[0-9]{4}-[0-9]{2}-[0-9]{2}$/.test(value) && !Number.isNaN(Date.parse(value + "T00:00:00Z")));
      if (![auctionDate, dateFrom, dateTo].every(validDay) || (dateFrom && dateTo && dateFrom > dateTo)) return json({ error: "invalid_date" }, 400);
      if (cursorValue && url.searchParams.has("page")) return json({ error: "cursor_and_page_conflict" }, 400);
      const filters = JSON.stringify({ source, type, make, model, q: q.toUpperCase(), year, yearMin, yearMax, buyNow, auctionDate, dateFrom, dateTo, limit });
      let anchor = new Date().toISOString();
      let after: { ts: string; id: string } | null = null;
      if (cursorValue) {
        try {
          const c = decodeLotCursor(cursorValue);
          if (c.v !== 1 || c.f !== filters || !/^[0-9]{1,14}$/.test(c.id) || typeof c.ts !== "string" ||
              Number.isNaN(Date.parse(c.ts)) || typeof c.anchor !== "string" || Number.isNaN(Date.parse(c.anchor))) throw Error("bad cursor");
          anchor = c.anchor; after = { ts: c.ts, id: c.id };
        } catch (_) { return json({ error: "invalid_cursor" }, 400); }
      }
      const params: unknown[] = [];
      const bind = (value: unknown) => { params.push(value); return "$" + params.length; };
      const where = ["p.stream_at <= " + bind(anchor) + "::timestamptz"];
      if (after) where.push("(p.stream_at,p.parser_id) < (" + bind(after.ts) + "::timestamptz," + bind(after.id) + "::text)");
      if (source) where.push("p.source = " + bind(source));
      if (type) where.push(type === "moto" ? "p.vehicle_type = 'motorcycle'" : "p.vehicle_type <> 'motorcycle'");
      if (make) where.push("p.make_key = " + bind(make));
      if (model) where.push("p.model_key = " + bind(model));
      if (year) where.push("p.model_year = " + bind(year));
      if (yearMin) where.push("p.model_year >= " + bind(yearMin));
      if (yearMax) where.push("p.model_year <= " + bind(yearMax));
      if (buyNow === "1") where.push("p.has_buy_now = true");
      if (auctionDate) where.push("p.auction_day = " + bind(auctionDate));
      if (dateFrom) where.push("p.auction_day >= " + bind(dateFrom));
      if (dateTo) where.push("p.auction_day <= " + bind(dateTo));
      if (q) {
        const upper = q.toUpperCase();
        if (/^[A-HJ-NPR-Z0-9]{17}$/.test(upper)) where.push("p.vin = " + bind(upper));
        else if (/^[0-9]{4,14}$/.test(q)) where.push("p.lot_id = " + bind(q));
        else if (/^[A-HJ-NPR-Z0-9]{8,16}$/.test(upper) && /[0-9]/.test(upper) && /[A-Z]/.test(upper))
          where.push("p.vin like " + bind(upper + "%"));
        else where.push("p.search_text ilike " + bind("%" + q + "%"));
      }
      const offset = cursorValue ? 0 : (page! - 1) * limit!;
      const query = "with page_rows as materialized (select p.parser_id,p.stream_at from src_parser_best.public_lots p where " +
        where.join(" and ") + " order by p.stream_at desc,p.parser_id desc limit " + bind(limit! + 1) +
        " offset " + bind(offset) + ") " +
        "select p.parser_id as page_id,p.stream_at::text as page_ts," +
        "l.parser_id,l.market,l.source,l.lot_id,l.vin,l.is_active,l.archived,l.archive_reason,l.image_count,l.first_seen,l.last_seen," +
        "l.raw->'general' as general,l.raw->'auction' as auction,l.raw->'condition' as condition," +
        "l.raw->'specifications' as specs,l.raw->'images'->0 as first_image " +
        "from page_rows p join src_parser_best.lots l on l.parser_id=p.parser_id " +
        "order by p.stream_at desc,p.parser_id desc";
      const rows = await sql.unsafe(query, params);
      const data = rows.slice(0, limit!).map((r: any) => parserLot(r));
      const hasMore = rows.length > limit!;
      const last = rows[Math.min(rows.length, limit!) - 1];
      const nextCursor = hasMore && last ? encodeLotCursor({ v: 1, f: filters, anchor, ts: last.page_ts, id: last.page_id }) : null;
      return json({ data, page: cursorValue ? null : page, page_size: limit, has_more: hasMore, next_cursor: nextCursor,
        meta: { source: "src_parser_best", status: "active_source_records_with_photo", pagination: "keyset", generated_at: new Date().toISOString() } });
    }

    if (route === "lot") {
      const key = url.searchParams.get("key") || "";
      const match = key.match(/^(copart|iaai)-([0-9]{4,14})-([0-9]{1,14})$/);
      if (key && !match) return json({ error: "invalid_lot" }, 400);
      const source = match?.[1] || (url.searchParams.get("source") || "").toLowerCase();
      const id = match?.[2] || (url.searchParams.get("id") || "").trim();
      const record = match?.[3] || (url.searchParams.get("record") || "").trim();
      if (!["copart", "iaai"].includes(source) || !/^[0-9]{4,14}$/.test(id) || !/^[0-9]{1,14}$/.test(record)) return json({ error: "invalid_lot" }, 400);
      const rows = await sql`
        select parser_id,market,source,lot_id,vin,is_active,archived,archive_reason,image_count,first_seen,last_seen,
               raw->'general' as general,raw->'auction' as auction,
               raw->'condition' as condition,raw->'specifications' as specs,
               raw->'images' as images
        from src_parser_best.lots where parser_id=${record} and source=${source} and lot_id=${id} and market in ('copart_us','iaai_us')
        limit 1
      `;
      if (!rows[0]) return json({ error: "not_found" }, 404);
      return json({ data: parserLot(rows[0], true),
        meta: { source: "src_parser_best", status: "source_record", generated_at: new Date().toISOString() } });
    }

    if (route === "health") {
      const [r] = await sql`select 1 as ok`;
      return json({ ok: r?.ok === 1, source: "postgres-direct" });
    }

    if (route === "vin") {
      const vin = (url.searchParams.get("vin") || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
      if (!/^[A-HJ-NPR-Z0-9]{17}$/.test(vin)) return json({ error: "invalid_vin" }, 400);

      const vehicleRows = await sql`
        select v.id as vehicle_id, v.vin, v.vehicle_type, v.model_year, v.manufacturer_year,
               v.normalized_make, v.normalized_model, v.normalized_trim, v.body_type, v.fuel_type,
               v.drivetrain, v.engine_displacement_cc, v.battery_kwh, v.exterior_color, v.title_status,
               v.first_seen_at, v.last_seen_at,
               mk.canonical_name as make_name, mk.slug as make_slug,
               m.canonical_name as model_name, m.slug as model_slug, m.id as model_id
        from core.vehicles v
        left join catalog.makes mk on mk.id=v.make_id
        left join catalog.models m on m.id=v.model_id
        where v.vin=${vin}
        limit 1
      `;
      const vehicle = vehicleRows[0] || null;
      const vehicleId = vehicle?.vehicle_id || null;

      const budgetRows = await sql`
        select b.id,b.vin,b.model_id,b.vehicle_type,b.model_year,b.make_raw,b.model_raw,b.body_type,
               b.auction_price_usd,b.reference_budget_usd,b.mileage_miles,b.engine_l,b.fuel,b.transmission,
               b.drive,b.damage,b.source_url,b.market_compare_url,b.photos,b.budget_scope,b.is_exact_calculation,
               mk.canonical_name as make_name,mk.slug as make_slug,m.canonical_name as model_name,m.slug as model_slug
        from catalog.budget_examples b
        left join catalog.models m on m.id=b.model_id
        left join catalog.makes mk on mk.id=m.make_id
        where b.vin=${vin}
        limit 1
      `;
      const budget = budgetRows[0] || null;

      let observations: any[] = [];
      let lots: any[] = [];
      let listings: any[] = [];
      let links: any[] = [];
      if (vehicleId) {
        observations = await sql`
          select o.id,s.code as source_code,s.name as source_name,o.observation_type,o.observed_at,o.quality_score
          from core.observations o join meta.sources s on s.id=o.source_id
          where o.vehicle_id=${vehicleId}
          order by o.observed_at desc limit 40
        `;
        lots = await sql`
          select l.id as lot_id,s.code as source_code,coalesce(h.name,s.name) as auction_name,l.lot_number,
                 l.sale_date,l.status,l.sale_status,l.primary_damage,l.secondary_damage,l.keys_present,l.run_and_drive,
                 l.title_type,l.odometer,l.buy_now_price,l.current_bid,l.currency,l.seller_name,l.source_url,
                 a.sold_at,a.hammer_price,a.total_price,a.sale_result
          from auction.lots l
          join meta.sources s on s.id=l.source_id
          left join auction.houses h on h.id=l.auction_house_id
          left join auction.sales a on a.lot_id=l.id
          where l.vehicle_id=${vehicleId}
          order by coalesce(a.sold_at,l.sale_date,l.last_seen_at) desc nulls last limit 30
        `;
        listings = await sql`
          select ml.id,s.code as source_code,s.name as source_name,ml.country_code,ml.title,ml.price,ml.currency,
                 ml.odometer,ml.status,ml.first_seen_at,ml.last_seen_at,ml.ended_at,ml.source_url
          from market.listings ml join meta.sources s on s.id=ml.source_id
          where ml.vehicle_id=${vehicleId}
          order by ml.last_seen_at desc limit 30
        `;
        links = await sql`
          select s.code as source_code,s.name as source_name,l.source_entity_type,l.source_entity_key,
                 l.match_method,l.match_confidence,l.first_seen_at,l.last_seen_at
          from core.source_vehicle_links l join meta.sources s on s.id=l.source_id
          where l.vehicle_id=${vehicleId}
          order by l.last_seen_at desc limit 30
        `;
      }

      const model = (vehicle?.model_id || budget?.model_id) ? {
        model_id: vehicle?.model_id || budget?.model_id,
        vehicle_type: vehicle?.vehicle_type || budget?.vehicle_type,
        make_name: vehicle?.make_name || budget?.make_name || budget?.make_raw,
        make_slug: vehicle?.make_slug || budget?.make_slug,
        model_name: vehicle?.model_name || budget?.model_name || budget?.model_raw,
        model_slug: vehicle?.model_slug || budget?.model_slug,
      } : null;
      const photos = Array.isArray(budget?.photos) ? budget.photos : [];
      return json({
        vin, vehicle, model, budget_reference: budget, photos,
        observations, auction_lots: lots, market_listings: listings, source_links: links,
        coverage: {
          in_vehicle_graph: Boolean(vehicle), has_budget_reference: Boolean(budget), photos: photos.length,
          observations: observations.length, auction_lots: lots.length, market_listings: listings.length,
          source_links: links.length,
        },
        meta: { source: "Cars24 Data Backbone", status: "public_vehicle_slice", generated_at: new Date().toISOString() },
      });
    }

    if (route === "budget") {
      const amount = Math.max(0, Number(url.searchParams.get("amount") || 0));
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 12), 1), 24);
      if (!Number.isFinite(amount) || amount < 3000) return json({ error: "valid_amount_required" }, 400);
      const rows = await sql`
        with ranked as (
          select b.id, b.vin, b.model_id, b.model_year, b.make_raw, b.model_raw, b.body_type,
                 b.auction_price_usd, b.reference_budget_usd, b.mileage_miles, b.engine_l,
                 b.fuel, b.transmission, b.drive, b.damage, b.source_url, b.market_compare_url,
                 b.photos, b.budget_scope, b.is_exact_calculation,
                 mk.canonical_name as make_name, mk.slug as make_slug,
                 m.canonical_name as model_name, m.slug as model_slug, m.vehicle_type,
                 row_number() over (partition by b.model_id order by b.reference_budget_usd desc, b.model_year desc nulls last) as rn
          from catalog.budget_examples b
          join catalog.models m on m.id=b.model_id and m.is_active=true
          join catalog.makes mk on mk.id=m.make_id
          where b.reference_budget_usd is not null
            and b.reference_budget_usd <= ${amount}
            and exists (select 1 from catalog.model_decisions d where d.model_id=m.id and d.is_current=true and d.decision='keep')
        )
        select id, vin, model_id, model_year, make_name, make_slug, model_name, model_slug, vehicle_type,
               body_type, auction_price_usd, reference_budget_usd, mileage_miles, engine_l, fuel,
               transmission, drive, damage, source_url, market_compare_url, photos,
               budget_scope, is_exact_calculation
        from ranked where rn=1
        order by reference_budget_usd desc, model_year desc nulls last
        limit ${limit}
      `;
      const [coverage] = await sql`
        select count(*)::int mapped_examples,
               count(distinct b.model_id)::int models_with_examples,
               min(b.reference_budget_usd)::numeric min_reference_budget,
               max(b.reference_budget_usd)::numeric max_reference_budget
        from catalog.budget_examples b
        join catalog.models m on m.id=b.model_id and m.is_active=true
        where exists (select 1 from catalog.model_decisions d where d.model_id=m.id and d.is_current=true and d.decision='keep')
      `;
      return json({
        data: rows,
        coverage,
        meta: {
          amount,
          currency: "USD",
          source: "Cars24 curated autobot reference examples",
          status: "reference_examples_not_quote",
          exact_calculation: false,
          note: "Historical curated full-purchase budget references. The legacy price formula was not preserved; use as achievable examples, not a current exact quote or Max Bid calculation."
        }
      });
    }

    if (route === "catalog") {
      const type = url.searchParams.get("type");
      const make = url.searchParams.get("make");
      const q = (url.searchParams.get("q") || "").trim();
      const limit = Math.min(Math.max(Number(url.searchParams.get("limit") || 500), 1), 500);
      const rows = await sql`
        select m.id as model_id, m.vehicle_type, mk.canonical_name as make_name, mk.slug as make_slug,
               m.canonical_name as model_name, m.slug as model_slug, m.year_from, m.year_to,
               img.image_url, img.image_source_url, img.image_source_page_url,
               img.image_rights_status, img.image_rights_note, img.image_generation_label,
               img.image_model_year, img.image_verified_at
        from catalog.models m
        join catalog.makes mk on mk.id=m.make_id
        left join lateral (
          select coalesce(nullif(a.metadata->>'public_url',''), a.source_url) as image_url,
                 a.source_url as image_source_url, a.source_page_url as image_source_page_url,
                 a.rights_status as image_rights_status, a.rights_note as image_rights_note,
                 ma.generation_label as image_generation_label, ma.model_year as image_model_year,
                 ma.verified_at as image_verified_at
          from media.model_assets ma join media.assets a on a.id=ma.asset_id
          where ma.model_id=m.id and ma.verification_status='verified'
            and coalesce(nullif(a.metadata->>'public_url',''), a.source_url) is not null
          order by ma.is_primary desc, ma.position asc nulls last, ma.verified_at desc nulls last, ma.created_at desc
          limit 1
        ) img on true
        where m.is_active=true
          and exists (select 1 from catalog.model_decisions d where d.model_id=m.id and d.is_current=true and d.decision='keep')
          and (${type}::text is null or m.vehicle_type=${type})
          and (${make}::text is null or mk.slug=${make})
          and (${q}::text='' or mk.canonical_name ilike ${'%' + q + '%'} or m.canonical_name ilike ${'%' + q + '%'})
        order by m.vehicle_type, mk.canonical_name, m.canonical_name limit ${limit}
      `;
      const [stats] = await sql`
        select count(*)::int models_total,
               count(*) filter (where m.vehicle_type='car')::int cars_total,
               count(*) filter (where m.vehicle_type='moto')::int motos_total,
               count(distinct m.make_id)::int makes_total
        from catalog.models m
        where m.is_active=true
          and exists (select 1 from catalog.model_decisions d where d.model_id=m.id and d.is_current=true and d.decision='keep')
      `;
      return json({ data: rows, stats });
    }

    if (route === "model") {
      const type = url.searchParams.get("type");
      const make = url.searchParams.get("make");
      const model = url.searchParams.get("model");
      if (!type || !make || !model) return json({ error: "type_make_model_required" }, 400);
      const rows = await sql`
        select m.id as model_id, m.vehicle_type, mk.canonical_name as make_name, mk.slug as make_slug,
               m.canonical_name as model_name, m.slug as model_slug, m.year_from, m.year_to,
               m.generation_name, m.platform_code,
               img.image_url, img.image_source_url, img.image_source_page_url,
               img.image_rights_status, img.image_rights_note, img.image_generation_label,
               img.image_model_year, img.image_verified_at,
               coalesce(specs.generations, '[]'::jsonb) as generations
        from catalog.models m
        join catalog.makes mk on mk.id=m.make_id
        left join lateral (
          select coalesce(nullif(a.metadata->>'public_url',''), a.source_url) as image_url,
                 a.source_url as image_source_url, a.source_page_url as image_source_page_url,
                 a.rights_status as image_rights_status, a.rights_note as image_rights_note,
                 ma.generation_label as image_generation_label, ma.model_year as image_model_year,
                 ma.verified_at as image_verified_at
          from media.model_assets ma join media.assets a on a.id=ma.asset_id
          where ma.model_id=m.id and ma.verification_status='verified'
            and coalesce(nullif(a.metadata->>'public_url',''), a.source_url) is not null
          order by ma.is_primary desc, ma.position asc nulls last, ma.verified_at desc nulls last, ma.created_at desc
          limit 1
        ) img on true
        left join lateral (
          select jsonb_agg(jsonb_build_object(
            'id',g.id,'generation_name',g.generation_name,'platform_code',g.platform_code,
            'year_from',g.year_from,'year_to',g.year_to,'market',g.market,
            'body_style',g.body_style,'vehicle_class',g.vehicle_class,'seats',g.seats,'doors',g.doors,
            'specs',case when gs.generation_id is null then null else jsonb_build_object(
              'length_mm',gs.length_mm,'width_mm',gs.width_mm,'height_mm',gs.height_mm,
              'wheelbase_mm',gs.wheelbase_mm,'ground_clearance_mm',gs.ground_clearance_mm,
              'curb_weight_min_kg',gs.curb_weight_min_kg,'curb_weight_max_kg',gs.curb_weight_max_kg,
              'cargo_l',gs.cargo_l,'towing_capacity_kg',gs.towing_capacity_kg,'metadata',gs.metadata) end,
            'powertrains',coalesce(pt.powertrains,'[]'::jsonb),'sources',coalesce(ev.sources,'[]'::jsonb)
          ) order by g.year_from desc) as generations
          from catalog.generations g
          left join catalog.generation_specs gs on gs.generation_id=g.id
          left join lateral (
            select jsonb_agg(jsonb_build_object(
              'id',p.id,'name',p.canonical_name,'year_from',p.year_from,'year_to',p.year_to,
              'fuel_type',p.fuel_type,'electrification',p.electrification,
              'engine_displacement_l',p.engine_displacement_l,'cylinders',p.cylinders,
              'engine_layout',p.engine_layout,'aspiration',p.aspiration,'horsepower_hp',p.horsepower_hp,
              'torque_lb_ft',p.torque_lb_ft,'transmission',p.transmission,'drivetrain',p.drivetrain,
              'battery_kwh',p.battery_kwh,'epa_range_miles',p.epa_range_miles,'dc_fast_charge_kw',p.dc_fast_charge_kw
            ) order by p.year_from nulls first,p.canonical_name) as powertrains
            from catalog.powertrains p where p.generation_id=g.id
          ) pt on true
          left join lateral (
            select jsonb_agg(distinct jsonb_build_object('source_name',e.source_name,'source_url',e.source_url,'field_name',e.field_name,'note',e.note)) as sources
            from catalog.spec_evidence e
            where e.verification_status='verified' and (e.generation_id=g.id or e.powertrain_id in (select p2.id from catalog.powertrains p2 where p2.generation_id=g.id))
          ) ev on true
          where g.model_id=m.id and g.market='US'
        ) specs on true
        where m.is_active=true and m.vehicle_type=${type} and mk.slug=${make} and m.slug=${model}
          and exists (select 1 from catalog.model_decisions d where d.model_id=m.id and d.is_current=true and d.decision='keep')
        limit 1
      `;
      if (!rows[0]) return json({ error: "not_found" }, 404);
      return json({ data: rows[0] });
    }

    if (route === "history") {
      const modelId = Number(url.searchParams.get("model_id") || 0);
      if (![48,230,340].includes(modelId)) return json({ data: [], coverage: { status: "not_loaded", master_unique_lots: 447461 } });
      const rows = await sql`
        select l.uid,l.vin,l.auction,l.auction_lot_id,l.status,l.displayed_date_utc,
               l.currency,l.final_bid_amount,l.vehicle_title,l.model_year,l.odometer_miles,
               l.primary_damage,l.source_url
        from src_autohelper.lots l
        where (${modelId}=230 and upper(l.vehicle_title) like '%TESLA MODEL 3%')
           or (${modelId}=48 and upper(l.vehicle_title) like '%BMW X5%')
           or (${modelId}=340 and upper(l.vehicle_title) like '%TRIUMPH MOTORCYCLE SCRAMBLER 1200%')
        order by l.displayed_date_utc desc nulls last limit 24
      `;
      return json({ data: rows, coverage: { status: "partial_preview_slice", master_unique_lots: 447461 } });
    }

    return json({ error: "not_found" }, 404);
  } catch (err) {
    console.error(err);
    return json({ error: "internal_error" }, 500);
  }
});
